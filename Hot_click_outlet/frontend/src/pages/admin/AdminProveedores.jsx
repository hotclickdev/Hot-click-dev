import { useState, useEffect } from 'react'
import { compraService } from '@/services/compraService'
import { useToast } from '@/components/ui/Toast'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { EMPTY_PROVEEDOR } from './proveedores/proveedoresHelpers'
import { useAdminProveedoresActions } from './proveedores/useAdminProveedoresActions'
import ProveedorFormModal from './proveedores/ProveedorFormModal'
import ProveedoresTable, { ProveedorCostosModal } from './proveedores/ProveedoresTable'

export default function AdminProveedores() {
  const { showToast } = useToast()
  const [proveedores, setProveedores] = useState([])
  const [loading, setLoading]         = useState(true)
  const [modalOpen, setModalOpen]     = useState(false)
  const [editing, setEditing]         = useState(null)
  const [form, setForm]               = useState(EMPTY_PROVEEDOR)
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

  const {
    openNew,
    openEdit,
    openCostos,
    handleSave,
    handleDelete,
  } = useAdminProveedoresActions({
    showToast,
    form,
    editing,
    deleteTarget,
    setProveedores,
    setLoading,
    setModalOpen,
    setEditing,
    setForm,
    setSaving,
    setDeleteTarget,
    setCostosTarget,
    setHistorial,
    setLoadingHistorial,
    load,
  })

  const setField = (field, val) => setForm(f => ({ ...f, [field]: val }))

  return (
    <div className="p-6 space-y-5 max-w-4xl mx-auto">
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
        <ProveedoresTable
          proveedores={proveedores}
          onCostos={openCostos}
          onEdit={openEdit}
          onDelete={setDeleteTarget}
        />
      )}

      {modalOpen && (
        <ProveedorFormModal
          editing={editing}
          form={form}
          saving={saving}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
          onSetField={setField}
        />
      )}

      <ProveedorCostosModal
        costosTarget={costosTarget}
        historial={historial}
        loadingHistorial={loadingHistorial}
        onClose={() => setCostosTarget(null)}
      />

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
