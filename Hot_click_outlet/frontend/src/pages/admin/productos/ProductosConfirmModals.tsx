import { ConfirmModal } from '@/components/ui/ConfirmModal'
import KardexDrawer from '@/components/pos/KardexDrawer'
import type { DeleteTargetProducto, ProductoAdmin } from './productosHelpers'

export type ProductosConfirmModalsProps = {
  showDiscardModal: boolean
  onCloseDiscard: () => void
  onConfirmDiscard: () => void
  deleteTarget: DeleteTargetProducto | null
  onCloseDelete: () => void
  onConfirmDelete: () => void
  kardexProducto: ProductoAdmin | null
  onCloseKardex: () => void
}

export default function ProductosConfirmModals({
  showDiscardModal,
  onCloseDiscard,
  onConfirmDiscard,
  deleteTarget,
  onCloseDelete,
  onConfirmDelete,
  kardexProducto,
  onCloseKardex,
}: ProductosConfirmModalsProps) {
  return (
    <>
      <ConfirmModal
        open={showDiscardModal}
        onClose={onCloseDiscard}
        onConfirm={onConfirmDiscard}
        title="Cambios sin guardar"
        message="Hay cambios sin guardar en este producto. ¿Salir sin guardar?"
        confirmLabel="Descartar cambios"
        danger={false}
      />

      <ConfirmModal
        open={!!deleteTarget}
        onClose={onCloseDelete}
        onConfirm={onConfirmDelete}
        title="Eliminar producto"
        message={`¿Eliminar "${deleteTarget?.nombre}"? Esta acción no se puede deshacer.`}
      />

      {kardexProducto && (
        <KardexDrawer producto={kardexProducto} onClose={onCloseKardex} />
      )}
    </>
  )
}
