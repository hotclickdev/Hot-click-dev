import { useCatalogoVendedor } from '@/prototipo/compartido/useCatalogoVendedor'

/**
 * Catálogo del vendedor: API real (`productService.adminGetAll`).
 */
export function useCatalogoEmprendedor() {
  return useCatalogoVendedor()
}
