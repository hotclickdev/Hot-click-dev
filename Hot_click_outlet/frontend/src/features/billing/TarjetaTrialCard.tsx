import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import useTenantStore from '@/store/tenantStore'
import useAuthStore from '@/store/authStore'
import { emprendeCupoService } from '@/services/emprendeCupoService'
import OnvoSuscripcionEmbed from './OnvoSuscripcionEmbed'
import { useTrialTarjeta } from './useTrialTarjeta'
import { debeConsultarTarjeta, formatoUsd, mostrarBotonAgregarTarjeta, vistaTarjetaTrial } from './trialTarjeta'

const ROLES_DUENO = new Set(['EMPRENDEDOR', 'ADMIN'])

/** Tarjeta de aviso (patrón «Aviso · compra en varios emprendimientos» de la plantilla Figma): fondo info, borde 1px, radio 14. */
const CARD = 'rounded-[14px] border p-5 space-y-3'
const BOTON = 'min-h-11 px-4 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60'

function Icono({ d }: { d: string }) {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={d} />
    </svg>
  )
}
const D_TARJETA = 'M3 10h18M5 6h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z'
const D_RELOJ = 'M12 8v4l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z'
const D_CHECK = 'M5 13l4 4L19 7'

/**
 * Trial Emprendedor: días que quedan y captura de la tarjeta con el SDK de ONVO. No cobra nada durante el trial;
 * el cobro mensual arranca recién cuando termina. Con PENDIENTE_CUPO (#419) solo avisa que se espera la aprobación.
 */
