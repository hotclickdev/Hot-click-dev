import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Helmet } from 'react-helmet-async'
import useAuthStore from '@/store/authStore'

// Devuelve los links del sidebar según el rol activo
function buildSidebarLinks(t, userRole) {
  const shared = [
    { to: '/admin',              label: t('admin.sidebar.general'),      icon: 'home',     exact: true },
    { to: '/admin/productos',    label: t('admin.sidebar.productos'),     icon: 'box'  },
    { to: '/admin/pedidos',      label: t('admin.sidebar.pedidos'),       icon: 'clipboard' },
    { to: '/admin/categorias',   label: t('admin.sidebar.categorias'),    icon: 'tag'  },
    { to: '/admin/marcas',       label: 'Marcas',                         icon: 'marca' },
    { to: '/admin/bodegas',      label: t('admin.sidebar.bodegas'),       icon: 'building' },
    { to: '/admin/ventas',       label: t('admin.sidebar.nuevaVenta'),    icon: 'plus' },
    { to: '/admin/finanzas',     label: t('admin.sidebar.finanzas'),      icon: 'chart' },
    { to: '/admin/reportes',     label: t('admin.sidebar.reportes'),      icon: 'bar' },
    { to: '/admin/servicios',    label: 'Servicios HOT',                  icon: 'heart' },
    { to: '/admin/garantias',    label: 'Garantías',                      icon: 'shield' },
    { to: '/admin/pagos',        label: 'Pagos / Webhooks',               icon: 'card' },
    { to: '/admin/nuevo-producto', label: t('admin.sidebar.crearIA'),     icon: 'camera' },
    { to: '/admin/publicaciones',  label: t('admin.sidebar.publicarFB'),  icon: 'share' },
    { to: '/admin/testimonios',  label: 'Testimonios',                    icon: 'star' },
    { to: '/admin/configuracion',label: 'Configuración',                  icon: 'config' },
  ]

  // Links específicos para EMPRENDEDOR — sin Servicios HOT, Pagos, Testimonios
  const emprendedorLinks = [
    { to: '/admin',              label: t('admin.sidebar.general'),      icon: 'home',     exact: true },
    { to: '/admin/productos',    label: t('admin.sidebar.productos'),     icon: 'box'  },
    { to: '/admin/pedidos',      label: t('admin.sidebar.pedidos'),       icon: 'clipboard' },
    { to: '/admin/categorias',   label: t('admin.sidebar.categorias'),    icon: 'tag'  },
    { to: '/admin/marcas',       label: 'Marcas',                         icon: 'marca' },
    { to: '/admin/bodegas',      label: t('admin.sidebar.bodegas'),       icon: 'building' },
    { to: '/admin/ventas',       label: t('admin.sidebar.nuevaVenta'),    icon: 'plus' },
    { to: '/admin/finanzas',     label: t('admin.sidebar.finanzas'),      icon: 'chart' },
    { to: '/admin/reportes',     label: t('admin.sidebar.reportes'),      icon: 'bar' },
    { to: '/admin/garantias',    label: 'Garantías',                      icon: 'shield' },
    { to: '/admin/nuevo-producto', label: t('admin.sidebar.crearIA'),     icon: 'camera' },
    { to: '/admin/publicaciones',  label: t('admin.sidebar.publicarFB'),  icon: 'share' },
    { to: '/admin/configuracion',  label: 'Configuración',                icon: 'config' },
    { divider: true },
    { to: '/admin/mi-empresa', label: 'Mi negocio', icon: 'empresa' },
    { to: '/admin/equipo',     label: 'Mi equipo',  icon: 'users' },
  ]

  if (userRole === 'ADMIN_IT') {
    return [
      ...shared,
      { divider: true },
      { to: '/admin/usuarios',     label: t('admin.sidebar.usuarios'),    icon: 'users' },
      { to: '/admin/empresas',     label: 'Empresas',                     icon: 'empresa' },
      { to: '/admin/aprobaciones', label: 'Aprobaciones',                 icon: 'check' },
    ]
  }

  if (userRole === 'EMPRENDEDOR') return emprendedorLinks

  // ADMIN_CLIENTE: subconjunto básico
  return [
    { to: '/admin',            label: t('admin.sidebar.general'),    icon: 'home', exact: true },
    { to: '/admin/productos',  label: t('admin.sidebar.productos'),  icon: 'box'  },
    { to: '/admin/pedidos',    label: t('admin.sidebar.pedidos'),    icon: 'clipboard' },
    { to: '/admin/finanzas',   label: t('admin.sidebar.finanzas'),   icon: 'chart' },
    { to: '/admin/bodegas',       label: t('admin.sidebar.bodegas'), icon: 'building' },
    { to: '/admin/mi-empresa',    label: 'Mi empresa',               icon: 'empresa' },
    { to: '/admin/configuracion', label: 'Configuración',            icon: 'config' },
  ]
}

