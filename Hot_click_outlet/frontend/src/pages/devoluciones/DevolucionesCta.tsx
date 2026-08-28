import { Link } from 'react-router-dom'
import TextoFlecha from '@/components/ui/TextoFlecha'

/** CTA de WhatsApp y enlaces a envíos / privacidad. */
export default function DevolucionesCta() {
  return (
    <div style={{
      marginTop: '2rem',
      padding: '1.5rem',
      background: 'color-mix(in srgb, var(--hc-accent) 6%, var(--hc-surface))',
      border: '1px solid color-mix(in srgb, var(--hc-accent) 20%, transparent)',
      borderRadius: 16, textAlign: 'center',
    }}>
      <p style={{ fontSize: 14, color: 'var(--hc-muted)', margin: '0 0 0.5rem' }}>¿Tenés un problema con tu pedido?</p>
      <a href="https://wa.me/50686667888" target="_blank" rel="noopener noreferrer"
        style={{ fontSize: 15, fontWeight: 700, color: 'var(--hc-accent)', textDecoration: 'none' }}>
        <TextoFlecha>Contactanos por WhatsApp</TextoFlecha>
      </a>
      <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <Link to="/envios" style={{ fontSize: 13, color: 'var(--hc-muted)', textDecoration: 'none' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--hc-accent)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--hc-muted)'}>
          <TextoFlecha>Política de Envíos</TextoFlecha>
        </Link>
        <Link to="/privacidad" style={{ fontSize: 13, color: 'var(--hc-muted)', textDecoration: 'none' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--hc-accent)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--hc-muted)'}>
          <TextoFlecha>Política de Privacidad</TextoFlecha>
        </Link>
      </div>
    </div>
  )
}
