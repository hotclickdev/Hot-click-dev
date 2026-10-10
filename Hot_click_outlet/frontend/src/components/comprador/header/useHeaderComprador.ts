import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import useAuthStore, { ADMIN_ROLES } from '@/store/authStore'
import useCartStore from '@/store/cartStore'
import useUiStore from '@/store/uiStore'
import useRutaPanel from '@/app/useRutaPanel'
import { useCategoriasCatalogo } from '../useCategoriasCatalogo'

export const RUTA_VENDE = '/planes'
export const RUTA_SERVICIOS_HOT = '/servicios'
export const RUTA_CATEGORIAS = '/categorias'

export function rutaCategoria(id: number): string {
  return `/productos?cat=${id}`
}

/** Estado compartido por las dos versiones del header del comprador. */
export function useHeaderComprador() {
  const cantidadPedido = useCartStore((s) => s.count())
  const conSesion = useAuthStore((s) => Boolean(s.token))
  const nombreUsuario = useAuthStore((s) => s.userName)
  const tienePanel = useAuthStore((s) => Boolean(s.token) && ADMIN_ROLES.has(s.userRole ?? ''))
  const rutaPanel = useRutaPanel()
  const setSearchOpen = useUiStore((s) => s.setSearchOpen)
  const { categorias } = useCategoriasCatalogo()

  return {
    cantidadPedido,
    conSesion,
    nombreUsuario,
    rutaPanel: tienePanel ? rutaPanel : null,
    rutaCuenta: conSesion ? '/perfil' : '/login',
    categorias,
    abrirBusqueda: () => setSearchOpen(true),
  }
}

/** Texto del buscador del header desktop: en el catálogo muestra la búsqueda vigente (`?search=`, Figma `30:1824`). */
export function useConsultaBuscador() {
  const { pathname, search } = useLocation()
  const vigente = pathname === '/productos' ? new URLSearchParams(search).get('search') ?? '' : ''
  const [estado, setEstado] = useState({ vigente, texto: vigente })
  if (estado.vigente !== vigente) setEstado({ vigente, texto: vigente })
  const setConsulta = (texto: string) => setEstado((previo) => ({ ...previo, texto }))
  return [estado.texto, setConsulta] as const
}
