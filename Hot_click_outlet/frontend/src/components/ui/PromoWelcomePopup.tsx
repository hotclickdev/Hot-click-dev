import { useState, useEffect, useCallback, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '@/services/api'
import PromoWelcomeForm, { type PromoWelcomeStatus } from '@/components/ui/promoWelcome/PromoWelcomeForm'
import PromoWelcomeSuccess from '@/components/ui/promoWelcome/PromoWelcomeSuccess'
import HojaInferior from '@/components/comprador/HojaInferior'
import { ICONOS_ESTADOS } from '@/components/comprador/estados/iconosEstados'
import { TITULO_HOJA } from '@/components/ui/sistema/estilosHoja'
import { debeMostrarPromo } from '@/components/ui/promoWelcome/promoWelcomeReglas'

const LS_KEY = 'hc-promo-seen'
const SS_PAGINAS = 'hc-paginas-sesion'
const DELAY_MS = 2000

function registrarPagina(): number {
  try {
    const paginas = Number(sessionStorage.getItem(SS_PAGINAS) ?? '0') + 1
    sessionStorage.setItem(SS_PAGINAS, String(paginas))
    return paginas
  } catch { return 0 }
}

function ultimaVezVisto(): number | null {
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? Number(raw) : null
  } catch { return null }
}

function markSeen() {
  try { localStorage.setItem(LS_KEY, String(Date.now())) } catch { /* noop */ }
}

function mensajeCupon(err: unknown): string {
  if (!err || typeof err !== 'object' || !('response' in err)) {
    return 'No se pudo generar el cupón'
  }
  const data = (err as { response?: { data?: { message?: unknown } | unknown } }).response?.data
  const desdeObjeto = data && typeof data === 'object' && 'message' in data
    ? (data as { message?: unknown }).message
    : undefined
  const msg = desdeObjeto || data || 'No se pudo generar el cupón'
  return typeof msg === 'string' ? msg : 'Ocurrió un error. Intenta de nuevo.'
}

export default function PromoWelcomePopup() {
  const { t } = useTranslation()
  const [visible, setVisible]   = useState(false)
  const [email, setEmail]       = useState('')
  const [status, setStatus]     = useState<PromoWelcomeStatus>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const navigate = useNavigate()
  const { pathname } = useLocation()

  useEffect(() => {
    const mostrar = debeMostrarPromo({
      paginasVistas: registrarPagina(),
      pathname,
      ultimaVezVisto: ultimaVezVisto(),
      ahora: Date.now(),
    })
    if (!mostrar) return
    const timer = setTimeout(() => setVisible(true), DELAY_MS)
    return () => clearTimeout(timer)
  }, [pathname])

  const dismiss = useCallback(() => {
    setVisible(false)
    markSeen()
  }, [])

  useEffect(() => {
    if (!visible) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') dismiss() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [visible, dismiss])

  const handleSubmit = useCallback(async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('loading')
    setErrorMsg('')
    try {
      await api.post('/cupones/solicitar', { email: email.trim() })
      setStatus('success')
      markSeen()
    } catch (err: unknown) {
      setErrorMsg(mensajeCupon(err))
      setStatus('error')
    }
  }, [email])

  return (
    <HojaInferior
      abierta={visible}
      onCerrar={dismiss}
      dejarVerPagina
      titulo={(
        <div className="flex items-center gap-2">
          <img src={ICONOS_ESTADOS.promoRegalo} alt="" width={24} height={24} className="block size-6 shrink-0" />
          <h2 className={TITULO_HOJA}>{status === 'success' ? t('promo.successTitle') : t('promo.title')}</h2>
        </div>
      )}
    >
      {status === 'success' ? (
        <PromoWelcomeSuccess dismiss={dismiss} navigate={navigate} />
      ) : (
        <PromoWelcomeForm
          email={email}
          setEmail={setEmail}
          status={status}
          errorMsg={errorMsg}
          setStatus={setStatus}
          setErrorMsg={setErrorMsg}
          handleSubmit={handleSubmit}
          dismiss={dismiss}
        />
      )}
    </HojaInferior>
  )
}
