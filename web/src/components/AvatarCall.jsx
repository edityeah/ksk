// AvatarCall — WhatsApp-style AI persona conversation panel.
//
// UX:
//   * Voice + Video call icons live in the CanvasPanel HEADER (top right),
//     injected via CanvasHeaderActionsContext. One click = call starts. No
//     "Start Call" panel inside the body.
//   * When a call is live, a compact ribbon at the top shows the avatar
//     thumbnail (or full video), mute and end-call controls.
//   * Chat thread fills the main body. Suggestions + text input are at the
//     bottom. Whole canvas scrolls naturally.
//   * Anam minutes are only consumed when the user explicitly taps a call
//     icon and end-call stops them deterministically.
//
// SDK plumbing (validated):
//   - client.streamToVideoElement(elementId)   ← element id STRING
//   - client.createTalkMessageStream()         ← per-reply object
//   - talkStream.streamMessageChunk(delta)     ← TTS pipe
//   - talkStream.endMessage()                  ← finalises
//   - MESSAGE_HISTORY_UPDATED listener         ← user speech transcript

import { useCallback, useContext, useEffect, useRef, useState } from 'react'
import {
  Mic, MicOff, PhoneOff, Phone, Video, ScreenShare, ScreenShareOff,
  Send, Loader2,
} from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { api, getToken } from '../api/client.js'

// Build the global "who is the user" block that every persona should see,
// so the AI knows the trainee's education / batch / location / etc without
// each canvas having to remember to pass it in.
function buildProfileBlock(meExtra, role) {
  if (!meExtra) return ''
  const t = meExtra.trainee
  if (role === 'trainee' && t) {
    return [
      'User profile (always consider this when answering):',
      t.name ? `- Name: ${t.name}` : '',
      t.education ? `- Education: ${t.education}` : '',
      t.batch ? `- Currently in: ${t.batch.track?.name || ''} at ${t.batch.centre?.name || ''} (scheme ${t.batch.scheme?.code || ''})` : '- Not currently enrolled in a batch',
      t.district ? `- Location: ${t.district}${t.state ? ', ' + t.state : ''}` : '',
      t.category ? `- Social category: ${t.category}` : '',
      t.gender ? `- Gender: ${t.gender}` : '',
      Array.isArray(t.certificates) && t.certificates.length ? `- Certificates: ${t.certificates.map(c => c.jobRole?.name || c.jobRole?.sector?.name).filter(Boolean).join(', ')}` : '',
    ].filter(Boolean).join('\n')
  }
  // Non-trainee roles: at least give name + role so greetings are personal.
  return meExtra?.user?.name ? `User: ${meExtra.user.name} (${role})` : ''
}
import { loadAnam } from '../utils/anamSdk.js'
import { RealtimeVoice } from '../utils/realtimeVoice.js'
import { CanvasHeaderActionsContext } from '../canvas/CanvasHeaderActions.js'
import ChatBubble from './ChatBubble.jsx'

