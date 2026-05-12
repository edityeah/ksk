import { useApp } from '../../context/AppContext.jsx'
import { api } from '../../api/client.js'
import { dispatchActionForRole } from '../../nlp/dispatch.js'

export default function NotificationsCanvas() {
  const { notifications, refreshNotifications, openCanvas, showToast, role } = useApp()

  async function read(n) {
    if (!n.readAt) await api.markRead(n.id)
    refreshNotifications()
  }
  function act(n) {
    read(n)
    if (n.action?.type) {
      dispatchActionForRole({ actionId: n.action.type, entities: n.action.payload || {}, role, openCanvas, showToast })
    }
  }

  return (
    <div className="p-5 space-y-2">
      <h3 className="text-sm font-semibold">Notifications</h3>
      {notifications.length === 0 && <div className="text-sm text-txt-secondary">All caught up.</div>}
      {notifications.map(n => (
        <div key={n.id} onClick={() => read(n)}
          className={`rounded-card border p-3 cursor-pointer ${n.readAt ? 'border-bdr-light bg-white' : 'border-primary-500 bg-primary-light'}`}>
          <div className="flex items-start gap-2">
            <div className="text-xs uppercase tracking-wider text-txt-secondary">{n.category}</div>
            {n.priority === 'high' && <span className="badge badge-warn">high</span>}
            {n.priority === 'urgent' && <span className="badge badge-danger">urgent</span>}
          </div>
          <div className="font-medium text-sm mt-0.5">{n.title}</div>
          <div className="text-xs text-txt-secondary mt-0.5">{n.message}</div>
          {n.action && (
            <button onClick={(e) => { e.stopPropagation(); act(n) }}
              className="mt-2 px-3 py-1 rounded-pill bg-primary-500 text-white text-xs">{n.action.label || 'Open'}</button>
          )}
        </div>
      ))}
    </div>
  )
}
