import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import Spinner from '@/components/ui/Spinner'
import { marcaService } from '@/services/marcaService'
import { useToast } from '@/components/ui/Toast'
import ImportExportBar from '@/components/admin/ImportExportBar'
import { ConfirmModal } from '@/components/ui/ConfirmModal'

const EMPTY = { nombreMarca: '', logoUrl: '' }

export default function AdminMarcas() {
  const { t } = useTranslation()
  const toast = useToast()
  const [marcas, setMarcas] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [imgError, setImgError] = useState({})
  const [deleteTarget, setDeleteTarget] = useState(null)
  const fileInputRef = useRef(null)

  const load = () => {
    setLoading(true)
    marcaService.getAll()
      .then(({ data }) => setMarcas(Array.isArray(data) ? data : []))
      .catch(() => toast({ message: t('common.error'), type: 'error' }))
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
        toast({ message: t('admin.marcas.saved'), type: 'success' })
      } else {
        await marcaService.create(form)
        toast({ message: t('admin.marcas.saved'), type: 'success' })
      }
      setModalOpen(false)
      load()
    } catch (err) {
      toast({ message: err.response?.data?.message ?? t('common.error'), type: 'error' })
    } finally { setSaving(false) }
  }

  const handleDelete = (id, nombre) => setDeleteTarget({ id, nombre })

  const confirmDelete = async () => {
    if (!deleteTarget) return
    const { id } = deleteTarget
    setDeleteTarget(null)
    try {
      await marcaService.delete(id)
      toast({ message: t('admin.marcas.deleted'), type: 'success' })
      setMarcas((prev) => prev.filter((m) => m.id !== id))
    } catch {
      toast({ message: t('common.error'), type: 'error' })
    }
  }

  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }))

  const handleFile = useCallback(async (file) => {
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await marcaService.uploadLogo(fd)
      const url = res.data?.url ?? res.data
      setForm((p) => ({ ...p, logoUrl: url }))
    } catch {
      toast({ message: t('common.error'), type: 'error' })
    } finally {
      setUploading(false)
    }
  }, [])

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-[#e8e8ed]">{t('admin.marcas.title')}</h1>
            <p className="text-sm text-[#8e8e9a] mt-1">{marcas.length} marca{marcas.length !== 1 ? 's' : ''} registrada{marcas.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <ImportExportBar
              data={marcas.map((m) => ({ id: m.id, nombreMarca: m.nombreMarca, logoUrl: m.logoUrl ?? '' }))}
              columns={['id', 'nombreMarca', 'logoUrl']}
              filename="marcas"
              sheetName="Marcas"
              importColumns={['nombreMarca', 'logoUrl']}
              mapImportRow={(row) => ({ nombreMarca: row.nombreMarca ?? '', logoUrl: row.logoUrl ?? '' })}
              onImport={async (rows) => {
                await marcaService.importBulk(rows)
                load()
              }}
            />
            <Button onClick={openNew}>+ {t('admin.marcas.new')}</Button>
          </div>
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
                  <th className="px-5 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wider text-[#8e8e9a] w-28">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {marcas.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-14 text-center">
                      <p className="font-semibold text-[#e8e8ed] mb-1">Sin marcas registradas</p>
                      <p className="text-sm text-[#8e8e9a] mb-3">Las marcas aparecen en el catálogo y en cada producto.</p>
                      <button onClick={openNew} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80" style={{ backgroundColor: '#4f7cff', color: '#fff' }}>
                        + Crear primera marca
                      </button>
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
                          <svg className="w-4 h-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 font-semibold text-[#e8e8ed]">{m.nombreMarca}</td>
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
        title={editing ? t('admin.marcas.edit') : t('admin.marcas.new')}
      >
        <form onSubmit={handleSave} className="space-y-5">
          <Input
            label="Nombre *"
            value={form.nombreMarca}
            onChange={set('nombreMarca')}
            placeholder="Ej: Samsung, Apple, Nike..."
            required
          />

          {/* Logo upload */}
          <div className="space-y-2">
            <span className="text-xs font-medium text-[#8e8e9a] uppercase tracking-wider">Logo</span>
            {form.logoUrl ? (
              <div className="flex items-center justify-center">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                    <img
                      src={form.logoUrl}
                      alt="Logo"
                      className="w-full h-full object-contain p-2"
                      onError={(e) => { e.target.style.display = 'none' }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, logoUrl: '' }))}
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    title="Quitar logo"
                  >
                    <XIcon />
                  </button>
                </div>
              </div>
            ) : (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
                  dragOver
                    ? 'border-[#8c5cf6] bg-[#8c5cf6]/10'
                    : 'border-white/15 bg-white/3 hover:border-white/30 hover:bg-white/5'
                }`}
              >
                {uploading ? (
                  <Spinner size="sm" />
                ) : (
                  <>
                    <UploadIcon />
                    <p className="text-sm text-[#8e8e9a]">
                      <span className="text-white font-medium">Hacé clic</span> o arrastrá una imagen
                    </p>
                    <p className="text-xs text-[#8e8e9a]/60">PNG, JPG, SVG · máx. 5 MB</p>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files?.[0])}
                />
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-1">
            <Button type="submit" loading={saving} className="flex-1">
              {editing ? 'Guardar cambios' : 'Crear marca'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              {t('common.cancel')}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Eliminar marca"
        message={`¿Eliminar la marca "${deleteTarget?.nombre}"? Los productos que la usen quedarán sin marca asignada.`}
      />
    </>
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

function XIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function UploadIcon() {
  return (
    <svg className="w-8 h-8 text-[#8e8e9a]/50" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
  )
}
