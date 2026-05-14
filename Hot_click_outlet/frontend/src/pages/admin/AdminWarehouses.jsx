import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import AdminLayout from '@/layouts/AdminLayout'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import Spinner from '@/components/ui/Spinner'
import { warehouseService } from '@/services/orderService'
import { useToast } from '@/components/ui/Toast'

const EMPTY = { nombreBodega: '', direccionExacta: '', telefono: '', correoContacto: '', encargadoNombre: '' }

export default function AdminWarehouses() {
  const { t } = useTranslation()
  const toast = useToast()
  const [warehouses, setWarehouses] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    warehouseService.getAll()
      .then(({ data }) => setWarehouses(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openNew = () => { setEditing(null); setForm(EMPTY); setModalOpen(true) }
  const openEdit = (w) => {
    setEditing(w)
    setForm({
      nombreBodega: w.nombreBodega ?? '',
      direccionExacta: w.direccionExacta ?? '',
      telefono: w.telefono ?? '',
      correoContacto: w.correoContacto ?? '',
      encargadoNombre: w.encargadoNombre ?? '',
    })
    setModalOpen(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editing) {
        await warehouseService.update(editing.id, form)
        toast({ message: 'Bodega actualizada', type: 'success' })
      } else {
        await warehouseService.create(form)
        toast({ message: 'Bodega creada', type: 'success' })
      }
      setModalOpen(false)
      load()
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Error al guardar', type: 'error' })
    } finally { setSaving(false) }
  }

  const handleDelete = async (id, nombre) => {
    if (!confirm(`¿Eliminar bodega "${nombre}"?`)) return
    try {
      await warehouseService.delete(id)
      toast({ message: 'Bodega eliminada', type: 'success' })
      setWarehouses((p) => p.filter((w) => w.id !== id))
    } catch { toast({ message: 'Error al eliminar', type: 'error' }) }
  }

  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }))

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#e8e8ed]">{t('admin.warehouses.title')}</h1>
            <p className="text-sm text-[#8e8e9a] mt-1">{warehouses.length} registradas</p>
          </div>
          <Button onClick={openNew}>+ {t('admin.warehouses.new')}</Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {warehouses.map((w) => (
              <div key={w.id} className="bg-[#111114] border border-white/8 rounded-2xl p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-[#e8e8ed]">{w.nombreBodega}</h3>
                    <Badge variant="success" className="mt-1">{w.estado ?? 'ACTIVO'}</Badge>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => openEdit(w)} className="p-1.5 text-[#8e8e9a] hover:text-white hover:bg-white/8 rounded-lg transition-colors text-sm">✎</button>
                    <button onClick={() => handleDelete(w.id, w.nombreBodega)} className="p-1.5 text-[#8e8e9a] hover:text-red-400 hover:bg-red-500/8 rounded-lg transition-colors text-sm">✕</button>
                  </div>
                </div>
                <div className="space-y-1 text-xs text-[#8e8e9a]">
                  {w.direccionExacta && <div>📍 {w.direccionExacta}</div>}
                  {w.telefono && <div>📞 {w.telefono}</div>}
                  {w.correoContacto && <div>✉ {w.correoContacto}</div>}
                  {w.encargadoNombre && <div>👤 {w.encargadoNombre}</div>}
                </div>
              </div>
            ))}
            {warehouses.length === 0 && (
              <div className="col-span-full text-center py-12 text-[#8e8e9a]">{t('common.noData')}</div>
            )}
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? t('admin.warehouses.edit') : t('admin.warehouses.new')} size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          <Input label="Nombre bodega *" value={form.nombreBodega} onChange={set('nombreBodega')} required placeholder="Bodega principal" />
          <Input label="Dirección exacta *" value={form.direccionExacta} onChange={set('direccionExacta')} required placeholder="San José, Costa Rica" />
          <Input label="Teléfono *" value={form.telefono} onChange={set('telefono')} required placeholder="8888-8888" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Correo contacto" value={form.correoContacto} onChange={set('correoContacto')} type="email" placeholder="Opcional" />
            <Input label="Encargado" value={form.encargadoNombre} onChange={set('encargadoNombre')} placeholder="Opcional" />
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="submit" loading={saving} className="flex-1">{editing ? t('common.save') : t('admin.warehouses.new')}</Button>
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>{t('common.cancel')}</Button>
          </div>
        </form>
      </Modal>
    </AdminLayout>
  )
}
