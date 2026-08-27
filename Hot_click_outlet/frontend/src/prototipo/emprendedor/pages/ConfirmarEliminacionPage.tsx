import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import BotonPrimario from '../ui/BotonPrimario'
import BotonSecundario from '../ui/BotonSecundario'
import { RUTA_EMPRENDEDOR } from '../constants'
import { useCatalogoEmprendedor } from '../hooks/useCatalogoEmprendedor'
import { useEmprendedorDemoStore } from '../store/emprendedorDemoStore'

/**
 * Paso 13 Confirmar eliminación (Figma 37:178).
 */
export default function ConfirmarEliminacionPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { productos } = useCatalogoEmprendedor()
  const eliminarProducto = useEmprendedorDemoStore((estado) => estado.eliminarProducto)
  const producto = useMemo(() => productos.find((item) => item.id === id), [productos, id])
  const nombre = producto?.nombre ?? 'este producto'

  function eliminar() {
    eliminarProducto(id)
    navigate(`${RUTA_EMPRENDEDOR}/productos`)
  }

  return (
    <main className="flex min-h-dvh flex-col items-center gap-4 px-5 pb-16 pt-36 text-center">
      <div className="flex size-20 items-center justify-center rounded-full bg-[var(--hc-danger-bg)] text-3xl font-bold text-hc-primary">
        !
      </div>
      <h1 className="font-display text-lg font-bold">¿Eliminar este producto?</h1>
      <p className="text-[13px] text-hc-muted">
        {nombre} se va a eliminar de tu catálogo. Esta acción no se puede deshacer.
      </p>
      <BotonPrimario onClick={eliminar}>Sí, eliminar</BotonPrimario>
      <BotonSecundario onClick={() => navigate(`${RUTA_EMPRENDEDOR}/productos/${id}/editar`)}>
        Cancelar
      </BotonSecundario>
    </main>
  )
}
