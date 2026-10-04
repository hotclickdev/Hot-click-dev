import { useState } from 'react'
import { Link } from 'react-router-dom'
import HojaInferior from '@/components/comprador/HojaInferior'
import ElegirTipoProductoMenu from './ElegirTipoProductoMenu'

type Props = Readonly<{
  baseNuevo: string
  layout?: 'stack' | 'row'
}>

/**
 * En celular: una CTA que abre la hoja de tipo. En escritorio: los dos enlaces.
 */
export default function BotonesAgregarProducto({ baseNuevo, layout = 'stack' }: Props) {
  const [hoja, setHoja] = useState(false)
  const fila = layout === 'row' ? 'flex flex-col gap-2 sm:flex-row sm:flex-wrap' : 'flex flex-col gap-2'

  return (
    <>
      <div className="md:hidden">
        <button
          type="button"
          onClick={() => setHoja(true)}
          className="flex min-h-12 w-full items-center justify-center rounded-[14px] bg-hc-primary px-5 text-[15px] font-bold text-white"
          data-mm="seller-agregar-producto"
        >
          Subir producto
        </button>
      </div>
      <div className={`hidden md:flex ${fila}`}>
        <Link
          to={`${baseNuevo}/catalogo`}
          className="flex min-h-11 w-full items-center justify-center rounded-[14px] bg-hc-primary px-5 py-4 text-center text-[15px] font-bold text-white"
          data-mm="seller-agregar-producto-catalogo"
        >
          + Producto de catálogo
        </Link>
        <Link
          to={`${baseNuevo}/personalizado`}
          className="flex min-h-11 w-full items-center justify-center rounded-[14px] border border-hc-border bg-hc-surface px-5 py-4 text-center text-[15px] font-medium text-hc-text"
          data-mm="seller-agregar-producto-personalizado"
        >
          + Producto personalizado
        </Link>
      </div>
      <HojaInferior
        abierta={hoja}
        onCerrar={() => setHoja(false)}
        titulo={<h2 className="font-display text-lg font-bold">¿Qué vas a vender?</h2>}
      >
        <ElegirTipoProductoMenu baseNuevo={baseNuevo} />
      </HojaInferior>
    </>
  )
}
