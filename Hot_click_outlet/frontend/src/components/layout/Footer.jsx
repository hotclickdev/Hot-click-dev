import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

function FooterLink({ to, children, highlight }) {
  return (
    <li>
      <Link
        to={to}
        className="group flex items-center gap-2 py-1 text-sm transition-colors duration-150"
        style={{ color: highlight ? 'var(--hc-accent)' : 'var(--hc-muted)', fontWeight: highlight ? 600 : 400 }}
        onMouseEnter={e => { e.currentTarget.style.color = 'var(--hc-text)' }}
        onMouseLeave={e => { e.currentTarget.style.color = highlight ? 'var(--hc-accent)' : 'var(--hc-muted)' }}
      >
        <span
          className="inline-block w-1 h-1 rounded-full shrink-0 transition-all duration-150 group-hover:w-2"
          style={{ background: highlight ? 'var(--hc-accent)' : 'var(--hc-border-strong)' }}
        />
        {children}
      </Link>
    </li>
  )
}

export default function Footer() {
  const { t } = useTranslation()
  const year = new Date().getFullYear()

  return (
    <footer style={{ fontFamily: 'inherit', marginTop: 'auto' }}>

      {/* ── CTA Strip ── */}
      <div style={{
        background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 55%, #5b21b6 100%)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: 'radial-gradient(ellipse 60% 80% at 10% 50%, rgba(255,255,255,0.07) 0%, transparent 60%), radial-gradient(ellipse 40% 60% at 90% 50%, rgba(255,255,255,0.04) 0%, transparent 55%)',
        }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center sm:items-center gap-3">
            <div className="w-9 h-9 shrink-0 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.22)' }}>
              <svg width={16} height={16} fill="none" stroke="white" strokeWidth={2.2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-white">
                ¿Tenés un negocio?{' '}
                <span style={{ color: '#fde68a' }}>Vendé en HOTCLICK</span>
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.68)' }}>
                Sin comisiones el primer mes · Tienda activa en 24h · 100% gratis para empezar
              </p>
            </div>
          </div>
          <Link
            to="/registro-empresa"
            className="shrink-0 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 hover:-translate-y-0.5"
            style={{
              background: 'white', color: '#7c3aed',
              boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
              whiteSpace: 'nowrap',
            }}
          >
            Registrá tu emprendimiento →
          </Link>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ background: 'var(--hc-surface)', borderTop: '1px solid var(--hc-border)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-8">

          {/* Main grid: mobile = 1 col, sm = 2 col, lg = 4 col */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6">

            {/* ── Brand ── */}
            <div className="sm:col-span-2 lg:col-span-1">
              <Link to="/" className="inline-flex items-center gap-2 group mb-4" style={{ textDecoration: 'none' }}>
                <div className="w-8 h-8 rounded-xl shrink-0 flex items-center justify-center hc-logo-badge transition-transform duration-200 group-hover:scale-105">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="white">
                    <path d="M13 2L3 14h8l-2 8 12-12h-8z" />
                  </svg>
                </div>
                <span className="text-[18px] leading-none uppercase font-black hc-logo-text"
                  style={{ fontFamily: "'Barlow', sans-serif" }}>
                  HOTCLICK
                </span>
              </Link>

              <p className="text-sm font-semibold mb-1 leading-snug" style={{ color: 'var(--hc-text)', maxWidth: 220 }}>
                {t('footer.tagline')}
              </p>
              <p className="text-xs leading-relaxed mb-5" style={{ color: 'var(--hc-muted)', maxWidth: 220 }}>
                {t('footer.tagline2')}
              </p>

              {/* Social */}
              <div className="flex items-center gap-2 mb-5">
                <a href="https://wa.me/50689745370" target="_blank" rel="noopener noreferrer"
                  aria-label="WhatsApp"
                  className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 hover:-translate-y-0.5"
                  style={{ background: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)', color: 'var(--hc-success)' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--hc-success)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--hc-border)' }}
                >
                  <svg width={15} height={15} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                </a>
                <a href="https://www.instagram.com/hotclickcr" target="_blank" rel="noopener noreferrer" aria-label="Seguir HOTCLICK en Instagram"
                  className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 hover:-translate-y-0.5"
                  style={{ background: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)', color: '#db2777' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#db2777' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--hc-border)' }}
                >
                  <svg width={15} height={15} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                  </svg>
                </a>
                <a href="https://www.facebook.com/hotclickcr" target="_blank" rel="noopener noreferrer" aria-label="Seguir HOTCLICK en Facebook"
                  className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 hover:-translate-y-0.5"
                  style={{ background: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)', color: '#1877F2' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#1877F2' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--hc-border)' }}
                >
                  <svg width={15} height={15} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
                <a href="https://www.tiktok.com/@hotclickcr" target="_blank" rel="noopener noreferrer" aria-label="Seguir HOTCLICK en TikTok"
                  className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 hover:-translate-y-0.5"
                  style={{ background: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--hc-text)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--hc-border)' }}
                >
                  <svg width={14} height={14} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.28 8.28 0 004.84 1.55V6.79a4.84 4.84 0 01-1.07-.1z"/>
                  </svg>
                </a>
              </div>

              {/* Trust badges */}
              <div className="flex flex-col gap-2">
                {[
                  { icon: '🔒', text: 'Pagos 100% seguros' },
                  { icon: '🇨🇷', text: 'Tienda costarricense' },
                  { icon: '⚡', text: 'Envío express disponible' },
                ].map((b) => (
                  <div key={b.text} className="flex items-center gap-2">
                    <span className="text-sm leading-none">{b.icon}</span>
                    <span className="text-xs font-medium" style={{ color: 'var(--hc-muted)' }}>{b.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Tienda ── */}
            <div>
              <h3 className="text-[11px] font-bold tracking-[0.12em] uppercase mb-4" style={{ color: 'var(--hc-accent)' }}>
                {t('footer.tienda')}
              </h3>
              <ul className="space-y-0.5">
                <FooterLink to="/productos">{t('footer.productos')}</FooterLink>
                <FooterLink to="/productos?descuento=true">Ofertas</FooterLink>
                <FooterLink to="/carrito">{t('footer.carrito')}</FooterLink>
                <FooterLink to="/mis-pedidos">Mis pedidos</FooterLink>
                <FooterLink to="/servicios">Servicios HOT</FooterLink>
              </ul>
            </div>

            {/* ── Empresa ── */}
            <div>
              <h3 className="text-[11px] font-bold tracking-[0.12em] uppercase mb-4" style={{ color: 'var(--hc-accent)' }}>
                {t('footer.empresa')}
              </h3>
              <ul className="space-y-0.5">
                <FooterLink to="/nosotros">{t('footer.nosotros')}</FooterLink>
                <FooterLink to="/contacto">{t('footer.contacto')}</FooterLink>
                <FooterLink to="/registro-empresa" highlight>Vendé con nosotros</FooterLink>
                <FooterLink to="/emprendimientos">Emprendimientos</FooterLink>
                <FooterLink to="/blog">Blog</FooterLink>
              </ul>
            </div>

            {/* ── Cuenta + Legal ── */}
            <div>
              <h3 className="text-[11px] font-bold tracking-[0.12em] uppercase mb-4" style={{ color: 'var(--hc-accent)' }}>
                {t('footer.cuenta')}
              </h3>
              <ul className="space-y-0.5 mb-5">
                <FooterLink to="/login">{t('footer.iniciarSesion')}</FooterLink>
                <FooterLink to="/registro">{t('footer.registrarse')}</FooterLink>
                <FooterLink to="/perfil">{t('footer.miPerfil')}</FooterLink>
                <FooterLink to="/mis-pedidos">Mis pedidos</FooterLink>
              </ul>

              <h3 className="text-[11px] font-bold tracking-[0.12em] uppercase mb-3 mt-2" style={{ color: 'var(--hc-accent)' }}>
                Legal
              </h3>
              <ul className="space-y-0.5 mb-5">
                <FooterLink to="/privacidad">Política de Privacidad</FooterLink>
                <FooterLink to="/terminos">Términos de Servicio</FooterLink>
                <FooterLink to="/devoluciones">Devoluciones</FooterLink>
                <FooterLink to="/envios">Política de Envíos</FooterLink>
                <FooterLink to="/cookies">Política de Cookies</FooterLink>
                <FooterLink to="/acuerdo-vendedores">Acuerdo Vendedores</FooterLink>
                <FooterLink to="/informacion">Preguntas Frecuentes</FooterLink>
              </ul>

              {/* Support box */}
              <div className="rounded-xl p-3.5" style={{
                background: 'var(--hc-surface-2)',
                border: '1px solid var(--hc-border)',
              }}>
                <p className="text-[10px] font-bold tracking-[0.1em] uppercase mb-2" style={{ color: 'var(--hc-accent)' }}>
                  Soporte
                </p>
                <a
                  href="https://wa.me/50689745370"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm font-semibold mb-1 hover:opacity-80 transition-opacity"
                  style={{ color: 'var(--hc-success)', textDecoration: 'none' }}
                >
                  <svg width={13} height={13} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  +506 8974-5370
                </a>
                <p className="text-[11px]" style={{ color: 'var(--hc-muted)' }}>Lun–Sáb, 8am–7pm</p>
              </div>
            </div>
          </div>

          {/* ── Bottom bar ── */}
          <motion.div
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-10 pt-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left"
            style={{ borderTop: '1px solid var(--hc-border)' }}
          >
            <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-3 order-3 sm:order-1 text-center sm:text-left">
              <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>
                © {year} HOTCLICK · {t('footer.derechos')}
              </p>
              <div className="hidden sm:block text-xs" style={{ color: 'var(--hc-border)' }}>·</div>
              <div className="flex items-center gap-3 flex-wrap justify-center">
                <Link to="/privacidad" className="text-xs transition-colors hover:opacity-80" style={{ color: 'var(--hc-muted)', textDecoration: 'none' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--hc-text)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--hc-muted)'}>
                  Privacidad
                </Link>
                <Link to="/terminos" className="text-xs transition-colors" style={{ color: 'var(--hc-muted)', textDecoration: 'none' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--hc-text)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--hc-muted)'}>
                  Términos
                </Link>
                <Link to="/devoluciones" className="text-xs transition-colors" style={{ color: 'var(--hc-muted)', textDecoration: 'none' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--hc-text)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--hc-muted)'}>
                  Devoluciones
                </Link>
                <Link to="/envios" className="text-xs transition-colors" style={{ color: 'var(--hc-muted)', textDecoration: 'none' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--hc-text)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--hc-muted)'}>
                  Envíos
                </Link>
              </div>
            </div>

            <div className="flex items-center gap-2 order-2">
              {/* VISA */}
              <div className="flex items-center justify-center px-2.5 py-1.5 rounded-lg"
                style={{ background: '#1a1f71', border: '1px solid rgba(255,255,255,0.12)', minWidth: 44 }}>
                <svg viewBox="0 0 50 16" width="36" height="12" fill="none">
                  <text x="0" y="13" fontSize="14" fontWeight="900" fontFamily="'Arial Black', sans-serif" fill="white" letterSpacing="-0.5">VISA</text>
                </svg>
              </div>

              {/* Mastercard */}
              <div className="flex items-center justify-center px-2 py-1.5 rounded-lg"
                style={{ background: '#252525', border: '1px solid rgba(255,255,255,0.12)', minWidth: 44 }}>
                <svg viewBox="0 0 38 24" width="38" height="20" fill="none">
                  <circle cx="14" cy="12" r="10" fill="#EB001B" />
                  <circle cx="24" cy="12" r="10" fill="#F79E1B" />
                  <path d="M19 4.8a10 10 0 0 1 0 14.4A10 10 0 0 1 19 4.8z" fill="#FF5F00" />
                </svg>
              </div>

              {/* SINPE Móvil */}
              <div className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg"
                style={{ background: '#003d1f', border: '1px solid rgba(52,211,153,0.3)', minWidth: 52 }}>
                <svg viewBox="0 0 10 14" width="8" height="11" fill="none">
                  <rect x="1" y="0" width="8" height="14" rx="1.5" stroke="#34d399" strokeWidth="1.2" />
                  <rect x="3" y="2" width="4" height="1" rx="0.5" fill="#34d399" />
                  <circle cx="5" cy="11" r="1" fill="#34d399" />
                </svg>
                <span style={{ fontSize: 9, fontWeight: 800, color: '#34d399', letterSpacing: '0.03em', fontFamily: 'sans-serif' }}>SINPE</span>
              </div>
            </div>

            <p className="text-xs flex items-center gap-1.5 order-1 sm:order-3" style={{ color: 'var(--hc-muted)' }}>
              Hecho con amor en Costa Rica <span className="text-base">🇨🇷</span>
            </p>
          </motion.div>
        </div>
      </div>
    </footer>
  )
}
