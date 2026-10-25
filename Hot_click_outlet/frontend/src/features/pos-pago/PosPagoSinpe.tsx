import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { posService, type SinpeOnvoQrDatos } from '@/services/posService'
import { formatPrice } from '@/utils/format'
import { identificacionSinpeValida, sinpeNumeroVisible, TIPOS_IDENTIFICACION } from './posPagoFormat'
import type { QrPagoInfo } from './posPagoTypes'
import PosPagoReporteModal from './PosPagoReporteModal'
import { ICONOS_QR } from '@/features/qr-negocio/iconosQr'

type Props = Readonly<{
  info: QrPagoInfo
  token?: string
  onPagado: () => void
}>

/**
 * SINPE Móvil del QR de caja por ONVO (Figma `29:1830`). El cliente da su identificación y tipo; el
 * backend crea y confirma el intent ANTES de que transfiera y devuelve el destino ONVO y el monto exacto.
 * El pago se confirma solo (polling al backend, que relee el intent en ONVO).
 */
export default function PosPagoSinpe({ token, onPagado }: Props) {
  const { t } = useTranslation()
  const [cedula, setCedula] = useState('')
  const [tipo, setTipo] = useState<number>(1)
  const [enviando, setEnviando] = useState(false)
  const [datos, setDatos] = useState<SinpeOnvoQrDatos | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reporteAbierto, setReporteAbierto] = useState(false)

  useEffect(() => {
    if (!datos || !token) return
    const id = window.setInterval(async () => {
      try {
        const res = await posService.estadoQrSesion(token) as { estado?: string }
        if (res?.estado === 'PAGADO') onPagado()
      } catch {
        /* siguiente tick */
      }
    }, 2500)
    return () => window.clearInterval(id)
  }, [datos, token, onPagado])

  const obtenerDatos = async () => {
    if (!token) return
    setEnviando(true)
    setError(null)
    try {
      const d = await posService.iniciarSinpeOnvoQr(token, cedula.trim(), tipo)
      // Fail-closed: sin destino o sin monto no se muestran datos para transferir.
      if (!d?.destino || !d?.monto) throw new Error('sin_datos')
      setDatos(d)
    } catch (e) {
      const status = (e as { response?: { status?: number } })?.response?.status
      setError(t(status === 503 ? 'pos.pago.sinpeNoDisponible' : 'pos.pago.errorSinpeDesc'))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <section className="flex flex-col gap-3 px-4 pb-3 pt-[18px]">
      <h1 className="font-display text-[20px] font-bold leading-[25px] tracking-normal text-hc-n-900">
        {t('pos.pago.sinpeTitulo')}
      </h1>

      {datos ? (
        <ol className="flex flex-col gap-[14px] rounded-[16px] border border-hc-n-200 bg-hc-n-0 p-4">
          <Paso numero={1}>
            <p className="text-[14px] leading-[16px] text-hc-n-600">
              {t('pos.pago.sinpePaso1', { monto: formatPrice(datos.monto) })}
            </p>
            <ValorCopiable valor={sinpeNumeroVisible(datos.destino)} />
            <p className="text-[12px] leading-[14px] text-hc-n-600">{t('pos.pago.sinpePaso1Nota')}</p>
          </Paso>
          <Paso numero={2}>
            <p className="text-[14px] leading-[16px] text-hc-n-600">{t('pos.pago.sinpePaso2')}</p>
          </Paso>
          <Paso numero={3}>
            <p className="text-[14px] leading-[16px] text-hc-n-600">{t('pos.pago.sinpePaso3')}</p>
          </Paso>
        </ol>
      ) : (
        <form
          className="flex flex-col gap-3 rounded-[14px] border border-hc-n-200 bg-hc-n-0 p-4"
          onSubmit={(e) => {
            e.preventDefault()
            void obtenerDatos()
          }}
        >
          <p className="text-[13px] leading-[18px] text-hc-n-600">{t('pos.pago.sinpeDniIntro')}</p>
          <div className="flex flex-col gap-1">
            <label htmlFor="pos-sinpe-tipo" className="text-[12px] leading-[14px] text-hc-n-600">
              {t('pos.pago.sinpeTipoId')}
            </label>
            <select
              id="pos-sinpe-tipo"
              value={tipo}
              onChange={(e) => setTipo(Number(e.target.value))}
              className="w-full rounded-[12px] border border-hc-n-200 bg-hc-n-50 px-3 py-[10px] text-[14px] text-hc-n-900"
            >
              {TIPOS_IDENTIFICACION.map((o) => (
                <option key={o.valor} value={o.valor}>{t(o.clave)}</option>
              ))}
            </select>
          </div>
          <Campo
            id="pos-sinpe-cedula"
            label={t('pos.pago.sinpeCedula')}
            value={cedula}
            onChange={setCedula}
          />
          <p className="text-[12px] leading-[14px] text-hc-n-600">{t('pos.pago.sinpeCedulaAyuda')}</p>
          {error ? <p className="text-[13px] text-hc-red-600">{error}</p> : null}
          <button
            type="submit"
            disabled={enviando || !identificacionSinpeValida(cedula)}
            className="hc-btn-primary min-h-[46px] w-full rounded-[12px] px-4 py-[14px] text-[15px] font-semibold leading-[18px] text-white disabled:opacity-40"
          >
            {enviando ? t('pos.cobro.procesando') : t('pos.pago.sinpeRegistrar')}
          </button>
        </form>
      )}

      {datos ? (
        <output className="flex flex-col gap-1 rounded-[16px] bg-hc-warning-bg p-4">
          <span className="flex items-center gap-2 text-[14px] font-semibold leading-4 text-hc-warning">
            <img src={ICONOS_QR.esperando} alt="" className="size-4" />
            {t('pos.pago.esperandoTitulo')}
          </span>
          <span className="text-[12px] leading-[17px] text-hc-n-600">{t('pos.pago.esperandoDesc')}</span>
        </output>
      ) : null}

      <button
        type="button"
        onClick={() => setReporteAbierto(true)}
        className="min-h-11 w-full rounded-[12px] border border-hc-n-200 bg-hc-n-0 px-4 py-3 text-[14px] font-semibold text-hc-n-900"
      >
        {t('pos.pago.reportarError')}
      </button>
      <PosPagoReporteModal
        open={reporteAbierto}
        onClose={() => setReporteAbierto(false)}
        token={token}
        codigoError="sinpe"
      />
    </section>
  )
}

