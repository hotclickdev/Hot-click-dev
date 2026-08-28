import { useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import { detectarColor } from '@/utils/colorDetector'
import { CONDICIONES, fmtColones } from './importarHelpers'
import type { CategoriaImportar, MarcaImportar, ProductoImportado } from './importarHelpers'
import { IconArrow, IconCheck, IconChevron, IconSpinner } from './importarIcons'
import FilaProducto from './FilaProducto'
import ImgPreview from './ImgPreview'

type GrupoImportar = { key: string; nombreBase: string; items: ProductoImportado[] }

function estadoSeleccionGrupo(items: ProductoImportado[]) {
  const n = items.filter(i => i._sel).length
  if (n === 0) return 'none'
  return n === items.length ? 'all' : 'partial'
}

function valorComunGrupo<K extends keyof ProductoImportado>(items: ProductoImportado[], field: K): ProductoImportado[K] | undefined {
  const primero = items[0]?.[field] ?? null
  return items.every(i => (i[field] ?? null) === primero) ? primero as ProductoImportado[K] : undefined
}

export default function ImportarResultados({
  productos,
  setProductos,
  categorias,
  marcas,
  updateRow,
  onVolver,
  onConfirmar,
  guardando,
}: {
  productos: ProductoImportado[]
  setProductos: Dispatch<SetStateAction<ProductoImportado[]>>
  categorias: CategoriaImportar[]
  marcas: MarcaImportar[]
  updateRow: <K extends keyof ProductoImportado>(id: number, field: K, value: ProductoImportado[K]) => void
  onVolver: () => void
  onConfirmar: () => void
  guardando: boolean
}) {
  const seleccionados = productos.filter(p => p._sel)

  const [gruposExpandidos, setGruposExpandidos] = useState(() => new Set<string>())
  const toggleGrupoExpandido = (key: string) => setGruposExpandidos(prev => {
    const next = new Set(prev)
    if (next.has(key)) next.delete(key); else next.add(key)
    return next
  })

  const grupos = useMemo(() => {
    const mapa = new Map<string, GrupoImportar>()
    productos.forEach(p => {
      const { label, hex, nombreSinColor } = detectarColor(p.nombreProducto)
      const key = (nombreSinColor || p.nombreProducto || '').toLowerCase()
      if (!mapa.has(key)) mapa.set(key, { key, nombreBase: nombreSinColor || p.nombreProducto || '(sin nombre)', items: [] })
      mapa.get(key)?.items.push({ ...p, _colorLabel: label, _colorHex: hex })
    })
    return [...mapa.values()]
  }, [productos])

  const toggleSeleccionGrupo = (items: ProductoImportado[], value: boolean) => {
    const ids = new Set(items.map(i => i._id))
    setProductos(prev => prev.map(p => ids.has(p._id) ? { ...p, _sel: value } : p))
  }

  const actualizarCampoGrupo = <K extends keyof ProductoImportado>(items: ProductoImportado[], field: K, value: ProductoImportado[K]) => {
    const ids = new Set(items.map(i => i._id))
    setProductos(prev => prev.map(p => ids.has(p._id) ? { ...p, [field]: value } : p))
  }

  return (
    <>
      <div className="rounded-2xl overflow-x-auto" style={{ border: '1px solid var(--hc-border)' }}>

        <div className="grid text-[10px] font-semibold uppercase tracking-wider px-3 py-3 min-w-[990px]"
          style={{
            gridTemplateColumns: '28px 1fr 95px 95px 125px 105px 90px 60px 28px',
            backgroundColor: 'var(--hc-surface-2)',
            color: 'var(--hc-muted)',
            borderBottom: '1px solid var(--hc-border)',
          }}>
          <span />
          <span>Producto / Descripción / Imagen</span>
          <span className="text-right">Precio venta</span>
          <span className="text-right">Precio costo</span>
          <span>Categoría *</span>
          <span>Marca</span>
          <span>Condición</span>
          <span className="text-center">Stock</span>
          <span />
        </div>

        <div style={{ backgroundColor: 'var(--hc-surface)' }}>
          {grupos.length === 0 && (
            <p className="px-4 py-8 text-sm text-center" style={{ color: 'var(--hc-muted)' }}>
              No hay productos para revisar.
            </p>
          )}
          {grupos.map((grupo, gIdx) => {
            const { key, nombreBase, items } = grupo
            const esUltimoGrupo = gIdx === grupos.length - 1

            // Sin variantes de color detectadas: fila normal, sin cabecera de grupo
            if (items.length === 1) {
              return <FilaProducto key={items[0]._id} p={items[0]} isLast={esUltimoGrupo}
                categorias={categorias} marcas={marcas} updateRow={updateRow} />
            }

            const expandido    = gruposExpandidos.has(key)
            const estadoSel    = estadoSeleccionGrupo(items)
            const catComun     = valorComunGrupo(items, 'categoriaId')
            const marcaComun   = valorComunGrupo(items, 'marcaId')
            const condComun    = valorComunGrupo(items, 'condicion')
            const ventas       = items.map(i => i.precioVenta ?? 0)
            const costos       = items.map(i => i.precioCompra ?? 0)
            const stockTotal   = items.reduce((acc, i) => acc + (parseInt(String(i.stockActual), 10) || 0), 0)
            const rangoVenta   = Math.min(...ventas) === Math.max(...ventas)
              ? fmtColones(ventas[0]) : `${fmtColones(Math.min(...ventas))}–${fmtColones(Math.max(...ventas))}`
            const rangoCosto   = Math.min(...costos) === Math.max(...costos)
              ? fmtColones(costos[0]) : `${fmtColones(Math.min(...costos))}–${fmtColones(Math.max(...costos))}`
            const algunaAlerta = items.some(p => p._sel && (!p.nombreProducto?.trim() || !p.categoriaId || (p.precioVenta ?? 0) === 0))

            return (
              <div key={key} style={{ borderBottom: esUltimoGrupo ? 'none' : '1px solid var(--hc-border)' }}>

                <div className="grid items-center px-3 py-2.5 gap-x-2 min-w-[990px]"
                  style={{
                    gridTemplateColumns: '28px 1fr 95px 95px 125px 105px 90px 60px 28px',
                    backgroundColor: algunaAlerta ? 'rgba(245,158,11,0.06)' : 'var(--hc-surface-2)',
                  }}>

                  <div className="flex justify-center">
                    <input type="checkbox"
                      checked={estadoSel === 'all'}
                      ref={el => { if (el) el.indeterminate = estadoSel === 'partial' }}
                      onChange={e => toggleSeleccionGrupo(items, e.target.checked)}
                      className="w-4 h-4 cursor-pointer accent-[var(--hc-accent)]" />
                  </div>

                  <div className="min-w-0 flex items-center gap-2">
                    <ImgPreview url={items[0].imagenPrincipalUrl} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--hc-text)' }}>
                        {nombreBase}
                        <span className="ml-1.5 font-normal text-xs" style={{ color: 'var(--hc-muted)' }}>
                          ({items.length} colores)
                        </span>
                      </p>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        {items.map(it => (
                          <button key={it._id} type="button"
                            onClick={() => updateRow(it._id, '_sel', !it._sel)}
                            title={`${it._colorLabel ?? it.nombreProducto} · ${fmtColones(it.precioVenta) || '₡0'}`}
                            className="w-5 h-5 rounded-full shrink-0 transition-all"
                            style={{
                              background: it._colorHex ?? 'conic-gradient(from 90deg, #dc2626, #eab308, #16a34a, #2563eb, #7c3aed, #dc2626)',
                              border: it._sel ? '2px solid var(--hc-accent)' : '1px solid var(--hc-border)',
                              opacity: it._sel ? 1 : 0.35,
                            }} />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="text-right text-xs" style={{ color: 'var(--hc-muted)' }}>
                    ₡{rangoVenta}
                  </div>

                  <div className="text-right text-xs" style={{ color: 'var(--hc-muted)' }}>
                    ₡{rangoCosto}
                  </div>

                  <div>
                    <select
                      value={catComun ?? ''}
                      onChange={e => actualizarCampoGrupo(items, 'categoriaId', e.target.value ? Number(e.target.value) : null)}
                      className="w-full text-xs px-2 py-1.5 rounded-lg outline-none"
                      style={{
                        backgroundColor: !catComun ? 'rgba(239,68,68,0.08)' : 'var(--hc-surface)',
                        border: `1px solid ${!catComun ? 'rgba(239,68,68,0.4)' : 'transparent'}`,
                        color: catComun ? 'var(--hc-text)' : 'var(--hc-muted)',
                      }}>
                      <option value="">{catComun === undefined ? 'Varias…' : 'Sin categoría'}</option>
                      {categorias.map(c => <option key={c.id} value={c.id}>{c.nombreCategoria}</option>)}
                    </select>
                  </div>

                  <div>
                    <select
                      value={marcaComun ?? ''}
                      onChange={e => actualizarCampoGrupo(items, 'marcaId', e.target.value ? Number(e.target.value) : null)}
                      className="w-full text-xs px-2 py-1.5 rounded-lg outline-none"
                      style={{ backgroundColor: 'var(--hc-surface)', color: marcaComun ? 'var(--hc-text)' : 'var(--hc-muted)', border: '1px solid transparent' }}>
                      <option value="">{marcaComun === undefined ? 'Varias…' : (items[0].marcaTexto || 'Sin marca')}</option>
                      {marcas.map(m => <option key={m.id} value={m.id}>{m.nombreMarca}</option>)}
                    </select>
                  </div>

                  <div>
                    <select
                      value={condComun ?? 'NUEVO'}
                      onChange={e => actualizarCampoGrupo(items, 'condicion', e.target.value)}
                      className="w-full text-xs px-2 py-1.5 rounded-lg outline-none"
                      style={{ backgroundColor: 'var(--hc-surface)', color: 'var(--hc-text)', border: '1px solid transparent' }}>
                      {CONDICIONES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>

                  <div className="text-center text-xs" style={{ color: 'var(--hc-muted)' }}>
                    {stockTotal}
                  </div>

                  <div className="flex justify-center">
                    <button type="button" onClick={() => toggleGrupoExpandido(key)}
                      className="p-1 rounded-lg transition-transform"
                      style={{ color: 'var(--hc-muted)', transform: expandido ? 'rotate(180deg)' : 'none' }}
                      title={expandido ? 'Contraer' : 'Ver detalle de cada color'}>
                      <IconChevron />
                    </button>
                  </div>
                </div>

                {expandido && items.map((p, idx) => (
                  <FilaProducto key={p._id} p={p} isLast={idx === items.length - 1}
                    categorias={categorias} marcas={marcas} updateRow={updateRow} />
                ))}
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 pt-1">
        <button type="button" onClick={onVolver}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
          style={{ backgroundColor: 'var(--hc-surface-2)', color: 'var(--hc-text)', border: '1px solid var(--hc-border)' }}>
          <IconArrow /> Volver
        </button>

        <button type="button" onClick={onConfirmar} disabled={guardando || seleccionados.length === 0}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
          style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}>
          {guardando
            ? <><IconSpinner /> Importando…</>
            : <><IconCheck /> Importar {seleccionados.length} producto{seleccionados.length !== 1 ? 's' : ''}</>
          }
        </button>
      </div>
    </>
  )
}
