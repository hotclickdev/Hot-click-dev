import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import type { Producto } from '@/types/producto'
import { negocioService } from '@/services/negocioService'
import { normalizarListaNegocios } from '@/components/comprador/negocios/negociosPublicos'
import { slidesNegocios, slidesProductos } from './bannerSlides'

const ROTACION_MS = 6000

const negociosDe = (plan?: string) => ({
  queryKey: ['home', 'banner', 'negocios', plan ?? 'todos'],
  queryFn: () => negocioService.buscar({ plan, limite: 8 }).then((r) => normalizarListaNegocios(r.data)),
  staleTime: 60_000,
})

/**
 * Banner rotativo de la home (bajo «Destacados de la semana»): Emprendimientos, Productos y Negocios destacados.
 * Cambia cada 6 s, con puntos, pausa al pasar el mouse o con foco y sin animación con prefers-reduced-motion.
 * Un solo negocio o producto por slide, con su foto y su nombre; el clic lleva solo a su tienda o a su ficha.
 */
export default function BannerDescubrir({ productos }: { productos: Producto[] }) {
  const emprendimientos = useQuery(negociosDe('emprendimientos')).data ?? []
  const negocios = (useQuery(negociosDe()).data ?? []).filter((n) => n.plan !== 'EMPRENDEDOR')
  const slides = [
    ...slidesNegocios('Emprendimientos destacados', 'Ver tienda', emprendimientos, productos),
    ...slidesProductos('Productos destacados', 'Ver producto', productos),
    ...slidesNegocios('Negocios destacados', 'Ver tienda', negocios, productos),
  ]

  const [activo, setActivo] = useState(0)
  const [pausa, setPausa] = useState(false)
  const total = slides.length
  useEffect(() => {
    if (pausa || total < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = window.setInterval(() => setActivo((i) => (i + 1) % total), ROTACION_MS)
    return () => window.clearInterval(id)
  }, [pausa, total])

  if (total === 0) return null
  const slide = slides[activo % total]

  return (
    <section
      aria-roledescription="carrusel"
      aria-label="Destacados"
      onMouseEnter={() => setPausa(true)}
      onMouseLeave={() => setPausa(false)}
      onFocus={() => setPausa(true)}
      onBlur={() => setPausa(false)}
      className="mx-4 overflow-hidden rounded-[14px] border border-[#2a3142] bg-[#1c2130] text-hc-n-0 lg:mx-0"
    >
      <style>{`
        @keyframes hc-entra{from{opacity:0;transform:translateY(6px)}}
        .hc-entra{animation:hc-entra .45s ease}
        @media (prefers-reduced-motion: reduce){.hc-entra{animation:none}}
      `}</style>
      <div className="flex items-center justify-between gap-4 px-5 pt-5 lg:px-6"
      >
        <Link
          key={slide.clave}
          to={slide.to}
          aria-label={`${slide.cta}: ${slide.titulo} (${activo % total + 1} de ${total})`}
          className="hc-entra group flex min-w-0 flex-1 items-center justify-between gap-4 rounded-[12px] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-hc-n-0"
        >
          <span aria-live="polite" className="flex min-w-0 flex-col items-start">
            <span className="text-[11px] font-bold uppercase tracking-[.08em] text-[#ff6b63]">{slide.etiqueta}</span>
            <span className="mt-1 line-clamp-2 font-display text-[18px] font-bold leading-[1.15] lg:text-[20px]">{slide.titulo}</span>
            <span className="mb-3 mt-1 min-h-[18px] truncate text-[13px] text-[#c3cad8]">{slide.detalle}</span>
            <span className="inline-flex min-h-[44px] items-center gap-1.5 rounded-[12px] bg-hc-red-500 px-4 font-display text-[14px] font-semibold text-hc-n-0">
              {slide.cta} →
            </span>
          </span>
          {slide.foto && (
            <img
              src={slide.foto}
              alt=""
              loading="lazy"
              className="size-[96px] shrink-0 rounded-[14px] border border-[#2a3142] bg-[#232938] object-cover sm:size-[120px]"
            />
          )}
        </Link>
      </div>
      {total > 1 ? (
        <div role="tablist" aria-label="Elegir destacado" className="flex gap-1.5 px-5 pb-4 pt-3 lg:px-6">
          {slides.map((s, j) => (
            <button
              key={s.clave}
              type="button"
              role="tab"
              aria-selected={j === activo % total}
              aria-label={`${s.etiqueta}: ${s.titulo}`}
              onClick={() => setActivo(j)}
              className="flex h-6 items-center"
            >
              <span className={`block h-2 rounded-full transition-[width] duration-300 motion-reduce:transition-none ${j === activo % total ? 'w-[22px] bg-hc-red-500' : 'w-2 bg-[#3a4256]'}`} />
            </button>
          ))}
        </div>
      ) : <div className="h-5" />}
    </section>
  )
}
