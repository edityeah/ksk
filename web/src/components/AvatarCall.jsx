// AvatarCall — reusable component for any AI persona canvas.
//
//   Modes: text  |  voice  |  video
//          - text: chat-only, uses /api/ai/stream + a chat UI
//          - voice: Anam audio-only (no <video> rendered)
//          - video: Anam <video> + screen-share toggle
//
//   Speech path: Anam captures user audio → emits MESSAGE_HISTORY_UPDATED →
//   we POST the full history to /api/ai/stream → pipe deltas back into
//   talk.streamMessageChunk() so Anam lip-syncs the avatar.
//
//   Text path: same /api/ai/stream endpoint, rendered in chat bubbles.

import { useCallback, useEffect, useRef, useState } from 'react'
import { Mic, MicOff, Phone, Video, MessageSquare, ScreenShare, ScreenShareOff, Send, Volume2, Loader2 } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { api, getToken } from '../api/client.js'
import { loadAnam } from '../utils/anamSdk.js'
import ChatBubble from './ChatBubble.jsx'

export default function AvatarCall({ persona, title, intro, useWebSearch, extraSystem }) {
  const { showToast, user } = useApp()
  const [mode, setMode] = useState('text')            // text | voice | video
  const [callState, setCallState] = useState('idle')  // idle | connecting | live | ended | error
  const [errMsg, setErrMsg] = useState(null)
  const [muted, setMuted] = useState(false)
  const [screenSharing, setScreenSharing] = useState(false)

  const [messages, setMessages] = useState([])
  const [thinking, setThinking] = useState(false)
  const [input, setInput] = useState('')

  const videoRef = useRef(null)
  const audioRef = useRef(null)
  const anamRef = useRef(null) // anam client instance
  const messagesRef = useRef([]) // mirror for handlers

  useEffect(() => { messagesRef.current = messages }, [messages])

  // ── Cleanup on unmount or mode change ─────────────────────────────────
  useEffect(() => () => stopAnam(), [])
  useEffect(() => {
    // when switching mode, tear down any live avatar session
    if (mode === 'text') stopAnam()
  }, [mode])

  function stopAnam() {
    try { anamRef.current?.stopStreaming?.() } catch {}
    try { anamRef.current = null } catch {}
    if (callState !== 'idle') setCallState('ended')
  }

  // ── Mint Anam session + start streaming ───────────────────────────────
  const startAnam = useCallback(async (kind) => {
    setCallState('connecting'); setErrMsg(null)
    try {
      const session = await api.post('/api/avatar/session', { persona })
      if (session?.error) throw new Error(session.error)
      const sessionToken = session.sessionToken || session.session_token || session.token
      if (!sessionToken) throw new Error('No sessionToken in Anam response')

      const sdk = await loadAnam()
      const create = sdk.createClient || sdk.default?.createClient || sdk.unsafe_createClientWithApiKey
      if (typeof create !== 'function') throw new Error('Anam SDK missing createClient export')

      const client = create(sessionToken)
      anamRef.current = client

      // Hook user-speech events → /api/ai/stream → talk.streamMessageChunk
      const evt = sdk.AnamEvent || {}
      const onHistory = async (history) => {
        // The last message is typically the user. Anam's exact event shape varies
        // across SDK versions, so we handle both.
        const newUserMsg = Array.isArray(history)
          ? [...history].reverse().find(m => m.role === 'user')
          : null
        if (!newUserMsg?.content) return
        await streamReply(newUserMsg.content, client)
      }
      try {
        client.addListener?.(evt.MESSAGE_HISTORY_UPDATED || 'MESSAGE_HISTORY_UPDATED', onHistory)
      } catch (e) { console.warn('[anam] listener attach failed', e) }

      // Mount the stream to <video> (video mode) or <audio> (voice mode)
      if (kind === 'video') {
        await client.streamToVideoElement(videoRef.current?.id || 'anam-video')
      } else {
        // voice-only: Anam still streams audio + (hidden) video.
        if (audioRef.current) await client.streamToVideoElement?.(audioRef.current.id || 'anam-audio')
        else await client.streamToVideoElement?.('anam-audio')
      }

      setCallState('live')
    } catch (e) {
      console.error('[avatar] start failed', e)
      setErrMsg(e.message || String(e))
      setCallState('error')
      showToast({ kind: 'danger', text: e.message?.includes('anam_not_configured')
        ? 'Avatar is not configured on this server. Set ANAM_API_KEY in Render env vars.'
        : 'Could not start the avatar. Falling back to text.' })
    }
  }, [persona, showToast])

  // ── Stream a reply chunk-by-chunk into the avatar ─────────────────────
  async function streamReply(userText, anamClient) {
    setThinking(true)
    setMessages(m => [...m, { role: 'user', text: userText }])
    const newMessages = [...messagesRef.current, { role: 'user', text: userText }]

    const token = getToken()
    const body = {
      persona,
      messages: newMessages.map(m => ({ role: m.role, content: m.text || m.html?.replace(/<[^>]+>/g, '') || '' })),
      useWebSearch: !!useWebSearch,
      extraSystem: extraSystem || undefined,
    }
    let buffer = ''
    let citations = []

    try {
      const res = await fetch('/api/ai/stream', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'authorization': `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      if (!res.ok || !res.body) throw new Error(`stream ${res.status}`)
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let leftover = ''

      setMessages(m => [...m, { role: 'bot', text: '' }])

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        const text = decoder.decode(value, { stream: true })
        const lines = (leftover + text).split('\n')
        leftover = lines.pop() || ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          let payload
          try { payload = JSON.parse(line.slice(6)) } catch { continue }
          if (payload.delta) {
            buffer += payload.delta
            setMessages(m => {
              const copy = m.slice()
              copy[copy.length - 1] = { role: 'bot', text: buffer }
              return copy
            })
            // pipe into avatar (if live)
            try { anamClient?.streamMessageChunk?.(payload.delta) } catch {}
          }
          if (payload.citation?.url) citations.push(payload.citation)
          if (payload.done) {
            // attach citations to the last bubble
            if (citations.length) {
              setMessages(m => {
                const copy = m.slice()
                const last = copy[copy.length - 1]
                copy[copy.length - 1] = { ...last, citations }
                return copy
              })
            }
            try { anamClient?.endMessage?.() } catch {}
          }
          if (payload.error) {
            setMessages(m => {
              const copy = m.slice()
              copy[copy.length - 1] = { role: 'bot', text: `(error) ${payload.error}` }
              return copy
            })
          }
        }
      }
    } catch (e) {
      console.error('[stream]', e)
      setMessages(m => [...m, { role: 'bot', text: 'Sorry, I lost the connection. Please try again.' }])
    } finally {
      setThinking(false)
    }
  }

  // ── Mode handlers ─────────────────────────────────────────────────────
  function pickMode(next) {
    if (next === mode) return
    if ((mode === 'voice' || mode === 'video') && callState === 'live') stopAnam()
    setMode(next)
    if (next === 'voice' || next === 'video') startAnam(next)
  }

  function endCall() {
    stopAnam(); setMode('text')
  }

  function toggleMute() {
    setMuted(m => !m)
    try {
      const c = anamRef.current
      if (c?.muteInputAudio) c.muteInputAudio(!muted)
      else if (c?.setInputAudioEnabled) c.setInputAudioEnabled(muted) // toggled value
    } catch {}
  }

  async function toggleScreenShare() {
    if (screenSharing) {
      // stop screen share — Anam doesn't natively share; we drop the substituted track
      setScreenSharing(false)
      showToast({ kind: 'info', text: 'Screen sharing stopped.' })
    } else {
      try {
        // request the screen — purely client-side display, also visible if recording
        await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
        setScreenSharing(true)
        showToast({ kind: 'success', text: 'Screen shared with the assistant.' })
      } catch {
        showToast({ kind: 'warn', text: 'Screen share denied.' })
      }
    }
  }

  function sendText() {
    const t = input.trim()
    if (!t || thinking) return
    setInput('')
    streamReply(t, anamRef.current)
  }

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full" style={{ fontFamily: 'Montserrat, sans-serif' }}>
      {/* Header */}
      <div className="px-5 pt-4 pb-3 border-b border-bdr-light flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[12px] font-bold uppercase tracking-wider text-primary">{title || 'AI Companion'}</div>
          <div className="text-[12px] text-txt-secondary truncate">{intro || 'Talk in text, voice, or video.'}</div>
        </div>
        <ModeToggle mode={mode} onPick={pickMode} />
      </div>

      {/* Avatar stage (voice/video) */}
      {(mode === 'voice' || mode === 'video') && (
        <div className="relative bg-gradient-to-b from-primary-light to-white flex-shrink-0">
          <div className={`mx-auto ${mode === 'video' ? 'aspect-video max-w-[640px]' : 'aspect-square w-[180px]'} relative`}>
            {/* Anam injects <video> into the element with the matching id */}
            <video
              id={mode === 'video' ? 'anam-video' : 'anam-audio'}
              ref={mode === 'video' ? videoRef : audioRef}
              playsInline
              autoPlay
              className={`w-full h-full rounded-2xl object-cover ${mode === 'voice' ? 'opacity-0 absolute inset-0' : ''} bg-slate-100`}
            />
            {mode === 'voice' && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-32 h-32 rounded-full bg-primary text-white flex items-center justify-center text-[64px] shadow-modal">
                  <Volume2 className="w-12 h-12" />
                </div>
              </div>
            )}
            {callState === 'connecting' && (
              <div className="absolute inset-0 bg-white/80 rounded-2xl flex items-center justify-center text-primary font-bold gap-2">
                <Loader2 className="w-5 h-5 animate-spin" /> Connecting to avatar…
              </div>
            )}
            {callState === 'error' && (
              <div className="absolute inset-0 bg-white/95 rounded-2xl flex flex-col items-center justify-center p-6 text-center text-danger">
                <div className="font-bold text-[15px]">Couldn't start the avatar</div>
                <div className="text-[12px] text-txt-secondary mt-1">{errMsg || 'Unknown error'}</div>
                <button onClick={() => pickMode('text')} className="mt-3 px-3 py-1.5 rounded-pill bg-primary text-white text-[12px] font-bold">Continue in text</button>
              </div>
            )}
          </div>

          {/* Call controls */}
          {callState === 'live' && (
            <div className="flex items-center justify-center gap-3 py-3">
              <CtrlBtn onClick={toggleMute} tone={muted ? 'danger' : 'neutral'} title={muted ? 'Unmute' : 'Mute'}>
                {muted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </CtrlBtn>
              {mode === 'video' && (
                <CtrlBtn onClick={toggleScreenShare} tone={screenSharing ? 'primary' : 'neutral'} title={screenSharing ? 'Stop sharing' : 'Share screen'}>
                  {screenSharing ? <ScreenShareOff className="w-4 h-4" /> : <ScreenShare className="w-4 h-4" />}
                </CtrlBtn>
              )}
              <CtrlBtn onClick={endCall} tone="danger" title="End call">
                <Phone className="w-4 h-4 rotate-[135deg]" />
              </CtrlBtn>
            </div>
          )}
        </div>
      )}

      {/* Chat thread (always shown — even during voice/video) */}
      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-2.5">
        {messages.length === 0 && (
          <div className="text-center py-8 text-txt-secondary text-[13px]">
            {mode === 'text'
              ? 'Type a message to start chatting.'
              : callState === 'live'
                ? 'Speak to the avatar. Your conversation appears here too.'
                : `Tap ${mode} to start the call, or just chat below.`}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i}>
            <ChatBubble role={m.role} text={m.text} html={m.html} />
            {m.citations?.length > 0 && (
              <div className="text-[10px] text-txt-tertiary mt-1 ml-2 flex flex-wrap gap-x-3 gap-y-0.5">
                {m.citations.map((c, j) => (
                  <a key={j} href={c.url} target="_blank" rel="noreferrer" className="text-primary hover:underline truncate max-w-[260px]">
                    {c.title || c.url}
                  </a>
                ))}
              </div>
            )}
          </div>
        ))}
        {thinking && <div className="text-[11px] text-txt-tertiary px-2">thinking…</div>}
      </div>

      {/* Text input */}
      <div className="px-4 py-3 border-t border-bdr-light bg-white">
        <div className="flex items-center gap-2 rounded-pill border border-bdr-light bg-surface-page px-2 py-1.5">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendText()}
            placeholder={mode === 'text' ? `Message ${title || 'assistant'}…` : 'Or type instead of speaking…'}
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

function ModeToggle({ mode, onPick }) {
  const opts = [
    { id: 'text',  icon: MessageSquare, label: 'Text' },
    { id: 'voice', icon: Mic,           label: 'Voice' },
    { id: 'video', icon: Video,         label: 'Video' },
  ]
  return (
    <div className="inline-flex rounded-pill border border-bdr-light bg-surface-page p-0.5 flex-shrink-0">
      {opts.map(o => {
        const Icon = o.icon
        const active = mode === o.id
        return (
          <button key={o.id} onClick={() => onPick(o.id)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill text-[12px] font-bold transition ${active ? 'bg-primary text-white shadow-card' : 'text-txt-secondary hover:text-txt-primary'}`}>
            <Icon className="w-3.5 h-3.5" /> {o.label}
          </button>
        )
      })}
    </div>
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
