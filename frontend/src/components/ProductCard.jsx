import { ShoppingCart, Star } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

function imgSrc(dataUri) {
  if (!dataUri) return null
  if (dataUri.startsWith('data:')) return dataUri
  if (dataUri.startsWith('/') || dataUri.startsWith('http://') || dataUri.startsWith('https://')) return dataUri
  return `data:image/png;base64,${dataUri}`
}

function statusBadge(status) {
  if (status === 'agotado') return { label: 'AGOTADO', cls: 'bg-white/5 text-white/55 border-white/10' }
  if (status === 'stock_bajo')
    return { label: 'STOCK BAJO', cls: 'bg-amber-400/10 text-amber-200 border-amber-300/20' }
  return { label: 'DISPONIBLE', cls: 'bg-emerald-400/10 text-emerald-200 border-emerald-300/20' }
}

export default function ProductCard({ product, onAddToCart }) {
  const navigate = useNavigate()
  const badge = statusBadge(product.status)
  const disabled = product.status === 'agotado' || product.stock <= 0
  const rating = Number(product.rating || 0)
  const image = product.image_url || product.image_base64

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4 shadow-sm shadow-black/30 backdrop-blur-xl transition hover:border-white/20">
      <div className="absolute right-3 top-3">
        <span className={`rounded-full border px-2 py-1 text-[10px] font-extrabold tracking-widest ${badge.cls}`}>
          {badge.label}
        </span>
      </div>

      <div className="aspect-[4/3] overflow-hidden rounded-xl bg-white/5">
        {imgSrc(image) ? (
          <img
            src={imgSrc(image)}
            alt={product.name}
            className="h-full w-full object-cover opacity-95 transition duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-fuchsia-500/20 via-cyan-400/15 to-sky-400/10" />
        )}
      </div>

      <div className="mt-4 text-xs font-semibold tracking-widest text-white/50">
        {(product.product_type || product.category?.name || '').toUpperCase()}
      </div>
      <div className="mt-1 text-sm font-extrabold leading-snug text-white/90">{product.name}</div>

      <div className="mt-3 flex items-center gap-2 text-xs text-white/55">
        <div className="flex items-center gap-1">
          <Star size={14} className="text-amber-300/90" />
          <span className="font-semibold text-white/70">{rating.toFixed(1)}</span>
        </div>
        <span>({product.reviews_count} reviews)</span>
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          {product.old_price ? (
            <div className="text-xs text-white/40 line-through">S/ {Number(product.old_price).toFixed(2)}</div>
          ) : (
            <div className="text-xs text-white/40">&nbsp;</div>
          )}
          <div className="text-lg font-extrabold text-white/95">S/ {Number(product.price).toFixed(2)}</div>
          {product.discount_percent ? (
            <div className="mt-1 text-xs font-semibold text-fuchsia-300/90">
              -{product.discount_percent}% OFF
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(`/producto/${product.slug}`)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/80 transition hover:border-fuchsia-400/20 hover:bg-white/10 hover:text-white"
            aria-label="Ver detalles"
            title="Detalles"
          >
            <span className="text-lg font-extrabold leading-none">¡</span>
          </button>
          <button
            type="button"
            onClick={() => onAddToCart?.(product)}
            disabled={disabled}
            className={[
              'inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/80 transition',
              disabled
                ? 'cursor-not-allowed opacity-40'
                : 'hover:border-cyan-300/20 hover:bg-white/10 hover:text-white',
            ].join(' ')}
            aria-label="Agregar al carrito"
            title={disabled ? 'Agotado' : 'Agregar al carrito'}
          >
            <ShoppingCart size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}
