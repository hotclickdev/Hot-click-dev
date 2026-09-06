import { useEffect, useState } from 'react'
import type { Dispatch, FormEvent, SetStateAction } from 'react'
import { warehouseService } from '@/services/orderService'
import { useToast } from '@/components/ui/Toast'
import Spinner from '@/components/ui/Spinner'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { Block, FormGroup, StyledInput, F, mensajeErrorConfig } from './configUi'
import TextoMas from '@/components/ui/TextoMas'
import type { Id, JsonBody } from '@/types/api'

const EMPTY = { nombreBodega: '', direccionExacta: '', telefono: '', encargadoNombre: '' }
const CARD_SHADOW = '0 1px 2px rgba(26,26,26,0.04), 0 8px 20px rgba(26,26,26,0.06)'

type ToastFn = ReturnType<typeof useToast>
type BodegaForm = typeof EMPTY
type CampoBodega = keyof BodegaForm
type Bodega = BodegaForm & { id: Id }

type GuardarCtx = {
  form: BodegaForm
  editingId: Id | null
  setSaving: (v: boolean) => void
  setFormOpen: (v: boolean) => void
  cargar: () => void
  toast: ToastFn
}

/**
 * Bodegas del dueño — listado simple, sin importar CSV de admin.
 */
export default function SeccionBodega() {
  const toast = useToast()
  const [bodegas, setBodegas] = useState<Bodega[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState<BodegaForm>(EMPTY)
  const [editingId, setEditingId] = useState<Id | null>(null)
  const [saving, setSaving] = useState(false)
  const [borrar, setBorrar] = useState<Bodega | null>(null)

  const cargar = () => {
    setLoading(true)
    warehouseService.getAll()
      .then(({ data }) => setBodegas(Array.isArray(data) ? data as Bodega[] : []))
      .catch(() => toast({ message: 'No se pudieron cargar las bodegas', type: 'error' }))
      .finally(() => setLoading(false))
  }

  useEffect(() => { cargar() }, []) // eslint-disable-line react-hooks/exhaustive-deps -- carga al montar

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="m-0 text-[17px] font-bold" style={{ fontFamily: F.display }}>Bodega</h2>
          <p className="m-0 mt-1 text-sm" style={{ color: 'var(--hc-muted)' }}>
            {textoConteoBodegas(bodegas.length)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setEditingId(null); setForm(EMPTY); setFormOpen(true) }}
          className="cfg-btn cfg-btn-primary"
        >
          <TextoMas>Agregá una bodega</TextoMas>
        </button>
      </header>

      {formOpen && (
        <FormBodega
          form={form}
          setForm={setForm}
          saving={saving}
          onCancel={() => setFormOpen(false)}
          onSave={(e) => guardarBodega(e, { form, editingId, setSaving, setFormOpen, cargar, toast })}
        />
      )}

      {loading && <div className="flex justify-center py-10"><Spinner size="lg" /></div>}
      {!loading && bodegas.length === 0 && !formOpen && (
        <p className="text-sm py-8 text-center m-0" style={{ color: 'var(--hc-muted)' }}>
          Todavía no registraste una bodega. Agregá dónde guardás el inventario.
        </p>
      )}
      {!loading && bodegas.map((b) => (
        <TarjetaBodega
          key={b.id}
          bodega={b}
          onEdit={() => { setEditingId(b.id); setForm(formDesdeBodega(b)); setFormOpen(true) }}
          onDelete={() => setBorrar(b)}
        />
      ))}

      <ConfirmModal
        open={!!borrar}
        onClose={() => setBorrar(null)}
        onConfirm={() => confirmarBorrado(borrar, setBorrar, setBodegas, toast)}
        title="Eliminar bodega"
        message={`¿Eliminar ${borrar?.nombreBodega ?? 'esta bodega'}?`}
        confirmLabel="Eliminar"
      />
    </div>
  )
}

function textoConteoBodegas(n: number) {
  if (n === 0) return 'Todavía no tenés bodegas registradas.'
  if (n === 1) return 'Tenés 1 bodega registrada.'
  return `Tenés ${n} bodegas registradas.`
}

function formDesdeBodega(b: Bodega): BodegaForm {
  return {
    nombreBodega: b.nombreBodega ?? '',
    direccionExacta: b.direccionExacta ?? '',
    telefono: b.telefono ?? '',
    encargadoNombre: b.encargadoNombre ?? '',
  }
}

