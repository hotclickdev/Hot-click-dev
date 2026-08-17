import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { HotClickMark } from '@/components/ui/BrandLogo'

/** Menú móvil del navbar — bit-idéntico al original. */
export default function NavbarMobileMenu({
  menuOpen,
  location,
  token,
  userName,
  isAdmin,
  categoriasOpen,
  setCategoriasOpen,
  categoriasPadre,
  loadCategorias,
  setMenuOpen,
  onLogout,
}) {
  return (
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="hc-mobile-menu fixed top-14 left-0 right-0 bottom-0 z-[60] md:hidden overflow-y-auto"
            style={{ backgroundColor: 'var(--hc-bg)', borderTop: '1px solid var(--hc-border)' }}
          >
            {/* Subtle grid texture */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.025]" style={{
              backgroundImage: 'linear-gradient(var(--hc-text) 1px, transparent 1px), linear-gradient(90deg, var(--hc-text) 1px, transparent 1px)',
              backgroundSize: '32px 32px',
            }} />

            <div className="relative px-4 pt-4 pb-24 flex flex-col gap-6">

              {/* ── Sección: Explorar ── */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05, duration: 0.3, ease: [0.16,1,0.3,1] }}
              >
                <p className="text-[10px] font-bold tracking-[0.18em] uppercase px-3 mb-2"
                  style={{ color: 'var(--hc-muted)' }}>Explorar</p>
                <div className="flex flex-col gap-0.5">
                  {/* Inicio */}
                  {(() => {
                    const isActive = location.pathname === '/'
                    return (
                      <Link to="/" onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150"
                        style={{ color: isActive ? 'var(--hc-text)' : 'var(--hc-muted)', backgroundColor: isActive ? 'var(--hc-surface-2)' : 'transparent' }}
                        onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--hc-surface-2)'; e.currentTarget.style.color = 'var(--hc-text)' }}
                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = isActive ? 'var(--hc-surface-2)' : 'transparent'; e.currentTarget.style.color = isActive ? 'var(--hc-text)' : 'var(--hc-muted)' }}
                      >
                        <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: isActive ? 'color-mix(in srgb, var(--hc-accent) 15%, transparent)' : 'var(--hc-surface)' }}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"
                            style={{ color: isActive ? 'var(--hc-accent)' : 'inherit' }}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                          </svg>
                        </span>
                        <span className="text-sm font-medium">Inicio</span>
                        {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: 'var(--hc-accent)' }} />}
                      </Link>
                    )
                  })()}

                  {/* Productos + submenú de categorías padre */}
                  <div>
                    <button
                      onClick={() => { setCategoriasOpen(o => !o); loadCategorias() }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150"
                      style={{ color: location.pathname === '/productos' ? 'var(--hc-text)' : 'var(--hc-muted)', backgroundColor: location.pathname === '/productos' ? 'var(--hc-surface-2)' : 'transparent' }}
                      onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--hc-surface-2)'; e.currentTarget.style.color = 'var(--hc-text)' }}
                      onMouseLeave={e => { e.currentTarget.style.backgroundColor = location.pathname === '/productos' ? 'var(--hc-surface-2)' : 'transparent'; e.currentTarget.style.color = location.pathname === '/productos' ? 'var(--hc-text)' : 'var(--hc-muted)' }}
                    >
                      <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: location.pathname === '/productos' ? 'color-mix(in srgb, var(--hc-accent) 15%, transparent)' : 'var(--hc-surface)' }}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"
                          style={{ color: location.pathname === '/productos' ? 'var(--hc-accent)' : 'inherit' }}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
                        </svg>
                      </span>
                      <span className="text-sm font-medium">Productos</span>
                      <svg className="w-3.5 h-3.5 ml-auto transition-transform duration-200 shrink-0"
                        style={{ transform: categoriasOpen ? 'rotate(180deg)' : 'rotate(0deg)', color: 'var(--hc-muted)' }}
                        fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    <AnimatePresence>
                      {categoriasOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2, ease: [0.16,1,0.3,1] }}
                          style={{ overflow: 'hidden' }}
                        >
                          <div className="flex flex-col gap-0.5 pl-4 pt-1 pb-1">
                            <Link to="/productos" onClick={() => setMenuOpen(false)}
                              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-150"
                              style={{ color: 'var(--hc-muted)' }}
                              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--hc-surface-2)'; e.currentTarget.style.color = 'var(--hc-text)' }}
                              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--hc-muted)' }}
                            >
                              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: 'var(--hc-border)' }}></span>
                              <span>Todos los productos</span>
                            </Link>
                            {categoriasPadre.map(cat => (
                              <Link key={cat.id}
                                to={`/productos?categoria=${cat.id}`}
                                onClick={() => setMenuOpen(false)}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-150"
                                style={{ color: 'var(--hc-muted)' }}
                                onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--hc-surface-2)'; e.currentTarget.style.color = 'var(--hc-text)' }}
                                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--hc-muted)' }}
                              >
                                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: 'var(--hc-border)' }} />
                                {cat.icono ? `${cat.icono} ` : ''}{cat.nombreCategoria}
                              </Link>
                            ))}
                            {categoriasPadre.length === 0 && (
                              <span className="px-3 py-2 text-xs" style={{ color: 'var(--hc-muted)' }}>Cargando…</span>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Emprendimientos */}
                  {(() => {
                    const isActive = location.pathname === '/emprendimientos'
                    return (
                      <Link to="/emprendimientos" onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150"
                        style={{ color: isActive ? 'var(--hc-text)' : 'var(--hc-muted)', backgroundColor: isActive ? 'var(--hc-surface-2)' : 'transparent' }}
                        onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--hc-surface-2)'; e.currentTarget.style.color = 'var(--hc-text)' }}
                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = isActive ? 'var(--hc-surface-2)' : 'transparent'; e.currentTarget.style.color = isActive ? 'var(--hc-text)' : 'var(--hc-muted)' }}
                      >
                        <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: isActive ? 'color-mix(in srgb, var(--hc-accent) 15%, transparent)' : 'var(--hc-surface)' }}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"
                            style={{ color: isActive ? 'var(--hc-accent)' : 'inherit' }}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </span>
                        <span className="text-sm font-medium">Emprendimientos</span>
                        {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: 'var(--hc-accent)' }} />}
                      </Link>
                    )
                  })()}

                  {/* Servicios HOT — destacado */}
                  <Link to="/servicios" onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150"
                    style={{ backgroundColor: 'color-mix(in srgb, var(--hc-accent) 10%, transparent)', color: 'var(--hc-accent)' }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--hc-accent) 18%, transparent)' }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--hc-accent) 10%, transparent)' }}
                  >
                    <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: 'color-mix(in srgb, var(--hc-accent) 20%, transparent)' }}>
                      <HotClickMark size={18} />
                    </span>
                    <span className="text-sm font-semibold">✦ Servicios HOT</span>
                  </Link>
                </div>
              </motion.div>

              <div style={{ height: 1, backgroundColor: 'var(--hc-border)' }} />

              {/* ── Sección: Información ── */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12, duration: 0.3, ease: [0.16,1,0.3,1] }}
              >
                <p className="text-[10px] font-bold tracking-[0.18em] uppercase px-3 mb-2"
                  style={{ color: 'var(--hc-muted)' }}>Información</p>
                <div className="flex flex-col gap-0.5">
                  {[
                    { to: '/nosotros', label: 'Nosotros', icon: <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /> },
                    { to: '/contacto', label: 'Contacto', icon: <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /> },
                    { to: '/informacion', label: 'Información', icon: <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /> },
                  ].map(({ to, label, icon }) => {
                    const isActive = location.pathname === to
                    return (
                      <Link key={to} to={to} onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150"
                        style={{ color: isActive ? 'var(--hc-text)' : 'var(--hc-muted)', backgroundColor: isActive ? 'var(--hc-surface-2)' : 'transparent' }}
                        onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--hc-surface-2)'; e.currentTarget.style.color = 'var(--hc-text)' }}
                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = isActive ? 'var(--hc-surface-2)' : 'transparent'; e.currentTarget.style.color = isActive ? 'var(--hc-text)' : 'var(--hc-muted)' }}
                      >
                        <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: isActive ? 'color-mix(in srgb, var(--hc-accent) 15%, transparent)' : 'var(--hc-surface)' }}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"
                            style={{ color: isActive ? 'var(--hc-accent)' : 'inherit' }}>{icon}</svg>
                        </span>
                        <span className="text-sm font-medium">{label}</span>
                        {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: 'var(--hc-accent)' }} />}
                      </Link>
                    )
                  })}
                </div>
              </motion.div>

              <div style={{ height: 1, backgroundColor: 'var(--hc-border)' }} />

              {/* ── Sección: Mi cuenta ── */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18, duration: 0.3, ease: [0.16,1,0.3,1] }}
              >
                {token ? (
                  <>
                    <p className="text-[10px] font-bold tracking-[0.18em] uppercase px-3 mb-2"
                      style={{ color: 'var(--hc-muted)' }}>Mi cuenta</p>
                    {/* Avatar */}
                    <div className="flex items-center gap-3 px-3 py-3 mb-2 rounded-xl"
                      style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                        style={{ backgroundColor: 'color-mix(in srgb, var(--hc-accent) 18%, transparent)', color: 'var(--hc-accent)' }}>
                        {userName?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--hc-text)' }}>{userName || 'Usuario'}</p>
                        <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>Cuenta activa</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      {[
                        { to: '/perfil', label: 'Mi perfil', icon: <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /> },
                        { to: '/mis-pedidos', label: 'Mis pedidos', icon: <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /> },
                      ].map(({ to, label, icon }) => (
                        <Link key={to} to={to} onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150"
                          style={{ color: 'var(--hc-muted)' }}
                          onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--hc-surface-2)'; e.currentTarget.style.color = 'var(--hc-text)' }}
                          onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--hc-muted)' }}
                        >
                          <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--hc-surface)' }}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">{icon}</svg>
                          </span>
                          <span className="text-sm font-medium">{label}</span>
                        </Link>
                      ))}
                      {isAdmin() && (
                        <Link to="/admin" onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150"
                          style={{ color: 'var(--hc-muted)' }}
                          onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--hc-surface-2)'; e.currentTarget.style.color = 'var(--hc-text)' }}
                          onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--hc-muted)' }}
                        >
                          <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--hc-surface)' }}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </span>
                          <span className="text-sm font-medium">Panel Admin</span>
                        </Link>
                      )}
                      <button
                        onClick={() => { onLogout(); setMenuOpen(false) }}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 w-full text-left"
                        style={{ color: '#f87171' }}
                        onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(248,113,113,0.08)' }}
                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent' }}
                      >
                        <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(248,113,113,0.1)' }}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                        </span>
                        <span className="text-sm font-medium">Cerrar sesión</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-[10px] font-bold tracking-[0.18em] uppercase px-3 mb-3"
                      style={{ color: 'var(--hc-muted)' }}>Mi cuenta</p>
                    <div className="flex flex-col gap-2">
                      <Link to="/login" onClick={() => setMenuOpen(false)}
                        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-150"
                        style={{ color: 'var(--hc-text)', backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}
                      >
                        Ingresar
                      </Link>
                      <Link to="/registro" onClick={() => setMenuOpen(false)}
                        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-150"
                        style={{ backgroundColor: 'var(--hc-accent)' }}
                      >
                        Crear cuenta gratis
                      </Link>
                    </div>
                  </>
                )}
              </motion.div>

              {/* ── WhatsApp CTA ── */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.24, duration: 0.3, ease: [0.16,1,0.3,1] }}
              >
                <a href="https://wa.me/50686667888" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl transition-all duration-150"
                  style={{ backgroundColor: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e', textDecoration: 'none' }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(34,197,94,0.16)' }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(34,197,94,0.1)' }}
                >
                  <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  <div>
                    <p className="text-sm font-semibold leading-tight">¿Necesitás ayuda? Escribinos</p>
                    <p className="text-xs opacity-70 mt-0.5">+506 8666-7888 · Lun–Sáb 8am–7pm</p>
                  </div>
                </a>
              </motion.div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
  )
}
