import { NavLink, Link, useNavigate, useLocation, useMatch } from 'react-router-dom'
import { getAvailableModes, MODE_PREF_KEY } from '@/utils/modes'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect, useRef, useLayoutEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Helmet } from 'react-helmet-async'
import useAuthStore from '@/store/authStore'
import useTenantStore from '@/store/tenantStore'
import GlobalSearch from '@/components/admin/GlobalSearch'
import { HotClickMark } from '@/components/ui/BrandLogo'
import TrialBanner from '@/components/TrialBanner'
import OfflineBanner from '@/components/OfflineBanner'
import AppTour from '@/components/ui/AppTour'

// Sidebar simplificado del "Sistema" para el dueño de negocio (rol
// EMPRENDEDOR) — reemplaza el panel admin completo de ~30 ítems por los
// que de verdad usa a diario, siguiendo el rediseño de
// `Front para cliente EPN/Sistema - Inicio.dc.html`.
function buildSistemaLinks(t) {
  return [
    { to: '/admin', label: 'Inicio', icon: 'home', exact: true },
    { section: 'Vender' },
    { to: '/admin/pedidos', label: 'Ventas y pedidos', icon: 'clipboard' },
    { section: 'Catálogo' },
    { to: '/admin/productos', label: t('admin.sidebar.productos'), icon: 'box' },
    { to: '/admin/ofertas',   label: 'Promociones',                icon: 'tag' },
    { section: 'Mi negocio' },
    { to: '/admin/clientes',  label: 'Clientes',                  icon: 'users' },
    { to: '/admin/blog',      label: 'Posts',                     icon: 'blog'  },
    { to: '/admin/reportes',  label: t('admin.sidebar.reportes'), icon: 'bar', feature: 'reportes' },
    { to: '/admin/copilot',   label: 'Consultas con Hot',         icon: 'copilot' },
    { section: 'Más' },
    { to: '/admin/configuracion', label: 'Configuración', icon: 'config' },
    { to: '/admin/ayuda',         label: 'Ayuda',          icon: 'help' },
  ]
}

