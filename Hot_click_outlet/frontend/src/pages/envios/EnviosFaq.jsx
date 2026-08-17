import { Link } from 'react-router-dom'
import { faqItems } from './enviosHelpers'

function FaqAnswer({ item }) {
  if (item.q.includes('rastrear')) {
    return (
      <>
        Ingresá a{' '}
        <Link to="/mis-pedidos" style={{ color: 'var(--hc-accent)' }}>Mis Pedidos</Link>{' '}
        para ver el estado en tiempo real. Si tu envío es por Correos de Costa Rica, recibirás un número de guía para rastrear en{' '}
        <a href="https://www.correos.go.cr" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--hc-accent)' }}>correos.go.cr</a>.
      </>
    )
  }
  if (item.q.includes('problema')) {
    return (
      <>
        Escribinos a{' '}
        <a href="mailto:hotclick.cr@gmail.com" style={{ color: 'var(--hc-accent)' }}>hotclick.cr@gmail.com</a>{' '}
        con el número de pedido. También podés consultar nuestra{' '}
        <Link to="/devoluciones" style={{ color: 'var(--hc-accent)' }}>Política de Devoluciones</Link>.
      </>
    )
  }
  return item.a
}

export default function EnviosFaq() {
  return (
    <div className="faq-section">
      <p className="section-label">Preguntas frecuentes</p>
      <div className="faq-grid">
        {faqItems.map((item, i) => (
          <div key={i} className="faq-item">
            <p className="faq-q">{item.q}</p>
            <p className="faq-a"><FaqAnswer item={item} /></p>
          </div>
        ))}
      </div>
    </div>
  )
}
