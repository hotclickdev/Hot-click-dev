import { formatPrice } from '@/utils/format'

type KpiProps = {
  label: string
  value: number
  sub?: string
  color?: string
  negative?: boolean
}

export default function Kpi({ label, value, sub, color = '#4ade80', negative = false }: KpiProps) {
  return (
    <div className="bg-[#111114] border border-white/8 rounded-2xl p-5">
      <p className="text-xs text-[#8e8e9a] mb-1">{label}</p>
      <p className="text-2xl font-bold" style={{ color }}>
        {negative && value > 0 ? '-' : ''}{formatPrice(Math.abs(value))}
      </p>
      {sub && <p className="text-xs text-[#8e8e9a] mt-1">{sub}</p>}
    </div>
  )
}