export default function AvatarCall({ persona, title, intro, useWebSearch, extraSystem, suggestions = [], pendingPrompt, threadId: initialThreadId }) {
  const { showToast, meExtra, role, refreshThreads } = useApp()
  const { setActions } = useContext(CanvasHeaderActionsContext) || {}
  const threadIdRef = useRef(initialThreadId || null)        // persisted thread id (server)
  const profileBlock = buildProfileBlock(meExtra, role)
  const effectiveSystem = [profileBlock, extraSystem].filter(Boolean).join('\n\n')

  const [messages, setMessages] = useState([])
  const [thinking, setThinking] = useState(false)
  const [input, setInput] = useState('')
  const messagesRef = useRef([])
  useEffect(() => { messagesRef.current = messages }, [messages])

  // 'idle' = no call. callMode is set by which icon the user clicked.
  const [callState, setCallState] = useState('idle')   // idle | connecting | live | error
  const [callMode, setCallMode] = useState(null)        // 'voice' | 'video' | null
  const [callError, setCallError] = useState(null)
  const [muted, setMuted] = useState(false)
  const [screenSharing, setScreenSharing] = useState(false)

  const mediaRef = useRef(null)
  const anamRef = useRef(null)
  const realtimeRef = useRef(null)             // OpenAI Realtime client (voice mode)
  const assistantPlaceholderRef = useRef(-1)   // index of the current streaming bot bubble
  const streamAbortRef = useRef(null)          // AbortController for in-flight /api/ai/stream
  const [listening, setListening] = useState(false)

  useEffect(() => () => stopCall(true), [])

  // Restore history if a thread was opened from the sidebar.
  useEffect(() => {
    if (!initialThreadId) return
    threadIdRef.current = initialThreadId
    let cancelled = false
    ;(async () => {
      try {
        const r = await api.threadMessages(initialThreadId)
        if (cancelled) return
        const restored = (r.messages || []).map(m => ({ role: m.role, text: m.text }))
        setMessages(restored)
      } catch (e) {
        console.warn('[thread] restore failed', e?.message || e)
      }
    })()
    return () => { cancelled = true }
  }, [initialThreadId])

  // Fire a prompt provided externally (e.g. a card click). The prompt itself
  // is the dependency — sending the same value again requires a different ref
  // (caller can append a nonce: { text, nonce }).
  const lastPendingRef = useRef(null)
  useEffect(() => {
    if (!pendingPrompt) return
    const key = typeof pendingPrompt === 'object' ? `${pendingPrompt.nonce}::${pendingPrompt.text}` : pendingPrompt
    if (lastPendingRef.current === key) return
    lastPendingRef.current = key
    const text = typeof pendingPrompt === 'object' ? pendingPrompt.text : pendingPrompt
    if (!text) return
    // During a live voice call, send the prompt through the realtime channel
    // so the AI speaks the answer. Otherwise use the text streaming path.
    if (callMode === 'voice' && realtimeRef.current) {
      setMessages(m => {
        const next = [...m, { role: 'user', text }, { role: 'bot', text: '' }]
        assistantPlaceholderRef.current = next.length - 1
        return next
      })
      persistMessage('user', text)
      realtimeRef.current.sendText(text)
    } else {
      streamReply(text, anamRef.current)
    }
  }, [pendingPrompt])

  // ── Start a call (mode = 'voice' | 'video') ───────────────────────────
  const startCall = useCallback(async (mode) => {
    if (callState === 'connecting' || callState === 'live') return
    setCallMode(mode); setCallState('connecting'); setCallError(null)

    // VOICE: OpenAI Realtime via WebRTC. Single connection handles mic capture,
    // server-side VAD, LLM, TTS, and barge-in. No DIY phrase splitting / Whisper
    // round-trips / echo gymnastics — the API does all of that natively.
    if (mode === 'voice') {
      try {
        const rt = new RealtimeVoice({
          persona,
          extraSystem: effectiveSystem,
          onState: (s) => {
            console.log('[realtime] state', s)
            if (s === 'live')  setCallState('live')
            if (s === 'error') setCallState('error')
            if (s === 'closed' && callMode === 'voice') setListening(false)
          },
          onUserTranscript: (text) => {
            console.log('[realtime] user →', text)
            // Finalize: drop any unstarted placeholder, push the user turn,
            // and start a fresh assistant placeholder ready to be filled in
            // by streaming deltas.
            setMessages(m => {
              const next = [...m, { role: 'user', text }, { role: 'bot', text: '' }]
              assistantPlaceholderRef.current = next.length - 1
              return next
            })
            persistMessage('user', text)
          },
          onAssistantDelta: (delta) => {
            const idx = assistantPlaceholderRef.current
            if (idx < 0) return
            setMessages(m => {
              const c = m.slice()
              if (c[idx]) c[idx] = { ...c[idx], text: (c[idx].text || '') + delta }
              return c
            })
          },
          onAssistantDone: (full) => {
            const idx = assistantPlaceholderRef.current
            if (idx >= 0) {
              setMessages(m => {
                const c = m.slice()
                if (c[idx]) c[idx] = { ...c[idx], text: full || c[idx].text }
                return c
              })
            }
            assistantPlaceholderRef.current = -1
            if (full) persistMessage('bot', full)
          },
          onError: (err) => {
            console.error('[realtime] error', err)
            showToast({ kind: 'danger', text: err?.message || 'Voice error' })
          },
        })
        realtimeRef.current = rt
        await rt.connect()
        setListening(true)
        return
      } catch (e) {
        console.error('[realtime] start failed', e)
        setCallError(e.message || String(e)); setCallState('error'); setCallMode(null)
        return
      }
    }

    // Otherwise: Anam path (avatar lip-sync, video, or voice without Cartesia)
    try {
      const session = await api.post('/api/avatar/session', { persona })
      const sessionToken = session.sessionToken || session.session_token || session.token
      if (!sessionToken) throw new Error('No sessionToken from /api/avatar/session')

      const sdk = await loadAnam()
      const createClient = sdk.createClient || sdk.default?.createClient
      if (typeof createClient !== 'function') throw new Error('Anam SDK is missing createClient export')

      const client = createClient(sessionToken)
      anamRef.current = client

      // Deduped user-message handler — Anam re-fires the history for assistant
      // updates too; only respond when the latest entry is a fresh user turn.
      const respondedTo = new Set()
      const onHistory = async (history) => {
        if (!Array.isArray(history) || history.length === 0) return
        const last = history[history.length - 1]
        if (last?.role !== 'user') return
        const key = last.id || last.messageId || `${history.length}::${(last.content || '').slice(0, 80)}`
        if (respondedTo.has(key)) return
        respondedTo.add(key)
        if (last.content) await streamReply(last.content, client)
      }
      try { client.addListener?.('MESSAGE_HISTORY_UPDATED', onHistory) } catch (e) { console.warn('[anam] listener attach failed', e) }

      const el = mediaRef.current
      if (!el) throw new Error('Media element not mounted')
      if (!el.id) el.id = `anam-media-${persona}`
      try {
        await client.streamToVideoElement(el.id)
      } catch (e) {
        if (/not found/i.test(String(e?.message || e))) {
          await new Promise(r => requestAnimationFrame(() => r()))
          await client.streamToVideoElement(el.id)
        } else { throw e }
      }
      try { el.muted = false; el.volume = 1; await el.play() } catch {}

      setCallState('live')
    } catch (e) {
      console.error('[avatar] start failed', e)
      const msg = e.message || String(e)
      setCallError(msg.includes('anam_not_configured')
        ? 'Avatar is not configured (ANAM_API_KEY missing on the server).'
        : msg)
      setCallState('error')
      setCallMode(null)
    }
  }, [persona, callState])

  function stopCall(silent = false) {
    try { anamRef.current?.stopStreaming?.() } catch {}
    try { anamRef.current?.disconnect?.() } catch {}
    anamRef.current = null
    try { if (mediaRef.current) { mediaRef.current.srcObject = null; mediaRef.current.pause() } } catch {}
    try { realtimeRef.current?.close() } catch {}
    realtimeRef.current = null
    assistantPlaceholderRef.current = -1
    if (!silent) { setCallState('idle'); setCallMode(null); setListening(false) }
    setMuted(false); setScreenSharing(false); setCallError(null)
  }

  // Persist a message to the server thread. Lazily creates the thread on the
  // first call. Best-effort — failures don't block the user.
  async function persistMessage(role, text) {
    try {
      if (!threadIdRef.current) {
        const seed = (text || '').slice(0, 60).trim() || (title || persona || 'Conversation')
        const r = await api.createThread(seed, persona || null)
        threadIdRef.current = r.thread?.id || null
        refreshThreads?.()
      }
      if (threadIdRef.current) {
        await api.postMessage(threadIdRef.current, role, text || '')
        refreshThreads?.()
      }
    } catch (e) {
      console.warn('[thread] persist failed', e?.message || e)
    }
  }

  async function streamReply(userText, anamClient = null) {
    setThinking(true)
    setMessages(m => [...m, { role: 'user', text: userText }])
    const allMessages = [...messagesRef.current, { role: 'user', text: userText }]
    persistMessage('user', userText)
    const token = getToken()
    const body = {
      persona,
      messages: allMessages.map(m => ({ role: m.role === 'bot' ? 'assistant' : m.role, content: m.text || '' })),
      // Voice mode: skip web search to cut 3-5 s of latency. Text/video modes
      // keep it enabled (Career Counsellor needs fresh scheme/job lookups).
      useWebSearch: callMode === 'voice' ? false : !!useWebSearch,
      extraSystem: effectiveSystem || undefined,
    }
    let talkStream = null
    if (anamClient && typeof anamClient.createTalkMessageStream === 'function') {
      try { talkStream = anamClient.createTalkMessageStream() } catch (e) { console.warn('[anam] createTalkMessageStream failed', e) }
    }
    let buffer = ''
    const citations = []
    let placeholderIndex = -1
    // Fresh AbortController per turn so barge-in can cancel the in-flight stream.
    try { streamAbortRef.current?.abort() } catch {}
    const ctrl = new AbortController()
    streamAbortRef.current = ctrl
    try {
      const res = await fetch('/api/ai/stream', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'authorization': `Bearer ${token}` },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      })
      if (!res.ok || !res.body) throw new Error(`stream HTTP ${res.status}`)
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let leftover = ''
      setMessages(m => { placeholderIndex = m.length; return [...m, { role: 'bot', text: '' }] })
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        const lines = (leftover + chunk).split('\n')
        leftover = lines.pop() || ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          let p; try { p = JSON.parse(line.slice(6)) } catch { continue }
          if (p.delta) {
            buffer += p.delta
            const idx = placeholderIndex
            setMessages(m => { const c = m.slice(); if (idx >= 0 && c[idx]) c[idx] = { ...c[idx], text: buffer }; return c })
            try { talkStream?.streamMessageChunk(p.delta) } catch {}
          }
          if (p.citation?.url) citations.push(p.citation)
          if (p.done) {
            if (citations.length) {
              const idx = placeholderIndex
              setMessages(m => { const c = m.slice(); if (idx >= 0) c[idx] = { ...c[idx], citations }; return c })
            }
            try { talkStream?.endMessage?.() } catch {}
            // Persist the final assistant text once the stream is complete.
            if (buffer.trim()) persistMessage('bot', buffer)
          }
          if (p.error) {
            const idx = placeholderIndex
            setMessages(m => { const c = m.slice(); if (idx >= 0) c[idx] = { ...c[idx], text: `(error) ${p.error}` }; return c })
          }
        }
      }
    } catch (e) {
      // AbortError = barge-in cancelled the stream; not a real failure.
      if (e?.name === 'AbortError') {
        console.log('[stream] aborted (barge-in)')
      } else {
        console.error('[stream]', e)
        setMessages(m => [...m, { role: 'bot', text: 'Sorry, I lost the connection. Please try again.' }])
      }
    } finally {
      setThinking(false)
      if (streamAbortRef.current === ctrl) streamAbortRef.current = null
    }
  }

  function sendText() {
    const t = input.trim()
    if (!t || thinking) return
    setInput('')
    // Active voice call: hand the typed text to the Realtime peer connection
    // so the AI hears and responds as if it were spoken. The user-transcript +
    // assistant-delta events from the data channel will populate the thread.
    if (callMode === 'voice' && realtimeRef.current) {
      setMessages(m => {
        const next = [...m, { role: 'user', text: t }, { role: 'bot', text: '' }]
        assistantPlaceholderRef.current = next.length - 1
        return next
      })
      persistMessage('user', t)
      realtimeRef.current.sendText(t)
      return
    }
    streamReply(t, anamRef.current)
  }
  function toggleMute() {
    setMuted(m => {
      const next = !m
      // Voice mode → mic is on the Realtime WebRTC peer connection.
      try { realtimeRef.current?.setMuted(next) } catch {}
      // Video mode → mic is on the Anam SDK.
      try {
        const c = anamRef.current
        if (c?.muteInputAudio) c.muteInputAudio(next)
        else if (c?.setInputAudioEnabled) c.setInputAudioEnabled(!next)
      } catch {}
      return next
    })
  }
  async function toggleScreenShare() {
    if (screenSharing) { setScreenSharing(false); showToast({ kind: 'info', text: 'Screen sharing stopped.' }); return }
    try {
      await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
      setScreenSharing(true)
      showToast({ kind: 'success', text: 'Screen shared with the assistant.' })
    } catch { showToast({ kind: 'warn', text: 'Screen share denied.' }) }
  }

  // ── Inject the WhatsApp-style call icons into the canvas header ─────────
  useEffect(() => {
    if (!setActions) return
    if (callState === 'idle') {
      setActions(
        <>
          <HeaderIconBtn onClick={() => startCall('voice')} title="Voice call" tone="primary">
            <Phone className="w-4 h-4" />
          </HeaderIconBtn>
          <HeaderIconBtn onClick={() => startCall('video')} title="Video call" tone="primary">
            <Video className="w-4 h-4" />
          </HeaderIconBtn>
        </>
      )
    } else if (callState === 'live') {
      setActions(
        <>
          <HeaderIconBtn onClick={toggleMute} tone={muted ? 'danger' : 'neutral'} title={muted ? 'Unmute' : 'Mute'}>
            {muted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </HeaderIconBtn>
          {callMode === 'video' && (
            <HeaderIconBtn onClick={toggleScreenShare} tone={screenSharing ? 'primary' : 'neutral'} title={screenSharing ? 'Stop sharing' : 'Share screen'}>
              {screenSharing ? <ScreenShareOff className="w-4 h-4" /> : <ScreenShare className="w-4 h-4" />}
            </HeaderIconBtn>
          )}
          <button onClick={() => stopCall()} title="End call"
            className="inline-flex items-center gap-1 px-2.5 md:px-3 py-1.5 rounded-pill bg-danger text-white font-bold text-[11px] md:text-[12px] hover:bg-danger/90 ml-1">
            <PhoneOff className="w-3.5 h-3.5" /> <span className="hidden sm:inline">End</span>
          </button>
        </>
      )
    } else if (callState === 'connecting') {
      setActions(<div className="inline-flex items-center gap-1 text-[12px] font-bold text-primary"><Loader2 className="w-4 h-4 animate-spin" /> Connecting…</div>)
    } else if (callState === 'error') {
      setActions(<button onClick={() => { setCallState('idle'); setCallMode(null) }} className="text-[12px] font-bold text-danger">Retry</button>)
    }
    return () => setActions(null)
  }, [setActions, callState, callMode, muted, screenSharing, startCall])

  // ── Live-call ribbon (avatar visual + status) ───────────────────────────
  const showRibbon = callState !== 'idle'
  const personaShort = (title || '').split(' · ')[0] || 'Assistant'

  return (
    <div style={{ fontFamily: 'Montserrat, sans-serif' }}>
      {/* Intro band */}
      <div className="px-5 pt-4 pb-3 border-b border-bdr-light bg-white">
        <div className="text-[11px] font-bold uppercase tracking-wider text-primary">{title || 'AI Companion'}</div>
        <div className="text-[12px] text-txt-secondary">{intro || 'Chat, or tap the phone/video icon above for a live call.'}</div>
      </div>

      {/* Live call ribbon — visible only when in call. ALWAYS contains the
          <video> element so audio plays (Anam requires it onscreen). */}
      <div className={`${showRibbon ? 'block' : 'hidden'} sticky top-[64px] z-10 bg-gradient-to-b from-primary-light/60 to-white border-b border-bdr-light`}>
        <div className="px-4 py-3 flex items-center gap-3">
          <video
            ref={mediaRef}
            id={`anam-media-${persona}`}
            playsInline
            autoPlay
            className={callMode === 'video'
              ? 'rounded-2xl bg-slate-900 w-full max-w-[420px] max-h-[240px] object-cover'
              : 'rounded-full bg-slate-900 w-14 h-14 object-cover flex-shrink-0'}
          />
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-bold text-txt-primary truncate flex items-center gap-2">
              {callState === 'connecting' ? 'Connecting…' : `On a ${callMode} call with ${personaShort}`}
              {listening && callState === 'live' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-pill bg-rose-100 text-rose-700 text-[10px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" /> listening
                </span>
              )}
            </div>
            <div className="text-[11px] text-txt-secondary truncate">
              {callState === 'live' ? 'Speak naturally — Whisper transcribes, Cartesia replies.' : ' '}
            </div>
            {callState === 'error' && callError && <div className="text-[11px] text-danger mt-1">{callError}</div>}
          </div>
        </div>
      </div>

      {/* Chat thread (always visible) */}
      <div className="px-4 md:px-5 py-4 flex flex-col gap-2.5 bg-white min-h-[260px]">
        {messages.length === 0 && suggestions.length > 0 && (
          <div className="mb-3">
            <div className="text-[11px] uppercase tracking-wider font-bold text-txt-tertiary mb-2">Try asking</div>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s, i) => (
                <button key={i} onClick={() => streamReply(s, anamRef.current)}
                  className="text-left text-[12px] px-3 py-2 rounded-2xl border border-bdr-light bg-white hover:border-primary">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.length === 0 && suggestions.length === 0 && (
          <div className="text-center py-6 text-txt-secondary text-[13px]">Type below, or tap the phone / video icon above to call.</div>
        )}
        {messages.map((m, i) => (
          <div key={i}>
            <ChatBubble role={m.role} text={m.text} />
            {m.citations?.length > 0 && (
              <div className="text-[10px] text-txt-tertiary mt-1 ml-2 flex flex-wrap gap-x-3">
                {m.citations.map((c, j) => (
                  <a key={j} href={c.url} target="_blank" rel="noreferrer" className="text-primary hover:underline truncate max-w-[260px]">{c.title || c.url}</a>
                ))}
              </div>
            )}
          </div>
        ))}
        {thinking && <div className="text-[11px] text-txt-tertiary px-2">thinking…</div>}
      </div>

      {/* Sticky input */}
      <div className="sticky bottom-0 px-3 md:px-4 py-3 border-t border-bdr-light bg-white z-10">
        <div className="flex items-center gap-2 rounded-pill border border-bdr-light bg-surface-page px-2 py-1.5">
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendText()}
            placeholder={`Message ${personaShort}…`}
            className="flex-1 bg-transparent text-[14px] px-3 py-1.5 outline-none placeholder:text-txt-tertiary" />
          <button onClick={sendText} disabled={!input.trim() || thinking}
            className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center disabled:bg-slate-300">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

// Header-tray icon button — small, circular, brand-coloured. WhatsApp vibe.
function HeaderIconBtn({ children, onClick, tone = 'primary', title }) {
  const css = tone === 'primary'
    ? 'bg-primary text-white hover:opacity-90'
    : tone === 'danger'
      ? 'bg-danger text-white hover:bg-danger/90'
      : 'bg-white text-txt-primary border border-bdr-light hover:bg-slate-50'
  return (
    <button onClick={onClick} title={title}
      className={`w-9 h-9 md:w-10 md:h-10 rounded-full shadow-card flex items-center justify-center transition ${css}`}>
      {children}
    </button>
  )
}
