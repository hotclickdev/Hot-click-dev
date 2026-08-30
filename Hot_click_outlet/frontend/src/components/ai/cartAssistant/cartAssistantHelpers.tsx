import type { Id } from '@/types/api'

export type ProductoSugerido = {
  id?: Id
  nombre?: string
  sku?: string | null
  precio?: number
  imagenUrl?: string | null
}

export type MensajeAsistenteCarrito = {
  rol: 'user' | 'assistant'
  texto?: string
  typing?: boolean
  productos?: ProductoSugerido[]
}

export const fmt = (n?: number | null) => new Intl.NumberFormat('es-CR').format(n ?? 0)

export function TypingDots() {
  return (
    <span className="inline-flex items-center gap-[3px]">
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          display: 'inline-block', width: 4, height: 4, borderRadius: '50%',
          backgroundColor: 'rgba(255,255,255,0.55)',
          animation: 'hc-dot 1.1s ease-in-out infinite',
          animationDelay: `${i * 0.18}s`,
        }} />
      ))}
    </span>
  )
}