function Paso({ numero, children }: Readonly<{ numero: number; children: React.ReactNode }>) {
  return (
    <li className="flex items-start gap-3">
      <span
        aria-hidden="true"
        className="grid size-[26px] shrink-0 place-items-center rounded-full bg-hc-blue-600 text-[12px] font-bold text-white"
      >
        {numero}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">{children}</div>
    </li>
  )
}

function ValorCopiable({ valor }: Readonly<{ valor: string }>) {
  const { t } = useTranslation()
  const [copiado, setCopiado] = useState(false)

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(valor)
      setCopiado(true)
      window.setTimeout(() => setCopiado(false), 2000)
    } catch {
      /* sin permiso de portapapeles: el valor sigue visible para copiarlo a mano */
    }
  }

  return (
    <div className="flex items-center gap-[10px]">
      <span className="font-display text-[20px] font-bold leading-[25px] text-hc-n-900">{valor}</span>
      <button
        type="button"
        onClick={() => void copiar()}
        className="flex items-center gap-1 rounded-[8px] bg-hc-blue-50 px-2 py-1 text-[12px] font-semibold leading-[14px] text-hc-blue-600"
      >
        <img src={ICONOS_QR.copiar} alt="" className="size-[13px]" />
        {copiado ? t('pos.pago.copiado') : t('pos.pago.copiar')}
      </button>
    </div>
  )
}

type CampoProps = Readonly<{
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  inputMode?: 'numeric' | 'tel' | 'text'
}>

function Campo({ id, label, value, onChange, inputMode }: CampoProps) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-[12px] leading-[14px] text-hc-n-600">
        {label}
      </label>
      <input
        id={id}
        value={value}
        inputMode={inputMode}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-[12px] border border-hc-n-200 bg-hc-n-50 px-3 py-[10px] text-[14px] text-hc-n-900"
      />
    </div>
  )
}
