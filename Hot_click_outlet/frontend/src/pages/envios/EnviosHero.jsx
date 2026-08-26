import { Link } from 'react-router-dom'
import { paymentMethods } from './enviosData'
import { IconLogistica } from './enviosIcons'
import TextoFlecha from '@/components/ui/TextoFlecha'

export default function EnviosHero() {
  return (
    <div className="envios-hero">
      <div className="envios-hero-inner">
        <Link to="/" className="back-link">
          <TextoFlecha dir="atras" iconClassName="w-3.5 h-3.5">Volver al inicio</TextoFlecha>
        </Link>

        <div className="envios-eyebrow">
          <IconLogistica />
          Logística HotClick
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 className="envios-headline">Enviamos a todo el país.</h1>
            <p className="envios-sub">Elegí la opción que mejor se adapte a vos.</p>
          </div>
          <div className="payment-chips" style={{ paddingTop: 4 }}>
            {paymentMethods.map(m => (
              <span key={m.label} className={`payment-chip${m.active ? ' active' : ''}`}>
                <m.Icon /> {m.label}
                {m.tag && <span className="payment-chip-tag">{m.tag}</span>}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