async function guardarBodega(e: FormEvent, ctx: GuardarCtx) {
  e.preventDefault()
  if (!ctx.form.nombreBodega.trim()) {
    ctx.toast({ message: 'El nombre de la bodega es obligatorio', type: 'error' })
    return
  }
  ctx.setSaving(true)
  try {
    if (ctx.editingId) await warehouseService.update(ctx.editingId, ctx.form as unknown as JsonBody)
    else await warehouseService.create(ctx.form as unknown as JsonBody)
    ctx.toast({ message: ctx.editingId ? 'Bodega actualizada' : 'Bodega creada', type: 'success' })
    ctx.setFormOpen(false)
    ctx.cargar()
  } catch (err: unknown) {
    ctx.toast({ message: mensajeErrorConfig(err, 'No se pudo guardar'), type: 'error' })
  } finally {
    ctx.setSaving(false)
  }
}

async function confirmarBorrado(
  borrar: Bodega | null,
  setBorrar: (v: Bodega | null) => void,
  setBodegas: Dispatch<SetStateAction<Bodega[]>>,
  toast: ToastFn,
) {
  if (!borrar) return
  const { id } = borrar
  setBorrar(null)
  try {
    await warehouseService.delete(id)
    toast({ message: 'Bodega eliminada', type: 'success' })
    setBodegas((prev) => prev.filter((b) => b.id !== id))
  } catch {
    toast({ message: 'No se pudo eliminar', type: 'error' })
  }
}

function FormBodega({ form, setForm, saving, onCancel, onSave }: {
  form: BodegaForm
  setForm: Dispatch<SetStateAction<BodegaForm>>
  saving: boolean
  onCancel: () => void
  onSave: (e: FormEvent) => void
}) {
  const set = (k: CampoBodega) => (e: { target: { value: string } }) => setForm((p) => ({ ...p, [k]: e.target.value }))
  return (
    <Block label={form.nombreBodega ? 'Editá la bodega' : 'Nueva bodega'}>
      <form onSubmit={onSave} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <FormGroup label="Nombre">
          <StyledInput value={form.nombreBodega} onChange={set('nombreBodega')} required placeholder="Bodega Central" />
        </FormGroup>
        <FormGroup label="Dirección">
          <StyledInput value={form.direccionExacta} onChange={set('direccionExacta')} placeholder="San Marcos, 100 m sur de la iglesia" />
        </FormGroup>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormGroup label="Teléfono">
            <StyledInput value={form.telefono} onChange={set('telefono')} placeholder="8812-0034" />
          </FormGroup>
          <FormGroup label="Encargado">
            <StyledInput value={form.encargadoNombre} onChange={set('encargadoNombre')} placeholder="Nombre" />
          </FormGroup>
        </div>
        <div className="flex gap-2">
          <button type="submit" disabled={saving} className="cfg-btn cfg-btn-primary">{saving ? 'Guardando…' : 'Guardá'}</button>
          <button type="button" onClick={onCancel} className="cfg-btn cfg-btn-ghost">Cancelar</button>
        </div>
      </form>
    </Block>
  )
}

function TarjetaBodega({ bodega, onEdit, onDelete }: { bodega: Bodega; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="rounded-2xl p-5 flex flex-col gap-2" style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)', boxShadow: CARD_SHADOW }}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold text-[16px]" style={{ fontFamily: F.display }}>{bodega.nombreBodega}</span>
        <div className="flex gap-2">
          <button type="button" onClick={onEdit} className="text-sm font-semibold" style={{ color: 'var(--hc-link)' }}>Editá</button>
          <button type="button" onClick={onDelete} className="text-sm font-semibold" style={{ color: 'var(--hc-danger)' }}>Eliminá</button>
        </div>
      </div>
      {bodega.encargadoNombre && (
        <p className="m-0 text-[13px]" style={{ color: 'var(--hc-muted)' }}>Encargado: <span style={{ color: 'var(--hc-text)', fontWeight: 600 }}>{bodega.encargadoNombre}</span></p>
      )}
      {bodega.direccionExacta && (
        <p className="m-0 text-[13px]" style={{ color: 'var(--hc-muted)' }}>{bodega.direccionExacta}</p>
      )}
      {bodega.telefono && (
        <p className="m-0 text-[13px]" style={{ color: 'var(--hc-muted)' }}>{bodega.telefono}</p>
      )}
    </div>
  )
}
