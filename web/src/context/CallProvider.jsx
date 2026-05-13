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
  function stopScreenShareInternal(silent) {
    if (screenIntervalRef.current) { clearInterval(screenIntervalRef.current); screenIntervalRef.current = null }
    try { screenStreamRef.current?.getTracks().forEach(t => t.stop()) } catch {}
    screenStreamRef.current = null
    if (screenVideoRef.current) { try { screenVideoRef.current.srcObject = null } catch {} }
    lastDescriptionRef.current = ''
    if (!silent) {
      try { realtimeRef.current?.sendContext?.('[Screen share ended.]') } catch {}
    }
    patchCall({ screenSharing: false })
  }

  async function captureAndDescribe() {
    const stream = screenStreamRef.current
    if (!stream || !realtimeRef.current) return
    let video = screenVideoRef.current
    if (!video) {
      video = document.createElement('video')
      video.muted = true; video.playsInline = true; video.autoplay = true
      screenVideoRef.current = video
    }
    if (video.srcObject !== stream) {
      video.srcObject = stream
      try { await video.play() } catch {}
    }
    if (!video.videoWidth || !video.videoHeight) return
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
      if (!desc || desc === lastDescriptionRef.current) return
      lastDescriptionRef.current = desc
      realtimeRef.current?.sendContext?.(`[The user is currently looking at this screen: ${desc}]`)
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
      setTimeout(() => captureAndDescribe(), 600)
      screenIntervalRef.current = setInterval(captureAndDescribe, 5000)
    } catch (e) {
      // user cancelled or denied — fail quietly
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
