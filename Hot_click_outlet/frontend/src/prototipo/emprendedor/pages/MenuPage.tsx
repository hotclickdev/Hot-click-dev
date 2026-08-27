import { Link } from 'react-router-dom'
import BrandLogo from '@/components/ui/BrandLogo'
import EnlacePrimario from '../ui/EnlacePrimario'
import { RUTA_EMPRENDEDOR } from '../constants'

const ACCIONES = [
  { to: `${RUTA_EMPRENDEDOR}/productos`, etiqueta: 'PRODUCTOS SUBIDOS' },
  { to: `${RUTA_EMPRENDEDOR}/reportes`, etiqueta: 'VER REPORTES' },
  { to: `${RUTA_EMPRENDEDOR}/opciones`, etiqueta: 'OPCIONES' },
] as const

/**
 * Paso 1 Menú Principal (Figma 3:2).
 */
export default function MenuPage() {
  return (
    <main className="flex min-h-[calc(100dvh-4rem)] flex-col items-center gap-2 px-6 pb-10 pt-16">
      <HeroMarca />
      {ACCIONES.map((accion) => (
        <Link
          key={accion.to}
          to={accion.to}
          className="flex h-[54px] w-full items-center justify-center rounded-[14px] border border-hc-border bg-hc-surface text-sm font-bold"
        >
          {accion.etiqueta}
        </Link>
      ))}
      <EnlacePrimario to="/pos" variante="oscuro">
        Abrí la Caja (POS)
      </EnlacePrimario>
      <Link
        to={`${RUTA_EMPRENDEDOR}/pedidos`}
        className="flex min-h-11 w-full items-center justify-center rounded-[14px] border border-hc-border py-4 text-sm font-bold"
      >
        Mirá los pedidos
      </Link>
    </main>
  )
}

function HeroMarca() {
  return (
    <div className="relative mb-4 flex w-full flex-col items-center pb-5 pt-10">
      <div
        className="pointer-events-none absolute top-8 size-28 rounded-full opacity-40"
        style={{ background: 'radial-gradient(circle, var(--hc-red-50), transparent 70%)' }}
        aria-hidden
      />
      <BrandLogo size={45} wordmarkSize={30} />
      <p className="mt-1 text-center text-[9px] font-medium tracking-[0.2em] text-hc-muted">
        OUTLET & MARKETPLACE
      </p>
    </div>
  )
}
