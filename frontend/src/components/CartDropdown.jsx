import { Link } from 'react-router-dom'

function imgSrc(dataUri) {
  if (!dataUri) return null
  if (dataUri.startsWith('data:')) return dataUri
  if (dataUri.startsWith('/') || dataUri.startsWith('http://') || dataUri.startsWith('https://')) return dataUri
  return `data:image/png;base64,${dataUri}`
}

export default function CartDropdown({ open, loading, cart, onRemoveItem, onClear }) {
  const items = cart?.items || []

  return (
    <div
      className={[
        'absolute right-0 top-12 w-[340px] overflow-hidden rounded-2xl border border-white/10 bg-[#071026]/85 shadow-2xl shadow-black/40 backdrop-blur-xl',
        open ? 'opacity-100' : 'pointer-events-none opacity-0',
      ].join(' ')}
    >
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div>
          <div className="text-xs font-extrabold tracking-widest text-white/80">Tu Carrito</div>
          <div className="mt-1 text-xs text-white/50">{cart?.count || 0} items</div>
        </div>
        <div className="h-2 w-2 rounded-full bg-fuchsia-400 shadow-[0_0_16px_rgba(168,85,247,0.7)]" />
      </div>

      <div className="max-h-[280px] overflow-auto px-2 py-2">
        {loading ? (
          <div className="px-3 py-10 text-center text-sm text-white/50">Cargando…</div>
        ) : items.length ? (
          <div className="space-y-2">
            {items.slice(0, 5).map((it) => (
              <div
                key={it.id}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-3"
              >
                <div className="h-10 w-10 overflow-hidden rounded-lg bg-white/5">
                  {imgSrc(it.product_image_url || it.product_image_base64) ? (
                    <img
                      src={imgSrc(it.product_image_url || it.product_image_base64)}
                      alt={it.product_name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-fuchsia-500/20 to-cyan-400/20" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-white/90">{it.product_name}</div>
                  <div className="mt-1 text-xs text-white/60">
                    {it.quantity} × ${Number(it.price).toFixed(2)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveItem?.(it.id)}
                  className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs font-extrabold text-white/60 transition hover:bg-rose-400/10 hover:text-rose-200"
                >
                  Quitar
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-3 py-10 text-center text-sm text-white/50">Tu carrito está vacío</div>
        )}
      </div>

      <div className="border-t border-white/10 px-4 py-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-white/50">Subtotal</span>
          <span className="font-semibold text-white/90">${Number(cart?.subtotal || 0).toFixed(2)}</span>
        </div>
        {items.length ? (
          <button
            type="button"
            onClick={onClear}
            className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-extrabold text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            Vaciar Carrito
          </button>
        ) : null}
        <Link
          to="/carrito"
          className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-fuchsia-500 to-cyan-400 px-3 py-2 text-sm font-bold text-[#05102a] transition hover:brightness-110"
        >
          Ver Carrito
        </Link>
      </div>
    </div>
  )
}