export default function TarjetaTrialCard() {
  const { t } = useTranslation()
  const estadoPlan = useTenantStore((s) => s.estadoPlan)
  const trialDias = useTenantStore((s) => s.trialDias)
  const loadTenantInfo = useTenantStore((s) => s.loadTenantInfo)
  const userRole = useAuthStore((s) => s.userRole)
  const esDueno = !!userRole && ROLES_DUENO.has(userRole)
  const [mensualidad, setMensualidad] = useState<string | null>(null)

  const tarjeta = useTrialTarjeta({
    activo: esDueno && debeConsultarTarjeta(estadoPlan),
    textos: { errorGenerico: t('trialTarjeta.errorGenerico'), errorIniciar: t('trialTarjeta.errorIniciar') },
  })

  useEffect(() => {
    if (!esDueno || estadoPlan !== 'TRIAL') return
    let vivo = true
    emprendeCupoService.get()
      .then(({ data }) => { if (vivo) setMensualidad(formatoUsd(data?.mensualidadUsdSinCupo)) })
      .catch(() => { /* sin monto: el texto no menciona precio, no se inventa */ })
    return () => { vivo = false }
  }, [esDueno, estadoPlan])

  const { alConfirmarTarjeta } = tarjeta
  const alExito = useCallback(() => { void alConfirmarTarjeta().then(() => loadTenantInfo()) }, [alConfirmarTarjeta, loadTenantInfo])

  if (!esDueno) return null
  const vista = vistaTarjetaTrial({
    estadoPlan, trialDias, estado: tarjeta.estado, cargando: tarjeta.cargando, errorVerificacion: tarjeta.errorVerificacion,
  })
  if (vista.tipo === 'oculta') return null

  const estiloInfo = { backgroundColor: 'var(--hc-info-bg)', borderColor: 'var(--hc-border)', color: 'var(--hc-text)' }
  const titulo = (txt: string) => (
    <h2 className="text-base font-semibold" style={{ fontFamily: 'var(--hc-font-display, inherit)', color: 'var(--hc-info)' }}>{txt}</h2>
  )

  if (vista.tipo === 'cargando') {
    return (
      <section className={CARD} style={estiloInfo} data-testid="trial-tarjeta" data-estado="cargando" aria-busy="true">
        <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>{t('trialTarjeta.cargando')}</p>
      </section>
    )
  }

  if (vista.tipo === 'espera_cupo') {
    return (
      <section className={CARD} style={estiloInfo} data-testid="trial-tarjeta" data-estado="espera_cupo">
        <div className="flex items-start gap-3">
          <span style={{ color: 'var(--hc-info)' }}><Icono d={D_RELOJ} /></span>
          <div className="space-y-1">
            {titulo(t('trialTarjeta.esperaCupo.titulo'))}
            <p className="text-sm">{t('trialTarjeta.esperaCupo.detalle')}</p>
          </div>
        </div>
      </section>
    )
  }

  if (vista.tipo === 'no_verificable') {
    return (
      <section className={CARD} style={estiloInfo} data-testid="trial-tarjeta" data-estado="no_verificable" role="alert">
        {titulo(t('trialTarjeta.titulo'))}
        <p className="text-sm">{t('trialTarjeta.noVerificable')}</p>
        <button type="button" onClick={() => { void tarjeta.recargar() }} className={BOTON}
          style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}>
          {t('trialTarjeta.reintentar')}
        </button>
      </section>
    )
  }

  const diasTxt = t('trialTarjeta.dias', { count: vista.dias })

  if (vista.tipo === 'guardada' || tarjeta.simulada) {
    return (
      <section className={CARD} data-testid="trial-tarjeta" data-estado={tarjeta.simulada ? 'simulada' : 'guardada'}
        style={{ backgroundColor: 'var(--hc-success-bg)', borderColor: 'var(--hc-border)', color: 'var(--hc-text)' }}>
        <div className="flex items-start gap-3">
          <span style={{ color: 'var(--hc-success-text)' }}><Icono d={D_CHECK} /></span>
          <div className="space-y-1">
            <h2 className="text-base font-semibold" style={{ color: 'var(--hc-success-text)' }}>
              {tarjeta.simulada ? t('trialTarjeta.simulada.titulo') : t('trialTarjeta.guardada.titulo')}
            </h2>
            <p className="text-sm">
              {tarjeta.simulada
                ? t('trialTarjeta.simulada.detalle')
                : t('trialTarjeta.guardada.detalle', { dias: diasTxt })}
            </p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className={CARD} style={estiloInfo} data-testid="trial-tarjeta" data-estado="agregar">
      <div className="flex items-start gap-3">
        <span style={{ color: 'var(--hc-info)' }}><Icono d={D_RELOJ} /></span>
        <div className="space-y-1">
          {titulo(t('trialTarjeta.titulo'))}
          <p className="text-sm" data-testid="trial-tarjeta-dias">{t('trialTarjeta.quedan', { dias: diasTxt })}</p>
          <p className="text-sm">
            {mensualidad
              ? t('trialTarjeta.sinCobroConMonto', { monto: mensualidad })
              : t('trialTarjeta.sinCobro')}
          </p>
        </div>
      </div>

      {tarjeta.confirmando && <p className="text-sm" role="status">{t('trialTarjeta.confirmando')}</p>}
      {tarjeta.sinConfirmar && !tarjeta.confirmando && (
        <div className="space-y-2" role="status">
          <p className="text-sm">{t('trialTarjeta.sinConfirmar')}</p>
          <button type="button" onClick={() => { void tarjeta.alConfirmarTarjeta() }} className={BOTON}
            style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}>
            {t('trialTarjeta.verificarDeNuevo')}
          </button>
        </div>
      )}
      {tarjeta.error && (
        <p className="text-sm" role="alert" style={{ color: 'var(--hc-danger)' }} data-testid="trial-tarjeta-error">{tarjeta.error}</p>
      )}

      {tarjeta.pago ? (
        <div className="space-y-3">
          <OnvoSuscripcionEmbed
            subscriptionId={tarjeta.pago.subscriptionId}
            customerId={tarjeta.pago.customerId}
            publishableKey={tarjeta.pago.publishableKey}
            etiquetaConfirmar={t('trialTarjeta.guardar')}
            onSuccess={alExito}
            onError={tarjeta.alFallarSdk}
          />
          <button type="button" onClick={tarjeta.cancelar} className="block mx-auto text-xs hover:underline"
            style={{ color: 'var(--hc-muted)' }}>
            {t('trialTarjeta.cancelar')}
          </button>
        </div>
      ) : (
        mostrarBotonAgregarTarjeta(vista) && !tarjeta.confirmando && (
          <button type="button" onClick={() => { void tarjeta.agregarTarjeta() }} disabled={tarjeta.iniciando}
            className={`hc-btn-primary ${BOTON} inline-flex items-center gap-2 border`}
            data-testid="trial-tarjeta-agregar">
            <Icono d={D_TARJETA} />
            {tarjeta.iniciando ? t('trialTarjeta.preparando') : t('trialTarjeta.agregar')}
          </button>
        )
      )}
    </section>
  )
}
