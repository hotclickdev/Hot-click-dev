import { useState, useRef } from 'react'
import CategoriaSelect from '@/components/admin/CategoriaSelect'
import { MAX_EXTRA, IMAGE_MAX_BYTES, type CategoriaCarga, type ProductoDraft } from './cargaMasivaHelpers'
import { IconCheck, IconX, IconPlus, IconArrow } from './cargaMasivaIcons'
import type { CSSProperties } from 'react'

type WizardErrors = { nombre?: string | null; precioVenta?: string | null }

export type StepWizardProps = {
  drafts: ProductoDraft[]
  onUpdate: (idx: number, fields: Partial<ProductoDraft>) => void
  onFinalizar: () => void
  categories: CategoriaCarga[]
  initialIdx?: number
}

export default function StepWizard({ drafts, onUpdate, onFinalizar, categories, initialIdx = 0 }: StepWizardProps) {
  const [idx, setIdx] = useState(initialIdx)
  const [errors, setErrors] = useState<WizardErrors>({})
  const extraInputRef = useRef<HTMLInputElement>(null)
  const draft = drafts[idx]!

  const set = (field: keyof ProductoDraft, value: ProductoDraft[keyof ProductoDraft]) => {
    onUpdate(idx, { [field]: value })
    if (field === 'nombre' || field === 'precioVenta') {
      if (errors[field]) setErrors(e => ({ ...e, [field]: null }))
    }
  }

  const addExtraFiles = (fileList: FileList | null) => {
    if (!fileList) return
    const remaining = MAX_EXTRA - draft.extraFiles.length
    if (remaining <= 0) return
    const valid = Array.from(fileList)
      .filter(f => f.type.startsWith('image/') && f.size <= IMAGE_MAX_BYTES)
      .slice(0, remaining)
    if (!valid.length) return
    const newPreviews = valid.map(f => URL.createObjectURL(f))
    onUpdate(idx, {
      extraFiles: [...draft.extraFiles, ...valid],
      extraPreviews: [...draft.extraPreviews, ...newPreviews],
    })
  }

  const removeExtra = (i: number) => {
    URL.revokeObjectURL(draft.extraPreviews[i])
    onUpdate(idx, {
      extraFiles: draft.extraFiles.filter((_, j) => j !== i),
      extraPreviews: draft.extraPreviews.filter((_, j) => j !== i),
    })
  }

  const validate = () => {
    const e: WizardErrors = {}
    if (!draft.nombre.trim()) e.nombre = 'Requerido'
    if (!draft.precioVenta || Number(draft.precioVenta) <= 0) e.precioVenta = 'Requerido'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const goNext = () => {
    if (!validate()) return
    if (idx < drafts.length - 1) setIdx(i => i + 1)
    else onFinalizar()
  }

  const goPrev = () => { if (idx > 0) setIdx(i => i - 1) }

  const pct = Math.round(((idx + 1) / drafts.length) * 100)

  const inp = 'w-full px-4 py-3 rounded-xl text-sm transition-all focus:outline-none'
  const inpStyle = (err: string | null | undefined | false): CSSProperties => ({
    background: 'rgba(255,255,255,0.05)',
    border: `1px solid ${err ? 'rgba(248,113,113,0.6)' : 'rgba(255,255,255,0.1)'}`,
    color: 'var(--hc-text)',
  })

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span style={{ color: 'var(--hc-muted)' }}>Producto {idx + 1} de {drafts.length}</span>
          <span style={{ color: 'var(--hc-muted)' }}>{pct}% completado</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
          <div className="h-full rounded-full transition-all duration-300"
            style={{ width: `${pct}%`, background: 'var(--hc-accent)' }} />
        </div>
        <div className="flex gap-1.5 flex-wrap mt-2">
          {drafts.map((d, i) => (
            <button type="button"
              key={d.id}
              onClick={() => { if (validate() || i < idx) setIdx(i) }}
              className="relative w-8 h-8 rounded-lg overflow-hidden transition-all"
              style={{
                border: i === idx
                  ? '2px solid var(--hc-accent)'
                  : '2px solid rgba(255,255,255,0.1)',
                opacity: i === idx ? 1 : 0.5,
              }}
              title={`Producto ${i + 1}: ${d.nombre || 'Sin nombre'}`}
            >
              <img src={d.mainPreview} alt="" className="w-full h-full object-cover" />
              {d.nombre && d.precioVenta && i !== idx && (
                <div className="absolute inset-0 flex items-center justify-center"
                  style={{ background: 'rgba(16,185,129,0.55)' }}>
                  <IconCheck className="w-3.5 h-3.5 text-white" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div className="rounded-2xl overflow-hidden aspect-square"
            style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
            <img src={draft.mainPreview} alt="" className="w-full h-full object-contain" />
          </div>

          <div>
            <p className="text-xs mb-2" style={{ color: 'var(--hc-muted)' }}>
              Fotos adicionales del mismo producto ({draft.extraFiles.length}/{MAX_EXTRA})
            </p>
            <div className="flex flex-wrap gap-2">
              {draft.extraPreviews.map((url, i) => (
                <div key={i} className="relative w-14 h-14 rounded-xl overflow-hidden group"
                  style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button type="button"
                    onClick={() => removeExtra(i)}
                    className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: 'rgba(0,0,0,0.65)' }}
                  >
                    <IconX className="w-4 h-4 text-white" />
                  </button>
                </div>
              ))}
              {draft.extraFiles.length < MAX_EXTRA && (
                <button type="button"
                  onClick={() => extraInputRef.current?.click()}
                  className="w-14 h-14 rounded-xl flex items-center justify-center transition-colors hover:bg-white/5"
                  style={{ border: '1px dashed rgba(255,255,255,0.18)' }}
                >
                  <IconPlus className="w-4 h-4" style={{ color: 'var(--hc-muted)' }} />
                </button>
              )}
              <input ref={extraInputRef} type="file" accept="image/*" multiple className="hidden"
                onChange={(e) => { addExtraFiles(e.target.files); e.target.value = '' }} />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="cm-nombre" className="text-xs block mb-1.5" style={{ color: 'var(--hc-muted)' }}>
              Nombre del producto <span style={{ color: '#f87171' }}>*</span>
            </label>
            <input
              id="cm-nombre"
              className={inp}
              style={inpStyle(errors.nombre)}
              value={draft.nombre}
              onChange={(e) => set('nombre', e.target.value)}
              placeholder="Ej: Camiseta azul talla M"
            />
            {errors.nombre && <p className="text-xs mt-1" style={{ color: '#f87171' }}>{errors.nombre}</p>}
          </div>

          <div>
            <p className="text-xs block mb-1.5" style={{ color: 'var(--hc-muted)' }}>
              Categoría
            </p>
            <CategoriaSelect
              categories={categories}
              value={draft.categoriaId}
              onChange={(id) => set('categoriaId', id)}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label htmlFor="cm-precio" className="text-xs block mb-1.5" style={{ color: 'var(--hc-muted)' }}>
                Precio venta <span style={{ color: '#f87171' }}>*</span>
              </label>
              <input
                id="cm-precio"
                type="number"
                min="0"
                className={inp}
                style={inpStyle(errors.precioVenta)}
                value={draft.precioVenta}
                onChange={(e) => set('precioVenta', e.target.value)}
                placeholder="₡0"
              />
              {errors.precioVenta && <p className="text-xs mt-1" style={{ color: '#f87171' }}>{errors.precioVenta}</p>}
            </div>
            <div>
              <label htmlFor="cm-costo" className="text-xs block mb-1.5" style={{ color: 'var(--hc-muted)' }}>
                Costo
              </label>
              <input
                id="cm-costo"
                type="number"
                min="0"
                className={inp}
                style={inpStyle(false)}
                value={draft.precioCompra}
                onChange={(e) => set('precioCompra', e.target.value)}
                placeholder="₡0"
              />
            </div>
            <div>
              <label htmlFor="cm-stock" className="text-xs block mb-1.5" style={{ color: 'var(--hc-muted)' }}>
                Stock
              </label>
              <input
                id="cm-stock"
                type="number"
                min="0"
                className={inp}
                style={inpStyle(false)}
                value={draft.stock}
                onChange={(e) => set('stock', e.target.value)}
                placeholder="1"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <button type="button"
          onClick={goPrev}
          disabled={idx === 0}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-30"
          style={{ border: '1px solid rgba(255,255,255,0.12)', color: 'var(--hc-text)' }}
        >
          <IconArrow className="w-4 h-4" left />
          Anterior
        </button>
        <button type="button"
          onClick={goNext}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-opacity hover:opacity-85"
          style={{ background: 'var(--hc-accent)', color: '#fff' }}
        >
          {idx === drafts.length - 1 ? 'Ver resumen' : 'Siguiente'}
          <IconArrow className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
