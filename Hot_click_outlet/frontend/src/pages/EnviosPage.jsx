import { Link } from 'react-router-dom'
import MainLayout from '@/layouts/MainLayout'

const LAST_UPDATED = '5 de junio de 2025'

const sections = [
  {
    id: 'general',
    title: '1. Información General',
    content: (
      <>
        <p>HOTCLICK es un marketplace donde emprendedores costarricenses venden sus productos. Los envíos son gestionados por cada emprendedor de forma independiente, usando los métodos disponibles en Costa Rica. A continuación encontrás todo lo que necesitás saber sobre cómo llegan tus pedidos.</p>
      </>
    ),
  },
  {
    id: 'metodos',
    title: '2. Métodos de Envío Disponibles',
    content: (
      <>
        <p>Los emprendedores pueden ofrecer uno o más de los siguientes métodos:</p>
        <ul>
          <li>
            <strong>Correos de Costa Rica:</strong> envío postal a domicilio a nivel nacional. Recibirás un número de guía para rastrear tu paquete en el sitio oficial de Correos CR. Tiempo estimado: <strong>3 a 7 días hábiles</strong>.
          </li>
          <li>
            <strong>Entrega directa del emprendedor:</strong> el vendedor realiza la entrega personalmente en su zona de cobertura. Tiempo estimado: <strong>1 a 3 días hábiles</strong>. Se coordina por WhatsApp tras confirmar el pedido.
          </li>
          <li>
            <strong>Retiro en punto:</strong> algunos emprendedores ofrecen retiro en su local o punto acordado. Sin costo de envío. Coordinar directamente con el vendedor.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'costos',
    title: '3. Costos de Envío',
    content: (
      <>
        <p>Los costos de envío varían según el emprendedor y el método seleccionado:</p>
        <ul>
          <li><strong>Correos de Costa Rica:</strong> el costo se calcula según el peso y destino. Se muestra antes de confirmar el pedido.</li>
          <li><strong>Entrega directa:</strong> el emprendedor define el costo según la zona. Algunos emprendedores ofrecen envío gratis dentro de su área.</li>
          <li><strong>Envío gratis:</strong> cuando aplica, se indica claramente en la página del producto con la etiqueta "Envío gratis".</li>
        </ul>
        <p>El costo total de envío siempre se muestra en el resumen de tu pedido antes de pagar.</p>
      </>
    ),
  },
  {
    id: 'tiempos',
    title: '4. Tiempos de Entrega Estimados',
    content: (
      <>
        <ul>
          <li><strong>Correos de Costa Rica (GAM):</strong> 2 a 4 días hábiles</li>
          <li><strong>Correos de Costa Rica (provincias):</strong> 4 a 7 días hábiles</li>
          <li><strong>Correos de Costa Rica (zonas rurales):</strong> 5 a 10 días hábiles</li>
          <li><strong>Entrega directa en GAM:</strong> 1 a 2 días hábiles</li>
          <li><strong>Entrega directa fuera del GAM:</strong> 2 a 4 días hábiles</li>
        </ul>
        <p>Los tiempos son estimados y pueden variar por factores externos como clima, días feriados o alta demanda. Los días feriados nacionales no se cuentan como días hábiles.</p>
      </>
    ),
  },
  {
    id: 'seguimiento',
    title: '5. Seguimiento de Pedidos',
    content: (
      <>
        <p>Podés rastrear el estado de tu pedido de estas formas:</p>
        <ul>
          <li>
            <strong>En HOTCLICK:</strong> ingresá a <Link to="/mis-pedidos" style={{ color: 'var(--hc-accent)' }}>Mis Pedidos</Link> para ver el estado actualizado en tiempo real.
          </li>
          <li>
            <strong>Notificaciones por correo:</strong> te enviamos un email cuando tu pedido es confirmado, despachado y entregado.
          </li>
          <li>
            <strong>Número de guía Correos CR:</strong> si tu envío es por Correos, recibirás el número de guía para rastrear en <a href="https://www.correos.go.cr" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--hc-accent)' }}>correos.go.cr</a>.
          </li>
          <li>
            <strong>WhatsApp:</strong> para envíos directos del emprendedor, la coordinación se realiza por WhatsApp.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'cobertura',
    title: '6. Cobertura Geográfica',
    content: (
      <>
        <p>HOTCLICK opera exclusivamente en <strong>Costa Rica</strong>. No realizamos envíos internacionales.</p>
        <ul>
          <li><strong>Correos de Costa Rica:</strong> cubre todo el territorio nacional, incluyendo zonas rurales y costeras.</li>
          <li><strong>Entrega directa:</strong> cada emprendedor define su zona de cobertura. Se indica en la página del producto.</li>
        </ul>
        <p>Si tu zona no tiene cobertura de entrega directa, el envío por Correos de Costa Rica siempre está disponible.</p>
      </>
    ),
  },
  {
    id: 'problemas',
    title: '7. Problemas con el Envío',
    content: (
      <>
        <p>Si tu pedido presenta alguno de estos inconvenientes, contactanos de inmediato:</p>
        <ul>
          <li><strong>Paquete no llegó</strong> en el tiempo estimado.</li>
          <li><strong>Paquete dañado</strong> al momento de la entrega.</li>
          <li><strong>Entrega incorrecta</strong> (te llegó algo que no pediste).</li>
        </ul>
        <p>Para estos casos, escribinos a <a href="mailto:hotclick.cr@gmail.com" style={{ color: 'var(--hc-accent)' }}>hotclick.cr@gmail.com</a> con el número de pedido y una descripción del problema. También podés consultar nuestra <Link to="/devoluciones" style={{ color: 'var(--hc-accent)' }}>Política de Devoluciones</Link>.</p>
      </>
    ),
  },
]

export default function EnviosPage() {
  return (
    <MainLayout>
      <div style={{ background: 'var(--hc-bg)', minHeight: '100vh', paddingBottom: '4rem' }}>

        {/* Hero */}
        <div style={{
          borderBottom: '1px solid var(--hc-border)',
          background: 'var(--hc-surface)',
          padding: '3rem 1.5rem 2.5rem',
        }}>
          <div style={{ maxWidth: 760, margin: '0 auto' }}>
            <Link to="/" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 13, color: 'var(--hc-muted)', textDecoration: 'none',
              marginBottom: '1.5rem', transition: 'color 0.15s',
            }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--hc-accent)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--hc-muted)'}
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Volver al inicio
            </Link>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: '1rem' }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: 'color-mix(in srgb, var(--hc-accent) 12%, transparent)',
                border: '1px solid color-mix(in srgb, var(--hc-accent) 25%, transparent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" style={{ color: 'var(--hc-accent)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                </svg>
              </div>
              <div>
                <h1 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.2rem)', fontWeight: 900, color: 'var(--hc-text)', margin: 0, lineHeight: 1.1 }}>
                  Política de Envíos
                </h1>
                <p style={{ fontSize: 13, color: 'var(--hc-muted)', margin: '4px 0 0' }}>
                  HOTCLICK · Última actualización: {LAST_UPDATED}
                </p>
              </div>
            </div>

            <p style={{ fontSize: 15, color: 'var(--hc-muted)', lineHeight: 1.6, margin: 0 }}>
              Enviamos a todo Costa Rica. Conocé los métodos disponibles, tiempos estimados y cómo rastrear tu pedido.
            </p>
          </div>
        </div>

        {/* Badges */}
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '2rem 1.5rem 0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '2rem' }}>
            {[
              { icon: '📬', title: 'Correos de CR', desc: '3–7 días hábiles' },
              { icon: '🏍️', title: 'Entrega directa', desc: '1–3 días hábiles' },
              { icon: '🇨🇷', title: 'Todo Costa Rica', desc: 'Cobertura nacional' },
              { icon: '📦', title: 'Rastreo incluido', desc: 'Con número de guía' },
            ].map(b => (
              <div key={b.title} style={{
                background: 'var(--hc-surface)',
                border: '1px solid var(--hc-border)',
                borderRadius: 12, padding: '0.875rem',
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <span style={{ fontSize: 22 }}>{b.icon}</span>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--hc-text)', margin: 0 }}>{b.title}</p>
                  <p style={{ fontSize: 11, color: 'var(--hc-muted)', margin: 0 }}>{b.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Secciones */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {sections.map((s, i) => (
              <section key={s.id} id={s.id} style={{
                background: 'var(--hc-surface)',
                border: '1px solid var(--hc-border)',
                borderRadius: 16, padding: '1.75rem',
                scrollMarginTop: '5rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1rem' }}>
                  <span style={{
                    fontSize: 11, fontWeight: 800, letterSpacing: '0.08em',
                    color: 'var(--hc-accent)',
                    background: 'color-mix(in srgb, var(--hc-accent) 10%, transparent)',
                    border: '1px solid color-mix(in srgb, var(--hc-accent) 20%, transparent)',
                    borderRadius: 6, padding: '2px 8px',
                  }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--hc-text)', margin: 0 }}>
                    {s.title.replace(/^\d+\.\s/, '')}
                  </h2>
                </div>
                <div style={{ fontSize: 14.5, color: 'var(--hc-muted)', lineHeight: 1.75 }}>
                  <style>{`
                    #${s.id} p { margin: 0 0 0.75rem; }
                    #${s.id} p:last-child { margin-bottom: 0; }
                    #${s.id} ul { margin: 0.5rem 0 0.75rem 1.25rem; padding: 0; }
                    #${s.id} li { margin-bottom: 0.4rem; }
                    #${s.id} strong { color: var(--hc-text); font-weight: 600; }
                  `}</style>
                  {s.content}
                </div>
              </section>
            ))}
          </div>

          {/* CTA */}
          <div style={{
            marginTop: '2rem',
            padding: '1.5rem',
            background: 'color-mix(in srgb, var(--hc-accent) 6%, var(--hc-surface))',
            border: '1px solid color-mix(in srgb, var(--hc-accent) 20%, transparent)',
            borderRadius: 16, textAlign: 'center',
          }}>
            <p style={{ fontSize: 14, color: 'var(--hc-muted)', margin: '0 0 0.5rem' }}>¿Preguntas sobre tu envío?</p>
            <a href="https://wa.me/50689745370" target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 15, fontWeight: 700, color: 'var(--hc-accent)', textDecoration: 'none' }}>
              Escribinos por WhatsApp →
            </a>
            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <Link to="/devoluciones" style={{ fontSize: 13, color: 'var(--hc-muted)', textDecoration: 'none' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--hc-accent)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--hc-muted)'}>
                Política de Devoluciones →
              </Link>
              <Link to="/mis-pedidos" style={{ fontSize: 13, color: 'var(--hc-muted)', textDecoration: 'none' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--hc-accent)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--hc-muted)'}>
                Rastrear mi pedido →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
