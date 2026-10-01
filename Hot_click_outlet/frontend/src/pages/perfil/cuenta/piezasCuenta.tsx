import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

/** Círculo azul con las iniciales (Figma `28:1199` 48 px, `30:1502` 40 px, `30:1491` 32 px). */
export function Avatar({ texto, tam = 48 }: { texto: string; tam?: 48 | 40 | 32 }) {
  const tipografia = tam === 48 ? 'text-[16px]' : 'text-[12px]'
  return (
    <span
      aria-hidden="true"
      style={{ width: tam, height: tam }}
      className={`flex shrink-0 items-center justify-center rounded-full bg-hc-blue-600 font-display font-bold leading-[normal] text-hc-n-0 ${tipografia}`}
    >
      {texto}
    </span>
  )
}

/** Foto de producto con esquinas de 10 px; sin foto queda un recuadro neutro (no se inventa imagen). */
export function Miniatura({ src, tam, alt = '' }: { src?: string | null; tam: number; alt?: string }) {
  const caja = { width: tam, height: tam }
  if (!src) return <span aria-hidden="true" style={caja} className="shrink-0 rounded-[10px] bg-hc-n-100" />
  return <img src={src} alt={alt} style={caja} className="shrink-0 rounded-[10px] object-cover" loading="lazy" />
}

type TarjetaAccesoProps = {
  to: string
  icono: ReactNode
  titulo: string
  detalle: string
  /** Escritorio (Figma `30:1553`): relleno 16 y título de 15; móvil (`28:1219`): relleno 14 y título de 14. */
  escritorio?: boolean
}

/** Tarjeta de acceso del resumen: ícono azul, título y conteo. */
export function TarjetaAcceso({ to, icono, titulo, detalle, escritorio = false }: TarjetaAccesoProps) {
  return (
    <Link
      to={to}
      className={`flex min-w-0 flex-col items-start gap-[6px] rounded-[14px] border border-hc-n-200 bg-hc-n-0 leading-[normal] hover:border-hc-blue-100 ${escritorio ? 'p-4' : 'p-[14px]'}`}
    >
      <span className="text-hc-blue-600">{icono}</span>
      <span className={`font-semibold text-hc-n-900 ${escritorio ? 'text-[15px]' : 'text-[14px]'}`}>{titulo}</span>
      <span className="text-[12px] text-hc-n-500">{detalle}</span>
    </Link>
  )
}
