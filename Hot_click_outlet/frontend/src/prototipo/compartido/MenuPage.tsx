import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import BrandLogo from '@/components/ui/BrandLogo'
import useAuthStore from '@/store/authStore'
import { useEncargosPendientesCount } from '@/features/encargos/useEncargos'
import { Boton } from './ui'
import { useSellerPlan, useSellerRuta } from './SellerPlanContext'
import OnboardingPrimeraVez from './OnboardingPrimeraVez'
import EntradaPagina from './motion/EntradaPagina'
import { ListaStagger, ItemListaStagger } from './motion/ListaStagger'
import { EASE_PREMIUM } from './motion/formularioMotionTokens'

const ACCIONES = [
  { segmento: 'productos', titulo: 'PRODUCTOS SUBIDOS', detalle: 'Gestioná tu catálogo' },
  { segmento: 'encargos', titulo: 'ENCARGOS', detalle: 'Cotizá pedidos personalizados', conBadge: true },
  { segmento: 'recoleccion', titulo: 'RECOLECCIÓN Y ENTREGA', detalle: 'HOTCLICK recolecta y lleva a tu cliente' },
  { segmento: 'reportes', titulo: 'VER REPORTES', detalle: 'Ventas y estadísticas' },
  { segmento: 'opciones', titulo: 'OPCIONES', detalle: 'Configuración de tu tienda' },
] as const

/**
 * Menú principal PYME / Negocio Plus (Figma 305:229 / 305:636).
 */
