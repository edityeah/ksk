import { useApp } from '../context/AppContext.jsx'
import { ROLE_LABELS, ROLE_SCOPES } from '../roles/roleConfig.js'
import { Bell, LogOut, ChevronDown } from 'lucide-react'
import { useState } from 'react'

export default function TopBar() {
  const { user, role, signOut, notifications } = useApp()
  const [open, setOpen] = useState(false)
  const unread = notifications.filter(n => !n.readAt).length

  return (
    <div className="bg-white border-b border-bdr-light flex items-center px-4 py-2.5 sticky top-0 z-30">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded bg-primary-500 text-white flex items-center justify-center text-xs font-bold">KSK</div>
        <div className="text-sm font-semibold hidden md:block">Kaushal Samiksha Kendra</div>
      </div>
      <div className="ml-auto flex items-center gap-3">
        <button className="relative p-2 rounded hover:bg-slate-100">
          <Bell className="w-5 h-5 text-txt-secondary" />
          {unread > 0 && <span className="absolute -top-0.5 -right-0.5 bg-danger text-white text-[10px] rounded-pill w-4 h-4 flex items-center justify-center">{unread}</span>}
        </button>
        <div className="relative">
          <button onClick={() => setOpen(o => !o)}
            className="flex items-center gap-2 px-2 py-1 rounded hover:bg-slate-100">
            <div className="w-7 h-7 rounded-pill bg-primary-light text-primary-600 flex items-center justify-center text-xs font-semibold">
              {(user?.name || '?').split(' ').map(s => s[0]).slice(0, 2).join('')}
            </div>
            <div className="text-left hidden md:block">
              <div className="text-sm font-medium leading-tight">{user?.name}</div>
              <div className="text-xs text-txt-secondary leading-tight">{ROLE_LABELS[role]} · {ROLE_SCOPES[role]}</div>
            </div>
            <ChevronDown className="w-4 h-4 text-txt-secondary" />
          </button>
          {open && (
            <div className="absolute right-0 mt-1 w-56 bg-white rounded-card shadow-modal border border-bdr-light p-2 z-40">
              <div className="px-3 py-2 text-xs text-txt-secondary border-b border-bdr-light">
                <div className="font-medium text-txt-primary">{user?.name}</div>
                <div>{ROLE_LABELS[role]}</div>
              </div>
              <button onClick={signOut} className="w-full mt-1 flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 rounded">
                <LogOut className="w-4 h-4" /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
