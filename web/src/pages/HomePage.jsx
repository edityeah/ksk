// KSK SuperHomePage — visually mirrors SwiftChat's SuperHomePage layout.
//
// Desktop: header + left sidebar (chat history grouped by recency + sign out) +
//          main panel (greeting card + Ask AI suggestion grid + bot tile grid)
// Mobile:  header + greeting + Ask AI panel + bot tiles + chat input pinned bottom

import { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { api } from '../api/client.js'
import { defaultBotsFor, suggestionsFor, homeLayoutFor, ROLE_LABELS, ROLE_SCOPES } from '../roles/roleConfig.js'
import { dispatchActionForRole } from '../nlp/dispatch.js'
import Logo from '../components/Logo.jsx'
import SwiftChatLogo from '../components/SwiftChatLogo.jsx'
import NsdcLogo from '../components/NsdcLogo.jsx'
import ChatBubble from '../components/ChatBubble.jsx'
import ChatInput from '../components/ChatInput.jsx'
import QuickReplies from '../components/QuickReplies.jsx'
import TypingIndicator from '../components/TypingIndicator.jsx'
import { Bell, LogOut, MessageSquare, Plus, Search, Sparkles, ChevronRight, ArrowLeft } from 'lucide-react'

export default function HomePage() {
  const { role } = useApp()
  const layout = homeLayoutFor(role)
  if (layout === 'mobile') return <MobileHome />
  return <DesktopHome />
}

// ── Top header (shared) ─────────────────────────────────────────────────────
function Header({ onMenuClick }) {
  const { user, role, signOut, notifications, openCanvas } = useApp()
  const [open, setOpen] = useState(false)
  const unread = notifications.filter(n => !n.readAt).length

  return (
    <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-bdr-light flex-shrink-0">
      <div className="flex items-center gap-3">
        {onMenuClick && (
          <button onClick={onMenuClick} className="md:hidden p-1.5 rounded hover:bg-slate-100">
            <Search className="w-5 h-5 text-txt-secondary" />
          </button>
        )}
        <div className="flex items-center gap-3">
          <SwiftChatLogo size={26} />
          <div className="w-px h-7 bg-bdr hidden md:block" />
          <NsdcLogo size={22} showText={false} />
          <div className="hidden md:flex flex-col leading-tight">
            <span className="text-[11px] font-bold text-txt-primary tracking-wider">KSK</span>
            <span className="text-[10px] text-txt-secondary">Kaushal Samiksha Kendra</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={() => openCanvas({ type: 'notifications' })}
          className="relative w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center">
          <Bell className="w-[18px] h-[18px] text-txt-secondary" />
          {unread > 0 && (
            <span className="absolute top-1 right-1 bg-danger text-white text-[10px] rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center font-bold">{unread}</span>
          )}
        </button>
        <div className="relative">
          <button onClick={() => setOpen(o => !o)} className="flex items-center gap-2 px-1.5 py-1 rounded-full hover:bg-slate-100">
            <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-[12px] font-bold">
              {(user?.name || '?').split(' ').map(s => s[0]).slice(0, 2).join('')}
            </div>
          </button>
          {open && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-modal border border-bdr-light p-2 z-30">
                <div className="px-3 py-2.5 border-b border-bdr-light mb-1">
                  <div className="font-bold text-[14px] text-txt-primary">{user?.name}</div>
                  <div className="text-[11px] text-primary font-semibold mt-0.5">{ROLE_LABELS[role]}</div>
                  <div className="text-[11px] text-txt-secondary">{ROLE_SCOPES[role]}</div>
                </div>
                <button onClick={signOut} className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-slate-50 rounded-lg text-danger">
                  <LogOut className="w-4 h-4" /> Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── useSwifty hook (shared chat state) ──────────────────────────────────────
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
      text: `Namaste ${name} 👋\nI'm Swifty — your ${ROLE_LABELS[ctx.role]?.toLowerCase()} companion. Tap a card or ask me anything.`,
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
    } finally { setTyping(false) }
  }

  function handleResponse(r) {
    if (r.responseType === 'action') {
      setMessages(m => [...m, { role: 'bot', text: r.meta?.assistantText || 'Opening…' }])
      dispatchActionForRole({ actionId: r.actionId, entities: r.entities, role: ctx.role, openCanvas: ctx.openCanvas, showToast: ctx.showToast })
    } else if (r.responseType === 'answer') {
      const cits = (r.answer.citations || []).map(c => c.source).join(' · ')
      setMessages(m => [...m, {
        role: 'bot',
        text: r.answer.text,
        html: `<div>${r.answer.text}</div>${cits ? `<div class="mt-2 text-[10px] text-slate-500">Sources: ${cits}</div>` : ''}`,
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
      const seed = b.id === 'swifty' ? 'What can you help me with?' : suggestionsFor(ctx.role)[0] || `Open ${b.name}`
      send(seed)
    } else if (chipOrAction.kind === 'launch_canvas') {
      ctx.openCanvas(chipOrAction.canvas)
    }
  }

  function reset() {
    greetedRef.current = false
    setMessages([])
  }

  return { messages, typing, send, pick, reset }
}

// ── Desktop layout ──────────────────────────────────────────────────────────
function DesktopHome() {
  const { role, user, signOut } = useApp()
  const { messages, typing, send, pick, reset } = useSwifty()
  const chips = suggestionsFor(role)
  const bots = defaultBotsFor(role)
  const greetedView = messages.length <= 1

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F4F6FA', fontFamily: 'Montserrat, sans-serif' }}>
      <Header />
      <div className="flex-1 flex min-h-0">
        {/* Sidebar */}
        <aside className="w-[280px] bg-white border-r border-bdr-light flex flex-col flex-shrink-0">
          <div className="p-3">
            <button onClick={reset} className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-primary text-white font-bold text-[14px] shadow-modal active:opacity-80">
              <Plus className="w-4 h-4" /> New chat
            </button>
          </div>
          <div className="px-4 pt-2 pb-1 text-[11px] uppercase tracking-wider font-bold text-txt-tertiary">Today</div>
          <div className="px-2 flex-1 overflow-y-auto">
            <ThreadItem title="Today's session" active />
          </div>
          <div className="border-t border-bdr-light p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center text-[12px] font-bold flex-shrink-0">
              {(user?.name || '?').split(' ').map(s => s[0]).slice(0, 2).join('')}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-bold text-txt-primary truncate">{user?.name}</div>
              <div className="text-[11px] text-txt-secondary truncate">{ROLE_LABELS[role]}</div>
            </div>
            <button onClick={signOut} title="Sign out" className="p-2 rounded-lg hover:bg-slate-50">
              <LogOut className="w-4 h-4 text-txt-secondary" />
            </button>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 flex flex-col min-w-0">
          {greetedView ? (
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-4xl mx-auto px-8 py-10">
                <GreetingCard />
                <AskAIPanel chips={chips} onPick={send} />
                <BotTilesGrid bots={bots} onPick={(b) => pick({ kind: 'bot', bot: b })} />
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-3xl mx-auto px-8 py-8 flex flex-col gap-3">
                {messages.map((m, i) => (
                  <ChatBubble key={i} role={m.role} text={m.text} html={m.html} actions={m.actions} onAction={pick} />
                ))}
                {typing && <TypingIndicator />}
              </div>
            </div>
          )}
          <div className="border-t border-bdr-light bg-white">
            <ChatInput onSend={send} placeholder="Ask Swifty anything…" />
          </div>
        </main>
      </div>
    </div>
  )
}

function ThreadItem({ title, active }) {
  return (
    <div className={`px-3 py-2.5 rounded-xl text-[13px] flex items-center gap-2 cursor-pointer ${active ? 'bg-primary-light text-primary font-semibold' : 'hover:bg-slate-50 text-txt-primary'}`}>
      <MessageSquare className="w-3.5 h-3.5 opacity-70" />
      <div className="truncate">{title}</div>
    </div>
  )
}

function GreetingCard() {
  const { user, role } = useApp()
  const first = user?.name?.split(' ')[0] || 'there'
  const hour = new Date().getHours()
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  return (
    <div className="mb-6">
      <div className="text-[14px] text-txt-secondary">{greet},</div>
      <h1 className="text-[34px] font-bold leading-tight">
        {first}! <span className="text-primary">How can Swifty help today?</span>
      </h1>
      <div className="text-[13px] text-txt-secondary mt-1">{ROLE_LABELS[role]} · {ROLE_SCOPES[role]}</div>
    </div>
  )
}

function AskAIPanel({ chips, onPick }) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-primary" />
        <div className="text-[13px] font-bold text-txt-primary">Ask Swifty</div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {chips.map((c, i) => (
          <button key={i} onClick={() => onPick(c)}
            className="text-left px-4 py-3 rounded-2xl bg-white border border-bdr-light hover:border-primary hover:shadow-card transition-all text-[14px] text-txt-primary group">
            <div className="flex items-center justify-between gap-3">
              <span>{c}</span>
              <ChevronRight className="w-4 h-4 text-txt-tertiary group-hover:text-primary" />
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function BotTilesGrid({ bots, onPick }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider font-bold text-txt-tertiary mb-3">Your tools</div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {bots.map(b => (
          <button key={b.id} onClick={() => onPick(b)}
            className="text-left rounded-2xl bg-white border border-bdr-light hover:border-primary hover:shadow-card transition-all p-4 group">
            <div className="text-[28px] mb-2">{b.icon}</div>
            <div className="font-bold text-[14px] text-txt-primary truncate">{b.name}</div>
            <div className="text-[11px] text-txt-secondary mt-0.5 line-clamp-2">{b.sub}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Mobile layout ───────────────────────────────────────────────────────────
function MobileHome() {
  const { role, user } = useApp()
  const { messages, typing, send, pick } = useSwifty()
  const chips = suggestionsFor(role)
  const bots = defaultBotsFor(role)
  const greetedView = messages.length <= 1

  return (
    <div className="min-h-screen flex flex-col bg-white" style={{ fontFamily: 'Montserrat, sans-serif' }}>
      <Header />
      <div className="flex-1 overflow-y-auto">
        {greetedView ? (
          <div className="px-4 py-5">
            <GreetingCard />
            <div className="grid grid-cols-2 gap-2.5 mt-4">
              {bots.map(b => (
                <button key={b.id} onClick={() => pick({ kind: 'bot', bot: b })}
                  className="text-left rounded-2xl bg-white border border-bdr-light hover:border-primary p-3 active:scale-[0.97] transition">
                  <div className="text-[24px] mb-1">{b.icon}</div>
                  <div className="font-bold text-[13px] text-txt-primary truncate">{b.name}</div>
                  <div className="text-[10px] text-txt-secondary line-clamp-1">{b.sub}</div>
                </button>
              ))}
            </div>
            <div className="mt-6 mb-1 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <div className="text-[12px] font-bold">Try asking</div>
            </div>
            <div className="space-y-2">
              {chips.map((c, i) => (
                <button key={i} onClick={() => send(c)}
                  className="w-full text-left px-3.5 py-2.5 rounded-2xl bg-surface-page border border-bdr-light hover:border-primary text-[13px]">
                  {c}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="px-3 py-4 flex flex-col gap-2">
            {messages.map((m, i) => <ChatBubble key={i} role={m.role} text={m.text} html={m.html} actions={m.actions} onAction={pick} />)}
            {typing && <TypingIndicator />}
          </div>
        )}
      </div>
      <ChatInput onSend={send} placeholder="Ask Swifty…" />
    </div>
  )
}
