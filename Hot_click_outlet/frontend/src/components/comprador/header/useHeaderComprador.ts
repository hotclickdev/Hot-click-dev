import useAuthStore from '@/store/authStore'
import useCartStore from '@/store/cartStore'
import useUiStore from '@/store/uiStore'
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
  const setSearchOpen = useUiStore((s) => s.setSearchOpen)
  const { categorias } = useCategoriasCatalogo()

  return {
    cantidadPedido,
    conSesion,
    rutaCuenta: conSesion ? '/perfil' : '/login',
    categorias,
    abrirBusqueda: () => setSearchOpen(true),
  }
}
