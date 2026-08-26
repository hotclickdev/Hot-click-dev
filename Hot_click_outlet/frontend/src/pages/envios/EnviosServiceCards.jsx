import { Link } from 'react-router-dom'
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

function claseBadge(tipo) {
  if (tipo === 'official') return 'badge-official'
  if (tipo === 'prior') return 'badge-prior'
  return 'badge-soon'
}

function BadgeServicio({ type, label }) {
  return (
    <span className={`service-badge ${claseBadge(type)}`}>
      {type === 'soon' ? <IconBadgeSoon /> : <IconBadgeOfficial />}
      {label}
    </span>
  )
}

function CtaServicio({ cta }) {
  if (!cta) return null
  const clase = cta.atajo ? 'card-cta-atajo' : 'card-cta'
  if (cta.internal) {
    return <Link to={cta.href} className={clase}>{cta.label}</Link>
  }
  return (
    <a
      href={cta.href}
      target="_blank"
      rel="noopener noreferrer"
      className={clase}
      aria-label={cta.ariaLabel}
    >
      {cta.label}
    </a>
  )
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
        <BadgeServicio type={s.badgeType} label={s.badge} />
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

      {s.active && <CtaServicio cta={s.cta} />}
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
