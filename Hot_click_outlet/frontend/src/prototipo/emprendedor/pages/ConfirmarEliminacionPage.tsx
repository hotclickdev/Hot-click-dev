import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import BotonPrimario from '../ui/BotonPrimario'
import BotonSecundario from '../ui/BotonSecundario'
import { RUTA_EMPRENDEDOR } from '../constants'
import { PRODUCTOS_DEMO } from '../data/catalogoDemo'
import { productService } from '@/services/productService'

/**
 * Paso 13 Confirmar eliminación (Figma 37:178).
 */
export default function ConfirmarEliminacionPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const producto = useMemo(() => PRODUCTOS_DEMO.find((p) => p.id === id), [id])
  const nombre = producto?.nombre ?? 'este producto'

  return (
    <main className="flex min-h-dvh flex-col items-center gap-4 px-5 pb-16 pt-36 text-center">
      <div className="flex size-20 items-center justify-center rounded-full bg-[var(--hc-danger-bg)] text-3xl font-bold text-hc-primary">
        !
      </div>
      <h1 className="font-display text-lg font-bold">¿Eliminar este producto?</h1>
      <p className="text-[13px] text-hc-muted">
        {nombre} se va a eliminar de tu catálogo. Esta acción no se puede deshacer.
      </p>
      <BotonPrimario onClick={() => void eliminar()}>Sí, eliminar</BotonPrimario>
      <BotonSecundario onClick={() => navigate(`${RUTA_EMPRENDEDOR}/productos/${id}/editar`)}>
        Cancelar
      </BotonSecundario>
    </main>
  )

  async function eliminar() {
    try {
      await productService.delete(id)
    } catch (err) {
      console.error('[prototipo emprendedor] no se pudo eliminar el producto', err)
    }
    navigate(`${RUTA_EMPRENDEDOR}/productos`)
  }
}
