// KSK home — Pravasi-Setu-style layout. Sidebar with grouped chat history +
// profile pill at the bottom; main panel has a friendly greeting, a voice CTA,
// then "OPEN AN APP" grid of pastel feature cards. Mobile collapses.

import { useRef, useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { api } from '../api/client.js'
import { defaultBotsFor, suggestionsFor, homeLayoutFor, ROLE_LABELS, ROLE_SCOPES } from '../roles/roleConfig.js'
import { dispatchActionForRole } from '../nlp/dispatch.js'
import ChatBubble from '../components/ChatBubble.jsx'
import TypingIndicator from '../components/TypingIndicator.jsx'
import { Bell, LogOut, Plus, Search, Sparkles, Send, Mic, Phone, ChevronUp, ChevronRight, MessageSquare, Menu } from 'lucide-react'
import CanvasPanel from '../canvas/CanvasPanel.jsx'
import FloatingCallPill from '../components/FloatingCallPill.jsx'
import AiCreditsBadge from '../components/AiCreditsBadge.jsx'

const TONES = {
  indigo:  { bg: 'bg-indigo-100',  fg: 'text-indigo-600',  ring: 'hover:border-indigo-300' },
  emerald: { bg: 'bg-emerald-100', fg: 'text-emerald-600', ring: 'hover:border-emerald-300' },
  amber:   { bg: 'bg-amber-100',   fg: 'text-amber-600',   ring: 'hover:border-amber-300' },
  sky:     { bg: 'bg-sky-100',     fg: 'text-sky-600',     ring: 'hover:border-sky-300' },
  rose:    { bg: 'bg-rose-100',    fg: 'text-rose-600',    ring: 'hover:border-rose-300' },
  violet:  { bg: 'bg-violet-100',  fg: 'text-violet-600',  ring: 'hover:border-violet-300' },
  orange:  { bg: 'bg-orange-100',  fg: 'text-orange-600',  ring: 'hover:border-orange-300' },
  teal:    { bg: 'bg-teal-100',    fg: 'text-teal-600',    ring: 'hover:border-teal-300' },
  fuchsia: { bg: 'bg-fuchsia-100', fg: 'text-fuchsia-600', ring: 'hover:border-fuchsia-300' },
  lime:    { bg: 'bg-lime-100',    fg: 'text-lime-700',    ring: 'hover:border-lime-300' },
  cyan:    { bg: 'bg-cyan-100',    fg: 'text-cyan-600',    ring: 'hover:border-cyan-300' },
  pink:    { bg: 'bg-pink-100',    fg: 'text-pink-600',    ring: 'hover:border-pink-300' },
}

export default function HomePage() {
  const { role } = useApp()
  const mobile = homeLayoutFor(role) === 'mobile'
  return <Shell mobile={mobile} />
}

function Shell({ mobile }) {
  const ctx = useApp()
  const [messages, setMessages] = useState([])
  const [typing, setTyping] = useState(false)
  const [showSidebar, setShowSidebar] = useState(false)

  const bots = defaultBotsFor(ctx.role)
  const chips = suggestionsFor(ctx.role)
  const threads = ctx.threads || []

  // Group threads into Today / This week / Earlier buckets for the sidebar.
  const now = Date.now()
  const TODAY = 24 * 60 * 60 * 1000
  const WEEK  = 7 * TODAY
  const todayT   = threads.filter(t => now - new Date(t.updatedAt).getTime() < TODAY)
  const weekT    = threads.filter(t => { const d = now - new Date(t.updatedAt).getTime(); return d >= TODAY && d < WEEK })
  const earlierT = threads.filter(t => now - new Date(t.updatedAt).getTime() >= WEEK)

  function startNewChat() {
    setMessages([])
    setShowSidebar(false)
    ctx.newChat?.()
  }
  function openThread(t) {
    setShowSidebar(false)
    ctx.openThread?.(t)
  }

  async function send(text) {
    if (!text?.trim()) return
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
        role: 'bot', text: r.answer.text,
        html: `<div>${r.answer.text}</div>${cits ? `<div class="mt-2 text-[10px] text-slate-500">Sources: ${cits}</div>` : ''}`,
      }])
    } else {
      setMessages(m => [...m, { role: 'bot', text: r.assistantText || "I'm not sure how to help with that yet.", actions: (r.chips || []).map(c => ({ label: c, kind: 'chip', value: c })) }])
    }
  }

  function openBot(b) {
    if (b.canvas) ctx.openCanvas({ type: b.canvas })
    else send(`Open ${b.name}`)
  }
  function pickChipFromMessage(c) { if (c.kind === 'chip') send(c.value) }

  const greetedView = messages.length === 0

  return (
    <div className="h-screen flex bg-white overflow-hidden" style={{ fontFamily: 'Montserrat, sans-serif' }}>
      {/* Sidebar */}
      <aside className={`${showSidebar ? 'fixed inset-0 z-40' : 'hidden'} md:flex md:static w-[280px] flex-shrink-0 flex-col border-r border-bdr-strong bg-surface-secondary shadow-[1px_0_0_0_rgba(15,23,42,0.04)]`}>
        <div className="px-4 pt-5 pb-4 flex items-center justify-center">
          <img src="/ksk_logo.png" alt="Kaushal Samiksha" className="h-16 w-auto object-contain" />
        </div>

        <div className="px-4">
          <button onClick={startNewChat}
            className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-pill bg-primary text-white font-bold text-[14px] shadow-modal active:opacity-80">
            <Plus className="w-4 h-4" /> New chat
          </button>
        </div>

        <div className="px-4 mt-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-pill bg-white border border-bdr">
            <Search className="w-3.5 h-3.5 text-txt-tertiary" />
            <input placeholder="Search chats" className="flex-1 bg-transparent text-[12px] outline-none placeholder:text-txt-tertiary" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 mt-3 pb-3">
          {threads.length === 0 ? (
            <div className="px-3 py-4 text-[11px] text-txt-tertiary leading-relaxed">
              No conversations yet. Start one by opening a module or tapping "New chat".
            </div>
          ) : (
            <>
              <ThreadGroup title="Today"     threads={todayT}   onPick={openThread} />
              <ThreadGroup title="This week" threads={weekT}    onPick={openThread} />
              <ThreadGroup title="Earlier"   threads={earlierT} onPick={openThread} />
            </>
          )}
        </div>

        <div className="p-3 border-t border-bdr">
          <ProfilePill onSignOut={ctx.signOut} />
        </div>
      </aside>
      {showSidebar && <div className="fixed inset-0 bg-black/40 z-30 md:hidden" onClick={() => setShowSidebar(false)} />}

      {/* Main — relative so CanvasPanel overlays inside this area only (not over the sidebar) */}
      <main className="relative flex-1 flex flex-col min-w-0 bg-white">
        <div className="flex items-center justify-between md:justify-end px-3 md:px-6 py-3 border-b border-bdr bg-gradient-to-b from-surface-page/40 to-white flex-shrink-0">
          <button onClick={() => setShowSidebar(true)} className="md:hidden p-2 rounded-lg hover:bg-slate-100">
            <Menu className="w-5 h-5 text-txt-secondary" />
          </button>
          <div className="flex items-center gap-2 md:gap-3">
            <FloatingCallPill />
            <AiCreditsBadge />
            <SaathiQuickButton openCanvas={ctx.openCanvas} />
            <BellButton />
          </div>
        </div>
        {greetedView
          ? <GreetingPanel ctx={ctx} bots={bots} chips={chips} onSend={send} onPickBot={openBot} />
          : <ChatThread messages={messages} typing={typing} onPick={pickChipFromMessage} />}
        <MessageInput onSend={send} />

        {/* Canvas — overlay (default) or expanded (fills this main area). Mobile = full-screen. */}
        <CanvasPanel />
      </main>
    </div>
  )
}

