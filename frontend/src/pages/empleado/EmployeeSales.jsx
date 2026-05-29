import { useEffect, useMemo, useState } from 'react'
import { getEmployeeSales } from '../../api/client.js'

function imgSrc(dataUri) {
  if (!dataUri) return null
  if (dataUri.startsWith('data:')) return dataUri
  if (dataUri.startsWith('/') || dataUri.startsWith('http://') || dataUri.startsWith('https://')) return dataUri
  return `data:image/png;base64,${dataUri}`
}

function money(v) {
  const n = Number(v || 0)
  if (Number.isNaN(n)) return 'S/ 0.00'
  return `S/ ${n.toFixed(2)}`
}

function fmtDT(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('es-PE', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })
}

function statusLabel(p) {
  if (p?.sync_status === 'en_espera') return 'En espera'
  if (p?.sync_status === 'confirmado') return 'Aprobado'
  if (p?.sync_status === 'rechazado') return 'Rechazado'
  if (p?.status === 'confirmed') return 'Confirmado'
  return 'Pendiente'
}

function statusColor(p) {
  if (p?.sync_status === 'rechazado') return 'bg-rose-300'
  if (p?.sync_status === 'confirmado' || p?.status === 'confirmed') return 'bg-emerald-300'
  return 'bg-amber-300'
}

export default function EmployeeSales() {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setLoading(true)
        const res = await getEmployeeSales()
        if (!mounted) return
        setData(res || null)
        setError('')
      } catch (e) {
        if (!mounted) return
        setData(null)
        setError(String(e?.message || 'No se pudo cargar ventas'))
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    const id = setInterval(load, 30_000)
    return () => {
      mounted = false
      clearInterval(id)
    }
  }, [])

  const recent = useMemo(() => (Array.isArray(data?.recent_payments) ? data.recent_payments : []), [data?.recent_payments])
  const sales24 = useMemo(() => (Array.isArray(data?.sales_24h) ? data.sales_24h : []), [data?.sales_24h])
  const top = useMemo(() => (Array.isArray(data?.top_products_today) ? data.top_products_today : []), [data?.top_products_today])

  const maxBar = useMemo(() => {
    const vals = sales24.map((b) => Number(b?.total || 0)).filter((n) => !Number.isNaN(n))
    return Math.max(1, ...vals)
  }, [sales24])

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-sm shadow-black/30 backdrop-blur-xl">
        <div className="border-b border-white/10 px-6 py-5">
          <div className="text-xs font-extrabold tracking-widest text-white/45">PALACIO GAMER</div>
          <div className="mt-2 text-xl font-extrabold tracking-tight text-white/90">Transacciones Recientes</div>
          <div className="mt-2 text-sm text-white/60">Actividad de ventas y pagos registrados.</div>
        </div>

        {error ? (
          <div className="px-6 py-4 text-sm font-semibold text-red-200">{error}</div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-white/10 text-xs font-extrabold tracking-widest text-white/45">
              <tr>
                <th className="px-6 py-4">TRANSACCIÓN</th>
                <th className="px-6 py-4">CLIENTE</th>
                <th className="px-6 py-4">FECHA / HORA</th>
                <th className="px-6 py-4">MONTO</th>
                <th className="px-6 py-4">ESTADO</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-6 text-white/60">
                    Cargando…
                  </td>
                </tr>
              ) : recent.length ? (
                recent.map((p) => (
                  <tr key={p.payment_code} className="hover:bg-white/5">
                    <td className="px-6 py-4">
                      <div className="text-sm font-extrabold text-white/85">{p.payment_code}</div>
                      <div className="mt-1 text-xs text-white/45">{String(p.method || '').replace('_', ' ')}</div>
                    </td>
                    <td className="px-6 py-4 text-white/70">{p.customer}</td>
                    <td className="px-6 py-4 text-white/70">{fmtDT(p.created_at)}</td>
                    <td className="px-6 py-4 font-extrabold text-white/85">{money(p.total)}</td>
                    <td className="px-6 py-4">
                      <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-extrabold text-white/75">
                        <span className={`inline-block h-2 w-2 rounded-full ${statusColor(p)}`} />
                        {statusLabel(p)}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-6 text-white/60">
                    No hay transacciones.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-sm shadow-black/30 backdrop-blur-xl">
          <div className="border-b border-white/10 px-6 py-5">
            <div className="text-sm font-extrabold text-white/90">Actividad de Ventas (24h)</div>
            <div className="mt-1 text-xs text-white/55">Actualiza automáticamente cada 30 segundos.</div>
          </div>
          <div className="px-6 py-6">
            <div className="grid grid-cols-12 items-end gap-2">
              {sales24.map((b, idx) => {
                const val = Number(b?.total || 0)
                const h = Math.max(6, Math.round((Math.max(0, val) / maxBar) * 160))
                return (
                  <div key={`${b.hour}-${idx}`} className="col-span-2 sm:col-span-1">
                    <div className="flex h-[180px] items-end">
                      <div
                        className="w-full rounded-xl bg-gradient-to-t from-fuchsia-500/60 to-cyan-400/50"
                        style={{ height: `${h}px` }}
                        title={`${b.hour} • ${money(val)}`}
                      />
                    </div>
                    <div className="mt-2 text-center text-[10px] font-extrabold text-white/45">{b.hour}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <aside className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-sm shadow-black/30 backdrop-blur-xl">
          <div className="border-b border-white/10 px-6 py-5">
            <div className="text-sm font-extrabold text-white/90">Top Productos Hoy</div>
            <div className="mt-1 text-xs text-white/55">Solo productos disponibles.</div>
          </div>
          <div className="divide-y divide-white/10">
            {loading ? (
              <div className="px-6 py-6 text-sm text-white/60">Cargando…</div>
            ) : top.length ? (
              top.map((p) => {
                const img = p.image_url || p.image_base64
                return (
                  <div key={p.product_id} className="flex items-center justify-between gap-3 px-6 py-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="h-12 w-12 overflow-hidden rounded-xl border border-white/10 bg-white/5">
                        {imgSrc(img) ? <img src={imgSrc(img)} alt="" className="h-full w-full object-cover" /> : null}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-extrabold text-white/85">{p.name}</div>
                        <div className="mt-1 text-xs text-white/55">{p.quantity} vendidos</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-extrabold text-white/85">{money(p.revenue)}</div>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="px-6 py-6 text-sm text-white/60">Sin ventas hoy.</div>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
