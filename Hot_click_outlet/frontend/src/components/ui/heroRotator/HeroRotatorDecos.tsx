import { motion } from 'framer-motion'
import { vs, ocultarImagenSiError } from './heroRotatorHelpers'
import TrustGlyph from '@/components/ui/TrustGlyph'
import type { Producto } from '@/types/producto'
import type { Convenio } from './heroRotatorData'

export type ChatDecosProps = {
  productos?: Producto[]
}

export type ProductDecosProps = {
  productos?: Producto[]
}

export type BusinessDecosProps = {
  convenios?: Convenio[]
  accent: string
}

type ChatBlob = {
  side: 'left' | 'right'
  top: string
  left?: string
  right?: string
  size: number
  radius: string
  color: string
  img: string | null | undefined
  delay: number
}

type ProductCardDeco = {
  top: string
  left?: string
  right?: string
  rotate: number
  delay: number
  idx: number
}

type BusinessCircleDeco = {
  top: string
  left?: string
  right?: string
  size: number
  color: string
  delay: number
  logo?: string | null
  nombre?: string
}

export function ChatDecos({ productos }: ChatDecosProps) {
  const p0 = productos?.[0]?.imagenUrl
  const p1 = productos?.[1]?.imagenUrl
  const p2 = productos?.[2]?.imagenUrl

  const A = 'var(--hc-accent, #7b5ea7)'
  const blobs: ChatBlob[] = [
    { side: 'left',  top: '8%',  left: '0',    size: 105, radius: '60% 40% 55% 45% / 50% 65% 35% 50%', color: `color-mix(in srgb, ${A} 18%, var(--hc-bg))`, img: null, delay: 0.1 },
    { side: 'left',  top: '35%', left: '0',    size: 145, radius: '40% 60% 45% 55% / 55% 45% 65% 35%', color: `color-mix(in srgb, ${A} 28%, var(--hc-bg))`, img: p0,   delay: 0.22 },
    { side: 'right', top: '15%', right: '0',   size: 148, radius: '55% 45% 35% 65% / 45% 55% 45% 55%', color: `color-mix(in srgb, ${A} 22%, var(--hc-surface))`, img: p1, delay: 0.18 },
    { side: 'right', top: '58%', right: '0',   size: 88,  radius: '45% 55% 60% 40% / 60% 40% 60% 40%', color: `color-mix(in srgb, ${A} 14%, var(--hc-bg))`, img: null, delay: 0.32 },
    { side: 'left',  top: '68%', left: '0',    size: 72,  radius: '50% 50% 40% 60% / 40% 60% 50% 50%', color: `color-mix(in srgb, ${A} 10%, var(--hc-surface))`, img: null, delay: 0.4 },
    { side: 'right', top: '72%', right: '0',   size: 110, radius: '35% 65% 50% 50% / 55% 45% 55% 45%', color: `color-mix(in srgb, ${A} 32%, var(--hc-bg))`, img: p2, delay: 0.28 },
  ]

  return (
    <>
      {blobs.map((b, i) => {
        const pos = b.side === 'left' ? { top: b.top, left: b.left } : { top: b.top, right: b.right }
        const sz = vs(b.size)
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.5, x: b.side === 'left' ? -24 : 24 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ delay: b.delay, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="absolute overflow-hidden select-none pointer-events-none"
            style={{ width: sz, height: sz, borderRadius: b.radius, background: b.color, ...pos }}
          >
            {b.img && (
              <>
                <img src={b.img} alt="" className="w-full h-full object-cover"
                  style={{ filter: 'saturate(0.85) brightness(1.05)' }}
                  onError={ocultarImagenSiError} />
                <div className="absolute inset-0 mix-blend-multiply opacity-25"
                  style={{ background: b.color }} />
              </>
            )}
          </motion.div>
        )
      })}
    </>
  )
}

export function ProductDecos({ productos }: ProductDecosProps) {
  const cards: ProductCardDeco[] = [
    { top: '8%',  left: '1%',  rotate: -12, delay: 0.1,  idx: 3 },
    { top: '48%', left: '3%',  rotate:   9, delay: 0.2,  idx: 4 },
    { top: '8%',  right: '1%', rotate:  13, delay: 0.15, idx: 5 },
    { top: '48%', right: '3%', rotate: -10, delay: 0.25, idx: 6 },
  ]

  return (
    <>
      {cards.map((c, i) => {
        const img = productos?.[c.idx]?.imagenUrl ?? productos?.[i % (productos?.length || 1)]?.imagenUrl
        const pos = c.left === undefined ? { top: c.top, right: c.right } : { top: c.top, left: c.left }
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.6, rotate: 0 }}
            animate={{ opacity: 1, scale: 1, rotate: c.rotate }}
            transition={{ delay: c.delay, duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
            className="absolute select-none pointer-events-none overflow-hidden"
            style={{
              width: vs(96), height: vs(112),
              borderRadius: '10px',
              background: 'var(--hc-surface)',
              border: '3px solid var(--hc-surface)',
              boxShadow: '0 6px 20px rgba(0,0,0,0.12)',
              ...pos,
            }}
          >
            {img ? (
              <img src={img} alt="" className="w-full h-4/5 object-cover"
                onError={ocultarImagenSiError} />
            ) : (
              <div className="w-full h-4/5 flex items-center justify-center opacity-30"
                style={{ background: 'color-mix(in srgb, var(--hc-accent) 10%, transparent)', color: 'var(--hc-muted)' }}>
                <TrustGlyph tipo="paquete" className="w-8 h-8" />
              </div>
            )}
            <div className="absolute bottom-0 inset-x-0 h-1/5 flex items-center justify-center"
              style={{ background: 'var(--hc-surface)' }}>
              <div className="w-6 h-1 rounded-full opacity-30" style={{ background: 'var(--hc-accent)' }} />
            </div>
          </motion.div>
        )
      })}
    </>
  )
}

export function BusinessDecos({ convenios, accent }: BusinessDecosProps) {
  const circles: BusinessCircleDeco[] = [
    { top: '6%',  left: '1%',  size: 95,  color: `color-mix(in srgb, ${accent} 12%, var(--hc-bg))`, delay: 0.1 },
    { top: '42%', left: '2%',  size: 150, color: `color-mix(in srgb, ${accent} 18%, var(--hc-surface))`, delay: 0.2, logo: convenios?.[0]?.logoUrl, nombre: convenios?.[0]?.nombre },
    { top: '8%',  right: '2%', size: 150, color: `color-mix(in srgb, ${accent} 20%, var(--hc-surface))`, delay: 0.15, logo: convenios?.[1]?.logoUrl, nombre: convenios?.[1]?.nombre },
    { top: '55%', right: '1%', size: 80,  color: `color-mix(in srgb, ${accent} 10%, var(--hc-bg))`, delay: 0.3 },
  ]

  return (
    <>
      {circles.map((c, i) => {
        const pos = c.left === undefined ? { top: c.top, right: c.right } : { top: c.top, left: c.left }
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: c.delay, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="absolute flex select-none pointer-events-none items-center justify-center overflow-hidden"
            style={{ width: vs(c.size), height: vs(c.size), borderRadius: '50%', background: c.color, ...pos }}
          >
            {c.logo && (
              <img src={c.logo} alt={c.nombre}
                className="w-3/5 h-3/5 object-contain"
                onError={ocultarImagenSiError} />
            )}
            {!c.logo && c.nombre && (
              <span className="text-2xl font-black" style={{ color: accent, opacity: 0.5 }}>
                {c.nombre[0].toUpperCase()}
              </span>
            )}
          </motion.div>
        )
      })}
    </>
  )
}
