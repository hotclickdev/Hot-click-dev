import { Link } from 'react-router-dom'
import MainLayout from '@/layouts/MainLayout'
import TextoFlecha from '@/components/ui/TextoFlecha'

const LAST_UPDATED = '5 de junio de 2025'

const clausulas = [
  {
    id: 'condicion',
    num: 'CLÁUSULA PRIMERA',
    title: 'Condición Jurídica y Limitación de Uso',
    content: (
      <p>El Vendedor reconoce y acepta que los datos personales de los Clientes que le sean facilitados por HotClick para la ejecución de los pedidos son propiedad exclusiva de los titulares (los Clientes). El Vendedor actuará bajo la figura de <strong>Encargado de Tratamiento</strong>, de conformidad con lo dispuesto en la Ley N.° 8968 y su Reglamento, y se obliga a utilizar dicha información única y exclusivamente para la preparación del paquete y la entrega física del producto vendido.</p>
    ),
  },
  {
    id: 'prohibiciones',
    num: 'CLÁUSULA SEGUNDA',
    title: 'Prohibiciones Absolutas',
    content: (
      <>
        <p>Queda terminantemente prohibido al Vendedor:</p>
        <ul>
          <li><strong>a)</strong> Utilizar los datos de contacto de los Clientes para fines publicitarios, envío de promociones, mercadeo directo o inclusión en bases de datos propias —ya sea vía WhatsApp, correo electrónico, llamadas telefónicas u otros medios—, salvo que cuente con un consentimiento informado independiente y directo otorgado por el Cliente, en cumplimiento de los artículos 5 y 7 de la Ley N.° 8968.</li>
          <li><strong>b)</strong> Ceder, vender, transferir o divulgar los datos personales facilitados por la Plataforma a cualquier tercero, sea este una persona física o jurídica, bajo cualquier modalidad, gratuita u onerosa.</li>
          <li><strong>c)</strong> Utilizar los datos para finalidades distintas a las expresamente autorizadas en la presente cláusula.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'seguridad',
    num: 'CLÁUSULA TERCERA',
    title: 'Deber de Seguridad y Destrucción de Datos',
    content: (
      <>
        <p>El Vendedor se compromete a implementar las medidas técnicas y organizativas necesarias para garantizar la seguridad de los datos personales recibidos y evitar su alteración, pérdida, tratamiento o acceso no autorizado, de conformidad con el artículo 10 de la Ley N.° 8968.</p>
        <p>Una vez transcurrido el plazo de garantía legal del producto vendido, o en todo caso dentro de los <strong>noventa (90) días naturales</strong> siguientes a la entrega efectiva del mismo, el Vendedor asume la obligación de destruir o borrar de forma definitiva e irrecuperable cualquier registro, anotación o almacenamiento —en formato digital o físico— que conserve de los datos personales del Cliente.</p>
      </>
    ),
  },
  {
    id: 'indemnidad',
    num: 'CLÁUSULA CUARTA',
    title: 'Indemnidad y Penalidades (Deslinde de Responsabilidad)',
    content: (
      <>
        <p>En caso de que el Vendedor incumpla las obligaciones dispuestas en el presente documento o en la Ley N.° 8968, provocando que un Cliente interponga una denuncia o procedimiento administrativo ante la <strong>Agencia de Protección de Datos de los Habitantes (PRODHAB)</strong> en contra de HotClick, el Vendedor se obliga a mantener a HotClick completamente indemne de toda responsabilidad derivada de dicho incumplimiento.</p>
        <p>En consecuencia, el Vendedor asumirá de manera directa y exclusiva:</p>
        <ul>
          <li><strong>a)</strong> El pago íntegro de las multas administrativas impuestas por la PRODHAB que tengan su origen en el incumplimiento del Vendedor.</li>
          <li><strong>b)</strong> Los daños y perjuicios, costas procesales y honorarios de abogados en los que HotClick deba incurrir para su defensa legal ante cualquier instancia administrativa o judicial.</li>
          <li><strong>c)</strong> La responsabilidad civil ante el titular de los datos por los daños y perjuicios derivados del tratamiento ilícito realizado por el Vendedor.</li>
        </ul>
        <p>El incumplimiento de cualquiera de las obligaciones establecidas en el presente acuerdo facultará a HotClick a <strong>resolver de pleno derecho</strong> la relación comercial y a cerrar de forma inmediata e indefinida la cuenta del Vendedor en la Plataforma, sin perjuicio del ejercicio de las acciones judiciales civiles y penales que correspondan conforme al ordenamiento jurídico costarricense.</p>
      </>
    ),
  },
  {
    id: 'aceptacion',
    num: 'CLÁUSULA QUINTA',
    title: 'Aceptación',
    content: (
      <p>El Vendedor manifiesta haber leído, comprendido y aceptado en su totalidad el contenido del presente Acuerdo al momento de completar su proceso de registro en la Plataforma HotClick, lo cual constituye su consentimiento expreso, libre e inequívoco con plenos efectos jurídicos.</p>
    ),
  },
  {
    id: 'jurisdiccion',
    num: 'CLÁUSULA SEXTA',
    title: 'Ley Aplicable y Jurisdicción',
    content: (
      <p>El presente instrumento se rige por las leyes de la República de Costa Rica. Para la resolución de controversias derivadas de su interpretación, aplicación o incumplimiento, las partes se someten a la jurisdicción de los Tribunales de Justicia de San José, Costa Rica. Para consultas, escribir a <a href="mailto:hotclick.cr@gmail.com" style={{ color: 'var(--hc-accent)' }}>hotclick.cr@gmail.com</a>.</p>
    ),
  },
]

