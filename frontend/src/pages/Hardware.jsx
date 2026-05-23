import { ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getProducts } from '../api/client.js'
import ProductCard from '../components/ProductCard.jsx'

const CATEGORY_MAP = [
  { key: 'gpus', label: 'GPU (Grafica)', slug: 'tarjetas-graficas' },
  { key: 'cpus', label: 'CPUs(Procesadores)', slug: 'procesadores' },
  { key: 'ram', label: 'Memoria Ram', slug: 'memoria-ram' },
  { key: 'storage', label: 'Almacenamiento', slug: 'almacenamiento' },
  { key: 'keyboards', label: 'Teclados', slug: 'teclados' },
  { key: 'psu', label: 'Fuente de poder', slug: 'fuente-de-poder' },
  { key: 'headsets', label: 'Audifonos', slug: 'audifonos' },
  { key: 'mobo', label: 'Placa', slug: 'placa' },
]

const SORT_OPTIONS = [
  { value: 'popular', label: 'Más Populares' },
  { value: 'price_asc', label: 'Precio: Menor a Mayor' },
  { value: 'price_desc', label: 'Precio: Mayor a Menor' },
  { value: 'rating', label: 'Mejor Calificados' },
]

export default function Hardware({ onAddToCart }) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const search = (searchParams.get('search') || '').trim()
  const urlCategory = (searchParams.get('category') || '').trim()
  const urlSort = (searchParams.get('sort') || '').trim() || 'popular'

  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  const [selectedCategoryKey, setSelectedCategoryKey] = useState('')
  const [maxPrice, setMaxPrice] = useState(5000)
  const [onlyAvailable, setOnlyAvailable] = useState(false)
  const [instantDelivery, setInstantDelivery] = useState(false)

  const [page, setPage] = useState(1)
  const pageSize = 12

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setLoading(true)
        const data = await getProducts({
          search: search || undefined,
          category: urlCategory || undefined,
          sort: urlSort || undefined,
        })
        if (!mounted) return
        setProducts(Array.isArray(data) ? data : [])
      } catch {
        if (mounted) setProducts([])
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [search, urlCategory, urlSort])

  useEffect(() => {
    setPage(1)
  }, [search, urlCategory, urlSort, selectedCategoryKey, maxPrice, onlyAvailable, instantDelivery])

  const selectedCategorySlug = useMemo(() => {
    const entry = CATEGORY_MAP.find((c) => c.key === selectedCategoryKey)
    return entry?.slug || ''
  }, [selectedCategoryKey])

  const filtered = useMemo(() => {
    let list = products

    if (selectedCategorySlug) {
      list = list.filter((p) => p.category?.slug === selectedCategorySlug)
    }

    const max = Number(maxPrice || 0)
    if (Number.isFinite(max) && max > 0) {
      list = list.filter((p) => Number(p.price) <= max)
    }

    if (onlyAvailable) {
      list = list.filter((p) => p.status !== 'agotado' && Number(p.stock) > 0)
    }

    if (instantDelivery) {
      list = list.filter((p) => p.status === 'disponible' && Number(p.stock) > 0)
    }

    return list
  }, [products, selectedCategorySlug, maxPrice, onlyAvailable, instantDelivery])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize)

  function setSort(next) {
    const sp = new URLSearchParams(searchParams)
    sp.set('sort', next)
    setSearchParams(sp)
  }

  function clearFilters() {
    setSelectedCategoryKey('')
    setMaxPrice(5000)
    setOnlyAvailable(false)
    setInstantDelivery(false)
  }

  return (
    <div className="mx-auto max-w-6xl px-4">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-sm shadow-black/30 backdrop-blur-xl">
        <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/10 via-cyan-400/10 to-sky-400/10" />
        <div className="absolute inset-0 bg-[radial-gradient(900px_500px_at_65%_40%,rgba(34,211,238,0.22),transparent_55%)]" />
        <div className="relative px-6 py-12 md:px-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-extrabold tracking-widest text-white/70">
            PROMO PROTOCOL 2.0
          </div>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight md:text-5xl">Domina el Juego con RTX 40 Series</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/65 md:text-base">
            Mejora tu equipo con la última tecnología de trazado de rayos. Stock limitado en modelos Founders Edition.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                const sp = new URLSearchParams(searchParams)
                sp.set('sort', 'offers')
                setSearchParams(sp)
              }}
              className="rounded-xl bg-gradient-to-r from-fuchsia-500 to-cyan-400 px-5 py-3 text-sm font-extrabold text-[#05102a] transition hover:brightness-110"
            >
              Ver Ofertas
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-extrabold text-white/85 transition hover:bg-white/10"
            >
              Más Información
            </button>
          </div>
        </div>
      </section>

      <div className="mt-10 grid gap-8 md:grid-cols-[320px_1fr]">
        <aside className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-sm shadow-black/30 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <div className="text-sm font-extrabold tracking-tight text-white/90">Filtros</div>
              <SlidersHorizontal size={16} className="text-white/55" />
            </div>

            <div className="mt-5">
              <div className="text-xs font-extrabold tracking-widest text-white/50">CATEGORÍA</div>
              <div className="mt-3 space-y-2">
                {CATEGORY_MAP.map((c) => (
                  <label key={c.key} className="flex cursor-pointer items-center gap-3 text-sm text-white/70">
                    <input
                      type="radio"
                      name="cat"
                      checked={selectedCategoryKey === c.key}
                      onChange={() => setSelectedCategoryKey(c.key)}
                      className="h-4 w-4 accent-cyan-300"
                    />
                    <span>{c.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <div className="text-xs font-extrabold tracking-widest text-white/50">RANGO DE PRECIO</div>
              <div className="mt-3">
                <input
                  type="range"
                  min="50"
                  max="5000"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                  className="w-full accent-fuchsia-400"
                />
                <div className="mt-2 flex items-center justify-between text-xs text-white/50">
                  <span>S/ 0</span>
                  <span>S/ {maxPrice.toLocaleString()}+</span>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <div className="text-xs font-extrabold tracking-widest text-white/50">DISPONIBILIDAD</div>
              <div className="mt-3 space-y-2">
                <label className="flex cursor-pointer items-center gap-3 text-sm text-white/70">
                  <input
                    type="checkbox"
                    checked={instantDelivery}
                    onChange={(e) => setInstantDelivery(e.target.checked)}
                    className="h-4 w-4 accent-cyan-300"
                  />
                  <span>Entrega Inmediata</span>
                </label>
                <label className="flex cursor-pointer items-center gap-3 text-sm text-white/70">
                  <input
                    type="checkbox"
                    checked={onlyAvailable}
                    onChange={(e) => setOnlyAvailable(e.target.checked)}
                    className="h-4 w-4 accent-cyan-300"
                  />
                  <span>Solo Disponibles</span>
                </label>
              </div>
            </div>

            <button
              type="button"
              onClick={clearFilters}
              className="mt-6 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-extrabold text-white/80 transition hover:bg-white/10"
            >
              Limpiar Filtros
            </button>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-sm shadow-black/30 backdrop-blur-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-extrabold tracking-widest text-emerald-100">
              PROTOCOL ONLINE
            </div>
            <div className="mt-4 text-lg font-extrabold">¿Necesitas Ayuda?</div>
            <div className="mt-2 text-sm text-white/60">Expertos disponibles para configurar tu Build.</div>
            <button
              type="button"
              className="mt-5 w-full rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-4 py-3 text-sm font-extrabold text-[#05102a] transition hover:brightness-110"
            >
              Hablar con un Pro →
            </button>
          </div>
        </aside>

        <section>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xl font-extrabold tracking-tight">
              Mostrando {loading ? '…' : filtered.length} productos
            </div>
            <div className="flex items-center gap-2 text-sm text-white/60">
              <span>Ordenar por:</span>
              <select
                value={urlSort}
                onChange={(e) => setSort(e.target.value)}
                className="pg-select rounded-xl border border-white/10 bg-[#071026]/70 px-3 py-2 text-sm text-white/80 outline-none"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {loading
              ? Array.from({ length: 9 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="h-[360px] animate-pulse rounded-2xl border border-white/10 bg-white/5"
                  />
                ))
              : pageItems.map((p) => <ProductCard key={p.id} product={p} onAddToCart={onAddToCart} />)}
          </div>

          <div className="mt-10 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className={[
                'inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70 transition',
                page <= 1 ? 'cursor-not-allowed opacity-40' : 'hover:bg-white/10 hover:text-white',
              ].join(' ')}
              aria-label="Anterior"
            >
              <ChevronLeft size={18} />
            </button>

            {Array.from({ length: Math.min(3, totalPages) }).map((_, idx) => {
              const n = idx + 1
              const active = n === page
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPage(n)}
                  className={[
                    'h-10 w-10 rounded-xl border border-white/10 bg-white/5 text-sm font-extrabold transition',
                    active ? 'border-cyan-300/30 text-white shadow-[0_0_0_1px_rgba(34,211,238,0.20)]' : 'text-white/60 hover:bg-white/10',
                  ].join(' ')}
                >
                  {n}
                </button>
              )
            })}

            {totalPages > 3 ? <div className="px-2 text-white/40">…</div> : null}

            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className={[
                'inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70 transition',
                page >= totalPages ? 'cursor-not-allowed opacity-40' : 'hover:bg-white/10 hover:text-white',
              ].join(' ')}
              aria-label="Siguiente"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
