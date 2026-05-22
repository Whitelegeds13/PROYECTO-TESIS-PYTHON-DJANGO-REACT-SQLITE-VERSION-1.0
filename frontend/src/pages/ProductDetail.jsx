import { ChevronLeft, ShoppingCart, Star } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getProductBySlug } from '../api/client.js'

function imgSrc(dataUri) {
  if (!dataUri) return null
  if (dataUri.startsWith('data:')) return dataUri
  if (dataUri.startsWith('/') || dataUri.startsWith('http://') || dataUri.startsWith('https://')) return dataUri
  return `data:image/png;base64,${dataUri}`
}

export default function ProductDetail({ onAddToCart }) {
  const navigate = useNavigate()
  const { slug } = useParams()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    async function load() {
      setError('')
      setLoading(true)
      try {
        const data = await getProductBySlug(slug)
        if (!mounted) return
        setProduct(data || null)
      } catch (e) {
        if (!mounted) return
        setProduct(null)
        setError(e?.message || 'No se pudo cargar el producto.')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [slug])

  const image = product?.image_url || product?.image_base64
  const rating = Number(product?.rating || 0)
  const stock = Number(product?.stock || 0)
  const available = product && product.status !== 'agotado' && stock > 0

  const specsPairs = useMemo(() => {
    const raw = String(product?.specs || '').trim()
    if (!raw) return []
    const lines = raw
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
    return lines.map((line, idx) => {
      const sep = line.includes(':') ? ':' : line.includes('=') ? '=' : null
      if (!sep) return { key: `spec-${idx}`, label: '', value: line }
      const [k, ...rest] = line.split(sep)
      return { key: `spec-${idx}`, label: String(k || '').trim(), value: rest.join(sep).trim() }
    })
  }, [product?.specs])

  return (
    <div className="mx-auto max-w-6xl px-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            <ChevronLeft size={16} /> Volver
          </button>
          <div className="text-xs font-extrabold tracking-widest text-white/50">
            <Link to="/" className="hover:text-white">
              Inicio
            </Link>{' '}
            <span className="text-white/30">›</span>{' '}
            <Link to="/hardware" className="hover:text-white">
              Hardware
            </Link>{' '}
            <span className="text-white/30">›</span> {product?.name || 'Producto'}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_420px]">
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-sm shadow-black/30 backdrop-blur-xl">
          <div className="grid gap-4 p-4 md:grid-cols-[84px_1fr] md:p-6">
            <div className="order-2 flex gap-2 md:order-1 md:flex-col">
              <button
                type="button"
                className="h-16 w-16 overflow-hidden rounded-2xl border border-white/10 bg-white/5"
                aria-label="Imagen"
              >
                {imgSrc(image) ? <img src={imgSrc(image)} alt="" className="h-full w-full object-cover" /> : null}
              </button>
            </div>

            <div className="order-1 overflow-hidden rounded-2xl border border-white/10 bg-white/5 md:order-2">
              {loading ? (
                <div className="h-[360px] w-full animate-pulse bg-white/5" />
              ) : imgSrc(image) ? (
                <img src={imgSrc(image)} alt={product?.name || 'Producto'} className="h-[360px] w-full object-cover" />
              ) : (
                <div className="h-[360px] w-full bg-gradient-to-br from-fuchsia-500/20 via-cyan-400/15 to-sky-400/10" />
              )}
            </div>
          </div>
        </div>

        <aside className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-sm shadow-black/30 backdrop-blur-xl">
          <div className="border-b border-white/10 px-6 py-5">
            <div className="text-xs font-extrabold tracking-widest text-white/50">
              CATEGORÍA: <span className="text-white/70">{product?.category?.name || '-'}</span>
            </div>
            <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-white/95 md:text-3xl">
              {loading ? 'Cargando…' : product?.name || 'Producto no encontrado'}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-white/60">
              <div className="inline-flex items-center gap-2">
                <Star size={16} className="text-amber-300/90" />
                <span className="font-semibold text-white/80">{rating.toFixed(1)}</span>
                <span className="text-white/45">({Number(product?.reviews_count || 0)} reviews)</span>
              </div>
              <span className="text-white/25">•</span>
              <div>
                <span className="text-white/45">Marca:</span> <span className="text-white/80">{product?.brand || '-'}</span>
              </div>
              <span className="text-white/25">•</span>
              <div>
                <span className="text-white/45">Tipo / Línea:</span>{' '}
                <span className="text-white/80">{product?.product_type || '-'}</span>
              </div>
            </div>
          </div>

          <div className="space-y-5 px-6 py-6">
            {error ? (
              <div className="rounded-xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
                {error}
              </div>
            ) : null}

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="text-xs font-extrabold tracking-widest text-white/50">PRECIO</div>
              <div className="mt-2 flex items-end justify-between gap-3">
                <div>
                  <div className="text-3xl font-extrabold text-white/95">
                    ${Number(product?.price || 0).toFixed(2)}
                  </div>
                  {product?.old_price ? (
                    <div className="mt-1 text-sm text-white/40 line-through">${Number(product.old_price).toFixed(2)}</div>
                  ) : null}
                  {product?.discount_percent ? (
                    <div className="mt-1 text-xs font-semibold text-fuchsia-300/90">-{product.discount_percent}% OFF</div>
                  ) : null}
                </div>
                <div className="text-right text-sm text-white/60">
                  <div>
                    <span className="text-white/45">Stock inicial:</span> <span className="font-semibold text-white/80">{stock}</span>
                  </div>
                  <div className="mt-1">
                    <span className="text-white/45">Estado:</span>{' '}
                    <span className="font-semibold text-white/80">{product?.status || '-'}</span>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={!available}
              onClick={() => onAddToCart?.(product)}
              className={[
                'inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-500 to-cyan-400 px-5 py-3 text-sm font-extrabold text-[#05102a] transition hover:brightness-110',
                available ? '' : 'cursor-not-allowed opacity-40',
              ].join(' ')}
            >
              <ShoppingCart size={16} /> Agregar al carrito
            </button>

            <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-white/70">
              <div className="flex items-center justify-between">
                <span className="text-white/50">Categoría</span>
                <span className="font-semibold text-white/85">{product?.category?.name || '-'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/50">Marca</span>
                <span className="font-semibold text-white/85">{product?.brand || '-'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/50">Tipo / Línea</span>
                <span className="font-semibold text-white/85">{product?.product_type || '-'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/50">Stock inicial</span>
                <span className="font-semibold text-white/85">{stock}</span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <div className="mt-8 space-y-6">
        <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-sm shadow-black/30 backdrop-blur-xl">
          <div className="border-b border-white/10 px-6 py-5">
            <div className="text-lg font-extrabold tracking-tight text-white/95">Descripción Detallada</div>
          </div>
          <div className="px-6 py-6 text-sm leading-relaxed text-white/70">
            {loading ? (
              <div className="h-24 animate-pulse rounded-2xl bg-white/5" />
            ) : (
              <div className="whitespace-pre-line">{String(product?.description || 'Sin descripción.')}</div>
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-sm shadow-black/30 backdrop-blur-xl">
          <div className="border-b border-white/10 px-6 py-5">
            <div className="text-lg font-extrabold tracking-tight text-white/95">Especificaciones Técnicas</div>
          </div>
          <div className="px-6 py-6">
            {loading ? (
              <div className="h-28 animate-pulse rounded-2xl bg-white/5" />
            ) : specsPairs.length ? (
              <div className="grid gap-3 md:grid-cols-2">
                {specsPairs.map((row) => (
                  <div
                    key={row.key}
                    className="flex items-start justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm"
                  >
                    <div className="text-white/55">{row.label || '•'}</div>
                    <div className="text-right font-semibold text-white/85">{row.value}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-white/60">Sin especificaciones.</div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

