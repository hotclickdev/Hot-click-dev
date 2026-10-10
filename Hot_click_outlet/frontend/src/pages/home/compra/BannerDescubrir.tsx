import { Link } from 'react-router-dom'
import type { Producto } from '@/types/producto'
import { fotoProducto } from '@/components/comprador/productCardHelpers'

const GIROS = [-24, -8, 8, 24]

/**
 * Banner «Modo descubrir» (propuesta 2, abanico): cuatro cartas con fotos reales del catálogo que se abren y
 * cierran en un ciclo de 5 s. Sin animación con prefers-reduced-motion. Única CTA roja hacia /descubri.
 */
export default function BannerDescubrir({ productos }: { productos: Producto[] }) {
  const fotos = productos.map((p) => fotoProducto(p)).filter((f): f is string => Boolean(f)).slice(0, 4)
  return (
    <section
      aria-labelledby="home-descubrir"
      className="mx-4 flex items-center justify-between gap-4 overflow-hidden rounded-[14px] border border-[#2a3142] bg-gradient-to-br from-[#1c2130] to-[#161a24] px-5 py-5 text-hc-n-0 lg:mx-0 lg:px-6"
    >
      <style>{`
        @keyframes hc-abanico{0%,100%{transform:rotate(calc(var(--giro)*.4))}50%{transform:rotate(var(--giro)) translateY(-4px)}}
        .hc-carta{transform:rotate(var(--giro));animation:hc-abanico 5s ease-in-out infinite}
        @media (prefers-reduced-motion: reduce){.hc-carta{animation:none}}
      `}</style>
      <div className="flex min-w-0 flex-col items-start">
        <p className="text-[11px] font-bold uppercase tracking-[.08em] text-[#ff6b63]">Nuevo · Modo descubrir</p>
        <h2 id="home-descubrir" className="mt-1 font-display text-[19px] font-bold leading-[1.15] lg:text-[22px]">
          Una carta, un producto.<br />Elegí con un gesto.
        </h2>
        <p className="mb-3 mt-1 text-[13px] text-[#c3cad8]">Deslizá y armá tu lista de favoritos.</p>
        <Link
          to="/descubri"
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-[10px] bg-hc-red-500 px-4 font-display text-[14px] font-semibold text-hc-n-0"
        >
          Descubrir productos →
        </Link>
      </div>
      {fotos.length > 0 && (
        <div aria-hidden className="relative hidden h-[140px] w-[190px] shrink-0 sm:block">
          {fotos.map((src, i) => (
            <img
              key={src + i}
              src={src}
              alt=""
              loading="lazy"
              className="hc-carta absolute left-[56px] top-[22px] h-[104px] w-[78px] rounded-[10px] border-2 border-hc-n-0 object-cover shadow-[0_8px_18px_#0008]"
              style={{ ['--giro' as string]: `${GIROS[i]}deg`, transformOrigin: '50% 140%' }}
            />
          ))}
        </div>
      )}
    </section>
  )
}
