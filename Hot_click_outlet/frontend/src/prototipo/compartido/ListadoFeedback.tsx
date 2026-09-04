import type { ReactNode } from 'react'
import { faseListado } from './listadoEstados'
import ListadoSkeleton from './ListadoSkeleton'

type Props = Readonly<{
  cargando: boolean
  error: string | null | undefined
  cantidad: number
  empty: ReactNode
  children: ReactNode
  skeletonVariante?: 'fila' | 'tarjeta'
  skeletonFilas?: number
  skeletonLabel?: string
  className?: string
}>

/**
 * Contrato F5: skeleton → error inline → empty → lista.
 * No muestra empty durante carga; nunca silencia el error.
 */
export default function ListadoFeedback({
  cargando,
  error,
  cantidad,
  empty,
  children,
  skeletonVariante = 'fila',
  skeletonFilas,
  skeletonLabel,
  className,
}: Props) {
  const fase = faseListado({ cargando, error, cantidad })
  if (fase === 'cargando') {
    return (
      <ListadoSkeleton
        variante={skeletonVariante}
        filas={skeletonFilas}
        aria-label={skeletonLabel}
        className={className ?? 'mt-4 space-y-3'}
      />
    )
  }
  if (fase === 'error') {
    return <p className="mt-4 text-sm text-hc-danger" role="alert">{error}</p>
  }
  if (fase === 'vacio') return empty
  return children
}
