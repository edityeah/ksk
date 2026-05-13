// AiCreditsBadge — header chip + dropdown panel showing the learner's
// current AI-credit balance, recent ledger, and "how to earn" rules.
//
// Only mounted for the trainee role — admins / partners shouldn't see this
// because credits are a learner-engagement mechanic.

import { useEffect, useRef, useState } from 'react'
import { Coins, Plus, Minus, Award, ChevronDown, Sparkles } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { loadCredits, EARN_RULES } from '../utils/aiCredits.js'

export default function AiCreditsBadge() {
  const { user, role } = useApp() || {}
  const userId = user?.id
  const [state, setState] = useState(() => loadCredits(userId))
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  // Listen for credit changes from anywhere in the app.
  useEffect(() => {
    function onChange(e) { setState(e.detail || loadCredits(userId)) }
    window.addEventListener('ksk:credits', onChange)
    return () => window.removeEventListener('ksk:credits', onChange)
  }, [userId])

  // Refresh balance when user identity changes (login / logout).
  useEffect(() => { setState(loadCredits(userId)) }, [userId])

  // Click outside closes the panel.
  useEffect(() => {
    if (!open) return
    function down(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    window.addEventListener('mousedown', down)
    return () => window.removeEventListener('mousedown', down)
  }, [open])

  // Only show for trainee — other roles wouldn't have credits.
  if (role !== 'trainee') return null

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-1.5 pl-2 pr-2.5 py-1.5 rounded-pill bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200 transition"
        title="AI credits — earn by completing tasks, spend on AI features"
      >
        <Coins className="w-3.5 h-3.5" />
        <span className="font-bold text-[12px] tabular-nums">{state.balance}</span>
        <ChevronDown className={`w-3 h-3 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1 w-[320px] bg-white rounded-2xl border border-bdr shadow-modal z-30 overflow-hidden">
          {/* Balance header */}
          <div className="px-4 py-3 bg-gradient-to-br from-amber-50 to-white border-b border-bdr-light">
            <div className="text-[10px] uppercase tracking-wider font-bold text-amber-700 inline-flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> AI credits
            </div>
            <div className="text-[28px] font-bold text-amber-900 leading-none mt-0.5 tabular-nums">{state.balance}</div>
            <div className="text-[11px] text-txt-secondary mt-1">
              Earn by completing tasks · spend on AI features like resume builder, career deep-dives, mock interviews.
            </div>
          </div>

          {/* Ledger */}
          <div className="max-h-[240px] overflow-y-auto px-2 py-2">
            <div className="text-[10px] uppercase tracking-wider font-bold text-txt-tertiary px-2 mb-1">Recent activity</div>
            {state.ledger.length === 0 && (
              <div className="text-[11px] text-txt-tertiary px-2 py-1.5">No activity yet — complete tasks to earn.</div>
            )}
            <ul className="space-y-0.5">
              {state.ledger.slice(0, 8).map((e, i) => {
                const positive = e.amount > 0
                return (
                  <li key={i} className="px-2 py-1.5 rounded-lg hover:bg-surface-page/60 flex items-center gap-2 text-[12px]">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${positive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      {positive ? <Plus className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-txt-primary truncate">{e.label}</div>
                      <div className="text-[10px] text-txt-tertiary">{new Date(e.at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</div>
                    </div>
                    <span className={`tabular-nums font-bold ${positive ? 'text-emerald-700' : 'text-rose-700'}`}>{positive ? '+' : ''}{e.amount}</span>
                  </li>
                )
              })}
            </ul>
          </div>

          {/* How-to-earn */}
          <div className="px-3 py-2 bg-surface-page/40 border-t border-bdr-light">
            <div className="text-[10px] uppercase tracking-wider font-bold text-txt-tertiary mb-1.5 inline-flex items-center gap-1">
              <Award className="w-3 h-3" /> How to earn
            </div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[11px]">
              <EarnRow k="approve_placement" />
              <EarnRow k="retention_day30" />
              <EarnRow k="upload_payslip" />
              <EarnRow k="finish_module" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function EarnRow({ k }) {
  const rule = EARN_RULES[k]
  if (!rule) return null
  return (
    <>
      <div className="text-txt-secondary truncate">{rule.label}</div>
      <div className="text-emerald-700 font-bold tabular-nums text-right">+{rule.amount}</div>
    </>
  )
}
