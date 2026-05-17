import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCategories, getProducts } from '../api/client.js'
import CategoryCard from '../components/CategoryCard.jsx'
import ProductCard from '../components/ProductCard.jsx'

function imgSrc(dataUri) {
  if (!dataUri) return null
  if (dataUri.startsWith('data:')) return dataUri
  return `data:image/png;base64,${dataUri}`
}

export default function Home({ onAddToCart }) {
  const navigate = useNavigate()
  const offersRef = useRef(null)

  const [categories, setCategories] = useState([])
  const [offers, setOffers] = useState([])
  const [loading, setLoading] = useState(true)

  const heroImg = useMemo(() => {
    const p = offers?.[0]
    if (p?.image_base64) return p.image_base64
    const c = categories?.[0]
    return c?.image_base64 || null
  }, [offers, categories])

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setLoading(true)
        const [cats, prods] = await Promise.all([
          getCategories().catch(() => []),
          getProducts({ sort: 'offers' }).catch(() => []),
        ])
        if (!mounted) return
        setCategories(Array.isArray(cats) ? cats : [])
        setOffers(Array.isArray(prods) ? prods : [])
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [])

  function scrollOffers(dir) {
    if (!offersRef.current) return
    offersRef.current.scrollBy({ left: dir * 520, behavior: 'smooth' })
  }

  const featured = useMemo(() => categories.filter((c) => c.is_featured), [categories])

  return (
    <div className="mx-auto max-w-6xl px-4">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-sm shadow-black/30 backdrop-blur-xl">
        <div className="absolute inset-0">
          {imgSrc(heroImg) ? (
            <img
              src={imgSrc(heroImg)}
              alt="Hero"
              className="h-full w-full object-cover opacity-40 blur-[1px]"
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-r from-[#030a18] via-[#030a18]/70 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#030a18] via-transparent to-transparent" />
        </div>

        <div className="relative grid gap-10 px-6 py-14 md:grid-cols-2 md:px-10">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[11px] font-extrabold tracking-widest text-cyan-100">
              NUEVA GENERACIÓN · PROTOCOLO NEÓN
            </div>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
              Domina el Futuro del Gaming
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/65 md:text-base">
              Equipamiento de élite para los que exigen rendimiento sin compromisos. Descubre nuestra
              nueva colección de hardware con arquitectura de vanguardia.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => navigate('/hardware')}
                className="rounded-xl bg-gradient-to-r from-fuchsia-500 to-cyan-400 px-5 py-3 text-sm font-extrabold text-[#05102a] shadow-sm shadow-cyan-500/20 transition hover:brightness-110"
              >
                Explorar Hardware
              </button>
              <button
                type="button"
                onClick={() => navigate('/hardware?category=ensambles')}
                className="rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-extrabold text-white/85 transition hover:bg-white/10"
              >
                Configurar Ensamble
              </button>
            </div>
          </div>

          <div className="hidden md:block">
            <div className="h-full rounded-2xl border border-white/10 bg-gradient-to-br from-fuchsia-500/10 via-cyan-400/10 to-sky-400/10 p-6">
              <div className="flex items-center justify-between">
                <div className="text-xs font-extrabold tracking-widest text-white/60">PROTOCOLO</div>
                <div className="h-2 w-2 rounded-full bg-fuchsia-400 shadow-[0_0_16px_rgba(168,85,247,0.7)]" />
              </div>
              <div className="mt-4 text-sm text-white/60">
                Setup oscuro, bordes glass, acentos neón y catálogo desde SQLite.
              </div>
              <div className="mt-6 grid gap-3">
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
                  Ofertas del Protocolo
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
                  Categorías Destacadas
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
                  Mis Pedidos y tracking
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-12">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight">Categorías Destacadas</h2>
            <div className="mt-1 text-sm text-white/55">Todo lo que necesitas para tu setup ideal.</div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/hardware')}
            className="text-sm font-semibold text-cyan-300/90 hover:text-cyan-200"
          >
            Ver todas las categorías →
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4 md:grid-rows-2">
          {(loading ? Array.from({ length: 4 }) : featured.slice(0, 4)).map((c, idx) =>
            loading ? (
              <div
                key={idx}
                className={[
                  'animate-pulse rounded-2xl border border-white/10 bg-white/5',
                  idx === 0 ? 'md:col-span-2 md:row-span-2 min-h-[260px]' : 'min-h-[140px]',
                ].join(' ')}
              />
            ) : (
              <CategoryCard
                key={c.id}
                category={c}
                variant={idx === 0 ? 'xl' : c.layout_type || 'sm'}
              />
            ),
          )}
        </div>
      </section>

      <section className="mt-14">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight">Ofertas del Protocolo</h2>
            <div className="mt-1 text-sm text-white/55">Descuentos exclusivos para builds seleccionados.</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => scrollOffers(-1)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white"
              aria-label="Anterior"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => scrollOffers(1)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white"
              aria-label="Siguiente"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div
          ref={offersRef}
          className="mt-6 flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {(loading ? Array.from({ length: 4 }) : offers.slice(0, 8)).map((p, idx) =>
            loading ? (
              <div
                key={idx}
                className="h-[360px] w-[260px] shrink-0 animate-pulse rounded-2xl border border-white/10 bg-white/5"
              />
            ) : (
              <div key={p.id} className="w-[260px] shrink-0">
                <ProductCard product={p} onAddToCart={onAddToCart} />
              </div>
            ),
          )}
        </div>
      </section>

      <section className="mt-16 overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-sm shadow-black/30 backdrop-blur-xl">
        <div className="grid gap-8 px-6 py-10 md:grid-cols-2 md:items-center md:px-10">
          <div>
            <h3 className="text-2xl font-extrabold tracking-tight">Únete al Protocolo Gamer</h3>
            <div className="mt-2 text-sm text-white/60">
              Recibe las últimas noticias de hardware, ofertas exclusivas y guías de optimización directamente
              en tu terminal.
            </div>
          </div>
          <form className="flex flex-col gap-3 sm:flex-row">
            <input
              placeholder="tu@email.com"
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/85 outline-none placeholder:text-white/35 focus:border-cyan-300/30"
            />
            <button
              type="button"
              className="rounded-xl bg-gradient-to-r from-fuchsia-500 to-cyan-400 px-6 py-3 text-sm font-extrabold text-[#05102a] transition hover:brightness-110"
            >
              Suscribirse Ahora
            </button>
          </form>
        </div>
      </section>
    </div>
  )
}

