import { motion } from 'framer-motion'
import { useState, useRef, useLayoutEffect } from 'react'
import type { TFunction } from 'i18next'
import { HotClickMark } from '@/components/ui/BrandLogo'
import useTenantStore from '@/store/tenantStore'
import { esUsuarioSistema } from '@/utils/sistemaUser'
import { etiquetaChromeAdmin } from './adminChrome'
import { leerSeccionesColapsadas, CLAVE_SIDEBAR_COLAPSADO, type SidebarLink } from './adminItJobs'
import SidebarNavGroups, { type SidebarGroup } from './SidebarNavGroups'
import SidebarUserFooter from './SidebarUserFooter'

export type RoleBadge = {
  label: string | null | undefined
  color: string
}

export type SidebarContentProps = {
  sidebarLinks: SidebarLink[]
  roleBadge: RoleBadge
  t: TFunction
  userName: string | null
  empresaNombre: string | null
  userRole: string | null
  handleLogout: () => void
  onSearch: () => void
  onClose?: () => void
}

let _sidebarScrollTop = 0

/** Contenido del sidebar admin: logo, nav por secciones y footer de usuario. */
export default function SidebarContent({ sidebarLinks, roleBadge, t, userName, empresaNombre, userRole, handleLogout, onSearch, onClose }: SidebarContentProps) {
  const navRef = useRef<HTMLElement | null>(null)
  const hasFeature   = useTenantStore((s) => s.hasFeature)
  const tenantLoaded = useTenantStore((s) => s.loaded)
  const planNombre   = useTenantStore((s) => s.planNombre)
  const esSistema = esUsuarioSistema(userRole)
  const muted   = 'var(--hc-muted)'
  const faint   = 'var(--hc-muted)'
  const hoverBg = 'var(--hc-surface-2)'
  const etiqueta = etiquetaChromeAdmin(userRole)

  const [collapsed, setCollapsed] = useState<Set<string>>(() => leerSeccionesColapsadas(userRole))

  const toggleSection = (section: string) => {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(section)) next.delete(section)
      else next.add(section)
      try { localStorage.setItem(CLAVE_SIDEBAR_COLAPSADO, JSON.stringify([...next])) } catch { /* quota or private mode */ }
      return next
    })
  }

  useLayoutEffect(() => {
    if (navRef.current) navRef.current.scrollTop = _sidebarScrollTop
  }, [])

  const groups: SidebarGroup[] = []
  let current: SidebarGroup = { section: null, items: [] }
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
      <div className="flex items-center justify-between gap-2 px-3 pt-[18px] pb-3 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <HotClickMark size={22} className="shrink-0" />
          <div className="hc-wordmark text-sm leading-none"><span className="hot">Hot</span><span className="click">Click</span></div>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0" style={{ color: 'var(--hc-link)', backgroundColor: 'rgba(23,71,168,0.08)' }}>
            {etiqueta}
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

      {!esSistema && (
        <>
          <div className="px-3 pt-1 pb-1">
            <motion.button
              onClick={onSearch}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition-colors hover:bg-[var(--hc-surface-2)]"
              style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)', color: 'var(--hc-muted)' }}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
              <span className="flex-1 text-left">Buscar…</span>
              <kbd className="px-1.5 py-0.5 rounded text-[9px] font-mono" style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>⌘K</kbd>
            </motion.button>
          </div>
          <div className="px-4 pt-2 pb-1">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${roleBadge.color}`}>
              {roleBadge.label}
            </span>
          </div>
        </>
      )}

      <SidebarNavGroups
        navRef={navRef}
        onScroll={e => { _sidebarScrollTop = e.currentTarget.scrollTop }}
        groups={groups}
        collapsed={collapsed}
        toggleSection={toggleSection}
        layoutSistema={esSistema}
        faint={faint}
        hoverBg={hoverBg}
        muted={muted}
        tenantLoaded={tenantLoaded}
        hasFeature={hasFeature}
        t={t}
      />

      <SidebarUserFooter
        esSistema={esSistema}
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
