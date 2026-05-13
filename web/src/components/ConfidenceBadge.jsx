// ConfidenceBadge — visual surface for the KSK confidence score.
// Two flavours:
//   * <ConfidenceBadge score={…} signals={…} compact />  — small pill,
//     ideal for table rows, list cards.
//   * <ConfidenceBadge … />                              — full card with
//     the verification ladder (5 milestones, each ticked if signal fired).
//
// Both surfaces are gated by parent rendering — i.e. only mount this in
// NSDC Admin / Funder views. Learner + TP UIs should never see this.

import { ShieldCheck, Check, Clock, ShieldAlert, FileText, UserCheck, Building2, Landmark } from 'lucide-react'
import { SIGNALS, computeConfidence, labelFor, toneFor } from '../utils/confidenceScore.js'

const SIGNAL_ICONS = {
  tpDeclared:         Building2,
  learnerConfirmed:   UserCheck,
  docUploaded:        FileText,
  employerConfirmed:  ShieldCheck,
  externallyVerified: Landmark,
}

export default function ConfidenceBadge({ score, signals, compact = false, showWhy = true }) {
  // Allow either pre-computed score OR signals — recompute defensively.
  if (score == null && signals) score = computeConfidence(signals)
  if (score == null) score = 0
  const tone = toneFor(score)
  const label = labelFor(score)
  const pct = Math.round(score * 100)

  // Compact: a small pill (great for tables / list rows)
  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-pill text-[11px] font-bold ${tone.bg} ${tone.text} ring-1 ${tone.ring}`}
        title={label}
      >
        <ShieldCheck className="w-3 h-3" />
        {pct}%
      </span>
    )
  }

  // Full: score + ladder + textual explanation
  return (
    <div className={`rounded-2xl bg-white border border-bdr-light shadow-card overflow-hidden`}>
      <div className={`px-4 py-2.5 ${tone.bg} ${tone.text} border-b border-bdr-light flex items-center gap-3`}>
        <ShieldCheck className="w-5 h-5" />
        <div className="flex-1">
          <div className="text-[10px] uppercase tracking-wider font-bold opacity-80">Confidence Score</div>
          <div className="text-[18px] font-bold leading-tight">{pct}% · {label}</div>
        </div>
        <span className="text-[10px] uppercase tracking-wider opacity-70 hidden md:inline">Admin view</span>
      </div>

      {/* Ladder */}
      <div className="p-3">
        <div className="text-[10px] uppercase tracking-wider font-bold text-txt-tertiary mb-2">
          Verification ladder (5 milestones)
        </div>
        <ul className="space-y-1.5">
          {SIGNALS.map((s, idx) => {
            const fired = !!signals?.[s.key]
            const Icon = SIGNAL_ICONS[s.key] || ShieldAlert
            return (
              <li key={s.key} className="flex items-center gap-2.5">
                <div className={`relative w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${fired ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                  <Icon className="w-3.5 h-3.5" />
                  {fired && (
                    <span className="absolute -right-1 -bottom-1 w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                      <Check className="w-2.5 h-2.5" />
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-[13px] font-bold ${fired ? 'text-txt-primary' : 'text-txt-secondary'}`}>
                    {idx + 1}. {s.label}
                  </div>
                  <div className="text-[11px] text-txt-tertiary">
                    +{Math.round(s.delta * 100)}% · {fired ? 'Signal received' : 'Pending'}
                  </div>
                </div>
                {!fired && <Clock className="w-3.5 h-3.5 text-txt-tertiary flex-shrink-0" />}
              </li>
            )
          })}
        </ul>

        {showWhy && (
          <div className="mt-3 pt-3 border-t border-bdr-light text-[11px] text-txt-secondary leading-relaxed">
            <span className="font-bold text-txt-primary">Why this score?</span> Each signal is independent. Self-declared
            data gets ~30%. Cross-confirmation by the learner pushes it to 60%. Documents add 10%, employer adds 10%,
            and external verification (EPFO / bank / DigiLocker) pushes it to 95%. Anything below 60% should be treated
            as audit risk by the NSDC officer.
          </div>
        )}
      </div>
    </div>
  )
}

// Compact average-confidence pill for TP-level rollups
export function AverageConfidencePill({ average, count }) {
  const tone = toneFor(average || 0)
  const pct = Math.round((average || 0) * 100)
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-pill text-[11px] font-bold ${tone.bg} ${tone.text} ring-1 ${tone.ring}`}
      title={`${count || 0} records averaged`}
    >
      <ShieldCheck className="w-3 h-3" /> Avg {pct}% {count ? `· ${count} records` : ''}
    </span>
  )
}
