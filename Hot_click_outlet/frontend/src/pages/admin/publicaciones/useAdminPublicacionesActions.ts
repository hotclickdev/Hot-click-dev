import { useCallback, type Dispatch, type SetStateAction } from 'react'
import { publicacionService } from '@/services/publicacionService'
import type { Id } from '@/types/api'
import type {
  ModoAnalisis,
  PublicacionFb,
  ResultadoVision,
  TabPublicaciones,
} from './publicacionesHelpers'

const MSG_PRECIOS_GUARDADOS = 'Precios guardados y texto FB generado'

type ToastPublicaciones = (opts: { message: string; type?: 'success' | 'error' | 'warning' | 'info' }) => void

export type AdminPublicacionesActionsDeps = {
  toast: ToastPublicaciones
  modoAnalisis: ModoAnalisis
  nombreBusqueda: string
  productoId: string
  imagen: File | null
  filtroEstado: string
  seleccionados: Set<Id>
  setAnalizando: Dispatch<SetStateAction<boolean>>
  setResultado: Dispatch<SetStateAction<ResultadoVision | null>>
  setGuardando: Dispatch<SetStateAction<boolean>>
  setTab: Dispatch<SetStateAction<TabPublicaciones>>
  setPublicaciones: Dispatch<SetStateAction<PublicacionFb[]>>
  setLoadingCola: Dispatch<SetStateAction<boolean>>
  setGenerando: Dispatch<SetStateAction<boolean>>
  setSeleccionados: Dispatch<SetStateAction<Set<Id>>>
  setModalProductos: Dispatch<SetStateAction<boolean>>
  setSearchProd: Dispatch<SetStateAction<string>>
  setImagen: Dispatch<SetStateAction<File | null>>
  setPreview: Dispatch<SetStateAction<string | null>>
  setModoAnalisis: Dispatch<SetStateAction<ModoAnalisis>>
}

function mensajeErrorPublicacion(err: unknown, fallback: string): string {
  if (!err || typeof err !== 'object') return fallback
  const message = (err as { response?: { data?: { message?: unknown } } }).response?.data?.message
  return typeof message === 'string' ? message : fallback
}

export function useAdminPublicacionesActions(deps: AdminPublicacionesActionsDeps) {
  const {
    toast,
    filtroEstado,
    setResultado,
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
      setPublicaciones(Array.isArray(r.data) ? r.data as PublicacionFb[] : [])
    } catch (err: unknown) {
      console.error('[AdminPublicaciones] cola', err)
      toast({ message: 'Error cargando la cola', type: 'error' })
    } finally {
      setLoadingCola(false)
    }
  }, [filtroEstado, setLoadingCola, setPublicaciones, toast])

  const handleImagen = (file: File) => {
    setImagen(file)
    setResultado(null)
    setPreview(URL.createObjectURL(file))
  }

  const handleAnalizar = () => analizarProducto(deps)

  const handleGuardar = () => guardarPrecios(deps)

  const handleMarcarPublicado = async (id: Id) => {
    try {
      await publicacionService.marcarPublicado(id)
      setPublicaciones((prev) => prev.map((p) =>
        p.id === id ? { ...p, estadoPublicacion: 'PUBLICADO' } : p
      ))
      toast({ message: 'Marcado como publicado', type: 'success' })
    } catch (err: unknown) {
      console.error('[AdminPublicaciones] publicado', err)
      toast({ message: 'Error al actualizar', type: 'error' })
    }
  }

  const handleEliminar = async (id: Id) => {
    if (!confirm('¿Eliminar esta publicación?')) return
    try {
      await publicacionService.eliminar(id)
      setPublicaciones((prev) => prev.filter((p) => p.id !== id))
      toast({ message: 'Eliminado', type: 'success' })
    } catch (err: unknown) {
      console.error('[AdminPublicaciones] eliminar', err)
      toast({ message: 'Error al eliminar', type: 'error' })
    }
  }

  const handleGenerarSeleccionados = () => generarSeleccionados({ ...deps, cargarCola })

  const toggleSeleccion = (id: Id) => {
    setSeleccionados((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const cambiarModoAnalisis = (key: ModoAnalisis) => {
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

async function analizarProducto(deps: AdminPublicacionesActionsDeps) {
  if (deps.modoAnalisis === 'nombre') {
    await analizarPorNombre(deps)
    return
  }
  await analizarPorImagen(deps)
}

async function analizarPorNombre({ nombreBusqueda, productoId, toast, setAnalizando, setResultado }: AdminPublicacionesActionsDeps) {
  if (!nombreBusqueda.trim()) {
    toast({ message: 'Escribe el nombre del producto', type: 'error' })
    return
  }
  setAnalizando(true)
  setResultado(null)
  try {
    const r = await publicacionService.buscarPorNombre(nombreBusqueda.trim(), (productoId || null) as Id)
    setResultado(r.data as ResultadoVision)
    if (productoId) toast({ message: MSG_PRECIOS_GUARDADOS, type: 'success' })
  } catch (err: unknown) {
    console.error('[AdminPublicaciones] buscar', err)
    toast({ message: mensajeErrorPublicacion(err, 'Error al buscar'), type: 'error' })
  } finally {
    setAnalizando(false)
  }
}

async function analizarPorImagen({ imagen, toast, setAnalizando, setResultado }: AdminPublicacionesActionsDeps) {
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
    setResultado(r.data as ResultadoVision)
  } catch (err: unknown) {
    console.error('[AdminPublicaciones] analizar', err)
    toast({ message: mensajeErrorPublicacion(err, 'Error al analizar'), type: 'error' })
  } finally {
    setAnalizando(false)
  }
}

async function guardarPrecios({
  productoId, modoAnalisis, nombreBusqueda, imagen, toast, setGuardando, setTab,
}: AdminPublicacionesActionsDeps) {
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
      fd.append('imagen', imagen as File)
      fd.append('productoId', productoId)
      await publicacionService.analizar(fd)
    }
    toast({ message: MSG_PRECIOS_GUARDADOS, type: 'success' })
    setTab('cola')
  } catch (err: unknown) {
    console.error('[AdminPublicaciones] guardar', err)
    toast({ message: mensajeErrorPublicacion(err, 'Error al guardar'), type: 'error' })
  } finally {
    setGuardando(false)
  }
}

async function generarSeleccionados({
  seleccionados, toast, setGenerando, setSeleccionados, setModalProductos, setSearchProd, setTab, cargarCola,
}: AdminPublicacionesActionsDeps & { cargarCola: () => Promise<void> }) {
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

async function generarCadaProducto(seleccionados: Set<Id>) {
  let exitosos = 0
  const fallidos: Id[] = []
  for (const id of seleccionados) {
    try {
      await publicacionService.generar(id)
      exitosos++
    } catch (err: unknown) {
      console.error('[AdminPublicaciones] generar', id, err)
      fallidos.push(id)
    }
  }
  return { exitosos, fallidos }
}
