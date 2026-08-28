import { ESTADO_CFG } from './garantiaHelpers'

export default function GarantiaEstadoBadge({ estado }: { estado: string }) {
  const cfg = ESTADO_CFG[estado] || ESTADO_CFG.PENDIENTE
  return (
    <span className="px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap"
      style={{ color: cfg.color, backgroundColor: cfg.bg }}>
      {cfg.label}
    </span>
  )
}
