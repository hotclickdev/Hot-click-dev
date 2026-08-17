import { IconUrgentBolt, IconWhatsApp } from './enviosIcons'

export default function EnviosUrgentBanner() {
  return (
    <div className="urgent-banner">
      <div className="urgent-left">
        <div className="urgent-icon">
          <IconUrgentBolt />
        </div>
        <div>
          <p className="urgent-title">¿Necesitás algo urgente?</p>
          <p className="urgent-sub">Coordinamos tu envío directamente por WhatsApp</p>
        </div>
      </div>
      <a
        href="https://wa.me/50686667888?text=Hola,%20necesito%20un%20envío%20urgente"
        target="_blank"
        rel="noopener noreferrer"
        className="urgent-btn"
      >
        <IconWhatsApp />
        Escribinos por WhatsApp
      </a>
    </div>
  )
}
