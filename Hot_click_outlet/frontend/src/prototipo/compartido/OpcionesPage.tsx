import { useNavigate } from 'react-router-dom'
import { FilaOpcion } from './ui'
import { useSellerPlan, useSellerRuta } from './SellerPlanContext'
import useAuthStore from '@/store/authStore'
import MmGuiaToggle from './MmGuiaToggle'

/**
 * Opciones de cuenta (Figma 61:467). Extra: Equipo vs Sucursales.
 */
export default function OpcionesPage() {
  const plan = useSellerPlan()
  const ruta = useSellerRuta()
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)
  const userName = useAuthStore((s) => s.userName) ?? plan.usuario

  function cerrarSesion() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <main className="px-5 pb-8 pt-[60px] md:px-12 md:py-12">
      <h1 className="font-display text-[22px] font-bold md:text-[28px]">Opciones</h1>
      <p className="mt-0.5 text-xs text-hc-muted md:text-sm">Configuración de tu cuenta</p>
      <div className="mt-6 flex items-center gap-3 rounded-[14px] bg-hc-surface-2 p-3.5 md:max-w-[760px]">
        <div className="flex size-11 items-center justify-center rounded-full bg-hc-primary text-base font-bold text-white">
          {userName.slice(0, 1).toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-medium">{userName}</p>
          <p className="text-[11px] text-hc-muted">{plan.planLabel}</p>
        </div>
      </div>
      <div className="mt-6 md:max-w-[760px]">
        <MmGuiaToggle />
      </div>
      <div className="mt-4 md:max-w-[760px]">
        <FilaOpcion to={ruta('perfil')} label="Editar perfil" />
        <FilaOpcion to={ruta('notificaciones')} label="Notificaciones" />
        <FilaOpcion to={ruta('cobro')} label="Métodos de cobro" />
        <FilaOpcion to={ruta('ayuda')} label="Ayuda y soporte" />
        <FilaOpcion to={ruta('consultas')} label="Consultas con Hot" />
        <FilaOpcion to={ruta(plan.extraOpcion.to)} label={plan.extraOpcion.label} />
        <FilaOpcion to={ruta('bodegas')} label="Mis bodegas" />
        <FilaOpcion to={ruta('negocio')} label="Datos de tu negocio" dataMm="seller-opciones-negocio" />
        <FilaOpcion to={ruta('plan')} label="Tu plan" />
        <FilaOpcion label="Cerrar sesión" peligro onClick={cerrarSesion} />
      </div>
    </main>
  )
}
