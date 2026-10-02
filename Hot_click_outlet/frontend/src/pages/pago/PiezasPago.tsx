import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import MainLayout from '@/layouts/MainLayout'
import IconoFigma from '@/components/comprador/IconoFigma'

/**
 * Marco de las pantallas de pago (Figma `29:1932`, `29:1999`, `29:2036`): barra con el logo centrado en
 * móvil, sin barra inferior. En escritorio no hay frame: se usa el header compacto y una columna centrada.
 */
export function MarcoPago({ children, barra = 'marca' }: { children: ReactNode; barra?: 'marca' | 'propia' }) {
  const contenido = <div className="mx-auto flex w-full max-w-[480px] flex-col lg:py-10">{children}</div>
  if (barra === 'propia') {
    return <MainLayout variante="propia" encabezadoEscritorio="compacto" barraInferior={false}>{contenido}</MainLayout>
  }
  return <MainLayout variante="marca" marcaCentrada encabezadoEscritorio="compacto" barraInferior={false}>{contenido}</MainLayout>
}

type IconoEstadoProps = {
  src: string
  tamano: number
  /** Clases de fondo y de color del glifo. */
  clase: string
  /** Diámetro del círculo. */
  circulo: number
}

/** Círculo tintado con el glifo del estado (check, equis, reloj, bolsa). */
export function IconoEstado({ src, tamano, clase, circulo }: IconoEstadoProps) {
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-full ${clase}`} style={{ width: circulo, height: circulo }}>
      <IconoFigma src={src} size={tamano} />
    </span>
  )
}

/** Botón de acción a página completa: relleno rojo, borde claro o azul (Figma `29:1983`, `29:1985`, `29:1997`). */
export function BotonPago({ variante, compacto = false, children, ...props }: {
  variante: 'primario' | 'secundario' | 'azul'
  /** Botón de 14 px y 13 px de relleno vertical (Figma `45:1684`). */
  compacto?: boolean
  children: ReactNode
} & ({ to: string; onClick?: never; disabled?: never } | { to?: never; onClick: () => void; disabled?: boolean })) {
  const clases = {
    primario: 'bg-hc-red-500 text-hc-n-0',
    secundario: 'border border-hc-n-200 bg-hc-n-0 text-hc-n-900',
    azul: 'bg-hc-blue-600 text-hc-n-0',
  }[variante]
  const base = `flex w-full items-center justify-center gap-2 rounded-[12px] px-4 ${compacto ? 'py-[13px] text-[14px] leading-[normal]' : 'py-[14px] text-[15px] leading-[18px]'} font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${clases}`
  if (props.to !== undefined) return <Link to={props.to} className={base}>{children}</Link>
  return <button type="button" onClick={props.onClick} disabled={props.disabled} className={base}>{children}</button>
}
