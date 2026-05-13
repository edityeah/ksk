// CallProvider — app-level call session that survives canvas open / close.
//
// Without this, every AvatarCall instance owned its own RealtimeVoice / Anam
// connection. When the user closed the canvas (e.g. they wanted to navigate
// elsewhere while screen-sharing), the AvatarCall component unmounted and
// the connection was torn down with it — the call dropped.
//
// With this provider the call session lives at the React root: starts when
// the user taps Voice / Video on any AvatarCall, persists across canvas
// changes, and only ends when the user explicitly hits End. A FloatingCallPill
// shows up whenever a call is live but the corresponding canvas is closed,
// so the user can re-open the canvas or end the call from anywhere.
//
// AvatarCall reads `activeCall` from this provider and treats itself as a
// VIEW on the session — it binds its own transcript handlers on mount and
// clears them on unmount. Persistence to the chat thread happens here, not
// in AvatarCall, so messages keep flowing into the DB even with no UI bound.

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { RealtimeVoice } from '../utils/realtimeVoice.js'
import { loadAnam } from '../utils/anamSdk.js'
import { api } from '../api/client.js'

const CallCtx = createContext(null)
export const useCall = () => useContext(CallCtx)

export function CallProvider({ children }) {
  // Single source of truth for any in-progress call.
  // null = no call. Shape: { persona, mode, state, muted, screenSharing, threadId, startedAt, error?, title? }
  const [activeCall, setActiveCall] = useState(null)

  // Refs (intentionally outside React state so they survive renders without
  // triggering re-renders on every update).
  const realtimeRef       = useRef(null)
  const anamRef           = useRef(null)
  const personaRef        = useRef(null)
  const threadIdRef       = useRef(null)
  const screenStreamRef   = useRef(null)
  const screenVideoRef    = useRef(null)
  const screenIntervalRef = useRef(null)
  const lastDescriptionRef = useRef('')
  const handlersRef       = useRef({})         // current view's onTranscript / onDelta / onDone
  const videoElementRef   = useRef(null)       // <video> for Anam (provided by current view)
  const userRoleRef       = useRef(null)

  const patchCall = (patch) => setActiveCall(c => c ? { ...c, ...patch } : c)

  // ── Thread persistence (best-effort, never blocks the call) ─────────────
  async function persistMessage(role, text) {
    try {
      if (!threadIdRef.current) {
        const seed = (text || '').slice(0, 60).trim() || (personaRef.current || 'Conversation')
        const r = await api.createThread(seed, personaRef.current || null)
        threadIdRef.current = r.thread?.id || null
        // Push the new thread id into call state so views can subscribe.
        patchCall({ threadId: threadIdRef.current })
      }
      if (threadIdRef.current) {
        await api.postMessage(threadIdRef.current, role, text || '')
      }
    } catch (e) {
      console.warn('[call] persist failed', e?.message || e)
    }
  }

  // ── Voice call (OpenAI Realtime via WebRTC) ─────────────────────────────
  const startVoiceCall = useCallback(async ({ persona, title, extraSystem, voice, threadId, role }) => {
    if (activeCall) return
    personaRef.current = persona
    threadIdRef.current = threadId || null
    userRoleRef.current = role || null
    setActiveCall({
      persona, title: title || persona, mode: 'voice', state: 'connecting',
      muted: false, screenSharing: false, threadId: threadId || null,
      startedAt: Date.now(),
    })

    const rt = new RealtimeVoice({
      persona,
      extraSystem,
      voice,
      role,                            // role-aware persona switching on the server
      onState: (s) => patchCall({ state: s }),
      onUserTranscript: (text) => {
        try { handlersRef.current.onUserTranscript?.(text) } catch {}
        persistMessage('user', text)
      },
      onAssistantDelta: (delta) => {
        try { handlersRef.current.onAssistantDelta?.(delta) } catch {}
      },
      onAssistantDone: (full) => {
        try { handlersRef.current.onAssistantDone?.(full) } catch {}
        if (full?.trim()) persistMessage('bot', full)
      },
      onError: (err) => patchCall({ state: 'error', error: err?.message || String(err) }),
    })
    realtimeRef.current = rt
    try { await rt.connect() } catch { /* surfaced via onError */ }
  }, [activeCall])

  // ── Video call (Anam) — the view that opens it must hand us a <video> el.
  // Anam requires its target element to be in the DOM with an id; we keep the
  // session alive even after the view unmounts, but the video frame will go
  // black until a view re-binds an element.
  const bindVideoElement = useCallback((el) => {
    videoElementRef.current = el || null
    const client = anamRef.current
    if (client && el) {
      if (!el.id) el.id = `anam-media-${personaRef.current || 'persona'}`
      try { client.streamToVideoElement(el.id) } catch (e) { /* idempotent attempt */ }
    }
  }, [])

  const startVideoCall = useCallback(async ({ persona, title, extraSystem, threadId, role, mediaElement, onHistory }) => {
    if (activeCall) return
    personaRef.current = persona
    threadIdRef.current = threadId || null
    userRoleRef.current = role || null
    setActiveCall({
      persona, title: title || persona, mode: 'video', state: 'connecting',
      muted: false, screenSharing: false, threadId: threadId || null,
      startedAt: Date.now(),
    })

    try {
      const session = await api.post('/api/avatar/session', { persona })
      const sessionToken = session.sessionToken || session.session_token || session.token
      if (!sessionToken) throw new Error('No sessionToken from /api/avatar/session')
      const sdk = await loadAnam()
      const createClient = sdk.createClient || sdk.default?.createClient
      if (typeof createClient !== 'function') throw new Error('Anam SDK missing createClient')
      const client = createClient(sessionToken)
      anamRef.current = client

      // Persist user turns from Anam's history events (it transcribes via its own STT).
      const respondedTo = new Set()
      client.addListener?.('MESSAGE_HISTORY_UPDATED', async (history) => {
        if (!Array.isArray(history) || history.length === 0) return
        const last = history[history.length - 1]
        if (last?.role !== 'user') return
        const key = last.id || last.messageId || `${history.length}::${(last.content || '').slice(0, 80)}`
        if (respondedTo.has(key)) return
        respondedTo.add(key)
        if (last.content) {
          try { handlersRef.current.onUserTranscript?.(last.content) } catch {}
          persistMessage('user', last.content)
          try { await onHistory?.(history, client) } catch {}
        }
      })

      if (mediaElement) {
        videoElementRef.current = mediaElement
        if (!mediaElement.id) mediaElement.id = `anam-media-${persona}`
        await client.streamToVideoElement(mediaElement.id)
        try { mediaElement.muted = false; mediaElement.volume = 1; await mediaElement.play() } catch {}
      }
      patchCall({ state: 'live' })
    } catch (e) {
      console.error('[call] video start failed', e?.message || e)
      patchCall({ state: 'error', error: e?.message || String(e) })
    }
  }, [activeCall])

  // ── Mute / send text / end ───────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    setActiveCall(c => {
      if (!c) return c
      const next = !c.muted
      try { realtimeRef.current?.setMuted(next) } catch {}
      try {
        const ac = anamRef.current
        if (ac?.muteInputAudio) ac.muteInputAudio(next)
        else if (ac?.setInputAudioEnabled) ac.setInputAudioEnabled(!next)
      } catch {}
      return { ...c, muted: next }
    })
  }, [])

  const sendText = useCallback((text) => {
    if (!text || !activeCall) return false
    if (activeCall.mode === 'voice' && realtimeRef.current) {
      try { handlersRef.current.onUserTranscript?.(text) } catch {}
      persistMessage('user', text)
      realtimeRef.current.sendText(text)
      return true
    }
    return false
  }, [activeCall])

  // ── Screen share ─────────────────────────────────────────────────────────
  // Strong system message sent the moment screen share starts. This OVERRIDES
  // the default "I'm a voice-only assistant" stance the model otherwise takes.
  // Without it, the model receives screen descriptions but still answers "I
  // can't see your screen" because nothing told it that it can.
  const VISION_ON = `SCREEN SHARE IS NOW ACTIVE.

You can now SEE the user's screen via live descriptions delivered as system messages prefixed with [SCREEN]. Every 5 seconds you receive a fresh description of what is currently visible to the user.

CRITICAL BEHAVIOUR while screen share is active:
- Treat [SCREEN] descriptions as your eyes — answer EXACTLY as if you are looking at the user's monitor.
- NEVER say "I can't see your screen" or "I'm a voice assistant without vision". You can see. You do see.
- When the user points at something ("this button", "this number"), use the latest [SCREEN] description to identify what they mean.
- Be specific: name the visible button labels, KPIs, headings, sectors, partners, numbers — whatever is in the description.
- If the description is stale (user mentions something not in the latest snapshot), say "give me a second to refresh my view" — a new description arrives within 5 seconds.`

  const VISION_OFF = 'SCREEN SHARE ENDED. You no longer have screen visibility. Go back to answering based on conversation + your baked-in knowledge.'

  function stopScreenShareInternal(silent) {
    if (screenIntervalRef.current) { clearInterval(screenIntervalRef.current); screenIntervalRef.current = null }
    try { screenStreamRef.current?.getTracks().forEach(t => t.stop()) } catch {}
    screenStreamRef.current = null
    if (screenVideoRef.current) {
      try { screenVideoRef.current.srcObject = null } catch {}
      // Detach from body so we don't leak DOM nodes across sessions.
      try { screenVideoRef.current.parentNode?.removeChild(screenVideoRef.current) } catch {}
      screenVideoRef.current = null
    }
    lastDescriptionRef.current = ''
    if (!silent) {
      try { realtimeRef.current?.sendContext?.(VISION_OFF) } catch {}
    }
    patchCall({ screenSharing: false })
  }

  async function captureAndDescribe() {
    const stream = screenStreamRef.current
    if (!stream || !realtimeRef.current) return
    let video = screenVideoRef.current
    if (!video) {
      // Attach to <body> hidden, otherwise some browsers don't allocate a
      // decoder and videoWidth/Height stay 0 forever — frames are blank.
      video = document.createElement('video')
      video.muted = true; video.playsInline = true; video.autoplay = true
      video.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;'
      try { document.body.appendChild(video) } catch {}
      screenVideoRef.current = video
    }
    if (video.srcObject !== stream) {
      video.srcObject = stream
      try { await video.play() } catch {}
    }
    // Wait up to ~1s for metadata before bailing — first frame after attach
    // sometimes lags.
    if (!video.videoWidth || !video.videoHeight) {
      try {
        await new Promise((resolve) => {
          const onMeta = () => { video.removeEventListener('loadedmetadata', onMeta); resolve() }
          video.addEventListener('loadedmetadata', onMeta)
          setTimeout(() => { video.removeEventListener('loadedmetadata', onMeta); resolve() }, 1000)
        })
      } catch {}
    }
    if (!video.videoWidth || !video.videoHeight) {
      console.warn('[screen] no video dimensions yet, skipping this tick')
      return
    }
    const maxEdge = 1024
    const ratio = Math.min(maxEdge / video.videoWidth, maxEdge / video.videoHeight, 1)
    const w = Math.round(video.videoWidth * ratio)
    const h = Math.round(video.videoHeight * ratio)
    const canvas = document.createElement('canvas')
    canvas.width = w; canvas.height = h
    canvas.getContext('2d').drawImage(video, 0, 0, w, h)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.7)
    try {
      const r = await api.post('/api/ai/describe-screen', {
        image: dataUrl,
        persona: personaRef.current,
        role: userRoleRef.current,
      })
      const desc = (r?.description || '').trim()
      if (!desc) return
      // Always inject the latest snapshot — even if it matches the previous
      // one. The model needs the freshness signal to answer "what's on my
      // screen right now" without staleness.
      lastDescriptionRef.current = desc
      realtimeRef.current?.sendContext?.(`[SCREEN] ${desc}`)
      console.log('[screen] →', desc.slice(0, 80))
    } catch (e) {
      console.warn('[screen] describe failed', e?.message || e)
    }
  }

  const startScreenShare = useCallback(async () => {
    if (!realtimeRef.current) return
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 5 }, audio: false })
      screenStreamRef.current = stream
      patchCall({ screenSharing: true })
      stream.getVideoTracks()[0].onended = () => stopScreenShareInternal()
      // Announce vision is ON to the model BEFORE the first frame arrives so
      // any user question in the gap gets the right framing.
      try { realtimeRef.current?.sendContext?.(VISION_ON) } catch {}
      setTimeout(() => captureAndDescribe(), 600)
      screenIntervalRef.current = setInterval(captureAndDescribe, 5000)
    } catch (e) {
      console.warn('[screen] getDisplayMedia failed', e?.message || e)
    }
  }, [])

  const stopScreenShare = useCallback(() => stopScreenShareInternal(false), [])

  // ── End ──────────────────────────────────────────────────────────────────
  const endCall = useCallback(() => {
    stopScreenShareInternal(true)
    try { realtimeRef.current?.close() } catch {}
    try { anamRef.current?.stopStreaming?.() } catch {}
    try { anamRef.current?.disconnect?.() } catch {}
    realtimeRef.current = null
    anamRef.current = null
    if (videoElementRef.current) {
      try { videoElementRef.current.srcObject = null; videoElementRef.current.pause() } catch {}
    }
    videoElementRef.current = null
    personaRef.current = null
    threadIdRef.current = null
    userRoleRef.current = null
    setActiveCall(null)
  }, [])

  // ── View binding ─────────────────────────────────────────────────────────
  // AvatarCall calls bindHandlers on mount to receive live transcripts / deltas.
  // When it unmounts (canvas closed), bindHandlers(null) clears the bind and
  // transcripts continue flowing to the thread but not to any UI.
  const bindHandlers = useCallback((h) => { handlersRef.current = h || {} }, [])

  // Safety net: if the provider itself unmounts (full app teardown), tear down
  // any live call so we don't leak network connections.
  useEffect(() => () => endCall(), [])  // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <CallCtx.Provider value={{
      activeCall,
      startVoiceCall, startVideoCall, endCall,
      toggleMute, sendText,
      startScreenShare, stopScreenShare,
      bindHandlers, bindVideoElement,
      screenStreamRef,           // exposed so the PiP preview can read the same stream
    }}>
      {children}
    </CallCtx.Provider>
  )
}
