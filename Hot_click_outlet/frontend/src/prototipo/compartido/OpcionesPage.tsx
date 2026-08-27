import { FilaOpcion } from './ui'
import { useSellerPlan, useSellerRuta } from './SellerPlanContext'

/**
 * Opciones de cuenta (Figma 61:467). Extra: Equipo vs Sucursales.
 */
export default function OpcionesPage() {
  const plan = useSellerPlan()
  const ruta = useSellerRuta()
  return (
    <main className="px-5 pb-8 pt-[60px]">
      <h1 className="font-display text-[22px] font-bold">Opciones</h1>
      <p className="mt-0.5 text-xs text-hc-muted">Configuración de tu cuenta</p>
      <div className="mt-6 flex items-center gap-3 rounded-[14px] bg-hc-surface-2 p-3.5">
        <div className="flex size-11 items-center justify-center rounded-full bg-hc-primary text-base font-bold text-white">Q</div>
        <div>
          <p className="text-sm font-medium">{plan.usuario}</p>
          <p className="text-[11px] text-hc-muted">{plan.planLabel}</p>
        </div>
      </div>
      <div className="mt-6">
        <FilaOpcion to={ruta('perfil')} label="Editar perfil" />
        <FilaOpcion to={ruta('notificaciones')} label="Notificaciones" />
        <FilaOpcion to={ruta('cobro')} label="Métodos de cobro" />
        <FilaOpcion to={ruta('ayuda')} label="Ayuda y soporte" />
        <FilaOpcion to={ruta('consultas')} label="Consultas con Hot" />
        <FilaOpcion to={ruta(plan.extraOpcion.to)} label={plan.extraOpcion.label} />
        <FilaOpcion to={ruta('bodegas')} label="Mis bodegas" />
        <FilaOpcion to={ruta('negocio')} label="Datos de tu negocio" />
        <FilaOpcion to={ruta('plan')} label="Tu plan" />
        <FilaOpcion to={ruta('login')} label="Cerrar sesión" peligro />
      </div>
    </main>
  )
}
