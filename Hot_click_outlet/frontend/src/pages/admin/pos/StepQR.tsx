import { useState, useEffect, useRef, type MutableRefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { posService } from '@/services/posService'
import { formatMontoPos, enlacePagoPosQr, type PosQrData } from './posHelpers'
import { QrCodeIcon, SinpeIcon } from './posIcons'
import PosQrImagen from './PosQrImagen'
import PosReporteModal from './PosReporteModal'
import { posUi } from './posApariencia'

const QR_LADO_PX = 232

function esSesionCerrada(estado: string | undefined): boolean {
  return estado === 'EXPIRADO' || estado === 'CANCELADO'
}

function limpiarPoll(pollRef: MutableRefObject<ReturnType<typeof setInterval> | null>) {
  if (!pollRef.current) return
  clearInterval(pollRef.current)
  pollRef.current = null
}

export default function StepQR({ qrData, onConfirmSinpe, onCancelar, loadingConfirm: _loadingConfirm }: {
  qrData: PosQrData
  onConfirmSinpe: (token: string | null, autoConfirmed: boolean, numeroPedido?: string) => void
  onCancelar: () => void
  loadingConfirm: boolean
}) {
  const { t } = useTranslation()
  const { token, metodoPago, total, sinpeNumero } = qrData
  const qrUrl = enlacePagoPosQr(token)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [paid, setPaid] = useState(false)
  const ticketPagadoRef = useRef('—')
  const [sesionCerrada, setSesionCerrada] = useState(false)
  const [reporteAbierto, setReporteAbierto] = useState(false)
  const tokenFaltante = !token
  const esSinpe = metodoPago === 'SINPE'

  useEffect(() => {
    if ((metodoPago !== 'TARJETA' && metodoPago !== 'SINPE') || tokenFaltante) return
    pollRef.current = setInterval(async () => {
      try {
        const res = await posService.estadoQrSesion(token) as { estado?: string, pedidoId?: number, numeroPedido?: string }
        if (res?.estado === 'PAGADO') {
          ticketPagadoRef.current = res.numeroPedido
            ?? (res.pedidoId != null ? String(res.pedidoId) : '—')
          limpiarPoll(pollRef)
          setPaid(true)
          return
        }
        if (esSesionCerrada(res?.estado)) {
          limpiarPoll(pollRef)
          setSesionCerrada(true)
        }
      } catch { /* transient poll failure — retries on next tick */ }
    }, 3000)
    return () => limpiarPoll(pollRef)
  }, [token, metodoPago, tokenFaltante])

  useEffect(() => { if (paid) onConfirmSinpe(null, true, ticketPagadoRef.current) }, [paid]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="mx-auto flex w-full max-w-sm flex-col items-center text-center">
        <EncabezadoQr esSinpe={esSinpe} />
        <MarcoQr
          token={token}
          qrUrl={qrUrl}
          alt={t('pos.qr.imagenAlt')}
          errorMsg={t('pos.qr.tokenFaltante')}
        />
        {token ? <EnlacePagoQr url={qrUrl} /> : null}
        <MontoACobrar total={total} />
        {esSinpe ? (
          <DetalleSinpe
            sinpeNumero={sinpeNumero || t('pos.qr.configWhatsapp')}
            referencia={(token ?? '').substring(0, 8).toUpperCase()}
            monto={`₡${formatMontoPos(total)}`}
          />
        ) : null}
        <EstadoEspera visible={!paid && !sesionCerrada} />
        <AccionesQr
          onCancelar={onCancelar}
          onReportar={() => setReporteAbierto(true)}
        />
      </div>
      <PosReporteModal
        open={reporteAbierto}
        onClose={() => setReporteAbierto(false)}
        pasoActual="qr"
      />
    </div>
  )
}

function EncabezadoQr({ esSinpe }: { esSinpe: boolean }) {
  const { t } = useTranslation()
  const Icono = esSinpe ? SinpeIcon : QrCodeIcon
  return (
    <div className="mb-6 space-y-2">
      <p
        className="flex items-center justify-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em]"
        style={{ color: 'var(--hc-blue-600)' }}
      >
        <Icono className="h-4 w-4" />
        {esSinpe ? t('pos.qr.pagoSinpe') : t('pos.qr.pagoTarjeta')}
      </p>
      <p className="text-pretty text-sm" style={{ color: posUi.muted }}>
        {esSinpe ? t('pos.qr.instruccionSinpe') : t('pos.qr.instruccionTarjeta')}
      </p>
    </div>
  )
}

function MarcoQr({ token, qrUrl, alt, errorMsg }: {
  token: string | null
  qrUrl: string
  alt: string
  errorMsg: string
}) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{ backgroundColor: posUi.panel, border: `1px solid ${posUi.borde}` }}
    >
      {token ? (
        <PosQrImagen value={qrUrl} size={QR_LADO_PX} alt={alt} />
      ) : (
        <p className="w-[232px] text-center text-sm" style={{ color: 'var(--hc-danger)' }}>
          {errorMsg}
        </p>
      )}
    </div>
  )
}

