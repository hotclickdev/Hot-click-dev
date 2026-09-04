import { useState, type ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import PosPagoResumen from '@/features/pos-pago/PosPagoResumen'
import PosPagoEstado from '@/features/pos-pago/PosPagoEstado'
import PosPagoSinpe from '@/features/pos-pago/PosPagoSinpe'
import PosPagoOnvoEmbed from '@/features/pos-pago/PosPagoOnvoEmbed'
import PosPagoReporteModal from '@/features/pos-pago/PosPagoReporteModal'
import PosPagoCta from '@/features/pos-pago/PosPagoCta'
import { usePosPagoQr } from '@/features/pos-pago/usePosPagoQr'

/** Token legacy del flujo carrito; ya no se escribe desde esta página. */
export const POS_QR_TOKEN_KEY = 'hc-pos-qr-token'

const USA_EMBED_ONVO = true

export default function POSPagoPage() {
  const { token } = useParams()
  const { t } = useTranslation()
  const [modoEmbed, setModoEmbed] = useState(USA_EMBED_ONVO)
  const [reporteAbierto, setReporteAbierto] = useState(false)

  const {
    info,
    vista,
    mensajeError,
    iniciandoPago,
    pagarHosted,
    reintentar,
    marcarExitoEmbed,
  } = usePosPagoQr(token)

  const shell = (children: ReactNode) => (
    <div
      className="hc-sistema-theme min-h-dvh flex flex-col items-center justify-center px-5 py-8 sm:py-12"
      style={{ backgroundColor: 'var(--hc-bg)' }}
    >
      <main className="w-full">{children}</main>
    </div>
  )

  if (vista === 'cargando') {
    return shell(
      <p className="text-sm text-[var(--hc-muted)] animate-pulse" role="status">
        {t('pos.pago.cargando')}
      </p>,
    )
  }

  if (vista === 'exito' || vista === 'pagado' || vista === 'cancelado' || vista === 'error') {
    return shell(
      <PosPagoEstado
        vista={vista === 'error' ? 'error' : vista}
        mensajeError={mensajeError}
        onReintentar={reintentar}
        token={token}
      />,
    )
  }

  if (!info) {
    return shell(<PosPagoEstado vista="error" mensajeError="qr_invalido" token={token} />)
  }

  const esTarjeta = info.metodoPago === 'TARJETA'
  const esSinpe = info.metodoPago === 'SINPE'

  return shell(
    <div className="w-full space-y-5">
      <PosPagoResumen info={info} />

      {esSinpe ? <PosPagoSinpe info={info} token={token} /> : null}

      {esTarjeta && modoEmbed ? (
        <PosPagoOnvoEmbed
          token={token!}
          total={info.total ?? 0}
          onSuccess={marcarExitoEmbed}
          onFallback={() => setModoEmbed(false)}
        />
      ) : null}

      {esTarjeta && !modoEmbed ? (
        <div className="w-full max-w-md mx-auto space-y-3">
          {mensajeError === 'pago_fallido' ? (
            <p className="text-sm text-center text-red-500">{t('pos.pago.errorPagoDesc')}</p>
          ) : null}
          <PosPagoCta
            monto={info.total ?? 0}
            cargando={iniciandoPago}
            onClick={() => void pagarHosted()}
            avisoKey="pos.pago.hostedAviso"
          />
          {mensajeError === 'pago_fallido' ? (
            <button
              type="button"
              onClick={() => setReporteAbierto(true)}
              className="w-full min-h-11 rounded-2xl border border-[var(--hc-border)] py-3 text-sm font-semibold text-[var(--hc-text)]"
              style={{ background: 'var(--hc-surface)' }}
            >
              {t('pos.pago.reportarError')}
            </button>
          ) : null}
        </div>
      ) : null}

      <PosPagoReporteModal
        open={reporteAbierto}
        onClose={() => setReporteAbierto(false)}
        token={token}
        codigoError={mensajeError}
      />
    </div>,
  )
}
