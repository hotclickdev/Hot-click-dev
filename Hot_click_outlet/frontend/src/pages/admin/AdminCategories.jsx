import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import Spinner from '@/components/ui/Spinner'
import api from '@/services/api'
import { useToast } from '@/components/ui/Toast'
import { categoriaService } from '@/services/orderService'
import ImportExportBar from '@/components/admin/ImportExportBar'
import { ConfirmModal } from '@/components/ui/ConfirmModal'

const EMPTY = { nombreCategoria: '', descripcion: '', padreId: '' }

// ── Árbol ────────────────────────────────────────────────────────────
function buildTree(cats) {
  const map = {}
  cats.forEach((c) => { map[c.id] = { ...c, children: [] } })
  const roots = []
  cats.forEach((c) => {
    if (c.padreId && map[c.padreId]) map[c.padreId].children.push(map[c.id])
    else roots.push(map[c.id])
  })
  return roots
}

function CategoryCard({ node, onEdit, onDelete, onAddSub }) {
  const [open, setOpen] = useState(true)
  const hasSubs = node.children.length > 0

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ border: '1px solid rgba(23,71,168,0.2)', backgroundColor: '#0e0e12' }}>
      {/* Encabezado grupo */}
      <div className="flex items-center justify-between px-4 py-3.5"
        style={{ backgroundColor: 'rgba(23,71,168,0.07)', borderBottom: hasSubs && open ? '1px solid rgba(23,71,168,0.12)' : 'none' }}>
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-lg font-bold"
            style={{ backgroundColor: 'rgba(23,71,168,0.15)', color: 'var(--hc-accent)' }}>
            {node.nombreCategoria.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-[#e8e8ed] text-sm truncate">{node.nombreCategoria}</p>
            {node.descripcion && (
              <p className="text-xs text-[#8e8e9a] truncate">{node.descripcion}</p>
            )}
          </div>
          {hasSubs && (
            <span className="ml-1 shrink-0 text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: 'rgba(23,71,168,0.15)', color: '#7aa3ff' }}>
              {node.children.length} sub
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          <button onClick={() => onAddSub(node)}
            className="px-2 py-1 rounded-lg text-xs font-medium transition-colors"
            style={{ backgroundColor: 'rgba(23,71,168,0.12)', color: '#7aa3ff' }}
            title="Agregar subcategoría">
            + sub
          </button>
          <button onClick={() => onEdit(node)}
            className="p-1.5 text-[#8e8e9a] hover:text-white hover:bg-white/8 rounded-lg transition-colors text-sm">✎</button>
          <button onClick={() => onDelete(node)}
            className="p-1.5 text-[#8e8e9a] hover:text-red-400 hover:bg-red-500/8 rounded-lg transition-colors text-sm">✕</button>
          {hasSubs && (
            <button onClick={() => setOpen(p => !p)}
              className="p-1.5 text-[#8e8e9a] hover:text-white rounded-lg transition-colors text-xs">
              {open ? '▾' : '▸'}
            </button>
          )}
        </div>
      </div>

      {/* Subcategorías en grid */}
      {hasSubs && open && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 p-3">
          {node.children.map(sub => (
            <div key={sub.id}
              className="flex items-center justify-between px-3 py-2.5 rounded-xl group"
              style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-[#e8e8ed] truncate">{sub.nombreCategoria}</p>
                {sub.descripcion && (
                  <p className="text-[11px] text-[#8e8e9a] truncate">{sub.descripcion}</p>
                )}
              </div>
              <div className="flex gap-0.5 shrink-0 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => onEdit(sub)}
                  className="p-1 text-[#8e8e9a] hover:text-white rounded text-xs">✎</button>
                <button onClick={() => onDelete(sub)}
                  className="p-1 text-[#8e8e9a] hover:text-red-400 rounded text-xs">✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Componente principal ─────────────────────────────────────────────
export default function AdminCategories() {
  const { t } = useTranslation()
  const toast = useToast()
  const [cats, setCats] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const load = () => {
    setLoading(true)
    api.get('/categorias')
      .then(({ data }) => setCats(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const tree = useMemo(() => buildTree(cats), [cats])

  // Opciones de padre: todas menos la categoría que se está editando y sus descendientes
  const padreOptions = useMemo(() => {
    if (!editing) return cats
    const descIds = new Set()
    function collectDesc(id) {
      descIds.add(String(id))
      cats.filter((c) => String(c.padreId) === String(id))
        .forEach((c) => collectDesc(c.id))
    }
    collectDesc(editing.id)
    return cats.filter((c) => !descIds.has(String(c.id)))
  }, [cats, editing])

  const openNew = (presetPadreId = '') => {
    setEditing(null)
    setForm({ ...EMPTY, padreId: presetPadreId ? String(presetPadreId) : '' })
    setModalOpen(true)
  }
  const openEdit = (c) => {
    setEditing(c)
    setForm({
      nombreCategoria: c.nombreCategoria ?? '',
      descripcion:     c.descripcion ?? '',
      padreId:         c.padreId ? String(c.padreId) : '',
    })
    setModalOpen(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { ...form }
      if (editing) {
        await api.put(`/categorias/${editing.id}`, payload)
        toast({ message: 'Categoría actualizada', type: 'success' })
      } else {
        await api.post('/categorias', payload)
        toast({ message: 'Categoría creada', type: 'success' })
      }
      setModalOpen(false)
      load()
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Error al guardar', type: 'error' })
    } finally { setSaving(false) }
  }

  const handleDelete = (node) => setDeleteTarget({ id: node.id, nombre: node.nombreCategoria })

  const confirmDelete = async () => {
    if (!deleteTarget) return
    const { id } = deleteTarget
    setDeleteTarget(null)
    try {
      await api.delete(`/categorias/${id}`)
      toast({ message: 'Categoría eliminada', type: 'success' })
      load()
    } catch { toast({ message: 'Error al eliminar', type: 'error' }) }
  }

  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }))

  // Padre display label para opciones (indent)
  function padreLabel(c) {
    if (!c.padreId) return c.nombreCategoria
    const padre = cats.find((x) => String(x.id) === String(c.padreId))
    return `↳ ${c.nombreCategoria}${padre ? ` (en ${padre.nombreCategoria})` : ''}`
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-[#e8e8ed]">{t('admin.categories.title')}</h1>
            <p className="text-sm text-[#8e8e9a] mt-1">
              {cats.filter((c) => !c.padreId).length} grupos •{' '}
              {cats.filter((c) => c.padreId).length} subcategorías
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <ImportExportBar
              data={cats.map((c) => ({
                id: c.id,
                nombreCategoria: c.nombreCategoria,
                descripcion: c.descripcion ?? '',
                padreId: c.padreId ?? '',
                padreNombre: c.padreNombre ?? '',
              }))}
              columns={['id', 'nombreCategoria', 'descripcion', 'padreId', 'padreNombre']}
              filename="categorias"
              sheetName="Categorías"
              importColumns={['nombreCategoria', 'descripcion', 'padreId']}
              mapImportRow={(row) => ({
                nombreCategoria: row.nombreCategoria ?? '',
                descripcion:     row.descripcion ?? '',
                padreId:         row.padreId ?? '',
              })}
              onImport={async (rows) => {
                await categoriaService.importBulk(rows)
                load()
              }}
            />
            <Button onClick={() => openNew()}>+ Nuevo grupo</Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        ) : cats.length === 0 ? (
          <div className="text-center py-14 space-y-3">
            <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center"
              style={{ backgroundColor: 'rgba(23,71,168,0.08)', border: '1px solid rgba(23,71,168,0.15)' }}>
              <svg className="w-7 h-7" style={{ color: 'var(--hc-accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
                <line x1="7" y1="7" x2="7.01" y2="7"/>
              </svg>
            </div>
            <p className="font-semibold text-[#e8e8ed]">Sin categorías todavía</p>
            <p className="text-sm text-[#8e8e9a] max-w-xs mx-auto">
              Las categorías organizan tu catálogo. Los productos las necesitan para publicarse.
            </p>
            <button
              onClick={openNew}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold mt-1 transition-opacity hover:opacity-80"
              style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}
            >+ Crear primera categoría</button>
          </div>
        ) : (
          <div className="space-y-3">
            {tree.map((node) => (
              <CategoryCard
                key={node.id}
                node={node}
                onEdit={openEdit}
                onDelete={handleDelete}
                onAddSub={(parent) => openNew(parent.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal crear/editar */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? t('admin.categories.edit') : t('admin.categories.new')}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input label="Nombre *" value={form.nombreCategoria} onChange={set('nombreCategoria')} required />
          <Input label="Descripción" value={form.descripcion} onChange={set('descripcion')} />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#e8e8ed]">Grupo al que pertenece (opcional)</label>
            <select
              value={form.padreId}
              onChange={set('padreId')}
              className="h-11 px-3 rounded-xl bg-white/5 border border-white/10 text-[#e8e8ed] text-sm focus:outline-none focus:border-[#4f7cff]/60"
            >
              <option value="">Ninguno — categoría principal</option>
              {padreOptions.map((c) => (
                <option key={c.id} value={c.id}>{padreLabel(c)}</option>
              ))}
            </select>
            <p className="text-xs text-[#8e8e9a]">
              Si elegís un grupo, esta pasa a ser subcategoría dentro de él.
            </p>
          </div>

          <div className="flex gap-3 pt-1">
            <Button type="submit" loading={saving} className="flex-1">
              {editing ? 'Guardar cambios' : form.padreId ? 'Crear subcategoría' : 'Crear grupo'}
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
        title="Eliminar categoría"
        message={`¿Eliminar "${deleteTarget?.nombre}"? Las subcategorías y productos con esta categoría quedarán sin padre.`}
      />
    </>
  )
}
