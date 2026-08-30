import { ESTADO_PEDIDO_STYLE } from './empresasHelpers'

export default function EstadoBadge({ estado }: { estado?: string }) {
  const s = ESTADO_PEDIDO_STYLE[estado ?? ''] ?? { bg: 'rgba(142,142,154,0.14)', text: '#A7B0BC' }
  return (
    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
      style={{ backgroundColor: s.bg, color: s.text }}>{estado}</span>
  )
}
