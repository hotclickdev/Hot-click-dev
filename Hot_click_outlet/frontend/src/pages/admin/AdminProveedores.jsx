import { useState, useEffect } from 'react'
import { compraService } from '@/services/compraService'
import { useToast } from '@/components/ui/Toast'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import PhoneField from '@/components/ui/PhoneField'
import { formatPrice } from '@/utils/format'

const EMPTY = { nombre: '', contacto: '', telefono: '', correo: '', notas: '', tipo: 'PRODUCTO_TERMINADO' }

function Field({ label, value, onChange, type = 'text', placeholder = '' }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--hc-muted)' }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-xl text-sm outline-none"
        style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--hc-text)' }}
      />
    </div>
  )
}

export default function AdminProveedores() {
  const { showToast } = useToast()
  const [proveedores, setProveedores] = useState([])
  const [loading, setLoading]         = useState(true)
  const [modalOpen, setModalOpen]     = useState(false)
  const [editing, setEditing]         = useState(null)
  const [form, setForm]               = useState(EMPTY)
  const [saving, setSaving]           = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [costosTarget, setCostosTarget] = useState(null)
  const [historial, setHistorial]       = useState([])
  const [loadingHistorial, setLoadingHistorial] = useState(false)

  const load = () => {
    setLoading(true)
    compraService.listarProveedores()
      .then(setProveedores)
      .catch(() => showToast('Error al cargar proveedores', 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const openNew  = () => { setEditing(null); setForm(EMPTY); setModalOpen(true) }
  const openEdit = (p) => { setEditing(p); setForm({ nombre: p.nombre, contacto: p.contacto ?? '', telefono: p.telefono ?? '', correo: p.correo ?? '', notas: p.notas ?? '', tipo: p.tipo ?? 'PRODUCTO_TERMINADO' }); setModalOpen(true) }

  const openCostos = (p) => {
    setCostosTarget(p)
    setLoadingHistorial(true)
    compraService.historialCostosProveedor(p.id)
      .then(setHistorial)
      .catch(() => showToast('Error al cargar historial de costos', 'error'))
      .finally(() => setLoadingHistorial(false))
  }

  const set = (field) => (val) => setForm(f => ({ ...f, [field]: val }))

  const handleSave = async () => {
    if (!form.nombre.trim()) { showToast('El nombre es requerido', 'error'); return }
    setSaving(true)
    try {
      if (editing) {
        await compraService.actualizarProveedor(editing.id, form)
        showToast('Proveedor actualizado', 'success')
      } else {
        await compraService.crearProveedor(form)
        showToast('Proveedor creado', 'success')
      }
      setModalOpen(false)
      load()
    } catch {
      showToast('Error al guardar proveedor', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await compraService.eliminarProveedor(deleteTarget.id)
      showToast('Proveedor eliminado', 'success')
      setDeleteTarget(null)
      load()
    } catch {
      showToast('Error al eliminar', 'error')
    }
  }

  return (
    <div className="p-6 space-y-5 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--hc-text)' }}>Proveedores</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--hc-muted)' }}>{proveedores.length} proveedor{proveedores.length === 1 ? '' : 'es'} activo{proveedores.length === 1 ? '' : 's'}</p>
        </div>
        <button onClick={openNew}
          className="px-4 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
          style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}>
          + Nuevo proveedor
        </button>
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 rounded-full animate-spin"
            style={{ borderColor: 'var(--hc-accent)', borderTopColor: 'transparent' }}/>
        </div>
      ) : proveedores.length === 0 ? (
        <div className="text-center py-16 rounded-2xl"
          style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>No hay proveedores registrados</p>
          <button onClick={openNew} className="mt-3 text-sm font-medium" style={{ color: 'var(--hc-accent)' }}>
            + Agregar el primero
          </button>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden border" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                {['Proveedor', 'Tipo', 'Contacto', 'Teléfono', 'Correo', 'Acciones'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium" style={{ color: 'var(--hc-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {proveedores.map(p => (
                <tr key={p.id} className="border-t transition-colors hover:bg-white/[0.02]"
                  style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-sm" style={{ color: 'var(--hc-text)' }}>{p.nombre}</p>
                    {p.notas && <p className="text-[10px] mt-0.5 line-clamp-1" style={{ color: 'var(--hc-muted)' }}>{p.notas}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-medium"
                      style={p.tipo === 'MATERIA_PRIMA'
                        ? { backgroundColor: 'rgba(245,158,11,0.12)', color: '#f59e0b' }
                        : { backgroundColor: 'rgba(255,255,255,0.06)', color: 'var(--hc-muted)' }}>
                      {p.tipo === 'MATERIA_PRIMA' ? 'Materia prima' : 'Producto terminado'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--hc-muted)' }}>{p.contacto || '—'}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--hc-muted)' }}>{p.telefono || '—'}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--hc-muted)' }}>{p.correo || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openCostos(p)}
                        className="px-3 py-1 text-xs rounded-lg transition-colors hover:bg-white/10"
                        style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--hc-muted)' }}>
                        Costos
                      </button>
                      <button onClick={() => openEdit(p)}
                        className="px-3 py-1 text-xs rounded-lg transition-colors hover:bg-white/10"
                        style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--hc-muted)' }}>
                        Editar
                      </button>
                      <button onClick={() => setDeleteTarget(p)}
                        className="px-3 py-1 text-xs rounded-lg transition-colors"
                        style={{ backgroundColor: 'rgba(239,68,68,0.08)', color: '#f87171' }}>
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Modal crear/editar */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-md rounded-2xl p-6 space-y-4"
            style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center justify-between">
              <h2 className="font-bold" style={{ color: 'var(--hc-text)' }}>
                {editing ? 'Editar proveedor' : 'Nuevo proveedor'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-70"
                style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'var(--hc-muted)' }}>✕</button>
            </div>

            <Field label="Nombre *"   value={form.nombre}   onChange={set('nombre')}   placeholder="Ej: Distribuidora ABC" />
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--hc-muted)' }}>Tipo de proveedor</label>
              <select value={form.tipo} onChange={e => set('tipo')(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--hc-text)' }}>
                <option value="PRODUCTO_TERMINADO">Producto terminado</option>
                <option value="MATERIA_PRIMA">Materia prima</option>
              </select>
            </div>
            <Field label="Contacto"   value={form.contacto} onChange={set('contacto')} placeholder="Nombre del contacto" />
            <PhoneField
              label="Teléfono"
              value={form.telefono}
              onChange={set('telefono')}
            />
            <Field label="Correo" value={form.correo} onChange={set('correo')} type="email" placeholder="proveedor@mail.com" />
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--hc-muted)' }}>Notas</label>
              <textarea value={form.notas} onChange={e => set('notas')(e.target.value)} rows={2}
                placeholder="Condiciones de pago, observaciones…"
                className="w-full px-3 py-2 rounded-xl text-sm outline-none resize-none"
                style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--hc-text)' }}/>
            </div>

            <div className="flex gap-3 pt-1">
              <button onClick={() => setModalOpen(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'var(--hc-muted)' }}>
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-40"
                style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}>
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal historial de costos */}
      {costosTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-lg rounded-2xl p-6 space-y-4 max-h-[80vh] overflow-y-auto"
            style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center justify-between">
              <h2 className="font-bold" style={{ color: 'var(--hc-text)' }}>
                Costos — {costosTarget.nombre}
              </h2>
              <button onClick={() => setCostosTarget(null)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-70"
                style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'var(--hc-muted)' }}>✕</button>
            </div>
            <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>
              Precios pagados en órdenes de compra a este proveedor.
            </p>

            {loadingHistorial ? (
              <div className="flex justify-center py-10">
                <div className="w-6 h-6 border-2 rounded-full animate-spin"
                  style={{ borderColor: 'var(--hc-accent)', borderTopColor: 'transparent' }}/>
              </div>
            ) : historial.length === 0 ? (
              <p className="text-sm text-center py-10" style={{ color: 'var(--hc-muted)' }}>
                Todavía no hay órdenes de compra registradas para este proveedor.
              </p>
            ) : (
              <div className="space-y-2">
                {historial.map((h, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 rounded-xl"
                    style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--hc-text)' }}>{h.producto}</p>
                      <p className="text-[10px]" style={{ color: 'var(--hc-muted)' }}>
                        Orden {h.numeroOrden} · {h.estadoOrden} · {new Date(h.fechaOrden).toLocaleDateString('es-CR')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>{formatPrice(h.precioUnitario)}</p>
                      <p className="text-[10px]" style={{ color: 'var(--hc-muted)' }}>x{h.cantidad}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="Eliminar proveedor"
        message={`¿Eliminar a "${deleteTarget?.nombre}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
