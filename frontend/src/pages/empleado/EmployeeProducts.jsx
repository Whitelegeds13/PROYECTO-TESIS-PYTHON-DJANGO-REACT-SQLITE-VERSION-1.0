import { Filter, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getEmployeeProducts } from '../../api/client.js'

function formatMoney(v) {
  const n = Number(v || 0)
  if (Number.isNaN(n)) return 'S/ 0.00'
  return `S/ ${n.toFixed(2)}`
}

function statusBadge(status) {
  const s = String(status || '')
  if (s === 'agotado') return 'bg-rose-400/15 text-rose-200 border-rose-300/20'
  if (s === 'stock_bajo') return 'bg-amber-400/15 text-amber-200 border-amber-300/20'
  return 'bg-emerald-400/15 text-emerald-200 border-emerald-300/20'
}

function statusLabel(status) {
  const s = String(status || '')
  if (s === 'agotado') return 'Agotado'
  if (s === 'stock_bajo') return 'Stock Bajo'
  return 'Disponible'
}

function safeIncludes(hay, needle) {
  return String(hay || '').toLowerCase().includes(String(needle || '').toLowerCase())
}

export default function EmployeeProducts() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [q, setQ] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [stockFilter, setStockFilter] = useState('all')
  const [moreOpen, setMoreOpen] = useState(false)

  const [brandFilter, setBrandFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [minStock, setMinStock] = useState('')
  const [onlyOffers, setOnlyOffers] = useState(false)
  const [onlyFeatured, setOnlyFeatured] = useState(false)
  const [onlyWithImage, setOnlyWithImage] = useState(false)

  const categories = useMemo(() => {
    const map = new Map()
    for (const p of items) {
      if (p?.category?.name) map.set(p.category.name, p.category.name)
    }
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b))
  }, [items])

  const filtered = useMemo(() => {
    const qTrim = q.trim()
    const minP = minPrice ? Number(minPrice) : null
    const maxP = maxPrice ? Number(maxPrice) : null
    const minS = minStock ? Number(minStock) : null

    return items.filter((p) => {
      if (qTrim) {
        const ok =
          safeIncludes(p.name, qTrim) ||
          safeIncludes(p.brand, qTrim) ||
          safeIncludes(p.product_type, qTrim) ||
          safeIncludes(p.category?.name, qTrim)
        if (!ok) return false
      }

      if (categoryFilter !== 'all' && p.category?.name !== categoryFilter) return false

      if (stockFilter !== 'all') {
        if (stockFilter === 'disponible' && p.status !== 'disponible') return false
        if (stockFilter === 'stock_bajo' && p.status !== 'stock_bajo') return false
        if (stockFilter === 'agotado' && p.status !== 'agotado') return false
      }

      if (brandFilter.trim() && !safeIncludes(p.brand, brandFilter.trim())) return false
      if (typeFilter.trim() && !safeIncludes(p.product_type, typeFilter.trim())) return false

      if (minP !== null && !Number.isNaN(minP) && Number(p.price || 0) < minP) return false
      if (maxP !== null && !Number.isNaN(maxP) && Number(p.price || 0) > maxP) return false

      if (minS !== null && !Number.isNaN(minS) && Number(p.stock || 0) < minS) return false

      if (onlyOffers && !p.is_offer) return false
      if (onlyFeatured && !p.is_featured) return false
      if (onlyWithImage && !(p.image_url || p.image_base64)) return false

      return true
    })
  }, [
    items,
    q,
    categoryFilter,
    stockFilter,
    brandFilter,
    typeFilter,
    minPrice,
    maxPrice,
    minStock,
    onlyOffers,
    onlyFeatured,
    onlyWithImage,
  ])

  const count = useMemo(() => filtered.length, [filtered])

  useEffect(() => {
    async function load() {
      setError('')
      setLoading(true)
      try {
        const data = await getEmployeeProducts()
        setItems(Array.isArray(data) ? data : [])
      } catch (e) {
        setError('No se pudo cargar el inventario.')
        setItems([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-3xl font-extrabold tracking-tight text-white/90">Productos</div>
          <div className="mt-1 text-sm text-white/60">Gestiona el inventario de hardware y periféricos.</div>
        </div>

        <div className="flex w-full flex-wrap items-center justify-between gap-3 md:w-auto md:justify-end">
          <div className="flex w-full items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white/80 shadow-sm shadow-black/20 backdrop-blur-xl md:w-[360px]">
            <Search size={18} className="text-white/40" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar en el inventario…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-white/35"
            />
          </div>
          <Link
            to="/empleado/productos/nuevo"
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-extrabold text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            + Nuevo
          </Link>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-sm shadow-black/30 backdrop-blur-xl">
        <div className="border-b border-white/10 px-6 py-5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="pg-select bg-transparent text-sm outline-none"
              >
                <option value="all">Todas las Categorías</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80">
              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value)}
                className="pg-select bg-transparent text-sm outline-none"
              >
                <option value="all">Estado del Stock</option>
                <option value="disponible">Disponible</option>
                <option value="stock_bajo">Stock Bajo</option>
                <option value="agotado">Agotado</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              className="inline-flex items-center gap-2 rounded-2xl border border-fuchsia-300/20 bg-fuchsia-400/10 px-4 py-2 text-sm font-extrabold text-fuchsia-100 transition hover:bg-fuchsia-400/15"
            >
              <Filter size={16} />
              Más filtros
            </button>

            <div className="ml-auto text-sm text-white/60">
              {loading ? 'Cargando…' : `Mostrando ${count} producto${count === 1 ? '' : 's'}`}
            </div>
          </div>
        </div>

        {moreOpen ? (
          <div className="border-b border-white/10 bg-white/5 px-6 py-5">
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <div className="text-xs font-extrabold tracking-widest text-white/45">MARCA</div>
                <input
                  value={brandFilter}
                  onChange={(e) => setBrandFilter(e.target.value)}
                  placeholder="Ej. ASUS"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/85 outline-none placeholder:text-white/35"
                />
              </div>
              <div>
                <div className="text-xs font-extrabold tracking-widest text-white/45">TIPO</div>
                <input
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  placeholder="Ej. GPU / Teclado"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/85 outline-none placeholder:text-white/35"
                />
              </div>
              <div>
                <div className="text-xs font-extrabold tracking-widest text-white/45">PRECIO (MIN)</div>
                <input
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  placeholder="0"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/85 outline-none placeholder:text-white/35"
                />
              </div>
              <div>
                <div className="text-xs font-extrabold tracking-widest text-white/45">PRECIO (MAX)</div>
                <input
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  placeholder="9999"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/85 outline-none placeholder:text-white/35"
                />
              </div>
              <div>
                <div className="text-xs font-extrabold tracking-widest text-white/45">STOCK (MIN)</div>
                <input
                  value={minStock}
                  onChange={(e) => setMinStock(e.target.value)}
                  placeholder="0"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/85 outline-none placeholder:text-white/35"
                />
              </div>
              <div className="flex items-end gap-3 md:col-span-3">
                <label className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80">
                  <input
                    type="checkbox"
                    checked={onlyOffers}
                    onChange={(e) => setOnlyOffers(e.target.checked)}
                    className="h-4 w-4 accent-fuchsia-400"
                  />
                  Solo ofertas
                </label>
                <label className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80">
                  <input
                    type="checkbox"
                    checked={onlyFeatured}
                    onChange={(e) => setOnlyFeatured(e.target.checked)}
                    className="h-4 w-4 accent-cyan-300"
                  />
                  Solo destacados
                </label>
                <label className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80">
                  <input
                    type="checkbox"
                    checked={onlyWithImage}
                    onChange={(e) => setOnlyWithImage(e.target.checked)}
                    className="h-4 w-4 accent-emerald-300"
                  />
                  Con imagen
                </label>

                <button
                  type="button"
                  onClick={() => {
                    setQ('')
                    setCategoryFilter('all')
                    setStockFilter('all')
                    setBrandFilter('')
                    setTypeFilter('')
                    setMinPrice('')
                    setMaxPrice('')
                    setMinStock('')
                    setOnlyOffers(false)
                    setOnlyFeatured(false)
                    setOnlyWithImage(false)
                  }}
                  className="ml-auto rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-extrabold text-white/70 transition hover:bg-white/10 hover:text-white"
                >
                  Limpiar
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <div className="p-6">
          {error ? (
            <div className="mb-4 rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </div>
          ) : null}

          {filtered.length === 0 && !loading ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white/70">
              No hay productos que coincidan con los filtros.
            </div>
          ) : null}

          {filtered.length ? (
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
              <div className="overflow-x-auto">
                <div className="min-w-[860px]">
                  <div className="grid grid-cols-[1.4fr_.7fr_.7fr_.7fr_.4fr_.6fr] gap-4 border-b border-white/10 px-5 py-4 text-xs font-extrabold tracking-widest text-white/45">
                    <div>Producto</div>
                    <div>Categoría</div>
                    <div>Marca</div>
                    <div>Precio (S/)</div>
                    <div>Stock</div>
                    <div>Estado</div>
                  </div>
                  <div>
                    {filtered.slice(0, 156).map((p) => (
                      <div
                        key={p.id}
                        className="grid grid-cols-[1.4fr_.7fr_.7fr_.7fr_.4fr_.6fr] gap-4 border-b border-white/10 px-5 py-4 last:border-b-0"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 overflow-hidden rounded-xl border border-white/10 bg-white/5">
                            {p.image_url ? (
                              <img src={p.image_url} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full w-full bg-gradient-to-br from-fuchsia-500/25 via-cyan-400/10 to-transparent" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-extrabold text-white/90">{p.name}</div>
                            <div className="truncate text-xs text-white/55">{p.product_type || '—'}</div>
                          </div>
                        </div>
                        <div className="self-center text-sm text-white/70">{p.category?.name || '—'}</div>
                        <div className="self-center text-sm text-white/70">{p.brand || '—'}</div>
                        <div className="self-center text-sm font-bold text-cyan-200/90">{formatMoney(p.price)}</div>
                        <div className="self-center text-sm text-white/70">{p.stock ?? 0}</div>
                        <div className="self-center">
                          <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-extrabold ${statusBadge(p.status)}`}>
                            {statusLabel(p.status)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="px-5 py-4 text-sm text-white/55">
                Mostrando 1 a {Math.min(filtered.length, 156)} de {filtered.length} productos
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
