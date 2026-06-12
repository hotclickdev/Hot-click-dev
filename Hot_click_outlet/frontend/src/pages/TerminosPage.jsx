import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import MainLayout from '@/layouts/MainLayout'

const SITE_URL = 'https://hotclick.lat'
const LAST_UPDATED = '5 de junio de 2025'

const termsJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Términos y Condiciones — HotClick',
  description: 'Términos y condiciones de uso de HotClick Marketplace Costa Rica. Condiciones para compradores y vendedores emprendedores.',
  url: `${SITE_URL}/terminos`,
  inLanguage: 'es-CR',
  isPartOf: { '@type': 'WebSite', name: 'HotClick', url: SITE_URL },
  about: { '@type': 'Thing', name: 'Términos y condiciones de uso de marketplace' },
  dateModified: '2025-06-05',
}

const clausulas = [
  {
    id: 'naturaleza',
    num: 'CLÁUSULA PRIMERA',
    title: 'Naturaleza Jurídica de la Plataforma',
    content: (
      <>
        <p>HotClick opera bajo un <strong>modelo comercial híbrido</strong> que comprende dos modalidades diferenciadas:</p>
        <ul>
          <li><strong>Venta directa HotClick:</strong> HotClick adquiere productos de diversas marcas en canales de liquidación y outlets, y los comercializa directamente al consumidor final bajo su propia marca y responsabilidad. En estas transacciones, HotClick actúa como vendedor y la relación contractual se perfecciona entre HotClick y el Cliente.</li>
          <li><strong>Marketplace de emprendedores:</strong> HotClick pone a disposición su plataforma tecnológica para que negocios y emprendedores costarricenses publiquen y vendan sus propios productos con su nombre de marca. En estas transacciones, el contrato de compraventa se perfecciona entre el Cliente y el Vendedor correspondiente, actuando HotClick únicamente como intermediario tecnológico.</li>
        </ul>
        <p>En cada producto publicado se indicará claramente si es vendido directamente por HotClick o por un vendedor del marketplace.</p>
      </>
    ),
  },
  {
    id: 'capacidad',
    num: 'CLÁUSULA SEGUNDA',
    title: 'Capacidad Legal y Registro',
    content: (
      <p>El uso de la Plataforma está reservado exclusivamente para personas físicas con capacidad legal plena para contratar (mayores de 18 años) o personas jurídicas debidamente representadas. El usuario es responsable de salvaguardar la confidencialidad de sus credenciales de acceso, asumiendo total responsabilidad por las transacciones ejecutadas bajo su perfil de usuario.</p>
    ),
  },
  {
    id: 'comisiones',
    num: 'CLÁUSULA TERCERA',
    title: 'Condiciones Económicas y Comisiones (Vendedores)',
    content: (
      <p>El Vendedor acepta que el uso de los servicios de intermediación de la Plataforma está sujeto al pago de una comisión por transacción efectiva, cuyo porcentaje será fijado en el respectivo acuerdo comercial particular. HotClick gestionará la pasarela de pagos y retendrá los montos correspondientes a sus honorarios antes de liquidar los saldos netos a favor del Vendedor, en los plazos y formas pactados internamente.</p>
    ),
  },
  {
    id: 'responsabilidad',
    num: 'CLÁUSULA CUARTA',
    title: 'Exclusión de Responsabilidad',
    content: (
      <>
        <p>La responsabilidad sobre los productos varía según la modalidad de venta:</p>
        <ul>
          <li><strong>Productos vendidos directamente por HotClick:</strong> HotClick asume plena responsabilidad por la calidad, idoneidad y garantía legal de los productos que comercializa directamente, conforme a la Ley de Promoción de la Competencia y Defensa Efectiva del Consumidor (Ley N.° 7472).</li>
          <li><strong>Productos de vendedores del marketplace:</strong> HotClick no ejerce control sobre la calidad, seguridad, originalidad o licitud de los productos ofrecidos por vendedores independientes. En consecuencia, para compras a vendedores del marketplace, la responsabilidad por vicios ocultos, defectos de fabricación y garantías legales recae exclusiva y directamente en el Vendedor ante el MEIC. HotClick queda exenta de responsabilidad civil, penal o administrativa por tales productos.</li>
        </ul>
        <p>En ningún caso HotClick será responsable por retrasos del operador logístico ni por daños derivados del incumplimiento de las instrucciones del fabricante o vendedor.</p>
      </>
    ),
  },
  {
    id: 'pagos',
    num: 'CLÁUSULA QUINTA',
    title: 'Procesamiento de Pagos e Indemnidad por Datos Bancarios',
    content: (
      <>
        <p>Todos los pagos realizados en la Plataforma son procesados de forma segura a través del proveedor de pago autorizado Stripe. Los precios se expresan en colones costarricenses (₡) e incluyen los impuestos aplicables.</p>
        <p><strong>Deslinde expreso de responsabilidad financiera:</strong> HotClick declara expresamente que no recopila, no almacena, no procesa ni tiene acceso a datos sensibles de carácter financiero o bancario de los Clientes, tales como números de tarjetas de crédito o débito, fechas de vencimiento, ni códigos de seguridad (CVV/CVC).</p>
        <p>Todas las transacciones económicas se ejecutan de manera directa y exclusiva a través de una pasarela de pagos integrada, operada por un tercero proveedor de servicios financieros debidamente autorizado y certificado bajo los estándares internacionales de seguridad <strong>PCI-DSS</strong> (Payment Card Industry Data Security Standard). En consecuencia, HotClick queda exenta de toda responsabilidad civil, penal o comercial derivada de eventuales vulneraciones de seguridad, clonaciones, fraudes, fallas informáticas o suplantaciones de identidad que ocurran dentro del entorno operativo de dicha pasarela de pagos.</p>
      </>
    ),
  },
  {
    id: 'propiedad',
    num: 'CLÁUSULA SEXTA',
    title: 'Propiedad Intelectual',
    content: (
      <p>El nombre comercial, logotipo, diseño gráfico, código fuente, estructura y contenidos editoriales de HotClick se encuentran protegidos por la Ley de Derechos de Autor y Derechos Conexos (Ley N.° 6683) de Costa Rica. Queda prohibida su reproducción, distribución o explotación comercial sin autorización escrita previa de HotClick.</p>
    ),
  },
  {
    id: 'modificacion',
    num: 'CLÁUSULA SÉPTIMA',
    title: 'Modificación de Términos',
    content: (
      <p>HotClick se reserva el derecho de modificar los presentes Términos y Condiciones en cualquier momento. Las modificaciones significativas serán comunicadas mediante aviso en la Plataforma o correo electrónico con una antelación mínima de quince (15) días. El uso continuado de la Plataforma constituirá aceptación de los términos modificados.</p>
    ),
  },
  {
    id: 'cookies',
    num: 'CLÁUSULA NOVENA',
    title: 'Política de Cookies y Almacenamiento Local',
    content: (
      <p>HotClick utiliza cookies técnicas obligatorias (autenticación, carrito de compras) y cookies analíticas de terceros (Google Analytics 4) activadas únicamente con consentimiento expreso del usuario. El usuario conserva la facultad de configurar su navegador para bloquear o eliminar las cookies en cualquier momento, aceptando que la desactivación de las cookies técnicas puede impedir la ejecución de compras. Para consultar el detalle completo de las tecnologías de seguimiento utilizadas, sus finalidades y plazos de vigencia, véase la <Link to="/cookies" style={{ color: 'var(--hc-accent)', textDecoration: 'none' }}>Política de Cookies</Link> de la Plataforma.</p>
    ),
  },
  {
    id: 'jurisdiccion',
    num: 'CLÁUSULA DÉCIMA',
    title: 'Jurisdicción y Ley Aplicable',
    content: (
      <p>El presente instrumento se rige por las leyes de la República de Costa Rica. Para la resolución de controversias, las partes se someten a la jurisdicción de los Tribunales de Justicia de San José, Costa Rica, con renuncia expresa a cualquier otro fuero. Con carácter previo, las partes intentarán la resolución amistosa mediante comunicación dirigida a <a href="mailto:hotclick.cr@gmail.com" style={{ color: 'var(--hc-accent)' }}>hotclick.cr@gmail.com</a> por un período mínimo de treinta (30) días.</p>
    ),
  },
]

