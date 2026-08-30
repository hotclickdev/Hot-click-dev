import { sections } from './devolucionesData'

/** Secciones numeradas de la política de devoluciones. */
export default function DevolucionesSections() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {sections.map((s, i) => (
        <section key={s.id} id={s.id} style={{
          background: 'var(--hc-surface)',
          border: '1px solid var(--hc-border)',
          borderRadius: 16, padding: '1.75rem',
          scrollMarginTop: '5rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1rem' }}>
            <span style={{
              fontSize: 11, fontWeight: 800, letterSpacing: '0.08em',
              color: 'var(--hc-accent)',
              background: 'color-mix(in srgb, var(--hc-accent) 10%, transparent)',
              border: '1px solid color-mix(in srgb, var(--hc-accent) 20%, transparent)',
              borderRadius: 6, padding: '2px 8px',
            }}>
              {String(i + 1).padStart(2, '0')}
            </span>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--hc-text)', margin: 0 }}>
              {s.title.replace(/^\d+\.\s/, '')}
            </h2>
          </div>
          <div style={{ fontSize: 14.5, color: 'var(--hc-muted)', lineHeight: 1.75 }}>
            <style>{`
              #${s.id} p { margin: 0 0 0.75rem; }
              #${s.id} p:last-child { margin-bottom: 0; }
              #${s.id} ul { margin: 0.5rem 0 0.75rem 1.25rem; padding: 0; }
              #${s.id} li { margin-bottom: 0.5rem; }
              #${s.id} strong { color: var(--hc-text); font-weight: 600; }
            `}</style>
            {s.content}
          </div>
        </section>
      ))}
    </div>
  )
}
