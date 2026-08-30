import { EVENTOS_DISPONIBLES, parseEventos } from './pluginsHelpers'

export default function EventosCheckbox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const sel = parseEventos(value)
  function toggle(id: string) {
    const next = sel.includes(id) ? sel.filter(e => e !== id) : [...sel, id]
    onChange(JSON.stringify(next))
  }
  return (
    <div className="grid grid-cols-2 gap-2">
      {EVENTOS_DISPONIBLES.map(ev => (
        <label key={ev.id} className="flex items-center gap-2 text-xs cursor-pointer">
          <input type="checkbox" checked={sel.includes(ev.id)} onChange={() => toggle(ev.id)}
            className="accent-[var(--hc-accent)]" />
          <span style={{ color: 'var(--hc-text)' }}>{ev.label}</span>
        </label>
      ))}
    </div>
  )
}
