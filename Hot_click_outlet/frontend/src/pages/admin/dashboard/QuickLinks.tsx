import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CLASE_TARJETA_DASH } from './dashboardHelpers'

export type QuickLink = {
  to: string
  label: string
  icon: ReactNode
  highlight?: boolean
}

type QuickLinksProps = {
  links: QuickLink[]
}

export default function QuickLinks({ links }: QuickLinksProps) {
  const { t } = useTranslation()
  return (
    <div>
      <h2 className="text-xs font-semibold text-[var(--hc-muted)] uppercase tracking-wider mb-3">
        {t('admin.dashboard.quickAccess')}
      </h2>
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
        {links.map((link) => (
          link.highlight ? (
            <Link
              key={link.to}
              to={link.to}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl transition-all text-center group col-span-1"
              style={{ background: 'rgba(23,71,168,0.08)', border: '1.5px solid rgba(23,71,168,0.28)' }}
            >
              <span className="w-5 h-5" style={{ color: 'var(--hc-link)' }}>{link.icon}</span>
              <span className="text-xs font-bold leading-tight" style={{ color: 'var(--hc-link)' }}>
                {link.label}
              </span>
            </Link>
          ) : (
            <Link
              key={link.to}
              to={link.to}
              data-mm={link.to.includes('/productos') ? 'nuevo-producto' : undefined}
              className={`flex flex-col items-center gap-2 p-4 ${CLASE_TARJETA_DASH} hover:bg-[var(--hc-surface-2)] transition-all text-center group`}
            >
              <span className="w-5 h-5 text-[var(--hc-muted)] group-hover:text-[var(--hc-text)] transition-colors">
                {link.icon}
              </span>
              <span className="text-xs text-[var(--hc-muted)] group-hover:text-[var(--hc-text)] transition-colors leading-tight">
                {link.label}
              </span>
            </Link>
          )
        ))}
      </div>
    </div>
  )
}
