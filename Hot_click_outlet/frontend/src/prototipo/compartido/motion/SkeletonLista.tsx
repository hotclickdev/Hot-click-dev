type Props = Readonly<{
  filas?: number
  className?: string
}>

/**
 * Skeleton de listado seller (loading). Solo placeholders visuales.
 */
export default function SkeletonLista({ filas = 3, className = '' }: Props) {
  const total = Math.max(1, Math.min(filas, 8))
  return (
    <div className={`flex flex-col gap-3 ${className}`.trim()} aria-hidden>
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className="h-16 animate-pulse rounded-xl bg-hc-surface-2"
        />
      ))}
    </div>
  )
}
