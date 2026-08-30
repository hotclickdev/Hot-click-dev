import { useCallback } from 'react'
import { compraService } from '@/services/compraService'
import type { ToastCompras } from './comprasHelpers'
import type { Id } from '@/types/api'

/**
 * Handlers de órdenes de compra — bit-idéntico al original.
 */
export function useAdminComprasActions({ showToast, load }: { showToast: ToastCompras; load: () => void }) {
  const handleCancelar = useCallback(async (id: Id) => {
    if (!globalThis.confirm('¿Cancelar esta orden?')) return
    try {
      await compraService.cancelar(id)
      showToast('Orden cancelada', 'success')
      load()
    } catch (err: unknown) {
      void err
      showToast('Error al cancelar', 'error')
    }
  }, [load, showToast])

  return { handleCancelar }
}
