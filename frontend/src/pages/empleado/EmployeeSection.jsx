import { Box, CreditCard, LogIn, Package, Truck, UserPlus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { getEmployeeDashboard } from '../../api/client.js'

function cx(...classes) {
  return classes.filter(Boolean).join(' ')
}

function formatInt(v) {
  const n = Number(v || 0)
  if (Number.isNaN(n)) return '0'
  return n.toLocaleString('es-PE')
}

function timeAgo(value) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const s = Math.floor((Date.now() - d.getTime()) / 1000)
  if (s < 60) return `Hace ${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `Hace ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `Hace ${h} h`
  const days = Math.floor(h / 24)
  return `Hace ${days} d`
}

function DashboardCard({ icon: Icon, title, value, hint, accentBox, accentBar }) {
  return (
    <div className="h-full rounded-2xl border border-white/10 bg-white/5 p-5 shadow-sm shadow-black/20 backdrop-blur-xl">
      <div className="flex h-full flex-col justify-between gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
          <div className="text-[11px] font-extrabold tracking-widest text-white/45">{title}</div>
          <div className="mt-2 text-3xl font-extrabold text-white/90">{value}</div>
          <div className="mt-2 truncate text-xs text-white/55">{hint}</div>
          </div>
          <div className={cx('grid h-11 w-11 place-items-center rounded-2xl border bg-white/5', accentBox)}>
            <Icon size={18} className="text-white/80" />
          </div>
        </div>
        <div className={cx('h-[3px] w-full rounded-full', accentBar)} />
      </div>
    </div>
  )
}

function activityMeta(type) {
  if (type === 'account_created') return { Icon: UserPlus, accent: 'border-cyan-300/20 bg-cyan-300/10', label: 'Cuenta' }
  if (type === 'payment') return { Icon: CreditCard, accent: 'border-emerald-300/20 bg-emerald-300/10', label: 'Pago' }
  if (type === 'order') return { Icon: Package, accent: 'border-amber-300/20 bg-amber-300/10', label: 'Pedido' }
  return { Icon: Box, accent: 'border-white/10 bg-white/5', label: 'Evento' }
}

export default function EmployeeSection({ title }) {
  const isDashboard = title === 'Dashboard'
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    async function load() {
      if (!isDashboard) return
      try {
        setLoading(true)
        const res = await getEmployeeDashboard()
        if (!mounted) return
        setData(res || null)
        setError('')
      } catch (e) {
        if (!mounted) return
        setData(null)
        setError(String(e?.message || 'No se pudo cargar el dashboard'))
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [isDashboard])

  const activity = useMemo(() => (Array.isArray(data?.activity) ? data.activity : []), [data?.activity])

  if (!isDashboard) {
    return (
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-sm shadow-black/30 backdrop-blur-xl">
        <div className="border-b border-white/10 px-6 py-5">
          <div className="text-xs font-extrabold tracking-widest text-white/45">PALACIO GAMER</div>
          <div className="mt-2 text-xl font-extrabold tracking-tight text-white/90">{title}</div>
          <div className="mt-2 text-sm text-white/60">Vista del panel (prototipo).</div>
        </div>
        <div className="p-6 text-sm text-white/60">Sección en construcción.</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-sm shadow-black/30 backdrop-blur-xl">
        <div className="flex items-start justify-between gap-6 px-6 py-6">
          <div>
            <div className="text-xs font-extrabold tracking-widest text-cyan-200/70">METAS DEL DÍA</div>
            <div className="mt-2 text-3xl font-extrabold tracking-tight text-white/90">Resumen de Operaciones</div>
            <div className="mt-2 text-sm text-white/60">Monitorización en tiempo real del ecosistema Palacio Gamer.</div>
          </div>
          <div className="hidden h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 sm:flex">
            <BarChart />
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-3xl border border-red-500/20 bg-red-500/10 px-6 py-4 text-sm font-semibold text-red-200">{error}</div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-5">
        <DashboardCard
          icon={UserPlus}
          title="CUENTAS CREADAS"
          value={loading ? '—' : formatInt(data?.clients_month)}
          hint={loading ? 'Cargando…' : `${formatInt(data?.clients_total)} clientes en total`}
          accentBox="border-cyan-300/20 bg-cyan-300/10"
          accentBar="bg-cyan-300/40"
        />
        <DashboardCard
          icon={LogIn}
          title="INICIOS DE SESIÓN"
          value={loading ? '—' : formatInt(data?.logins_24h)}
          hint={loading ? 'Cargando…' : 'Actividad en las últimas 24h'}
          accentBox="border-indigo-300/20 bg-indigo-300/10"
          accentBar="bg-indigo-300/40"
        />
        <DashboardCard
          icon={Box}
          title="STOCK INGRESADO"
          value={loading ? '—' : formatInt(data?.stock_units)}
          hint={loading ? 'Cargando…' : 'Unidades en inventario'}
          accentBox="border-fuchsia-300/20 bg-fuchsia-300/10"
          accentBar="bg-fuchsia-300/40"
        />
        <DashboardCard
          icon={CreditCard}
          title="PAGOS REALIZADOS"
          value={loading ? '—' : formatInt(data?.payments_today)}
          hint={loading ? 'Cargando…' : 'Pagos registrados hoy'}
          accentBox="border-emerald-300/20 bg-emerald-300/10"
          accentBar="bg-emerald-300/40"
        />
        <DashboardCard
          icon={Truck}
          title="ENTREGAS"
          value={loading ? '—' : formatInt(data?.deliveries_pending)}
          hint={loading ? 'Cargando…' : 'Pendientes de entrega'}
          accentBox="border-amber-300/20 bg-amber-300/10"
          accentBar="bg-amber-300/40"
        />
      </div>

      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-sm shadow-black/30 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-4 border-b border-white/10 px-6 py-5">
          <div>
            <div className="text-sm font-extrabold text-white/90">Actividad del Protocolo</div>
            <div className="mt-1 text-xs text-white/55">Últimos eventos registrados en el sistema.</div>
          </div>
          <div className="text-xs font-extrabold tracking-widest text-cyan-200/70">VER HISTORIAL</div>
        </div>

        <div className="divide-y divide-white/10">
          {loading ? (
            <div className="p-6">
              <div className="h-16 animate-pulse rounded-2xl border border-white/10 bg-white/5" />
            </div>
          ) : activity.length ? (
            activity.map((a, idx) => (
              <div key={`${a.type}-${idx}`} className="flex items-center justify-between gap-4 px-6 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  {(() => {
                    const meta = activityMeta(a.type)
                    const Icon = meta.Icon
                    return (
                      <div className={cx('grid h-10 w-10 place-items-center rounded-2xl border bg-white/5', meta.accent)}>
                        <Icon size={16} className="text-white/80" />
                      </div>
                    )
                  })()}
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-white/80">{a.label}</div>
                    <div className="mt-1 text-xs text-white/45">{a.created_at ? timeAgo(a.created_at) : ''}</div>
                  </div>
                </div>
                {a.ref ? <div className="shrink-0 text-xs font-extrabold text-white/35">{a.ref}</div> : null}
              </div>
            ))
          ) : (
            <div className="p-6 text-sm text-white/55">No hay actividad reciente.</div>
          )}
        </div>
      </div>
    </div>
  )
}

function BarChart() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7 text-white/20" fill="currentColor" aria-hidden="true">
      <path d="M4 19h16v2H2V3h2v16zm3-1V9h3v9H7zm5 0V5h3v13h-3zm5 0v-7h3v7h-3z" />
    </svg>
  )
}
