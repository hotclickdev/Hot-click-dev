import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Boton, EncabezadoPagina, IconoEstado } from './ui'
import { useSellerRuta } from './SellerPlanContext'
import { useCatalogoVendedor } from './useCatalogoVendedor'
import { borrarProductoVendedor, mensajeErrorProducto } from './catalogoVendedorApi'

/**
 * Confirmar eliminación (Figma 61:592).
 */
export default function EliminarProductoPage() {
  const { id } = useParams()
  const ruta = useSellerRuta()
  const navigate = useNavigate()
  const { seller } = useCatalogoVendedor()
  const producto = id ? seller.find((p) => p.id === id) : undefined
  const nombre = producto?.nombre ?? 'este producto'
  const [error, setError] = useState<string | null>(null)

  async function eliminar() {
    if (!id) return
    try {
      await borrarProductoVendedor(id)
      navigate(ruta('productos'))
    } catch (err: unknown) {
      setError(mensajeErrorProducto(err, 'No se pudo eliminar el producto.'))
    }
  }

  return (
    <main className="px-5 pb-8 pt-[60px] text-center">
      <EncabezadoPagina titulo="" volverA={ruta('productos')} />
      <IconoEstado variante="alerta" />
      <h1 className="font-display text-xl font-bold">¿Eliminar este producto?</h1>
      <p className="mt-2 text-sm text-hc-muted">
        {nombre} se va a eliminar de tu catálogo. Esta acción no se puede deshacer.
      </p>
      {error ? <p className="mt-3 text-sm text-hc-danger">{error}</p> : null}
      <div className="mt-8 space-y-3">
        <Boton onClick={() => void eliminar()}>Sí, eliminar</Boton>
        <Boton variante="contorno" to={id ? ruta(`productos/${id}/editar`) : ruta('productos')}>Cancelar</Boton>
      </div>
    </main>
  )
}
