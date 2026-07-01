import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { productService } from '@/services/productService'
import CategoriaSelect from '@/components/admin/CategoriaSelect'
import { useToast } from '@/components/ui/Toast'
import useAuthStore from '@/store/authStore'

const LIMIT_DEFAULT = 100
const LIMIT_EXTENDED = 1500
const EXTENDED_ROLES = new Set(['ADMIN', 'SUPER_ADMIN'])
const MAX_EXTRA = 9

function createDraft(file) {
  return {
    id: `${Date.now()}-${Math.random()}`,
    mainFile: file,
    mainPreview: URL.createObjectURL(file),
    extraFiles: [],
    extraPreviews: [],
    nombre: file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim(),
    categoriaId: '',
    precioVenta: '',
    precioCompra: '',
    stock: '1',
  }
}

// ── Íconos ────────────────────────────────────────────────────────────────────
function IconUpload({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/>
    </svg>
  )
}
function IconX({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
    </svg>
  )
}
function IconPlus({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15"/>
    </svg>
  )
}
function IconCheck({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
    </svg>
  )
}
function IconArrow({ className, left }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      {left
        ? <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"/>
        : <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/>
      }
    </svg>
  )
}
function IconEdit({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"/>
    </svg>
  )
}

// ── Paso 1: Subir imágenes ────────────────────────────────────────────────────
function StepSubida({ onContinuar, limit }) {
  const [drafts, setDrafts] = useState([])
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef()

  const addFiles = useCallback((fileList) => {
    const remaining = limit - drafts.length
    if (remaining <= 0) return
    const valid = Array.from(fileList)
      .filter(f => f.type.startsWith('image/') && f.size <= 10 * 1024 * 1024)
      .slice(0, remaining)
    if (!valid.length) return
    setDrafts(prev => [...prev, ...valid.map(createDraft)])
  }, [drafts.length, limit])

  const remove = (id) => {
    setDrafts(prev => {
      const d = prev.find(x => x.id === id)
      if (d) URL.revokeObjectURL(d.mainPreview)
      return prev.filter(x => x.id !== id)
    })
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    addFiles(e.dataTransfer.files)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Drop zone */}
      <div
        onDrop={onDrop}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onClick={() => inputRef.current?.click()}
        className="rounded-2xl border-2 border-dashed cursor-pointer transition-all flex flex-col items-center justify-center py-16 gap-4"
        style={{
          borderColor: dragging ? 'var(--hc-accent)' : 'rgba(255,255,255,0.12)',
          background: dragging ? 'rgba(79,124,255,0.06)' : 'rgba(255,255,255,0.02)',
        }}
      >
        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden"
          onChange={(e) => { addFiles(e.target.files); e.target.value = '' }} />
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{ background: 'rgba(79,124,255,0.12)', border: '1px solid rgba(79,124,255,0.3)' }}>
          <IconUpload className="w-7 h-7" style={{ color: 'var(--hc-accent)' }} />
        </div>
        <div className="text-center pointer-events-none">
          <p className="font-semibold text-base" style={{ color: 'var(--hc-text)' }}>
            {drafts.length === 0 ? 'Arrastrá las fotos aquí o hacé clic' : `${drafts.length} foto${drafts.length === 1 ? '' : 's'} cargada${drafts.length === 1 ? '' : 's'}`}
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--hc-muted)' }}>
            1 foto = 1 producto · máx. {limit} imágenes · hasta 10 MB por foto
          </p>
        </div>
      </div>

      {/* Grid de thumbnails */}
      {drafts.length > 0 && (
        <>
          <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
            {drafts.map((d) => (
              <div key={d.id} className="relative aspect-square rounded-xl overflow-hidden group"
                style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                <img src={d.mainPreview} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={(e) => { e.stopPropagation(); remove(d.id) }}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: 'rgba(0,0,0,0.75)' }}
                >
                  <IconX className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
            {drafts.length < limit && (
              <div
                className="aspect-square rounded-xl flex items-center justify-center transition-colors hover:bg-white/5 cursor-pointer"
                style={{ border: '1px dashed rgba(255,255,255,0.15)' }}
              >
                <IconPlus className="w-5 h-5 pointer-events-none" style={{ color: 'var(--hc-muted)' }} />
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>
              {drafts.length} de {limit} imágenes
            </p>
            <button
              onClick={() => onContinuar(drafts)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-opacity hover:opacity-85"
              style={{ background: 'var(--hc-accent)', color: '#fff' }}
            >
              Continuar con {drafts.length} producto{drafts.length === 1 ? '' : 's'}
              <IconArrow className="w-4 h-4" />
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ── Paso 2: Wizard por producto ───────────────────────────────────────────────
function StepWizard({ drafts, onUpdate, onFinalizar, categories, initialIdx = 0 }) {
  const [idx, setIdx] = useState(initialIdx)
  const [errors, setErrors] = useState({})
  const extraInputRef = useRef()
  const draft = drafts[idx]

  const set = (field, value) => {
    onUpdate(idx, { [field]: value })
    if (errors[field]) setErrors(e => ({ ...e, [field]: null }))
  }

  const addExtraFiles = (fileList) => {
    const remaining = MAX_EXTRA - draft.extraFiles.length
    if (remaining <= 0) return
    const valid = Array.from(fileList)
      .filter(f => f.type.startsWith('image/') && f.size <= 10 * 1024 * 1024)
      .slice(0, remaining)
    if (!valid.length) return
    const newPreviews = valid.map(f => URL.createObjectURL(f))
    onUpdate(idx, {
      extraFiles: [...draft.extraFiles, ...valid],
      extraPreviews: [...draft.extraPreviews, ...newPreviews],
    })
  }

  const removeExtra = (i) => {
    URL.revokeObjectURL(draft.extraPreviews[i])
    onUpdate(idx, {
      extraFiles: draft.extraFiles.filter((_, j) => j !== i),
      extraPreviews: draft.extraPreviews.filter((_, j) => j !== i),
    })
  }

  const validate = () => {
    const e = {}
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
  const inpStyle = (err) => ({
    background: 'rgba(255,255,255,0.05)',
    border: `1px solid ${err ? 'rgba(248,113,113,0.6)' : 'rgba(255,255,255,0.1)'}`,
    color: 'var(--hc-text)',
  })

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Progreso */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span style={{ color: 'var(--hc-muted)' }}>Producto {idx + 1} de {drafts.length}</span>
          <span style={{ color: 'var(--hc-muted)' }}>{pct}% completado</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
          <div className="h-full rounded-full transition-all duration-300"
            style={{ width: `${pct}%`, background: 'var(--hc-accent)' }} />
        </div>
        {/* Miniaturas de navegación */}
        <div className="flex gap-1.5 flex-wrap mt-2">
          {drafts.map((d, i) => (
            <button
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

      {/* Contenido */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Columna izquierda: imagen */}
        <div className="space-y-3">
          <div className="rounded-2xl overflow-hidden aspect-square"
            style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
            <img src={draft.mainPreview} alt="" className="w-full h-full object-contain" />
          </div>

          {/* Fotos adicionales */}
          <div>
            <p className="text-xs mb-2" style={{ color: 'var(--hc-muted)' }}>
              Fotos adicionales del mismo producto ({draft.extraFiles.length}/{MAX_EXTRA})
            </p>
            <div className="flex flex-wrap gap-2">
              {draft.extraPreviews.map((url, i) => (
                <div key={i} className="relative w-14 h-14 rounded-xl overflow-hidden group"
                  style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => removeExtra(i)}
                    className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: 'rgba(0,0,0,0.65)' }}
                  >
                    <IconX className="w-4 h-4 text-white" />
                  </button>
                </div>
              ))}
              {draft.extraFiles.length < MAX_EXTRA && (
                <button
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

        {/* Columna derecha: datos */}
        <div className="space-y-4">
          {/* Nombre */}
          <div>
            <label className="text-xs block mb-1.5" style={{ color: 'var(--hc-muted)' }}>
              Nombre del producto <span style={{ color: '#f87171' }}>*</span>
            </label>
            <input
              className={inp}
              style={inpStyle(errors.nombre)}
              value={draft.nombre}
              onChange={(e) => set('nombre', e.target.value)}
              placeholder="Ej: Camiseta azul talla M"
              autoFocus
            />
            {errors.nombre && <p className="text-xs mt-1" style={{ color: '#f87171' }}>{errors.nombre}</p>}
          </div>

          {/* Categoría */}
          <div>
            <label className="text-xs block mb-1.5" style={{ color: 'var(--hc-muted)' }}>
              Categoría
            </label>
            <CategoriaSelect
              categories={categories}
              value={draft.categoriaId}
              onChange={(id) => set('categoriaId', id)}
            />
          </div>

          {/* Precio, Costo, Stock */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs block mb-1.5" style={{ color: 'var(--hc-muted)' }}>
                Precio venta <span style={{ color: '#f87171' }}>*</span>
              </label>
              <input
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
              <label className="text-xs block mb-1.5" style={{ color: 'var(--hc-muted)' }}>
                Costo
              </label>
              <input
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
              <label className="text-xs block mb-1.5" style={{ color: 'var(--hc-muted)' }}>
                Stock
              </label>
              <input
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

      {/* Navegación */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={goPrev}
          disabled={idx === 0}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-30"
          style={{ border: '1px solid rgba(255,255,255,0.12)', color: 'var(--hc-text)' }}
        >
          <IconArrow className="w-4 h-4" left />
          Anterior
        </button>
        <button
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

// ── Paso 3: Resumen ───────────────────────────────────────────────────────────
function StepResumen({ drafts, categories, onEditar, onGuardar, saving, progress }) {
  const catName = (id) => {
    if (!id) return '—'
    const c = categories.find(x => String(x.id) === String(id))
    return c?.nombreCategoria ?? '—'
  }
  const fmt = (n) => n ? `₡${Number(n).toLocaleString('es-CR')}` : '—'

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>
          {drafts.length} producto{drafts.length === 1 ? '' : 's'} listos para guardar
        </p>
        {saving && (
          <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>
            Guardando {progress.done} de {progress.total}...
          </p>
        )}
      </div>

      {/* Barra de progreso de guardado */}
      {saving && (
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${Math.round((progress.done / progress.total) * 100)}%`, background: 'var(--hc-accent)' }}
          />
        </div>
      )}

      {/* Tabla */}
      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <th className="text-left px-4 py-3 font-medium text-xs" style={{ color: 'var(--hc-muted)' }}>#</th>
                <th className="text-left px-4 py-3 font-medium text-xs" style={{ color: 'var(--hc-muted)' }}>Foto</th>
                <th className="text-left px-4 py-3 font-medium text-xs" style={{ color: 'var(--hc-muted)' }}>Nombre</th>
                <th className="text-left px-4 py-3 font-medium text-xs" style={{ color: 'var(--hc-muted)' }}>Categoría</th>
                <th className="text-right px-4 py-3 font-medium text-xs" style={{ color: 'var(--hc-muted)' }}>Precio</th>
                <th className="text-right px-4 py-3 font-medium text-xs" style={{ color: 'var(--hc-muted)' }}>Costo</th>
                <th className="text-right px-4 py-3 font-medium text-xs" style={{ color: 'var(--hc-muted)' }}>Stock</th>
                <th className="text-center px-4 py-3 font-medium text-xs" style={{ color: 'var(--hc-muted)' }}>Fotos</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {drafts.map((d, i) => {
                const ok = d.nombre.trim() && Number(d.precioVenta) > 0
                return (
                  <tr
                    key={d.id}
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                    className="hover:bg-white/2 transition-colors"
                  >
                    <td className="px-4 py-3" style={{ color: 'var(--hc-muted)' }}>{i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0"
                        style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                        <img src={d.mainPreview} alt="" className="w-full h-full object-cover" />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span style={{ color: ok ? 'var(--hc-text)' : '#f87171' }}>
                        {d.nombre || 'Sin nombre'}
                      </span>
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--hc-muted)' }}>{catName(d.categoriaId)}</td>
                    <td className="px-4 py-3 text-right" style={{ color: 'var(--hc-text)' }}>{fmt(d.precioVenta)}</td>
                    <td className="px-4 py-3 text-right" style={{ color: 'var(--hc-muted)' }}>{fmt(d.precioCompra)}</td>
                    <td className="px-4 py-3 text-right" style={{ color: 'var(--hc-muted)' }}>{d.stock}</td>
                    <td className="px-4 py-3 text-center" style={{ color: 'var(--hc-muted)' }}>
                      {1 + d.extraFiles.length}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => onEditar(i)}
                        disabled={saving}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs transition-colors hover:bg-white/8 disabled:opacity-40"
                        style={{ color: 'var(--hc-accent)' }}
                      >
                        <IconEdit className="w-3.5 h-3.5" />
                        Editar
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={onGuardar}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-opacity hover:opacity-85 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: 'var(--hc-accent)', color: '#fff' }}
        >
          {saving
            ? <>Guardando {progress.done}/{progress.total}...</>
            : <><IconCheck className="w-4 h-4" /> Guardar {drafts.length} producto{drafts.length === 1 ? '' : 's'}</>
          }
        </button>
      </div>
    </div>
  )
}

// ── Indicador de pasos ────────────────────────────────────────────────────────
function StepBar({ step }) {
  const steps = ['Subir fotos', 'Completar datos', 'Guardar']
  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((label, i) => {
        const n = i + 1
        const active = step === n
        const done = step > n
        return (
          <div key={n} className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all"
                style={{
                  background: done ? 'rgba(16,185,129,0.2)' : active ? 'var(--hc-accent)' : 'rgba(255,255,255,0.06)',
                  border: done ? '1px solid rgba(16,185,129,0.4)' : active ? 'none' : '1px solid rgba(255,255,255,0.1)',
                  color: done ? '#34d399' : active ? '#fff' : 'var(--hc-muted)',
                }}
              >
                {done ? <IconCheck className="w-3.5 h-3.5" /> : n}
              </div>
              <span className="text-sm hidden sm:block"
                style={{ color: active ? 'var(--hc-text)' : 'var(--hc-muted)', fontWeight: active ? 600 : 400 }}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className="h-px w-6 sm:w-12 flex-shrink-0 mx-1"
                style={{ background: done ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.08)' }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function AdminCargaMasiva() {
  const navigate = useNavigate()
  const toast = useToast()
  const userRole = useAuthStore((s) => s.userRole)
  const limit = EXTENDED_ROLES.has(userRole) ? LIMIT_EXTENDED : LIMIT_DEFAULT

  const [step, setStep] = useState(1)
  const [drafts, setDrafts] = useState([])
  const [editIdx, setEditIdx] = useState(0)
  const [categories, setCategories] = useState([])
  const [saving, setSaving] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })

  // Ref para poder revocar todos los object URLs al desmontar
  const draftsRef = useRef([])
  useEffect(() => { draftsRef.current = drafts }, [drafts])

  useEffect(() => {
    productService.getCategories()
      .then(r => setCategories(r.data?.data ?? r.data ?? []))
      .catch(() => {})
    return () => {
      draftsRef.current.forEach(d => {
        URL.revokeObjectURL(d.mainPreview)
        d.extraPreviews.forEach(u => URL.revokeObjectURL(u))
      })
    }
  }, [])

  const updateDraft = (idx, fields) => {
    setDrafts(prev => prev.map((d, i) => i === idx ? { ...d, ...fields } : d))
  }

  const handleContinuar = (newDrafts) => {
    setDrafts(newDrafts)
    setStep(2)
  }

  const handleFinalizar = () => setStep(3)

  const handleEditar = (idx) => {
    setEditIdx(idx)
    setStep(2)
  }

  const uploadFile = async (file) => {
    const fd = new FormData()
    fd.append('file', file)
    const r = await productService.uploadImage(fd)
    return r.data?.data?.url ?? r.data?.url ?? ''
  }

  const handleGuardar = async () => {
    setSaving(true)
    setProgress({ done: 0, total: drafts.length })
    const errors = []

    for (let i = 0; i < drafts.length; i++) {
      const d = drafts[i]
      try {
        // 1. Subir imagen principal
        const mainUrl = await uploadFile(d.mainFile)

        // 2. Subir imágenes adicionales
        const extraUrls = []
        for (const f of d.extraFiles) {
          const url = await uploadFile(f)
          if (url) extraUrls.push(url)
        }

        // 3. Crear producto
        const payload = {
          nombreProducto: d.nombre.trim(),
          precioVenta: Number(d.precioVenta) || 0,
          precioCompra: Number(d.precioCompra) || 0,
          stockActual: Number(d.stock) || 1,
          categoriaId: d.categoriaId ? Number(d.categoriaId) : null,
          imagenPrincipalUrl: mainUrl || null,
          condicion: 'NUEVO',
          visibleCatalogo: true,
        }
        const res = await productService.create(payload)
        const productId = res.data?.data?.id ?? res.data?.id

        // 4. Sincronizar galería si hay extras
        if (productId && extraUrls.length > 0) {
          const allUrls = [mainUrl, ...extraUrls].filter(Boolean)
          await productService.sincronizarImagenes(productId, allUrls).catch(() => {})
        }
      } catch (err) {
        errors.push(`Producto "${d.nombre}" (${i + 1}): ${err?.response?.data?.message ?? err.message ?? 'Error'}`)
      }
      setProgress(p => ({ ...p, done: p.done + 1 }))
    }

    setSaving(false)

    if (errors.length === 0) {
      toast({ message: `${drafts.length} producto${drafts.length === 1 ? '' : 's'} guardado${drafts.length === 1 ? '' : 's'} correctamente`, type: 'success' })
      navigate('/admin/productos')
    } else if (errors.length < drafts.length) {
      toast({ message: `${drafts.length - errors.length} guardados, ${errors.length} con error`, type: 'warning' })
      console.error('Errores en carga masiva:', errors)
    } else {
      toast({ message: 'No se pudo guardar ningún producto. Revisá la consola.', type: 'error' })
      console.error('Errores en carga masiva:', errors)
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate('/admin/productos')}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors hover:bg-white/8"
          style={{ border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <IconArrow className="w-4 h-4" style={{ color: 'var(--hc-muted)' }} left />
        </button>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--hc-text)' }}>Carga masiva de productos</h1>
          <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>
            Subí hasta {limit} productos de una vez
          </p>
        </div>
      </div>

      <StepBar step={step} />

      {step === 1 && (
        <StepSubida onContinuar={handleContinuar} limit={limit} />
      )}

      {step === 2 && (
        <StepWizard
          key={`wizard-${editIdx}`}
          drafts={drafts}
          onUpdate={updateDraft}
          onFinalizar={handleFinalizar}
          categories={categories}
          initialIdx={editIdx}
        />
      )}

      {step === 3 && (
        <StepResumen
          drafts={drafts}
          categories={categories}
          onEditar={handleEditar}
          onGuardar={handleGuardar}
          saving={saving}
          progress={progress}
        />
      )}
    </div>
  )
}
