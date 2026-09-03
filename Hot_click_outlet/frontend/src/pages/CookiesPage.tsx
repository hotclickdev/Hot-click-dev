import { Link } from 'react-router-dom'
import MainLayout from '@/layouts/MainLayout'
import TextoFlecha from '@/components/ui/TextoFlecha'
import Seo from '@/components/seo/Seo'

const LAST_UPDATED = '5 de junio de 2025'

const COOKIES_TABLE = [
  { nombre: 'hotclick-cart (localStorage)', categoria: 'Técnica', finalidad: 'Carrito de compras persistido localmente', duracion: 'Sesión / manual' },
  { nombre: 'hotclick-auth (localStorage)', categoria: 'Técnica', finalidad: 'Token JWT de autenticación', duracion: 'Hasta logout' },
  { nombre: 'cookie-consent (localStorage)', categoria: 'Técnica', finalidad: 'Preferencias de consentimiento del usuario', duracion: '1 año' },
  { nombre: '_ga, _ga_*', categoria: 'Analítica', finalidad: 'Google Analytics 4 — estadísticas agregadas', duracion: '2 años' },
  { nombre: 'ph_*, __ph_*', categoria: 'Analítica', finalidad: 'PostHog — analítica de producto y embudos', duracion: '1 año' },
  { nombre: '_clck, _clsk, CLID', categoria: 'Analítica', finalidad: 'Microsoft Clarity — mapas de calor y sesión (anonimizada)', duracion: '1 año' },
  { nombre: '__clerk_*', categoria: 'Técnica', finalidad: 'Autenticación social (Clerk)', duracion: 'Sesión' },
]

const clausulas = [
  {
    id: 'objeto',
    num: 'CLÁUSULA PRIMERA',
    title: 'Definición y Objeto',
    content: (
      <p>HotClick utiliza tecnologías de seguimiento denominadas cookies y almacenamiento local (en adelante, las "Cookies") para optimizar la experiencia de navegación, recordar las preferencias del usuario, mantener la sesión activa y gestionar el carrito de compras. Conforme a la normativa de la PRODHAB, el uso de estas tecnologías que procesan datos de identificación técnica (direcciones IP, identificadores de dispositivo y patrones de navegación) requiere el consentimiento del usuario.</p>
    ),
  },
  {
    id: 'clasificacion',
    num: 'CLÁUSULA SEGUNDA',
    title: 'Clasificación de las Cookies Utilizadas',
    content: (
      <>
        <p>La Plataforma emplea las siguientes categorías de Cookies:</p>
        <ul>
          <li><strong>a) Técnicas u Obligatorias:</strong> Esenciales para el correcto funcionamiento del sitio, la autenticación de usuarios y la seguridad de las transacciones. No pueden ser desactivadas.</li>
          <li><strong>b) De Rendimiento y Analítica:</strong> Administradas por terceros (Google Analytics 4, PostHog, Microsoft Clarity) que recopilan información estadística anónima o agregada para evaluar el rendimiento de la Plataforma y corregir errores. Se activan únicamente con consentimiento expreso.</li>
          <li><strong>c) De Publicidad Comportamental:</strong> Utilizadas para segmentar perfiles de interés y desplegar anuncios publicitarios personalizados. Requieren consentimiento explícito independiente.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'desactivacion',
    num: 'CLÁUSULA TERCERA',
    title: 'Mecanismo de Desactivación',
    content: (
      <p>El usuario conserva la facultad de configurar su navegador web para bloquear, restringir o eliminar las Cookies en cualquier momento. No obstante, el usuario acepta que la desactivación de las Cookies técnicas puede impedir o degradar significativamente la funcionalidad de la Plataforma, imposibilitando la ejecución de compras. Las preferencias de cookies analíticas pueden actualizarse en cualquier momento a través del panel de consentimiento disponible en la Plataforma.</p>
    ),
  },
  {
    id: 'fundamento',
    num: 'CLÁUSULA CUARTA',
    title: 'Fundamento Legal',
    content: (
      <>
        <p>El tratamiento de datos mediante cookies se fundamenta en:</p>
        <ul>
          <li><strong>Ley N.° 8968</strong>, artículo 5, inciso e): consentimiento libre, específico e informado.</li>
          <li><strong>Decreto N.° 37554-JP</strong>, artículo 9: requisitos formales del consentimiento informado.</li>
          <li><strong>Principio de proporcionalidad</strong> reconocido por la PRODHAB: solo se recopilan datos estrictamente necesarios para cada finalidad.</li>
        </ul>
        <p>Para ejercer derechos ARCO sobre datos de navegación, dirigir solicitud escrita a <a href="mailto:hotclick.cr@gmail.com" style={{ color: 'var(--hc-accent)' }}>hotclick.cr@gmail.com</a>.</p>
      </>
    ),
  },
]

