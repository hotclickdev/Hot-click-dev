import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

export default function FooterLink({ to, children, highlight }: { to: string; children: ReactNode; highlight?: boolean }) {
  return (
    <li>
      <Link
        to={to}
        className="group flex items-center gap-2 py-1 text-sm transition-colors duration-150"
        style={{ color: highlight ? 'var(--hc-accent)' : 'var(--hc-muted)', fontWeight: highlight ? 600 : 400 }}
        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--hc-text)' }}
        onMouseLeave={(e) => { e.currentTarget.style.color = highlight ? 'var(--hc-accent)' : 'var(--hc-muted)' }}
      >
        <span
          className="inline-block w-1 h-1 rounded-full shrink-0 transition-all duration-150 group-hover:w-2"
          style={{ background: highlight ? 'var(--hc-accent)' : 'var(--hc-border-strong)' }}
        />
        {children}
      </Link>
    </li>
  )
}
