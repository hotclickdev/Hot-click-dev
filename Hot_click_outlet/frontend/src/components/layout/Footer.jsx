import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

const stagger = (i) => ({
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5, delay: 0.06 * i, ease: [0.16, 1, 0.3, 1] },
})

export default function Footer() {
  const { t } = useTranslation()
  const year = new Date().getFullYear()

  return (
    <footer className="mt-auto pb-20 md:pb-0" style={{ fontFamily: 'DM Sans, sans-serif' }}>

      {/* ── Strip CTA: emprendimientos ──────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #0f1e3d 0%, #162244 50%, #0d1830 100%)',
        borderTop: '1px solid rgba(79,124,255,0.15)',
        borderBottom: '1px solid rgba(79,124,255,0.1)',
        padding: '20px 24px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Glow de fondo */}
        <div style={{
          position: 'absolute', top: '50%', left: '25%', transform: 'translate(-50%,-50%)',
          width: 400, height: 200,
          background: 'radial-gradient(ellipse, rgba(79,124,255,0.12) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />
        <div className="max-w-7xl mx-auto" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 40, height: 40, flexShrink: 0,
              background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.3)',
              borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width={18} height={18} fill="none" stroke="#f97316" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#d8e8ff', margin: 0, lineHeight: 1.3 }}>
                ¿Tenés un negocio? <span style={{ color: '#f97316' }}>Vendé en HOTCLICK</span>
              </p>
              <p style={{ fontSize: 12, color: '#3d5070', margin: 0, marginTop: 2 }}>
                Sin comisiones el primer mes · Tienda activa en 24h · 100% gratis para empezar
              </p>
            </div>
          </div>
          <Link to="/registro-empresa" style={{
            flexShrink: 0, padding: '9px 20px',
            background: 'linear-gradient(135deg, #f97316, #ea580c)',
            borderRadius: 10, color: 'white', fontSize: 13, fontWeight: 700,
            textDecoration: 'none', letterSpacing: '0.01em',
            boxShadow: '0 4px 16px rgba(249,115,22,0.35)',
            transition: 'all 0.2s', whiteSpace: 'nowrap',
          }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 24px rgba(249,115,22,0.5)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(249,115,22,0.35)'; e.currentTarget.style.transform = 'none' }}
          >
            Registrá tu emprendimiento →
          </Link>
        </div>
      </div>

      {/* ── Cuerpo principal ─────────────────────────────────── */}
      <div style={{ background: '#060d1c', position: 'relative', overflow: 'hidden' }}>
        {/* Dot grid sutil */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'radial-gradient(circle, rgba(79,124,255,0.07) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }} />
        {/* Orbe decorativo */}
        <div style={{
          position: 'absolute', bottom: '-20%', right: '10%', width: 500, height: 400,
          background: 'radial-gradient(ellipse, rgba(79,124,255,0.06) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />

        <div className="max-w-7xl mx-auto px-5 sm:px-8" style={{ paddingTop: 56, paddingBottom: 48, position: 'relative' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 32 }} className="grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">

            {/* ── Columna Brand ── */}
            <motion.div {...stagger(0)} style={{ gridColumn: 'span 1' }} className="col-span-2 sm:col-span-2 lg:col-span-1">
              <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none', marginBottom: 20 }}>
                <div style={{
                  width: 38, height: 38,
                  background: 'linear-gradient(135deg, #4f7cff 0%, #3b5fc8 100%)',
                  borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 16px rgba(79,124,255,0.4)', flexShrink: 0,
                }}>
                  <svg width={19} height={19} viewBox="0 0 24 24" fill="white"><path d="M13 2L3 14h8l-2 8 12-12h-8z" /></svg>
                </div>
                <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 20, color: '#d0e4ff', letterSpacing: '-0.02em' }}>
                  HOTCLICK
                </span>
              </Link>

              <p style={{ fontSize: 13.5, color: '#2d3d55', lineHeight: 1.75, marginBottom: 24, maxWidth: 220 }}>
                {t('footer.tagline')}
              </p>

              {/* Redes sociales */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 28 }}>
                {/* WhatsApp */}
                <a href="https://wa.me/50689745370" target="_blank" rel="noopener noreferrer"
                  aria-label="WhatsApp"
                  style={{
                    width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.2)',
                    color: '#25d366', textDecoration: 'none', transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(37,211,102,0.2)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(37,211,102,0.1)'; e.currentTarget.style.transform = 'none' }}
                >
                  <svg width={16} height={16} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                </a>
                {/* Instagram placeholder */}
                <a href="#" aria-label="Instagram"
                  style={{
                    width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(225,48,108,0.08)', border: '1px solid rgba(225,48,108,0.15)',
                    color: '#e1306c', textDecoration: 'none', transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(225,48,108,0.18)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(225,48,108,0.08)'; e.currentTarget.style.transform = 'none' }}
                >
                  <svg width={16} height={16} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                  </svg>
                </a>
              </div>

              {/* Trust badges */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { icon: '🔒', text: 'Pagos 100% seguros' },
                  { icon: '🇨🇷', text: 'Tienda costarricense' },
                  { icon: '⚡', text: 'Envío express disponible' },
                ].map((b, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13 }}>{b.icon}</span>
                    <span style={{ fontSize: 12, color: '#253040' }}>{b.text}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* ── Columna Tienda ── */}
            <motion.div {...stagger(1)}>
              <h3 style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#4f7cff', marginBottom: 20 }}>
                {t('footer.tienda')}
              </h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  [t('footer.productos'), '/productos'],
                  ['Ofertas', '/productos?descuento=true'],
                  [t('footer.carrito'), '/carrito'],
                  ['Mis pedidos', '/mis-pedidos'],
                  ['Servicios', '/servicios'],
                ].map(([label, href]) => (
                  <li key={href}>
                    <Link to={href} style={{ fontSize: 13.5, color: '#2d3d55', textDecoration: 'none', transition: 'color 0.18s', display: 'flex', alignItems: 'center', gap: 6 }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#7baeff' }}
                      onMouseLeave={e => { e.currentTarget.style.color = '#2d3d55' }}
                    >
                      <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#1a2540', display: 'inline-block', flexShrink: 0, transition: 'background 0.18s' }} />
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* ── Columna Empresa ── */}
            <motion.div {...stagger(2)}>
              <h3 style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#4f7cff', marginBottom: 20 }}>
                {t('footer.empresa')}
              </h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  [t('footer.nosotros'), '/nosotros'],
                  [t('footer.contacto'), '/contacto'],
                  ['Vendé con nosotros', '/registro-empresa'],
                  ['Blog', '/blog'],
                ].map(([label, href]) => (
                  <li key={href}>
                    <Link to={href} style={{ fontSize: 13.5, color: href === '/registro-empresa' ? '#f97316' : '#2d3d55', textDecoration: 'none', transition: 'color 0.18s', display: 'flex', alignItems: 'center', gap: 6, fontWeight: href === '/registro-empresa' ? 600 : 400 }}
                      onMouseEnter={e => { e.currentTarget.style.color = href === '/registro-empresa' ? '#fb923c' : '#7baeff' }}
                      onMouseLeave={e => { e.currentTarget.style.color = href === '/registro-empresa' ? '#f97316' : '#2d3d55' }}
                    >
                      <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#1a2540', display: 'inline-block', flexShrink: 0 }} />
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* ── Columna Cuenta ── */}
            <motion.div {...stagger(3)}>
              <h3 style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#4f7cff', marginBottom: 20 }}>
                {t('footer.cuenta')}
              </h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  [t('footer.iniciarSesion'), '/login'],
                  [t('footer.registrarse'), '/registro'],
                  [t('footer.miPerfil'), '/perfil'],
                  ['Mis pedidos', '/mis-pedidos'],
                ].map(([label, href]) => (
                  <li key={href}>
                    <Link to={href} style={{ fontSize: 13.5, color: '#2d3d55', textDecoration: 'none', transition: 'color 0.18s', display: 'flex', alignItems: 'center', gap: 6 }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#7baeff' }}
                      onMouseLeave={e => { e.currentTarget.style.color = '#2d3d55' }}
                    >
                      <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#1a2540', display: 'inline-block', flexShrink: 0 }} />
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>

              {/* Contacto directo */}
              <div style={{ marginTop: 28, padding: '14px 16px', background: 'rgba(79,124,255,0.07)', border: '1px solid rgba(79,124,255,0.14)', borderRadius: 12 }}>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#4f7cff', marginBottom: 6 }}>
                  Soporte
                </p>
                <a href="https://wa.me/50689745370" target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 12.5, color: '#25d366', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <svg width={13} height={13} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  +506 8974-5370
                </a>
                <p style={{ fontSize: 11, color: '#1a2540', marginTop: 4 }}>Lun–Sáb, 8am–7pm</p>
              </div>
            </motion.div>
          </div>

          {/* ── Barra inferior ─────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            style={{ marginTop: 48, paddingTop: 24, borderTop: '1px solid rgba(79,124,255,0.1)', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}
          >
            <p style={{ fontSize: 12, color: '#1a2540', margin: 0 }}>
              © {year} HOTCLICK · {t('footer.derechos')}
            </p>

            {/* Métodos de pago (texto) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {['VISA', 'MC', 'SINPE', 'Efectivo'].map((m) => (
                <div key={m} style={{
                  padding: '3px 8px',
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 6, fontSize: 10, fontWeight: 700, color: '#253040', letterSpacing: '0.05em',
                }}>
                  {m}
                </div>
              ))}
            </div>

            <p style={{ fontSize: 12, color: '#1a2540', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>Hecho con amor en Costa Rica</span>
              <span style={{ fontSize: 14 }}>🇨🇷</span>
            </p>
          </motion.div>
        </div>
      </div>
    </footer>
  )
}
