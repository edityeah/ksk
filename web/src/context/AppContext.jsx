import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { api, clearToken, getToken, setToken } from '../api/client.js'

const Ctx = createContext(null)
export const useApp = () => useContext(Ctx)

const SESSION_KEY = 'ksk.session.v1'

function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const j = JSON.parse(raw)
    if (!j || !j.role) return null
    return j
  } catch { return null }
}
function saveSession(s) { try { localStorage.setItem(SESSION_KEY, JSON.stringify(s)) } catch {} }

export function AppProvider({ children }) {
  const persisted = loadSession()
  const [screen, setScreenRaw] = useState(persisted?.screen || 'splash')
  const [stack, setStack] = useState(persisted?.stack || ['splash'])
  const [role, setRole] = useState(persisted?.role || null)
  const [user, setUser] = useState(persisted?.user || null)
  const [lang, setLang] = useState(persisted?.lang || 'en')
  const [meExtra, setMeExtra] = useState(persisted?.meExtra || null)
  const [canvas, setCanvas] = useState(null)               // { type, view?, ...ctx }
  const [toast, setToast] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [activeBot, setActiveBot] = useState('swifty')
  const [threads, setThreads] = useState([])              // sidebar chat list

  const signingOut = useRef(false)

  // hydrate /me on boot if token present
  useEffect(() => {
    let cancelled = false
    async function tick() {
      const t = getToken()
      if (!t) return
      try {
        const me = await api.me()
        if (cancelled) return
        setUser(me.user); setRole(me.user.role); setMeExtra(stripUser(me))
      } catch {
        clearToken()
        setUser(null); setRole(null); setMeExtra(null)
        setScreenRaw('splash'); setStack(['splash'])
      }
    }
    tick()
    return () => { cancelled = true }
  }, [])

  // persist session
  useEffect(() => {
    if (signingOut.current) return
    if (!role) return
    saveSession({ screen, stack, role, user, meExtra, lang })
  }, [screen, stack, role, user, meExtra, lang])

  // poll notifications when authenticated
  useEffect(() => {
    if (!role) return
    let cancelled = false
    const loop = async () => {
      try {
        const r = await api.notifications()
        if (!cancelled) setNotifications(r.notifications || [])
      } catch {}
    }
    loop()
    const id = setInterval(loop, 8000)
    return () => { cancelled = true; clearInterval(id) }
  }, [role])

  // ── nav ───────────────────────────────────────────────────────────────
  const navigate = useCallback((id, replace = false) => {
    setScreenRaw(id)
    setStack(s => replace ? [...s.slice(0, -1), id] : [...s, id])
  }, [])
  const goBack = useCallback(() => {
    setStack(s => {
      if (s.length <= 1) return s
      const next = s.slice(0, -1); setScreenRaw(next[next.length - 1]); return next
    })
  }, [])

  // ── auth ──────────────────────────────────────────────────────────────
  const completeLogin = useCallback(async (token, u) => {
    setToken(token)
    setUser(u); setRole(u.role)
    try { const me = await api.me(); setMeExtra(stripUser(me)) } catch {}
    setScreenRaw('home'); setStack(['home'])
  }, [])

  const signOut = useCallback(() => {
    signingOut.current = true
    clearToken()
    localStorage.removeItem(SESSION_KEY)
    setUser(null); setRole(null); setMeExtra(null); setCanvas(null); setNotifications([])
    setScreenRaw('splash'); setStack(['splash'])
    setTimeout(() => { signingOut.current = false }, 100)
  }, [])

  // ── canvas ────────────────────────────────────────────────────────────
  const openCanvas = useCallback((ctx) => setCanvas(ctx), [])
  const closeCanvas = useCallback(() => setCanvas(null), [])
  const updateCanvas = useCallback((patch) => setCanvas(c => c ? { ...c, ...patch } : c), [])

  // ── threads (sidebar chat list) ───────────────────────────────────────
  // Best-effort: failures stay silent — chat still works without the sidebar.
  const refreshThreads = useCallback(async () => {
    try {
      const r = await api.listThreads()
      setThreads(r.threads || [])
    } catch {}
  }, [])

  // Fetch threads whenever the user becomes authenticated.
  useEffect(() => {
    if (!role) { setThreads([]); return }
    refreshThreads()
  }, [role, refreshThreads])

  // Start a brand-new conversation — close any open canvas so the user lands
  // back on home, and ask consumers to refresh their thread list.
  const newChat = useCallback(() => {
    setCanvas(null)
    refreshThreads()
  }, [refreshThreads])

  // Open an existing thread — route to the right canvas based on `bot`, with
  // `threadId` so AvatarCall loads its message history. The `bot` column holds
  // the persona slug used at conversation time; map it to a canvas module.
  const PERSONA_TO_CANVAS = {
    'career-counsellor':  'career_counsellor',
    'mock-interviewer':   'mock_interview',
    'learning-assistant': 'learning_assistant',
    'general':            'swifty_assistant',
  }
  const openThread = useCallback((thread) => {
    if (!thread?.id) return
    const canvasType = PERSONA_TO_CANVAS[thread.bot] || thread.bot || 'swifty_assistant'
    setCanvas({ type: canvasType, threadId: thread.id })
  }, [])

  const showToast = useCallback((t) => { setToast(t); setTimeout(() => setToast(null), 3000) }, [])

  const value = useMemo(() => ({
    screen, stack, navigate, goBack,
    role, user, meExtra, lang, setLang,
    isAuthenticated: !!role,
    completeLogin, signOut,
    canvas, openCanvas, closeCanvas, updateCanvas,
    toast, showToast,
    notifications, refreshNotifications: async () => {
      try { const r = await api.notifications(); setNotifications(r.notifications || []) } catch {}
    },
    activeBot, setActiveBot,
    threads, refreshThreads, newChat, openThread,
  }), [screen, stack, navigate, goBack, role, user, meExtra, lang, canvas, toast, notifications, activeBot, threads, completeLogin, signOut, openCanvas, closeCanvas, updateCanvas, showToast, refreshThreads, newChat, openThread])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

function stripUser(me) { const { user, ...rest } = me; return rest }
