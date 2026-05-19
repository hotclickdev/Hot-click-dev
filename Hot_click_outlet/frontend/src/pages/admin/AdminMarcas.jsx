import { useState, useEffect } from 'react'
import AdminLayout from '@/layouts/AdminLayout'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import Spinner from '@/components/ui/Spinner'
import { marcaService } from '@/services/marcaService'
import { useToast } from '@/components/ui/Toast'

const EMPTY = { nombreMarca: '', logoUrl: '' }

export default function AdminMarcas() {
  const toast = useToast()
  const [marcas, setMarcas] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [imgError, setImgError] = useState({})

  const load = () => {
    setLoading(true)
    marcaService.getAll()
      .then(({ data }) => setMarcas(Array.isArray(data) ? data : []))
      .catch(() => toast({ message: 'Error al cargar marcas', type: 'error' }))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openNew = () => { setEditing(null); setForm(EMPTY); setModalOpen(true) }
  const openEdit = (m) => {
    setEditing(m)
    setForm({ nombreMarca: m.nombreMarca ?? '', logoUrl: m.logoUrl ?? '' })
    setModalOpen(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.nombreMarca.trim()) {
      toast({ message: 'El nombre es requerido', type: 'error' })
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await marcaService.update(editing.id, form)
        toast({ message: 'Marca actualizada', type: 'success' })
      } else {
        await marcaService.create(form)
        toast({ message: 'Marca creada', type: 'success' })
      }
      setModalOpen(false)
      load()
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Error al guardar', type: 'error' })
    } finally { setSaving(false) }
  }

  const handleDelete = async (id, nombre) => {
    if (!confirm(`¿Eliminar marca "${nombre}"?`)) return
    try {
      await marcaService.delete(id)
      toast({ message: 'Marca eliminada', type: 'success' })
      setMarcas((prev) => prev.filter((m) => m.id !== id))
    } catch {
      toast({ message: 'Error al eliminar', type: 'error' })
    }
  }

  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }))

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#e8e8ed]">Marcas</h1>
            <p className="text-sm text-[#8e8e9a] mt-1">{marcas.length} marca{marcas.length !== 1 ? 's' : ''} registrada{marcas.length !== 1 ? 's' : ''}</p>
          </div>
          <Button onClick={openNew}>+ Nueva marca</Button>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        ) : (
          <div className="bg-[#111114] border border-white/8 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/8">
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[#8e8e9a] w-16">ID</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[#8e8e9a] w-20">Logo</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[#8e8e9a]">Nombre</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[#8e8e9a]">URL de imagen</th>
                  <th className="px-5 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wider text-[#8e8e9a] w-28">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {marcas.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-[#8e8e9a]">
                      No hay marcas registradas. Crea la primera.
                    </td>
                  </tr>
                )}
                {marcas.map((m) => (
                  <tr key={m.id} className="hover:bg-white/3 transition-colors">
                    <td className="px-5 py-4 text-[#8e8e9a] font-mono text-xs">{m.id}</td>
                    <td className="px-5 py-4">
                      <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                        {m.logoUrl && !imgError[m.id] ? (
                          <img
                            src={m.logoUrl}
                            alt={m.nombreMarca}
                            className="w-full h-full object-contain p-1"
                            onError={() => setImgError((p) => ({ ...p, [m.id]: true }))}
                          />
                        ) : (
                          <span className="text-lg opacity-30">🏷</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 font-semibold text-[#e8e8ed]">{m.nombreMarca}</td>
                    <td className="px-5 py-4 text-[#8e8e9a] max-w-xs">
                      {m.logoUrl ? (
                        <span className="truncate block text-xs font-mono opacity-60" title={m.logoUrl}>
                          {m.logoUrl}
                        </span>
                      ) : (
                        <span className="text-xs italic opacity-40">Sin imagen</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(m)}
                          className="p-2 rounded-xl text-[#8e8e9a] hover:text-white hover:bg-white/8 transition-colors"
                          title="Editar"
                        >
                          <EditIcon />
                        </button>
                        <button
                          onClick={() => handleDelete(m.id, m.nombreMarca)}
                          className="p-2 rounded-xl text-[#8e8e9a] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Eliminar"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal crear/editar */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar marca' : 'Nueva marca'}
      >
        <form onSubmit={handleSave} className="space-y-5">
          <Input
            label="Nombre *"
            value={form.nombreMarca}
            onChange={set('nombreMarca')}
            placeholder="Ej: Samsung, Apple, Nike..."
            required
          />

          <div className="space-y-2">
            <Input
              label="URL del logo"
              value={form.logoUrl}
              onChange={set('logoUrl')}
              placeholder="https://..."
            />
            {/* Preview */}
            {form.logoUrl && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center overflow-hidden shrink-0">
                  <img
                    src={form.logoUrl}
                    alt="Preview"
                    className="w-full h-full object-contain p-1"
                    onError={(e) => { e.target.style.display = 'none' }}
                  />
                </div>
                <span className="text-xs text-[#8e8e9a]">Vista previa del logo</span>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-1">
            <Button type="submit" loading={saving} className="flex-1">
              {editing ? 'Guardar cambios' : 'Crear marca'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>
    </AdminLayout>
  )
}

function EditIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  )
}
