import { useAdminProductsLoad } from './useAdminProductsLoad'
import { useAdminProductsCarrusel } from './useAdminProductsCarrusel'
import { useAdminProductsCrud } from './useAdminProductsCrud'
import { useAdminProductsForm } from './useAdminProductsForm'

/**
 * Handlers CRUD, carrusel, carga y modal de productos admin — bit-idéntico al original.
 * @param {object} deps
 */
export function useAdminProductsActions(deps) {
  const { load } = useAdminProductsLoad(deps)
  const { handleToggleCarrusel, handleCarruselMover, handleToggleDestacado } =
    useAdminProductsCarrusel({ ...deps, load })
  const { handleSave, handleDelete, confirmDelete, handleImportBulk } =
    useAdminProductsCrud({ ...deps, load })
  const { openNew, openEdit, handleModalClose } = useAdminProductsForm(deps)

  return {
    load,
    openNew,
    openEdit,
    handleToggleCarrusel,
    handleCarruselMover,
    handleToggleDestacado,
    handleSave,
    handleDelete,
    confirmDelete,
    handleModalClose,
    handleImportBulk,
  }
}
