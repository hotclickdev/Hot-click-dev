import { Link } from 'react-router-dom'
import { IconUrgentBolt } from './enviosIcons'

export default function EnviosUrgentBanner() {
  return (
    <div className="urgent-banner">
      <div className="urgent-left">
        <div className="urgent-icon">
          <IconUrgentBolt />
        </div>
        <div>
          <p className="urgent-title">¿Necesitás algo urgente?</p>
          <p className="urgent-sub">Elegí envío rápido en datos y pago. 30 min a 2 horas en la GAM. Pago previo.</p>
        </div>
      </div>
      <Link to="/productos" className="hc-btn hc-btn-primary shrink-0 min-h-11">
        Pedir envío rápido
      </Link>
    </div>
  )
}
