// ARISE Guru — Samsung ARISE MX digital-twin classroom (Phase 1).
//
// Reachable via the "Samsung ARISE" chip inside the Learning Assistant
// canvas. Opens a two-pane classroom:
//   • Left/top: the teacher (AvatarCall — persona 'arise_mx_teacher')
//   • Right/bottom: a blackboard whiteboard the teacher writes on live
//     by calling voice-tools (arise_whiteboard_write, arise_show_diagram).
//
// Progress state lives in AriseEnrolment on the server. This canvas reads
// it on mount, exposes updater callbacks to the voice-tool ctx via
// useCall().bindArise(), and hits the ARISE API for day-complete / chapter-
// jump when the model triggers them.
//
// This is Phase 1 — no videos, no simulations, no camera check-ins yet.
// Whiteboard-only + progress tracking + resumable sessions.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import AvatarCall from '../../components/AvatarCall.jsx'
import { useApp } from '../../context/AppContext.jsx'
import { useCall } from '../../context/CallProvider.jsx'
import { api } from '../../api/client.js'
import {
  ArrowLeft, Loader2, GraduationCap, BookOpen, ChevronRight, CheckCircle2,
  X, Eraser, Sparkles, ScrollText,
} from 'lucide-react'

const CHAPTER_TITLES = {
  1: 'Introduction · About Samsung',
  2: 'Basic Electronics & Terminology',
  3: 'Wireless Communication & USB',
  4: 'Samsung MX Nomenclature & Mobile OS',
  5: 'Basic Tools · Multimeter & ESD',
  6: 'Mobile Phone Layout & Sensors',
  7: 'Samsung Features & Galaxy AI',
  8: 'SmartThings',
  9: 'ESD Safety, Warranty Void, Test Codes',
  10: 'Software Update & IMEI Writing',
  11: 'Disassembly & Assembly Process',
  12: 'Soldering & Desoldering',
  13: 'Diagnosis via PC · Top Symptoms',
  14: 'Repair & Service Guide (SMD/PBA)',
  15: 'E-waste & P-waste Management',
  16: 'Abbreviations & Glossary',
  17: 'Final Review',
}

// The pre-authored diagrams the teacher can request via arise_show_diagram.
// v1 renders these as ASCII-style chalk drawings inside the whiteboard —
// visual enough to demo the flow. Phase 2 swaps in richer SVG.
const DIAGRAMS = {
  ohms_law: {
    title: "Ohm's Law",
    body: `V = I × R\n\nV  →  Voltage    (volts)\nI  →  Current    (amperes)\nR  →  Resistance (ohms)`,
  },
  series_circuit: {
    title: 'Series circuit',
    body: `+──[R1]──[R2]──[R3]──−\n\n• same CURRENT through all\n• voltage DIVIDES across each\n• total R = R1 + R2 + R3`,
  },
  parallel_circuit: {
    title: 'Parallel circuit',
    body: `        ┌──[R1]──┐\n+ ──────┼──[R2]──┼────── −\n        └──[R3]──┘\n\n• same VOLTAGE across each\n• current DIVIDES between branches\n• 1/R_total = 1/R1 + 1/R2 + 1/R3`,
  },
  resistor_symbol: {
    title: 'Resistor · symbols',
    body: `Fixed:      ──/\\/\\/\\──\nVariable:   ──/\\/\\/──▶──   (rheostat/pot)\nPreset:     ──/\\/\\/──▼──   (trimmer)`,
  },
  multimeter_layout: {
    title: 'Multimeter · layout',
    body: `┌───────────────────┐\n│      888.8V       │  ← display\n├───────────────────┤\n│    (rotary sel)   │  ← range switch\n│  V= V~ Ω A  Diode │\n│                   │\n│  [COM]      [VΩ]  │  ← probe jacks\n│         [A]       │\n└───────────────────┘\nBlack → COM   Red → VΩ (or A for current)`,
  },
  pcb_layout: {
    title: 'Smartphone PBA · top view',
    body: `┌──────────────────────────────────┐\n│ [Camera]  [Antenna]     [Speaker]│\n│                                  │\n│  [SoC]     [PMIC]      [RAM]     │\n│                                  │\n│  [Modem]   [Audio IC]  [USB IC]  │\n│                                  │\n│ [Battery FPC]        [SIM tray]  │\n└──────────────────────────────────┘\nMost failures cluster at charging (USB IC / PMIC) and audio.`,
  },
  gsm_architecture: {
    title: 'GSM · call path',
    body: `Handset (MS) →  BTS  →  BSC  →  MSC  →  BTS  →  Handset\n                                │\n                            VLR / HLR   (subscriber database)\n                                │\n                              AuC / EIR  (auth + IMEI check)\n\nMS = mobile station · BSC = base station controller · MSC = switching centre`,
  },
  solder_joint_good_bad: {
    title: 'Solder joints · good vs. bad',
    body: `GOOD                 COLD                DRY\n\n   ▲                    ●                    ▲\n  ▲ ▲                  ● ●                  ▲ ▲\n ▲ ▲ ▲                ●   ●                ▲ ▲ ▲\n──   ──              ─     ─              ──   ──\n\nSmooth, shiny,        Dull, grainy —       Cracked, ring\nconcave              iron too cool         around lead`,
  },
  phone_disassembly: {
    title: 'Smartphone · disassembly order',
    body: `1. Power off + eject SIM\n2. Warm back cover (heat pad)\n3. Cut adhesive with pick / suction\n4. Disconnect battery FPC FIRST (ESD safety)\n5. Remove screws (log positions — different lengths)\n6. Lift PBA carefully; free antenna & display FPCs\n7. When re-assembling: fresh adhesive, then water test`,
  },
  esd_setup: {
    title: 'ESD-safe bench',
    body: `Wrist strap ─── (1 MΩ) ───┐\n                          ▼\n                    ESD mat ── ground point\n                          ▲\n         Antistatic bin / bag / apron\n\nAll same ground potential. Wristband continuity test = ≤ 20 MΩ.`,
  },
}

