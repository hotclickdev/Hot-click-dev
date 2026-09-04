import { Link } from 'react-router-dom'

type Props = Readonly<{
  baseNuevo: string
  layout?: 'stack' | 'row'
}>

/**
 * Accesos directos a catálogo o personalizado (sin paso intermedio).
 */
export default function BotonesAgregarProducto({ baseNuevo, layout = 'stack' }: Props) {
  const contenedor = layout === 'row' ? 'flex flex-col gap-2 sm:flex-row sm:flex-wrap' : 'flex flex-col gap-2'
  return (
    <div className={contenedor}>
      <Link
        to={`${baseNuevo}/catalogo`}
        className="flex min-h-11 w-full items-center justify-center rounded-[14px] bg-hc-primary px-5 py-4 text-center text-[15px] font-bold text-white"
        data-mm="seller-agregar-producto-catalogo"
      >
        + Producto de catálogo
      </Link>
      <Link
        to={`${baseNuevo}/personalizado`}
        className="flex min-h-11 w-full items-center justify-center rounded-[14px] bg-[var(--hc-n-900)] px-5 py-4 text-center text-[15px] font-bold text-white"
        data-mm="seller-agregar-producto-personalizado"
      >
        + Producto personalizado
      </Link>
      <p className="text-center text-xs text-hc-muted">
        Personalizado: sublimado, arte u otras manualidades por encargo.
      </p>
    </div>
  )
}
