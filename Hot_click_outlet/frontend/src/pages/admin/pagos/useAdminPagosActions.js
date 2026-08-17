import { useCallback } from 'react'
import { paymentService } from '@/services/paymentService'

/**
 * Handlers SINPE y comprobantes — bit-idéntico al original.
 * @param {object} deps
 */
export function useAdminPagosActions(deps) {
  const {
    motivoTexto,
    fetchPagos,
    fetchKpis,
    fetchComprobantes,
    setActionLoading,
    setCompAction,
    setMotivoModal,
    setMotivoTexto,
  } = deps

  const handleConfirmarSinpe = useCallback(async (pagoId) => {
    if (!globalThis.confirm('¿Confirmar este pago SINPE? Se marcará como CAPTURADO y se procesará el pedido.')) return
    setActionLoading(pagoId)
    try {
      await paymentService.confirmarSinpe(pagoId)
      await fetchPagos()
      await fetchKpis()
    } catch (err) {
      alert(err.response?.data?.message || 'Error confirmando pago SINPE')
    } finally {
      setActionLoading(null)
    }
  }, [fetchPagos, fetchKpis, setActionLoading])

  const handleRechazarSinpe = useCallback(async (pagoId) => {
    if (!globalThis.confirm('¿Rechazar este pago SINPE? Se liberará el stock reservado y se notificará al cliente.')) return
    setActionLoading(pagoId)
    try {
      await paymentService.rechazarSinpe(pagoId)
      await fetchPagos()
      await fetchKpis()
    } catch (err) {
      alert(err.response?.data?.message || 'Error rechazando pago SINPE')
    } finally {
      setActionLoading(null)
    }
  }, [fetchPagos, fetchKpis, setActionLoading])

  const handleAprobarComprobante = useCallback(async (id) => {
    setCompAction(id)
    try {
      await paymentService.aprobarComprobante(id)
      await fetchComprobantes()
      await fetchKpis()
    } catch (err) {
      alert(err.response?.data?.message || 'Error aprobando comprobante SINPE')
    } finally { setCompAction(null) }
  }, [fetchComprobantes, fetchKpis, setCompAction])

  const handleRechazarComprobante = useCallback(async (id) => {
    setCompAction(id)
    try {
      await paymentService.rechazarComprobante(id, motivoTexto || undefined)
      setMotivoModal(null)
      setMotivoTexto('')
      await fetchComprobantes()
      await fetchKpis()
    } catch (err) {
      alert(err.response?.data?.message || 'Error rechazando comprobante SINPE')
    } finally { setCompAction(null) }
  }, [
    motivoTexto,
    fetchComprobantes,
    fetchKpis,
    setCompAction,
    setMotivoModal,
    setMotivoTexto,
  ])

  return {
    handleConfirmarSinpe,
    handleRechazarSinpe,
    handleAprobarComprobante,
    handleRechazarComprobante,
  }
}
