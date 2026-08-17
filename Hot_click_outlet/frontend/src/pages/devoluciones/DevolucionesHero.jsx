import { Link } from 'react-router-dom'
import { LAST_UPDATED } from './devolucionesData'

/** Hero: volver, título y resumen de 7 días hábiles. */
export default function DevolucionesHero() {
  return (
    <div style={{
      borderBottom: '1px solid var(--hc-border)',
      background: 'var(--hc-surface)',
      padding: '3rem 1.5rem 2.5rem',
    }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <Link to="/" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 13, color: 'var(--hc-muted)', textDecoration: 'none',
          marginBottom: '1.5rem', transition: 'color 0.15s',
        }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--hc-accent)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--hc-muted)'}
        >
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Volver al inicio
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: '1rem' }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'color-mix(in srgb, var(--hc-accent) 12%, transparent)',
            border: '1px solid color-mix(in srgb, var(--hc-accent) 25%, transparent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" style={{ color: 'var(--hc-accent)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
            </svg>
          </div>
          <div>
            <h1 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.2rem)', fontWeight: 900, color: 'var(--hc-text)', margin: 0, lineHeight: 1.1 }}>
              Política de Devoluciones
            </h1>
            <p style={{ fontSize: 13, color: 'var(--hc-muted)', margin: '4px 0 0' }}>
              HotClick · Última actualización: {LAST_UPDATED}
            </p>
          </div>
        </div>

        <p style={{ fontSize: 15, color: 'var(--hc-muted)', lineHeight: 1.6, margin: 0 }}>
          Tu satisfacción es nuestra prioridad. Tenés <strong style={{ color: 'var(--hc-text)' }}>7 días hábiles</strong> desde la recepción para solicitar cambios o devoluciones. Leé los detalles a continuación.
        </p>
      </div>
    </div>
  )
}
