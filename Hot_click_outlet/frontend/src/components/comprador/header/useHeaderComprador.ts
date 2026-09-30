import useAuthStore, { ADMIN_ROLES } from '@/store/authStore'
import useCartStore from '@/store/cartStore'
import useUiStore from '@/store/uiStore'
import useRutaPanel from '@/app/useRutaPanel'
import { useCategoriasCatalogo } from '../useCategoriasCatalogo'

export const RUTA_VENDE = '/emprende'
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
