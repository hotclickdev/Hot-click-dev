import { NavLink, Link, useNavigate, useLocation, useMatch } from 'react-router-dom'
import { getAvailableModes, MODE_PREF_KEY } from '@/utils/modes'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect, useRef, useLayoutEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Helmet } from 'react-helmet-async'
import useAuthStore from '@/store/authStore'
import useTenantStore from '@/store/tenantStore'
import { authService } from '@/services/authService'
import GlobalSearch from '@/components/admin/GlobalSearch'
import TrialBanner from '@/components/TrialBanner'
import OfflineBanner from '@/components/OfflineBanner'
import AppTour from '@/components/ui/AppTour'

// Devuelve los links del sidebar con secciones según el rol activo
function buildSidebarLinks(t, userRole) {
  if (userRole === 'ADMIN_IT') {
    return [
      { to: '/admin', label: 'Inicio', icon: 'home', exact: true},
      { section: 'Catálogo' },
      { to: '/admin/productos',    label: t('admin.sidebar.productos'),  icon: 'box'      },
      { to: '/admin/categorias',   label: t('admin.sidebar.categorias'), icon: 'tag'      },
      { to: '/admin/marcas',       label: 'Marcas',                      icon: 'marca'    },
      { to: '/admin/bodegas',      label: t('admin.sidebar.bodegas'),    icon: 'building' },
      { to: '/admin/garantias',    label: 'Garantías',                   icon: 'shield'   },
      { to: '/admin/compras',      label: 'Compras',                     icon: 'compra'   },
      { to: '/admin/proveedores',  label: 'Proveedores',                 icon: 'proveedor'},
      { section: 'Ventas' },
      { to: '/admin/pedidos',      label: t('admin.sidebar.pedidos'),    icon: 'clipboard' },
      { to: '/admin/ventas',       label: t('admin.sidebar.nuevaVenta'), icon: 'plus'     },
      { to: '/admin/pos',          label: 'Caja POS',                    icon: 'pos'      },
      { to: '/admin/mesas',        label: 'Mesas / QR',                  icon: 'qr'       },
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
      { to: '/admin/api-keys',     label: 'API Keys',                    icon: 'key'      },
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

  if (userRole === 'EMPRENDEDOR') {
    return [
      { to: '/admin', label: 'Inicio', icon: 'home', exact: true},
      { section: 'Catálogo' },
      { to: '/admin/productos',      label: t('admin.sidebar.productos'),  icon: 'box'      },
      { to: '/admin/categorias',     label: t('admin.sidebar.categorias'), icon: 'tag'      },
      { to: '/admin/marcas',         label: 'Marcas',                      icon: 'marca'    },
      { to: '/admin/bodegas',        label: t('admin.sidebar.bodegas'),    icon: 'building' },
      { to: '/admin/garantias',      label: 'Garantías',                   icon: 'shield'   },
      { to: '/admin/compras',        label: 'Compras',                     icon: 'compra'   },
      { to: '/admin/proveedores',    label: 'Proveedores',                 icon: 'proveedor'},
      { section: 'Ventas' },
      { to: '/admin/pedidos',        label: t('admin.sidebar.pedidos'),    icon: 'clipboard' },
      { to: '/admin/ventas',         label: t('admin.sidebar.nuevaVenta'), icon: 'plus'     },
      { to: '/admin/pos',            label: 'Caja POS',                    icon: 'pos'      },
      { to: '/admin/mesas',          label: 'Mesas / QR',                  icon: 'qr'       },
      { to: '/admin/gift-cards',     label: 'Gift Cards',                  icon: 'gift'     },
      { to: '/admin/inventario',     label: 'AI Inventario',               icon: 'ai'       },
      { to: '/admin/copilot',        label: 'AI Copilot',                  icon: 'copilot'  },
      { to: '/admin/forecast',       label: 'AI Forecast',                 icon: 'forecast' },
      { to: '/admin/executive',      label: 'Executive BI',                icon: 'exec'     },
      { to: '/admin/finanzas',       label: t('admin.sidebar.finanzas'),   icon: 'chart'    },
      { to: '/admin/reportes',       label: t('admin.sidebar.reportes'),   icon: 'bar'      },
      { section: 'Marketing' },
      { to: '/admin/ofertas',        label: 'Ofertas',                     icon: 'tag'      },
      { to: '/admin/cupones',        label: 'Descuentos',                  icon: 'coupon'   },
      { to: '/admin/nuevo-producto', label: t('admin.sidebar.crearIA'),    icon: 'camera'   },
      { to: '/admin/publicaciones',  label: t('admin.sidebar.publicarFB'), icon: 'share'    },
      { to: '/admin/blog',           label: 'Blog',                        icon: 'blog'     },
      { to: '/admin/convenios',      label: 'Emprendimientos',             icon: 'heart'    },
      { section: 'Mi negocio' },
      { to: '/admin/mi-empresa',        label: 'Mi negocio',          icon: 'empresa'  },
      { to: '/admin/branding',          label: 'Branding / White Label', icon: 'brand'  },
      { to: '/admin/multipais',         label: 'LATAM / Multi-país',   icon: 'globe'   },
      { to: '/admin/plugins',           label: 'Plugins',              icon: 'plugin'  },
      { to: '/admin/api-keys',          label: 'API Keys',             icon: 'key'     },
      { to: '/admin/equipo',            label: 'Mi equipo',            icon: 'users'   },
      { to: '/admin/billing/planes',    label: 'Mi suscripción',      icon: 'card'     },
      { to: '/admin/offline/cola',      label: 'Cola offline',        icon: 'sync'     },
      { to: '/admin/configuracion',     label: 'Configuración',       icon: 'config'   },
    ]
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

  // ADMIN_CLIENTE
  return [
    { to: '/admin',              label: 'Inicio',                        icon: 'home', exact: true },
    { section: 'Punto de venta' },
    { to: '/admin/pos',          label: 'Caja registradora',             icon: 'pos'       },
    { to: '/admin/pos/caja',     label: 'Cuadre de caja',                icon: 'chart'     },
    { to: '/admin/pos/historial', label: 'Historial ventas',             icon: 'clipboard' },
    { to: '/admin/mesas',        label: 'Mesas / QR',                    icon: 'qr'        },
    { section: 'Catálogo e inventario' },
    { to: '/admin/productos',    label: t('admin.sidebar.productos'),    icon: 'box'       },
    { to: '/admin/nuevo-producto', label: 'Generar producto rápido',     icon: 'camera'    },
    { to: '/admin/categorias',   label: t('admin.sidebar.categorias'),   icon: 'tag'       },
    { to: '/admin/marcas',       label: 'Marcas',                        icon: 'marca'     },
    { to: '/admin/bodegas',      label: t('admin.sidebar.bodegas'),      icon: 'building'  },
    { to: '/admin/inventario',   label: 'Inventario IA',                 icon: 'ai'        },
    { to: '/admin/compras',      label: 'Compras',                       icon: 'compra'    },
    { to: '/admin/proveedores',  label: 'Proveedores',                   icon: 'proveedor' },
    { section: 'Ventas' },
    { to: '/admin/pedidos',      label: t('admin.sidebar.pedidos'),      icon: 'clipboard' },
    { to: '/admin/ventas',       label: 'Nueva venta',                   icon: 'plus'      },
    { to: '/admin/finanzas',     label: t('admin.sidebar.finanzas'),     icon: 'chart'     },
    { to: '/admin/reportes',     label: t('admin.sidebar.reportes'),     icon: 'bar'       },
    { section: 'Marketing' },
    { to: '/admin/ofertas',      label: 'Ofertas',                       icon: 'tag'       },
    { to: '/admin/publicaciones', label: 'Publicaciones',                icon: 'share'     },
    { to: '/admin/blog',         label: 'Blog',                          icon: 'blog'      },
    { section: 'Mi negocio' },
    { to: '/admin/mi-empresa',   label: 'Mi negocio',                    icon: 'empresa'   },
    { to: '/admin/configuracion', label: 'Configuración',                icon: 'config'    },
  ]
}

/* ── Switcher de negocio (solo EMPRENDEDOR / ADMIN_CLIENTE) ── */
function NegocioSwitcher({ empresaNombre, empresaId }) {
  const [open, setOpen]       = useState(false)
  const [negocios, setNegocios] = useState([])
  const [loading, setLoading] = useState(false)
  const [switching, setSwitching] = useState(null)
  const ref = useRef(null)
  const loginStore = useAuthStore((s) => s.login)
  const navigate   = useNavigate()

  useEffect(() => {
    if (!open) return
    setLoading(true)
    authService.misNegocios()
      .then(({ data }) => setNegocios(Array.isArray(data) ? data : (data?.data ?? [])))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [open])

  // Cerrar al click fuera
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  async function cambiar(negocio) {
    if (negocio.id === empresaId) { setOpen(false); return }
    setSwitching(negocio.id)
    try {
      const { data } = await authService.cambiarNegocio(negocio.id)
      const authData = data?.data ?? data
      loginStore(authData)
      setOpen(false)
      navigate('/admin', { replace: true })
      window.location.reload()
    } catch {
      setSwitching(null)
    }
  }

  return (
    <div ref={ref} className="relative px-3 pb-2">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition-all text-left"
        style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}
      >
        <svg className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--hc-accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
        <span className="flex-1 truncate font-medium">{empresaNombre || 'Mi negocio'}</span>
        <svg className={`w-3 h-3 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} style={{ color: 'var(--hc-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-3 right-3 top-full mt-1 rounded-xl shadow-xl z-50 overflow-hidden"
          style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
          <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--hc-muted)' }}>
            Cambiar negocio
          </div>
          {loading ? (
            <div className="px-3 py-3 text-xs text-center" style={{ color: 'var(--hc-muted)' }}>Cargando…</div>
          ) : negocios.length === 0 ? (
            <div className="px-3 py-3 text-xs text-center" style={{ color: 'var(--hc-muted)' }}>Sin otros negocios</div>
          ) : (
            negocios.map(n => (
              <button key={n.id} onClick={() => cambiar(n)} disabled={switching !== null}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-xs transition-colors hover:bg-[var(--hc-surface-2)] disabled:opacity-50"
                style={{ color: n.id === empresaId ? 'var(--hc-accent)' : 'var(--hc-text)' }}
              >
                <div className="w-6 h-6 rounded-lg shrink-0 flex items-center justify-center overflow-hidden"
                  style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)' }}>
                  {n.logoUrl
                    ? <img src={n.logoUrl} alt="" className="w-full h-full object-cover" />
                    : <span className="font-bold text-[10px]" style={{ color: 'var(--hc-accent)' }}>{n.nombre?.[0]?.toUpperCase()}</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="truncate font-medium">{n.nombre}</div>
                  {n.estadoEmpresa === 'PENDIENTE_APROBACION' && (
                    <div className="text-[9px] text-yellow-400">Pendiente aprobación</div>
                  )}
                </div>
                {n.id === empresaId && (
                  <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
                {switching === n.id && (
                  <div className="w-3.5 h-3.5 border-2 rounded-full animate-spin shrink-0"
                    style={{ borderColor: 'var(--hc-border)', borderTopColor: 'var(--hc-accent)' }} />
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
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

function SidebarContent({ sidebarLinks, roleBadge, t, userName, empresaNombre, empresaId, userRole, handleLogout, onSearch }) {
  const navRef = useRef(null)

  const [collapsed, setCollapsed] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('hc-sidebar-collapsed') || '[]')) }
    catch { return new Set() }
  })

  const toggleSection = (section) => {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(section)) next.delete(section)
      else next.add(section)
      try { localStorage.setItem('hc-sidebar-collapsed', JSON.stringify([...next])) } catch {}
      return next
    })
  }

  useLayoutEffect(() => {
    if (navRef.current) navRef.current.scrollTop = _sidebarScrollTop
  }, [])

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

      {/* Buscador rápido */}
      <div className="px-3 pt-3 pb-1">
        <button onClick={onSearch}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition-colors hover:bg-white/[0.06]"
          style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', color: 'var(--hc-muted)' }}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <span className="flex-1 text-left">Buscar…</span>
          <kbd className="px-1.5 py-0.5 rounded text-[9px] font-mono"
            style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>⌘K</kbd>
        </button>
      </div>

      {/* Rol badge */}
      <div className="px-4 pt-2 pb-1">
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${roleBadge.color}`}>
          {roleBadge.label}
        </span>
      </div>

      {/* Negocio switcher — solo EMPRENDEDOR y ADMIN_CLIENTE */}
      {(userRole === 'EMPRENDEDOR' || userRole === 'ADMIN_CLIENTE') && (
        <NegocioSwitcher empresaNombre={empresaNombre} empresaId={empresaId} />
      )}

      {/* Nav */}
      <nav ref={navRef} onScroll={e => { _sidebarScrollTop = e.currentTarget.scrollTop }} className="flex-1 px-3 py-2 overflow-y-auto">
        {(() => {
          let currentSection = null
          return sidebarLinks.map((link, i) => {
            if (link.divider) return (
              <div key={`div-${i}`} className="my-2" style={{ borderTop: '1px solid var(--hc-border)' }} />
            )
            if (link.section) {
              currentSection = link.section
              const isOpen = !collapsed.has(link.section)
              return (
                <button
                  key={`sec-${i}`}
                  onClick={() => toggleSection(link.section)}
                  className="w-full flex items-center justify-between px-3 pt-4 pb-1.5 hover:opacity-80 transition-opacity"
                >
                  <span className="text-[9px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--hc-muted)', opacity: 0.6 }}>
                    {link.section}
                  </span>
                  <svg
                    className="w-3 h-3 shrink-0 transition-transform duration-200"
                    style={{ color: 'var(--hc-muted)', opacity: 0.5, transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)' }}
                    fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"
                    strokeLinecap="round" strokeLinejoin="round"
                  >
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </button>
              )
            }
            if (currentSection && collapsed.has(currentSection)) return null
            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.exact}
                className={({ isActive }) => `
                  flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all duration-150 mb-0.5
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
          })
        })()}
      </nav>

      {/* User */}
      <div className="p-3 space-y-1 shrink-0" style={{ borderTop: '1px solid var(--hc-border)' }}>
        <ModeSwitcherWrapper userRole={userRole} />
        <NavLink
          to="/"
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors"
          style={{ color: '#34d399', backgroundColor: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)' }}
        >
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          Ver tienda como cliente
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
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const sidebarLinks = buildSidebarLinks(t, userRole)
  const handleLogout = () => { logout(); navigate('/') }

  // Cargar estado de empresa para mostrar banners de aprobación / visibilidad
  useEffect(() => {
    if (userRole !== 'EMPRENDEDOR' && userRole !== 'ADMIN_CLIENTE') return
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
    ADMIN_IT:      { label: 'IT Admin',      color: 'bg-red-500/20 text-red-400' },
    EMPRENDEDOR:   { label: 'Emprendedor',   color: 'bg-orange-500/20 text-orange-400' },
    ADMIN_CLIENTE: { label: 'Admin',         color: 'bg-blue-500/20 text-blue-400' },
  }[userRole] ?? { label: userRole, color: 'bg-gray-500/20 text-gray-400' }

  const sidebarProps = { sidebarLinks, roleBadge, t, userName, empresaNombre, empresaId, userRole, handleLogout, onSearch: () => setSearchOpen(true) }

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
      <div className="md:ml-60 h-screen overflow-hidden flex flex-col pt-14 md:pt-0">
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
    case 'pos':       return <svg className={ic} {...s}><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/><path d="M6 7h4M6 10h6M6 13h2"/></svg>
    case 'compra':    return <svg className={ic} {...s}><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><polyline points="9 14 12 17 15 14"/><line x1="12" y1="10" x2="12" y2="17"/></svg>
    case 'proveedor': return <svg className={ic} {...s}><circle cx="12" cy="7" r="4"/><path d="M5.5 21a8.38 8.38 0 0013 0M2 21h4M18 21h4"/></svg>
    case 'wrench':    return <svg className={ic} {...s}><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>
    case 'blog':      return <svg className={ic} {...s}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
    case 'gift':      return <svg className={ic} {...s}><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/></svg>
    case 'coupon':    return <svg className={ic} {...s}><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M2 12h4M18 12h4" strokeDasharray="2 2"/><circle cx="12" cy="12" r="3"/></svg>
    case 'brand':     return <svg className={ic} {...s}><circle cx="12" cy="12" r="10"/><path d="M8.56 2.75c4.37 6.03 6.02 9.42 8.03 17.72m2.54-15.38c-3.72 4.35-8.94 5.66-16.88 5.85m19.5 1.9c-3.5-.93-6.63-.82-8.94 0-2.58.92-5.01 2.86-7.44 6.32"/></svg>
    case 'plugin':    return <svg className={ic} {...s}><path d="M20.24 12.24a6 6 0 00-8.49-8.49L5 10.5V19h8.5z"/><line x1="16" y1="8" x2="2" y2="22"/><line x1="17.5" y1="15" x2="9" y2="15"/></svg>
    case 'key':       return <svg className={ic} {...s}><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
    case 'ai':        return <svg className={ic} {...s}><path d="M12 2a2 2 0 012 2v2a2 2 0 01-2 2 2 2 0 01-2-2V4a2 2 0 012-2z"/><path d="M12 18a2 2 0 012 2v-2a2 2 0 01-2-2 2 2 0 01-2 2v2a2 2 0 012-2z"/><path d="M4 12a2 2 0 012-2h2a2 2 0 012 2 2 2 0 01-2 2H6a2 2 0 01-2-2z"/><path d="M18 12a2 2 0 012-2h-2a2 2 0 01-2 2 2 2 0 012 2h2a2 2 0 01-2-2z"/></svg>
    case 'copilot':   return <svg className={ic} {...s}><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>
    case 'forecast':  return <svg className={ic} {...s}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
    case 'exec':      return <svg className={ic} {...s}><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
    case 'globe':     return <svg className={ic} {...s}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
    case 'qr':        return <svg className={ic} {...s}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="5" y="5" width="3" height="3"/><rect x="16" y="5" width="3" height="3"/><rect x="5" y="16" width="3" height="3"/><path d="M14 14h3v3h-3zM17 17h3v3h-3zM14 20h3"/></svg>
    case 'sync':      return <svg className={ic} {...s}><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
    default:          return <svg className={ic} {...s}><circle cx="12" cy="12" r="3"/></svg>
  }
}