export default function MenuPage() {
  const plan = useSellerPlan()
  const ruta = useSellerRuta()
  const userName = useAuthStore((s) => s.userName) ?? plan.usuario
  const { data: pendientesEncargos = 0 } = useEncargosPendientesCount()
  const esPlus = plan.id === 'negocioPlus'
  const accionesDesktop = esPlus
    ? [
        ...ACCIONES.slice(0, 3),
        { segmento: 'sucursales', titulo: 'MIS SUCURSALES', detalle: 'Ventas e inventario del grupo' },
        ...ACCIONES.slice(3),
      ]
    : [...ACCIONES]

  return (
    <>
      <main className="flex min-h-[calc(100dvh-4rem)] flex-col items-center px-6 pb-8 pt-[90px] md:hidden">
        <EntradaPagina className="flex w-full flex-col items-center">
          <HeroMenu badge={plan.badge} />
          <OnboardingPrimeraVez rol={plan.id} />
          <ListaStagger className="mt-12 flex w-full flex-col gap-3">
            <ItemMenu>
              <Boton variante="contorno" to={ruta('productos')} dataMm="seller-menu-productos">PRODUCTOS SUBIDOS</Boton>
            </ItemMenu>
            <ItemMenu>
              <Link
                to={ruta('encargos')}
                className="relative flex min-h-[52px] w-full items-center justify-center rounded-[10px] border border-hc-border bg-hc-surface px-5 text-[15px] font-bold text-hc-text"
              >
                ENCARGOS
                {pendientesEncargos > 0 ? (
                  <span className="absolute right-4 flex size-6 items-center justify-center rounded-full bg-hc-primary text-[11px] font-bold text-white">
                    {pendientesEncargos > 99 ? '99+' : pendientesEncargos}
                  </span>
                ) : null}
              </Link>
            </ItemMenu>
            <ItemMenu>
              <Boton variante="contorno" to={ruta('recoleccion')}>RECOLECCIÓN Y ENTREGA</Boton>
            </ItemMenu>
            <ItemMenu>
              <Boton variante="contorno" to={ruta('reportes')}>VER REPORTES</Boton>
            </ItemMenu>
            <ItemMenu>
              <Boton variante="contorno" to={ruta('opciones')}>OPCIONES</Boton>
            </ItemMenu>
            {esPlus ? (
              <ItemMenu>
                <Boton variante="contorno" to={ruta('sucursales')}>MIS SUCURSALES</Boton>
              </ItemMenu>
            ) : null}
            <ItemMenu>
              <Boton variante="oscuro" to="/admin/pos" dataMm="seller-menu-pos">Abrí la Caja (POS)</Boton>
            </ItemMenu>
            <ItemMenu>
              <Boton variante="contorno" to={ruta('pedidos')} dataMm="seller-menu-pedidos">Mirá los pedidos</Boton>
            </ItemMenu>
          </ListaStagger>
        </EntradaPagina>
      </main>

      <main className="hidden px-12 py-12 md:block">
        <EntradaPagina>
          <div className="mb-2">
            <span className="inline-flex rounded-[5px] bg-[var(--hc-danger-bg)] px-2.5 py-1 text-[10px] font-bold text-hc-primary">
              {plan.badge}
            </span>
          </div>
          <h1 className="font-display text-[30px] font-bold">Hola, {userName}</h1>
          <p className="mt-1 text-base text-hc-muted">Así va tu tienda hoy</p>
          <OnboardingPrimeraVez rol={plan.id} />
          <ListaStagger className={`mt-8 grid gap-6 ${esPlus ? 'grid-cols-2 xl:grid-cols-3' : 'grid-cols-2 lg:grid-cols-3'}`}>
            {accionesDesktop.map((accion) => (
              <ItemMenu key={accion.segmento}>
                <Link
                  to={ruta(accion.segmento)}
                  data-mm={accion.segmento === 'productos' ? 'seller-menu-productos' : undefined}
                  className="relative block rounded-xl border border-hc-border bg-hc-surface p-6 transition-colors hover:border-hc-primary"
                >
                  <p className="text-base font-bold">{accion.titulo}</p>
                  <p className="mt-2 text-[13px] text-hc-muted">{accion.detalle}</p>
                  {'conBadge' in accion && accion.conBadge && pendientesEncargos > 0 ? (
                    <span className="absolute right-4 top-4 flex size-6 items-center justify-center rounded-full bg-hc-primary text-[11px] font-bold text-white">
                      {pendientesEncargos > 99 ? '99+' : pendientesEncargos}
                    </span>
                  ) : null}
                </Link>
              </ItemMenu>
            ))}
          </ListaStagger>
          <ListaStagger className="mt-8 flex flex-wrap gap-5">
            <ItemMenu>
              <Link
                to="/admin/pos"
                data-mm="seller-menu-pos"
                className="flex min-h-[52px] min-w-[280px] items-center justify-center rounded-[10px] bg-hc-primary px-5 text-[15px] font-bold text-white"
              >
                Abrí la Caja (POS)
              </Link>
            </ItemMenu>
            <ItemMenu>
              <Link
                to={ruta('pedidos')}
                data-mm="seller-menu-pedidos"
                className="flex min-h-[52px] min-w-[280px] items-center justify-center rounded-[10px] border border-hc-border bg-hc-surface px-5 text-[15px] font-bold text-hc-text"
              >
                Mirá los pedidos
              </Link>
            </ItemMenu>
          </ListaStagger>
        </EntradaPagina>
      </main>
    </>
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

function HeroMenu({ badge }: { badge: string }) {
  return (
    <div className="relative flex w-full flex-col items-center">
      <div
        className="pointer-events-none absolute left-1/2 top-6 size-[120px] -translate-x-1/2 rounded-full opacity-70"
        style={{ background: 'radial-gradient(circle, var(--hc-red-50), transparent 70%)' }}
        aria-hidden
      />
      <BrandLogo size={45} wordmarkSize={30} />
      <div className="mt-2">
        <span className="inline-flex rounded-[5px] bg-[var(--hc-danger-bg)] px-2.5 py-1 text-[9px] font-bold text-hc-primary">
          {badge}
        </span>
      </div>
      <p className="mt-2 text-center text-[9px] font-medium tracking-[0.18em] text-hc-muted">
        OUTLET & MARKETPLACE
      </p>
    </div>
  )
}
