import { Link } from 'react-router-dom'
import BrandLogo from '@/components/ui/BrandLogo'
import useCartStore from '@/store/cartStore'
import { visitanteRuta } from './visitanteMock'

const CONFIANZA = [
  { titulo: 'Estamos disponible', detalle: 'Escribinos por WhatsApp' },
  { titulo: 'Envíos a todo el país', detalle: 'Correos CR y retiro en tienda' },
  { titulo: 'Pago 100% seguro', detalle: 'Múltiples métodos de pago' },
  { titulo: 'Calidad garantizada', detalle: 'Productos verificados' },
] as const

const CATEGORIAS = [
  { nombre: 'Tecnología', to: visitanteRuta('shop') },
  { nombre: 'Hogar', to: visitanteRuta('shop') },
  { nombre: 'Ropa', to: visitanteRuta('shop') },
  { nombre: 'Belleza', to: visitanteRuta('shop') },
] as const

/**
 * Index marketplace Visitante. Banner de carrito solo si hay items reales.
 */
export default function VisitanteIndexPage() {
  return (
    <main className="mx-auto max-w-md px-4 pb-8 pt-4">
      <CabeceraVisitante />
      <BannerRegreso />
      <BusquedaHero />
      <GrillaConfianza />
      <TarjetaDiscover />
      <GrillaCategorias />
    </main>
  )
}

function CabeceraVisitante() {
  return (
    <header className="mb-4 flex items-center justify-between gap-3">
      <Link to="/emprende" className="text-sm font-semibold text-hc-accent">Emprender</Link>
      <BrandLogo size={28} />
      <div className="flex gap-3 text-sm text-hc-muted">
        <Link to={visitanteRuta('shop')}>Buscar</Link>
        <Link to={visitanteRuta('notificaciones')}>Avisos</Link>
        <Link to={visitanteRuta('favoritos')}>Favoritos</Link>
        <Link to={visitanteRuta('carrito')}>Carrito</Link>
      </div>
    </header>
  )
}

function BannerRegreso() {
  const hayItems = useCartStore((s) => s.items.length > 0)
  if (!hayItems) return null
  return (
    <p className="mb-4 rounded-lg px-3 py-2 text-sm text-hc-text" style={{ background: 'var(--hc-red-50)' }}>
      ¡Volviste! Tenés productos en el carrito.{' '}
      <Link to={visitanteRuta('carrito')} className="font-semibold text-hc-accent">Ver carrito</Link>
    </p>
  )
}

function BusquedaHero() {
  return (
    <section className="mb-6">
      <h1 className="font-display text-2xl font-bold">¿Qué estás buscando hoy?</h1>
      <p className="mt-1 text-sm text-hc-muted">Escribí qué buscás en el catálogo.</p>
      <Link
        to={visitanteRuta('shop')}
        className="mt-3 flex min-h-11 items-center rounded-full border border-hc-border bg-hc-surface px-4 text-sm text-hc-muted"
      >
        Escribí qué buscás...
      </Link>
      <Link to="/productos?ai=1" className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-hc-accent">
        Preguntale al asistente
      </Link>
    </section>
  )
}

function GrillaConfianza() {
  return (
    <ul className="mb-6 grid grid-cols-2 gap-3">
      {CONFIANZA.map((item) => (
        <li key={item.titulo} className="rounded-lg bg-hc-surface p-3 text-sm">
          <p className="font-medium">{item.titulo}</p>
          <p className="text-hc-muted">{item.detalle}</p>
        </li>
      ))}
    </ul>
  )
}

function TarjetaDiscover() {
  return (
    <section className="mb-6 rounded-xl border border-hc-accent/30 p-4" style={{ background: 'var(--hc-blue-50)' }}>
      <p className="text-sm">¿No sabés qué buscar? Deslizá entre productos y encontrá lo que te gusta.</p>
      <Link to={visitanteRuta('discover')} className="mt-3 inline-flex min-h-11 items-center font-semibold text-hc-accent">
        Probar Discover
      </Link>
    </section>
  )
}

function GrillaCategorias() {
  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">Elegí una categoría</h2>
        <Link to={visitanteRuta('shop')} className="text-sm text-hc-accent">Ver catálogo completo</Link>
      </div>
      <ul className="grid grid-cols-2 gap-3">
        {CATEGORIAS.map((cat) => (
          <li key={cat.nombre}>
            <Link to={cat.to} className="block rounded-xl bg-hc-surface p-3">
              <p className="font-medium">{cat.nombre}</p>
              <p className="text-sm text-hc-muted">Ver productos</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
