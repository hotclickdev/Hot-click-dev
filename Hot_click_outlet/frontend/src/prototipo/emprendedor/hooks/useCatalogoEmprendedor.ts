import { useEmprendedorDemoStore } from '../store/emprendedorDemoStore'

/**
 * Catálogo del prototipo (mock Figma, sin API).
 */
export function useCatalogoEmprendedor() {
  const productos = useEmprendedorDemoStore((estado) => estado.productos)
  return { productos }
}
