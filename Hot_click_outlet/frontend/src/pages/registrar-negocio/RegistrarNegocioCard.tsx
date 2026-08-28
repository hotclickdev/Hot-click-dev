import { A } from './registrarNegocioTheme'
import type { ReactNode } from 'react'

/** Card contenedora del formulario de registro de negocio. */
export default function RegistrarNegocioCard({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)', boxShadow: '0 4px 32px var(--hc-shadow)' }}>
      <div className="h-[3px]" style={{ background: `linear-gradient(90deg, transparent, ${A.color}, transparent)` }} />
      <div className="p-6 sm:p-7">
        {children}
      </div>
    </div>
  )
}
