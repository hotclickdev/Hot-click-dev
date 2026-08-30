export default function KpiCard({ label, value, color = 'text-[#e8e8ed]' }: {
  label: string
  value?: number | string | null
  color?: string
}) {
  return (
    <div className="bg-[#111114] border border-white/8 rounded-xl p-4">
      <p className="text-[#8e8e9a] text-xs mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value ?? '—'}</p>
    </div>
  )
}
