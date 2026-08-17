import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { importService } from '@/services/importService'
import { productService } from '@/services/productService'
import { marcaService } from '@/services/marcaService'
import { adminService, warehouseService } from '@/services/orderService'
import { useToast } from '@/components/ui/Toast'
import useAuthStore from '@/store/authStore'
import { detectarColor } from '@/utils/colorDetector'
import { fmtColones } from './importar/importarHelpers'
import { IconCheck } from './importar/importarIcons'
import ImportarResultados from './importar/ImportarResultados'
import ImportarTabs from './importar/ImportarTabs'
import ImportarToolbar from './importar/ImportarToolbar'

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
      if (!esAdminIT) llamadas.push(warehouseService.getAll())
      else llamadas.push(adminService.getEmpresas())

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
      const bodRes = await warehouseService.getAll({ empresaId: id })
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

      // Agrupa como variantes los productos que comparten nombre base (sin el color) —
      // ej. "Renegado marron oscuro hombre" y "Renegado camel hombre" -> mismo grupo.
      // Un "grupo" de 1 solo elemento no cuenta como variante, se deja sin agrupar.
      const detectados = data.map((p) => detectarColor(p.nombreProducto || ''))
      const conteoPorClave = new Map()
      detectados.forEach(({ label, nombreSinColor }) => {
        if (!label) return
        const clave = nombreSinColor.toLowerCase()
        conteoPorClave.set(clave, (conteoPorClave.get(clave) ?? 0) + 1)
      })
      const idPorClave = new Map()

      setProductos(data.map((p, i) => {
        const { label, nombreSinColor } = detectados[i]
        const clave = nombreSinColor.toLowerCase()
        let grupoVarianteId = null
        if (label && conteoPorClave.get(clave) >= 2) {
          if (!idPorClave.has(clave)) idPorClave.set(clave, crypto.randomUUID())
          grupoVarianteId = idPorClave.get(clave)
        }
        return {
          ...p,
          _id:          i,
          _sel:         true,
          _ventaFmt:    fmtColones(p.precioVenta  ?? 0),
          _costoFmt:    fmtColones(p.precioCompra ?? 0),
          precioVenta:  p.precioVenta  ?? 0,
          precioCompra: p.precioCompra ?? 0,
          stockActual:  0,
          condicion:    'NUEVO',
          colorVariante: label,
          grupoVarianteId,
        }
      }))

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
      // ojo: precioCompra puede ser legítimamente 0 — no usar "!p.precioCompra"
      // (eso trata 0 como "sin costo" y el botón queda como no-op para todo el import)
      if (!p._sel || p.precioCompra == null) return p
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
        grupoVarianteId:    p.grupoVarianteId ?? null,
        colorVariante:      p.colorVariante   ?? null,
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

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--hc-text)' }}>Importar catálogo</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--hc-muted)' }}>
          Importá productos desde una URL, PDF o CSV. La IA extrae los datos automáticamente.
        </p>
      </div>

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

        {paso === 1 && (
          <motion.div key="paso1"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="rounded-2xl p-6 space-y-5"
            style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}
          >
            <ImportarTabs
              tab={tab}
              onTab={(id) => { setTab(id); setArchivoState(null) }}
              url={url}
              setUrl={setUrl}
              archivo={archivo}
              dragging={dragging}
              fileRef={fileRef}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              setArchivoState={setArchivoState}
              onExtraer={extraer}
              cargando={cargando}
            />
          </motion.div>
        )}

        {paso === 2 && (
          <motion.div key="paso2"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <ImportarToolbar
              esAdminIT={esAdminIT}
              empresas={empresas}
              empresaSeleccionada={empresaSeleccionada}
              onCambiarEmpresa={onCambiarEmpresa}
              margenGlobal={margenGlobal}
              setMargenGlobal={setMargenGlobal}
              aplicarMargenATodos={aplicarMargenATodos}
              bodegaGlobal={bodegaGlobal}
              setBodegaGlobal={setBodegaGlobal}
              bodegas={bodegas}
              catGlobal={catGlobal}
              setCatGlobal={setCatGlobal}
              categorias={categorias}
              aplicarCategoriaATodos={aplicarCategoriaATodos}
              marcaGlobal={marcaGlobal}
              setMarcaGlobal={setMarcaGlobal}
              marcas={marcas}
              aplicarMarcaATodos={aplicarMarcaATodos}
              condicionGlobal={condicionGlobal}
              setCondicionGlobal={setCondicionGlobal}
              aplicarCondicionATodos={aplicarCondicionATodos}
              stockGlobal={stockGlobal}
              setStockGlobal={setStockGlobal}
              aplicarStockATodos={aplicarStockATodos}
              seleccionados={seleccionados}
              productos={productos}
              todosSelec={todosSelec}
              toggleAll={toggleAll}
            />

            <ImportarResultados
              productos={productos}
              setProductos={setProductos}
              categorias={categorias}
              marcas={marcas}
              updateRow={updateRow}
              onVolver={() => { setPaso(1); setProductos([]) }}
              onConfirmar={confirmar}
              guardando={guardando}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
