import { useNavigate } from 'react-router-dom'

/**
 * Chip clicable de categoría sugerida por el asistente AI.
 * - Si `onSelect` está definido (uso dentro de ProductsPage): lo llama con el nombre.
 * - Si no: navega a /productos?categoria=nombre (uso desde otras páginas).
 */
export default function AICategoryChip({
  nombre,
  accentColor,
  onSelect,
}: {
  nombre: string
  accentColor?: string
  onSelect?: (nombre: string) => void
}) {
  const navigate = useNavigate()
  const accent = accentColor || 'var(--hc-accent)'

  function handleClick() {
    if (onSelect) {
      onSelect(nombre)
    } else {
      navigate(`/productos?categoria=${encodeURIComponent(nombre)}`)
    }
  }

  return (
    <button type="button"
      onClick={handleClick}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all hover:opacity-80 active:scale-95"
      style={{
        background: `color-mix(in srgb, ${accent} 12%, transparent)`,
        color: accent,
        border: `1px solid color-mix(in srgb, ${accent} 30%, transparent)`,
        animation: 'ai-msg-in 0.25s ease both',
      }}
    >
      <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a2 2 0 012-2z" />
      </svg>
      {nombre}
    </button>
  )
}
