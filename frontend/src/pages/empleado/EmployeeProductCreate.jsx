import { CloudUpload, Image as ImageIcon, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createEmployeeProduct, getCategories } from '../../api/client.js'

function formatMoneyInput(v) {
  const s = String(v || '').replace(',', '.')
  return s
}

export default function EmployeeProductCreate() {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [categories, setCategories] = useState([])
  const [loadingCats, setLoadingCats] = useState(false)

  const [name, setName] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [brand, setBrand] = useState('')
  const [productType, setProductType] = useState('')
  const [price, setPrice] = useState('')
  const [oldPrice, setOldPrice] = useState('')
  const [discountPercent, setDiscountPercent] = useState('0')
  const [stock, setStock] = useState('0')
  const [status, setStatus] = useState('')
  const [rating, setRating] = useState('0')
  const [reviewsCount, setReviewsCount] = useState('0')
  const [isOffer, setIsOffer] = useState(false)
  const [isFeatured, setIsFeatured] = useState(false)
  const [description, setDescription] = useState('')
  const [specs, setSpecs] = useState('')
  const [file, setFile] = useState(null)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const previewUrl = useMemo(() => {
    if (!file) return ''
    return URL.createObjectURL(file)
  }, [file])

  useEffect(() => {
    async function load() {
      setLoadingCats(true)
      try {
        const data = await getCategories()
        setCategories(Array.isArray(data) ? data : [])
      } catch {
        setCategories([])
      } finally {
        setLoadingCats(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  async function submit() {
    setError('')
    if (!name.trim()) {
      setError('Ingresa el nombre del producto.')
      return
    }
    if (!categoryId) {
      setError('Selecciona una categoría.')
      return
    }

    const fd = new FormData()
    fd.append('name', name.trim())
    fd.append('category', String(categoryId))
    fd.append('brand', brand.trim())
    fd.append('product_type', productType.trim())
    fd.append('price', formatMoneyInput(price) || '0')
    if (oldPrice.trim()) fd.append('old_price', formatMoneyInput(oldPrice))
    if (discountPercent.trim()) fd.append('discount_percent', String(parseInt(discountPercent || '0', 10) || 0))
    fd.append('stock', String(parseInt(stock || '0', 10) || 0))
    if (status) fd.append('status', status)
    if (rating.trim()) fd.append('rating', formatMoneyInput(rating))
    if (reviewsCount.trim()) fd.append('reviews_count', String(parseInt(reviewsCount || '0', 10) || 0))
    fd.append('is_offer', isOffer ? 'true' : 'false')
    fd.append('is_featured', isFeatured ? 'true' : 'false')
    fd.append('description', description)
    fd.append('specs', specs)
    if (file) fd.append('image_file', file)

    setSaving(true)
    try {
      await createEmployeeProduct(fd)
      navigate('/empleado/productos', { replace: true })
    } catch (e) {
      const msg = String(e?.message || '')
      if (msg.toLowerCase().includes('no autorizado') || msg.toLowerCase().includes('forbidden')) {
        setError('No autorizado.')
      } else if (msg.toLowerCase().includes('failed to fetch')) {
        setError('No se pudo conectar con el servidor.')
      } else if (msg.toLowerCase().includes('no such column') || msg.toLowerCase().includes('no existe la columna')) {
        setError('Falta aplicar migraciones en el backend. Ejecuta: python3 backend/manage.py migrate')
      } else {
        setError(msg || 'No se pudo guardar el producto.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-3xl font-extrabold tracking-tight text-white/90">Registrar Nuevo Producto</div>
          <div className="mt-1 text-sm text-white/60">Inventario &nbsp;›&nbsp; Nuevo Registro</div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/empleado/productos')}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-extrabold text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={submit}
            className={[
              'rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-400 px-4 py-2 text-sm font-extrabold text-[#05102a] transition hover:brightness-110',
              saving ? 'cursor-not-allowed opacity-70' : '',
            ].join(' ')}
          >
            Guardar Producto
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{error}</div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-sm shadow-black/30 backdrop-blur-xl">
            <div className="border-b border-white/10 px-6 py-5">
              <div className="text-lg font-extrabold text-white/90">Información General</div>
            </div>
            <div className="grid gap-5 p-6 md:grid-cols-2">
              <div className="md:col-span-2">
                <div className="text-xs font-extrabold tracking-widest text-white/45">NOMBRE DEL PRODUCTO</div>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Teclado Mecánico Razer BlackWidow V4"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/85 outline-none placeholder:text-white/35"
                />
              </div>

              <div>
                <div className="text-xs font-extrabold tracking-widest text-white/45">CATEGORÍA</div>
                <select
                  value={categoryId}
                  onChange={(e) => {
                    setCategoryId(e.target.value)
                  }}
                  className="pg-select mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/85 outline-none"
                >
                  <option value="">{loadingCats ? 'Cargando…' : 'Seleccionar Categoría'}</option>
                  {[
                    { slug: 'tarjetas-graficas', label: 'GPU (Grafica)' },
                    { slug: 'procesadores', label: 'CPUs (Procesadores)' },
                    { slug: 'memoria-ram', label: 'Memoria Ram' },
                    { slug: 'almacenamiento', label: 'Almacenamiento' },
                    { slug: 'teclados', label: 'Teclados' },
                    { slug: 'fuente-de-poder', label: 'Fuente de poder' },
                    { slug: 'audifonos', label: 'Audifonos' },
                    { slug: 'placa', label: 'Placa' },
                  ]
                    .map((opt) => {
                      const found = categories.find((c) => c.slug === opt.slug)
                      return found
                        ? { id: String(found.id), label: opt.label, missing: false }
                        : { id: `missing:${opt.slug}`, label: `${opt.label} (no encontrada)`, missing: true }
                    })
                    .map((opt) => (
                      <option key={opt.id} value={opt.id} disabled={opt.missing}>
                        {opt.label}
                      </option>
                    ))}
                </select>
                {categories.length > 0 &&
                [
                  'tarjetas-graficas',
                  'procesadores',
                  'memoria-ram',
                  'almacenamiento',
                  'teclados',
                  'fuente-de-poder',
                  'audifonos',
                  'placa',
                ].some((slug) => !categories.some((c) => c.slug === slug)) ? (
                  <div className="mt-2 text-xs text-amber-200/80">
                    Faltan categorías en la base de datos. Ejecuta: python3 backend/manage.py seed_store
                  </div>
                ) : null}
              </div>

              <div>
                <div className="text-xs font-extrabold tracking-widest text-white/45">MARCA</div>
                <input
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="Ej. Razer"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/85 outline-none placeholder:text-white/35"
                />
              </div>

              <div>
                <div className="text-xs font-extrabold tracking-widest text-white/45">PRECIO (S/)</div>
                <div className="mt-2 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <span className="text-sm font-extrabold text-white/50">S/</span>
                  <input
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-transparent text-sm text-white/85 outline-none placeholder:text-white/35"
                  />
                </div>
              </div>

              <div>
                <div className="text-xs font-extrabold tracking-widest text-white/45">STOCK INICIAL</div>
                <input
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  placeholder="0"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/85 outline-none placeholder:text-white/35"
                />
              </div>

              <div className="md:col-span-2">
                <div className="text-xs font-extrabold tracking-widest text-white/45">TIPO / LÍNEA</div>
                <input
                  value={productType}
                  onChange={(e) => setProductType(e.target.value)}
                  placeholder="Ej. Periféricos / GPU / CPU"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/85 outline-none placeholder:text-white/35"
                />
              </div>

              <div className="md:col-span-2">
                <div className="text-xs font-extrabold tracking-widest text-white/45">DESCRIPCIÓN DETALLADA</div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe especificaciones técnicas, características clave y contenido de la caja…"
                  className="mt-2 min-h-[120px] w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/85 outline-none placeholder:text-white/35"
                />
              </div>

              <div className="md:col-span-2">
                <div className="text-xs font-extrabold tracking-widest text-white/45">ESPECIFICACIONES</div>
                <textarea
                  value={specs}
                  onChange={(e) => setSpecs(e.target.value)}
                  placeholder="Ej. Switches, conectividad, chipset, compatibilidad, etc…"
                  className="mt-2 min-h-[110px] w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/85 outline-none placeholder:text-white/35"
                />
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-sm shadow-black/30 backdrop-blur-xl">
            <div className="border-b border-white/10 px-6 py-5">
              <div className="text-lg font-extrabold text-white/90">Especificaciones Avanzadas</div>
            </div>
            <div className="grid gap-5 p-6 md:grid-cols-3">
              <div>
                <div className="text-xs font-extrabold tracking-widest text-white/45">PRECIO ANTERIOR (S/)</div>
                <div className="mt-2 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <span className="text-sm font-extrabold text-white/50">S/</span>
                  <input
                    value={oldPrice}
                    onChange={(e) => setOldPrice(e.target.value)}
                    placeholder="(opcional)"
                    className="w-full bg-transparent text-sm text-white/85 outline-none placeholder:text-white/35"
                  />
                </div>
              </div>
              <div>
                <div className="text-xs font-extrabold tracking-widest text-white/45">DESCUENTO (%)</div>
                <input
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/85 outline-none"
                />
              </div>
              <div>
                <div className="text-xs font-extrabold tracking-widest text-white/45">ESTADO</div>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="pg-select mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/85 outline-none"
                >
                  <option value="">Automático por stock</option>
                  <option value="disponible">Disponible</option>
                  <option value="stock_bajo">Stock bajo</option>
                  <option value="agotado">Agotado</option>
                </select>
              </div>

              <div>
                <div className="text-xs font-extrabold tracking-widest text-white/45">RATING</div>
                <input
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/85 outline-none"
                />
              </div>
              <div>
                <div className="text-xs font-extrabold tracking-widest text-white/45">RESEÑAS</div>
                <input
                  value={reviewsCount}
                  onChange={(e) => setReviewsCount(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/85 outline-none"
                />
              </div>
              <div className="flex items-end gap-3">
                <label className="flex w-full items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80">
                  <input
                    type="checkbox"
                    checked={isOffer}
                    onChange={(e) => setIsOffer(e.target.checked)}
                    className="h-4 w-4 accent-fuchsia-400"
                  />
                  Oferta
                </label>
                <label className="flex w-full items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80">
                  <input
                    type="checkbox"
                    checked={isFeatured}
                    onChange={(e) => setIsFeatured(e.target.checked)}
                    className="h-4 w-4 accent-cyan-300"
                  />
                  Destacado
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-sm shadow-black/30 backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
              <div className="text-lg font-extrabold text-white/90">Galería</div>
              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-extrabold text-white/60">
                MAX 5MB
              </div>
            </div>

            <div className="p-6">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="group relative flex w-full flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-white/15 bg-white/5 px-6 py-10 text-center transition hover:bg-white/10"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                  <CloudUpload className="text-cyan-200/80" />
                </div>
                <div className="text-sm font-extrabold text-white/80">Arrastra y suelta tu imagen</div>
                <div className="text-xs text-white/55">o haz clic para explorar archivos</div>
                <div className="mt-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-extrabold text-white/75">
                  Seleccionar Archivo
                </div>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  setFile(f || null)
                }}
              />

              {file ? (
                <div className="mt-5 overflow-hidden rounded-3xl border border-white/10 bg-white/5">
                  <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                    <div className="flex items-center gap-2 text-sm font-bold text-white/80">
                      <ImageIcon size={18} className="text-cyan-200/80" />
                      <span className="truncate">{file.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFile(null)}
                      className="rounded-xl border border-white/10 bg-white/5 p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  {previewUrl ? (
                    <img src={previewUrl} alt="" className="h-48 w-full object-cover" />
                  ) : null}
                </div>
              ) : null}

              <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-white/60">
                Tip Pro: Las imágenes con fondo oscuro y alta resolución tienden a convertir tu catálogo en una vitrina premium.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
