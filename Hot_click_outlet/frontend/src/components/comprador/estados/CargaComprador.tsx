import type { ReactNode } from 'react'

type CargaCompradorProps = {
  titulo: string
  texto?: string
  children?: ReactNode
  /** h1 cuando es la pantalla entera; h2 dentro de otra. */
  nivel?: 'h1' | 'h2'
}

/**
 * Espera del comprador (derivado de Figma: círculo de estado de `29:1932` / `45:2198` con un aro azul
 * girando, título en Sora y texto de 14). Sin colores de la paleta vieja.
 */
export default function CargaComprador({ titulo, texto, children, nivel = 'h1' }: CargaCompradorProps) {
  const Titulo = nivel
  return (
    <section role="status" aria-live="polite" className="mx-auto flex w-full max-w-md flex-col items-center gap-3 px-4 py-16 text-center leading-[normal]">
      <span className="flex size-[72px] items-center justify-center rounded-full bg-hc-blue-50">
        <span aria-hidden="true" className="size-9 animate-spin rounded-full border-[3px] border-hc-blue-100 border-t-hc-blue-600" />
      </span>
      <Titulo className="font-display text-[19px] font-bold tracking-normal text-hc-n-900 [text-wrap:balance]">{titulo}</Titulo>
      {texto && <p className="max-w-sm text-[14px] leading-5 text-hc-n-600">{texto}</p>}
      {children && <div className="mt-2 w-full">{children}</div>}
    </section>
  )
}
