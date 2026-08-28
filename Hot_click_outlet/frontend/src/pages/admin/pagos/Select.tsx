import type { OpcionSelect } from './pagosHelpers'

export default function Select({ value, onChange, options }: {
  value: string
  onChange: (v: string) => void
  options: OpcionSelect[]
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-3 py-2 rounded-lg bg-[#111114] border border-white/10 text-[#e8e8ed] text-sm focus:outline-none focus:border-[#4f7cff] transition-colors"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}
