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
      className="px-3 py-2 rounded-lg bg-hc-surface border border-hc-border text-hc-text text-sm focus:outline-none focus:border-hc-primary transition-colors"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}
