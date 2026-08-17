import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/components/ui/Toast'
import { publicacionService } from '@/services/publicacionService'
import { productService } from '@/services/productService'
import AnalizarTab from './publicaciones/AnalizarTab'
import ColaTab from './publicaciones/ColaTab'
import ProductosModal from './publicaciones/ProductosModal'
import { TC_DEFAULT } from './publicaciones/publicacionesHelpers'

export default function AdminPublicaciones() {
  const { t } = useTranslation()
  const toast = useToast()
  const [tab, setTab] = useState('analizar')

  const [modoAnalisis, setModoAnalisis] = useState('nombre')
  const [imagen, setImagen] = useState(null)
  const [preview, setPreview] = useState(null)
  const [nombreBusqueda, setNombreBusqueda] = useState('')
  const [analizando, setAnalizando] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [tc, setTc] = useState(TC_DEFAULT)
  const [productoId, setProductoId] = useState('')
  const [productos, setProductos] = useState([])
  const [guardando, setGuardando] = useState(false)

  const [publicaciones, setPublicaciones] = useState([])
  const [loadingCola, setLoadingCola] = useState(false)
  const [filtroEstado, setFiltroEstado] = useState('')

  const [modalProductos, setModalProductos] = useState(false)
  const [seleccionados, setSeleccionados] = useState(new Set())
  const [searchProd, setSearchProd] = useState('')
  const [generando, setGenerando] = useState(false)

  useEffect(() => {
    publicacionService.getTipoCambio()
      .then((r) => setTc(r.data?.tipoCambio ?? TC_DEFAULT))
      .catch(() => { /* best-effort TC */ })
    productService.adminGetAll(0, 200)
      .then((r) => setProductos(r.data?.content ?? r.data ?? []))
      .catch(() => toast({ message: 'Error al cargar productos', type: 'error' }))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- montaje único
  }, [])

  const cargarCola = useCallback(async () => {
    setLoadingCola(true)
    try {
      const r = await publicacionService.listar(filtroEstado || undefined)
      setPublicaciones(Array.isArray(r.data) ? r.data : [])
    } catch { toast({ message: 'Error cargando la cola', type: 'error' }) }
    finally { setLoadingCola(false) }
  }, [filtroEstado, toast])

  useEffect(() => {
    if (tab !== 'cola') return
    cargarCola() // eslint-disable-line react-hooks/set-state-in-effect -- carga al entrar a cola / cambiar filtro
  }, [tab, cargarCola])

  const handleImagen = (file) => {
    setImagen(file)
    setResultado(null)
    setPreview(URL.createObjectURL(file))
  }

  const handleAnalizar = async () => {
    if (modoAnalisis === 'nombre') {
      if (!nombreBusqueda.trim()) { toast({ message: 'Escribe el nombre del producto', type: 'error' }); return }
      setAnalizando(true); setResultado(null)
      try {
        const r = await publicacionService.buscarPorNombre(nombreBusqueda.trim(), productoId || null)
        setResultado(r.data)
        if (productoId) { toast({ message: 'Precios guardados y texto FB generado', type: 'success' }) }
      } catch (err) {
        toast({ message: err.response?.data?.message ?? 'Error al buscar', type: 'error' })
      } finally { setAnalizando(false) }
    } else {
      if (!imagen) { toast({ message: 'Selecciona una imagen', type: 'error' }); return }
      setAnalizando(true); setResultado(null)
      try {
        const fd = new FormData()
        fd.append('imagen', imagen)
        const r = await publicacionService.analizar(fd)
        setResultado(r.data)
      } catch (err) {
        toast({ message: err.response?.data?.message ?? 'Error al analizar', type: 'error' })
      } finally { setAnalizando(false) }
    }
  }

  const handleGuardar = async () => {
    if (!productoId) { toast({ message: 'Selecciona un producto para guardar los precios', type: 'error' }); return }
    setGuardando(true)
    try {
      if (modoAnalisis === 'nombre') {
        await publicacionService.buscarPorNombre(nombreBusqueda.trim(), productoId)
      } else {
        const fd = new FormData()
        fd.append('imagen', imagen)
        fd.append('productoId', productoId)
        await publicacionService.analizar(fd)
      }
      toast({ message: 'Precios guardados y texto FB generado', type: 'success' })
      setTab('cola')
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Error al guardar', type: 'error' })
    } finally { setGuardando(false) }
  }

  const handleMarcarPublicado = async (id) => {
    try {
      await publicacionService.marcarPublicado(id)
      setPublicaciones((prev) => prev.map((p) =>
        p.id === id ? { ...p, estadoPublicacion: 'PUBLICADO' } : p
      ))
      toast({ message: 'Marcado como publicado', type: 'success' })
    } catch { toast({ message: 'Error al actualizar', type: 'error' }) }
  }

  const handleEliminar = async (id) => {
    if (!confirm('¿Eliminar esta publicación?')) return
    try {
      await publicacionService.eliminar(id)
      setPublicaciones((prev) => prev.filter((p) => p.id !== id))
      toast({ message: 'Eliminado', type: 'success' })
    } catch { toast({ message: 'Error al eliminar', type: 'error' }) }
  }

  const handleGenerarSeleccionados = async () => {
    if (seleccionados.size === 0) { toast({ message: 'Selecciona al menos un producto', type: 'error' }); return }
    setGenerando(true)
    let exitosos = 0
    const fallidos = []
    for (const id of seleccionados) {
      try {
        await publicacionService.generar(id)
        exitosos++
      } catch {
        fallidos.push(id)
      }
    }
    if (exitosos > 0) toast({ message: `${exitosos} publicación${exitosos === 1 ? '' : 'es'} generada${exitosos === 1 ? '' : 's'}`, type: 'success' })
    if (fallidos.length > 0) toast({ message: `${fallidos.length} producto${fallidos.length === 1 ? '' : 's'} no se pudo${fallidos.length === 1 ? '' : 'ieron'} generar`, type: 'error' })
    setSeleccionados(new Set())
    setModalProductos(false)
    setSearchProd('')
    cargarCola()
    setTab('cola')
    setGenerando(false)
  }

  const toggleSeleccion = (id) => {
    setSeleccionados((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const cambiarModoAnalisis = (key) => {
    setModoAnalisis(key)
    setResultado(null)
  }

  const abrirModalProductos = () => {
    setModalProductos(true)
    setSeleccionados(new Set())
    setSearchProd('')
  }

  const productosFiltrados = productos.filter((p) =>
    !searchProd || p.nombre?.toLowerCase().includes(searchProd.toLowerCase())
  )

  const filtradas = publicaciones.filter((p) =>
    !filtroEstado || p.estadoPublicacion === filtroEstado
  )

  return (
    <>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-[#e8e8ed]">{t('admin.publicaciones.title')}</h1>
          <p className="text-sm text-[#8e8e9a] mt-1">
            {t('admin.publicaciones.text')}
          </p>
        </div>

        <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/8 w-fit">
          {[
            { key: 'analizar', label: t('admin.publicaciones.new') },
            { key: 'cola', label: `${t('admin.publicaciones.status')}${publicaciones.length ? ` (${publicaciones.length})` : ''}` },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                tab === key
                  ? 'bg-[#4f7cff] text-white shadow-[0_0_12px_rgba(23,71,168,0.3)]'
                  : 'text-[#8e8e9a] hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

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
            onGuardar={productoId && resultado?.precios?.length > 0 ? handleGuardar : null}
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
