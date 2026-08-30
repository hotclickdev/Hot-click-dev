import { useCallback } from 'react'
import { orderService } from '@/services/orderService'
import type { Id } from '@/types/api'
import type { Pedido } from '@/types/pedido'
import type { TFunction } from 'i18next'
import type { Dispatch, SetStateAction } from 'react'

type ToastPedido = (opts: { message: string; type?: 'success' | 'error' | 'warning' | 'info' }) => void

/**
 * Handlers tarjeta de pedido — bit-idéntico al original.
 */
export function useAdminOrderCardActions(deps: {
  t: TFunction
  toast: ToastPedido
  order: Pedido
  estado: string
  esRetiro: boolean
  pendingEstado: string | null
  nota: string
  guia: string
  costo: string
  override: string
  onUpdate: (id: Id, fields: Partial<Pedido>) => void
  onDelete: (id: Id) => void
  setSaving: Dispatch<SetStateAction<boolean>>
  setNotifying: Dispatch<SetStateAction<boolean>>
  setPending: Dispatch<SetStateAction<string | null>>
  setNota: Dispatch<SetStateAction<string>>
  setShowOver: Dispatch<SetStateAction<boolean>>
  setConfirmDelete: Dispatch<SetStateAction<boolean>>
}) {
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
        await orderService.procesarEnvio(order.id as Id, guia.trim(), costoNum as number)
        toast({ message: t('adminOrders.sentNotified'), type: 'success' })
        onUpdate(order.id as Id, { estado: 'ENVIADO', numeroGuia: guia.trim(), costoEnvio: costoNum ?? order.costoEnvio })
        setPending(null)
      } catch { toast({ message: t('adminOrders.shipError'), type: 'error' }) }
      finally { setSaving(false) }
      return
    }
    setSaving(true)
    try {
      await orderService.updateStatus(order.id as Id, pendingEstado, nota.trim() || null)
      toast({ message: nota.trim() ? t('adminOrders.savedNotified') : t('adminOrders.saved'), type: 'success' })
      onUpdate(order.id as Id, { estado: pendingEstado })
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
      await orderService.notificar(order.id as Id)
      toast({ message: t('adminOrders.sent'), type: 'success' })
    } catch {
      toast({ message: t('adminOrders.errorEmail'), type: 'error' })
    } finally { setNotifying(false) }
  }, [order.id, setNotifying, t, toast])

  const doDelete = useCallback(async () => {
    setConfirmDelete(false)
    setSaving(true)
    try {
      await orderService.delete(order.id as Id)
      toast({ message: t('adminOrders.deleted'), type: 'success' })
      onDelete(order.id as Id)
    } catch { toast({ message: t('adminOrders.errorDelete'), type: 'error' }) }
    finally { setSaving(false) }
  }, [onDelete, order.id, setConfirmDelete, setSaving, t, toast])

  const applyOverride = useCallback(async () => {
    if (!override || override === estado) return
    setSaving(true)
    try {
      await orderService.updateStatus(order.id as Id, override)
      toast({ message: t('adminOrders.corrected'), type: 'success' })
      onUpdate(order.id as Id, { estado: override })
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