function SidebarGroup({ title, items }) {
  if (!items?.length) return null
  return (
    <div className="mb-4">
      <div className="text-[10px] uppercase tracking-wider font-bold text-txt-tertiary px-2 mb-1">{title}</div>
      {items.map((label, i) => (
        <div key={i} className="px-3 py-2 rounded-xl text-[13px] text-txt-primary hover:bg-surface-page cursor-pointer flex items-center gap-2 truncate">
          <MessageSquare className="w-3.5 h-3.5 text-txt-tertiary flex-shrink-0" />
          <span className="truncate">{label}</span>
        </div>
      ))}
    </div>
  )
}

// Real persisted threads, clickable to restore the conversation in its canvas.
function ThreadGroup({ title, threads, onPick }) {
  if (!threads?.length) return null
  return (
    <div className="mb-4">
      <div className="text-[10px] uppercase tracking-wider font-bold text-txt-tertiary px-2 mb-1">{title}</div>
      {threads.map(t => (
        <button key={t.id} onClick={() => onPick(t)}
          className="w-full text-left px-3 py-2 rounded-xl text-[13px] text-txt-primary hover:bg-surface-page flex items-center gap-2">
          <MessageSquare className="w-3.5 h-3.5 text-txt-tertiary flex-shrink-0" />
          <span className="truncate flex-1">{t.title || 'Conversation'}</span>
        </button>
      ))}
    </div>
  )
}

