export default function KpiBox({ label, value, color = '#4ade80', sub }: {
  label: string
  value?: number | null
  color?: string
  sub?: string
}) {
  const fmt = (n: number | null | undefined) => new Intl.NumberFormat('es-CR').format(n ?? 0)
  return (
    <div className="bg-[#111114] border border-white/8 rounded-2xl p-5">
      <p className="text-xs text-[#8e8e9a] mb-1">{label}</p>
      <p className="text-2xl font-bold" style={{ color }}>₡{fmt(value)}</p>
      {sub && <p className="text-xs text-[#8e8e9a] mt-1">{sub}</p>}
    </div>
  )
}
