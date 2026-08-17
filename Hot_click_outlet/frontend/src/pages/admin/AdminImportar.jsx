import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useToast } from '@/components/ui/Toast'
import useAuthStore from '@/store/authStore'
import { IconCheck } from './importar/importarIcons'
import ImportarResultados from './importar/ImportarResultados'
import ImportarTabs from './importar/ImportarTabs'
import ImportarToolbar from './importar/ImportarToolbar'
import { useAdminImportarActions } from './importar/useAdminImportarActions'

export default function AdminImportar() {
  const { showToast: addToast } = useToast()
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

  const [empresas,            setEmpresas]            = useState([])
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState('')

  const [bodegaGlobal,    setBodegaGlobal]    = useState('')
  const [catGlobal,       setCatGlobal]       = useState('')
  const [marcaGlobal,     setMarcaGlobal]     = useState('')
  const [condicionGlobal, setCondicionGlobal] = useState('NUEVO')
  const [stockGlobal,     setStockGlobal]     = useState('')
  const [margenGlobal,    setMargenGlobal]    = useState('10')

  const updateRow = (id, field, value) =>
    setProductos(prev => prev.map(p => p._id === id ? { ...p, [field]: value } : p))

  const toggleAll = (v) =>
    setProductos(prev => prev.map(p => ({ ...p, _sel: v })))

  const seleccionados  = productos.filter(p => p._sel)
  const todosSelec     = seleccionados.length === productos.length && productos.length > 0
  const algunoInvalido = seleccionados.some(p => !p.nombreProducto?.trim() || !p.categoriaId)

  const {
    onCambiarEmpresa,
    extraer,
    aplicarCategoriaATodos,
    aplicarMarcaATodos,
    aplicarCondicionATodos,
    aplicarStockATodos,
    aplicarMargenATodos,
    confirmar,
  } = useAdminImportarActions({
    esAdminIT,
    tab,
    url,
    archivo,
    empresaSeleccionada,
    bodegaGlobal,
    seleccionados,
    algunoInvalido,
    addToast,
    setCargando,
    setGuardando,
    setProductos,
    setCategorias,
    setMarcas,
    setBodegas,
    setEmpresas,
    setEmpresaSeleccionada,
    setBodegaGlobal,
    setPaso,
    setCatGlobal,
    setMarcaGlobal,
    setCondicionGlobal,
    setStockGlobal,
    setMargenGlobal,
    margenGlobal,
    catGlobal,
    marcaGlobal,
    condicionGlobal,
    stockGlobal,
  })

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
