import { useState, useEffect, type ChangeEvent, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import PhoneField from '@/components/ui/PhoneField'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import Spinner from '@/components/ui/Spinner'
import { warehouseService } from '@/services/orderService'
import { useToast } from '@/components/ui/Toast'
import ImportExportBar from '@/components/admin/ImportExportBar'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import CloseIcon from '@/components/ui/CloseIcon'
import TextoMas from '@/components/ui/TextoMas'
import type { Id, JsonBody } from '@/types/api'

type FormBodega = {
  nombreBodega: string
  direccionExacta: string
  telefono: string
  correoContacto: string
  encargadoNombre: string
  permiteRetiroCliente: boolean
}

type BodegaAdmin = FormBodega & {
  id: Id
  empresaLogoUrl?: string | null
  empresaNombre?: string | null
}

type DeleteTarget = { id: Id; nombre: string }

const EMPTY: FormBodega = { nombreBodega: '', direccionExacta: '', telefono: '', correoContacto: '', encargadoNombre: '', permiteRetiroCliente: false }

function mensajeErrorBodega(err: unknown, fallback: string): string {
  if (typeof err !== 'object' || err === null || !('response' in err)) return fallback
  const message = (err as { response?: { data?: { message?: unknown } } }).response?.data?.message
  return typeof message === 'string' && message ? message : fallback
}

function listaBodegas(data: unknown): BodegaAdmin[] {
  return Array.isArray(data) ? data as BodegaAdmin[] : []
}

export default function AdminWarehouses() {
  const { t } = useTranslation()
  const toast = useToast()
  const [warehouses, setWarehouses] = useState<BodegaAdmin[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<BodegaAdmin | null>(null)
  const [form, setForm] = useState<FormBodega>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)

  const load = () => {
    setLoading(true)
    warehouseService.getAll()
      .then(({ data }) => setWarehouses(listaBodegas(data)))
      .catch((err: unknown) => { console.error('[AdminWarehouses] load', err) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openNew = () => { setEditing(null); setForm(EMPTY); setModalOpen(true) }
  const openEdit = (w: BodegaAdmin) => {
    setEditing(w)
    setForm({
      nombreBodega: w.nombreBodega ?? '',
      direccionExacta: w.direccionExacta ?? '',
      telefono: w.telefono ?? '',
      correoContacto: w.correoContacto ?? '',
      encargadoNombre: w.encargadoNombre ?? '',
      permiteRetiroCliente: w.permiteRetiroCliente ?? false,
    })
    setModalOpen(true)
  }

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editing) {
        await warehouseService.update(editing.id, form as JsonBody)
        toast({ message: 'Bodega actualizada', type: 'success' })
      } else {
        await warehouseService.create(form as JsonBody)
        toast({ message: 'Bodega creada', type: 'success' })
      }
      setModalOpen(false)
      load()
    } catch (err: unknown) {
      toast({ message: mensajeErrorBodega(err, 'Error al guardar'), type: 'error' })
    } finally { setSaving(false) }
  }

  const handleDelete = (id: Id, nombre: string) => setDeleteTarget({ id, nombre })

  const confirmDelete = async () => {
    if (!deleteTarget) return
    const { id } = deleteTarget
    setDeleteTarget(null)
    try {
      await warehouseService.delete(id)
      toast({ message: 'Bodega eliminada', type: 'success' })
      setWarehouses((p) => p.filter((w) => w.id !== id))
    } catch { toast({ message: 'Error al eliminar', type: 'error' }) }
  }

  const set = (f: Exclude<keyof FormBodega, 'permiteRetiroCliente'>) => (e: ChangeEvent<HTMLInputElement>) => setForm((p) => ({ ...p, [f]: e.target.value }))

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--hc-text)' }}>{t('admin.warehouses.title')}</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--hc-muted)' }}>{warehouses.length} registradas</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <ImportExportBar
              data={warehouses.map((w) => ({
                id: w.id, nombreBodega: w.nombreBodega, direccionExacta: w.direccionExacta,
                telefono: w.telefono, correoContacto: w.correoContacto ?? '', encargadoNombre: w.encargadoNombre ?? '',
              }))}
              columns={['id','nombreBodega','direccionExacta','telefono','correoContacto','encargadoNombre']}
              filename="bodegas"
              sheetName="Bodegas"
              importColumns={['nombreBodega','direccionExacta','telefono','correoContacto','encargadoNombre']}
              mapImportRow={(row) => ({
                nombreBodega: String(row.nombreBodega ?? ''),
                direccionExacta: String(row.direccionExacta ?? ''),
                telefono: String(row.telefono ?? ''),
                correoContacto: String(row.correoContacto ?? ''),
                encargadoNombre: String(row.encargadoNombre ?? ''),
              })}
              onImport={async (rows) => {
                await warehouseService.importBulk(rows as JsonBody[])
                load()
              }}
            />
            <Button onClick={openNew}><TextoMas>{t('admin.warehouses.new')}</TextoMas></Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {warehouses.map((w) => (
              <div key={w.id} className="rounded-2xl p-5 space-y-3" style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Logo negocio */}
                    {w.empresaLogoUrl ? (
                      <img src={w.empresaLogoUrl} alt={w.empresaNombre ?? 'Negocio'}
                        className="w-10 h-10 rounded-xl object-contain p-1 shrink-0"
                        style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)' }} />
                    ) : (
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold"
                        style={{ backgroundColor: 'rgba(23,71,168,0.1)', color: 'var(--hc-accent)', border: '1px solid rgba(23,71,168,0.2)' }}>
                        {(w.nombreBodega ?? 'B').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <h3 className="font-semibold truncate" style={{ color: 'var(--hc-text)' }}>{w.nombreBodega}</h3>
                      {w.empresaNombre && (
                        <p className="text-xs truncate" style={{ color: 'var(--hc-muted)' }}>{w.empresaNombre}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0 ml-2">
                    <button type="button" onClick={() => openEdit(w)} aria-label="Editar bodega" className="p-1.5 rounded-lg transition-colors hover:bg-[var(--hc-surface-2)]" style={{ color: 'var(--hc-muted)' }}>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 3.487a2.25 2.25 0 113.182 3.182L8.25 18.463 3 19.5l1.037-5.25 12.825-10.763z" />
                      </svg>
                    </button>
                    <button type="button" onClick={() => handleDelete(w.id, w.nombreBodega ?? '')} aria-label="Eliminar bodega" className="p-1.5 rounded-lg transition-colors hover:text-red-400 hover:bg-red-500/10" style={{ color: 'var(--hc-muted)' }}>
                      <CloseIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="space-y-1 text-xs" style={{ color: 'var(--hc-muted)' }}>
                  {w.direccionExacta && <div>{w.direccionExacta}</div>}
                  {w.telefono && <div>{w.telefono}</div>}
                  {w.correoContacto && <div>{w.correoContacto}</div>}
                  {w.encargadoNombre && <div>{w.encargadoNombre}</div>}
                </div>
                {w.permiteRetiroCliente && (
                  <Badge variant="success">Permite retiro de clientes</Badge>
                )}
              </div>
            ))}
            {warehouses.length === 0 && (
              <div className="col-span-full text-center py-12" style={{ color: 'var(--hc-muted)' }}>{t('common.noData')}</div>
            )}
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? t('admin.warehouses.edit') : t('admin.warehouses.new')} size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          <Input label="Nombre bodega *" value={form.nombreBodega} onChange={set('nombreBodega')} required placeholder="Bodega principal" />
          <Input label="Dirección exacta *" value={form.direccionExacta} onChange={set('direccionExacta')} required placeholder="San José, Costa Rica" />
          <PhoneField label="Teléfono" value={form.telefono} onChange={(val) => setForm((f) => ({ ...f, telefono: val }))} required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Correo contacto" value={form.correoContacto} onChange={set('correoContacto')} type="email" placeholder="Opcional" />
            <Input label="Encargado" value={form.encargadoNombre} onChange={set('encargadoNombre')} placeholder="Opcional" />
          </div>
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={form.permiteRetiroCliente}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setForm((p) => ({ ...p, permiteRetiroCliente: e.target.checked }))}
            />
            <span className="text-sm" style={{ color: 'var(--hc-text)' }}>Permite retiro de clientes en este local</span>
          </label>
          <p className="text-xs -mt-2" style={{ color: 'var(--hc-muted)' }}>
            Solo se ofrece "Retiro en tienda" en el checkout cuando todos los productos del carrito son de esta bodega.
          </p>
          <div className="flex gap-3 pt-1">
            <Button type="submit" loading={saving} className="flex-1">{editing ? t('common.save') : t('admin.warehouses.new')}</Button>
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>{t('common.cancel')}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Eliminar bodega"
        message={`¿Eliminar la bodega "${deleteTarget?.nombre}"? Los productos asignados a esta bodega quedarán sin bodega.`}
      />
    </>
  )
}
