import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { billingService } from '@/services/billingService'
import { CLAVE_RUTA_EXITO_PLAN } from '@/features/billing/useCambiarPlan'
import useTenantStore from '@/store/tenantStore'

/** Retorno del SDK Tilopay para mensualidades: el backend confirma con Tilopay antes de activar. */
export default function SuscripcionTilopayRespuestaPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { search } = useLocation()
  const loadTenantInfo = useTenantStore((s) => s.loadTenantInfo)
  const ran = useRef(false)
  const [fallo, setFallo] = useState(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true
    const order = new URLSearchParams(search).get('order')
    void (async () => {
      try {
        if (!order) throw new Error('sin orden')
        const { data } = await billingService.confirmarCobroTilopay(order)
        if (data.estado !== 'ACTIVO') throw new Error('no confirmado')
        await loadTenantInfo()
        const destino = sessionStorage.getItem(CLAVE_RUTA_EXITO_PLAN) || '/admin'
        sessionStorage.removeItem(CLAVE_RUTA_EXITO_PLAN)
        navigate(destino, { replace: true })
      } catch {
        setFallo(true)
      }
    })()
  }, [search, navigate, loadTenantInfo])

  return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center">
      {fallo ? (
        <>
          <p className="text-sm text-hc-muted mb-4">{t('billing.tilopayNoConfirmado')}</p>
          <button type="button" className="text-sm underline" onClick={() => navigate('/planes')}>
            {t('billing.volverPlanes')}
          </button>
        </>
      ) : (
        <>
          <div className="inline-block w-10 h-10 rounded-full border-2 border-t-transparent animate-spin mb-4 border-hc-accent" />
          <p className="text-sm text-hc-muted">{t('billing.tilopayConfirmando')}</p>
        </>
      )}
    </div>
  )
}
