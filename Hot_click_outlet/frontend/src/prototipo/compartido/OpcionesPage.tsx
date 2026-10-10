import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { FilaOpcion } from './ui'
import { useSellerPlan, useSellerRuta } from './SellerPlanContext'
import useAuthStore from '@/store/authStore'
import useTenantStore from '@/store/tenantStore'
import FilaModoOscuro from './FilaModoOscuro'
import MmGuiaToggle from './MmGuiaToggle'
import EntradaPagina from './motion/EntradaPagina'
import { ListaStagger, ItemListaStagger } from './motion/ListaStagger'
import { EASE_PREMIUM } from './motion/formularioMotionTokens'

/**
 * Opciones de cuenta (Figma 61:467). Extra: Equipo vs Sucursales.
 */
export default function OpcionesPage() {
  const plan = useSellerPlan()
  const ruta = useSellerRuta()
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)
  const userName = useAuthStore((s) => s.userName) ?? plan.usuario
  const features = useTenantStore((s) => s.features)
  const planCargado = useTenantStore((s) => s.loaded)
  const hasFeature = useTenantStore((s) => s.hasFeature)
  const telegramBloqueado = planCargado && features.telegram === false
  const consultasBloqueadas = planCargado && !hasFeature('ai')
  const textoMejorar = 'Mejorar plan'

  function cerrarSesion() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <main className="px-5 pb-8 pt-[60px] md:px-12 md:py-12">
      <EntradaPagina>
        <h1 className="font-display text-[22px] font-bold text-hc-text md:text-[28px]">Opciones</h1>
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
        <div className="mt-3 md:hidden">
          <FilaModoOscuro />
        </div>
        <ListaStagger className="mt-4 md:max-w-[760px]">
          <ItemFila>
            <FilaOpcion to={ruta('perfil')} label="Editar perfil" />
          </ItemFila>
          <ItemFila>
            <FilaOpcion to={ruta('notificaciones')} label="Notificaciones" />
          </ItemFila>
          <ItemFila>
            <FilaOpcion to={ruta('cobro')} label="Métodos de cobro" />
          </ItemFila>
          <ItemFila>
            <FilaOpcion
              to={ruta('telegram')}
              label="Telegram"
              bloqueo={telegramBloqueado ? { to: ruta('plan'), texto: textoMejorar } : undefined}
            />
          </ItemFila>
          <ItemFila>
            <FilaOpcion to={ruta('ayuda')} label="Ayuda y soporte" />
          </ItemFila>
          <ItemFila>
            <FilaOpcion
              to={ruta('consultas')}
              label="Consultas con Hot"
              bloqueo={consultasBloqueadas ? { to: ruta('plan'), texto: textoMejorar } : undefined}
            />
          </ItemFila>
          <ItemFila>
            <FilaOpcion to={ruta(plan.extraOpcion.to)} label={plan.extraOpcion.label} />
          </ItemFila>
          {plan.extraOpcion.to !== 'equipo' ? (
            <ItemFila>
              <FilaOpcion to={ruta('equipo')} label="Mi equipo" />
            </ItemFila>
          ) : null}
          <ItemFila>
            <FilaOpcion to={ruta('bodegas')} label="Mis bodegas" />
          </ItemFila>
          <ItemFila>
            <FilaOpcion to={ruta('recoleccion')} label="Recolección y entrega" />
          </ItemFila>
          <ItemFila>
            <FilaOpcion to={ruta('negocio')} label="Datos de tu negocio" dataMm="seller-opciones-negocio" />
          </ItemFila>
          <ItemFila>
            <FilaOpcion to={ruta('plan')} label="Tu plan" />
          </ItemFila>
          <ItemFila>
            <FilaOpcion label="Cerrar sesión" peligro onClick={cerrarSesion} />
          </ItemFila>
        </ListaStagger>
      </EntradaPagina>
    </main>
  )
}

function ItemFila({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion() ?? false
  return (
    <ItemListaStagger>
      <motion.div
        whileHover={reduced ? undefined : { x: 3 }}
        whileTap={reduced ? undefined : { scale: 0.99 }}
        transition={{ duration: 0.18, ease: EASE_PREMIUM }}
      >
        {children}
      </motion.div>
    </ItemListaStagger>
  )
}
