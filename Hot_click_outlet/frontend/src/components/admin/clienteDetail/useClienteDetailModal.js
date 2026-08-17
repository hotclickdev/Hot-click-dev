import { useState, useEffect } from 'react'
import { crmService } from '@/services/crmService'
import { useToast } from '@/components/ui/Toast'
import { SEGMENTOS } from './clienteDetailHelpers'

/** Estado y handlers del modal de cliente — bit-idéntico al original. */
export function useClienteDetailModal(clienteId) {
  const { showToast } = useToast()
  const [cliente, setCliente] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [form, setForm] = useState({ segmento: '', notasInternas: '', limiteCredito: 0, puntosFidelidad: 0 })
  const [saving, setSaving] = useState(false)
  const [deltaPoints, setDeltaPoints] = useState('')

  useEffect(() => {
    if (!clienteId) return
    setLoading(true)
    crmService.getCliente(clienteId)
      .then(data => {
        setCliente(data)
        setForm({
          segmento:        data.segmento ?? 'NUEVO',
          notasInternas:   data.notasInternas ?? '',
          limiteCredito:   data.limiteCredito ?? 0,
          puntosFidelidad: data.puntosFidelidad ?? 0,
        })
      })
      .catch(() => showToast('Error al cargar cliente', 'error'))
      .finally(() => setLoading(false))
  }, [clienteId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    setSaving(true)
    try {
      await crmService.actualizarCliente(clienteId, form)
      showToast('Cliente actualizado', 'success')
      setEditMode(false)
      const updated = await crmService.getCliente(clienteId)
      setCliente(updated)
    } catch {
      showToast('Error al guardar', 'error')
    } finally { setSaving(false) }
  }

  const handleAjustarPuntos = async (sign) => {
    const delta = Number.parseInt(deltaPoints || '0') * sign
    if (!delta) return
    try {
      await crmService.ajustarPuntos(clienteId, delta)
      showToast(`${delta > 0 ? '+' : ''}${delta} puntos aplicados`, 'success')
      const updated = await crmService.getCliente(clienteId)
      setCliente(updated)
      setForm(f => ({ ...f, puntosFidelidad: updated.puntosFidelidad }))
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
