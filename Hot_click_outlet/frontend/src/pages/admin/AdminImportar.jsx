import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { importService } from '@/services/importService'
import { productService } from '@/services/productService'
import { marcaService } from '@/services/marcaService'
import { useToast } from '@/components/ui/Toast'
import api from '@/services/api'
import useAuthStore from '@/store/authStore'

// ── Iconos ────────────────────────────────────────────────────────────────────
const s = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }

function IconGlobe()   { return <svg viewBox="0 0 24 24" className="w-5 h-5" {...s}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10A15.3 15.3 0 0112 2z"/></svg> }
function IconPdf()     { return <svg viewBox="0 0 24 24" className="w-5 h-5" {...s}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> }
function IconCsv()     { return <svg viewBox="0 0 24 24" className="w-5 h-5" {...s}><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/></svg> }
function IconCheck()   { return <svg viewBox="0 0 24 24" className="w-4 h-4" {...s}><polyline points="20 6 9 17 4 12"/></svg> }
function IconWarn()    { return <svg viewBox="0 0 24 24" className="w-4 h-4" {...s}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> }
function IconUpload()  { return <svg viewBox="0 0 24 24" className="w-6 h-6" {...s}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> }
function IconSpinner() { return <svg viewBox="0 0 24 24" className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" strokeWidth={2.5}><circle cx="12" cy="12" r="10" strokeOpacity={0.2}/><path d="M12 2a10 10 0 0110 10" strokeLinecap="round"/></svg> }
function IconArrow()   { return <svg viewBox="0 0 24 24" className="w-4 h-4" {...s}><path d="M19 12H5M12 5l-7 7 7 7"/></svg> }
function IconImg()     { return <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" {...s}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> }
function IconEye()     { return <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" {...s}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> }
function IconApply()   { return <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" {...s}><path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg> }

const TABS = [
  { id: 'url', label: 'URL del sitio', icon: <IconGlobe /> },
  { id: 'pdf', label: 'Catálogo PDF',  icon: <IconPdf />  },
  { id: 'csv', label: 'Archivo CSV',   icon: <IconCsv />  },
]

const CONDICIONES = [
  { value: 'NUEVO',      label: 'Nuevo'      },
  { value: 'COMO_NUEVO', label: 'Como nuevo' },
  { value: 'USADO',      label: 'Usado'      },
]

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtColones = (v) => (v || v === 0) ? Number(v).toLocaleString('es-CR') : ''
const parseColones = (str) => parseInt(String(str ?? '').replace(/[^0-9]/g, ''), 10) || 0

// Thumbnail inline: muestra la imagen si la URL carga; se oculta silenciosamente en error
function ImgPreview({ url }) {
  const [ok, setOk] = useState(true)
  if (!url || !ok) return null
  return (
    <img
      src={url}
      alt=""
      onError={() => setOk(false)}
      className="w-10 h-10 rounded-lg object-cover shrink-0"
      style={{ border: '1px solid var(--hc-border)' }}
    />
  )
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function AdminImportar() {
  const { showToast: addToast } = useToast()
  const navigate = useNavigate()
  const esAdminIT = useAuthStore(st => st.userRole === 'ADMIN')

  const [paso, setPaso] = useState(1)
  const [tab,  setTab]  = useState('url')
  const [url,  setUrl]  = useState('')
  const [archivo, setArchivoState] = useState(null)
  const [dragging, setDragging]    = useState(false)
  const fileRef = useRef(null)

  const [cargando,  setCargando]  = useState(false)
  const [guardando, setGuardando] = useState(false)

  const [productos,    setProductos]    = useState([])
  const [categorias,   setCategorias]   = useState([])
  const [marcas,       setMarcas]       = useState([])
  const [bodegas,      setBodegas]      = useState([])

  // Solo para IT Admin (sin empresa propia) — a qué empresa se le asignan los productos
  const [empresas,            setEmpresas]            = useState([])
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState('')

  // Selectores globales (aplican a todos los productos)
  const [bodegaGlobal,    setBodegaGlobal]    = useState('')
  const [catGlobal,       setCatGlobal]       = useState('')   // para "aplicar a todos"
  const [marcaGlobal,     setMarcaGlobal]     = useState('')
  const [condicionGlobal, setCondicionGlobal] = useState('NUEVO')
  const [stockGlobal,     setStockGlobal]     = useState('')
  const [margenGlobal,    setMargenGlobal]    = useState('10')

  // ── Paso 1: extraer ───────────────────────────────────────────────────────

  async function cargarDatosFormulario() {
    try {
      const llamadas = [productService.getCategories(), marcaService.getAll()]
      // IT Admin no tiene empresa propia: las bodegas dependen de qué empresa elija,
      // así que no se cargan todavía (quedarían mezcladas entre todos los tenants).
      if (!esAdminIT) llamadas.push(api.get('/bodegas'))
      else llamadas.push(api.get('/admin/empresas'))

      const [catRes, marcRes, terceraRes] = await Promise.all(llamadas)
      const cats = catRes.data?.data ?? catRes.data ?? []
      const mars = marcRes.data?.data ?? marcRes.data ?? []
      setCategorias(cats)
      setMarcas(mars)

      if (esAdminIT) {
        setEmpresas(terceraRes.data?.data ?? [])
      } else {
        const bods = terceraRes.data?.data ?? terceraRes.data ?? []
        setBodegas(bods)
        if (bods.length > 0) setBodegaGlobal(String(bods[0].id))
      }
    } catch { /* silencioso */ }
  }

  // Solo IT Admin: al elegir la empresa destino, recarga las bodegas de ESA empresa
  // (antes de elegir, no hay forma de saber a cuál bodega debería ir el stock).
  async function onCambiarEmpresa(id) {
    setEmpresaSeleccionada(id)
    setBodegaGlobal('')
    if (!id) { setBodegas([]); return }
    try {
      const bodRes = await api.get('/bodegas', { params: { empresaId: id } })
      const bods = bodRes.data?.data ?? bodRes.data ?? []
      setBodegas(bods)
      if (bods.length > 0) setBodegaGlobal(String(bods[0].id))
    } catch {
      addToast('No se pudieron cargar las bodegas de esa empresa', 'error')
    }
  }

  async function extraer() {
    setCargando(true)
    try {
      let res
      if (tab === 'url') {
        if (!url.trim()) { addToast('Ingresá una URL', 'error'); return }
        res = await importService.extraerDeUrl(url.trim())
      } else if (tab === 'pdf') {
        if (!archivo) { addToast('Seleccioná un PDF', 'error'); return }
        res = await importService.extraerDePdf(archivo)
      } else {
        if (!archivo) { addToast('Seleccioná un CSV', 'error'); return }
        res = await importService.extraerDeCsv(archivo)
      }

      const data = res.data?.data ?? res.data ?? []
      if (data.length === 0) {
        addToast('No se encontraron productos en la fuente indicada', 'warning')
        return
      }

      setProductos(data.map((p, i) => ({
        ...p,
        _id:          i,
        _sel:         true,
        _ventaFmt:    fmtColones(p.precioVenta  ?? 0),
        _costoFmt:    fmtColones(p.precioCompra ?? 0),
        precioVenta:  p.precioVenta  ?? 0,
        precioCompra: p.precioCompra ?? 0,
        stockActual:  0,
        condicion:    'NUEVO',
      })))

      await cargarDatosFormulario()
      setPaso(2)
    } catch (err) {
      const msg = err.response?.data?.message ?? err.response?.data?.error ?? 'Error al extraer productos'
      addToast(msg, 'error')
    } finally {
      setCargando(false)
    }
  }

  // ── Paso 2: edición ───────────────────────────────────────────────────────

  const updateRow = (id, field, value) =>
    setProductos(prev => prev.map(p => p._id === id ? { ...p, [field]: value } : p))

  const toggleAll = (v) =>
    setProductos(prev => prev.map(p => ({ ...p, _sel: v })))

  // Aplica la categoría global a todos los productos seleccionados
  function aplicarCategoriaATodos() {
    if (!catGlobal) return
    setProductos(prev => prev.map(p => p._sel ? { ...p, categoriaId: Number(catGlobal) } : p))
    addToast('Categoría aplicada a todos los seleccionados', 'success')
  }

  function aplicarMarcaATodos() {
    if (!marcaGlobal) return
    setProductos(prev => prev.map(p => p._sel ? { ...p, marcaId: Number(marcaGlobal) } : p))
    addToast('Marca aplicada a todos los seleccionados', 'success')
  }

  function aplicarCondicionATodos() {
    setProductos(prev => prev.map(p => p._sel ? { ...p, condicion: condicionGlobal } : p))
    addToast('Condición aplicada a todos los seleccionados', 'success')
  }

  function aplicarStockATodos() {
    const valor = Math.max(0, parseInt(stockGlobal, 10) || 0)
    setProductos(prev => prev.map(p => p._sel ? { ...p, stockActual: valor } : p))
    addToast('Stock aplicado a todos los seleccionados', 'success')
  }

  // Calcula precioVenta = precioCompra + margen% para todos los seleccionados con costo cargado
  function aplicarMargenATodos() {
    const pct = parseFloat(margenGlobal)
    if (isNaN(pct)) return
    setProductos(prev => prev.map(p => {
      if (!p._sel || !p.precioCompra) return p
      const venta = Math.round(p.precioCompra * (1 + pct / 100))
      return { ...p, precioVenta: venta, _ventaFmt: fmtColones(venta) }
    }))
    addToast(`Precio de venta recalculado (costo + ${pct}%) en los seleccionados`, 'success')
  }

  const seleccionados  = productos.filter(p => p._sel)
  const todosSelec     = seleccionados.length === productos.length && productos.length > 0
  const algunoInvalido = seleccionados.some(p => !p.nombreProducto?.trim() || !p.categoriaId)

  // ── Confirmar importación ─────────────────────────────────────────────────

  async function confirmar() {
    if (seleccionados.length === 0) { addToast('Seleccioná al menos un producto', 'error'); return }
    if (algunoInvalido)             { addToast('Completá nombre y categoría en todos los seleccionados', 'error'); return }
    if (esAdminIT && !empresaSeleccionada) {
      addToast('Elegí la empresa a la que se van a asignar los productos', 'error')
      return
    }

    setGuardando(true)
    try {
      const bodegaId = bodegaGlobal ? Number(bodegaGlobal) : null

      const payload = seleccionados.map(p => ({
        nombreProducto:     p.nombreProducto,
        precioVenta:        p.precioVenta    ?? 0,
        precioCompra:       p.precioCompra   ?? 0,
        descripcionCorta:   p.descripcionCorta ?? '',
        imagenPrincipalUrl: p.imagenPrincipalUrl ?? null,
        marcaTexto:         p.marcaTexto ?? null,
        categoriaId:        p.categoriaId,
        marcaId:            p.marcaId    ?? null,
        bodegaId:           p.bodegaId   ?? bodegaId,
        stockActual:        parseInt(p.stockActual ?? 0, 10),
        condicion:          p.condicion  ?? 'NUEVO',
      }))

      const res = await importService.confirmar(payload, esAdminIT ? Number(empresaSeleccionada) : null)
      const { ok, errores } = res.data?.data ?? {}
      addToast(`${ok} producto(s) importado(s) correctamente`, 'success')
      if (errores?.length) addToast(`${errores.length} con errores`, 'warning')
      navigate('/admin/productos')
    } catch (err) {
      const msg = err.response?.data?.message ?? err.response?.data?.error ?? 'Error al importar'
      addToast(msg, 'error')
    } finally {
      setGuardando(false)
    }
  }

  // ── Drop zone ─────────────────────────────────────────────────────────────

  const onDrop      = useCallback((e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) setArchivoState(f) }, [])
  const onDragOver  = (e) => { e.preventDefault(); setDragging(true) }
  const onDragLeave = ()  => setDragging(false)

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--hc-text)' }}>Importar catálogo</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--hc-muted)' }}>
          Importá productos desde una URL, PDF o CSV. La IA extrae los datos automáticamente.
        </p>
      </div>

      {/* Indicador de pasos */}
      <div className="flex items-center gap-3">
        {[{ n: 1, label: 'Seleccionar fuente' }, { n: 2, label: 'Verificar y categorizar' }].map(({ n, label }, i) => (
          <div key={n} className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
              style={{ backgroundColor: paso >= n ? 'var(--hc-accent)' : 'var(--hc-surface-2)', color: paso >= n ? '#fff' : 'var(--hc-muted)' }}>
              {paso > n ? <IconCheck /> : n}
            </div>
            <span className="text-sm font-medium" style={{ color: paso >= n ? 'var(--hc-text)' : 'var(--hc-muted)' }}>{label}</span>
            {i < 1 && <div className="w-8 h-px mx-1" style={{ backgroundColor: 'var(--hc-border)' }} />}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">

        {/* ══ PASO 1 ══ */}
        {paso === 1 && (
          <motion.div key="paso1"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="rounded-2xl p-6 space-y-5"
            style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}
          >
            {/* Tabs */}
            <div className="flex gap-1 p-1 rounded-xl" style={{ backgroundColor: 'var(--hc-surface-2)' }}>
              {TABS.map(t => (
                <button key={t.id} onClick={() => { setTab(t.id); setArchivoState(null) }}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all"
                  style={{
                    backgroundColor: tab === t.id ? 'var(--hc-surface)' : 'transparent',
                    color:           tab === t.id ? 'var(--hc-text)'    : 'var(--hc-muted)',
                    boxShadow:       tab === t.id ? '0 1px 3px rgba(0,0,0,0.15)' : 'none',
                  }}>
                  {t.icon}
                  <span className="hidden sm:inline">{t.label}</span>
                </button>
              ))}
            </div>

            {tab === 'url' && (
              <div className="space-y-2">
                <label className="text-sm font-medium" style={{ color: 'var(--hc-text)' }}>
                  URL de la tienda o página de productos
                </label>
                <input type="url" value={url} onChange={e => setUrl(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && extraer()}
                  placeholder="https://tiendacliente.com/productos"
                  className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                  style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}
                />
                <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>
                  La URL debe ser pública. La IA extraerá automáticamente los productos que encuentre.
                </p>
              </div>
            )}

            {(tab === 'pdf' || tab === 'csv') && (
              <div onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}
                onClick={() => fileRef.current?.click()}
                className="flex flex-col items-center justify-center gap-3 p-10 rounded-xl cursor-pointer transition-all"
                style={{
                  border: `2px dashed ${dragging ? 'var(--hc-accent)' : 'var(--hc-border)'}`,
                  backgroundColor: dragging ? 'rgba(231,59,51,0.04)' : 'var(--hc-surface-2)',
                }}>
                <input ref={fileRef} type="file" className="hidden"
                  accept={tab === 'pdf' ? '.pdf' : '.csv,.txt'}
                  onChange={e => setArchivoState(e.target.files[0] || null)} />
                <IconUpload />
                {archivo
                  ? <p className="text-sm font-medium" style={{ color: 'var(--hc-text)' }}>{archivo.name}</p>
                  : <>
                      <p className="text-sm font-medium" style={{ color: 'var(--hc-text)' }}>Arrastrá o hacé clic para subir</p>
                      <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>{tab === 'pdf' ? 'PDF hasta 30 MB' : 'CSV hasta 5 MB'}</p>
                    </>
                }
              </div>
            )}

            <button onClick={extraer} disabled={cargando}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-60"
              style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}>
              {cargando
                ? <><IconSpinner /> {tab === 'pdf' ? 'Analizando con IA… (puede tardar unos minutos en PDFs escaneados)' : 'Analizando con IA…'}</>
                : 'Extraer productos'}
            </button>
          </motion.div>
        )}

        {/* ══ PASO 2 ══ */}
        {paso === 2 && (
          <motion.div key="paso2"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {/* Barra de config global */}
            <div className="flex flex-wrap items-center gap-3 px-4 py-3 rounded-xl"
              style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>

              {/* Empresa destino — solo IT Admin, que no tiene empresa propia */}
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

              {/* Aplicar margen (% sobre costo) a todos */}
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

              {/* Separador */}
              <div className="w-px h-5 shrink-0" style={{ backgroundColor: 'var(--hc-border)' }} />

              {/* Bodega global */}
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

              {/* Separador */}
              <div className="w-px h-5 shrink-0" style={{ backgroundColor: 'var(--hc-border)' }} />

              {/* Aplicar categoría a todos */}
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

              {/* Separador */}
              <div className="w-px h-5 shrink-0" style={{ backgroundColor: 'var(--hc-border)' }} />

              {/* Aplicar marca a todos */}
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

              {/* Separador */}
              <div className="w-px h-5 shrink-0" style={{ backgroundColor: 'var(--hc-border)' }} />

              {/* Aplicar condición a todos */}
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

              {/* Separador */}
              <div className="w-px h-5 shrink-0" style={{ backgroundColor: 'var(--hc-border)' }} />

              {/* Aplicar stock a todos */}
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

              {/* Conteo y toggle */}
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

            {/* Tabla */}
            <div className="rounded-2xl overflow-x-auto" style={{ border: '1px solid var(--hc-border)' }}>

              {/* Encabezado */}
              <div className="grid text-[10px] font-semibold uppercase tracking-wider px-3 py-3 min-w-[960px]"
                style={{
                  gridTemplateColumns: '28px 1fr 95px 95px 125px 105px 90px 60px',
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
              </div>

              {/* Filas */}
              <div style={{ backgroundColor: 'var(--hc-surface)' }}>
                {productos.map((p, idx) => {
                  const faltaNombre    = !p.nombreProducto?.trim()
                  const faltaCategoria = !p.categoriaId
                  const precioZero     = p._sel && (p.precioVenta ?? 0) === 0
                  const tieneAlerta    = p._sel && (faltaNombre || faltaCategoria || precioZero)

                  return (
                    <div key={p._id}
                      className="grid items-start px-3 py-3 gap-x-2 min-w-[960px]"
                      style={{
                        gridTemplateColumns: '28px 1fr 95px 95px 125px 105px 90px 60px',
                        borderBottom: idx < productos.length - 1 ? '1px solid var(--hc-border)' : 'none',
                        backgroundColor: tieneAlerta ? 'rgba(245,158,11,0.04)' : 'transparent',
                        opacity: p._sel ? 1 : 0.4,
                      }}>

                      {/* Checkbox */}
                      <div className="pt-1.5 flex justify-center">
                        <input type="checkbox" checked={p._sel}
                          onChange={e => updateRow(p._id, '_sel', e.target.checked)}
                          className="w-4 h-4 cursor-pointer accent-[var(--hc-accent)]" />
                      </div>

                      {/* Nombre + descripción + imagen */}
                      <div className="space-y-1 min-w-0">
                        <input
                          value={p.nombreProducto ?? ''}
                          onChange={e => updateRow(p._id, 'nombreProducto', e.target.value)}
                          placeholder="Nombre del producto"
                          className="w-full text-sm font-medium px-2 py-1 rounded-lg outline-none"
                          style={{
                            backgroundColor: faltaNombre && p._sel ? 'rgba(239,68,68,0.08)' : 'var(--hc-surface-2)',
                            border: `1px solid ${faltaNombre && p._sel ? 'rgba(239,68,68,0.4)' : 'transparent'}`,
                            color: 'var(--hc-text)',
                          }} />
                        <input
                          value={p.descripcionCorta ?? ''}
                          onChange={e => updateRow(p._id, 'descripcionCorta', e.target.value)}
                          placeholder="Descripción breve…"
                          className="w-full text-xs px-2 py-1 rounded-lg outline-none"
                          style={{ backgroundColor: 'transparent', color: 'var(--hc-muted)' }} />

                        {/* Imagen URL editable + preview inline */}
                        <div className="flex items-center gap-1.5">
                          {/* Thumbnail inline */}
                          <ImgPreview url={p.imagenPrincipalUrl} />

                          <div className="flex-1 flex items-center gap-1">
                            <span style={{ color: 'var(--hc-muted)' }}><IconImg /></span>
                            <input
                              value={p.imagenPrincipalUrl ?? ''}
                              onChange={e => updateRow(p._id, 'imagenPrincipalUrl', e.target.value || null)}
                              placeholder="https://... (URL imagen)"
                              className="flex-1 text-[11px] px-2 py-0.5 rounded-lg outline-none"
                              style={{ backgroundColor: 'var(--hc-surface-2)', color: 'var(--hc-muted)', border: '1px solid transparent' }} />
                            {p.imagenPrincipalUrl && (
                              <a href={p.imagenPrincipalUrl} target="_blank" rel="noopener noreferrer"
                                className="shrink-0 hover:opacity-70 transition-opacity"
                                style={{ color: 'var(--hc-muted)' }} title="Ver imagen">
                                <IconEye />
                              </a>
                            )}
                          </div>
                        </div>

                        {tieneAlerta && (
                          <div className="flex items-center gap-1 text-[10px] text-amber-400">
                            <IconWarn />
                            {faltaNombre ? 'Nombre requerido' : faltaCategoria ? 'Seleccioná una categoría' : 'Precio de venta en ₡0'}
                          </div>
                        )}
                      </div>

                      {/* Precio venta */}
                      <div>
                        <input
                          value={p._ventaFmt ?? ''}
                          onChange={e => { updateRow(p._id, 'precioVenta', parseColones(e.target.value)); updateRow(p._id, '_ventaFmt', e.target.value) }}
                          onBlur={() => updateRow(p._id, '_ventaFmt', fmtColones(p.precioVenta))}
                          placeholder="0"
                          className="w-full text-sm px-2 py-1.5 rounded-lg outline-none text-right"
                          style={{
                            backgroundColor: precioZero ? 'rgba(245,158,11,0.08)' : 'var(--hc-surface-2)',
                            border: `1px solid ${precioZero ? 'rgba(245,158,11,0.4)' : 'transparent'}`,
                            color: 'var(--hc-text)',
                          }} />
                        <p className="text-[9px] text-right mt-0.5" style={{ color: 'var(--hc-muted)' }}>₡ venta</p>
                      </div>

                      {/* Precio costo */}
                      <div>
                        <input
                          value={p._costoFmt ?? ''}
                          onChange={e => { updateRow(p._id, 'precioCompra', parseColones(e.target.value)); updateRow(p._id, '_costoFmt', e.target.value) }}
                          onBlur={() => updateRow(p._id, '_costoFmt', fmtColones(p.precioCompra))}
                          placeholder="0"
                          className="w-full text-sm px-2 py-1.5 rounded-lg outline-none text-right"
                          style={{ backgroundColor: 'var(--hc-surface-2)', color: 'var(--hc-text)', border: '1px solid transparent' }} />
                        <p className="text-[9px] text-right mt-0.5" style={{ color: 'var(--hc-muted)' }}>₡ costo</p>
                      </div>

                      {/* Categoría */}
                      <div>
                        <select
                          value={p.categoriaId ?? ''}
                          onChange={e => updateRow(p._id, 'categoriaId', e.target.value ? Number(e.target.value) : null)}
                          className="w-full text-xs px-2 py-1.5 rounded-lg outline-none"
                          style={{
                            backgroundColor: faltaCategoria && p._sel ? 'rgba(239,68,68,0.08)' : 'var(--hc-surface-2)',
                            border: `1px solid ${faltaCategoria && p._sel ? 'rgba(239,68,68,0.4)' : 'transparent'}`,
                            color: p.categoriaId ? 'var(--hc-text)' : 'var(--hc-muted)',
                          }}>
                          <option value="">Sin categoría</option>
                          {categorias.map(c => <option key={c.id} value={c.id}>{c.nombreCategoria}</option>)}
                        </select>
                      </div>

                      {/* Marca */}
                      <div>
                        <select
                          value={p.marcaId ?? ''}
                          onChange={e => updateRow(p._id, 'marcaId', e.target.value ? Number(e.target.value) : null)}
                          className="w-full text-xs px-2 py-1.5 rounded-lg outline-none"
                          style={{ backgroundColor: 'var(--hc-surface-2)', color: 'var(--hc-text)', border: '1px solid transparent' }}>
                          <option value="">{p.marcaTexto || 'Sin marca'}</option>
                          {marcas.map(m => <option key={m.id} value={m.id}>{m.nombreMarca}</option>)}
                        </select>
                      </div>

                      {/* Condición */}
                      <div>
                        <select
                          value={p.condicion ?? 'NUEVO'}
                          onChange={e => updateRow(p._id, 'condicion', e.target.value)}
                          className="w-full text-xs px-2 py-1.5 rounded-lg outline-none"
                          style={{ backgroundColor: 'var(--hc-surface-2)', color: 'var(--hc-text)', border: '1px solid transparent' }}>
                          {CONDICIONES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </select>
                      </div>

                      {/* Stock */}
                      <div>
                        <input type="number" min="0"
                          value={p.stockActual ?? 0}
                          onChange={e => updateRow(p._id, 'stockActual', Math.max(0, parseInt(e.target.value, 10) || 0))}
                          className="w-full text-sm px-2 py-1.5 rounded-lg outline-none text-center"
                          style={{ backgroundColor: 'var(--hc-surface-2)', color: 'var(--hc-text)', border: '1px solid transparent' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 pt-1">
              <button onClick={() => { setPaso(1); setProductos([]) }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                style={{ backgroundColor: 'var(--hc-surface-2)', color: 'var(--hc-text)', border: '1px solid var(--hc-border)' }}>
                <IconArrow /> Volver
              </button>

              <button onClick={confirmar} disabled={guardando || seleccionados.length === 0}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}>
                {guardando
                  ? <><IconSpinner /> Importando…</>
                  : <><IconCheck /> Importar {seleccionados.length} producto{seleccionados.length !== 1 ? 's' : ''}</>
                }
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
