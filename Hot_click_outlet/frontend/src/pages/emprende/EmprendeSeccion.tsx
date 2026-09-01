import type { ReactNode } from 'react'

type Props = {
  id?: string
  badge?: string
  title: string
  subtitle?: string
  children: ReactNode
  className?: string
}

/** Encabezado reutilizable para secciones de la landing /emprende. */
export default function EmprendeSeccion({ id, badge, title, subtitle, children, className = '' }: Props) {
  return (
    <section id={id} className={`scroll-mt-24 py-10 sm:py-12 border-t first:border-t-0 first:pt-0 ${className}`} style={{ borderColor: 'var(--hc-border)' }}>
      {badge ? (
        <p className="text-xs font-bold tracking-[0.14em] uppercase mb-2" style={{ color: 'var(--hc-primary)' }}>
          {badge}
        </p>
      ) : null}
      <h2 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: 'var(--hc-text)' }}>{title}</h2>
      {subtitle ? (
        <p className="text-sm sm:text-base max-w-2xl mb-6 leading-relaxed" style={{ color: 'var(--hc-muted)' }}>
          {subtitle}
        </p>
      ) : null}
      {children}
    </section>
  )
}