// Devuelve los links del sidebar con secciones según el rol activo
function buildSidebarLinks(t, userRole) {
  if (userRole === 'ADMIN') {
    return [
      { to: '/admin', label: 'Inicio', icon: 'home', exact: true},
      { section: 'Catálogo' },
      { to: '/admin/productos',          label: t('admin.sidebar.productos'),  icon: 'box'      },
      { to: '/admin/productos/carga-masiva', label: 'Carga masiva',           icon: 'upload'   },
      { to: '/admin/productos/importar',    label: 'Importar catálogo IA',    icon: 'import'   },
      { to: '/admin/categorias',         label: t('admin.sidebar.categorias'), icon: 'tag'      },
      { to: '/admin/marcas',             label: 'Marcas',                      icon: 'marca'    },
      { to: '/admin/bodegas',            label: t('admin.sidebar.bodegas'),    icon: 'building' },
      { to: '/admin/garantias',          label: 'Garantías',                   icon: 'shield'   },
      { to: '/admin/compras',            label: 'Compras',                     icon: 'compra'   },
      { to: '/admin/proveedores',        label: 'Proveedores',                 icon: 'proveedor'},
      { section: 'Punto de Venta' },
      { to: '/admin/pos',           label: 'Caja registradora', icon: 'pos'       },
      { to: '/admin/pos/caja',      label: 'Cuadre de caja',    icon: 'chart'     },
      { to: '/admin/pos/historial', label: 'Historial ventas',  icon: 'clipboard' },
      { section: 'Ventas' },
      { to: '/admin/pedidos',        label: t('admin.sidebar.pedidos'),    icon: 'clipboard' },
      { to: '/admin/ventas',         label: t('admin.sidebar.nuevaVenta'), icon: 'plus'     },
      { to: '/admin/clientes',       label: 'Mis Clientes',                icon: 'users'    },
      { to: '/admin/asignar-compra', label: 'Registrar compra externa',   icon: 'assign'   },
      // { to: '/admin/mesas',        label: 'Mesas / QR',                  icon: 'qr'       },  // futuro
      { to: '/admin/cotizaciones',  label: 'Cotizaciones B2B',            icon: 'doc'      },
      { to: '/admin/gift-cards',   label: 'Gift Cards',                  icon: 'gift'     },
      { to: '/admin/inventario',   label: 'AI Inventario',               icon: 'ai'       },
      { to: '/admin/copilot',      label: 'AI Copilot',                  icon: 'copilot'  },
      { to: '/admin/forecast',     label: 'AI Forecast',                 icon: 'forecast' },
      { to: '/admin/executive',    label: 'Executive BI',                icon: 'exec'     },
      { to: '/admin/finanzas',     label: t('admin.sidebar.finanzas'),   icon: 'chart'    },
      { to: '/admin/reportes',     label: t('admin.sidebar.reportes'),   icon: 'bar'      },
      { section: 'Marketing' },
      { to: '/admin/ofertas',       label: 'Ofertas',                     icon: 'tag'      },
      { to: '/admin/cupones',       label: 'Descuentos',                  icon: 'coupon'   },
      { to: '/admin/nuevo-producto', label: t('admin.sidebar.crearIA'),  icon: 'camera'   },
      { to: '/admin/publicaciones',  label: t('admin.sidebar.publicarFB'), icon: 'share'  },
      { to: '/admin/blog',          label: 'Blog',                        icon: 'blog'     },
      { to: '/admin/convenios',     label: 'Emprendimientos',             icon: 'heart'    },
      { to: '/admin/servicios',     label: 'Servicios HOT',               icon: 'wrench'   },
      { to: '/admin/testimonios',   label: 'Testimonios',                 icon: 'star'     },
      { section: 'Sistema' },
      { to: '/admin/homepage',     label: 'Homepage / Carousel',         icon: 'home'     },
      { to: '/admin/branding',     label: 'Branding / White Label',      icon: 'brand'    },
      { to: '/admin/multipais',    label: 'LATAM Multi-país',            icon: 'globe'    },
      { to: '/admin/plugins',      label: 'Plugins / Integraciones',     icon: 'plugin'   },
      { to: '/admin/pagos',        label: 'Pagos / Webhooks',            icon: 'card'     },
      { to: '/admin/usuarios',     label: t('admin.sidebar.usuarios'),   icon: 'users'    },
      { to: '/admin/empresas',     label: 'Empresas',                    icon: 'empresa'  },
      { to: '/admin/aprobaciones', label: 'Aprobaciones',                icon: 'check'    },
      { to: '/admin/security',        label: 'Security Center',             icon: 'shield'   },
      { to: '/admin/observabilidad',  label: 'Observabilidad',              icon: 'chart'    },
      { to: '/admin/facturas',     label: 'Comprobantes Electrónicos',   icon: 'card'     },
      { to: '/admin/config-fiscal', label: 'Config. Fiscal',            icon: 'config'   },
      { to: '/admin/superadmin',   label: 'Feature Flags / SaaS',        icon: 'config'   },
      { to: '/admin/ai-control',   label: 'Control IA',                  icon: 'ai'       },
      { to: '/admin/billing/planes', label: 'Planes / Billing',          icon: 'card'     },
      { to: '/admin/configuracion', label: 'Configuración',              icon: 'config'   },
    ]
  }

  // EMPRENDEDOR ve el sidebar simplificado del "Sistema" (10 ítems, igual
  // al mockup aprobado). El resto de sus páginas (Bodegas, Compras, Marcas,
  // Garantías, IA, Mi negocio, etc.) siguen accesibles por URL directa o
  // desde Configuración — no desaparecen, solo no compiten por espacio en
  // el menú principal.
  if (userRole === 'EMPRENDEDOR') {
    return buildSistemaLinks(t)
  }

  if (userRole === 'CAJERO') {
    return [
      { section: 'POS' },
      { to: '/admin/pos',           label: 'Caja registradora', icon: 'pos'       },
      { to: '/admin/pos/caja',      label: 'Cuadre de caja',    icon: 'chart'     },
      { to: '/admin/pos/historial', label: 'Historial ventas',  icon: 'clipboard' },
    ]
  }

  if (userRole === 'GERENTE' || userRole === 'SUPERVISOR') {
    return [
      { to: '/admin', label: 'Inicio', icon: 'home', exact: true },
      { section: 'POS' },
      { to: '/admin/pos',           label: 'Caja registradora', icon: 'pos'       },
      { to: '/admin/pos/caja',      label: 'Cuadre de caja',    icon: 'chart'     },
      { to: '/admin/pos/historial', label: 'Historial ventas',  icon: 'clipboard' },
      { section: 'Ventas' },
      { to: '/admin/pedidos',       label: t('admin.sidebar.pedidos'),   icon: 'clipboard' },
      { to: '/admin/finanzas',      label: t('admin.sidebar.finanzas'),  icon: 'chart'     },
      { section: 'Catálogo' },
      { to: '/admin/productos',     label: t('admin.sidebar.productos'), icon: 'box'       },
      { to: '/admin/bodegas',       label: t('admin.sidebar.bodegas'),   icon: 'building'  },
    ]
  }

  // EMPRENDEDOR
  return [
    { to: '/admin',              label: 'Inicio',                        icon: 'home', exact: true },
    { section: 'Punto de Venta' },
    { to: '/admin/pos',          label: 'Caja registradora',             icon: 'pos'       },
    { to: '/admin/pos/caja',     label: 'Cuadre de caja',                icon: 'chart'     },
    { to: '/admin/pos/historial', label: 'Historial ventas',             icon: 'clipboard' },
    // { to: '/admin/mesas',        label: 'Mesas / QR',                    icon: 'qr'        },  // futuro
    { section: 'Catálogo e inventario' },
    { to: '/admin/productos',              label: t('admin.sidebar.productos'),    icon: 'box'    },
    { to: '/admin/productos/carga-masiva', label: 'Carga masiva',                icon: 'upload' },
    { to: '/admin/productos/importar',     label: 'Importar catálogo IA',        icon: 'import' },
    { to: '/admin/nuevo-producto',         label: 'Generar producto rápido',      icon: 'camera' },
    { to: '/admin/categorias',             label: t('admin.sidebar.categorias'),  icon: 'tag'    },
    { to: '/admin/marcas',       label: 'Marcas',                        icon: 'marca'     },
    { to: '/admin/bodegas',      label: t('admin.sidebar.bodegas'),      icon: 'building'  },
    { to: '/admin/inventario',   label: 'Inventario IA',                 icon: 'ai'        },
    { to: '/admin/compras',      label: 'Compras',                       icon: 'compra'    },
    { to: '/admin/proveedores',  label: 'Proveedores',                   icon: 'proveedor' },
    { section: 'Ventas' },
    { to: '/admin/pedidos',        label: t('admin.sidebar.pedidos'),      icon: 'clipboard' },
    { to: '/admin/ventas',         label: 'Nueva venta',                   icon: 'plus'      },
    { to: '/admin/asignar-compra', label: 'Registrar compra externa',     icon: 'assign'    },
    { to: '/admin/finanzas',       label: t('admin.sidebar.finanzas'),     icon: 'chart'     },
    { to: '/admin/billetera',    label: 'Mi Billetera',                  icon: 'wallet'    },
    { to: '/admin/reportes',     label: t('admin.sidebar.reportes'),     icon: 'bar'       },
    { section: 'Marketing' },
    { to: '/admin/ofertas',      label: 'Ofertas',                       icon: 'tag'       },
    { to: '/admin/blog',         label: 'Blog',                          icon: 'blog'      },
    { section: 'Mi negocio' },
    { to: '/admin/mi-empresa',   label: 'Mi negocio',                    icon: 'empresa'   },
    { to: '/admin/configuracion', label: 'Configuración',                icon: 'config'    },
  ]
}