export default function TerminosPage() {
  return (
    <MainLayout>
      <Helmet>
        <title>Términos y Condiciones — HotClick Costa Rica</title>
        <meta name="description" content="Términos y condiciones de uso de HotClick Marketplace. Condiciones para compradores y vendedores emprendedores costarricenses." />
        <link rel="canonical" href={`${SITE_URL}/terminos`} />
        <link rel="alternate" hreflang="es-CR" href={`${SITE_URL}/terminos`} />
        <link rel="alternate" hreflang="es" href={`${SITE_URL}/terminos`} />
        <link rel="alternate" hreflang="x-default" href={`${SITE_URL}/`} />
        <meta name="robots" content="noindex, follow" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Términos y Condiciones — HotClick" />
        <meta property="og:url" content={`${SITE_URL}/terminos`} />
        <meta property="og:locale" content="es_CR" />
        <meta property="og:site_name" content="HotClick" />
        <script type="application/ld+json">{JSON.stringify(termsJsonLd)}</script>
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
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--hc-accent)', margin: 0 }}>
                  Contrato de Adhesión
                </p>
                <h1 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.2rem)', fontWeight: 900, color: 'var(--hc-text)', margin: 0, lineHeight: 1.1 }}>
                  Términos y Condiciones de Uso
                </h1>
                <p style={{ fontSize: 13, color: 'var(--hc-muted)', margin: '4px 0 0' }}>
                  HotClick · Última actualización: {LAST_UPDATED}
                </p>
              </div>
            </div>

            <p style={{ fontSize: 15, color: 'var(--hc-muted)', lineHeight: 1.7, margin: 0 }}>
              Las presentes condiciones generales regulan el acceso, registro y uso de la plataforma web y de comercio electrónico denominada HotClick. Todo usuario que acceda, navegue o interactúe en la Plataforma se adhiere de pleno derecho a lo aquí estipulado.
            </p>
          </div>
        </div>

        <div style={{ maxWidth: 760, margin: '0 auto', padding: '2.5rem 1.5rem 0' }}>

          {/* Índice */}
          <div style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)', borderRadius: 14, padding: '1.25rem 1.5rem', marginBottom: '2.5rem' }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--hc-muted)', margin: '0 0 0.75rem' }}>Índice de cláusulas</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem 1rem' }}>
              {clausulas.map(c => (
                <a key={c.id} href={`#${c.id}`} style={{ fontSize: 13, color: 'var(--hc-muted)', textDecoration: 'none' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--hc-accent)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--hc-muted)'}>
                  {c.num}
                </a>
              ))}
            </div>
          </div>

          {/* Cláusulas */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {clausulas.map(c => (
              <section key={c.id} id={c.id} style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)', borderRadius: 16, padding: '1.75rem', scrollMarginTop: '5rem' }}>
                <div style={{ marginBottom: '0.875rem' }}>
                  <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--hc-accent)', margin: '0 0 4px' }}>{c.num}</p>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--hc-text)', margin: 0 }}>{c.title}</h2>
                </div>
                <div style={{ fontSize: 14.5, color: 'var(--hc-muted)', lineHeight: 1.8 }}>
                  <style>{`#${c.id} p { margin: 0 0 0.75rem; } #${c.id} p:last-child { margin: 0; } #${c.id} strong { color: var(--hc-text); }`}</style>
                  {c.content}
                </div>
              </section>
            ))}
          </div>

          {/* CTA */}
          <div style={{ marginTop: '2.5rem', padding: '1.5rem', background: 'color-mix(in srgb, var(--hc-accent) 6%, var(--hc-surface))', border: '1px solid color-mix(in srgb, var(--hc-accent) 20%, transparent)', borderRadius: 16, textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: 'var(--hc-muted)', margin: '0 0 0.5rem' }}>¿Preguntas sobre estos términos?</p>
            <a href="mailto:hotclick.cr@gmail.com" style={{ fontSize: 15, fontWeight: 700, color: 'var(--hc-accent)', textDecoration: 'none' }}>hotclick.cr@gmail.com</a>
            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <Link to="/privacidad" style={{ fontSize: 13, color: 'var(--hc-muted)', textDecoration: 'none' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--hc-accent)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--hc-muted)'}>Política de Privacidad →</Link>
              <Link to="/devoluciones" style={{ fontSize: 13, color: 'var(--hc-muted)', textDecoration: 'none' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--hc-accent)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--hc-muted)'}>Política de Devoluciones →</Link>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