function ProfilePill({ onSignOut }) {
  const { user, role, meExtra } = useApp()
  const initials = (user?.name || '?').split(' ').map(s => s[0]).slice(0, 2).join('')
  const subline =
    role === 'trainee'  ? `${meExtra?.trainee?.district || ''}, ${meExtra?.trainee?.state || ''}`.replace(/^, |, $/, '') :
    role === 'employer' ? (meExtra?.employer?.name || ROLE_LABELS[role]) :
    role === 'training_centre' ? (meExtra?.centre?.name || ROLE_LABELS[role]) :
    role === 'training_partner' ? (meExtra?.tp?.name || ROLE_LABELS[role]) :
    ROLE_LABELS[role]
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-3 px-2 py-2 rounded-2xl hover:bg-surface-page">
        <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center text-[13px] font-bold flex-shrink-0">{initials}</div>
        <div className="flex-1 min-w-0 text-left">
          <div className="text-[13px] font-bold text-txt-primary truncate">{user?.name}</div>
          <div className="text-[11px] text-txt-secondary truncate">{subline || ROLE_LABELS[role]}</div>
        </div>
        <ChevronUp className={`w-4 h-4 text-txt-tertiary transition-transform ${open ? '' : 'rotate-180'}`} />
      </button>
      {open && (
        <div className="absolute bottom-full mb-2 left-0 right-0 bg-white rounded-2xl shadow-modal border border-bdr-light p-1.5 z-10">
          <div className="px-3 py-2 border-b border-bdr-light mb-1">
            <div className="text-[11px] uppercase tracking-wider font-bold text-primary">{ROLE_LABELS[role]}</div>
            <div className="text-[11px] text-txt-secondary mt-0.5">{ROLE_SCOPES[role]}</div>
          </div>
          <button onClick={onSignOut} className="w-full flex items-center gap-2 px-3 py-2 text-[13px] hover:bg-rose-50 rounded-lg text-danger">
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      )}
    </div>
  )
}

