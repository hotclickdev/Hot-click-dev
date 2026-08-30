import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { Link } from 'react-router-dom'
import { esRutaEmprender } from '@/utils/emprendimientoRutas'

export type NavMenuItem = { href: string; label: string }

export type NavLinkItem = {
  href?: string
  label: string
  id?: string
  menu?: NavMenuItem[]
}

function rutaActiva(pathname: string, href: string) {
  if (href === '/productos') {
    return pathname === '/productos' || pathname.startsWith('/productos/')
  }
  if (href === '/servicios') {
    return pathname === '/servicios' || pathname.startsWith('/servicios/')
  }
  if (href === '/registro-empresa') {
    return pathname === '/registro-empresa' || pathname === '/registrar-negocio'
  }
  if (href === '/emprende') {
    return esRutaEmprender(pathname)
  }
  return pathname === href
}

function estiloLink(isActive: boolean) {
  return {
    color: isActive ? 'var(--hc-text)' : 'var(--hc-muted)',
    backgroundColor: isActive ? 'var(--hc-surface-2)' : 'transparent',
  }
}

function onLinkEnter(e: ReactMouseEvent<HTMLElement>, isActive: boolean) {
  if (isActive) return
  e.currentTarget.style.color = 'var(--hc-text)'
  e.currentTarget.style.backgroundColor = 'var(--hc-surface-2)'
}

function onLinkLeave(e: ReactMouseEvent<HTMLElement>, isActive: boolean) {
  if (isActive) return
  e.currentTarget.style.color = 'var(--hc-muted)'
  e.currentTarget.style.backgroundColor = 'transparent'
}

function PuntoActivo() {
  return (
    <span
      className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
      style={{ backgroundColor: 'var(--hc-accent)' }}
    />
  )
}

function NavbarMasMenu({ link, pathname }: { link: NavLinkItem; pathname: string }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const childActive = (link.menu ?? []).some((item) => rutaActiva(pathname, item.href))

  useEffect(() => {
    function cerrarSiAfuera(event: MouseEvent) {
      if (wrapRef.current && event.target instanceof Node && !wrapRef.current.contains(event.target)) setOpen(false)
    }
    function cerrarEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('click', cerrarSiAfuera)
    document.addEventListener('keydown', cerrarEscape)
    return () => {
      document.removeEventListener('click', cerrarSiAfuera)
      document.removeEventListener('keydown', cerrarEscape)
    }
  }, [])

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((valor) => !valor)}
        className="relative px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 inline-flex items-center gap-1"
        style={estiloLink(childActive)}
        onMouseEnter={(e) => onLinkEnter(e, childActive)}
        onMouseLeave={(e) => onLinkLeave(e, childActive)}
      >
        {link.label}
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
        {childActive && <PuntoActivo />}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute top-full left-0 mt-1 min-w-[200px] rounded-xl border py-1 z-50 shadow-[0_8px_24px_rgba(20,23,28,0.12)]"
          style={{ backgroundColor: 'var(--hc-surface)', borderColor: 'var(--hc-border)' }}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          {link.menu?.map((item) => {
            const isActive = rutaActiva(pathname, item.href)
            return (
              <Link
                key={item.href}
                role="menuitem"
                to={item.href}
                onClick={() => setOpen(false)}
                className="block px-3 py-2 text-sm font-medium"
                style={{
                  color: isActive ? 'var(--hc-text)' : 'var(--hc-muted)',
                  backgroundColor: isActive ? 'var(--hc-surface-2)' : 'transparent',
                }}
              >
                {item.label}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

/** Links de navegación desktop: Productos / Servicios HOT / Emprender / Más. */
export default function NavbarDesktopNav({ navLinks, pathname }: { navLinks: NavLinkItem[]; pathname: string }) {
  return (
    <div className="hidden md:flex items-center gap-0.5">
      {navLinks.map((link) => {
        if (link.menu) {
          return <NavbarMasMenu key={link.id || 'mas'} link={link} pathname={pathname} />
        }
        const isActive = rutaActiva(pathname, link.href ?? '')
        return (
          <Link
            key={link.href ?? link.id}
            to={link.href ?? '/'}
            className="relative px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200"
            style={estiloLink(isActive)}
            onMouseEnter={(e) => onLinkEnter(e, isActive)}
            onMouseLeave={(e) => onLinkLeave(e, isActive)}
          >
            {link.label}
            {isActive && <PuntoActivo />}
          </Link>
        )
      })}
    </div>
  )
}
