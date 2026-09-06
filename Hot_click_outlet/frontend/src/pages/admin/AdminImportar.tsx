import { useState, useRef, useCallback, useEffect, type DragEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSearchParams } from 'react-router-dom'
import { useToast } from '@/components/ui/Toast'
import useAuthStore from '@/store/authStore'
import { IconCheck } from './importar/importarIcons'
import ImportarResultados from './importar/ImportarResultados'
import ImportarTabs from './importar/ImportarTabs'
import ImportarToolbar from './importar/ImportarToolbar'
import { useAdminImportarActions } from './importar/useAdminImportarActions'
import EmpresaDestinoSelect from './empresas/EmpresaDestinoSelect'
import { empresaIdDesdeParam } from './empresas/empresasHelpers'
import {
  fuenteDesdeParam,
  type BodegaImportar,
  type CategoriaImportar,
  type EmpresaImportar,
  type ImportarTabId,
  type MarcaImportar,
  type ProductoImportado,
} from './importar/importarHelpers'

export default function AdminImportar() {
  const { showToast: addToast } = useToast()
  const esAdminIT = useAuthStore(st => st.userRole === 'ADMIN')
  const [searchParams] = useSearchParams()
  const empresaQuery = searchParams.get('empresaId')
  const fuenteQuery = searchParams.get('fuente')

  const [paso, setPaso] = useState(1)
  const [tab,  setTab]  = useState<ImportarTabId>(() => fuenteDesdeParam(fuenteQuery))
  const [url,  setUrl]  = useState('')
  const [archivo, setArchivoState] = useState<File | null>(null)
  const [dragging, setDragging]    = useState(false)
  const fileRef = useRef<HTMLInputElement | null>(null)

  const [cargando,  setCargando]  = useState(false)
  const [guardando, setGuardando] = useState(false)

  const [productos,    setProductos]    = useState<ProductoImportado[]>([])
  const [categorias,   setCategorias]   = useState<CategoriaImportar[]>([])
  const [marcas,       setMarcas]       = useState<MarcaImportar[]>([])
  const [bodegas,      setBodegas]      = useState<BodegaImportar[]>([])

  const [empresas,            setEmpresas]            = useState<EmpresaImportar[]>([])
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState(() => empresaIdDesdeParam(empresaQuery))

  const [bodegaGlobal,    setBodegaGlobal]    = useState('')
  const [catGlobal,       setCatGlobal]       = useState('')
  const [marcaGlobal,     setMarcaGlobal]     = useState('')
  const [condicionGlobal, setCondicionGlobal] = useState('NUEVO')
  const [stockGlobal,     setStockGlobal]     = useState('')
  const [margenGlobal,    setMargenGlobal]    = useState('10')

  const updateRow = <K extends keyof ProductoImportado>(id: number, field: K, value: ProductoImportado[K]) =>
    setProductos(prev => prev.map(p => p._id === id ? { ...p, [field]: value } : p))

  const toggleAll = (v: boolean) =>
    setProductos(prev => prev.map(p => ({ ...p, _sel: v })))

  const seleccionados  = productos.filter(p => p._sel)
  const todosSelec     = seleccionados.length === productos.length && productos.length > 0
  const algunoInvalido = seleccionados.some(p => !p.nombreProducto?.trim() || !p.categoriaId)

  const empresaActiva = empresas.find((e) => String(e.id) === empresaSeleccionada) ?? null

  const {
    cargarDatosFormulario,
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

  useEffect(() => {
    if (!esAdminIT) return
    void cargarDatosFormulario()
    const id = empresaIdDesdeParam(empresaQuery)
    if (id) void onCambiarEmpresa(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- query inicial al montar
  }, [])

  const onDrop      = useCallback((e: DragEvent<HTMLButtonElement>) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) setArchivoState(f) }, [])
  const onDragOver  = (e: DragEvent<HTMLButtonElement>) => { e.preventDefault(); setDragging(true) }
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
            {esAdminIT && (
              <EmpresaDestinoSelect
                empresas={empresas}
                value={empresaSeleccionada}
                onChange={(id) => { void onCambiarEmpresa(id) }}
              />
            )}
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
              empresa={empresaActiva}
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
