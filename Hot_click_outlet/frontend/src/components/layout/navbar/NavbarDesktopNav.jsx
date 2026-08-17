import { Link } from 'react-router-dom'

/** Links de navegación desktop. */
export default function NavbarDesktopNav({ navLinks, pathname }) {
  return (
    <div className="hidden md:flex items-center gap-0.5">
      {navLinks.map((link) => {
        const isActive = pathname === link.href
        if (link.highlight) {
          return (
            <Link
              key={link.href}
              to={link.href}
              className="relative px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 whitespace-nowrap"
              style={{
                color: isActive ? '#fff' : 'var(--hc-accent)',
                backgroundColor: isActive ? 'var(--hc-accent)' : 'color-mix(in srgb, var(--hc-accent) 10%, transparent)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--hc-accent)'; e.currentTarget.style.color = '#fff' }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = isActive ? 'var(--hc-accent)' : 'color-mix(in srgb, var(--hc-accent) 10%, transparent)'
                e.currentTarget.style.color = isActive ? '#fff' : 'var(--hc-accent)'
              }}
            >
              ✦ {link.label}
            </Link>
          )
        }
        return (
          <Link
            key={link.href}
            to={link.href}
            className="relative px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200"
            style={{
              color: isActive ? 'var(--hc-text)' : 'var(--hc-muted)',
              backgroundColor: isActive ? 'var(--hc-surface-2)' : 'transparent',
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.color = 'var(--hc-text)'
                e.currentTarget.style.backgroundColor = 'var(--hc-surface-2)'
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.color = 'var(--hc-muted)'
                e.currentTarget.style.backgroundColor = 'transparent'
              }
            }}
          >
            {link.label}
            {isActive && (
              <span
                className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                style={{ backgroundColor: 'var(--hc-accent)' }}
              />
            )}
          </Link>
        )
      })}
    </div>
  )
}
