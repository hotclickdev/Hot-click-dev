import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import type { Producto } from '@/types/producto'
import { negocioService, type NegocioPublico } from '@/services/negocioService'
import { normalizarListaNegocios } from '@/components/comprador/negocios/negociosPublicos'
import { fotoProducto } from '@/components/comprador/productCardHelpers'

const GIROS = [-24, -8, 8, 24]
const ROTACION_MS = 6000

type Destacado = { producto?: string; negocio?: string; categoria?: string }
type Modo = { etiqueta: string; cta: string; to: string; fotos: string[]; destacado: Destacado }

const negociosDe = (plan?: string) => ({
  queryKey: ['home', 'banner', 'negocios', plan ?? 'todos'],
  queryFn: () => negocioService.buscar({ plan, limite: 8 }).then((r) => normalizarListaNegocios(r.data)),
  staleTime: 60_000,
})

/** Modo de negocio: fotos de productos reales de esos negocios (o su logo) y el primero como destacado. */
function modoNegocios(etiqueta: string, cta: string, to: string, negocios: NegocioPublico[], productos: Producto[]): Modo | null {
  if (negocios.length === 0) return null
  const fotos: string[] = []
  let destacado: Destacado | null = null
  for (const n of negocios) {
    const prod = productos.find((p) => p.empresaSlug === n.slug && fotoProducto(p))
    const foto = (prod && fotoProducto(prod)) || n.logoUrl
    if (foto && fotos.length < 4) fotos.push(foto)
    if (!destacado) destacado = { producto: prod?.nombre, negocio: n.nombre, categoria: n.categoria || prod?.categoriaNombre }
  }
  return { etiqueta, cta, to, fotos, destacado: destacado ?? {} }
}

/**
 * Banner rotativo de la home (bajo «Destacados de la semana»): Emprendimientos, Productos y Negocios destacados.
 * Cambia cada 6 s, con puntos, pausa al pasar el mouse o con foco y sin animación con prefers-reduced-motion.
 * Derecha: abanico de cartas con fotos reales; izquierda: producto, negocio y categoría del destacado.
 */
export default function BannerDescubrir({ productos }: { productos: Producto[] }) {
  const emprendimientos = useQuery(negociosDe('emprendimientos')).data ?? []
  const negocios = (useQuery(negociosDe()).data ?? []).filter((n) => n.plan !== 'EMPRENDEDOR')
  const conFoto = productos.filter((p) => fotoProducto(p))
  const primero = conFoto[0]
  const modos = [
    modoNegocios('Emprendimientos destacados', 'Ver emprendimientos', '/negocios?plan=emprendimientos', emprendimientos, productos),
    conFoto.length > 0 ? {
      etiqueta: 'Productos destacados', cta: 'Descubrir productos', to: '/descubri',
      fotos: conFoto.slice(0, 4).map((p) => fotoProducto(p) as string),
      destacado: { producto: primero?.nombre, negocio: primero?.empresaNombre ?? primero?.bodegaNombre, categoria: primero?.categoriaNombre },
    } : null,
    modoNegocios('Negocios destacados', 'Ver negocios', '/negocios', negocios, productos),
  ].filter((m): m is Modo => m !== null)

  const [activo, setActivo] = useState(0)
  const [pausa, setPausa] = useState(false)
  const total = modos.length
  useEffect(() => {
    if (pausa || total < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = window.setInterval(() => setActivo((i) => (i + 1) % total), ROTACION_MS)
    return () => window.clearInterval(id)
  }, [pausa, total])

  if (total === 0) return null
  const modo = modos[activo % total]
  const { producto, negocio, categoria } = modo.destacado

  return (
    <section
      aria-roledescription="carrusel"
      aria-label="Destacados"
      onMouseEnter={() => setPausa(true)}
      onMouseLeave={() => setPausa(false)}
      onFocus={() => setPausa(true)}
      onBlur={() => setPausa(false)}
      className="mx-4 flex items-center justify-between gap-4 overflow-hidden rounded-[14px] border border-[#2a3142] bg-gradient-to-br from-[#1c2130] to-[#161a24] px-5 py-5 text-hc-n-0 lg:mx-0 lg:px-6"
    >
      <style>{`
        @keyframes hc-abanico{0%,100%{transform:rotate(calc(var(--giro)*.4))}50%{transform:rotate(var(--giro)) translateY(-4px)}}
        @keyframes hc-entra{from{opacity:0;transform:translateY(6px)}}
        .hc-carta{transform:rotate(calc(var(--giro)*.4));animation:hc-abanico 5s ease-in-out infinite}
        .hc-entra{animation:hc-entra .45s ease}
        @media (prefers-reduced-motion: reduce){.hc-carta,.hc-entra{animation:none}}
      `}</style>
      <div className="flex min-w-0 flex-col items-start">
        <div key={activo} aria-live="polite" className="hc-entra flex min-w-0 flex-col items-start">
          <p className="text-[11px] font-bold uppercase tracking-[.08em] text-[#ff6b63]">{modo.etiqueta}</p>
          {producto && <h2 className="mt-1 line-clamp-2 font-display text-[18px] font-bold leading-[1.15] lg:text-[20px]">{producto}</h2>}
          <p className="mb-3 mt-1 truncate text-[13px] text-[#c3cad8]">
            {[negocio, categoria].filter(Boolean).join(' · ')}
          </p>
          <Link
            to={modo.to}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-[10px] bg-hc-red-500 px-4 font-display text-[14px] font-semibold text-hc-n-0"
          >
            {modo.cta} →
          </Link>
        </div>
        {total > 1 && (
          <div role="tablist" aria-label="Elegir destacado" className="mt-3 flex gap-1.5">
            {modos.map((m, j) => (
              <button
                key={m.etiqueta}
                type="button"
                role="tab"
                aria-selected={j === activo % total}
                aria-label={m.etiqueta}
                onClick={() => setActivo(j)}
                className="flex h-6 items-center"
              >
                <span className={`block h-2 rounded-full transition-[width] duration-300 motion-reduce:transition-none ${j === activo % total ? 'w-[22px] bg-hc-red-500' : 'w-2 bg-[#3a4256]'}`} />
              </button>
            ))}
          </div>
        )}
      </div>
      {modo.fotos.length > 0 && (
        <div key={`f${activo}`} aria-hidden className="relative hidden h-[140px] w-[190px] shrink-0 sm:block">
          {modo.fotos.map((src, i) => (
            <img
              key={src + i}
              src={src}
              alt=""
              loading="lazy"
              className="hc-carta absolute left-[56px] top-[22px] h-[104px] w-[78px] rounded-[10px] border-2 border-hc-n-0 bg-[#232938] object-cover shadow-[0_8px_18px_#0008]"
              style={{ ['--giro' as string]: `${GIROS[i]}deg`, transformOrigin: '50% 140%' }}
            />
          ))}
        </div>
      )}
    </section>
  )
}
