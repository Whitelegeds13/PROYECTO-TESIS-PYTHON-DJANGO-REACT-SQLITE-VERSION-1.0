import { Link } from 'react-router-dom'
import { useMemo } from 'react'

const DEFAULT_CATEGORY_MEDIA_IMAGE = '/media/Gemini_Generated_Image_xf27exf27exf27ex.png'

const CATEGORY_MEDIA_BY_SLUG = {
  almacenamiento: '/media/Almacenamiento NVMe.png',
  chasis: '/media/Chasis de CPU .jpeg',
  'memoria-ram': '/media/Memoria Ram.jpg',
  ensambles: '/media/Ensambles de Computadoras.png',
}

function imgSrc(dataUri) {
  if (!dataUri) return null
  if (dataUri.startsWith('data:')) return dataUri
  if (dataUri.startsWith('/') || dataUri.startsWith('http://') || dataUri.startsWith('https://')) return dataUri
  return `data:image/png;base64,${dataUri}`
}

export default function CategoryCard({ category, variant = 'md' }) {
  const map = {
    xl: 'md:col-span-2 md:row-span-2 min-h-[260px]',
    md: 'min-h-[160px]',
    sm: 'min-h-[140px]',
  }

  const baseImg = imgSrc(category.image_base64)
  const effectiveImg = useMemo(() => {
    // 1. Prefer premium local asset mapped by slug
    if (CATEGORY_MEDIA_BY_SLUG[category.slug]) {
      return CATEGORY_MEDIA_BY_SLUG[category.slug]
    }
    // 2. Use base64 image from DB if present
    if (baseImg) {
      return baseImg
    }
    // 3. Fallback to default premium image
    return DEFAULT_CATEGORY_MEDIA_IMAGE
  }, [category.slug, baseImg])

  return (
    <Link
      to={`/hardware?category=${encodeURIComponent(category.slug)}`}
      className={[
        'group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 shadow-sm shadow-black/30 backdrop-blur-xl transition hover:border-white/20',
        map[variant] || map.md,
      ].join(' ')}
    >
      <div className="absolute inset-0">
        {effectiveImg ? (
          <img
            src={effectiveImg}
            alt={category.name}
            className="h-full w-full object-cover opacity-70 blur-[0.3px] transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-fuchsia-500/20 via-cyan-400/15 to-sky-400/10" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#030a18] via-[#030a18]/40 to-transparent" />
      </div>

      <div className="relative">
        <div className="text-xs font-semibold tracking-widest text-white/60">CATEGORÍA</div>
        <div className="mt-2 text-lg font-extrabold text-white/95">{category.name}</div>
        <div className="mt-1 text-sm text-white/60">{category.subtitle}</div>
        <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-cyan-300/90">
          Ver productos <span className="transition group-hover:translate-x-0.5">→</span>
        </div>
      </div>
    </Link>
  )
}
