import { sel, inpStyle } from './productFormUi'
import Label from './Label'
import MarcaCombobox from './MarcaCombobox'

function SelectCargando() {
  return (
    <div className={`${sel} flex items-center gap-2`} style={{ ...inpStyle, color: 'var(--hc-muted)' }}>
      <span className="w-3 h-3 border-2 rounded-full animate-spin shrink-0" style={{ borderColor: 'var(--hc-border)', borderTopColor: 'var(--hc-muted)' }} />
      <span>Cargando…</span>
    </div>
  )
}

function CampoBodega({ bodegas, loadingCatalog, sinBodegas, form, setCampo }) {
  if (sinBodegas) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
        style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
        <span className="text-xs flex-1" style={{ color: '#8a5a00' }}>Sin bodegas creadas — creá una para poder guardar el producto.</span>
        <a href="/admin/bodegas" className="text-xs font-semibold px-3 py-1 rounded-lg"
          style={{ background: 'rgba(245,158,11,0.2)', color: '#8a5a00' }}>Crear →</a>
      </div>
    )
  }
  if (loadingCatalog) return <SelectCargando />
  if (bodegas.length === 1) {
    return (
      <div className={sel} style={{ ...inpStyle, color: 'var(--hc-text)' }}>{bodegas[0].nombreBodega ?? bodegas[0].nombre}</div>
    )
  }
  return (
    <select className={sel} style={inpStyle} value={form.bodegaId} onChange={setCampo('bodegaId')} required>
      <option value="">-- Seleccionar --</option>
      {bodegas.map(b => (
        <option key={b.id} value={b.id}>{b.nombreBodega ?? b.nombre}</option>
      ))}
    </select>
  )
}

function CampoCategoria({ categories, loadingCatalog, form, setCampo }) {
  if (loadingCatalog) return <SelectCargando />
  if (categories.length === 0) {
    return <div className={`${sel} text-sm`} style={{ ...inpStyle, color: '#a8291f' }}>Sin categorías — recargá la página</div>
  }
  return (
    <select className={sel} style={inpStyle} value={form.categoriaId} onChange={setCampo('categoriaId')} required>
      <option value="">-- Seleccionar --</option>
      {categories.map(c => (
        <option key={c.id} value={c.id}>{c.nombreCategoria ?? c.nombre}</option>
      ))}
    </select>
  )
}

export default function PasoClasificacion({
  form, setCampo, setForm,
  categories, bodegas, marcas, loadingCatalog, sinBodegas,
  showNuevaMarca, setShowNuevaMarca, nuevaMarca, setNuevaMarca, creandoMarca, onCrearMarca,
}) {
  return (
    <div className="space-y-5">
      <div>
        <Label>Condición</Label>
        <select className={sel} style={inpStyle} value={form.condicion} onChange={setCampo('condicion')}>
          <option value="NUEVO">Nuevo</option>
          <option value="COMO_NUEVO">Como nuevo</option>
          <option value="USADO">Usado</option>
        </select>
      </div>
      <div>
        <Label required>Categoría</Label>
        <CampoCategoria categories={categories} loadingCatalog={loadingCatalog} form={form} setCampo={setCampo} />
      </div>
      <div>
        <Label required={bodegas.length > 0}>Bodega / Ubicación</Label>
        <CampoBodega bodegas={bodegas} loadingCatalog={loadingCatalog} sinBodegas={sinBodegas} form={form} setCampo={setCampo} />
      </div>
      <div>
        <Label>Marca</Label>
        <MarcaCombobox
          marcas={marcas} value={form.marcaId}
          onChange={v => setForm(p => ({ ...p, marcaId: v }))}
          showNuevaMarca={showNuevaMarca} setShowNuevaMarca={setShowNuevaMarca}
          nuevaMarca={nuevaMarca} setNuevaMarca={setNuevaMarca}
          creandoMarca={creandoMarca} onCrear={onCrearMarca}
        />
      </div>
    </div>
  )
}
