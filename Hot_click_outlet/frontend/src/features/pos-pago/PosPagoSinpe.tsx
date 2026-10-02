import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ICONOS_QR } from '@/features/qr-negocio/iconosQr'
import { posService } from '@/services/posService'
import { formatPrice } from '@/utils/format'
import { sinpeNumeroVisible } from './posPagoFormat'
import type { QrPagoInfo } from './posPagoTypes'
import PosPagoReporteModal from './PosPagoReporteModal'

type Props = Readonly<{
  info: QrPagoInfo
  token?: string
  onPagado: () => void
}>

const NUMERO_SINPE_POR_DEFECTO = '+506 7019-6686'

/** SINPE en curso (Figma `29:1830`): pasos con número y referencia, registro del pago y espera. */
export default function PosPagoSinpe({ info, token, onPagado }: Props) {
  const { t } = useTranslation()
  const [nombre, setNombre] = useState('')
  const [cedula, setCedula] = useState('')
  const [telefono, setTelefono] = useState('')
  const [formAbierto, setFormAbierto] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [esperando, setEsperando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reporteAbierto, setReporteAbierto] = useState(false)

  useEffect(() => {
    if (!esperando || !token) return
    const id = window.setInterval(async () => {
      try {
        const res = await posService.estadoQrSesion(token) as { estado?: string }
        if (res?.estado === 'PAGADO') onPagado()
      } catch {
        /* siguiente tick */
      }
    }, 2500)
    return () => window.clearInterval(id)
  }, [esperando, token, onPagado])

  const enviar = async () => {
    if (!token) return
    setEnviando(true)
    setError(null)
    try {
      await posService.iniciarSinpeOnvoQr(token, { nombre, cedula, telefono })
      setEsperando(true)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(typeof msg === 'string' ? msg : t('pos.pago.errorSinpeDesc'))
    } finally {
      setEnviando(false)
    }
  }

  const numero = sinpeNumeroVisible(info.sinpeNumero || NUMERO_SINPE_POR_DEFECTO)
  const referencia = info.sinpeRef
  const pasoRegistro = referencia ? 3 : 2

  return (
    <section className="flex flex-col gap-3 px-4 pb-3 pt-[18px]">
      <h1 className="font-display text-[20px] font-bold leading-[25px] tracking-normal text-hc-n-900">
        {t('pos.pago.sinpeTitulo')}
      </h1>

      <ol className="flex flex-col gap-[14px] rounded-[16px] border border-hc-n-200 bg-hc-n-0 p-4">
        <Paso numero={1}>
          <p className="text-[14px] leading-[16px] text-hc-n-600">
            {t('pos.pago.sinpePaso1', { monto: formatPrice(info.total ?? 0) })}
          </p>
          <ValorCopiable valor={numero} />
          <p className="text-[12px] leading-[14px] text-hc-n-600">{t('pos.pago.sinpePaso1Nota')}</p>
        </Paso>
        {referencia ? (
          <Paso numero={2}>
            <p className="text-[14px] leading-[16px] text-hc-n-600">{t('pos.pago.sinpePaso2')}</p>
            <ValorCopiable valor={referencia} />
          </Paso>
        ) : null}
        <Paso numero={pasoRegistro}>
          <p className="text-[14px] leading-[16px] text-hc-n-600">{t('pos.pago.sinpePaso3')}</p>
        </Paso>
      </ol>

      {esperando ? null : formAbierto ? (
        <form
          className="flex flex-col gap-3 rounded-[14px] border border-hc-n-200 bg-hc-n-0 p-4"
          onSubmit={(e) => {
            e.preventDefault()
            void enviar()
          }}
        >
          <Campo id="pos-sinpe-nombre" label={t('pos.pago.sinpeNombre')} value={nombre} onChange={setNombre} />
          <Campo
            id="pos-sinpe-cedula"
            label={t('pos.pago.sinpeCedula')}
            value={cedula}
            onChange={setCedula}
            inputMode="numeric"
          />
          <Campo
            id="pos-sinpe-tel"
            label={t('pos.pago.sinpeTelefono')}
            value={telefono}
            onChange={setTelefono}
            inputMode="tel"
          />
          {error ? <p className="text-[13px] text-hc-red-600">{error}</p> : null}
          <button
            type="submit"
            disabled={enviando || !nombre.trim() || !cedula.trim() || !telefono.trim()}
            className="hc-btn-primary min-h-[46px] w-full rounded-[12px] px-4 py-[14px] text-[15px] font-semibold leading-[18px] text-white disabled:opacity-40"
          >
            {enviando ? t('pos.cobro.procesando') : t('pos.pago.sinpeRegistrar')}
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setFormAbierto(true)}
          className="flex w-full flex-col items-center gap-[6px] rounded-[14px] border border-dashed border-hc-n-400 bg-hc-n-0 py-[22px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hc-focus-ring"
        >
          <img src={ICONOS_QR.subir} alt="" className="size-6" />
          <span className="text-[14px] font-semibold leading-4 text-hc-blue-600">
            {t('pos.pago.registrarPago')}
          </span>
          <span className="text-[12px] leading-[14px] text-hc-n-600">{t('pos.pago.registrarPagoDesc')}</span>
        </button>
      )}

      <output className="flex flex-col gap-1 rounded-[16px] bg-hc-warning-bg p-4">
        <span className="flex items-center gap-2 text-[14px] font-semibold leading-4 text-hc-warning">
          <img src={ICONOS_QR.esperando} alt="" className="size-4" />
          {t('pos.pago.esperandoTitulo')}
        </span>
        <span className="text-[12px] leading-[17px] text-hc-n-600">{t('pos.pago.esperandoDesc')}</span>
      </output>

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
  inputMode?: 'numeric' | 'tel'
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
