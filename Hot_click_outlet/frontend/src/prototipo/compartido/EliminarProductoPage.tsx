import { useParams } from 'react-router-dom'
import { productoPorId } from './mock'
import { Boton, EncabezadoPagina, IconoEstado } from './ui'
import { useSellerRuta } from './SellerPlanContext'

/**
 * Confirmar eliminación (Figma 61:592).
 */
export default function EliminarProductoPage() {
  const { id } = useParams()
  const ruta = useSellerRuta()
  const producto = id ? productoPorId(id) : undefined
  const nombre = producto?.nombre ?? 'este producto'
  return (
    <main className="px-5 pb-8 pt-[60px] text-center">
      <EncabezadoPagina titulo="" volverA={ruta('productos')} />
      <IconoEstado variante="alerta" />
      <h1 className="font-display text-xl font-bold">¿Eliminar este producto?</h1>
      <p className="mt-2 text-sm text-hc-muted">
        {nombre} se va a eliminar de tu catálogo. Esta acción no se puede deshacer.
      </p>
      <div className="mt-8 space-y-3">
        <Boton to={ruta('productos')}>Sí, eliminar</Boton>
        <Boton variante="contorno" to={id ? ruta(`productos/${id}/editar`) : ruta('productos')}>Cancelar</Boton>
      </div>
    </main>
  )
}
