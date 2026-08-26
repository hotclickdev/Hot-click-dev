import { Link } from 'react-router-dom'
import TrustGlyph from '@/components/ui/TrustGlyph'

/**
 * Receta única de sección de la tienda (Auditoría UX §3.1, patrón Mercurio × tokens HotClick).
 * Título Sora 700 terminado en punto + subtítulo gris inline + acción azul a la derecha.
 * Ritmo vertical fijo (40/56px) y fondos con significado:
 *   default  → hereda el fondo de página (neutro 50)
 *   surface  → blanco, para alternar bloques
 *   blue50   → franja informativa/confianza
 *   blue900  → franja de campaña (texto claro)
 */
const TONES = {
  default: {},
  surface: { background: 'var(--hc-surface)', borderTop: '1px solid var(--hc-border)', borderBottom: '1px solid var(--hc-border)' },
  blue50: { background: 'var(--hc-blue-50)' },
  blue900: { background: 'var(--hc-blue-900)' },
}

export function SectionHeader({ title, subtitle, action, dark = false }) {
  if (!title) return null
  return (
    <div className="flex items-end justify-between gap-4 mb-6">
      <h2
        className="text-xl sm:text-[28px] leading-tight"
        style={{ fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '-0.02em', color: dark ? '#FFFFFF' : 'var(--hc-text)' }}
      >
        {title}
        {subtitle && (
          <span
            className="hidden sm:inline text-sm sm:text-[15px] ml-2.5 align-baseline"
            style={{ fontFamily: 'var(--font-sans)', fontWeight: 400, letterSpacing: 0, color: dark ? 'var(--hc-blue-200)' : 'var(--hc-muted)' }}
          >
            {subtitle}
          </span>
        )}
      </h2>
      {action && (
        <Link
          to={action.to}
          className="shrink-0 inline-flex items-center gap-1 text-sm font-semibold whitespace-nowrap hover:underline"
          style={{ color: dark ? 'var(--hc-blue-200)' : 'var(--hc-link)' }}
        >
          {action.label} <TrustGlyph tipo="adelante" className="w-3.5 h-3.5" />
        </Link>
      )}
    </div>
  )
}

export default function Section({ title, subtitle, action, tone = 'default', id, className = '', ariaLabel, children }) {
  const dark = tone === 'blue900'
  return (
    <section id={id} aria-label={ariaLabel} style={TONES[tone] || TONES.default}>
      <div className={`max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14 ${className}`}>
        <SectionHeader title={title} subtitle={subtitle} action={action} dark={dark} />
        {children}
      </div>
    </section>
  )
}
