const FILAS_DEFAULT = 4

type Variante = 'fila' | 'tarjeta'

type Props = Readonly<{
  /** Cantidad de placeholders. Default 4. */
  filas?: number
  /** `fila` = avatar + textos; `tarjeta` = card con borde (pedidos/sucursales). */
  variante?: Variante
  className?: string
  'aria-label'?: string
}>

/**
 * Skeleton shimmer (`hc-skeleton`) para listados seller Capa C.
 */
export default function ListadoSkeleton({
  filas = FILAS_DEFAULT,
  variante = 'fila',
  className = 'mt-4 space-y-3',
  'aria-label': ariaLabel = 'Cargando listado',
}: Props) {
  const items = Array.from({ length: filas }, (_, i) => i)
  return (
    <div className={className} role="status" aria-busy="true" aria-label={ariaLabel}>
      {items.map((i) => (
        <FilaSkeleton key={i} variante={variante} />
      ))}
    </div>
  )
}

function FilaSkeleton({ variante }: { variante: Variante }) {
  if (variante === 'tarjeta') {
    return (
      <div className="rounded-xl border border-hc-border bg-hc-surface p-3.5">
        <div className="flex items-center justify-between gap-3">
          <Barra ancho="w-28" alto="h-3.5" />
          <Barra ancho="w-16" alto="h-5" redonda />
        </div>
        <Barra ancho="w-40" alto="h-3" className="mt-3" />
        <Barra ancho="w-24" alto="h-3.5" className="mt-2" />
      </div>
    )
  }
  return (
    <div className="flex items-center gap-3">
      <div className="hc-skeleton size-11 shrink-0 rounded-full bg-hc-surface-2" />
      <div className="min-w-0 flex-1 space-y-2">
        <Barra ancho="w-2/3" alto="h-3.5" />
        <Barra ancho="w-1/3" alto="h-3" />
      </div>
    </div>
  )
}

function Barra({
  ancho,
  alto,
  className = '',
  redonda = false,
}: {
  ancho: string
  alto: string
  className?: string
  redonda?: boolean
}) {
  const radio = redonda ? 'rounded-full' : 'rounded'
  return <div className={`hc-skeleton ${alto} ${ancho} ${radio} bg-hc-surface-2 ${className}`} />
}
