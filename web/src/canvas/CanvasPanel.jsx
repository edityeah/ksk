// CanvasPanel — overlay (default) or expanded (fills main panel).
//
// Layout modes:
//   * Overlay: right-side panel ~720px wide, greeting/chat still visible behind
//   * Expanded: fills the whole main panel (absolute inset-0)
//   * Mobile (md:): always full-screen — the overlay would be too cramped
//
// Header right side hosts:
//   * Module-injected actions (call icons etc. via CanvasHeaderActionsContext)
//   * Expand / Collapse toggle
//   * Close
//
// The CanvasPanel is positioned absolutely inside its parent — HomePage's main
// area is `relative`, so the overlay sits inside the main area, NOT over the
// sidebar.

import { useEffect, useRef, useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { X, ArrowLeft, Maximize2, Minimize2 } from 'lucide-react'
import { moduleFor, getCanvasMeta } from './modules/index.js'
import { CanvasHeaderActionsContext } from './CanvasHeaderActions.js'

export default function CanvasPanel() {
  const { canvas, closeCanvas } = useApp()
  const [expanded, setExpanded] = useState(false)
  const [headerActions, setHeaderActions] = useState(null)
  // Track the current canvas type so we only RESET on a real type change,
  // not on the initial mount. Mount-time reset is what was wiping the call
  // buttons: AvatarCall's effect ran first → setActions(<icons>) → state
  // queued; CanvasPanel's effect ran second → setHeaderActions(null) → state
  // queued; last write won, icons disappeared. Now we skip the very first run.
  const prevTypeRef = useRef(canvas?.type)
  useEffect(() => {
    if (prevTypeRef.current === canvas?.type) return  // initial mount or same canvas
    prevTypeRef.current = canvas?.type
    setHeaderActions(null)
    setExpanded(false)
  }, [canvas?.type])

  if (!canvas) return null
  const meta = getCanvasMeta(canvas.type)
  const Module = moduleFor(canvas.type)

  // On mobile (default), force expanded full-screen layout
  const expandedDesktop = expanded
  return (
    <>
      {/* Mobile backdrop when overlay (only relevant on tablets where overlay shows) */}
      {!expandedDesktop && (
        <button
          aria-label="Close canvas"
          onClick={closeCanvas}
          className="absolute inset-0 z-30 bg-black/20 md:hidden"
        />
      )}
      <div
        className={
          expandedDesktop
            ? 'absolute inset-0 z-40 bg-white flex flex-col'
            : 'absolute inset-0 md:inset-y-0 md:right-0 md:left-auto md:w-[min(820px,72%)] md:border-l md:border-bdr-light md:shadow-canvas md:animate-canvas-slide z-40 bg-white flex flex-col'
        }
      >
        <header className="flex items-center gap-2 md:gap-3 px-3 md:px-5 py-3 border-b border-bdr-light bg-white sticky top-0 z-10">
          <button onClick={closeCanvas} title="Back" className="p-1.5 rounded-pill hover:bg-slate-100 flex-shrink-0">
            <ArrowLeft className="w-5 h-5 text-txt-secondary" />
          </button>
          <div className="w-9 h-9 rounded bg-primary-light text-primary-dark flex items-center justify-center text-lg flex-shrink-0">{meta?.icon || '🗂'}</div>
          <div className="flex-1 min-w-0">
            <div className="text-[14px] md:text-[15px] font-bold text-txt-primary truncate">{meta?.title || canvas.type}</div>
            <div className="text-[11px] md:text-[12px] text-txt-secondary truncate">{meta?.subtitle || ''}</div>
          </div>

          {/* Module-injected actions (e.g. voice + video call icons) */}
          {headerActions && (
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {headerActions}
            </div>
          )}

          {/* Expand / collapse — desktop only */}
          <button
            onClick={() => setExpanded(e => !e)}
            title={expanded ? 'Collapse' : 'Expand'}
            className="hidden md:flex p-1.5 rounded-pill hover:bg-slate-100 flex-shrink-0"
          >
            {expanded ? <Minimize2 className="w-4 h-4 text-txt-secondary" /> : <Maximize2 className="w-4 h-4 text-txt-secondary" />}
          </button>

          <button onClick={closeCanvas} title="Close" className="p-1.5 rounded-pill hover:bg-slate-100 flex-shrink-0">
            <X className="w-5 h-5 text-txt-secondary" />
          </button>
        </header>

        <CanvasHeaderActionsContext.Provider value={{ setActions: setHeaderActions }}>
          <div className="flex-1 overflow-y-auto">
            {Module ? <Module context={canvas} /> : <NotImplemented type={canvas.type} />}
          </div>
        </CanvasHeaderActionsContext.Provider>
      </div>
    </>
  )
}

function NotImplemented({ type }) {
  return (
    <div className="p-6 text-sm text-txt-secondary">
      <div className="font-medium text-txt-primary mb-2">Module not implemented yet</div>
      <div>This canvas type (<code className="font-mono">{type}</code>) is scaffolded but its UI hasn't been built in this prototype slice.</div>
    </div>
  )
}
