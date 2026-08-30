type Props = {
  src?: string
  alt: string
  size?: 'sm' | 'md' | 'lg'
}

const TAMANOS = {
  sm: 'size-12',
  md: 'size-14',
  lg: 'h-[100px] w-full',
}

/**
 * Miniatura de producto. Sin foto de catálogo en Figma: placeholder gris.
 */
export default function Miniatura({ src, alt, size = 'md' }: Props) {
  const caja = `shrink-0 overflow-hidden rounded-xl bg-[var(--hc-n-100)] ${TAMANOS[size]}`
  if (!src) return <div className={caja} aria-hidden />
  return (
    <div className={caja}>
      <img src={src} alt={alt} className="size-full object-cover" width={56} height={56} />
    </div>
  )
}
