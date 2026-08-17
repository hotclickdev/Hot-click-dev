import { Link } from 'react-router-dom'

export default function EnviosCta() {
  return (
    <div className="envios-cta">
      <p>¿Preguntas sobre tu envío?</p>
      <a href="https://wa.me/50686667888" target="_blank" rel="noopener noreferrer" className="wa">
        Escribinos por WhatsApp →
      </a>
      <div className="envios-cta-links">
        <Link to="/devoluciones">Política de Devoluciones →</Link>
        <Link to="/mis-pedidos">Rastrear mi pedido →</Link>
        <Link to="/contacto">Contacto →</Link>
      </div>
    </div>
  )
}
