import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import MainLayout from '@/layouts/MainLayout'

const SITE_URL = 'https://hotclick.lat'
const LAST_UPDATED = '5 de junio de 2025'

const privacyJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Política de Privacidad — HotClick',
  description: 'Política de privacidad y protección de datos personales de HotClick conforme a la Ley N.° 8968 de Costa Rica.',
  url: `${SITE_URL}/privacidad`,
  inLanguage: 'es-CR',
  isPartOf: { '@type': 'WebSite', name: 'HotClick', url: SITE_URL },
  about: { '@type': 'Thing', name: 'Protección de datos personales — Ley 8968 Costa Rica' },
  dateModified: '2025-06-05',
}

const secciones = [
  {
    id: 'responsable',
    num: 'SECCIÓN I',
    title: 'Identidad del Responsable',
    content: (
      <p>El responsable de la base de datos automatizada es la administración de HotClick, con domicilio electrónico de contacto y atención al usuario fijado en la dirección: <a href="mailto:hotclick.cr@gmail.com" style={{ color: 'var(--hc-accent)' }}>hotclick.cr@gmail.com</a>.</p>
    ),
  },
  {
    id: 'datos',
    num: 'SECCIÓN II',
    title: 'Categorías de Datos y Finalidad del Tratamiento',
    content: (
      <>
        <p>Para el correcto funcionamiento del ecosistema digital, HotClick recopilará datos personales de carácter identificativo y de contacto, a saber: nombre completo, número de identificación (cédula física, jurídica o DIMEX), dirección exacta de entrega, correo electrónico y número telefónico.</p>
        <p>Dichos datos serán tratados exclusivamente para las siguientes finalidades:</p>
        <ul>
          <li>Gestionar el registro de usuarios y la personalización de la experiencia en la Plataforma.</li>
          <li>Procesar, validar y facturar las transacciones comerciales.</li>
          <li>Notificar los estados de envío y gestionar la logística inversa (devoluciones).</li>
        </ul>
      </>
    ),
  },
  {
    id: 'transferencia',
    num: 'SECCIÓN III',
    title: 'Transferencia Expresa de Datos a Terceros Encargados',
    content: (
      <>
        <p>En estricto cumplimiento del principio de legalidad, se informa al Cliente sobre las siguientes transferencias de datos según la modalidad de compra:</p>
        <ul>
          <li><strong>Compras directas a HotClick:</strong> los datos de contacto y entrega son procesados exclusivamente por HotClick para ejecutar el pedido. No se transfieren a vendedores externos.</li>
          <li><strong>Compras a vendedores del marketplace:</strong> HotClick transferirá los datos de contacto e identificación del Cliente (nombre, teléfono y dirección) al Vendedor específico que deba entregar el producto. Esta transferencia es estrictamente necesaria para la ejecución del contrato de compraventa. El Vendedor receptor adquirirá la condición jurídica de "Encargado de Tratamiento" y estará sujeto a las limitaciones de la Ley N.° 8968.</li>
        </ul>
        <p>Adicionalmente, HotClick utiliza los siguientes proveedores que actúan como encargados del tratamiento:</p>
        <ul>
          <li><strong>Stripe:</strong> procesamiento seguro de transacciones (PCI-DSS).</li>
          <li><strong>SendGrid:</strong> envío de notificaciones transaccionales por correo electrónico.</li>
          <li><strong>Clerk:</strong> autenticación mediante proveedores sociales (Google, Microsoft, Apple).</li>
          <li><strong>Correos de Costa Rica:</strong> entrega de envíos postales a nivel nacional.</li>
          <li><strong>Google Analytics 4:</strong> análisis estadístico agregado y anónimo, con consentimiento previo del titular.</li>
        </ul>
        <p><strong>HotClick no vende, cede a título oneroso ni comercializa los datos personales de sus usuarios con terceros bajo ninguna circunstancia.</strong></p>
      </>
    ),
  },
  {
    id: 'arco',
    num: 'SECCIÓN IV',
    title: 'Mecanismo de Ejercicio de Derechos ARCO',
    content: (
      <>
        <p>Cualquier titular de datos personales podrá ejercer en cualquier momento sus derechos de <strong>Acceso, Rectificación, Cancelación y Oposición (ARCO)</strong>. Para tales efectos, deberá remitir una solicitud formal al correo electrónico <a href="mailto:hotclick.cr@gmail.com" style={{ color: 'var(--hc-accent)' }}>hotclick.cr@gmail.com</a>.</p>
        <p>HotClick tramitará y resolverá dicha petición en un plazo perentorio que no excederá los diez (10) días hábiles, conforme lo dispone la normativa de la PRODHAB. El titular también tiene derecho a presentar reclamaciones directamente ante la <strong>Agencia de Protección de Datos de los Habitantes (PRODHAB)</strong>.</p>
      </>
    ),
  },
  {
    id: 'cookies',
    num: 'SECCIÓN V',
    title: 'Cookies y Tecnologías Similares',
    content: (
      <>
        <p><strong>Google Analytics 4:</strong> Cookies de análisis estadístico activadas únicamente con consentimiento expreso del titular a través del banner de cookies de la Plataforma.</p>
        <p><strong>Almacenamiento local (localStorage):</strong> Utilizado para conservar en el dispositivo del titular su carrito de compras y preferencias de interfaz. Este almacenamiento no implica transferencia de datos a servidores externos y es estrictamente necesario para el funcionamiento básico de la Plataforma.</p>
      </>
    ),
  },
  {
    id: 'retencion',
    num: 'SECCIÓN VI',
    title: 'Retención de Datos',
    content: (
      <ul>
        <li><strong>Datos de pedidos y transacciones:</strong> cinco (5) años, en cumplimiento de obligaciones fiscales ante el Ministerio de Hacienda de Costa Rica.</li>
        <li><strong>Registros de actividad técnica:</strong> noventa (90) días naturales.</li>
        <li><strong>Datos de carrito abandonado:</strong> treinta (30) días naturales.</li>
        <li><strong>Cuenta activa de usuario:</strong> mientras el titular mantenga su cuenta. Ante solicitud de supresión, eliminación en un plazo máximo de treinta (30) días hábiles, salvo obligación legal de conservación.</li>
      </ul>
    ),
  },
  {
    id: 'seguridad',
    num: 'SECCIÓN VII',
    title: 'Seguridad',
    content: (
      <p>HotClick implementa las siguientes medidas de seguridad: transmisión cifrada mediante protocolo HTTPS/TLS, almacenamiento de contraseñas mediante hash bcrypt (nunca en texto plano), tokens JWT con tiempo de expiración reducido y tokens de refresco de rotación automática, auditoría de acciones administrativas sobre datos sensibles, y acceso restringido al personal autorizado bajo el principio de mínimo privilegio. En caso de brecha de seguridad, HotClick notificará a las autoridades competentes y a los titulares afectados conforme a la Ley N.° 8968.</p>
    ),
  },
]

