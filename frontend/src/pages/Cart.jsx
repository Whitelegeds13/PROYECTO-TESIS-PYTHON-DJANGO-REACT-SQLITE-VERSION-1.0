import { Trash2 } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

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

export default function Cart({ cart, loading, onRemoveItem, onClear }) {
  const navigate = useNavigate()
  const items = cart?.items || []

  return (
    <div className="mx-auto max-w-6xl px-4">
      <div className="mb-6">
        <div className="text-xs font-extrabold tracking-widest text-white/45">PALACIO GAMER</div>
        <div className="mt-2 text-3xl font-extrabold tracking-tight text-white/90">Tu Carrito</div>
        <div className="mt-1 text-sm text-white/60">Compras acumuladas en tu carrito (puedes quitar productos o vaciarlo).</div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-sm shadow-black/30 backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-6 py-5">
          <div className="text-sm text-white/60">{loading ? 'Cargando…' : `${items.length} item(s)`}</div>
          <div className="flex items-center gap-3">
            {items.length ? (
              <button
                type="button"
                onClick={onClear}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-extrabold text-white/75 transition hover:bg-white/10 hover:text-white"
              >
                Vaciar carrito
              </button>
            ) : null}
            <Link
              to="/hardware"
              className="rounded-xl bg-gradient-to-r from-fuchsia-500 to-cyan-400 px-4 py-2 text-sm font-extrabold text-[#05102a] transition hover:brightness-110"
            >
              Seguir comprando
            </Link>
          </div>
        </div>

        <div className="p-6">
          {!loading && items.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white/70">Tu carrito está vacío.</div>
          ) : null}

          {items.length ? (
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
              <div className="grid grid-cols-[1.4fr_.5fr_.6fr_.2fr] gap-4 border-b border-white/10 px-5 py-4 text-xs font-extrabold tracking-widest text-white/45">
                <div>Producto</div>
                <div>Cantidad</div>
                <div>Total</div>
                <div />
              </div>
              {items.map((it) => {
                const image = it.product_image_url || it.product_image_base64
                const total = Number(it.price || 0) * Number(it.quantity || 0)
                return (
                  <div
                    key={it.id}
                    className="grid grid-cols-[1.4fr_.5fr_.6fr_.2fr] gap-4 border-b border-white/10 px-5 py-4 last:border-b-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 overflow-hidden rounded-xl border border-white/10 bg-white/5">
                        {imgSrc(image) ? (
                          <img src={imgSrc(image)} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full bg-gradient-to-br from-fuchsia-500/20 to-cyan-400/20" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-extrabold text-white/90">{it.product_name}</div>
                        <div className="mt-1 text-xs text-white/55">
                          {Number(it.quantity || 0)} × {money(it.price)}
                        </div>
                      </div>
                    </div>
                    <div className="self-center text-sm text-white/70">{it.quantity}</div>
                    <div className="self-center text-sm font-extrabold text-cyan-200/90">{money(total)}</div>
                    <div className="flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => onRemoveItem?.(it.id)}
                        className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-extrabold text-white/70 transition hover:bg-rose-400/10 hover:text-rose-200"
                      >
                        <Trash2 size={16} />
                        Quitar
                      </button>
                    </div>
                  </div>
                )
              })}
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div>
                  <div className="text-sm text-white/55">Subtotal</div>
                  <div className="text-xl font-extrabold text-white/90">{money(cart?.subtotal || 0)}</div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/checkout')}
                  className="rounded-xl bg-gradient-to-r from-fuchsia-500 to-cyan-400 px-5 py-3 text-sm font-extrabold text-[#05102a] transition hover:brightness-110"
                >
                  Pagar ahora
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
