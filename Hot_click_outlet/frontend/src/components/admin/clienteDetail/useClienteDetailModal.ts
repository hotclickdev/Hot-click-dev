import { useState, useEffect } from 'react'
import { crmService } from '@/services/crmService'
import { useToast } from '@/components/ui/Toast'
import { SEGMENTOS } from './clienteDetailHelpers'
import type { Id, JsonBody } from '@/types/api'

export type PedidoClienteFicha = {
  id: Id
  numeroPedido?: string
  fechaPedido?: string | number | Date
  totalPedido?: number
  estadoPedido?: string
}

export type ClienteDetalle = {
  nombre?: string
  apellidoPaterno?: string
  correo?: string
  telefono?: string
  segmento?: string
  notasInternas?: string
  limiteCredito?: number
  puntosFidelidad?: number
  numPedidosHist?: number
  totalComprasHist?: number
  pedidos?: PedidoClienteFicha[]
}

export type ClienteForm = {
  segmento: string
  notasInternas: string
  limiteCredito: number
  puntosFidelidad: number
}

/** Estado y handlers del modal de cliente — bit-idéntico al original. */
export function useClienteDetailModal(clienteId: Id) {
  const { showToast } = useToast()
  const [cliente, setCliente] = useState<ClienteDetalle | null>(null)
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [form, setForm] = useState<ClienteForm>({ segmento: '', notasInternas: '', limiteCredito: 0, puntosFidelidad: 0 })
  const [saving, setSaving] = useState(false)
  const [deltaPoints, setDeltaPoints] = useState('')

  useEffect(() => {
    if (!clienteId) return
    setLoading(true)
    crmService.getCliente(clienteId)
      .then((data: unknown) => {
        const detalle = data as ClienteDetalle
        setCliente(detalle)
        setForm({
          segmento:        detalle.segmento ?? 'NUEVO',
          notasInternas:   detalle.notasInternas ?? '',
          limiteCredito:   detalle.limiteCredito ?? 0,
          puntosFidelidad: detalle.puntosFidelidad ?? 0,
        })
      })
      .catch(() => showToast('Error al cargar cliente', 'error'))
      .finally(() => setLoading(false))
  }, [clienteId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    setSaving(true)
    try {
      await crmService.actualizarCliente(clienteId, form as JsonBody)
      showToast('Cliente actualizado', 'success')
      setEditMode(false)
      const updated = await crmService.getCliente(clienteId) as ClienteDetalle
      setCliente(updated)
    } catch {
      showToast('Error al guardar', 'error')
    } finally { setSaving(false) }
  }

  const handleAjustarPuntos = async (sign: number) => {
    const delta = Number.parseInt(deltaPoints || '0') * sign
    if (!delta) return
    try {
      await crmService.ajustarPuntos(clienteId, delta)
      showToast(`${delta > 0 ? '+' : ''}${delta} puntos aplicados`, 'success')
      const updated = await crmService.getCliente(clienteId) as ClienteDetalle
      setCliente(updated)
      setForm(f => ({ ...f, puntosFidelidad: updated.puntosFidelidad as number }))
    } catch {
      showToast('Error al ajustar puntos', 'error')
    } finally {
      setDeltaPoints('')
    }
  }

  return {
    cliente,
    loading,
    editMode,
    setEditMode,
    form,
    setForm,
    saving,
    deltaPoints,
    setDeltaPoints,
    handleSave,
    handleAjustarPuntos,
    SEGMENTOS,
  }
}
