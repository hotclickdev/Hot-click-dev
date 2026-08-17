import { ConfirmModal } from '@/components/ui/ConfirmModal'
import KardexDrawer from '@/components/pos/KardexDrawer'

/**
 * Modales de descarte, eliminación y kardex de productos admin.
 * @param {{
 *   showDiscardModal: boolean
 *   onCloseDiscard: () => void
 *   onConfirmDiscard: () => void
 *   deleteTarget: { id: number, nombre: string } | null
 *   onCloseDelete: () => void
 *   onConfirmDelete: () => void
 *   kardexProducto: object | null
 *   onCloseKardex: () => void
 * }} props
 */
export default function ProductosConfirmModals({
  showDiscardModal,
  onCloseDiscard,
  onConfirmDiscard,
  deleteTarget,
  onCloseDelete,
  onConfirmDelete,
  kardexProducto,
  onCloseKardex,
}) {
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
