import { useApp } from '../context/AppContext.jsx'
import { X } from 'lucide-react'
import { moduleFor, getCanvasMeta } from './modules/index.js'

export default function CanvasPanel() {
  const { canvas, closeCanvas } = useApp()
  if (!canvas) return null
  const meta = getCanvasMeta(canvas.type)
  const Module = moduleFor(canvas.type)

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={closeCanvas} />
      <div className="fixed inset-y-0 right-0 z-50 w-full md:w-[60%] lg:w-[640px] xl:w-[820px] bg-white shadow-canvas animate-canvas-slide flex flex-col">
        <header className="flex items-center gap-3 px-4 py-3 border-b border-bdr-light">
          <div className="w-9 h-9 rounded bg-primary-light text-primary-dark flex items-center justify-center text-lg">{meta?.icon || '🗂'}</div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate">{meta?.title || canvas.type}</div>
            <div className="text-xs text-txt-secondary truncate">{meta?.subtitle || ''}</div>
          </div>
          <button onClick={closeCanvas} className="p-1.5 rounded hover:bg-slate-100"><X className="w-5 h-5 text-txt-secondary" /></button>
        </header>
        <div className="flex-1 overflow-y-auto">
          {Module ? <Module context={canvas} /> : <NotImplemented type={canvas.type} />}
        </div>
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