function EnlacePagoQr({ url }: { url: string }) {
  const { t } = useTranslation()
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-3 max-w-full break-all px-1 text-xs font-medium underline underline-offset-2"
      style={{ color: 'var(--hc-blue-600)' }}
    >
      {t('pos.qr.abrirEnlacePago')}
      <span className="mt-1 block font-mono text-[11px] no-underline" style={{ color: posUi.muted }}>
        {url}
      </span>
    </a>
  )
}

function MontoACobrar({ total }: { total: number }) {
  const { t } = useTranslation()
  return (
    <div className="mt-6">
      <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: posUi.muted }}>
        {t('pos.cobro.totalACobrar')}
      </p>
      <p
        className="mt-1 font-display text-[2.5rem] font-bold tabular-nums leading-none"
        style={{ color: posUi.texto }}
      >
        ₡{formatMontoPos(total)}
      </p>
    </div>
  )
}

function DetalleSinpe({ sinpeNumero, referencia, monto }: {
  sinpeNumero: string
  referencia: string
  monto: string
}) {
  const { t } = useTranslation()
  const filas = [
    { id: 'sinpe', label: t('pos.qr.sinpeA'), value: sinpeNumero, resalte: false },
    { id: 'ref', label: t('pos.qr.referencia'), value: referencia, resalte: false },
    { id: 'monto', label: t('pos.qr.montoExacto'), value: monto, resalte: true },
  ]
  return (
    <div
      className="mt-5 w-full space-y-2 rounded-2xl p-4 text-left"
      style={{ backgroundColor: 'var(--hc-info-bg)', border: '1px solid color-mix(in srgb, var(--hc-blue-600) 22%, transparent)' }}
    >
      {filas.map((fila) => (
        <div key={fila.id} className="flex justify-between gap-3 text-sm">
          <span style={{ color: posUi.muted }}>{fila.label}</span>
          <span
            className="font-mono font-bold"
            style={{ color: fila.resalte ? 'var(--hc-success)' : 'var(--hc-blue-600)' }}
          >
            {fila.value}
          </span>
        </div>
      ))}
    </div>
  )
}

function EstadoEspera({ visible }: { visible: boolean }) {
  const { t } = useTranslation()
  if (!visible) return null
  return (
    <p
      className="mt-5 flex items-center justify-center gap-2 text-sm"
      style={{ color: posUi.muted }}
      role="status"
    >
      <span
        className="size-2 shrink-0 animate-pulse rounded-full"
        style={{ backgroundColor: 'var(--hc-warning)' }}
        aria-hidden
      />
      {t('pos.qr.esperandoConfirmacion')}
    </p>
  )
}

function AccionesQr({ onCancelar, onReportar }: {
  onCancelar: () => void
  onReportar: () => void
}) {
  const { t } = useTranslation()
  return (
    <div className="mt-6 w-full space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onCancelar}
          className="min-h-11 rounded-2xl py-3 text-sm font-semibold"
          style={{ backgroundColor: 'var(--hc-danger-bg)', color: 'var(--hc-danger)' }}
        >
          {t('pos.qr.cancelar')}
        </button>
        <p
          className="flex min-h-11 items-center justify-center rounded-2xl px-2 text-center text-xs"
          style={{ backgroundColor: posUi.panel, color: posUi.muted }}
        >
          {t('pos.qr.autoDetecta')}
        </p>
      </div>
      <button
        type="button"
        onClick={onReportar}
        className="min-h-11 w-full rounded-2xl py-3 text-sm font-semibold transition-colors hover:bg-hc-surface-2"
        style={{ backgroundColor: posUi.fondo, color: posUi.texto, border: `1px solid ${posUi.borde}` }}
        aria-label={t('pos.reporte.botonAria')}
      >
        {t('pos.header.reportar')}
      </button>
    </div>
  )
}