export default function AcuerdoVendedoresPage() {
  return (
    <MainLayout>
      <div style={{ background: 'var(--hc-bg)', minHeight: '100vh', paddingBottom: '4rem' }}>

        {/* Hero */}
        <div style={{ borderBottom: '1px solid var(--hc-border)', background: 'var(--hc-surface)', padding: '3rem 1.5rem 2.5rem' }}>
          <div style={{ maxWidth: 760, margin: '0 auto' }}>
            <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--hc-muted)', textDecoration: 'none', marginBottom: '1.5rem' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--hc-accent)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--hc-muted)'}>
              <TextoFlecha dir="atras" iconClassName="w-3.5 h-3.5">Volver al inicio</TextoFlecha>
            </Link>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: '1rem' }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'color-mix(in srgb, var(--hc-accent) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--hc-accent) 25%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" style={{ color: 'var(--hc-accent)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                </svg>
              </div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--hc-accent)', margin: 0 }}>
                  Ley N.° 8968 · Convenio Accesorio
                </p>
                <h1 style={{ fontSize: 'clamp(1.4rem, 4vw, 2rem)', fontWeight: 900, color: 'var(--hc-text)', margin: 0, lineHeight: 1.1 }}>
                  Acuerdo para Vendedores
                </h1>
                <p style={{ fontSize: 13, color: 'var(--hc-muted)', margin: '4px 0 0' }}>
                  HotClick · Última actualización: {LAST_UPDATED}
                </p>
              </div>
            </div>

            <p style={{ fontSize: 15, color: 'var(--hc-muted)', lineHeight: 1.7, margin: 0 }}>
              Convenio Accesorio de Regulación de Datos Personales para Comercios Afiliados. Este acuerdo vinculante forma parte integrante de los <Link to="/terminos" style={{ color: 'var(--hc-accent)', textDecoration: 'none' }}>Términos y Condiciones</Link> y del contrato comercial de afiliación al marketplace HotClick. El Vendedor lo acepta de pleno derecho al completar su proceso de registro.
            </p>
          </div>
        </div>

        <div style={{ maxWidth: 760, margin: '0 auto', padding: '2.5rem 1.5rem 0' }}>

          {/* Aviso importante */}
          <div style={{ background: 'color-mix(in srgb, #f59e0b 8%, var(--hc-surface))', border: '1px solid color-mix(in srgb, #f59e0b 30%, transparent)', borderRadius: 14, padding: '1rem 1.25rem', marginBottom: '2rem', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#f59e0b" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <p style={{ fontSize: 13, color: 'var(--hc-muted)', margin: 0, lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--hc-text)' }}>Solo para vendedores afiliados.</strong> Si sos comprador, consultá nuestra <Link to="/privacidad" style={{ color: 'var(--hc-accent)', textDecoration: 'none' }}>Política de Privacidad</Link> y los <Link to="/terminos" style={{ color: 'var(--hc-accent)', textDecoration: 'none' }}>Términos y Condiciones</Link>.
            </p>
          </div>

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
                  <style>{`#${c.id} p { margin: 0 0 0.75rem; } #${c.id} p:last-child { margin: 0; } #${c.id} ul { margin: 0.5rem 0 0.75rem 1.25rem; } #${c.id} li { margin-bottom: 0.5rem; } #${c.id} strong { color: var(--hc-text); }`}</style>
                  {c.content}
                </div>
              </section>
            ))}
          </div>

          {/* Nota final */}
          <div style={{ marginTop: '2rem', padding: '1.25rem 1.5rem', background: 'var(--hc-surface)', border: '1px solid var(--hc-border)', borderRadius: 14 }}>
            <p style={{ fontSize: 12.5, color: 'var(--hc-muted)', margin: 0, lineHeight: 1.7, fontStyle: 'italic' }}>
              Documento redactado conforme a la Ley N.° 8968 y el Decreto Ejecutivo N.° 37554-JP vigentes en la República de Costa Rica. Este acuerdo forma parte integrante del contrato de afiliación entre HotClick y el Vendedor registrado en la Plataforma.
            </p>
          </div>

          {/* CTA */}
          <div style={{ marginTop: '1.5rem', padding: '1.5rem', background: 'color-mix(in srgb, var(--hc-accent) 6%, var(--hc-surface))', border: '1px solid color-mix(in srgb, var(--hc-accent) 20%, transparent)', borderRadius: 16, textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: 'var(--hc-muted)', margin: '0 0 0.5rem' }}>¿Preguntas sobre este acuerdo?</p>
            <a href="mailto:hotclick.cr@gmail.com" style={{ fontSize: 15, fontWeight: 700, color: 'var(--hc-accent)', textDecoration: 'none' }}>hotclick.cr@gmail.com</a>
            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <Link to="/terminos" style={{ fontSize: 13, color: 'var(--hc-muted)', textDecoration: 'none' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--hc-accent)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--hc-muted)'}><TextoFlecha>Términos y Condiciones</TextoFlecha></Link>
              <Link to="/privacidad" style={{ fontSize: 13, color: 'var(--hc-muted)', textDecoration: 'none' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--hc-accent)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--hc-muted)'}><TextoFlecha>Política de Privacidad</TextoFlecha></Link>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
