import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { posService } from '@/services/posService'
import { formatColones } from './posPagoFormat'
import type { QrPagoInfo } from './posPagoTypes'
import PosPagoReporteModal from './PosPagoReporteModal'

type Props = Readonly<{
  info: QrPagoInfo
  token?: string
  onPagado: () => void
}>

export default function PosPagoSinpe({ info, token, onPagado }: Props) {
  const { t } = useTranslation()
  const [nombre, setNombre] = useState('')
  const [cedula, setCedula] = useState('')
  const [telefono, setTelefono] = useState('')
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

  const filas = [
    { label: t('pos.qr.sinpeA'), value: info.sinpeNumero || '+506 7019-6686' },
    { label: t('pos.qr.montoExacto'), value: `₡${formatColones(info.total)}` },
  ]

  return (
    <div
      className="w-full max-w-md mx-auto rounded-[22px] border p-5 space-y-3 shadow-[var(--hc-shadow-2)]"
      style={{ borderColor: 'var(--hc-border)', background: 'var(--hc-surface)' }}
    >
      <h2 className="font-display font-bold text-[var(--hc-text)]">
        {t('pos.pago.sinpeTitulo')}
      </h2>
      <p className="text-sm text-[var(--hc-muted)]">{t('pos.pago.sinpeInstruccion')}</p>
      {filas.map((fila) => (
        <div key={fila.label} className="flex justify-between gap-3 text-sm">
          <span className="text-[var(--hc-muted)]">{fila.label}</span>
          <span className="font-semibold text-[var(--hc-text)] text-right">{fila.value}</span>
        </div>
      ))}
      {esperando ? (
        <output className="block text-sm text-center text-[var(--hc-muted)]">
          {t('pos.pago.sinpeEsperando')}
        </output>
      ) : (
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void enviar() }}>
          <CampoSinpe id="pos-sinpe-nombre" label={t('pos.pago.sinpeNombre')} value={nombre} onChange={setNombre} />
          <CampoSinpe id="pos-sinpe-cedula" label={t('pos.pago.sinpeCedula')} value={cedula} onChange={setCedula} inputMode="numeric" />
          <CampoSinpe id="pos-sinpe-tel" label={t('pos.pago.sinpeTelefono')} value={telefono} onChange={setTelefono} inputMode="tel" />
          {error ? <p className="text-sm text-red-500">{error}</p> : null}
          <button
            type="submit"
            disabled={enviando || !nombre.trim() || !cedula.trim() || !telefono.trim()}
            className="w-full min-h-11 rounded-[14px] py-3 text-sm font-bold text-white disabled:opacity-40"
            style={{ background: 'var(--hc-primary)' }}
          >
            {enviando ? t('pos.cobro.procesando') : t('pos.pago.sinpeRegistrar')}
          </button>
        </form>
      )}
      <p className="text-xs text-[var(--hc-muted)] pt-1">{t('pos.pago.sinpeAvisoCajero')}</p>
      <button
        type="button"
        onClick={() => setReporteAbierto(true)}
        className="w-full rounded-[14px] border border-[var(--hc-border)] py-3 text-sm font-semibold text-[var(--hc-text)]"
        style={{ background: 'var(--hc-surface)' }}
      >
        {t('pos.pago.reportarError')}
      </button>
      <PosPagoReporteModal
        open={reporteAbierto}
        onClose={() => setReporteAbierto(false)}
        token={token}
        codigoError="sinpe"
      />
    </div>
  )
}

type CampoSinpeProps = Readonly<{
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  inputMode?: 'numeric' | 'tel'
}>

function CampoSinpe({
  id, label, value, onChange, inputMode,
}: CampoSinpeProps) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-xs text-[var(--hc-muted)]">{label}</label>
      <input
        id={id}
        value={value}
        inputMode={inputMode}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl px-3 py-2.5 text-sm"
        style={{ background: 'var(--hc-bg)', border: '1.5px solid var(--hc-border)', color: 'var(--hc-text)' }}
      />
    </div>
  )
}