// Universal access to Saathi — visible in the top app header from any page
// for any role. One tap opens the swifty_assistant canvas where the user can
// type, voice-call, video-call or share their screen for live UI guidance.
function SaathiQuickButton({ openCanvas }) {
  return (
    <button
      onClick={() => openCanvas({ type: 'swifty_assistant' })}
      title="Talk to Saathi"
      className="inline-flex items-center gap-1.5 md:gap-2 pl-2.5 pr-3 md:pl-3 md:pr-4 py-1.5 md:py-2 rounded-pill bg-gradient-to-r from-primary to-primary-dark text-white font-bold text-[11px] md:text-[12px] shadow-card hover:opacity-90 active:scale-95 transition"
    >
      <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4" />
      <span className="hidden sm:inline">Saathi</span>
    </button>
  )
}

function BellButton() {
  const { notifications, openCanvas } = useApp()
  const unread = notifications.filter(n => !n.readAt).length
  return (
    <button onClick={() => openCanvas({ type: 'notifications' })}
      className="relative w-10 h-10 rounded-full hover:bg-surface-page border border-bdr-light flex items-center justify-center">
      <Bell className="w-[18px] h-[18px] text-txt-secondary" />
      {unread > 0 && (
        <span className="absolute -top-1 -right-1 bg-danger text-white text-[10px] rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center font-bold border-2 border-white">{unread}</span>
      )}
    </button>
  )
}

