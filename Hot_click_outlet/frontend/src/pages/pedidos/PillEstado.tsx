import type { TonoEstado } from './paquetePedido'

const ESTILO_TONO: Record<TonoEstado, string> = {
  azul: 'bg-hc-blue-50 text-hc-blue-600',
  ambar: 'bg-hc-warning-bg text-hc-warning',
  verde: 'bg-hc-green-50 text-hc-success-text',
  rojo: 'bg-[#fef2f1] text-hc-red-600',
}

/** Píldora de estado de pedido y de paquete (Figma `28:1349`, `37:1374`). */
export default function PillEstado({ tono, texto }: { tono: TonoEstado; texto: string }) {
  return (
    <span className={`shrink-0 whitespace-nowrap rounded-full px-[8px] py-[3px] text-[11px] font-semibold leading-[13px] ${ESTILO_TONO[tono]}`}>
      {texto}
    </span>
  )
}