/* ── SidebarContent fuera de AdminLayout para que React no desmonte/remonte al navegar ── */
function SidebarContent({ sidebarLinks, roleBadge, t, userName, empresaNombre, handleLogout }) {
  return (
    <>
      {/* Logo */}
      <div className="h-16 flex items-center px-5 shrink-0" style={{ borderBottom: '1px solid var(--hc-border)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg hc-logo-badge flex items-center justify-center shrink-0">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
              <path d="M13 2L3 14h8l-2 8 12-12h-8z"/>
            </svg>
          </div>
          <div>
            <div className="font-extrabold text-sm tracking-tight leading-none hc-logo-text">HOTCLICK</div>
            <div className="text-[10px] mt-0.5" style={{ color: 'var(--hc-muted)' }}>{t('admin.sidebar.panelAdmin')}</div>
          </div>
        </div>
      </div>

      {/* Rol badge */}
      <div className="px-4 pt-3 pb-1">
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${roleBadge.color}`}>
          {roleBadge.label}
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        {sidebarLinks.map((link, i) => {
          if (link.divider) return (
            <div key={`div-${i}`} className="my-2" style={{ borderTop: '1px solid var(--hc-border)' }} />
          )
          return (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.exact}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150
                ${isActive
                  ? 'bg-[#4f7cff]/15 border border-[#4f7cff]/20'
                  : 'hover:bg-[var(--hc-surface-2)] border border-transparent'
                }
              `}
              style={({ isActive }) => ({
                color: isActive ? '#fff' : 'var(--hc-muted)',
              })}
            >
              <span className="w-4 h-4 flex items-center justify-center shrink-0">
                <SidebarIcon name={link.icon} />
              </span>
              {link.label}
            </NavLink>
          )
        })}
      </nav>

      {/* User */}
      <div className="p-3 space-y-1 shrink-0" style={{ borderTop: '1px solid var(--hc-border)' }}>
        <NavLink
          to="/"
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors hover:bg-[var(--hc-surface-2)]"
          style={{ color: 'var(--hc-muted)' }}
        >
          {t('admin.sidebar.irTienda')}
        </NavLink>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-red-400 hover:bg-red-500/5 transition-colors text-left"
        >
          {t('admin.sidebar.cerrarSesion')}
        </button>
        <div className="flex items-center gap-2 px-3 py-2">
          <div className="w-7 h-7 rounded-full bg-[#4f7cff]/20 flex items-center justify-center text-xs font-semibold text-[#4f7cff]">
            {userName?.[0]?.toUpperCase() || 'A'}
          </div>
          <div className="min-w-0">
            <div className="text-xs truncate" style={{ color: 'var(--hc-muted)' }}>{userName || 'Admin'}</div>
            {empresaNombre && (
              <div className="text-[10px] truncate text-orange-400">{empresaNombre}</div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default function AdminLayout({ children }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { userName, userRole, empresaNombre, logout } = useAuthStore()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const sidebarLinks = buildSidebarLinks(t, userRole)

  const handleLogout = () => { logout(); navigate('/') }

  useEffect(() => { setDrawerOpen(false) }, [location.pathname])

  const roleBadge = {
    ADMIN_IT:      { label: 'IT Admin',      color: 'bg-red-500/20 text-red-400' },
    EMPRENDEDOR:   { label: 'Emprendedor',   color: 'bg-orange-500/20 text-orange-400' },
    ADMIN_CLIENTE: { label: 'Admin',         color: 'bg-blue-500/20 text-blue-400' },
  }[userRole] ?? { label: userRole, color: 'bg-gray-500/20 text-gray-400' }

  const sidebarProps = { sidebarLinks, roleBadge, t, userName, empresaNombre, handleLogout }

  return (
    <div className="hc-admin-content min-h-screen" style={{ backgroundColor: 'var(--hc-bg)' }}>
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      {/* ── Desktop sidebar ── */}
      <aside
        className="hc-admin-sidebar w-60 shrink-0 flex-col fixed inset-y-0 left-0 z-20 hidden md:flex"
        style={{ backgroundColor: 'var(--hc-surface)', borderRight: '1px solid var(--hc-border)' }}
      >
        <SidebarContent {...sidebarProps} />
      </aside>

      {/* ── Mobile: top header bar ── */}
      <header
        className="md:hidden fixed top-0 left-0 right-0 z-30 h-14 backdrop-blur-xl flex items-center justify-between px-4"
        style={{ backgroundColor: 'var(--hc-surface)', borderBottom: '1px solid var(--hc-border)' }}
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg hc-logo-badge flex items-center justify-center shrink-0">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
              <path d="M13 2L3 14h8l-2 8 12-12h-8z"/>
            </svg>
          </div>
          <div className="font-extrabold text-sm hc-logo-text">HOTCLICK</div>
          <span className="text-[10px]" style={{ color: 'var(--hc-muted)' }}>Admin</span>
        </div>
        <button
          onClick={() => setDrawerOpen(true)}
          className="p-2 rounded-lg hover:bg-[var(--hc-surface-2)] transition-colors"
          style={{ color: 'var(--hc-muted)' }}
          aria-label={t('nav.menu')}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
      </header>

      {/* ── Mobile: slide-in drawer ── */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/60 md:hidden"
              onClick={() => setDrawerOpen(false)}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 350, damping: 35 }}
              className="fixed inset-y-0 left-0 z-50 w-64 flex flex-col md:hidden"
              style={{ backgroundColor: 'var(--hc-surface)', borderRight: '1px solid var(--hc-border)' }}
            >
              <button
                onClick={() => setDrawerOpen(false)}
                className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-[var(--hc-surface-2)] transition-colors"
                style={{ color: 'var(--hc-muted)' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
              <SidebarContent {...sidebarProps} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Content ── */}
      <div className="md:ml-60 h-screen overflow-hidden">
        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="h-full overflow-y-auto px-4 py-4 pt-[66px] md:pt-6 md:px-6 lg:px-8"
        >
          {children}
        </motion.main>
      </div>
    </div>
  )
}

const ic = 'w-4 h-4'
const s = { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }

function SidebarIcon({ name }) {
  switch (name) {
    case 'home':      return <svg className={ic} {...s}><path d="M3 12L12 3l9 9"/><path d="M9 21V12h6v9"/><path d="M3 12v9h18v-9"/></svg>
    case 'box':       return <svg className={ic} {...s}><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
    case 'clipboard': return <svg className={ic} {...s}><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>
    case 'users':     return <svg className={ic} {...s}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
    case 'tag':       return <svg className={ic} {...s}><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
    case 'building':  return <svg className={ic} {...s}><rect x="2" y="7" width="20" height="14" rx="1"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>
    case 'plus':      return <svg className={ic} {...s}><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
    case 'chart':     return <svg className={ic} {...s}><line x1="12" y1="2" x2="12" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
    case 'bar':       return <svg className={ic} {...s}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>
    case 'share':     return <svg className={ic} {...s}><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
    case 'camera':    return <svg className={ic} {...s}><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
    case 'card':      return <svg className={ic} {...s}><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
    case 'marca':     return <svg className={ic} {...s}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
    case 'config':    return <svg className={ic} {...s}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
    case 'heart':     return <svg className={ic} {...s}><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/><path d="M11 8c-1.5 0-3 1-3 2.5 0 2 2 3 3 4 1-1 3-2 3-4C14 9 12.5 8 11 8z"/></svg>
    case 'star':      return <svg className={ic} {...s}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
    case 'empresa':   return <svg className={ic} {...s}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
    case 'check':     return <svg className={ic} {...s}><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
    case 'shield':    return <svg className={ic} {...s}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
    default:          return <svg className={ic} {...s}><circle cx="12" cy="12" r="3"/></svg>
  }
}
