import StatCard from '@/components/ui/StatCard'

const COLOR_TOKEN: Record<string, string> = {
  'text-hc-text': 'var(--hc-text)',
  'text-green-400': 'var(--hc-success)',
  'text-emerald-400': 'var(--hc-success)',
  'text-red-400': 'var(--hc-danger)',
  'text-yellow-400': 'var(--hc-warning)',
}

export default function KpiCard({ label, value, color = 'text-hc-text' }: {
  label: string
  value?: number | string | null
  color?: string
}) {
  return <StatCard label={label} value={value ?? '—'} color={COLOR_TOKEN[color] ?? 'var(--hc-text)'} />
}
