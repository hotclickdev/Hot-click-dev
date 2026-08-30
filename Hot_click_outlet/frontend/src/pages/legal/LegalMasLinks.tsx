import { Link } from 'react-router-dom'

const LINKS = [
  { to: '/envios', label: 'Envíos' },
  { to: '/nosotros', label: 'Nosotros' },
  { to: '/terminos', label: 'Términos' },
  { to: '/privacidad', label: 'Privacidad' },
  { to: '/devoluciones', label: 'Devoluciones' },
] as const

/**
 * Pie legal Figma: mismas URLs SEO, cromo Visitante.
 */
export default function LegalMasLinks() {
  return (
    <nav className="mx-auto mt-10 max-w-md border-t border-hc-border px-4 py-6" aria-label="Más información legal">
      <p className="font-display text-sm font-semibold">Más información</p>
      <ul className="mt-3 grid grid-cols-2 gap-2">
        {LINKS.map((item) => (
          <li key={item.to}>
            <Link to={item.to} className="inline-flex min-h-11 items-center text-sm font-medium text-hc-accent">
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
