import BrandLogo from '@/components/ui/BrandLogo'
import { BadgePlan, Boton } from './ui'
import { useSellerPlan, useSellerRuta } from './SellerPlanContext'

/**
 * Menú principal PYME / Negocio Plus (Figma 61:128 / 62:303).
 */
export default function MenuPage() {
  const plan = useSellerPlan()
  const ruta = useSellerRuta()
  return (
    <main className="flex min-h-dvh flex-col items-center px-6 pb-8 pt-[90px]">
      <HeroMenu badge={plan.badge} />
      <div className="mt-12 flex w-full flex-col gap-3">
        <Boton variante="contorno" to={ruta('productos')}>PRODUCTOS SUBIDOS</Boton>
        <Boton variante="contorno" to={ruta('reportes')}>VER REPORTES</Boton>
        <Boton variante="contorno" to={ruta('opciones')}>OPCIONES</Boton>
        <Boton variante="oscuro" to={ruta('pos')}>Abrí la Caja (POS)</Boton>
        <Boton variante="contorno" to={ruta('pedidos')}>Mirá los pedidos</Boton>
      </div>
    </main>
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
        <BadgePlan texto={badge} />
      </div>
      <p className="mt-2 text-center text-[9px] font-medium tracking-[0.18em] text-hc-muted">
        OUTLET & MARKETPLACE
      </p>
    </div>
  )
}
