import { Link } from 'react-router-dom'

const HREF_WA = 'https://wa.me/50686667888'

export default function EnviosCta() {
  return (
    <div className="envios-cta">
      <p>¿Preguntas sobre tu envío?</p>
      <Link to="/mis-pedidos" className="hc-btn hc-btn-primary min-h-11">
        Rastrear mi pedido
      </Link>
      <a href={HREF_WA} target="_blank" rel="noopener noreferrer" className="wa">
        Consultar por WhatsApp
      </a>
      <div className="envios-cta-links">
        <Link to="/devoluciones">Política de Devoluciones</Link>
        <Link to="/contacto">Contacto</Link>
      </div>
    </div>
  )
}
