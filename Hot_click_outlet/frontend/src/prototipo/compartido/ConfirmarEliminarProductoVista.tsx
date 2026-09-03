import type { ReactNode } from 'react'
import { Boton, IconoEstado } from './ui'
import EntradaPagina from './motion/EntradaPagina'

type Props = Readonly<{
  nombre: string
  cargando: boolean
  eliminando: boolean
  error: string | null
  onEliminar: () => void
  onCancelar: () => void
  encabezado?: ReactNode
}>

/**
 * Vista compartida de confirmación de borrado de producto (Emp + Seller).
 */
export default function ConfirmarEliminarProductoVista({
  nombre,
  cargando,
  eliminando,
  error,
  onEliminar,
  onCancelar,
  encabezado,
}: Props) {
  return (
    <>
      {encabezado}
      <EntradaPagina className="mx-auto flex w-full max-w-sm flex-col items-center gap-4">
        <IconoEstado variante="alerta" />
        <h1 className="font-display text-xl font-bold">¿Eliminar este producto?</h1>
        <p className="text-sm text-hc-muted">
          {cargando ? 'Cargando…' : `${nombre} se va a eliminar de tu catálogo. Esta acción no se puede deshacer.`}
        </p>
        {error ? <p className="text-sm text-hc-danger">{error}</p> : null}
        <div className="mt-4 flex w-full flex-col gap-2">
          <Boton disabled={eliminando || cargando} onClick={onEliminar}>
            {eliminando ? 'Eliminando…' : 'Sí, eliminar'}
          </Boton>
          <Boton variante="contorno" disabled={eliminando} onClick={onCancelar}>
            Cancelar
          </Boton>
        </div>
      </EntradaPagina>
    </>
  )
}