export default function CookiesPage() {
  return (
    <MainLayout>
      <Seo
        title="Política de Cookies — HotClick Costa Rica"
        description="Cookies y tecnologías de seguimiento en HotClick: técnicas, analítica (GA4, PostHog, Clarity) y cómo gestionar tu consentimiento conforme a la Ley 8968."
        url="https://hotclick.lat/cookies"
      />
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
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--hc-accent)', margin: 0 }}>
                  PRODHAB · Ley N.° 8968
                </p>
                <h1 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.2rem)', fontWeight: 900, color: 'var(--hc-text)', margin: 0, lineHeight: 1.1 }}>
                  Política de Cookies
                </h1>
                <p style={{ fontSize: 13, color: 'var(--hc-muted)', margin: '4px 0 0' }}>
                  HotClick · Última actualización: {LAST_UPDATED}
                </p>
              </div>
            </div>

            <p style={{ fontSize: 15, color: 'var(--hc-muted)', lineHeight: 1.7, margin: 0 }}>
              De conformidad con la <strong style={{ color: 'var(--hc-text)' }}>Ley N.° 8968</strong> y los principios de transparencia y consentimiento informado reconocidos por la PRODHAB, HotClick informa al usuario sobre las tecnologías de seguimiento empleadas en la Plataforma.
            </p>
          </div>
        </div>

        <div style={{ maxWidth: 760, margin: '0 auto', padding: '2.5rem 1.5rem 0' }}>

          {/* Índice */}
          <div style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)', borderRadius: 14, padding: '1.25rem 1.5rem', marginBottom: '2.5rem' }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--hc-muted)', margin: '0 0 0.75rem' }}>Contenido</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem 1rem' }}>
              {clausulas.map(c => (
                <a key={c.id} href={`#${c.id}`} style={{ fontSize: 13, color: 'var(--hc-muted)', textDecoration: 'none' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--hc-accent)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--hc-muted)'}>
                  {c.num}
                </a>
              ))}
              <a href="#tabla" style={{ fontSize: 13, color: 'var(--hc-muted)', textDecoration: 'none' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--hc-accent)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--hc-muted)'}>
                Tabla de Cookies
              </a>
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

            {/* Tabla de cookies */}
            <section id="tabla" style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)', borderRadius: 16, padding: '1.75rem', scrollMarginTop: '5rem' }}>
              <div style={{ marginBottom: '0.875rem' }}>
                <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--hc-accent)', margin: '0 0 4px' }}>ANEXO</p>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--hc-text)', margin: 0 }}>Tabla de Cookies por Categoría</h2>
              </div>
              <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, color: 'var(--hc-muted)' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--hc-border)' }}>
                      {['Cookie / Tecnología', 'Categoría', 'Finalidad', 'Duración'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '0.5rem 0.75rem', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--hc-text)', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {COOKIES_TABLE.map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--hc-border)', background: i % 2 === 0 ? 'transparent' : 'color-mix(in srgb, var(--hc-border) 20%, transparent)' }}>
                        <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'monospace', fontSize: 12 }}>{row.nombre}</td>
                        <td style={{ padding: '0.6rem 0.75rem' }}>
                          <span style={{
                            display: 'inline-block', padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                            background: row.categoria === 'Técnica' ? 'color-mix(in srgb, #22c55e 12%, transparent)' : 'color-mix(in srgb, #f59e0b 12%, transparent)',
                            color: row.categoria === 'Técnica' ? '#4ade80' : '#fbbf24',
                            border: `1px solid ${row.categoria === 'Técnica' ? 'color-mix(in srgb, #22c55e 25%, transparent)' : 'color-mix(in srgb, #f59e0b 25%, transparent)'}`,
                          }}>{row.categoria}</span>
                        </td>
                        <td style={{ padding: '0.6rem 0.75rem', lineHeight: 1.5 }}>{row.finalidad}</td>
                        <td style={{ padding: '0.6rem 0.75rem', whiteSpace: 'nowrap' }}>{row.duracion}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          {/* CTA */}
          <div style={{ marginTop: '2.5rem', padding: '1.5rem', background: 'color-mix(in srgb, var(--hc-accent) 6%, var(--hc-surface))', border: '1px solid color-mix(in srgb, var(--hc-accent) 20%, transparent)', borderRadius: 16, textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: 'var(--hc-muted)', margin: '0 0 0.5rem' }}>¿Desea ejercer sus derechos ARCO sobre sus datos de navegación?</p>
            <a href="mailto:hotclick.cr@gmail.com" style={{ fontSize: 15, fontWeight: 700, color: 'var(--hc-accent)', textDecoration: 'none' }}>hotclick.cr@gmail.com</a>
            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <Link to="/privacidad" style={{ fontSize: 13, color: 'var(--hc-muted)', textDecoration: 'none' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--hc-accent)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--hc-muted)'}><TextoFlecha>Política de Privacidad</TextoFlecha></Link>
              <Link to="/terminos" style={{ fontSize: 13, color: 'var(--hc-muted)', textDecoration: 'none' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--hc-accent)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--hc-muted)'}><TextoFlecha>Términos y Condiciones</TextoFlecha></Link>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
