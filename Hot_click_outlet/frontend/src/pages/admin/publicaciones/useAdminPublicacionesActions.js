import { useCallback } from 'react'
import { publicacionService } from '@/services/publicacionService'

const MSG_PRECIOS_GUARDADOS = 'Precios guardados y texto FB generado'

/**
 * Handlers publicaciones admin — mismo orden de llamadas al service.
 * @param {object} deps
 */
export function useAdminPublicacionesActions(deps) {
  const {
    toast,
    filtroEstado,
    setResultado,
    setTab,
    setPublicaciones,
    setLoadingCola,
    setSeleccionados,
    setModalProductos,
    setSearchProd,
    setImagen,
    setPreview,
    setModoAnalisis,
  } = deps

  const cargarCola = useCallback(async () => {
    setLoadingCola(true)
    try {
      const r = await publicacionService.listar(filtroEstado || undefined)
      setPublicaciones(Array.isArray(r.data) ? r.data : [])
    } catch (err) {
      console.error('[AdminPublicaciones] cola', err)
      toast({ message: 'Error cargando la cola', type: 'error' })
    } finally {
      setLoadingCola(false)
    }
  }, [filtroEstado, setLoadingCola, setPublicaciones, toast])

  const handleImagen = (file) => {
    setImagen(file)
    setResultado(null)
    setPreview(URL.createObjectURL(file))
  }

  const handleAnalizar = () => analizarProducto(deps)

  const handleGuardar = () => guardarPrecios(deps)

  const handleMarcarPublicado = async (id) => {
    try {
      await publicacionService.marcarPublicado(id)
      setPublicaciones((prev) => prev.map((p) =>
        p.id === id ? { ...p, estadoPublicacion: 'PUBLICADO' } : p
      ))
      toast({ message: 'Marcado como publicado', type: 'success' })
    } catch (err) {
      console.error('[AdminPublicaciones] publicado', err)
      toast({ message: 'Error al actualizar', type: 'error' })
    }
  }

  const handleEliminar = async (id) => {
    if (!confirm('¿Eliminar esta publicación?')) return
    try {
      await publicacionService.eliminar(id)
      setPublicaciones((prev) => prev.filter((p) => p.id !== id))
      toast({ message: 'Eliminado', type: 'success' })
    } catch (err) {
      console.error('[AdminPublicaciones] eliminar', err)
      toast({ message: 'Error al eliminar', type: 'error' })
    }
  }

  const handleGenerarSeleccionados = () => generarSeleccionados({ ...deps, cargarCola })

  const toggleSeleccion = (id) => {
    setSeleccionados((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
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

  return {
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
  }
}

async function analizarProducto(deps) {
  if (deps.modoAnalisis === 'nombre') {
    await analizarPorNombre(deps)
    return
  }
  await analizarPorImagen(deps)
}

async function analizarPorNombre({ nombreBusqueda, productoId, toast, setAnalizando, setResultado }) {
  if (!nombreBusqueda.trim()) {
    toast({ message: 'Escribe el nombre del producto', type: 'error' })
    return
  }
  setAnalizando(true)
  setResultado(null)
  try {
    const r = await publicacionService.buscarPorNombre(nombreBusqueda.trim(), productoId || null)
    setResultado(r.data)
    if (productoId) toast({ message: MSG_PRECIOS_GUARDADOS, type: 'success' })
  } catch (err) {
    console.error('[AdminPublicaciones] buscar', err)
    toast({ message: err.response?.data?.message ?? 'Error al buscar', type: 'error' })
  } finally {
    setAnalizando(false)
  }
}

async function analizarPorImagen({ imagen, toast, setAnalizando, setResultado }) {
  if (!imagen) {
    toast({ message: 'Selecciona una imagen', type: 'error' })
    return
  }
  setAnalizando(true)
  setResultado(null)
  try {
    const fd = new FormData()
    fd.append('imagen', imagen)
    const r = await publicacionService.analizar(fd)
    setResultado(r.data)
  } catch (err) {
    console.error('[AdminPublicaciones] analizar', err)
    toast({ message: err.response?.data?.message ?? 'Error al analizar', type: 'error' })
  } finally {
    setAnalizando(false)
  }
}

async function guardarPrecios({
  productoId, modoAnalisis, nombreBusqueda, imagen, toast, setGuardando, setTab,
}) {
  if (!productoId) {
    toast({ message: 'Selecciona un producto para guardar los precios', type: 'error' })
    return
  }
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
    toast({ message: MSG_PRECIOS_GUARDADOS, type: 'success' })
    setTab('cola')
  } catch (err) {
    console.error('[AdminPublicaciones] guardar', err)
    toast({ message: err.response?.data?.message ?? 'Error al guardar', type: 'error' })
  } finally {
    setGuardando(false)
  }
}

async function generarSeleccionados({
  seleccionados, toast, setGenerando, setSeleccionados, setModalProductos, setSearchProd, setTab, cargarCola,
}) {
  if (seleccionados.size === 0) {
    toast({ message: 'Selecciona al menos un producto', type: 'error' })
    return
  }
  setGenerando(true)
  const { exitosos, fallidos } = await generarCadaProducto(seleccionados)
  if (exitosos > 0) {
    toast({
      message: `${exitosos} publicación${exitosos === 1 ? '' : 'es'} generada${exitosos === 1 ? '' : 's'}`,
      type: 'success',
    })
  }
  if (fallidos.length > 0) {
    toast({
      message: `${fallidos.length} producto${fallidos.length === 1 ? '' : 's'} no se pudo${fallidos.length === 1 ? '' : 'ieron'} generar`,
      type: 'error',
    })
  }
  setSeleccionados(new Set())
  setModalProductos(false)
  setSearchProd('')
  cargarCola()
  setTab('cola')
  setGenerando(false)
}

async function generarCadaProducto(seleccionados) {
  let exitosos = 0
  const fallidos = []
  for (const id of seleccionados) {
    try {
      await publicacionService.generar(id)
      exitosos++
    } catch (err) {
      console.error('[AdminPublicaciones] generar', id, err)
      fallidos.push(id)
    }
  }
  return { exitosos, fallidos }
}
