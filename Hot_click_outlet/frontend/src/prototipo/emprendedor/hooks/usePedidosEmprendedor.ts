import { useEmprendedorDemoStore } from '../store/emprendedorDemoStore'

/**
 * Pedidos del prototipo (mock Figma, sin API).
 */
export function usePedidosEmprendedor() {
  const pedidos = useEmprendedorDemoStore((estado) => estado.pedidos)
  return { pedidos }
}
