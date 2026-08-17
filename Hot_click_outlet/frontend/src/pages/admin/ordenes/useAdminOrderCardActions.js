import { useCallback } from 'react'
import { orderService } from '@/services/orderService'

/**
 * Handlers tarjeta de pedido — bit-idéntico al original.
 * @param {object} deps
 */
export function useAdminOrderCardActions(deps) {
  const {
    t,
    toast,
    order,
    estado,
    esRetiro,
    pendingEstado,
    nota,
    guia,
    costo,
    override,
    onUpdate,
    onDelete,
    setSaving,
    setNotifying,
    setPending,
    setNota,
    setShowOver,
    setConfirmDelete,
  } = deps

  const saveEstado = useCallback(async () => {
    if (!pendingEstado || pendingEstado === estado) return
    if (pendingEstado === 'ENVIADO' && !esRetiro) {
      if (!guia.trim()) { toast({ message: t('adminOrders.enterGuia'), type: 'error' }); return }
      setSaving(true)
      try {
        const costoNum = costo ? Number.parseInt(costo, 10) : null
        await orderService.procesarEnvio(order.id, guia.trim(), costoNum)
        toast({ message: t('adminOrders.sentNotified'), type: 'success' })
        onUpdate(order.id, { estado: 'ENVIADO', numeroGuia: guia.trim(), costoEnvio: costoNum ?? order.costoEnvio })
        setPending(null)
      } catch { toast({ message: t('adminOrders.shipError'), type: 'error' }) }
      finally { setSaving(false) }
      return
    }
    setSaving(true)
    try {
      await orderService.updateStatus(order.id, pendingEstado, nota.trim() || null)
      toast({ message: nota.trim() ? t('adminOrders.savedNotified') : t('adminOrders.saved'), type: 'success' })
      onUpdate(order.id, { estado: pendingEstado })
      setPending(null)
      setNota('')
    } catch { toast({ message: t('adminOrders.errorSave'), type: 'error' }) }
    finally { setSaving(false) }
  }, [
    costo,
    esRetiro,
    estado,
    guia,
    nota,
    onUpdate,
    order,
    pendingEstado,
    setNota,
    setPending,
    setSaving,
    t,
    toast,
  ])

  const sendEmail = useCallback(async () => {
    setNotifying(true)
    try {
      await orderService.notificar(order.id)
      toast({ message: t('adminOrders.sent'), type: 'success' })
    } catch {
      toast({ message: t('adminOrders.errorEmail'), type: 'error' })
    } finally { setNotifying(false) }
  }, [order.id, setNotifying, t, toast])

  const doDelete = useCallback(async () => {
    setConfirmDelete(false)
    setSaving(true)
    try {
      await orderService.delete(order.id)
      toast({ message: t('adminOrders.deleted'), type: 'success' })
      onDelete(order.id)
    } catch { toast({ message: t('adminOrders.errorDelete'), type: 'error' }) }
    finally { setSaving(false) }
  }, [onDelete, order.id, setConfirmDelete, setSaving, t, toast])

  const applyOverride = useCallback(async () => {
    if (!override || override === estado) return
    setSaving(true)
    try {
      await orderService.updateStatus(order.id, override)
      toast({ message: t('adminOrders.corrected'), type: 'success' })
      onUpdate(order.id, { estado: override })
      setShowOver(false)
    } catch { toast({ message: t('adminOrders.errorCorrect'), type: 'error' }) }
    finally { setSaving(false) }
  }, [estado, onUpdate, order.id, override, setSaving, setShowOver, t, toast])

  return {
    saveEstado,
    sendEmail,
    doDelete,
    applyOverride,
  }
}