// Persiste el scroll del sidebar entre navegaciones (AdminLayout remonta en cada ruta)
let _sidebarScrollTop = 0

/* ── SidebarContent fuera de AdminLayout para que React no desmonte/remonte al navegar ── */
function ModeSwitcherWrapper({ userRole }) {
  const permissions = useAuthStore(s => s.permissions)
  const navigate    = useNavigate()
  const modes       = getAvailableModes(userRole, permissions)
  const inPOSA      = useMatch('/admin/pos')
  const inPOSB      = useMatch('/admin/pos/*')
  if (modes.length <= 1) return null

  const inPOS   = !!(inPOSA || inPOSB)
  const altMode = inPOS
    ? modes.find(m => m.id === 'admin')
    : modes.find(m => m.id === 'pos')

  if (!altMode) return null

  return (
    <button
      onClick={() => { localStorage.setItem(MODE_PREF_KEY, altMode.id); navigate(altMode.path) }}
      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors hover:bg-[var(--hc-surface-2)]"
      style={{ color: 'var(--hc-accent)' }}>
      <span className="text-xs">⇄</span>
      {inPOS ? 'Panel admin' : 'Caja POS'}
    </button>
  )
}

const PLAN_LABELS = { EMPRENDEDOR: 'Emprendedor', PYME: 'PYME', NEGOCIO_PLUS: 'Negocio Plus' }

const SECTION_COLORS = {
  'Catálogo':              'var(--hc-primary)',
  'Catálogo e inventario': 'var(--hc-primary)',
  'Ventas':                'var(--hc-link)',
  'POS':                   '#10b981',
  'Punto de Venta':        '#10b981',
  'Marketing':             '#f59e0b',
  'Sistema':               'var(--hc-muted)',
  'Mi negocio':            'var(--hc-link)',
}

function getSectionColor(section) {
  return SECTION_COLORS[section] || 'var(--hc-accent)'
}

