import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { useToast } from '@/components/ui/Toast'
import { publicacionService } from '@/services/publicacionService'
import { productService } from '@/services/productService'
import AnalizarTab from './publicaciones/AnalizarTab'
import ColaTab from './publicaciones/ColaTab'
import ProductosModal from './publicaciones/ProductosModal'
import {
  TC_DEFAULT,
  type ModoAnalisis,
  type ProductoPublicacion,
  type PublicacionFb,
  type ResultadoVision,
  type TabPublicaciones,
} from './publicaciones/publicacionesHelpers'
import { useAdminPublicacionesActions } from './publicaciones/useAdminPublicacionesActions'
import type { Id } from '@/types/api'

export default function AdminPublicaciones() {
  const { t } = useTranslation()
  const toast = useToast()
  const [tab, setTab] = useState<TabPublicaciones>('analizar')

  const [modoAnalisis, setModoAnalisis] = useState<ModoAnalisis>('nombre')
  const [imagen, setImagen] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [nombreBusqueda, setNombreBusqueda] = useState('')
  const [analizando, setAnalizando] = useState(false)
  const [resultado, setResultado] = useState<ResultadoVision | null>(null)
  const [tc, setTc] = useState(TC_DEFAULT)
  const [productoId, setProductoId] = useState('')
  const [productos, setProductos] = useState<ProductoPublicacion[]>([])
  const [guardando, setGuardando] = useState(false)

  const [publicaciones, setPublicaciones] = useState<PublicacionFb[]>([])
  const [loadingCola, setLoadingCola] = useState(false)
  const [filtroEstado, setFiltroEstado] = useState('')

  const [modalProductos, setModalProductos] = useState(false)
  const [seleccionados, setSeleccionados] = useState<Set<Id>>(new Set())
  const [searchProd, setSearchProd] = useState('')
  const [generando, setGenerando] = useState(false)

  const {
    cargarCola,
    handleImagen,
    handleAnalizar,
    handleGuardar,
    handleMarcarPublicado,
    handleEliminar,
    handleGenerarSeleccionados,
    toggleSeleccion,
    cambiarModoAnalisis,
    abrirModalProductos,
  } = useAdminPublicacionesActions({
    toast,
    modoAnalisis,
    nombreBusqueda,
    productoId,
    imagen,
    filtroEstado,
    seleccionados,
    setAnalizando,
    setResultado,
    setGuardando,
    setTab,
    setPublicaciones,
    setLoadingCola,
    setGenerando,
    setSeleccionados,
    setModalProductos,
    setSearchProd,
    setImagen,
    setPreview,
    setModoAnalisis,
  })

  useEffect(() => {
    publicacionService.getTipoCambio()
      .then((r) => setTc((r.data as { tipoCambio?: number } | undefined)?.tipoCambio ?? TC_DEFAULT))
      .catch((err: unknown) => { console.error('[AdminPublicaciones] tipoCambio', err) })
    productService.adminGetAll(0, 200)
      .then((r) => setProductos(listaProductosPublicacion(r.data)))
      .catch((err: unknown) => {
        console.error('[AdminPublicaciones] productos', err)
        toast({ message: 'Error al cargar productos', type: 'error' })
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- montaje único
  }, [])

  useEffect(() => {
    if (tab !== 'cola') return
    cargarCola() // eslint-disable-line react-hooks/set-state-in-effect -- carga al entrar a cola / cambiar filtro
  }, [tab, cargarCola])

  const productosFiltrados = productos.filter((p) =>
    !searchProd || p.nombre?.toLowerCase().includes(searchProd.toLowerCase())
  )
  const filtradas = publicaciones.filter((p) =>
    !filtroEstado || p.estadoPublicacion === filtroEstado
  )
  const onGuardar = puedeGuardar(productoId, resultado) ? handleGuardar : null

  return (
    <>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-[#e8e8ed]">{t('admin.publicaciones.title')}</h1>
          <p className="text-sm text-[#8e8e9a] mt-1">
            {t('admin.publicaciones.text')}
          </p>
        </div>

        <PublicacionesTabs tab={tab} publicaciones={publicaciones} t={t} onTab={setTab} />

        {tab === 'analizar' && (
          <AnalizarTab
            modoAnalisis={modoAnalisis}
            onModoAnalisis={cambiarModoAnalisis}
            nombreBusqueda={nombreBusqueda}
            onNombreBusqueda={setNombreBusqueda}
            productoId={productoId}
            onProductoId={setProductoId}
            productos={productos}
            analizando={analizando}
            preview={preview}
            onImagen={handleImagen}
            onAnalizar={handleAnalizar}
            resultado={resultado}
            tc={tc}
            onGuardar={onGuardar}
            guardando={guardando}
          />
        )}

        {tab === 'cola' && (
          <ColaTab
            filtroEstado={filtroEstado}
            onFiltroEstado={setFiltroEstado}
            onActualizar={cargarCola}
            onAgregar={abrirModalProductos}
            loading={loadingCola}
            publicaciones={filtradas}
            onPublicado={handleMarcarPublicado}
            onEliminar={handleEliminar}
          />
        )}

        <ProductosModal
          open={modalProductos}
          searchProd={searchProd}
          onSearchProd={setSearchProd}
          productos={productosFiltrados}
          seleccionados={seleccionados}
          onToggle={toggleSeleccion}
          onClose={() => setModalProductos(false)}
          onGenerar={handleGenerarSeleccionados}
          generando={generando}
        />
      </div>
    </>
  )
}

function listaProductosPublicacion(data: unknown): ProductoPublicacion[] {
  if (Array.isArray(data)) return data as ProductoPublicacion[]
  if (data && typeof data === 'object' && 'content' in data) {
    return ((data as { content?: unknown }).content ?? []) as ProductoPublicacion[]
  }
  return []
}

function puedeGuardar(productoId: string, resultado: ResultadoVision | null) {
  return Boolean(productoId && (resultado?.precios?.length ?? 0) > 0)
}

function claseTabPublicaciones(activa: boolean) {
  const base = 'px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 '
  if (activa) return `${base}bg-[#4f7cff] text-white shadow-[0_0_12px_rgba(23,71,168,0.3)]`
  return `${base}text-[#8e8e9a] hover:text-white`
}

function PublicacionesTabs({ tab, publicaciones, t, onTab }: {
  tab: TabPublicaciones
  publicaciones: PublicacionFb[]
  t: TFunction
  onTab: (key: TabPublicaciones) => void
}) {
  const tabs: { key: TabPublicaciones; label: string }[] = [
    { key: 'analizar', label: t('admin.publicaciones.new') },
    { key: 'cola', label: `${t('admin.publicaciones.status')}${publicaciones.length ? ` (${publicaciones.length})` : ''}` },
  ]
  return (
    <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/8 w-fit">
      {tabs.map(({ key, label }) => (
        <button type="button" key={key} onClick={() => onTab(key)}
          className={claseTabPublicaciones(tab === key)}>
          {label}
        </button>
      ))}
    </div>
  )
}
