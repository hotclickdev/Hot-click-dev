import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import type { CatalogViewMode } from './catalogoTipos'

function PeopleIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0M18.75 9.75a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
    </svg>
  )
}

const TABS: { id: CatalogViewMode; label: string; sub: string; icon: ReactNode; accent: string; accentBg: string }[] = [
  {
    id: 'emprendimientos', label: 'Emprendimientos', sub: 'Negocios locales CR',
    icon: <PeopleIcon />,
    accent: '#10b981', accentBg: 'rgba(16,185,129,0.12)',
  },
]

export default function CatalogViewTabs({
  viewMode, onSelect,
}: {
  viewMode: CatalogViewMode | string
  onSelect: (id: CatalogViewMode) => void
}) {
  return (
    <div style={{ borderBottom: '1px solid var(--hc-border)', background: 'var(--hc-surface)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-2 overflow-x-auto scrollbar-hide py-3">
        {TABS.map(tab => {
          const active = viewMode === tab.id
          return (
            <button type="button" key={tab.id}
              onClick={() => onSelect(tab.id)}
              className="relative shrink-0 flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-left transition-all duration-200 whitespace-nowrap"
              style={active
                ? { background: tab.accentBg, border: `1.5px solid color-mix(in srgb, ${tab.accent} 20%, transparent)` }
                : { background: 'transparent', border: '1.5px solid transparent' }
              }
            >
              <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200"
                style={{ background: active ? tab.accentBg : 'color-mix(in srgb, var(--hc-text) 6%, transparent)', color: active ? tab.accent : 'var(--hc-muted)' }}>
                {tab.icon}
              </span>
              <span className="flex flex-col">
                <span className="text-sm font-bold leading-tight" style={{ color: active ? tab.accent : 'var(--hc-text)' }}>{tab.label}</span>
                <span className="text-[11px] leading-tight" style={{ color: 'var(--hc-muted)' }}>{tab.sub}</span>
              </span>
              {active && (
                <motion.div layoutId="tab-dot"
                  className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full"
                  style={{ background: tab.accent }} />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
