import type { RefObject, UIEvent } from 'react'
import type { TFunction } from 'i18next'
import { NavLink } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { getSectionColor } from './adminSidebarTheme'
import { getSectionLabel, type SidebarLink } from './adminItJobs'
import { SidebarIcon } from './SidebarIcons'

export type SidebarGroup = {
  section: string | null
  items: SidebarLink[]
}

export type SidebarNavGroupsProps = {
  navRef: RefObject<HTMLElement | null>
  onScroll: (e: UIEvent<HTMLElement>) => void
  groups: SidebarGroup[]
  collapsed: Set<string>
  toggleSection: (section: string) => void
  layoutSistema: boolean
  faint: string
  hoverBg: string
  muted: string
  tenantLoaded: boolean
  hasFeature: (feature: string) => boolean
  t: TFunction
}

/** Nav del sidebar admin agrupado por sección (colapsable en IT). */
export default function SidebarNavGroups({
  navRef,
  onScroll,
  groups,
  collapsed,
  toggleSection,
  layoutSistema,
  faint,
  hoverBg,
  muted,
  tenantLoaded,
  hasFeature,
  t,
}: SidebarNavGroupsProps) {
  return (
    <nav
      ref={navRef}
      onScroll={onScroll}
      className="flex-1 px-3 py-2 overflow-y-auto"
    >
      {groups.map((group, gi) => {
        const isOpen = !group.section || !collapsed.has(group.section)
        const color  = group.section ? getSectionColor(group.section) : null
        const sectionTitle = group.section ? getSectionLabel(t, group.section) : null

        return (
          <div key={group.section || `g-${gi}`}>
            {group.section && (layoutSistema ? (
              <div className="px-3 pt-3.5 pb-1">
                <span className="text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--hc-muted)' }}>
                  {sectionTitle}
                </span>
              </div>
            ) : (
              <button type="button"
                onClick={() => { if (group.section) toggleSection(group.section) }}
                className="w-full flex items-center justify-between px-2 pt-5 pb-2 group/sec"
              >
                <div className="flex items-center gap-2">
                  <motion.div
                    animate={{ opacity: isOpen ? 1 : 0.4, scaleY: isOpen ? 1 : 0.6 }}
                    transition={{ duration: 0.2 }}
                    className="w-0.5 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: color ?? undefined }}
                  />
                  <span
                    className="text-[9px] font-bold uppercase tracking-[0.13em] transition-colors duration-150 group-hover/sec:text-[var(--hc-text)]"
                    style={{ color: isOpen ? 'var(--hc-muted)' : 'color-mix(in srgb, var(--hc-muted) 70%, transparent)' }}
                  >
                    {sectionTitle}
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
                        to={link.to ?? ''}
                        end={link.exact}
                        className={`group/item relative flex items-center gap-2.5 px-3 mb-0.5 transition-colors duration-150 ${layoutSistema ? 'py-2 rounded-[10px]' : 'py-2.5 rounded-xl'}`}
                        style={({ isActive }) => ({
                          color:           isActive ? 'var(--hc-link)' : 'var(--hc-text)',
                          fontWeight:      isActive ? 700 : 500,
                          backgroundColor: isActive ? 'rgba(23,71,168,0.08)' : 'transparent',
                        })}
                      >
                        {({ isActive }) => layoutSistema ? (
                          <ItemSistema
                            isActive={isActive}
                            hoverBg={hoverBg}
                            muted={muted}
                            label={link.label ?? ''}
                            feature={link.feature}
                            tenantLoaded={tenantLoaded}
                            hasFeature={hasFeature}
                          />
                        ) : (
                          <ItemIt
                            isActive={isActive}
                            hoverBg={hoverBg}
                            faint={faint}
                            color={color}
                            icon={link.icon ?? 'box'}
                            label={link.label ?? ''}
                            feature={link.feature}
                            tenantLoaded={tenantLoaded}
                            hasFeature={hasFeature}
                          />
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
  )
}

function CandadoPlan({ color }: { color: string }) {
  return (
    <svg className="w-3 h-3 shrink-0" style={{ color }}
      fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}
      aria-label="Incluido en el plan PYME" role="img">
      <title>Incluido en el plan PYME — tocá para ver qué incluye</title>
      <rect x="4" y="10" width="16" height="10" rx="2"/>
      <path strokeLinecap="round" d="M8 10V7a4 4 0 118 0v3"/>
    </svg>
  )
}

function ItemSistema({
  isActive, hoverBg, muted, label, feature, tenantLoaded, hasFeature,
}: {
  isActive: boolean
  hoverBg: string
  muted: string
  label: string
  feature?: string
  tenantLoaded: boolean
  hasFeature: (feature: string) => boolean
}) {
  return (
    <>
      {!isActive && (
        <motion.div
          className="absolute inset-0 rounded-[10px] opacity-0 group-hover/item:opacity-100 transition-opacity duration-150"
          style={{ backgroundColor: hoverBg }}
        />
      )}
      <span
        className="relative w-[7px] h-[7px] rounded-[3px] shrink-0"
        style={{ backgroundColor: isActive ? 'var(--hc-link)' : '#cbc2b1' }}
      />
      <span className="relative flex-1 text-sm leading-tight flex items-center gap-1.5">
        {label}
        {feature && tenantLoaded && !hasFeature(feature) && <CandadoPlan color={muted} />}
      </span>
    </>
  )
}

function ItemIt({
  isActive, hoverBg, faint, color, icon, label, feature, tenantLoaded, hasFeature,
}: {
  isActive: boolean
  hoverBg: string
  faint: string
  color: string | null
  icon: string
  label: string
  feature?: string
  tenantLoaded: boolean
  hasFeature: (feature: string) => boolean
}) {
  return (
    <>
      {isActive && (
        <motion.div
          layoutId="sidebar-active-line"
          className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full"
          style={{ backgroundColor: 'var(--hc-link)' }}
          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
        />
      )}
      {!isActive && (
        <motion.div
          className="absolute inset-0 rounded-xl opacity-0 group-hover/item:opacity-100 transition-opacity duration-150"
          style={{ backgroundColor: hoverBg }}
        />
      )}
      <motion.span
        className="relative w-[18px] h-[18px] flex items-center justify-center shrink-0 transition-colors duration-150"
        style={{ color: isActive ? (color || 'var(--hc-accent)') : 'var(--hc-muted)' }}
        whileHover={{ scale: 1.12 }}
        transition={{ duration: 0.15 }}
      >
        <SidebarIcon name={icon} />
      </motion.span>
      <motion.span
        className="relative flex-1 text-[13px] font-medium leading-tight flex items-center gap-1.5"
        whileHover={{ x: 2 }}
        transition={{ duration: 0.15 }}
      >
        {label}
        {feature && tenantLoaded && !hasFeature(feature) && <CandadoPlan color={faint} />}
      </motion.span>
      {isActive && (
        <motion.div
          layoutId="sidebar-active-dot"
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ backgroundColor: 'var(--hc-link)' }}
          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
        />
      )}
    </>
  )
}
