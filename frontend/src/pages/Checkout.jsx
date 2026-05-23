import { Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'

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

export default function Checkout({ cart, loading, onRemoveItem, onUpdateQuantity, onCheckout }) {
  const items = cart?.items || []
  const subtotal = Number(cart?.subtotal || 0)
  const shipping = 0.0
  const igv = subtotal * 0.18
  const total = subtotal + shipping + igv

  return (
    <div className="mx-auto max-w-6xl px-4">
      <div className="mb-6">
        <div className="text-xs font-extrabold tracking-widest text-white/45">PALACIO GAMER</div>
        <div className="mt-2 text-3xl font-extrabold tracking-tight text-white/90">Resumen de Compra</div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <section className="space-y-4">
          {loading ? (
            <div className="h-[160px] animate-pulse rounded-3xl border border-white/10 bg-white/5" />
          ) : items.length ? (
            items.map((it) => {
              const image = it.product_image_url || it.product_image_base64
              const lineTotal = Number(it.price || 0) * Number(it.quantity || 0)
              const canMinus = Number(it.quantity || 0) > 1
              return (
                <div
                  key={it.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/10 bg-white/5 px-5 py-5 shadow-sm shadow-black/30 backdrop-blur-xl"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="h-16 w-16 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                      {imgSrc(image) ? (
                        <img src={imgSrc(image)} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full bg-gradient-to-br from-fuchsia-500/20 to-cyan-400/20" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-base font-extrabold text-white/90">{it.product_name}</div>
                      <div className="mt-1 text-xs text-white/55">S/ {Number(it.price || 0).toFixed(2)}</div>
                      <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2 py-2">
                        <button
                          type="button"
                          disabled={!canMinus}
                          onClick={() => onUpdateQuantity?.(it.id, Number(it.quantity || 1) - 1)}
                          className={[
                            'h-7 w-7 rounded-lg border border-white/10 bg-white/5 text-sm font-extrabold text-white/80 transition hover:bg-white/10',
                            !canMinus ? 'cursor-not-allowed opacity-40' : '',
                          ].join(' ')}
                          aria-label="Disminuir"
                        >
                          −
                        </button>
                        <div className="min-w-8 text-center text-sm font-extrabold text-white/85">{it.quantity}</div>
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity?.(it.id, Number(it.quantity || 1) + 1)}
                          className="h-7 w-7 rounded-lg border border-white/10 bg-white/5 text-sm font-extrabold text-white/80 transition hover:bg-white/10"
                          aria-label="Aumentar"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-xs text-white/50">Total</div>
                      <div className="text-lg font-extrabold text-white/90">{money(lineTotal)}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemoveItem?.(it.id)}
                      className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 p-3 text-white/70 transition hover:bg-rose-400/10 hover:text-rose-200"
                      aria-label="Quitar"
                      title="Quitar"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-white/70">
              Tu carrito está vacío.
            </div>
          )}
        </section>

        <aside className="h-fit overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-sm shadow-black/30 backdrop-blur-xl">
          <div className="border-b border-white/10 px-6 py-5">
            <div className="text-lg font-extrabold tracking-tight text-white/95">Resumen de Pedido</div>
          </div>
          <div className="space-y-4 px-6 py-6">
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between text-white/70">
                <span className="text-white/55">Subtotal</span>
                <span>{money(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-white/70">
                <span className="text-white/55">Envío</span>
                <span className="font-semibold text-emerald-200">Gratis</span>
              </div>
              <div className="flex items-center justify-between text-white/70">
                <span className="text-white/55">IGV (18%)</span>
                <span>{money(igv)}</span>
              </div>
              <div className="mt-3 flex items-end justify-between border-t border-white/10 pt-4">
                <span className="text-sm font-extrabold text-white/70">Total</span>
                <span className="text-2xl font-extrabold text-fuchsia-200">{money(total)}</span>
              </div>
            </div>

            <button
              type="button"
              disabled={!items.length || loading}
              onClick={() => onCheckout?.()}
              className={[
                'w-full rounded-xl bg-gradient-to-r from-fuchsia-500 to-cyan-400 px-5 py-4 text-base font-extrabold text-[#05102a] shadow-[0_0_0_1px_rgba(34,211,238,0.22),0_18px_50px_rgba(168,85,247,0.25)] transition hover:brightness-110',
                !items.length || loading ? 'cursor-not-allowed opacity-40' : '',
              ].join(' ')}
            >
              Continuar al Pago
            </button>

            <Link to="/hardware" className="block text-center text-sm font-semibold text-white/60 hover:text-white">
              Volver a la Tienda
            </Link>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-white/60">
              Tu compra está protegida por Palacio Gamer Protection. Garantía extendida incluida.
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
