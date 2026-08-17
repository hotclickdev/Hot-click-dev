import { useCallback } from 'react'
import { compraService } from '@/services/compraService'

/**
 * Handlers de órdenes de compra — bit-idéntico al original.
 * @param {object} deps
 */
export function useAdminComprasActions({ showToast, load }) {
  const handleCancelar = useCallback(async (id) => {
    if (!globalThis.confirm('¿Cancelar esta orden?')) return
    try {
      await compraService.cancelar(id)
      showToast('Orden cancelada', 'success')
      load()
    } catch {
      showToast('Error al cancelar', 'error')
    }
  }, [load, showToast])

  return { handleCancelar }
}
