import type { ReactNode } from 'react'
import TrustGlyph from '@/components/ui/TrustGlyph'
import EstadoVacio from './EstadoVacio'

type Accion = { texto: string; to?: string; onClick?: () => void }

/**
 * Error único (D2-06): ícono, título, texto, una CTA y un enlace.
 * El vacío sigue en `EstadoVacio`; esto no se usa cuando la lista llegó vacía.
 */
export default function EstadoError({
  titulo,
  texto,
  accion,
  enlace,
  nivel = 'h1',
  icono,
}: {
  titulo: string
  texto?: string
  accion?: Accion
  enlace?: Accion
  nivel?: 'h1' | 'h2'
  icono?: ReactNode
}) {
  return (
    <div role="alert" aria-live="assertive">
      <EstadoVacio
        nivel={nivel}
        tono="rojo"
        icono={icono ?? <TrustGlyph tipo="alerta" className="size-8" />}
        titulo={titulo}
        texto={texto}
        accion={accion}
        secundaria={enlace}
      />
    </div>
  )
}
