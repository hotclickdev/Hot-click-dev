import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import IconoFigma from '@/components/comprador/IconoFigma'
import { ICONOS_CHECKOUT } from '@/pages/checkout/iconosCheckout'
import TiendaPlaceholder from './TiendaPlaceholder'

/**
 * Piezas visuales de la tienda pública, derivadas de Figma (`28:839`, `28:989`, `28:1083`, `29:1932`) y del
 * manual de marca (docs/figma-migration/MANUAL_MARCA_FIGMA): tarjetas claras de 14, botones de 12, Sora en
 * títulos y precios. El rojo es `--t-primary` (por defecto #E73B33): el color de marca del negocio no cambia.
 */
export const CLASE_TARJETA = 'rounded-[14px] border border-hc-n-200 bg-hc-n-0'

export const CLASE_RADIO_TIENDA = 'size-5 shrink-0 appearance-none rounded-full border-[1.5px] border-hc-n-400 bg-hc-n-0 checked:border-[6px] checked:border-hc-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hc-blue-600'

const BOTON = 'flex w-full items-center justify-center gap-2 rounded-[12px] px-4 py-[14px] text-[15px] font-semibold leading-[18px] disabled:cursor-not-allowed disabled:opacity-50'
const VARIANTE = {
  primario: 'bg-[var(--t-primary)] text-hc-n-0 hover:opacity-90',
  secundario: 'border border-hc-n-200 bg-hc-n-0 text-hc-n-900 hover:bg-hc-n-50',
  exito: 'bg-hc-success text-hc-n-0',
} as const

type BotonTiendaProps = {
  variante: keyof typeof VARIANTE
  children: ReactNode
} & (
  | { to: string; href?: never; onClick?: never; type?: never; disabled?: never }
  | { href: string; to?: never; onClick?: never; type?: never; disabled?: never }
  | { to?: never; href?: never; onClick?: () => void; type?: 'button' | 'submit'; disabled?: boolean }
)

/** Botón de página completa: relleno rojo, borde claro o verde de "agregado" (Figma `29:1983`, `28:977`). */
export function BotonTienda({ variante, children, ...props }: BotonTiendaProps) {
  const clase = `${BOTON} ${VARIANTE[variante]}`
  if (props.to !== undefined) return <Link to={props.to} className={clase}>{children}</Link>
  if (props.href !== undefined) {
    return <a href={props.href} target="_blank" rel="noopener noreferrer" className={clase}>{children}</a>
  }
  return <button type={props.type ?? 'button'} onClick={props.onClick} disabled={props.disabled} className={clase}>{children}</button>
}

/** Foto cuadrada de 10 de radio con la silueta del Figma cuando no hay imagen. */
export function FotoTienda({ src, tamano }: { src?: string | null; tamano: string }) {
  return (
    <div className={`flex shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-hc-n-100 ${tamano}`}>
      {src ? <img src={src} alt="" className="size-full object-cover" /> : <TiendaPlaceholder className="size-1/2" />}
    </div>
  )
}

/** Selector de cantidad con los glifos de 14 px del carrito (Figma `37:1528`). */
export function CantidadTienda({ cantidad, max, etiquetaMenos, etiquetaMas, onCambiar }: {
  cantidad: number
  max?: number
  etiquetaMenos: string
  etiquetaMas: string
  onCambiar: (cantidad: number) => void
}) {
  const boton = 'relative flex size-[14px] items-center justify-center text-hc-n-600 after:absolute after:-inset-2 disabled:opacity-30'
  return (
    <div className="flex shrink-0 items-center gap-[10px] rounded-[8px] border border-hc-n-200 px-2 py-1 leading-[normal]">
      <button type="button" aria-label={etiquetaMenos} className={boton} onClick={() => onCambiar(cantidad - 1)}>
        <IconoFigma src={ICONOS_CHECKOUT.cantidadMenos} size={14} />
      </button>
      <span aria-live="polite" className="min-w-[8px] text-center text-[13px] font-semibold text-hc-n-900">{cantidad}</span>
      <button type="button" aria-label={etiquetaMas} className={boton} disabled={max !== undefined && cantidad >= max} onClick={() => onCambiar(cantidad + 1)}>
        <IconoFigma src={ICONOS_CHECKOUT.cantidadMas} size={14} />
      </button>
    </div>
  )
}

/** Título de pantalla en Sora (Figma `28:990`). */
export function TituloTienda({ children }: { children: ReactNode }) {
  return <h1 className="font-display text-[22px] font-bold leading-[28px] tracking-normal text-hc-n-900 lg:text-[28px] lg:leading-[34px]">{children}</h1>
}

/** Encabezado gris de una tarjeta de resumen (Figma `29:1932`, "Tu pedido"). */
export function CabeceraTarjeta({ children }: { children: ReactNode }) {
  return <h2 className="bg-hc-n-50 px-[14px] py-3 font-display text-[15px] font-bold leading-[normal] tracking-normal text-hc-n-900">{children}</h2>
}
