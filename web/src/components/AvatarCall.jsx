// AvatarCall — reusable AI persona conversation panel.
//
// IMPORTANT:
//   * Text chat is ALWAYS available — no Anam minutes consumed.
//   * Voice/Video calls only start when the user explicitly clicks "Start Call".
//   * An explicit "End Call" button stops the Anam session.
//
// Speech path during a live call:
//   Anam captures the user's mic → emits MESSAGE_HISTORY_UPDATED event with
//   the latest user transcript → we POST the full chat history to
//   /api/ai/stream → backend streams OpenAI deltas via SSE → we pipe each
//   delta into client.streamMessageChunk(delta) so the avatar lip-syncs.
//
// Audio fix: the media <video> element is always rendered (display-only
// toggled via CSS), so it exists in the DOM before streamToVideoElement
// runs. We pass the element reference, not its id string.

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Mic, MicOff, Phone, PhoneOff, Video, ScreenShare, ScreenShareOff,
  Send, Volume2, Loader2, PhoneCall,
} from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { api, getToken } from '../api/client.js'
import { loadAnam } from '../utils/anamSdk.js'
import ChatBubble from './ChatBubble.jsx'

export default function AvatarCall({ persona, title, intro, useWebSearch, extraSystem, suggestions = [] }) {
  const { showToast } = useApp()

  const [messages, setMessages] = useState([])
  const [thinking, setThinking] = useState(false)
  const [input, setInput] = useState('')
  const messagesRef = useRef([])
  useEffect(() => { messagesRef.current = messages }, [messages])

  const [callMode, setCallMode] = useState('voice')
  const [callState, setCallState] = useState('idle')
  const [callError, setCallError] = useState(null)
  const [muted, setMuted] = useState(false)
  const [screenSharing, setScreenSharing] = useState(false)

  const mediaRef = useRef(null)
  const anamRef = useRef(null)

  useEffect(() => () => stopCall(true), [])

  const startCall = useCallback(async () => {
    if (callState === 'connecting' || callState === 'live') return
    setCallState('connecting'); setCallError(null)
    try {
      const session = await api.post('/api/avatar/session', { persona })
      const sessionToken = session.sessionToken || session.session_token || session.token
      if (!sessionToken) throw new Error('No sessionToken in Anam response')

      const sdk = await loadAnam()
      const createClient = sdk.createClient || sdk.default?.createClient
      if (typeof createClient !== 'function') throw new Error('Anam SDK is missing createClient export')

      const client = createClient(sessionToken)
      anamRef.current = client

      const evt = sdk.AnamEvent || {}
      const eventName = evt.MESSAGE_HISTORY_UPDATED || 'MESSAGE_HISTORY_UPDATED'
      const onHistory = async (history) => {
        const last = Array.isArray(history) ? [...history].reverse().find(m => m.role === 'user') : null
        if (last?.content) await streamReply(last.content, client)
      }
      try { client.addListener?.(eventName, onHistory) } catch (e) { console.warn('[anam] listener attach failed', e) }

      const el = mediaRef.current
      if (!el) throw new Error('Media element not mounted')
      try {
        if (typeof client.streamToVideoElement === 'function') await client.streamToVideoElement(el)
        else if (typeof client.stream === 'function') await client.stream(el)
      } catch (e) {
        try { await client.streamToVideoElement?.(el.id) } catch (e2) { throw e }
      }
      try { el.muted = false; el.volume = 1; await el.play() } catch {}

      setCallState('live')
    } catch (e) {
      console.error('[avatar] start failed', e)
      const msg = e.message || String(e)
      setCallError(msg.includes('anam_not_configured')
        ? 'Avatar service is not configured (ANAM_API_KEY missing on the server).'
        : msg)
      setCallState('error')
    }
  }, [persona, callState])

  function stopCall(silent = false) {
    try { anamRef.current?.stopStreaming?.() } catch {}
    try { anamRef.current?.disconnect?.() } catch {}
    anamRef.current = null
    try { if (mediaRef.current) { mediaRef.current.srcObject = null; mediaRef.current.pause() } } catch {}
    if (!silent) setCallState('idle')
    setMuted(false); setScreenSharing(false); setCallError(null)
  }

  async function streamReply(userText, anamClient = null) {
    setThinking(true)
    setMessages(m => [...m, { role: 'user', text: userText }])
    const allMessages = [...messagesRef.current, { role: 'user', text: userText }]

    const token = getToken()
    const body = {
      persona,
      messages: allMessages.map(m => ({ role: m.role, content: m.text || '' })),
      useWebSearch: !!useWebSearch,
      extraSystem: extraSystem || undefined,
    }

    let buffer = ''
    const citations = []
    let placeholderIndex = -1
    try {
      const res = await fetch('/api/ai/stream', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'authorization': `Bearer ${token}` },
        body: JSON.stringify(body),
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
          let p
          try { p = JSON.parse(line.slice(6)) } catch { continue }
          if (p.delta) {
            buffer += p.delta
            const idx = placeholderIndex
            setMessages(m => { const c = m.slice(); if (idx >= 0 && c[idx]) c[idx] = { ...c[idx], text: buffer }; return c })
            try { anamClient?.streamMessageChunk?.(p.delta) } catch {}
          }
          if (p.citation?.url) citations.push(p.citation)
          if (p.done) {
            if (citations.length) {
              const idx = placeholderIndex
              setMessages(m => { const c = m.slice(); if (idx >= 0) c[idx] = { ...c[idx], citations }; return c })
            }
            try { anamClient?.endMessage?.() } catch {}
          }
          if (p.error) {
            const idx = placeholderIndex
            setMessages(m => { const c = m.slice(); if (idx >= 0) c[idx] = { ...c[idx], text: `(error) ${p.error}` }; return c })
          }
        }
      }
    } catch (e) {
      console.error('[stream]', e)
      setMessages(m => [...m, { role: 'bot', text: 'Sorry, I lost the connection. Please try again.' }])
    } finally { setThinking(false) }
  }

  function sendText() {
    const t = input.trim()
    if (!t || thinking) return
    setInput('')
    streamReply(t, anamRef.current)
  }
  function toggleMute() {
    setMuted(m => !m)
    try {
      const c = anamRef.current
      if (c?.muteInputAudio) c.muteInputAudio(!muted)
      else if (c?.setInputAudioEnabled) c.setInputAudioEnabled(muted)
    } catch {}
  }
  async function toggleScreenShare() {
    if (screenSharing) { setScreenSharing(false); showToast({ kind: 'info', text: 'Screen sharing stopped.' }); return }
    try {
      await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
      setScreenSharing(true)
      showToast({ kind: 'success', text: 'Screen shared with the assistant.' })
    } catch { showToast({ kind: 'warn', text: 'Screen share denied.' }) }
  }

  const isCalling = callState === 'connecting' || callState === 'live'
  const personaShort = (title || '').split(' · ')[0] || 'Assistant'

  return (
    <div className="flex flex-col h-full" style={{ fontFamily: 'Montserrat, sans-serif' }}>
      <div className="px-5 pt-4 pb-3 border-b border-bdr-light flex-shrink-0">
        <div className="text-[12px] font-bold uppercase tracking-wider text-primary">{title || 'AI Companion'}</div>
        <div className="text-[12px] text-txt-secondary">{intro || 'Chat in text, or start a voice / video call.'}</div>
      </div>

      {/* Always-rendered media element so Anam can mount whenever the user starts a call */}
      <video ref={mediaRef} id={`anam-media-${persona}`} playsInline autoPlay
        className="hidden" />

      {/* Call panel */}
      <div className="flex-shrink-0 border-b border-bdr-light">
        {callState === 'idle' && (
          <div className="px-5 py-4 bg-gradient-to-b from-primary-light/40 to-white">
            <div className="text-[13px] font-bold text-txt-primary mb-2">📞 Start a call with {personaShort}</div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="inline-flex rounded-pill border border-bdr-light bg-white p-0.5">
                <ModeBtn active={callMode === 'voice'} onClick={() => setCallMode('voice')} icon={Mic}   label="Voice" />
                <ModeBtn active={callMode === 'video'} onClick={() => setCallMode('video')} icon={Video} label="Video" />
              </div>
              <button onClick={startCall}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-pill bg-primary text-white font-bold text-[13px] shadow-modal hover:opacity-90 active:scale-95 transition">
                <PhoneCall className="w-4 h-4" /> Start {callMode === 'video' ? 'Video' : 'Voice'} Call
              </button>
            </div>
            <div className="text-[10px] text-txt-tertiary mt-2">Anam minutes are only used during a live call. Text chat below is always free.</div>
          </div>
        )}

        {isCalling && (
          <div className="bg-gradient-to-b from-primary-light/40 to-white p-4">
            <div className={`mx-auto relative ${callMode === 'video' ? 'aspect-video max-w-[480px]' : 'h-[140px] flex items-center justify-center'}`}>
              {callMode === 'video' ? (
                <VideoMirror sourceRef={mediaRef} />
              ) : (
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-primary text-white flex items-center justify-center shadow-modal animate-pulse">
                    <Volume2 className="w-8 h-8" />
                  </div>
                  <div>
                    <div className="text-[14px] font-bold text-txt-primary">{personaShort} is listening…</div>
                    <div className="text-[11px] text-txt-secondary mt-0.5">Speak naturally. Your voice is transcribed and answered live.</div>
                  </div>
                </div>
              )}
              {callState === 'connecting' && (
                <div className="absolute inset-0 bg-white/85 rounded-2xl flex items-center justify-center text-primary font-bold gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" /> Connecting…
                </div>
              )}
            </div>

            {callState === 'live' && (
              <div className="flex items-center justify-center gap-3 mt-3">
                <CtrlBtn onClick={toggleMute} tone={muted ? 'danger' : 'neutral'} title={muted ? 'Unmute' : 'Mute'}>
                  {muted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </CtrlBtn>
                {callMode === 'video' && (
                  <CtrlBtn onClick={toggleScreenShare} tone={screenSharing ? 'primary' : 'neutral'} title={screenSharing ? 'Stop sharing' : 'Share screen'}>
                    {screenSharing ? <ScreenShareOff className="w-4 h-4" /> : <ScreenShare className="w-4 h-4" />}
                  </CtrlBtn>
                )}
                <button onClick={() => stopCall()} title="End call"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-pill bg-danger text-white font-bold text-[13px] hover:bg-danger/90">
                  <PhoneOff className="w-4 h-4" /> End Call
                </button>
              </div>
            )}
          </div>
        )}

        {callState === 'error' && (
          <div className="px-5 py-4 bg-rose-50">
            <div className="text-[13px] font-bold text-danger">Couldn't start the call</div>
            <div className="text-[12px] text-txt-secondary mt-1">{callError}</div>
            <button onClick={() => setCallState('idle')} className="mt-2 px-3 py-1 rounded-pill bg-primary text-white text-[12px] font-bold">Try again</button>
          </div>
        )}
      </div>

      {/* Chat */}
      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-2.5">
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
          <div className="text-center py-6 text-txt-secondary text-[13px]">Type below or start a call.</div>
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

      {/* Input */}
      <div className="px-4 py-3 border-t border-bdr-light bg-white flex-shrink-0">
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

// Mirrors the hidden source <video>'s stream into a visible <video> for video-mode display.
function VideoMirror({ sourceRef }) {
  const ref = useRef(null)
  useEffect(() => {
    const src = sourceRef.current
    const dst = ref.current
    if (!src || !dst) return
    function sync() {
      try { dst.srcObject = src.srcObject; dst.muted = true; dst.play() } catch {}
    }
    sync()
    src.addEventListener('loadedmetadata', sync)
    const t = setInterval(sync, 500) // catch late-attached streams
    return () => { try { src.removeEventListener('loadedmetadata', sync); clearInterval(t) } catch {} }
  }, [sourceRef])
  return <video ref={ref} playsInline autoPlay muted className="w-full h-full rounded-2xl object-cover bg-slate-900" />
}

function ModeBtn({ active, onClick, icon: Icon, label }) {
  return (
    <button onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill text-[12px] font-bold transition ${active ? 'bg-primary text-white' : 'text-txt-secondary hover:text-txt-primary'}`}>
      <Icon className="w-3.5 h-3.5" /> {label}
    </button>
  )
}
function CtrlBtn({ children, onClick, tone = 'neutral', title }) {
  const css = tone === 'danger'  ? 'bg-danger text-white hover:bg-danger/90'
            : tone === 'primary' ? 'bg-primary text-white hover:opacity-90'
            : 'bg-white text-txt-primary border border-bdr-light hover:bg-slate-50'
  return (
    <button onClick={onClick} title={title}
      className={`w-11 h-11 rounded-full shadow-card flex items-center justify-center transition ${css}`}>
      {children}
    </button>
  )
}
