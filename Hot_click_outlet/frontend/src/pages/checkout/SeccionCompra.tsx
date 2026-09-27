import type { ReactNode } from 'react'
import type { PasoCompra } from './validacionCompra'

type SeccionCompraProps = {
  numero: PasoCompra
  titulo: string
  subtitulo?: ReactNode
  /** En móvil solo se ve la sección del paso actual; en desktop se ven las tres. */
  visibleEnMovil: boolean
  className?: string
  children: ReactNode
}

/** Sección del checkout: en desktop es la tarjeta numerada de `30:2385`; en móvil, el contenido del paso. */
export default function SeccionCompra({ numero, titulo, subtitulo, visibleEnMovil, className = '', children }: SeccionCompraProps) {
  return (
    <section
      aria-labelledby={`seccion-compra-${numero}`}
      className={`flex flex-col px-[16px] lg:gap-[14px] lg:rounded-[16px] lg:border lg:border-hc-n-200 lg:bg-hc-n-0 lg:p-[20px] ${visibleEnMovil ? '' : 'max-lg:hidden'} ${className}`}
    >
      <div className="hidden items-center gap-[12px] lg:flex">
        <span className="flex size-[28px] shrink-0 items-center justify-center rounded-full bg-hc-blue-600 text-[13px] font-bold text-hc-n-0">
          {numero}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-px">
          <h2 id={`seccion-compra-${numero}`} className="font-display text-[17px] font-semibold text-hc-n-900">{titulo}</h2>
          {subtitulo ? <p className="text-[13px] text-hc-n-500">{subtitulo}</p> : null}
        </div>
      </div>
      {children}
    </section>
  )
}
