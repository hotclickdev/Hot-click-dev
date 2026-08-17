import { motion } from 'framer-motion'
import { useState, useRef, useLayoutEffect } from 'react'
import { HotClickMark } from '@/components/ui/BrandLogo'
import useTenantStore from '@/store/tenantStore'
import SidebarNavGroups from './SidebarNavGroups'
import SidebarUserFooter from './SidebarUserFooter'

// Persiste el scroll del sidebar entre navegaciones (AdminLayout remonta en cada ruta)
let _sidebarScrollTop = 0

/* ── SidebarContent fuera de AdminLayout para que React no desmonte/remonte al navegar ── */
/** Contenido del sidebar admin: logo, nav por secciones y footer de usuario. */
export default function SidebarContent({ sidebarLinks, roleBadge, t, userName, empresaNombre, userRole, handleLogout, onSearch, onClose }) {
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
            <button type="button" onClick={onClose} aria-label="Cerrar menú" className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors hover:bg-[var(--hc-surface-2)]" style={{ border: '1px solid var(--hc-border)', color: 'var(--hc-muted)' }}>
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
      <SidebarNavGroups
        navRef={navRef}
        onScroll={e => { _sidebarScrollTop = e.currentTarget.scrollTop }}
        groups={groups}
        collapsed={collapsed}
        toggleSection={toggleSection}
        isLight={isLight}
        faint={faint}
        hoverBg={hoverBg}
        muted={muted}
        tenantLoaded={tenantLoaded}
        hasFeature={hasFeature}
      />

      {/* User */}
      <SidebarUserFooter
        isLight={isLight}
        handleLogout={handleLogout}
        t={t}
        userRole={userRole}
        muted={muted}
        userName={userName}
        tenantLoaded={tenantLoaded}
        planNombre={planNombre}
        empresaNombre={empresaNombre}
      />
    </>
  )
}
