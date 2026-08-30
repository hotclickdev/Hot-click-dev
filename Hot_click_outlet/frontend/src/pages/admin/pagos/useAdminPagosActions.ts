import { useCallback } from 'react'
import { paymentService } from '@/services/paymentService'
import { mensajeErrorPago } from './pagosHelpers'
import type { Id } from '@/types/api'
import type { Dispatch, SetStateAction } from 'react'

/**
 * Handlers SINPE y comprobantes — bit-idéntico al original.
 */
export function useAdminPagosActions(deps: {
  motivoTexto: string
  fetchPagos: () => Promise<void>
  fetchKpis: () => Promise<void>
  fetchComprobantes: () => Promise<void>
  setActionLoading: Dispatch<SetStateAction<Id | null>>
  setCompAction: Dispatch<SetStateAction<Id | null>>
  setMotivoModal: Dispatch<SetStateAction<Id | null>>
  setMotivoTexto: Dispatch<SetStateAction<string>>
}) {
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

  const handleConfirmarSinpe = useCallback(async (pagoId: Id) => {
    if (!globalThis.confirm('¿Confirmar este pago SINPE? Se marcará como CAPTURADO y se procesará el pedido.')) return
    setActionLoading(pagoId)
    try {
      await paymentService.confirmarSinpe(pagoId)
      await fetchPagos()
      await fetchKpis()
    } catch (err: unknown) {
      alert(mensajeErrorPago(err, 'Error confirmando pago SINPE'))
    } finally {
      setActionLoading(null)
    }
  }, [fetchPagos, fetchKpis, setActionLoading])

  const handleRechazarSinpe = useCallback(async (pagoId: Id) => {
    if (!globalThis.confirm('¿Rechazar este pago SINPE? Se liberará el stock reservado y se notificará al cliente.')) return
    setActionLoading(pagoId)
    try {
      await paymentService.rechazarSinpe(pagoId)
      await fetchPagos()
      await fetchKpis()
    } catch (err: unknown) {
      alert(mensajeErrorPago(err, 'Error rechazando pago SINPE'))
    } finally {
      setActionLoading(null)
    }
  }, [fetchPagos, fetchKpis, setActionLoading])

  const handleAprobarComprobante = useCallback(async (id: Id) => {
    setCompAction(id)
    try {
      await paymentService.aprobarComprobante(id)
      await fetchComprobantes()
      await fetchKpis()
    } catch (err: unknown) {
      alert(mensajeErrorPago(err, 'Error aprobando comprobante SINPE'))
    } finally { setCompAction(null) }
  }, [fetchComprobantes, fetchKpis, setCompAction])

  const handleRechazarComprobante = useCallback(async (id: Id) => {
    setCompAction(id)
    try {
      await paymentService.rechazarComprobante(id, motivoTexto || undefined)
      setMotivoModal(null)
      setMotivoTexto('')
      await fetchComprobantes()
      await fetchKpis()
    } catch (err: unknown) {
      alert(mensajeErrorPago(err, 'Error rechazando comprobante SINPE'))
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
