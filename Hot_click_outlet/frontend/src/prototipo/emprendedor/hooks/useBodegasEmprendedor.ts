import { useEmprendedorDemoStore } from '../store/emprendedorDemoStore'

/**
 * Bodegas del prototipo (mock Figma, sin API).
 */
export function useBodegasEmprendedor() {
  const bodegas = useEmprendedorDemoStore((estado) => estado.bodegas)
  return { bodegas }
}
