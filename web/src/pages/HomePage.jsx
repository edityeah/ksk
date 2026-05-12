import { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { api } from '../api/client.js'
import { defaultBotsFor, suggestionsFor, homeLayoutFor, ROLE_LABELS, ROLE_SCOPES } from '../roles/roleConfig.js'
import { dispatchActionForRole } from '../nlp/dispatch.js'
import TopBar from '../components/TopBar.jsx'
import ChatBubble from '../components/ChatBubble.jsx'
import ChatInput from '../components/ChatInput.jsx'
import QuickReplies from '../components/QuickReplies.jsx'
import TypingIndicator from '../components/TypingIndicator.jsx'
import BotTile from '../components/BotTile.jsx'
import { MessageSquare, Plus, Bell } from 'lucide-react'

export default function HomePage() {
  const { role, user } = useApp()
  const layout = homeLayoutFor(role)
  if (layout === 'mobile') return <MobileHome />
  return <DesktopHome />
}

// ── shared chat hook ─────────────────────────────────────────────────────────
function useSwifty() {
  const ctx = useApp()
  const [messages, setMessages] = useState([])
  const [typing, setTyping] = useState(false)
  const greetedRef = useRef(false)

  useEffect(() => {
    if (greetedRef.current) return
    greetedRef.current = true
    const name = ctx.user?.name?.split(' ')[0] || 'there'
    setMessages([{
      role: 'bot',
      text: `Namaste ${name}. I'm Swifty — your ${ROLE_LABELS[ctx.role]?.toLowerCase()} companion. Tap a card or ask me anything.`,
    }])
  }, [])

  async function send(text) {
    setMessages(m => [...m, { role: 'user', text }])
    setTyping(true)
    try {
      const r = await api.aiMessage(text, ctx.lang)
      handleResponse(r)
    } catch {
      setMessages(m => [...m, { role: 'bot', text: 'Sorry, I could not reach the server.' }])
    } finally {
      setTyping(false)
    }
  }

  function handleResponse(r) {
    if (r.responseType === 'action') {
      setMessages(m => [...m, { role: 'bot', text: r.meta?.assistantText || 'Opening…' }])
      // Map action → canvas / nav
      dispatchActionForRole({ actionId: r.actionId, entities: r.entities, role: ctx.role, openCanvas: ctx.openCanvas, showToast: ctx.showToast })
    } else if (r.responseType === 'answer') {
      setMessages(m => [...m, {
        role: 'bot', text: r.answer.text,
        html: r.answer.text + (r.answer.citations?.length ? `<div class="mt-2 text-[10px] text-slate-500">Sources: ${r.answer.citations.map(c => c.source).join(' · ')}</div>` : ''),
      }])
    } else {
      const fallback = r.assistantText || "I'm not sure how to help with that yet."
      setMessages(m => [...m, { role: 'bot', text: fallback, actions: (r.chips || []).map(c => ({ label: c, kind: 'chip', value: c })) }])
    }
  }

  function pick(chipOrAction) {
    if (chipOrAction.kind === 'chip') send(chipOrAction.value)
    else if (chipOrAction.kind === 'bot') {
      const b = chipOrAction.bot
      if (b.id === 'swifty') return
      // Map bot tile → suggested first prompt for the role module
      const seed = suggestionsFor(ctx.role)[0] || `Open ${b.name}`
      send(seed)
    } else if (chipOrAction.kind === 'launch_canvas') {
      ctx.openCanvas(chipOrAction.canvas)
    }
  }
  return { messages, typing, send, pick }
}

// ── Mobile-frame home: chat-first (trainee, trainer, employer) ──────────────
function MobileHome() {
  const { role, user, openCanvas } = useApp()
  const { messages, typing, send, pick } = useSwifty()
  const chips = suggestionsFor(role)
  const bots = defaultBotsFor(role)

  return (
    <div className="mobile-frame flex flex-col" style={{ height: '100vh' }}>
      <TopBar />
      <div className="flex-1 overflow-y-auto flex flex-col">
        {/* Bot tile grid (above chat) */}
        <div className="p-3 grid grid-cols-2 gap-2">
          {bots.map(b => (
            <BotTile key={b.id} bot={b} compact onClick={() => pick({ kind: 'bot', bot: b })} />
          ))}
        </div>
        {/* Chat thread */}
        <div className="px-3 py-2 flex flex-col gap-2 flex-1">
          {messages.map((m, i) => (
            <ChatBubble key={i} role={m.role} text={m.text} html={m.html} actions={m.actions}
              onAction={(a) => pick(a)} />
          ))}
          {typing && <TypingIndicator />}
        </div>
      </div>
      <QuickReplies chips={chips} onPick={send} />
      <ChatInput onSend={send} placeholder="Ask Swifty…" />
    </div>
  )
}

// ── Desktop home: sidebar + chat + bot tiles + canvas-on-right ──────────────
function DesktopHome() {
  const { role, user, openCanvas } = useApp()
  const { messages, typing, send, pick } = useSwifty()
  const chips = suggestionsFor(role)
  const bots = defaultBotsFor(role)
  const [threads] = useState([{ id: 'now', title: 'Today\'s session' }])

  return (
    <div className="min-h-screen flex flex-col bg-ksk-wash">
      <TopBar />
      <div className="flex-1 grid grid-cols-[260px_1fr] min-h-0">
        {/* sidebar */}
        <aside className="bg-white border-r border-bdr-light flex flex-col">
          <button className="m-3 inline-flex items-center justify-center gap-2 py-2 text-sm font-medium bg-primary-500 text-white rounded-card">
            <Plus className="w-4 h-4" /> New chat
          </button>
          <div className="px-3 text-xs uppercase font-medium text-txt-secondary tracking-wider">Recent</div>
          <div className="px-3 mt-1 flex-1 overflow-y-auto">
            {threads.map(t => (
              <div key={t.id} className="px-2 py-2 text-sm rounded hover:bg-slate-50 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-txt-tertiary" /> {t.title}
              </div>
            ))}
          </div>
          <div className="border-t border-bdr-light p-3 text-xs text-txt-secondary">
            <div className="font-medium text-txt-primary">{user?.name}</div>
            <div>{ROLE_LABELS[role]} · {ROLE_SCOPES[role]}</div>
          </div>
        </aside>

        {/* main */}
        <main className="flex flex-col min-h-0">
          {messages.length <= 1 ? (
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-4xl mx-auto">
                <h1 className="text-2xl font-semibold">Namaste, {user?.name?.split(' ')[0]} 👋</h1>
                <p className="text-sm text-txt-secondary mt-1">{ROLE_LABELS[role]} · {ROLE_SCOPES[role]}. Pick a tool below, or ask me anything.</p>

                <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {bots.map(b => (
                    <BotTile key={b.id} bot={b} onClick={() => pick({ kind: 'bot', bot: b })} />
                  ))}
                </div>

                <div className="mt-8">
                  <div className="text-xs uppercase font-medium text-txt-secondary tracking-wider mb-2">Suggested</div>
                  <div className="flex flex-wrap gap-2">
                    {chips.map((c, i) => <button key={i} onClick={() => send(c)} className="chip">{c}</button>)}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-3xl mx-auto flex flex-col gap-3">
                {messages.map((m, i) => (
                  <ChatBubble key={i} role={m.role} text={m.text} html={m.html} actions={m.actions} onAction={pick} />
                ))}
                {typing && <TypingIndicator />}
              </div>
            </div>
          )}
          <QuickReplies chips={messages.length > 1 ? [] : chips} onPick={send} />
          <ChatInput onSend={send} placeholder="Ask Swifty…" />
        </main>
      </div>
    </div>
  )
}
