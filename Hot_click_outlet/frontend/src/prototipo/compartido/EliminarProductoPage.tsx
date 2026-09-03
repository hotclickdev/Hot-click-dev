import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { EncabezadoPagina } from './ui'
import { useSellerRuta } from './SellerPlanContext'
import { useCatalogoVendedor } from './useCatalogoVendedor'
import { borrarProductoVendedor, mensajeErrorProducto } from './catalogoVendedorApi'
import ConfirmarEliminarProductoVista from './ConfirmarEliminarProductoVista'

/**
 * Confirmar eliminación (Figma 61:592) — shell Seller.
 */
export default function EliminarProductoPage() {
  const { id } = useParams()
  const ruta = useSellerRuta()
  const navigate = useNavigate()
  const { seller, cargando } = useCatalogoVendedor()
  const producto = id ? seller.find((p) => p.id === id) : undefined
  const nombre = producto?.nombre ?? 'este producto'
  const [error, setError] = useState<string | null>(null)
  const [eliminando, setEliminando] = useState(false)

  async function eliminar() {
    if (!id) return
    setEliminando(true)
    setError(null)
    try {
      await borrarProductoVendedor(id)
      navigate(ruta('productos'))
    } catch (err: unknown) {
      setError(mensajeErrorProducto(err, 'No se pudo eliminar el producto.'))
    } finally {
      setEliminando(false)
    }
  }

  return (
    <main className="px-5 pb-8 pt-[60px] text-center">
      <ConfirmarEliminarProductoVista
        nombre={nombre}
        cargando={cargando}
        eliminando={eliminando}
        error={error}
        onEliminar={() => void eliminar()}
        onCancelar={() => navigate(id ? ruta(`productos/${id}/editar`) : ruta('productos'))}
        encabezado={<EncabezadoPagina titulo="" volverA={ruta('productos')} />}
      />
    </main>
  )
}
