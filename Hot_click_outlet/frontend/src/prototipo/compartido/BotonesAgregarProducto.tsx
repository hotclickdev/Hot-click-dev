import { useState } from 'react'
import HojaInferior from '@/components/comprador/HojaInferior'
import ElegirTipoProductoMenu from './ElegirTipoProductoMenu'

type Props = Readonly<{
  baseNuevo: string
  layout?: 'stack' | 'row'
}>

/** Una sola CTA roja: abre la hoja para elegir catálogo o personalizado. */
export default function BotonesAgregarProducto({ baseNuevo }: Props) {
  const [hoja, setHoja] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setHoja(true)}
        className="flex min-h-12 w-full items-center justify-center rounded-[14px] bg-hc-red-500 px-5 text-[15px] font-bold text-white"
        data-mm="seller-agregar-producto"
      >
        Subir producto
      </button>
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
