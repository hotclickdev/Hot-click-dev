export default function DataCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg p-2.5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <p className="text-[10px] text-[#8e8e9a] mb-0.5">{label}</p>
      <p className="text-[#e8e8ed] font-medium truncate">{value}</p>
    </div>
  )
}
