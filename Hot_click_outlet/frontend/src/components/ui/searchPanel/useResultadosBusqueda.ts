import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useChatStore from '@/store/chatStore'
import { filtrarProductosConsulta, recortarConsulta, sugerenciasBusqueda } from '@/pages/catalogo/buscarExplorar'
import { RUTA_BUSCAR_FOTO } from '@/pages/buscar/rutasBuscar'
import { useBuscarNegocios } from '@/components/comprador/negocios/useBuscarNegocios'
import { rutaTienda } from '@/components/comprador/negocios/negociosPublicos'
import type { NegocioPublico } from '@/services/negocioService'
import type { Producto } from '@/types/producto'
import { getProductCache, RECENT_KEY, saveRecent } from './searchPanelHelpers'
import { asegurarCatalogoBusqueda } from './searchPanelCatalogo'

export type CuerpoResultadosBusqueda = {
  query: string
  loading: boolean
  recent: string[]
  productResults: Producto[]
  negocioResults: NegocioPublico[]
  cargandoNegocios: boolean
  totalResultados: number
  sugerencias: string[]
  selectProduct: (producto: Producto) => void
  selectNegocio: (negocio: NegocioPublico) => void
  viewAll: () => void
  clearRecent: () => void
  setQuery: (consulta: string) => void
  preguntarAsistente: () => void
  buscarConFoto: () => void
  elegirSugerencia: (texto: string) => void
}

function useCatalogoParaBusqueda(activo: boolean) {
  const [productos, setProductos] = useState<Producto[]>(() => getProductCache() ?? [])
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    if (!activo) return
    const cache = getProductCache()
    if (cache) {
      setProductos(cache)
      return
    }
    let vigente = true
    setCargando(true)
    void asegurarCatalogoBusqueda().finally(() => {
      if (!vigente) return
      setProductos(getProductCache() ?? [])
      setCargando(false)
    })
    return () => { vigente = false }
  }, [activo])

  return { productos, cargando }
}

function useAccionesBusqueda(consulta: string, cerrar: () => void, alCambiar: (texto: string) => void) {
  const navigate = useNavigate()
  const ir = (ruta: string, reciente?: string) => {
    const limpio = reciente ? recortarConsulta(reciente) : ''
    if (limpio) saveRecent(limpio)
    cerrar()
    navigate(ruta)
  }
  const texto = recortarConsulta(consulta)
  return {
    selectProduct: (producto: Producto) => ir(`/productos/${producto.id}`, texto || producto.nombre),
    selectNegocio: (negocio: NegocioPublico) => ir(rutaTienda(negocio), texto || negocio.nombre),
    viewAll: () => ir(texto ? `/productos?search=${encodeURIComponent(texto)}` : '/productos', texto),
    elegirSugerencia: (sugerencia: string) => {
      const segura = recortarConsulta(sugerencia)
      ir(`/productos?search=${encodeURIComponent(segura)}`, segura)
    },
    preguntarAsistente: () => {
      cerrar()
      useChatStore.getState().open(texto || null)
    },
    buscarConFoto: () => {
      cerrar()
      navigate(RUTA_BUSCAR_FOTO)
    },
    clearRecent: () => { localStorage.removeItem(RECENT_KEY) },
    setQuery: alCambiar,
  }
}

/** Resultados en vivo de una consulta ya escrita (desplegable del header, Figma `8:163`). */
export function useResultadosBusqueda(consulta: string, activo: boolean, cerrar: () => void, alCambiar: (texto: string) => void): CuerpoResultadosBusqueda {
  const catalogo = useCatalogoParaBusqueda(activo)
  const { negocios, cargando } = useBuscarNegocios(activo ? consulta : '')
  const productos = useMemo(() => filtrarProductosConsulta(catalogo.productos, consulta), [catalogo.productos, consulta])
  const sugerencias = useMemo(() => sugerenciasBusqueda(consulta, catalogo.productos), [consulta, catalogo.productos])
  const acciones = useAccionesBusqueda(consulta, cerrar, alCambiar)

  return {
    query: consulta,
    loading: catalogo.cargando,
    recent: [],
    productResults: productos.slice(0, 6),
    negocioResults: negocios,
    cargandoNegocios: cargando,
    totalResultados: productos.length,
    sugerencias,
    ...acciones,
  }
}
