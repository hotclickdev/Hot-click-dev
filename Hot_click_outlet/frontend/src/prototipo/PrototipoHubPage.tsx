import { Link } from 'react-router-dom'
import BrandLogo from '@/components/ui/BrandLogo'

const ROLES = [
  {
    to: '/prototipo/visitante',
    titulo: 'Visitante',
    detalle: 'Marketplace: catálogo, Discover, carrito y cuenta.',
  },
  {
    to: '/prototipo/emprendedor',
    titulo: 'Emprendedor',
    detalle: 'Menú, productos, POS, pedidos y planes.',
  },
  {
    to: '/prototipo/pyme',
    titulo: 'PYME',
    detalle: 'Flujo vendedor más Mi Equipo.',
  },
  {
    to: '/prototipo/negocio-plus',
    titulo: 'Negocio Plus',
    detalle: 'Flujo vendedor más Sucursales.',
  },
  {
    to: '/prototipo/admin',
    titulo: 'Super Admin',
    detalle: 'Dashboard, tiendas, moderación y herramientas.',
  },
] as const

/**
 * Índice de prototipos CLAUDECLICK. No existe como frame en Figma;
 * sirve para entrar a cada rol sin adivinar la URL.
 */
export default function PrototipoHubPage() {
  return (
    <main className="mx-auto min-h-dvh max-w-md bg-hc-bg px-4 pb-10 pt-8">
      <CabeceraHub />
      <ListaRoles />
    </main>
  )
}

function CabeceraHub() {
  return (
    <header className="mb-8">
      <BrandLogo size={36} wordmarkSize={24} />
      <h1 className="mt-5 font-display text-2xl font-bold text-hc-text">Prototipo CLAUDECLICK</h1>
      <p className="mt-2 text-sm text-hc-muted">
        UI nueva en TypeScript. Sin login real: cada pantalla usa datos de demo.
      </p>
    </header>
  )
}

function ListaRoles() {
  return (
    <ul className="flex flex-col gap-3">
      {ROLES.map((rol) => (
        <li key={rol.to}>
          <Link
            to={rol.to}
            className="block min-h-11 rounded-xl border border-hc-border bg-hc-surface px-4 py-4"
          >
            <p className="font-semibold text-hc-text">{rol.titulo}</p>
            <p className="mt-1 text-sm text-hc-muted">{rol.detalle}</p>
          </Link>
        </li>
      ))}
    </ul>
  )
}