export default function PrivacidadPage() {
  return (
    <MainLayout>
      <Helmet>
        <title>Política de Privacidad — HotClick Costa Rica</title>
        <meta name="description" content="Política de privacidad de HotClick. Protección de datos personales conforme a la Ley N.° 8968 de Costa Rica. Conocé cómo usamos tu información." />
        <link rel="canonical" href={`${SITE_URL}/privacidad`} />
        <link rel="alternate" hrefLang="es-CR" href={`${SITE_URL}/privacidad`} />
        <link rel="alternate" hrefLang="es" href={`${SITE_URL}/privacidad`} />
        <link rel="alternate" hrefLang="x-default" href={`${SITE_URL}/`} />
        <meta name="robots" content="noindex, follow" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Política de Privacidad — HotClick" />
        <meta property="og:url" content={`${SITE_URL}/privacidad`} />
        <meta property="og:locale" content="es_CR" />
        <meta property="og:site_name" content="HotClick" />
        <script type="application/ld+json">{JSON.stringify(privacyJsonLd)}</script>
      </Helmet>
      <div style={{ background: 'var(--hc-bg)', minHeight: '100vh', paddingBottom: '4rem' }}>

        {/* Hero */}
        <div style={{ borderBottom: '1px solid var(--hc-border)', background: 'var(--hc-surface)', padding: '3rem 1.5rem 2.5rem' }}>
          <div style={{ maxWidth: 760, margin: '0 auto' }}>
            <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--hc-muted)', textDecoration: 'none', marginBottom: '1.5rem' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--hc-accent)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--hc-muted)'}>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              Volver al inicio
            </Link>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: '1rem' }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'color-mix(in srgb, var(--hc-accent) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--hc-accent) 25%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" style={{ color: 'var(--hc-accent)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              </div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--hc-accent)', margin: 0 }}>
                  Ley N.° 8968 · Costa Rica
                </p>
                <h1 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.2rem)', fontWeight: 900, color: 'var(--hc-text)', margin: 0, lineHeight: 1.1 }}>
                  Política de Privacidad
                </h1>
                <p style={{ fontSize: 13, color: 'var(--hc-muted)', margin: '4px 0 0' }}>
                  HotClick · Última actualización: {LAST_UPDATED}
                </p>
              </div>
            </div>

            <p style={{ fontSize: 15, color: 'var(--hc-muted)', lineHeight: 1.7, margin: 0 }}>
              De conformidad con la <strong style={{ color: 'var(--hc-text)' }}>Ley de Protección de la Persona frente al Tratamiento de sus Datos Personales (Ley N.° 8968)</strong> de la República de Costa Rica y su Reglamento (Decreto Ejecutivo N.° 37554-JP).
            </p>
          </div>
        </div>

        <div style={{ maxWidth: 760, margin: '0 auto', padding: '2.5rem 1.5rem 0' }}>

          {/* Índice */}
          <div style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)', borderRadius: 14, padding: '1.25rem 1.5rem', marginBottom: '2.5rem' }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--hc-muted)', margin: '0 0 0.75rem' }}>Contenido</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem 1rem' }}>
              {secciones.map(s => (
                <a key={s.id} href={`#${s.id}`} style={{ fontSize: 13, color: 'var(--hc-muted)', textDecoration: 'none' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--hc-accent)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--hc-muted)'}>
                  {s.num} — {s.title}
                </a>
              ))}
            </div>
          </div>

          {/* Secciones */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {secciones.map(s => (
              <section key={s.id} id={s.id} style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)', borderRadius: 16, padding: '1.75rem', scrollMarginTop: '5rem' }}>
                <div style={{ marginBottom: '0.875rem' }}>
                  <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--hc-accent)', margin: '0 0 4px' }}>{s.num}</p>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--hc-text)', margin: 0 }}>{s.title}</h2>
                </div>
                <div style={{ fontSize: 14.5, color: 'var(--hc-muted)', lineHeight: 1.8 }}>
                  <style>{`#${s.id} p { margin: 0 0 0.75rem; } #${s.id} p:last-child { margin: 0; } #${s.id} ul { margin: 0.5rem 0 0 1.25rem; } #${s.id} li { margin-bottom: 0.4rem; } #${s.id} strong { color: var(--hc-text); }`}</style>
                  {s.content}
                </div>
              </section>
            ))}
          </div>

          {/* CTA */}
          <div style={{ marginTop: '2.5rem', padding: '1.5rem', background: 'color-mix(in srgb, var(--hc-accent) 6%, var(--hc-surface))', border: '1px solid color-mix(in srgb, var(--hc-accent) 20%, transparent)', borderRadius: 16, textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: 'var(--hc-muted)', margin: '0 0 0.5rem' }}>¿Desea ejercer sus derechos ARCO?</p>
            <a href="mailto:hotclick.cr@gmail.com" style={{ fontSize: 15, fontWeight: 700, color: 'var(--hc-accent)', textDecoration: 'none' }}>hotclick.cr@gmail.com</a>
            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <Link to="/terminos" style={{ fontSize: 13, color: 'var(--hc-muted)', textDecoration: 'none' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--hc-accent)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--hc-muted)'}>Términos y Condiciones →</Link>
              <Link to="/" style={{ fontSize: 13, color: 'var(--hc-muted)', textDecoration: 'none' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--hc-accent)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--hc-muted)'}>Volver al inicio →</Link>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