function GreetingPanel({ ctx, bots, chips, onSend, onPickBot }) {
  const first = ctx.user?.name?.split(' ')[0] || 'there'
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-4 md:px-10 pt-6 md:pt-10 pb-6">
        <div className="text-center">
          <div className="text-[12px] font-bold uppercase tracking-[3px] text-primary mb-3">Saathi · Your skilling companion</div>
          <h1 className="text-[26px] md:text-[42px] font-bold text-txt-primary leading-tight">
            Hi {first} <span aria-hidden>👋</span>,
          </h1>
          <h2 className="text-[22px] md:text-[36px] font-bold text-txt-primary leading-tight mt-1">
            what can I help with?
          </h2>
          <p className="text-[14px] text-txt-secondary mt-3 max-w-2xl mx-auto">
            Type below or pick an app. Saathi guides you from enrollment to training, certification
            and placement — opens dashboards, fills forms, and routes you to the right action.
          </p>
          <div className="mt-6">
            <button onClick={() => ctx.openCanvas({ type: 'swifty_assistant' })}
              className="inline-flex items-center gap-2.5 px-6 py-3 rounded-pill bg-primary text-white font-bold text-[15px] shadow-modal hover:opacity-90 active:scale-95 transition">
              <Phone className="w-4 h-4" /> Talk to Saathi
            </button>
          </div>
        </div>

        {/* When tiles have `section` metadata, render them in three grouped
            blocks (My Skill Passport / Employment Confirmation / Other Services).
            Otherwise fall back to the flat grid (used by all non-trainee roles). */}
        {bots.some(b => b.section)
          ? <SectionedAppGrid bots={bots} onPickBot={onPickBot} />
          : (
            <div className="mt-12">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-4 h-4 text-primary" />
                <div className="text-[12px] font-bold uppercase tracking-[2px] text-primary">Open an app</div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {bots.map(b => <FeatureCard key={b.id} bot={b} onClick={() => onPickBot(b)} />)}
              </div>
            </div>
          )}

        {chips.length > 0 && (
          <div className="mt-10">
            <div className="text-[11px] uppercase tracking-wider font-bold text-txt-tertiary mb-2">Try asking</div>
            <div className="flex flex-wrap gap-2">
              {chips.slice(0, 5).map((c, i) => (
                <button key={i} onClick={() => onSend(c)}
                  className="px-3.5 py-2 rounded-pill bg-surface-page hover:bg-primary-light border border-bdr-light text-[13px] text-txt-primary">
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Three-section app grid for learner role — matches the funder demo's
// "bot works across 3 stages of life" narrative.
const SECTION_META = {
  passport:   { title: 'My Skill Passport',       subtitle: 'Identity, certificates, profile',                 accent: 'from-sky-50 to-white',     ring: 'ring-sky-200',     dot: 'bg-sky-500' },
  employment: { title: 'Employment Confirmation', subtitle: 'Placement, retention, payslip, grievances',       accent: 'from-emerald-50 to-white', ring: 'ring-emerald-200', dot: 'bg-emerald-500' },
  other:      { title: 'Other Services',          subtitle: 'Discover courses, AI coach, jobs, alerts',        accent: 'from-violet-50 to-white',  ring: 'ring-violet-200',  dot: 'bg-violet-500' },
}
const SECTION_ORDER = ['passport', 'employment', 'other']

function SectionedAppGrid({ bots, onPickBot }) {
  const grouped = SECTION_ORDER.map(key => ({ key, meta: SECTION_META[key], tiles: bots.filter(b => b.section === key) }))
                               .filter(g => g.tiles.length > 0)
  return (
    <div className="mt-10 space-y-6">
      {grouped.map(({ key, meta, tiles }, idx) => (
        <section key={key} className={`rounded-2xl bg-gradient-to-br ${meta.accent} border border-bdr-light ring-1 ${meta.ring}/40 p-4`}>
          <div className="flex items-baseline justify-between mb-3">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[2px] text-primary inline-flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                Stage {idx + 1} · {meta.title}
              </div>
              <div className="text-[12px] text-txt-secondary mt-0.5">{meta.subtitle}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {tiles.map(b => <FeatureCard key={b.id} bot={b} onClick={() => onPickBot(b)} />)}
          </div>
        </section>
      ))}
    </div>
  )
}

function FeatureCard({ bot, onClick }) {
  const t = TONES[bot.tone] || TONES.indigo
  return (
    <button onClick={onClick}
      className={`text-left rounded-2xl bg-white border border-bdr-light p-4 transition-all hover:shadow-card ${t.ring} group`}>
      <div className={`w-11 h-11 rounded-2xl ${t.bg} ${t.fg} flex items-center justify-center text-[20px] mb-3`}>
        {bot.icon}
      </div>
      <div className="font-bold text-[14px] text-txt-primary leading-tight">{bot.name}</div>
      <p className="text-[12px] text-txt-secondary leading-snug mt-1 line-clamp-2">{bot.desc || bot.sub}</p>
    </button>
  )
}

function ChatThread({ messages, typing, onPick }) {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 md:px-10 py-8 flex flex-col gap-3">
        {messages.map((m, i) => <ChatBubble key={i} role={m.role} text={m.text} html={m.html} actions={m.actions} onAction={onPick} />)}
        {typing && <TypingIndicator />}
      </div>
    </div>
  )
}

function MessageInput({ onSend }) {
  const [v, setV] = useState('')
  function submit(e) { e?.preventDefault?.(); const t = v.trim(); if (!t) return; setV(''); onSend(t) }
  return (
    <div className="flex-shrink-0 border-t border-bdr bg-gradient-to-t from-surface-page/40 to-white px-4 md:px-10 py-4">
      <form onSubmit={submit} className="max-w-3xl mx-auto">
        <div className="flex items-center gap-2.5 rounded-pill border border-bdr bg-white px-2 py-1.5 shadow-card">
          <button type="button" className="w-9 h-9 rounded-full bg-white shadow-card flex items-center justify-center flex-shrink-0">
            <Mic className="w-4 h-4 text-primary" />
          </button>
          <input value={v} onChange={e => setV(e.target.value)} placeholder="Message Saathi…"
            className="flex-1 bg-transparent text-[14px] py-1.5 outline-none placeholder:text-txt-tertiary" />
          <button type="submit" disabled={!v.trim()}
            className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0 disabled:bg-slate-300">
            <Send className="w-4 h-4" />
          </button>
        </div>
        <div className="text-center text-[11px] text-txt-tertiary mt-2">
          Voice · Hindi · English · Marathi · Tamil · Bengali · Odia
        </div>
      </form>
    </div>
  )
}
