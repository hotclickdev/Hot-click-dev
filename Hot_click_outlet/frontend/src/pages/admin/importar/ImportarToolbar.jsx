import { CONDICIONES } from './importarHelpers'
import { IconApply } from './importarIcons'

export default function ImportarToolbar({
  esAdminIT,
  empresas,
  empresaSeleccionada,
  onCambiarEmpresa,
  margenGlobal,
  setMargenGlobal,
  aplicarMargenATodos,
  bodegaGlobal,
  setBodegaGlobal,
  bodegas,
  catGlobal,
  setCatGlobal,
  categorias,
  aplicarCategoriaATodos,
  marcaGlobal,
  setMarcaGlobal,
  marcas,
  aplicarMarcaATodos,
  condicionGlobal,
  setCondicionGlobal,
  aplicarCondicionATodos,
  stockGlobal,
  setStockGlobal,
  aplicarStockATodos,
  seleccionados,
  productos,
  todosSelec,
  toggleAll,
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3 rounded-xl"
      style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>

      {esAdminIT && (
        <>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium whitespace-nowrap" style={{ color: 'var(--hc-muted)' }}>Empresa *</span>
            <select value={empresaSeleccionada} onChange={e => onCambiarEmpresa(e.target.value)}
              className="text-xs px-2 py-1.5 rounded-lg outline-none"
              style={{
                backgroundColor: 'var(--hc-surface-2)',
                color: empresaSeleccionada ? 'var(--hc-text)' : 'var(--hc-muted)',
                border: `1px solid ${empresaSeleccionada ? 'var(--hc-border)' : 'rgba(239,68,68,0.4)'}`,
              }}>
              <option value="">Seleccionar…</option>
              {empresas.map(e => <option key={e.id} value={e.id}>{e.nombreComercial || e.nombreEmpresa}</option>)}
            </select>
          </div>
          <div className="w-px h-5 shrink-0" style={{ backgroundColor: 'var(--hc-border)' }} />
        </>
      )}

      <div className="flex items-center gap-2">
        <span className="text-xs font-medium whitespace-nowrap" style={{ color: 'var(--hc-muted)' }}>Margen sobre costo</span>
        <div className="flex items-center gap-1">
          <input type="number" value={margenGlobal} onChange={e => setMargenGlobal(e.target.value)}
            placeholder="10"
            className="w-14 text-xs px-2 py-1.5 rounded-lg outline-none text-center"
            style={{ backgroundColor: 'var(--hc-surface-2)', color: 'var(--hc-text)', border: '1px solid var(--hc-border)' }} />
          <span className="text-xs" style={{ color: 'var(--hc-muted)' }}>%</span>
        </div>
        <button onClick={aplicarMargenATodos} disabled={margenGlobal === ''}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-40"
          style={{ backgroundColor: margenGlobal !== '' ? 'var(--hc-accent)' : 'var(--hc-surface-2)', color: margenGlobal !== '' ? '#fff' : 'var(--hc-muted)' }}
          title="Calcula precio de venta = precio de costo + %">
          <IconApply /> Aplicar a todos
        </button>
      </div>

      <div className="w-px h-5 shrink-0" style={{ backgroundColor: 'var(--hc-border)' }} />

      <div className="flex items-center gap-2">
        <span className="text-xs font-medium whitespace-nowrap" style={{ color: 'var(--hc-muted)' }}>Bodega</span>
        <select value={bodegaGlobal} onChange={e => setBodegaGlobal(e.target.value)}
          className="text-xs px-2 py-1.5 rounded-lg outline-none"
          style={{ backgroundColor: 'var(--hc-surface-2)', color: 'var(--hc-text)', border: '1px solid var(--hc-border)' }}>
          {bodegas.length === 0 && (
            <option value="">{esAdminIT && !empresaSeleccionada ? 'Elegí una empresa primero' : 'Sin bodegas'}</option>
          )}
          {bodegas.map(b => <option key={b.id} value={b.id}>{b.nombre ?? b.nombreBodega}</option>)}
        </select>
      </div>

      <div className="w-px h-5 shrink-0" style={{ backgroundColor: 'var(--hc-border)' }} />

      <div className="flex items-center gap-2">
        <span className="text-xs font-medium whitespace-nowrap" style={{ color: 'var(--hc-muted)' }}>Categoría global</span>
        <select value={catGlobal} onChange={e => setCatGlobal(e.target.value)}
          className="text-xs px-2 py-1.5 rounded-lg outline-none"
          style={{ backgroundColor: 'var(--hc-surface-2)', color: catGlobal ? 'var(--hc-text)' : 'var(--hc-muted)', border: '1px solid var(--hc-border)' }}>
          <option value="">Seleccionar…</option>
          {categorias.map(c => <option key={c.id} value={c.id}>{c.nombreCategoria}</option>)}
        </select>
        <button onClick={aplicarCategoriaATodos} disabled={!catGlobal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-40"
          style={{ backgroundColor: catGlobal ? 'var(--hc-accent)' : 'var(--hc-surface-2)', color: catGlobal ? '#fff' : 'var(--hc-muted)' }}>
          <IconApply /> Aplicar a todos
        </button>
      </div>

      <div className="w-px h-5 shrink-0" style={{ backgroundColor: 'var(--hc-border)' }} />

      <div className="flex items-center gap-2">
        <span className="text-xs font-medium whitespace-nowrap" style={{ color: 'var(--hc-muted)' }}>Marca global</span>
        <select value={marcaGlobal} onChange={e => setMarcaGlobal(e.target.value)}
          className="text-xs px-2 py-1.5 rounded-lg outline-none"
          style={{ backgroundColor: 'var(--hc-surface-2)', color: marcaGlobal ? 'var(--hc-text)' : 'var(--hc-muted)', border: '1px solid var(--hc-border)' }}>
          <option value="">Seleccionar…</option>
          {marcas.map(m => <option key={m.id} value={m.id}>{m.nombreMarca}</option>)}
        </select>
        <button onClick={aplicarMarcaATodos} disabled={!marcaGlobal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-40"
          style={{ backgroundColor: marcaGlobal ? 'var(--hc-accent)' : 'var(--hc-surface-2)', color: marcaGlobal ? '#fff' : 'var(--hc-muted)' }}>
          <IconApply /> Aplicar a todos
        </button>
      </div>

      <div className="w-px h-5 shrink-0" style={{ backgroundColor: 'var(--hc-border)' }} />

      <div className="flex items-center gap-2">
        <span className="text-xs font-medium whitespace-nowrap" style={{ color: 'var(--hc-muted)' }}>Condición global</span>
        <select value={condicionGlobal} onChange={e => setCondicionGlobal(e.target.value)}
          className="text-xs px-2 py-1.5 rounded-lg outline-none"
          style={{ backgroundColor: 'var(--hc-surface-2)', color: 'var(--hc-text)', border: '1px solid var(--hc-border)' }}>
          {CONDICIONES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <button onClick={aplicarCondicionATodos}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
          style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}>
          <IconApply /> Aplicar a todos
        </button>
      </div>

      <div className="w-px h-5 shrink-0" style={{ backgroundColor: 'var(--hc-border)' }} />

      <div className="flex items-center gap-2">
        <span className="text-xs font-medium whitespace-nowrap" style={{ color: 'var(--hc-muted)' }}>Stock global</span>
        <input type="number" min="0" value={stockGlobal} onChange={e => setStockGlobal(e.target.value)}
          placeholder="0"
          className="w-16 text-xs px-2 py-1.5 rounded-lg outline-none text-center"
          style={{ backgroundColor: 'var(--hc-surface-2)', color: 'var(--hc-text)', border: '1px solid var(--hc-border)' }} />
        <button onClick={aplicarStockATodos} disabled={stockGlobal === ''}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-40"
          style={{ backgroundColor: stockGlobal !== '' ? 'var(--hc-accent)' : 'var(--hc-surface-2)', color: stockGlobal !== '' ? '#fff' : 'var(--hc-muted)' }}>
          <IconApply /> Aplicar a todos
        </button>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>
          <span className="font-semibold" style={{ color: 'var(--hc-text)' }}>{seleccionados.length}</span>
          {' / '}
          <span className="font-semibold" style={{ color: 'var(--hc-text)' }}>{productos.length}</span>
        </p>
        <button onClick={() => toggleAll(!todosSelec)}
          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
          style={{ backgroundColor: 'var(--hc-surface-2)', color: 'var(--hc-text)', border: '1px solid var(--hc-border)' }}>
          {todosSelec ? 'Quitar todos' : 'Seleccionar todos'}
        </button>
      </div>
    </div>
  )
}
