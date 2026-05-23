import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import AdminLayout from '@/layouts/AdminLayout'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import Spinner from '@/components/ui/Spinner'
import api from '@/services/api'
import { useToast } from '@/components/ui/Toast'
import { categoriaService } from '@/services/orderService'
import ImportExportBar from '@/components/admin/ImportExportBar'

const EMPTY = { nombreCategoria: '', descripcion: '' }

export default function AdminCategories() {
  const { t } = useTranslation()
  const toast = useToast()
  const [cats, setCats] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    api.get('/categorias')
      .then(({ data }) => setCats(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openNew = () => { setEditing(null); setForm(EMPTY); setModalOpen(true) }
  const openEdit = (c) => {
    setEditing(c)
    setForm({ nombreCategoria: c.nombreCategoria ?? '', descripcion: c.descripcion ?? '' })
    setModalOpen(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editing) {
        await api.put(`/categorias/${editing.id}`, form)
        toast({ message: 'Categoría actualizada', type: 'success' })
      } else {
        await api.post('/categorias', form)
        toast({ message: 'Categoría creada', type: 'success' })
      }
      setModalOpen(false)
      load()
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Error al guardar', type: 'error' })
    } finally { setSaving(false) }
  }

  const handleDelete = async (id, nombre) => {
    if (!confirm(`¿Eliminar categoría "${nombre}"?`)) return
    try {
      await api.delete(`/categorias/${id}`)
      toast({ message: 'Categoría eliminada', type: 'success' })
      setCats((p) => p.filter((c) => c.id !== id))
    } catch { toast({ message: 'Error al eliminar', type: 'error' }) }
  }

  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }))

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-[#e8e8ed]">{t('admin.categories.title')}</h1>
            <p className="text-sm text-[#8e8e9a] mt-1">{cats.length} {t('admin.categories.title').toLowerCase()}</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <ImportExportBar
              data={cats.map((c) => ({ id: c.id, nombreCategoria: c.nombreCategoria, descripcion: c.descripcion ?? '' }))}
              columns={['id', 'nombreCategoria', 'descripcion']}
              filename="categorias"
              sheetName="Categorías"
              importColumns={['nombreCategoria', 'descripcion']}
              mapImportRow={(row) => ({ nombreCategoria: row.nombreCategoria ?? '', descripcion: row.descripcion ?? '' })}
              onImport={async (rows) => {
                await categoriaService.importBulk(rows)
                load()
              }}
            />
            <Button onClick={openNew}>+ {t('admin.categories.new')}</Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {cats.map((c) => (
              <div key={c.id} className="bg-[#111114] border border-white/8 rounded-2xl p-5">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-[#e8e8ed]">{c.nombreCategoria}</h3>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => openEdit(c)} className="p-1.5 text-[#8e8e9a] hover:text-white hover:bg-white/8 rounded-lg transition-colors text-sm">✎</button>
                    <button onClick={() => handleDelete(c.id, c.nombreCategoria)} className="p-1.5 text-[#8e8e9a] hover:text-red-400 hover:bg-red-500/8 rounded-lg transition-colors text-sm">✕</button>
                  </div>
                </div>
                {c.descripcion && <p className="text-xs text-[#8e8e9a]">{c.descripcion}</p>}
              </div>
            ))}
            {cats.length === 0 && (
              <div className="col-span-full text-center py-12 text-[#8e8e9a]">{t('common.noData')}</div>
            )}
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? t('admin.categories.edit') : t('admin.categories.new')}>
        <form onSubmit={handleSave} className="space-y-4">
          <Input label="Nombre *" value={form.nombreCategoria} onChange={set('nombreCategoria')} required />
          <Input label="Descripción" value={form.descripcion} onChange={set('descripcion')} />
          <div className="flex gap-3 pt-1">
            <Button type="submit" loading={saving} className="flex-1">{editing ? t('common.save') : t('admin.categories.new')}</Button>
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>{t('common.cancel')}</Button>
          </div>
        </form>
      </Modal>
    </AdminLayout>
  )
}