function SidebarContent({ sidebarLinks, roleBadge, t, userName, empresaNombre, userRole, handleLogout, onSearch, onClose }) {
  const navRef = useRef(null)
  const hasFeature   = useTenantStore(s => s.hasFeature)
  const tenantLoaded = useTenantStore(s => s.loaded)
  const planNombre   = useTenantStore(s => s.planNombre)
  // "Sistema" (EMPRENDEDOR) usa sidebar claro siguiendo el mockup aprobado
  // (Front para cliente EPN); ADMIN/GERENTE/SUPERVISOR mantienen el nav
  // oscuro n-900 del Brand Book cap. 6.
  const isLight = userRole === 'EMPRENDEDOR'
  const muted   = isLight ? 'var(--hc-muted)' : 'rgba(255,255,255,0.45)'
  const faint   = isLight ? 'var(--hc-muted)' : 'rgba(255,255,255,0.32)'
  const hoverBg = isLight ? 'var(--hc-surface-2)' : 'rgba(255,255,255,0.04)'

  const [collapsed, setCollapsed] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('hc-sidebar-collapsed') || '[]')) }
    catch { return new Set() }
  })

  const toggleSection = (section) => {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(section)) next.delete(section)
      else next.add(section)
      try { localStorage.setItem('hc-sidebar-collapsed', JSON.stringify([...next])) } catch { /* quota or private mode */ }
      return next
    })
  }

  useLayoutEffect(() => {
    if (navRef.current) navRef.current.scrollTop = _sidebarScrollTop
  }, [])

  // Agrupar links por sección para poder usar AnimatePresence en cada grupo
  const groups = []
  let current = { section: null, items: [] }
  for (const link of sidebarLinks) {
    if (link.section) {
      groups.push({ ...current })
      current = { section: link.section, items: [] }
    } else {
      current.items.push(link)
    }
  }
  groups.push(current)

  return (
    <>
      {/* Logo — nav oscura (§2.4) para ADMIN, clara para Sistema/EMPRENDEDOR
          siguiendo el mockup aprobado (Front para cliente EPN/Sistema - Inicio.dc.html) */}
      {isLight ? (
        <div className="flex items-center justify-between gap-2 px-3 pt-[18px] pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <HotClickMark size={22} className="shrink-0" />
            <div className="hc-wordmark text-sm leading-none"><span className="hot">Hot</span><span className="click">Click</span></div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0" style={{ color: 'var(--hc-link)', backgroundColor: 'rgba(23,71,168,0.08)' }}>
              Sistema
            </span>
          </div>
          {onClose && (
            <button onClick={onClose} aria-label="Cerrar menú" className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors hover:bg-[var(--hc-surface-2)]" style={{ border: '1px solid var(--hc-border)', color: 'var(--hc-muted)' }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>
      ) : (
        <div className="h-16 flex items-center px-5 shrink-0"
          style={{ borderBottom: '1px solid var(--hc-n-800)', '--hc-wordmark-hot': '#F0524A', '--hc-wordmark-click': '#FFFFFF', '--hc-surface': '#14171C' }}>
          <div className="flex items-center gap-2.5">
            <HotClickMark size={26} className="shrink-0" />
            <div>
              <div className="hc-wordmark text-sm leading-none"><span className="hot">Hot</span><span className="click">Click</span></div>
              <div className="text-[10px] mt-0.5" style={{ color: muted }}>{t('admin.sidebar.panelAdmin')}</div>
            </div>
          </div>
        </div>
      )}

      {/* Buscador rápido, rol badge y selector de negocio — solo nav oscura (ADMIN).
          El sidebar "Sistema" (EMPRENDEDOR) los omite para calcar el mockup aprobado. */}
      {!isLight && (
        <>
          <div className="px-3 pt-3 pb-1">
            <motion.button
              onClick={onSearch}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition-colors hover:bg-white/[0.06]"
              style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.45)' }}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
              <span className="flex-1 text-left">Buscar…</span>
              <kbd className="px-1.5 py-0.5 rounded text-[9px] font-mono" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>⌘K</kbd>
            </motion.button>
          </div>

          <div className="px-4 pt-2 pb-1">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${roleBadge.color}`}>
              {roleBadge.label}
            </span>
          </div>
        </>
      )}

      {/* Nav */}
      <nav
        ref={navRef}
        onScroll={e => { _sidebarScrollTop = e.currentTarget.scrollTop }}
        className="flex-1 px-3 py-2 overflow-y-auto"
      >
        {groups.map((group, gi) => {
          const isOpen = !group.section || !collapsed.has(group.section)
          const color  = group.section ? getSectionColor(group.section) : null

          return (
            <div key={group.section || `g-${gi}`}>
              {/* Cabecera de sección — plana y estática en Sistema (mockup aprobado),
                  colapsable con barra de color en el nav oscuro (ADMIN) */}
              {group.section && (isLight ? (
                <div className="px-3 pt-3.5 pb-1">
                  <span className="text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--hc-muted)' }}>
                    {group.section}
                  </span>
                </div>
              ) : (
                <button
                  onClick={() => toggleSection(group.section)}
                  className="w-full flex items-center justify-between px-2 pt-5 pb-2 group/sec"
                >
                  <div className="flex items-center gap-2">
                    <motion.div
                      animate={{ opacity: isOpen ? 1 : 0.4, scaleY: isOpen ? 1 : 0.6 }}
                      transition={{ duration: 0.2 }}
                      className="w-0.5 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span
                      className="text-[9px] font-bold uppercase tracking-[0.13em] transition-colors duration-150 group-hover/sec:text-white/60"
                      style={{ color: isOpen ? 'rgba(255,255,255,0.38)' : 'rgba(255,255,255,0.22)' }}
                    >
                      {group.section}
                    </span>
                  </div>
                  <motion.svg
                    animate={{ rotate: isOpen ? 0 : -90 }}
                    transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                    className="w-3 h-3 shrink-0"
                    style={{ color: faint }}
                    fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"
                    strokeLinecap="round" strokeLinejoin="round"
                  >
                    <path d="M6 9l6 6 6-6"/>
                  </motion.svg>
                </button>
              ))}

              {/* Items de la sección con animación */}
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    key={group.section || 'top'}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                    style={{ overflow: 'hidden' }}
                  >
                    {group.items.map((link, li) => (
                      <motion.div
                        key={link.to}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: li * 0.028, duration: 0.18, ease: 'easeOut' }}
                      >
                        <NavLink
                          to={link.to}
                          end={link.exact}
                          className={`group/item relative flex items-center gap-2.5 px-3 mb-0.5 transition-colors duration-150 ${isLight ? 'py-2 rounded-[10px]' : 'py-2.5 rounded-xl'}`}
                          style={({ isActive }) => (isLight
                            ? {
                                color:           isActive ? 'var(--hc-link)' : 'var(--hc-text)',
                                fontWeight:      isActive ? 700 : 500,
                                backgroundColor: isActive ? 'rgba(23,71,168,0.08)' : 'transparent',
                              }
                            : {
                                color:           isActive ? '#fff' : 'rgba(255,255,255,0.48)',
                                backgroundColor: isActive ? 'rgba(231,59,51,0.16)' : 'transparent',
                                border:          '1px solid transparent',
                              })}
                        >
                          {({ isActive }) => isLight ? (
                            <>
                              {/* Hover background */}
                              {!isActive && (
                                <motion.div
                                  className="absolute inset-0 rounded-[10px] opacity-0 group-hover/item:opacity-100 transition-opacity duration-150"
                                  style={{ backgroundColor: hoverBg }}
                                />
                              )}

                              {/* Bullet — como en el mockup aprobado, sin ícono por ítem */}
                              <span
                                className="relative w-[7px] h-[7px] rounded-[3px] shrink-0"
                                style={{ backgroundColor: isActive ? 'var(--hc-link)' : '#cbc2b1' }}
                              />

                              <span className="relative flex-1 text-sm leading-tight flex items-center gap-1.5">
                                {link.label}
                                {link.feature && tenantLoaded && !hasFeature(link.feature) && (
                                  <svg className="w-3 h-3 shrink-0" style={{ color: muted }}
                                    fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                    <rect x="4" y="10" width="16" height="10" rx="2"/>
                                    <path strokeLinecap="round" d="M8 10V7a4 4 0 118 0v3"/>
                                  </svg>
                                )}
                              </span>
                            </>
                          ) : (
                            <>
                              {/* Línea lateral activa */}
                              {isActive && (
                                <motion.div
                                  layoutId="sidebar-active-line"
                                  className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full"
                                  style={{ backgroundColor: 'var(--hc-red-500)' }}
                                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                                />
                              )}

                              {/* Hover background */}
                              {!isActive && (
                                <motion.div
                                  className="absolute inset-0 rounded-xl opacity-0 group-hover/item:opacity-100 transition-opacity duration-150"
                                  style={{ backgroundColor: hoverBg }}
                                />
                              )}

                              {/* Icono */}
                              <motion.span
                                className="relative w-[18px] h-[18px] flex items-center justify-center shrink-0 transition-colors duration-150"
                                style={{ color: isActive ? (color || 'var(--hc-accent)') : 'rgba(255,255,255,0.38)' }}
                                whileHover={{ scale: 1.12 }}
                                transition={{ duration: 0.15 }}
                              >
                                <SidebarIcon name={link.icon} />
                              </motion.span>

                              {/* Label */}
                              <motion.span
                                className="relative flex-1 text-[13px] font-medium leading-tight flex items-center gap-1.5"
                                whileHover={{ x: 2 }}
                                transition={{ duration: 0.15 }}
                              >
                                {link.label}
                                {link.feature && tenantLoaded && !hasFeature(link.feature) && (
                                  <svg className="w-3 h-3 shrink-0" style={{ color: faint }}
                                    fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                    <rect x="4" y="10" width="16" height="10" rx="2"/>
                                    <path strokeLinecap="round" d="M8 10V7a4 4 0 118 0v3"/>
                                  </svg>
                                )}
                              </motion.span>

                              {/* Dot activo animado */}
                              {isActive && (
                                <motion.div
                                  layoutId="sidebar-active-dot"
                                  className="w-1.5 h-1.5 rounded-full shrink-0"
                                  style={{ backgroundColor: 'var(--hc-red-500)' }}
                                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                                />
                              )}
                            </>
                          )}
                        </NavLink>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </nav>

      {/* User */}
      <div className="p-3 space-y-1 shrink-0" style={{ borderTop: `1px solid ${isLight ? 'var(--hc-border)' : 'var(--hc-n-800)'}` }}>
        {isLight ? (
          /* "Ver tienda como cliente" y "Tour del panel" viven en Configuración
             → Plan y cuenta (AdminPlanes.jsx). "Cerrar sesión" también sigue
             ahí, pero por pedido del dueño hay un acceso directo en el sidebar. */
          <>
            <NavLink
              to="/admin/pos"
              className="flex items-center justify-center px-3 py-[11px] rounded-[10px] text-sm font-semibold transition-colors hover:bg-[var(--hc-surface-2)]"
              style={{ color: 'var(--hc-link)', border: '1px solid var(--hc-border)' }}
            >
              Ir a la Caja (POS) →
            </NavLink>
            <motion.button
              onClick={handleLogout}
              whileHover={{ color: '#dc2626', backgroundColor: 'rgba(220,38,38,0.06)' }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[10px] text-sm font-medium transition-colors text-left"
              style={{ color: 'var(--hc-muted)' }}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              {t('admin.sidebar.cerrarSesion')}
            </motion.button>
          </>
        ) : (
          <>
            <ModeSwitcherWrapper userRole={userRole} />
            <NavLink
              to="/"
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors"
              style={{ color: 'var(--hc-link)', backgroundColor: 'rgba(23,71,168,0.08)', border: '1px solid rgba(23,71,168,0.2)' }}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
              Ver tienda como cliente
            </NavLink>
            <button
              onClick={() => globalThis.dispatchEvent(new Event('hc-open-tour'))}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors text-left hover:bg-white/[0.04]"
              style={{ color: muted }}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
              </svg>
              Tour del panel
            </button>
            <motion.button
              onClick={handleLogout}
              whileHover={{ backgroundColor: 'rgba(239,68,68,0.06)' }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors text-left"
              style={{ color: '#f87171' }}
            >
              {t('admin.sidebar.cerrarSesion')}
            </motion.button>
          </>
        )}
        <div className={`flex items-center px-3 ${isLight ? 'gap-2.5 pt-3 pb-0.5' : 'gap-2 py-2'}`}>
          <motion.div
            whileHover={{ scale: 1.08 }}
            transition={{ duration: 0.15 }}
            className={`rounded-full flex items-center justify-center shrink-0 ${isLight ? 'w-[34px] h-[34px] text-[13px] font-bold' : 'w-7 h-7 text-xs font-semibold'}`}
            style={isLight
              ? { backgroundColor: 'var(--hc-link)', color: '#fff' }
              : { backgroundColor: 'rgba(23,71,168,0.15)', color: 'var(--hc-accent)' }}
          >
            {userName?.[0]?.toUpperCase() || 'A'}
          </motion.div>
          <div className="min-w-0">
            <div className={`truncate ${isLight ? 'text-[13px] font-semibold' : 'text-xs'}`} style={{ color: isLight ? 'var(--hc-text)' : 'rgba(255,255,255,0.55)' }}>{userName || 'Admin'}</div>
            {userRole === 'EMPRENDEDOR' && tenantLoaded ? (
              <div className={`truncate ${isLight ? 'text-xs' : 'text-[10px]'}`} style={{ color: muted }}>
                Plan {PLAN_LABELS[planNombre] ?? planNombre}
              </div>
            ) : empresaNombre && (
              <div className="text-[10px] truncate text-amber-400">{empresaNombre}</div>
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
  const { userName, userRole, empresaNombre, empresaId, logout } = useAuthStore()
  const { loadTenantInfo, loadTenantUso, clear: clearTenant } = useTenantStore()
  const [drawerOpen,    setDrawerOpen]    = useState(false)
  const [empresaStatus, setEmpresaStatus] = useState(null) // { estadoEmpresa, visibilidadPublica }
  const [searchOpen,    setSearchOpen]    = useState(false)

  // Cargar info del tenant (plan, límites, features) al montar el panel admin
  useEffect(() => {
    if (!empresaId) return
    loadTenantInfo()
    loadTenantUso()
    return () => clearTenant()
  }, [empresaId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Atajo global Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setSearchOpen(s => !s) }
    }
    globalThis.addEventListener('keydown', handler)
    return () => globalThis.removeEventListener('keydown', handler)
  }, [])

  const sidebarLinks = buildSidebarLinks(t, userRole)
  const handleLogout = () => { logout(); navigate('/') }

  // Cargar estado de empresa para mostrar banners de aprobación / visibilidad
  useEffect(() => {
    if (userRole !== 'EMPRENDEDOR') return
    import('@/services/api').then(({ default: api }) => {
      api.get('/empresa/perfil')
        .then(({ data }) => {
          const e = data?.id ? data : (data?.data ?? data)
          if (e?.id) setEmpresaStatus({ estadoEmpresa: e.estadoEmpresa, visibilidadPublica: e.visibilidadPublica })
        })
        .catch(() => {})
    })
  }, [userRole, empresaId])

  const roleBadge = {
    ADMIN:       { label: 'IT Admin',    color: 'bg-red-500/20 text-red-400' },
    EMPRENDEDOR: { label: 'Emprendedor', color: 'bg-amber-500/20 text-amber-400' },
  }[userRole] ?? { label: userRole, color: 'bg-gray-500/20 text-gray-400' }

  const sidebarProps = { sidebarLinks, roleBadge, t, userName, empresaNombre, userRole, handleLogout, onSearch: () => setSearchOpen(true) }
  // Sistema (EMPRENDEDOR) usa sidebar claro siguiendo el mockup aprobado;
  // ADMIN/GERENTE/SUPERVISOR mantienen el nav oscuro n-900 (Brand Book cap. 6).
  const isLightSidebar = userRole === 'EMPRENDEDOR'

  return (
    <div className={`hc-admin-content min-h-screen ${isLightSidebar ? 'hc-sistema-theme' : ''}`} style={{ backgroundColor: 'var(--hc-bg)' }}>
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      {/* ── Desktop sidebar ── */}
      {/* Nav oscura n-900 con ítem activo rojo (Brand Book cap. 6) para ADMIN;
          Sistema (EMPRENDEDOR) usa el sidebar claro del mockup aprobado. */}
      <aside
        className={`hc-admin-sidebar shrink-0 flex-col fixed inset-y-0 left-0 z-20 hidden md:flex ${isLightSidebar ? 'w-[230px]' : 'w-60'}`}
        style={isLightSidebar
          ? { backgroundColor: 'var(--hc-surface)', borderRight: '1px solid var(--hc-border)' }
          : { backgroundColor: 'var(--hc-n-900)', borderRight: '1px solid var(--hc-n-800)' }}
      >
        <SidebarContent {...sidebarProps} />
      </aside>

      {/* ── Mobile: top header bar ── */}
      {isLightSidebar ? (
        /* Sistema (EMPRENDEDOR) sigue el patrón del mockup móvil aprobado:
           hamburguesa a la izquierda, wordmark + pill "Sistema", acceso
           directo a la Caja y avatar a la derecha. */
        <header
          className="md:hidden fixed top-0 left-0 right-0 z-30 h-14 backdrop-blur-xl flex items-center gap-2.5 px-4"
          style={{ backgroundColor: 'var(--hc-surface)', borderBottom: '1px solid var(--hc-border)' }}
        >
          <button
            onClick={() => setDrawerOpen(true)}
            className="w-9 h-9 rounded-lg flex flex-col items-center justify-center gap-1 shrink-0 transition-colors hover:bg-[var(--hc-surface-2)]"
            style={{ border: '1px solid var(--hc-border)' }}
            aria-label={t('nav.menu')}
          >
            <span className="w-4 h-0.5 rounded-full" style={{ backgroundColor: 'var(--hc-text)' }} />
            <span className="w-4 h-0.5 rounded-full" style={{ backgroundColor: 'var(--hc-text)' }} />
            <span className="w-4 h-0.5 rounded-full" style={{ backgroundColor: 'var(--hc-text)' }} />
          </button>
          <HotClickMark size={22} className="shrink-0" />
          <div className="hc-wordmark text-sm"><span className="hot">Hot</span><span className="click">Click</span></div>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0" style={{ color: 'var(--hc-link)', backgroundColor: 'rgba(23,71,168,0.08)' }}>
            Sistema
          </span>
          <div className="flex-1" />
          <NavLink to="/admin/pos"
            className="text-[13px] font-bold px-3 py-1.5 rounded-full whitespace-nowrap shrink-0 transition-colors hover:bg-[var(--hc-surface-2)]"
            style={{ color: 'var(--hc-link)', border: '1px solid var(--hc-border)' }}
          >
            Caja →
          </NavLink>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
            style={{ backgroundColor: 'var(--hc-link)', color: '#fff' }}>
            {userName?.[0]?.toUpperCase() || 'A'}
          </div>
        </header>
      ) : (
        <header
          className="md:hidden fixed top-0 left-0 right-0 z-30 h-14 backdrop-blur-xl flex items-center justify-between px-4"
          style={{ backgroundColor: 'var(--hc-surface)', borderBottom: '1px solid var(--hc-border)' }}
        >
          <div className="flex items-center gap-1.5">
            {/* Botón atrás — visible en sub-páginas, oculto en el dashboard raíz */}
            {location.pathname !== '/admin' && (
              <button
                onClick={() => navigate(-1)}
                className="p-1.5 rounded-lg hover:bg-[var(--hc-surface-2)] transition-colors mr-0.5"
                style={{ color: 'var(--hc-text)' }}
                aria-label="Atrás"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 5l-7 7 7 7"/>
                </svg>
              </button>
            )}
            <HotClickMark size={26} className="shrink-0" />
            <div className="hc-wordmark text-sm"><span className="hot">Hot</span><span className="click">Click</span></div>
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
      )}

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
              className={`hc-admin-sidebar fixed inset-y-0 left-0 z-50 flex flex-col md:hidden ${isLightSidebar ? 'w-[230px]' : 'w-64'}`}
              style={isLightSidebar
                ? { backgroundColor: 'var(--hc-surface)', borderRight: '1px solid var(--hc-border)' }
                : { backgroundColor: 'var(--hc-n-900)', borderRight: '1px solid var(--hc-n-800)' }}
            >
              {/* En Sistema (isLight) el botón de cerrar vive junto al wordmark,
                  dentro de SidebarContent, igual que el mockup móvil aprobado. */}
              {!isLightSidebar && (
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-[var(--hc-surface-2)] transition-colors"
                  style={{ color: 'var(--hc-muted)' }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              )}
              <SidebarContent {...sidebarProps} onClose={isLightSidebar ? () => setDrawerOpen(false) : undefined} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Content ── */}
      <div className={`h-screen overflow-hidden flex flex-col pt-14 md:pt-0 ${isLightSidebar ? 'md:ml-[230px]' : 'md:ml-60'}`}>
        <OfflineBanner />
        <TrialBanner />
        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="flex-1 overflow-y-auto px-4 py-4 md:pt-6 md:px-6 lg:px-8"
        >
          {/* Banner: negocio pendiente de aprobación */}
          {empresaStatus?.estadoEmpresa === 'PENDIENTE_APROBACION' && (
            <div className="mb-5 flex items-start gap-3 px-4 py-3 rounded-xl text-sm"
              style={{ backgroundColor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b' }}>
              <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="font-semibold">Tu negocio está pendiente de aprobación</p>
                <p className="text-xs mt-0.5 opacity-80">
                  Un administrador IT revisará tu solicitud. Mientras tanto podés preparar tu catálogo, pero tu tienda no será visible al público hasta recibir la aprobación.
                </p>
              </div>
            </div>
          )}
          {/* Banner: negocio en modo invisible (aprobado pero pausado por el emprendedor) */}
          {empresaStatus?.estadoEmpresa === 'ACTIVO' && empresaStatus?.visibilidadPublica === false && (
            <div className="mb-5 flex items-center gap-3 px-4 py-3 rounded-xl text-sm"
              style={{ backgroundColor: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.3)', color: '#818cf8' }}>
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
              <span>
                <span className="font-semibold">Negocio en modo invisible</span>
                <span className="ml-2 opacity-80">— Tus productos no son visibles al público. Activá la visibilidad desde</span>
                <Link to="/admin/mi-empresa" className="ml-1 underline font-medium">Mi negocio</Link>.
              </span>
            </div>
          )}
          {children}
        </motion.main>
      </div>

      {/* Buscador global Cmd+K */}
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Tour guiado para admins — solo se muestra la primera vez */}
      <AppTour />
    </div>
  )
}

const ic = 'w-4 h-4'
const s = { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }

const SIDEBAR_ICONS = {
  home:      <svg className={ic} {...s}><path d="M3 12L12 3l9 9"/><path d="M9 21V12h6v9"/><path d="M3 12v9h18v-9"/></svg>,
  box:       <svg className={ic} {...s}><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
  clipboard: <svg className={ic} {...s}><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>,
  users:     <svg className={ic} {...s}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
  tag:       <svg className={ic} {...s}><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
  building:  <svg className={ic} {...s}><rect x="2" y="7" width="20" height="14" rx="1"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>,
  plus:      <svg className={ic} {...s}><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>,
  chart:     <svg className={ic} {...s}><line x1="12" y1="2" x2="12" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
  bar:       <svg className={ic} {...s}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>,
  share:     <svg className={ic} {...s}><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>,
  camera:    <svg className={ic} {...s}><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>,
  card:      <svg className={ic} {...s}><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>,
  marca:     <svg className={ic} {...s}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
  config:    <svg className={ic} {...s}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
  heart:     <svg className={ic} {...s}><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/><path d="M11 8c-1.5 0-3 1-3 2.5 0 2 2 3 3 4 1-1 3-2 3-4C14 9 12.5 8 11 8z"/></svg>,
  star:      <svg className={ic} {...s}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  empresa:   <svg className={ic} {...s}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  check:     <svg className={ic} {...s}><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>,
  shield:    <svg className={ic} {...s}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  pos:       <svg className={ic} {...s}><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/><path d="M6 7h4M6 10h6M6 13h2"/></svg>,
  compra:    <svg className={ic} {...s}><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><polyline points="9 14 12 17 15 14"/><line x1="12" y1="10" x2="12" y2="17"/></svg>,
  proveedor: <svg className={ic} {...s}><circle cx="12" cy="7" r="4"/><path d="M5.5 21a8.38 8.38 0 0013 0M2 21h4M18 21h4"/></svg>,
  wrench:    <svg className={ic} {...s}><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>,
  blog:      <svg className={ic} {...s}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  gift:      <svg className={ic} {...s}><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/></svg>,
  coupon:    <svg className={ic} {...s}><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M2 12h4M18 12h4" strokeDasharray="2 2"/><circle cx="12" cy="12" r="3"/></svg>,
  brand:     <svg className={ic} {...s}><circle cx="12" cy="12" r="10"/><path d="M8.56 2.75c4.37 6.03 6.02 9.42 8.03 17.72m2.54-15.38c-3.72 4.35-8.94 5.66-16.88 5.85m19.5 1.9c-3.5-.93-6.63-.82-8.94 0-2.58.92-5.01 2.86-7.44 6.32"/></svg>,
  plugin:    <svg className={ic} {...s}><path d="M20.24 12.24a6 6 0 00-8.49-8.49L5 10.5V19h8.5z"/><line x1="16" y1="8" x2="2" y2="22"/><line x1="17.5" y1="15" x2="9" y2="15"/></svg>,
  key:       <svg className={ic} {...s}><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>,
  ai:        <svg className={ic} {...s}><path d="M12 2a2 2 0 012 2v2a2 2 0 01-2 2 2 2 0 01-2-2V4a2 2 0 012-2z"/><path d="M12 18a2 2 0 012 2v-2a2 2 0 01-2-2 2 2 0 01-2 2v2a2 2 0 012-2z"/><path d="M4 12a2 2 0 012-2h2a2 2 0 012 2 2 2 0 01-2 2H6a2 2 0 01-2-2z"/><path d="M18 12a2 2 0 012-2h-2a2 2 0 01-2 2 2 2 0 012 2h2a2 2 0 01-2-2z"/></svg>,
  copilot:   <svg className={ic} {...s}><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>,
  forecast:  <svg className={ic} {...s}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  exec:      <svg className={ic} {...s}><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>,
  globe:     <svg className={ic} {...s}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>,
  qr:        <svg className={ic} {...s}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="5" y="5" width="3" height="3"/><rect x="16" y="5" width="3" height="3"/><rect x="5" y="16" width="3" height="3"/><path d="M14 14h3v3h-3zM17 17h3v3h-3zM14 20h3"/></svg>,
  sync:      <svg className={ic} {...s}><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>,
  assign:    <svg className={ic} {...s}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>,
  upload:    <svg className={ic} {...s}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  import:    <svg className={ic} {...s}><path d="M12 3v12M8 11l4 4 4-4"/><path d="M20 21H4a2 2 0 01-2-2V5a2 2 0 012-2h10l6 6v10a2 2 0 01-2 2z"/></svg>,
  help:      <svg className={ic} {...s}><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
}

function SidebarIcon({ name }) {
  return SIDEBAR_ICONS[name] ?? <svg className={ic} {...s}><circle cx="12" cy="12" r="3"/></svg>
}
