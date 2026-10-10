import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { RUTA_EMPRENDEDOR } from '../constants'
import { useCatalogoEmprendedor } from '../hooks/useCatalogoEmprendedor'
import { borrarProductoVendedor, mensajeErrorProducto } from '@/prototipo/compartido/catalogoVendedorApi'
import HojaInferior from '@/components/comprador/HojaInferior'
import ConfirmarEliminarProductoVista from '@/prototipo/compartido/ConfirmarEliminarProductoVista'

/**
 * Paso 13 Confirmar eliminación (Figma 37:178) — chrome Emp + vista compartida.
 */
export default function ConfirmarEliminacionPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { productos, cargando } = useCatalogoEmprendedor()
  const producto = useMemo(() => productos.find((item) => item.id === id), [productos, id])
  const nombre = producto?.nombre ?? 'este producto'
  const [error, setError] = useState<string | null>(null)
  const [eliminando, setEliminando] = useState(false)

  async function eliminar() {
    setEliminando(true)
    setError(null)
    try {
      await borrarProductoVendedor(id)
      navigate(`${RUTA_EMPRENDEDOR}/productos`)
    } catch (err: unknown) {
      setError(mensajeErrorProducto(err, 'No se pudo eliminar el producto.'))
    } finally {
      setEliminando(false)
    }
  }

  return (
    <HojaInferior abierta titulo="Eliminar producto" onCerrar={() => navigate(`${RUTA_EMPRENDEDOR}/productos`)}>
      <div className="px-5 pb-8 text-center">
      <ConfirmarEliminarProductoVista
        nombre={nombre}
        cargando={cargando}
        eliminando={eliminando}
        error={error}
        onEliminar={() => void eliminar()}
        onCancelar={() => navigate(`${RUTA_EMPRENDEDOR}/productos/${id}/editar`)}
      />
      </div>
    </HojaInferior>
  )
}