export default function AriseClassroomCanvas() {
  const { showToast } = useApp()
  const { bindArise, activeCall } = useCall()
  const [progress, setProgress] = useState(null)   // { currentDay, currentChapter, chapterTitle, ... }
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [board, setBoard]       = useState([])     // whiteboard blocks
  const [onCall, setOnCall]     = useState(false)

  // Load enrolment on mount.
  useEffect(() => {
    let cancel = false
    setLoading(true); setError('')
    api.post('/api/arise/session/start', {})
      .then(r => { if (!cancel) setProgress(r) })
      .catch(e => { if (!cancel) setError(e?.message || 'load_failed') })
      .finally(() => { if (!cancel) setLoading(false) })
    return () => { cancel = true }
  }, [])

  // Register callbacks on CallProvider so the voice tools can find them.
  // We use latest-value refs inside the callbacks so state updates land
  // without re-registering (bindArise is stable across renders).
  const stateRef = useRef({ progress })
  stateRef.current = { progress }

  useEffect(() => {
    const bag = {
      appendBlock: (block) => setBoard(prev => [...prev, block]),
      clearBoard:  () => setBoard([]),
      showDiagram: (id) => {
        const d = DIAGRAMS[id]
        if (!d) return
        setBoard(prev => [...prev, { id: `dia-${Date.now()}`, kind: 'diagram', diagramId: id, title: d.title, text: d.body, at: Date.now() }])
      },
      markDayComplete: async (dayNumber) => {
        const day = dayNumber ?? stateRef.current.progress?.currentDay ?? 1
        const r = await api.post('/api/arise/day/complete', { day_number: day })
        setProgress(p => p ? { ...p, ...r } : p)
        return r
      },
      jumpToChapter: async (chapterNumber) => {
        const r = await api.post('/api/arise/chapter/jump', { chapter_number: chapterNumber })
        setProgress(p => p ? { ...p, ...r } : p)
        return r
      },
    }
    bindArise(bag)
    return () => bindArise(null)
  }, [bindArise])

  // Persist the lesson (whiteboard + timestamp range) when the call ends.
  const sessionStartRef = useRef(null)
  useEffect(() => {
    if (activeCall?.persona === 'arise_mx_teacher') {
      if (!sessionStartRef.current) sessionStartRef.current = new Date().toISOString()
    } else if (sessionStartRef.current && board.length > 0) {
      // Call ended (or persona changed) — persist.
      api.post('/api/arise/lesson/end', {
        dayNumber:     progress?.currentDay,
        chapterNumber: progress?.currentChapter,
        chapterTitle:  progress?.chapterTitle,
        whiteboard:    JSON.stringify(board),
        startedAt:     sessionStartRef.current,
      }).catch(() => {})
      sessionStartRef.current = null
    }
  }, [activeCall?.persona, board, progress])

  const clearBoard = () => setBoard([])

  const dayDots = useMemo(() => {
    const cur = progress?.currentDay || 1
    const cert = !!progress?.certifiedAt
    return Array.from({ length: 21 }, (_, i) => ({
      day: i + 1,
      state: (i + 1) < cur ? 'done' : (i + 1) === cur ? (cert ? 'done' : 'current') : 'ahead',
      isTest: [5, 10, 16, 20, 21].includes(i + 1),
    }))
  }, [progress])

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-900">
        <div className="text-center text-slate-300">
          <Loader2 className="w-6 h-6 animate-spin mx-auto" />
          <div className="text-[13px] mt-2">Opening the classroom…</div>
        </div>
      </div>
    )
  }
  if (error || !progress) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-6 text-[13px] text-rose-700">
          Couldn't open the classroom: <span className="font-mono text-[11px]">{error || 'not_found'}</span>
          <div className="text-[11px] text-rose-600 mt-1">The ARISE course is only available for trainees.</div>
        </div>
      </div>
    )
  }

  const chapterTitle = progress.chapterTitle || CHAPTER_TITLES[progress.currentChapter] || 'Course overview'

  return (
    <div className="flex flex-col h-full bg-[#0F1E14]" style={{ fontFamily: 'Montserrat, sans-serif' }}>
      {/* Header — chalk-style bar */}
      <div className="px-5 pt-4 pb-3 border-b border-emerald-950/60 bg-gradient-to-b from-slate-950 to-[#0F1E14] flex-shrink-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[3px] font-bold text-amber-300 inline-flex items-center gap-1.5">
              <GraduationCap className="w-3 h-3" /> Samsung ARISE · MX
            </div>
            <div className="mt-1 text-white font-bold text-[17px] leading-tight" style={{ fontFamily: '"Caveat", "Comic Sans MS", cursive' }}>
              Chapter {progress.currentChapter}: {chapterTitle}
            </div>
            <div className="text-[11px] text-emerald-100/70 mt-0.5">
              ARISE Guru · your digital-twin trainer
            </div>
          </div>
          {progress.certifiedAt && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-pill bg-emerald-500/20 text-emerald-200 text-[11px] font-bold">
              <CheckCircle2 className="w-3 h-3" /> Certified
            </div>
          )}
        </div>

        {/* 21-day progress strip */}
        <div className="flex items-center gap-1.5 mt-3">
          {dayDots.map(d => (
            <div key={d.day}
              title={`Day ${d.day}${d.isTest ? ' · Test' : ''}`}
              className={`flex-1 h-1.5 rounded-full ${
                d.state === 'done'    ? 'bg-emerald-400'
                : d.state === 'current' ? 'bg-amber-300 animate-pulse'
                : 'bg-emerald-950/60'
              } ${d.isTest ? 'ring-1 ring-white/40 ring-offset-1 ring-offset-[#0F1E14]' : ''}`} />
          ))}
        </div>
        <div className="flex items-center justify-between text-[10px] text-emerald-100/60 mt-1.5 font-mono">
          <span>Day {progress.currentDay} of 21</span>
          <span>tests on 5 · 10 · 16 · 20 · 21</span>
        </div>
      </div>

      {/* Body — blackboard + AvatarCall */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_320px]">
        {/* Blackboard (left / top on mobile) */}
        <div className="relative min-h-0 overflow-y-auto p-5 md:p-6 bg-[#0F1E14]"
             style={{
               backgroundImage: 'radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)',
               backgroundSize: '18px 18px',
             }}>
          {board.length === 0 && !onCall && (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-md">
                <div className="text-emerald-100/50 text-[13px]" style={{ fontFamily: '"Caveat", "Comic Sans MS", cursive', fontSize: 18 }}>
                  This is your blackboard.
                </div>
                <div className="text-emerald-100/40 text-[12px] mt-2">
                  Start the voice call on the right — ARISE Guru will write here as they teach.
                </div>
              </div>
            </div>
          )}
          {board.length === 0 && onCall && (
            <div className="h-full flex items-center justify-center text-emerald-100/40 text-[12px]"
                 style={{ fontFamily: '"Caveat", "Comic Sans MS", cursive', fontSize: 16 }}>
              Guru ji is thinking…
            </div>
          )}
          <div className="space-y-4">
            {board.map(block => <ChalkBlock key={block.id} block={block} />)}
          </div>
          {board.length > 0 && (
            <button onClick={clearBoard}
              className="mt-6 inline-flex items-center gap-1 text-[11px] text-emerald-200/60 hover:text-emerald-100 transition">
              <Eraser className="w-3 h-3" /> clear the board
            </button>
          )}
        </div>

        {/* Right rail — teacher + call controls */}
        <div className="border-l border-emerald-950/60 bg-slate-950 flex flex-col min-h-0">
          <div className="flex-1 min-h-0">
            <AvatarCall
              persona="arise_mx_teacher"
              title="ARISE Guru"
              intro={`Chapter ${progress.currentChapter}: ${chapterTitle}. Voice se puchhiye — ya chat mein type kariye. Dono taraf se board par likh dega.`}
              suggestions={[
                'Aaj kya seekhne wale hain?',
                'Series circuit aur parallel circuit ka difference batao',
                'Multimeter kaise use karte hain?',
              ]}
              onCallStateChange={(s) => setOnCall(s !== 'idle')}
              // ARISE Guru (text-chat mode) embeds board/diagram fences in
              // its stream. These bridges feed those events into the
              // same whiteboard state that voice-tool dispatches use, so
              // text and voice both draw on the blackboard.
              onBoardBlock={(block) => setBoard(prev => [...prev, block])}
              onDiagram={(id) => {
                const d = DIAGRAMS[id]
                if (!d) return
                setBoard(prev => [...prev, { id: `dia-${Date.now()}`, kind: 'diagram', diagramId: id, title: d.title, text: d.body, at: Date.now() }])
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// A single whiteboard block, rendered as chalky text on the blackboard.
function ChalkBlock({ block }) {
  const chalk = { fontFamily: '"Caveat", "Comic Sans MS", "Marker Felt", cursive', color: '#F5EED2' }
  if (block.kind === 'title') {
    return (
      <div className="border-b border-emerald-100/10 pb-2">
        <div style={{ ...chalk, fontSize: 32, lineHeight: 1.1 }}>{block.text}</div>
      </div>
    )
  }
  if (block.kind === 'formula') {
    return (
      <div className="inline-block bg-emerald-100/5 border border-emerald-100/10 rounded-lg px-4 py-3">
        <div style={{ ...chalk, fontSize: 24, color: '#FDE68A' }} className="font-mono">{block.text}</div>
      </div>
    )
  }
  if (block.kind === 'definition') {
    return (
      <div>
        <div style={{ ...chalk, fontSize: 20 }} className="text-amber-200">{block.text.split(':')[0]}</div>
        <div style={{ ...chalk, fontSize: 18, color: '#D1FAE5' }} className="mt-0.5">
          {block.text.split(':').slice(1).join(':').trim()}
        </div>
      </div>
    )
  }
  if (block.kind === 'bullets' || block.kind === 'steps') {
    const items = block.text.split('\n').filter(Boolean)
    return (
      <ul className="space-y-1.5">
        {items.map((line, i) => (
          <li key={i} className="flex items-start gap-2" style={{ ...chalk, fontSize: 20 }}>
            <span className="text-amber-300">{block.kind === 'steps' ? `${i + 1}.` : '•'}</span>
            <span>{line}</span>
          </li>
        ))}
      </ul>
    )
  }
  if (block.kind === 'diagram') {
    return (
      <div className="bg-emerald-100/5 border border-emerald-100/10 rounded-lg p-3">
        <div style={{ ...chalk, fontSize: 18 }} className="text-amber-200 mb-1">{block.title}</div>
        <pre className="font-mono text-[13px] leading-[1.5] text-emerald-100/90 whitespace-pre-wrap">{block.text}</pre>
      </div>
    )
  }
  if (block.kind === 'note') {
    return (
      <div className="border-l-2 border-amber-300 pl-3">
        <div style={{ ...chalk, fontSize: 18, color: '#FDE68A' }}>{block.text}</div>
      </div>
    )
  }
  // fallback
  return <div style={{ ...chalk, fontSize: 20 }}>{block.text}</div>
}
