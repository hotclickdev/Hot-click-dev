type BuscarNegocioProps = {
  value: string
  onChange: (value: string) => void
}

function SearchSVG() {
  return (
    <svg className="w-[17px] h-[17px]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  )
}

/** Buscador del directorio de emprendimientos (frame "Buscar tiendas" del Figma). */
export default function BuscarNegocio({ value, onChange }: BuscarNegocioProps) {
  return (
    <div
      className="flex items-center gap-2.5 h-[41px] px-3.5 rounded-xl"
      style={{ background: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)' }}
    >
      <span style={{ color: 'var(--hc-muted)' }}><SearchSVG /></span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Buscar un negocio"
        aria-label="Buscar un negocio"
        className="flex-1 min-w-0 bg-transparent text-sm outline-none placeholder:text-hc-muted"
        style={{ color: 'var(--hc-text)' }}
      />
    </div>
  )
}
