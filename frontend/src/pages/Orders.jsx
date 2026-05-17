import { Download, MapPin, Repeat2, XCircle } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getOrders } from '../api/client.js'

function imgSrc(dataUri) {
  if (!dataUri) return null
  if (dataUri.startsWith('data:')) return dataUri
  return `data:image/png;base64,${dataUri}`
}

function statusUi(status) {
  if (status === 'entregado') return { label: 'Entregado', cls: 'bg-emerald-400/10 text-emerald-200 border-emerald-300/20' }
  if (status === 'en_camino') return { label: 'En Camino', cls: 'bg-cyan-300/10 text-cyan-100 border-cyan-200/20' }
  return { label: 'Procesando', cls: 'bg-amber-400/10 text-amber-200 border-amber-300/20' }
}

export default function Orders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterLabel, setFilterLabel] = useState('Últimos 3 meses')

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setLoading(true)
        const data = await getOrders()
        if (!mounted) return
        setOrders(Array.isArray(data) ? data : [])
      } catch {
        if (mounted) setOrders([])
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [])

  const items = useMemo(() => orders.slice(0, 8), [orders])

  return (
    <div className="mx-auto max-w-6xl px-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-extrabold tracking-widest text-white/50">
            MI CUENTA <span className="text-white/30">›</span> MIS PEDIDOS
          </div>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight md:text-4xl">Mis Pedidos</h1>
          <div className="mt-2 text-sm text-white/60">
            Gestiona y rastrea tus compras de hardware de alto rendimiento.
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-extrabold tracking-widest text-white/60">
            FILTRAR POR:
          </div>
          <select
            value={filterLabel}
            onChange={(e) => setFilterLabel(e.target.value)}
            className="rounded-xl border border-white/10 bg-[#071026]/70 px-3 py-3 text-sm font-semibold text-white/80 outline-none"
          >
            <option>Últimos 3 meses</option>
            <option>Últimos 30 días</option>
            <option>Últimos 12 meses</option>
          </select>
        </div>
      </div>

      <div className="mt-8 space-y-5">
        {loading ? (
          Array.from({ length: 3 }).map((_, idx) => (
            <div
              key={idx}
              className="h-[190px] animate-pulse rounded-3xl border border-white/10 bg-white/5"
            />
          ))
        ) : items.length ? (
          items.map((o) => {
            const st = statusUi(o.status)
            const chips = String(o.extra_info || '')
              .split('|')
              .map((s) => s.trim())
              .filter(Boolean)
            return (
              <div
                key={o.id}
                className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-sm shadow-black/30 backdrop-blur-xl"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-6 py-4">
                  <div className="flex flex-wrap items-center gap-6 text-sm text-white/60">
                    <div>
                      <div className="text-[11px] font-extrabold tracking-widest text-white/40">PEDIDO ID</div>
                      <div className="mt-1 font-semibold text-white/85">#{o.order_code}</div>
                    </div>
                    <div>
                      <div className="text-[11px] font-extrabold tracking-widest text-white/40">FECHA</div>
                      <div className="mt-1 font-semibold text-white/85">{o.date_label}</div>
                    </div>
                    <div>
                      <div className="text-[11px] font-extrabold tracking-widest text-white/40">TOTAL</div>
                      <div className="mt-1 font-extrabold text-fuchsia-300">${Number(o.total).toFixed(2)}</div>
                    </div>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-xs font-extrabold ${st.cls}`}>
                    {st.label}
                  </span>
                </div>

                <div className="grid gap-5 px-6 py-6 md:grid-cols-[120px_1fr_260px] md:items-center">
                  <div className="h-[92px] w-[120px] overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                    {imgSrc(o.product_image_base64) ? (
                      <img
                        src={imgSrc(o.product_image_base64)}
                        alt={o.product_name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full bg-gradient-to-br from-fuchsia-500/20 to-cyan-400/20" />
                    )}
                  </div>

                  <div>
                    <div className="text-lg font-extrabold text-white/95">{o.product_name}</div>
                    <div className="mt-1 text-sm text-white/60">{o.product_description}</div>
                    <div className="mt-3 text-xs font-extrabold tracking-widest text-white/45">
                      CANTIDAD: <span className="text-white/70">{o.quantity}</span>
                    </div>
                    {chips.length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {chips.map((c, idx) => (
                          <span
                            key={`${o.id}-chip-${idx}`}
                            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-white/70"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-col gap-2">
                    {o.can_track ? (
                      <button
                        type="button"
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-500 to-cyan-400 px-4 py-3 text-sm font-extrabold text-[#05102a] transition hover:brightness-110"
                      >
                        <MapPin size={16} /> Rastrear Pedido
                      </button>
                    ) : null}
                    <Link
                      to="#"
                      className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-extrabold text-white/80 transition hover:bg-white/10"
                    >
                      Ver Detalles
                    </Link>
                    {o.can_download_invoice ? (
                      <button
                        type="button"
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-extrabold text-white/80 transition hover:bg-white/10"
                      >
                        <Download size={16} /> Descargar Factura
                      </button>
                    ) : null}
                    {o.status === 'entregado' ? (
                      <button
                        type="button"
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-extrabold text-white/80 transition hover:bg-white/10"
                      >
                        <Repeat2 size={16} /> Comprar de nuevo
                      </button>
                    ) : null}
                    {o.can_cancel ? (
                      <button
                        type="button"
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm font-extrabold text-rose-200 transition hover:bg-rose-400/15"
                      >
                        <XCircle size={16} /> Cancelar Pedido
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            )
          })
        ) : (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center text-white/60">
            No hay pedidos para mostrar
          </div>
        )}
      </div>

      <div className="mt-8 flex justify-center">
        <button
          type="button"
          className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-extrabold text-white/80 transition hover:bg-white/10"
        >
          Cargar pedidos anteriores ⌄
        </button>
      </div>
    </div>
  )
}

