import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useTenantStore from '@/store/tenantStore'
import useAuthStore from '@/store/authStore'
import { useTranslation } from 'react-i18next'
import api from '@/services/api'
import { esperandoCupo } from '@/services/emprendeCupoService'
import { useTrialTarjeta } from '@/features/billing/useTrialTarjeta'
import { mostrarBotonAgregarTarjeta, vistaTarjetaTrial } from '@/features/billing/trialTarjeta'

const BANNER_ROLES = new Set(['EMPRENDEDOR', 'ADMIN'])
const PLAN_PRUEBA_CERRADA = 'PRUEBA_CERRADA'

/**
 * Banner de trial / plan vencido / prueba QA cerrada.
 * Se muestra en AdminLayout cuando:
 *   - estadoPlan === 'TRIAL' y quedan ≤ 7 días
 *   - estadoPlan === 'VENCIDO' o 'PAST_DUE'
 *   - estadoPlan === 'PRUEBA_CERRADA' (pide autorización)
 *   - estadoPlan === 'PENDIENTE_CUPO' (esperando que aprueben el cupo Emprendedor)
 * En TRIAL con pocos días ofrece «Agregar tarjeta» mientras no haya tarjeta guardada.
 * Solo visible para roles EMPRENDEDOR y ADMIN.
 */
export default function TrialBanner() {
  const { estadoPlan, trialDias, planNombre, estadoEmpresa, loadTenantInfo } = useTenantStore()
  const userRole = useAuthStore((s) => s.userRole)
  const navigate = useNavigate()
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const { t } = useTranslation()
  const esDueno = !!userRole && BANNER_ROLES.has(userRole)
  // Solo consulta la tarjeta cuando el banner de trial puede mostrarse (TRIAL con ≤ 7 días).
  const tarjeta = useTrialTarjeta({
    activo: esDueno && estadoPlan === 'TRIAL' && trialDias >= 0 && trialDias <= 7,
    textos: { errorGenerico: t('trialTarjeta.errorGenerico'), errorIniciar: t('trialTarjeta.errorIniciar') },
  })
  const vistaTarjeta = vistaTarjetaTrial({
    estadoPlan, trialDias, estado: tarjeta.estado, cargando: tarjeta.cargando, errorVerificacion: tarjeta.errorVerificacion,
  })

  if (!userRole || !BANNER_ROLES.has(userRole)) return null

  const esVencido  = estadoPlan === 'VENCIDO' || estadoPlan === 'PAST_DUE'
  const esTrial    = estadoPlan === 'TRIAL'
  const pocosTrial = esTrial && trialDias >= 0 && trialDias <= 7
  const requiereMembresia = estadoPlan === 'REQUIERE_MEMBRESIA'
  const pruebaCerrada = estadoPlan === PLAN_PRUEBA_CERRADA
  const autorizacionPedida = pruebaCerrada && estadoEmpresa === 'PENDIENTE_APROBACION'

  const esperaCupo = esperandoCupo(estadoPlan)

  if (!esVencido && !pocosTrial && !requiereMembresia && !pruebaCerrada && !esperaCupo) return null

  const bg      = esVencido || pruebaCerrada ? '#7f1d1d' : '#78350f'
  const border  = esVencido || pruebaCerrada ? '#b91c1c' : '#d97706'
  const accent  = esVencido || pruebaCerrada ? '#fca5a5' : '#fde68a'
  const mensaje = esperaCupo ? t('trialTarjeta.banner.esperaCupo') : textoBanner({
    requiereMembresia, estadoPlan, esVencido, pruebaCerrada, autorizacionPedida, planNombre, trialDias,
  })

  async function pedirAutorizacion() {
    setEnviando(true)
    setError('')
    try {
      await api.post('/tenant/solicitar-autorizacion')
      await loadTenantInfo()
    } catch {
      setError('No se pudo enviar la solicitud. Intentá de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div
      className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
      style={{ backgroundColor: bg, borderBottom: `1px solid ${border}` }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <svg className="w-4 h-4 shrink-0" style={{ color: accent }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <span style={{ color: '#fff' }} className="truncate">
          {error || mensaje}
        </span>
      </div>
      {pruebaCerrada ? (
        <button type="button"
          disabled={autorizacionPedida || enviando}
          onClick={() => { void pedirAutorizacion() }}
          className="shrink-0 px-3 py-1 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-60"
          style={{ backgroundColor: accent, color: '#1a1a1a' }}
        >
          {autorizacionPedida ? 'Autorización pedida' : 'Pedir autorización'}
        </button>
      ) : esperaCupo ? (
        <button type="button"
          onClick={() => navigate('/admin/billing/planes')}
          className="shrink-0 px-3 py-1 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80"
          style={{ backgroundColor: accent, color: '#1a1a1a' }}
        >
          {t('trialTarjeta.banner.verEstado')}
        </button>
      ) : (
        <button type="button"
          onClick={() => navigate('/admin/billing/planes')}
          className="shrink-0 px-3 py-1 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80"
          style={{ backgroundColor: accent, color: '#1a1a1a' }}
        >
          {estadoPlan === 'PAST_DUE'
            ? 'Actualizar pago'
            : mostrarBotonAgregarTarjeta(vistaTarjeta) ? t('trialTarjeta.agregar') : 'Ver planes'}
        </button>
      )}
    </div>
  )
}

function textoBanner(args: {
  requiereMembresia: boolean
  estadoPlan: string
  esVencido: boolean
  pruebaCerrada: boolean
  autorizacionPedida: boolean
  planNombre: string
  trialDias: number
}) {
  if (args.autorizacionPedida) {
    return 'Pediste autorización. Un administrador tiene que aprobarla para reabrir la cuenta.'
  }
  if (args.pruebaCerrada) {
    return 'La prueba de un mes cerró. Pedí autorización para seguir usando el negocio.'
  }
  if (args.requiereMembresia) {
    return 'Se agotaron los cupos del período gratis. Activá PYME o Negocio Plus para publicar en el catálogo.'
  }
  if (args.estadoPlan === 'PAST_DUE') {
    return 'Pago pendiente — actualiza tu método de pago para continuar usando el plan'
  }
  if (args.esVencido) {
    return `Tu trial de ${args.planNombre} ha vencido. Suscríbete para seguir usando todas las funciones.`
  }
  if (args.trialDias === 0) {
    return 'Tu trial vence hoy. Suscríbete ahora para no perder el acceso.'
  }
  return `Trial activo — te quedan ${args.trialDias} día${args.trialDias === 1 ? '' : 's'}.`
}
