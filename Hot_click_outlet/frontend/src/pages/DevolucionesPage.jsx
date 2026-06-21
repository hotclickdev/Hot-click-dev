import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import MainLayout from '@/layouts/MainLayout'

const SITE_URL = 'https://hotclick.lat'
const LAST_UPDATED = '5 de junio de 2025'

const returnPolicyJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'MerchantReturnPolicy',
  name: 'Política de devoluciones HotClick',
  description: 'Tenés 7 días hábiles desde la recepción para solicitar cambio o devolución de cualquier producto comprado en HotClick.',
  url: `${SITE_URL}/devoluciones`,
  inLanguage: 'es-CR',
  applicableCountry: 'CR',
  returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
  merchantReturnDays: 7,
  returnMethod: 'https://schema.org/ReturnByMail',
  returnFees: 'https://schema.org/FreeReturn',
  merchantReturnLink: `${SITE_URL}/devoluciones`,
  refundType: 'https://schema.org/FullRefund',
}

const sections = [
  {
    id: 'resumen',
    title: '1. Resumen de la Política',
    content: (
      <>
        <p>En HotClick queremos que tu experiencia de compra sea 100% satisfactoria. Si por alguna razón no estás conforme con tu pedido, tenés <strong>7 días hábiles</strong> desde la fecha de recepción para solicitar un cambio o devolución.</p>
        <p>Dado que HotClick es un marketplace que conecta compradores con emprendedores costarricenses, el proceso de devolución se coordina directamente con el emprendedor vendedor.</p>
      </>
    ),
  },
  {
    id: 'aplica',
    title: '2. ¿Cuándo aplica una devolución?',
    content: (
      <>
        <p>Podés solicitar devolución en los siguientes casos:</p>
        <ul>
          <li><strong>Producto defectuoso:</strong> el artículo llegó dañado o con fallas de fabricación.</li>
          <li><strong>Producto incorrecto:</strong> recibiste un artículo diferente al que compraste (modelo, color, talla u otro).</li>
          <li><strong>Producto incompleto:</strong> faltaron partes, accesorios o piezas que se anunciaban incluidas.</li>
          <li><strong>Producto no conforme:</strong> el artículo difiere significativamente de la descripción o imágenes del anuncio.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'no-aplica',
    title: '3. ¿Cuándo NO aplica devolución?',
    content: (
      <>
        <p>No se aceptan devoluciones en los siguientes casos:</p>
        <ul>
          <li>Productos con más de 7 días hábiles desde la recepción.</li>
          <li>Artículos usados, dañados por el comprador o sin embalaje original.</li>
          <li>Productos personalizados o hechos a medida.</li>
          <li>Artículos de higiene personal (ropa interior, trajes de baño, etc.) por razones sanitarias.</li>
          <li>Productos digitales o servicios ya entregados.</li>
          <li>Cuando el motivo es simplemente "arrepentimiento de compra" sin defecto alguno (queda a criterio del emprendedor).</li>
        </ul>
      </>
    ),
  },
  {
    id: 'proceso',
    title: '4. Proceso de Devolución',
    content: (
      <>
        <p>Seguí estos pasos para iniciar una devolución:</p>
        <ul>
          <li>
            <strong>Paso 1 — Contactar al emprendedor:</strong> escribí al vendedor dentro de los 7 días hábiles. Podés hacerlo vía WhatsApp desde la página de tu pedido en <Link to="/mis-pedidos" style={{ color: 'var(--hc-accent)' }}>Mis Pedidos</Link>.
          </li>
          <li>
            <strong>Paso 2 — Describir el problema:</strong> indicá el número de pedido, el motivo de la devolución y adjuntá fotos o video que muestren el problema.
          </li>
          <li>
            <strong>Paso 3 — Acuerdo de devolución:</strong> el emprendedor te indicará cómo proceder: envío del producto, punto de recogida o solución alternativa.
          </li>
          <li>
            <strong>Paso 4 — Reembolso o reemplazo:</strong> una vez verificado el problema, el emprendedor procesará el reembolso o enviará el producto de reemplazo.
          </li>
        </ul>
        <p>Si no lográs llegar a un acuerdo con el emprendedor, contactanos a <a href="mailto:hotclick.cr@gmail.com" style={{ color: 'var(--hc-accent)' }}>hotclick.cr@gmail.com</a> para mediar en el proceso.</p>
      </>
    ),
  },
  {
    id: 'reembolsos',
    title: '5. Reembolsos',
    content: (
      <>
        <p>Los reembolsos se procesan de la siguiente manera según el método de pago original:</p>
        <ul>
          <li><strong>Tarjeta de crédito/débito (Stripe):</strong> el reembolso se acredita en 5 a 10 días hábiles dependiendo del banco emisor.</li>

          <li><strong>SINPE Móvil:</strong> el reembolso se hace por SINPE al número registrado en un plazo de 1 a 3 días hábiles.</li>
        </ul>
        <p>En todos los casos, recibirás una confirmación por correo electrónico cuando el reembolso sea procesado.</p>
      </>
    ),
  },
  {
    id: 'envio-devolucion',
    title: '6. Costos de Envío en Devoluciones',
    content: (
      <>
        <ul>
          <li><strong>Producto defectuoso o incorrecto:</strong> el emprendedor asume el costo del envío de devolución y del reenvío.</li>
          <li><strong>Cambio por talla, color u otra razón del comprador:</strong> el costo de envío de ida y vuelta es responsabilidad del comprador, salvo acuerdo diferente con el emprendedor.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'contacto',
    title: '7. ¿Necesitás Ayuda?',
    content: (
      <>
        <p>Si tenés dudas sobre tu devolución o necesitás que HotClick intervenga como mediador, contactanos:</p>
        <ul>
          <li><strong>Correo:</strong> <a href="mailto:hotclick.cr@gmail.com" style={{ color: 'var(--hc-accent)' }}>hotclick.cr@gmail.com</a></li>
          <li><strong>WhatsApp:</strong> <a href="https://wa.me/50686667888" style={{ color: 'var(--hc-accent)' }} target="_blank" rel="noopener noreferrer">+506 8666-7888</a></li>
          <li><strong>Horario:</strong> Lunes a Sábado, 8:00 am – 7:00 pm</li>
        </ul>
      </>
    ),
  },
]

export default function DevolucionesPage() {
  return (
    <MainLayout>
      <Helmet>
        <title>Política de devoluciones — HotClick Costa Rica</title>
        <meta name="description" content="Tenés 7 días hábiles para devolver cualquier producto. Conocé el proceso de devolución y cambio de HotClick Marketplace Costa Rica." />
        <link rel="canonical" href={`${SITE_URL}/devoluciones`} />
        <link rel="alternate" hreflang="es-CR" href={`${SITE_URL}/devoluciones`} />
        <link rel="alternate" hreflang="es" href={`${SITE_URL}/devoluciones`} />
        <link rel="alternate" hreflang="x-default" href={`${SITE_URL}/`} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Política de devoluciones — HotClick Costa Rica" />
        <meta property="og:description" content="7 días hábiles para cambios y devoluciones. Sin costo para el comprador." />
        <meta property="og:url" content={`${SITE_URL}/devoluciones`} />
        <meta property="og:image" content={`${SITE_URL}/og-image.png`} />
        <meta property="og:locale" content="es_CR" />
        <meta property="og:site_name" content="HotClick" />
        <script type="application/ld+json">{JSON.stringify(returnPolicyJsonLd)}</script>
      </Helmet>
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
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                </svg>
              </div>
              <div>
                <h1 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.2rem)', fontWeight: 900, color: 'var(--hc-text)', margin: 0, lineHeight: 1.1 }}>
                  Política de Devoluciones
                </h1>
                <p style={{ fontSize: 13, color: 'var(--hc-muted)', margin: '4px 0 0' }}>
                  HotClick · Última actualización: {LAST_UPDATED}
                </p>
              </div>
            </div>

            <p style={{ fontSize: 15, color: 'var(--hc-muted)', lineHeight: 1.6, margin: 0 }}>
              Tu satisfacción es nuestra prioridad. Tenés <strong style={{ color: 'var(--hc-text)' }}>7 días hábiles</strong> desde la recepción para solicitar cambios o devoluciones. Leé los detalles a continuación.
            </p>
          </div>
        </div>

        {/* Badges destacados */}
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '2rem 1.5rem 0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '2rem' }}>
            {[
              { icon: '📦', title: '7 días hábiles', desc: 'Para solicitar devolución' },
              { icon: '💬', title: 'Proceso simple', desc: 'Contactás al emprendedor' },
              { icon: '💳', title: 'Reembolso garantizado', desc: 'En productos defectuosos' },
            ].map(b => (
              <div key={b.title} style={{
                background: 'var(--hc-surface)',
                border: '1px solid var(--hc-border)',
                borderRadius: 12, padding: '1rem',
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <span style={{ fontSize: 24 }}>{b.icon}</span>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--hc-text)', margin: 0 }}>{b.title}</p>
                  <p style={{ fontSize: 12, color: 'var(--hc-muted)', margin: 0 }}>{b.desc}</p>
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
                    #${s.id} li { margin-bottom: 0.5rem; }
                    #${s.id} strong { color: var(--hc-text); font-weight: 600; }
                  `}</style>
                  {s.content}
                </div>
              </section>
            ))}
          </div>

          {/* CTA footer */}
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
              Contactanos por WhatsApp →
            </a>
            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <Link to="/envios" style={{ fontSize: 13, color: 'var(--hc-muted)', textDecoration: 'none' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--hc-accent)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--hc-muted)'}>
                Política de Envíos →
              </Link>
              <Link to="/privacidad" style={{ fontSize: 13, color: 'var(--hc-muted)', textDecoration: 'none' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--hc-accent)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--hc-muted)'}>
                Política de Privacidad →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
