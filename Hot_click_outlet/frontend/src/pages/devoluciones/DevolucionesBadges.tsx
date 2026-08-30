import { badges } from './devolucionesData'
import TrustGlyph from '@/components/ui/TrustGlyph'

/** Badges destacados de la política (7 días, proceso, reembolso). */
export default function DevolucionesBadges() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '2rem' }}>
      {badges.map(b => (
        <div key={b.title} style={{
          background: 'var(--hc-surface)',
          border: '1px solid var(--hc-border)',
          borderRadius: 12, padding: '1rem',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ color: 'var(--hc-accent)' }}>
            <TrustGlyph tipo={b.icono} className="w-6 h-6" />
          </span>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--hc-text)', margin: 0 }}>{b.title}</p>
            <p style={{ fontSize: 12, color: 'var(--hc-muted)', margin: 0 }}>{b.desc}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
