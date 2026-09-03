import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import BrandLogo from '@/components/ui/BrandLogo'
import EnlacePrimario from '../ui/EnlacePrimario'
import { RUTA_EMPRENDEDOR } from '../constants'
import NegocioPertenenciaChip from '@/prototipo/compartido/NegocioPertenenciaChip'
import OnboardingPrimeraVez from '@/prototipo/compartido/OnboardingPrimeraVez'
import { useEncargosPendientesCount } from '@/features/encargos/useEncargos'
import EntradaPagina from '@/prototipo/compartido/motion/EntradaPagina'
import { ListaStagger, ItemListaStagger } from '@/prototipo/compartido/motion/ListaStagger'
import { EASE_PREMIUM } from '@/prototipo/compartido/motion/formularioMotionTokens'

const ACCIONES_BASE = [
  { to: `${RUTA_EMPRENDEDOR}/productos`, etiqueta: 'PRODUCTOS SUBIDOS' },
  { to: `${RUTA_EMPRENDEDOR}/encargos`, etiqueta: 'ENCARGOS', conBadge: true },
  { to: `${RUTA_EMPRENDEDOR}/recoleccion`, etiqueta: 'RECOLECCIÓN Y ENTREGA' },
  { to: `${RUTA_EMPRENDEDOR}/reportes`, etiqueta: 'VER REPORTES' },
  { to: `${RUTA_EMPRENDEDOR}/opciones`, etiqueta: 'OPCIONES' },
] as const

/**
 * Paso 1 Menú Principal (Figma 3:2).
 */
export default function MenuPage() {
  const { data: pendientesEncargos = 0 } = useEncargosPendientesCount()

  return (
    <main className="flex min-h-[calc(100dvh-4rem)] flex-col items-center gap-2 px-6 pb-10 pt-16 md:max-w-[480px] md:items-stretch md:px-16 md:py-12">
      <EntradaPagina className="flex w-full flex-col items-center gap-2 md:items-stretch">
        <HeroMarca />
        <OnboardingPrimeraVez rol="emprendedor" />
        <ListaStagger className="flex w-full flex-col gap-2">
          {ACCIONES_BASE.map((accion) => (
            <ItemMenu key={accion.to}>
              <Link
                to={accion.to}
                data-mm={accion.to.includes('/productos') ? 'seller-menu-productos' : undefined}
                className="relative flex h-[54px] w-full items-center justify-center rounded-[14px] border border-hc-border bg-hc-surface text-sm font-bold"
              >
                {accion.etiqueta}
                {'conBadge' in accion && accion.conBadge && pendientesEncargos > 0 ? (
                  <span className="absolute right-4 flex size-6 items-center justify-center rounded-full bg-hc-primary text-[11px] font-bold text-white">
                    {pendientesEncargos > 99 ? '99+' : pendientesEncargos}
                  </span>
                ) : null}
              </Link>
            </ItemMenu>
          ))}
          <ItemMenu>
            <EnlacePrimario to="/admin/pos" variante="oscuro" dataMm="seller-menu-pos">
              Abrí la Caja (POS)
            </EnlacePrimario>
          </ItemMenu>
          <ItemMenu>
            <Link
              to={`${RUTA_EMPRENDEDOR}/pedidos`}
              data-mm="seller-menu-pedidos"
              className="flex min-h-11 w-full items-center justify-center rounded-[14px] border border-hc-border py-4 text-sm font-bold"
            >
              Mirá los pedidos
            </Link>
          </ItemMenu>
        </ListaStagger>
      </EntradaPagina>
    </main>
  )
}

function ItemMenu({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion() ?? false
  return (
    <ItemListaStagger className="w-full">
      <motion.div
        className="w-full"
        whileHover={reduced ? undefined : { y: -2 }}
        whileTap={reduced ? undefined : { scale: 0.98 }}
        transition={{ duration: 0.18, ease: EASE_PREMIUM }}
      >
        {children}
      </motion.div>
    </ItemListaStagger>
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
      <div className="mt-3 hidden w-full max-w-xs md:block">
        <NegocioPertenenciaChip variante="card" />
      </div>
    </div>
  )
}
