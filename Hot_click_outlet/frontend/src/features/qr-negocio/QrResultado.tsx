import type { ReactNode } from 'react'

type Props = Readonly<{
  /** Ruta de un SVG de Figma, o un nodo propio para estados sin frame. */
  icono: string | ReactNode
  /** Fondo del círculo: verde (éxito) o rojo claro (vencido o error). */
  tono: 'exito' | 'alerta'
  titulo: string
  descripcion?: string
  /** Separación superior: 40 en pago, 32 en pedido enviado. */
  compacto?: boolean
  children?: ReactNode
}>

/**
 * Bloque de resultado de las pantallas QR (Figma `29:1899`, `29:1924`, `29:1752`):
 * círculo de 72 con ícono de 34, título Sora 22 y descripción centrada.
 */
export default function QrResultado({ icono, tono, titulo, descripcion, compacto, children }: Props) {
  const fondo = tono === 'exito' ? 'bg-hc-success-bg' : 'bg-hc-red-50'
  return (
    <section
      className={`flex flex-col items-center px-4 ${compacto ? 'gap-2 pb-3 pt-8' : 'gap-[10px] pb-4 pt-10'}`}
    >
      <span
        aria-hidden="true"
        className={`grid size-[72px] place-items-center rounded-full ${fondo}`}
      >
        {typeof icono === 'string' ? <img src={icono} alt="" className="size-[34px]" /> : icono}
      </span>
      <h1 className="text-center font-display text-[22px] font-bold leading-[28px] tracking-normal text-hc-n-900">
        {titulo}
      </h1>
      {descripcion ? (
        <p className="text-center text-[14px] leading-5 text-hc-n-600">{descripcion}</p>
      ) : null}
      {children}
    </section>
  )
}
