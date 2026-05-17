import { Link } from 'react-router-dom'

export default function NotificationDropdown({ open, loading, notifications }) {
  const newCount = (notifications || []).filter((n) => n.is_new).length

  return (
    <div
      className={[
        'absolute right-0 top-12 w-[340px] overflow-hidden rounded-2xl border border-white/10 bg-[#071026]/85 shadow-2xl shadow-black/40 backdrop-blur-xl',
        open ? 'opacity-100' : 'pointer-events-none opacity-0',
      ].join(' ')}
    >
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div>
          <div className="text-xs font-extrabold tracking-widest text-white/80">NOTIFICACIONES</div>
          <div className="mt-1 text-xs text-white/50">{newCount} Nuevas</div>
        </div>
        <div className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_16px_rgba(34,211,238,0.7)]" />
      </div>

      <div className="max-h-[320px] overflow-auto px-2 py-2">
        {loading ? (
          <div className="px-3 py-10 text-center text-sm text-white/50">Cargando…</div>
        ) : notifications?.length ? (
          <div className="space-y-2">
            {notifications.slice(0, 6).map((n) => (
              <div
                key={n.id}
                className={[
                  'rounded-xl border border-white/10 bg-white/5 px-3 py-3',
                  n.is_new ? 'shadow-[0_0_0_1px_rgba(251,113,133,0.18)]' : '',
                ].join(' ')}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-white/90">{n.title}</div>
                    <div className="mt-1 text-xs leading-relaxed text-white/60">{n.message}</div>
                  </div>
                  <div className="shrink-0 text-[11px] text-white/40">{n.time_label}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-3 py-10 text-center text-sm text-white/50">Sin notificaciones</div>
        )}
      </div>

      <div className="border-t border-white/10 px-4 py-3">
        <Link
          to="/mis-pedidos"
          className="inline-flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10"
        >
          Ver todas las alertas
        </Link>
      </div>
    </div>
  )
}

