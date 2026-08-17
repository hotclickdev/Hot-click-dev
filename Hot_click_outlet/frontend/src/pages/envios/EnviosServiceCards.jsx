import { services } from './enviosData'
import { IconBadgeOfficial, IconBadgeSoon } from './enviosIcons'

function PriceNote({ service }) {
  if (service.id === 'encomienda') {
    return <span className="card-price-note">+ tarifa del mensajero</span>
  }
  if (service.id === 'normal-gam' || service.id === 'fuera-gam') {
    return <span className="card-price-note">Precio estimado — puede variar</span>
  }
  return null
}

function ServiceCard({ service: s }) {
  const tone = s.active ? s.color : 'var(--hc-muted)'
  return (
    <div className={`service-card${s.active ? ' active' : ' inactive'}`}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div
          className="card-icon-wrap"
          style={{
            color: tone,
            background: `color-mix(in srgb, ${tone} 10%, transparent)`,
            borderColor: `color-mix(in srgb, ${tone} 20%, transparent)`,
          }}
        >
          {s.icon}
        </div>
        <span className={`service-badge ${s.badgeType === 'official' ? 'badge-official' : 'badge-soon'}`}>
          {s.badgeType === 'official' ? <IconBadgeOfficial /> : <IconBadgeSoon />}
          {s.badge}
        </span>
      </div>

      <div>
        <p className="card-name">{s.name}</p>
        <p className="card-time" style={{ color: tone }}>{s.time}</p>
        <p className="card-desc">{s.desc}</p>
      </div>

      <div className="card-divider" />

      {s.price && (
        <div>
          <p className="card-price">{s.price}</p>
          {s.priceSub && <p className="card-price-sub">{s.priceSub}</p>}
          <PriceNote service={s} />
        </div>
      )}

      {s.payment && (
        <div className="card-payment-row">
          {s.paymentNote && (
            <span className="card-payment-note">{s.paymentNote}:</span>
          )}
          {s.payment.map(p => (
            <span key={p.label} className="card-payment-chip">
              <p.Icon /> {p.label}
            </span>
          ))}
        </div>
      )}

      {s.cta && s.active && (
        <a href={s.cta.href} target="_blank" rel="noopener noreferrer" className="card-cta">
          {s.cta.label}
        </a>
      )}
    </div>
  )
}

export default function EnviosServiceCards() {
  return (
    <>
      <p className="section-label">Opciones de envío</p>
      <div className="services-grid">
        {services.map(s => <ServiceCard key={s.id} service={s} />)}
      </div>
    </>
  )
}
