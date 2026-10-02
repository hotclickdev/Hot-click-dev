import { useState, type ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import PosPagoMonto from '@/features/pos-pago/PosPagoMonto'
import PosPagoMetodo from '@/features/pos-pago/PosPagoMetodo'
import PosPagoPedido from '@/features/pos-pago/PosPagoPedido'
import PosPagoEstado from '@/features/pos-pago/PosPagoEstado'
import PosPagoSinpe from '@/features/pos-pago/PosPagoSinpe'
import PosPagoOnvoEmbed from '@/features/pos-pago/PosPagoOnvoEmbed'
import PosPagoReporteModal from '@/features/pos-pago/PosPagoReporteModal'
import PosPagoCta from '@/features/pos-pago/PosPagoCta'
import { usePosPagoQr } from '@/features/pos-pago/usePosPagoQr'
import { useCuentaRegresiva } from '@/features/pos-pago/useCuentaRegresiva'
import QrPagina from '@/features/qr-negocio/QrPagina'
import QrEncabezadoNegocio from '@/features/qr-negocio/QrEncabezadoNegocio'
import { ICONOS_QR } from '@/features/qr-negocio/iconosQr'
import { metodoActivo, metodosDisponibles } from '@/features/pos-pago/posPagoFormat'
import type { MetodoQr } from '@/features/pos-pago/posPagoTypes'
import type { TFunction } from 'i18next'

/** Token legacy del flujo carrito; ya no se escribe desde esta página. */
export const POS_QR_TOKEN_KEY = 'hc-pos-qr-token'

const USA_EMBED_ONVO = true

/** "Cobro #P-3391 · Caja principal"; sin número de cobro no hay línea. */
function textoCobro(t: TFunction, numero?: string | null, caja?: string | null): string | null {
  if (!numero) return null
  if (caja) return t('pos.pago.cobroNumeroCaja', { numero, caja })
  return t('pos.pago.cobroNumero', { numero })
}

/**
 * Pago del cliente por QR de caja (`/pos/pago/:token`). Frames Figma:
 * elegir método `29:1781`, SINPE en curso `29:1830`, pagado `29:1888`,
 * vencido `29:1913`.
 */
export default function POSPagoPage() {
  const { token } = useParams()
  const { t } = useTranslation()
  const [modoEmbed, setModoEmbed] = useState(USA_EMBED_ONVO)
  const [sinpeIniciado, setSinpeIniciado] = useState(false)
  const [reporteAbierto, setReporteAbierto] = useState(false)
  const [metodoElegido, setMetodoElegido] = useState<MetodoQr | null>(null)

  const {
    info,
    vista,
    mensajeError,
    iniciandoPago,
    recargar,
    pagarHosted,
    reintentar,
    marcarExitoEmbed,
  } = usePosPagoQr(token)

  const restante = useCuentaRegresiva(vista === 'resumen' ? info?.expiracion : undefined, () => void recargar())

  const conEncabezado = (children: ReactNode) => (
    <QrPagina>
      <QrEncabezadoNegocio
        nombre={info?.empresaNombre ?? t('pos.pago.negocio')}
        logoUrl={info?.logoUrl}
        seguro={t('pos.negocio.seguro')}
      />
      {children}
    </QrPagina>
  )

  if (vista === 'cargando') {
    return (
      <QrPagina>
        <p className="m-auto animate-pulse text-sm text-hc-n-500" role="status">
          {t('pos.pago.cargando')}
        </p>
      </QrPagina>
    )
  }

  if (vista === 'exito' || vista === 'pagado' || vista === 'vencido' || vista === 'cancelado' || vista === 'error') {
    const estado = (
      <PosPagoEstado
        vista={vista}
        mensajeError={mensajeError}
        onReintentar={reintentar}
        token={token}
        total={info?.total}
        negocio={info?.empresaNombre}
        conComprobante={vista === 'pagado'}
      />
    )
    return info ? conEncabezado(estado) : <QrPagina>{estado}</QrPagina>
  }

  if (!info) {
    return (
      <QrPagina>
        <PosPagoEstado vista="error" mensajeError="qr_invalido" token={token} />
      </QrPagina>
    )
  }

  // El cliente elige entre los métodos que habilitó la caja; el backend fija el
  // método de la sesión cuando arranca el pago (intent, checkout o SINPE).
  const metodos = metodosDisponibles(info)
  const metodo = metodoActivo(metodos, info.metodoPago, metodoElegido)
  const esTarjeta = metodo === 'TARJETA'
  const esSinpe = metodo === 'SINPE'
  const cobro = textoCobro(t, info.numeroCobro, info.caja)

  if (esSinpe && sinpeIniciado) {
    return conEncabezado(<PosPagoSinpe info={info} token={token} onPagado={marcarExitoEmbed} />)
  }

  return conEncabezado(
    <>
      <PosPagoMonto total={info.total} restante={restante} cobro={cobro} />
      {metodo ? <PosPagoMetodo metodos={metodos} elegido={metodo} onElegir={setMetodoElegido} /> : null}
      <PosPagoPedido items={info.items ?? []} />

      {esTarjeta && modoEmbed ? (
        <div className="mt-auto px-4 pb-6">
          <PosPagoOnvoEmbed
            token={token!}
            total={info.total ?? 0}
            onSuccess={marcarExitoEmbed}
            onFallback={() => setModoEmbed(false)}
          />
        </div>
      ) : null}

      {esSinpe ? (
        <div className="mt-auto">
          <PosPagoCta
            monto={info.total ?? 0}
            etiqueta={t('pos.pago.pagarSinpe')}
            icono={ICONOS_QR.botonSinpe}
            onClick={() => setSinpeIniciado(true)}
          />
        </div>
      ) : null}

      {esTarjeta && !modoEmbed ? (
        <div className="mt-auto">
          {mensajeError === 'pago_fallido' ? (
            <p className="px-4 pb-3 text-center text-[13px] text-hc-red-600">
              {t('pos.pago.errorPagoDesc')}
            </p>
          ) : null}
          <PosPagoCta
            monto={info.total ?? 0}
            cargando={iniciandoPago}
            onClick={() => void pagarHosted()}
            avisoKey="pos.pago.hostedAviso"
          />
          {mensajeError === 'pago_fallido' ? (
            <div className="bg-hc-n-0 px-4 pb-6">
              <button
                type="button"
                onClick={() => setReporteAbierto(true)}
                className="min-h-[46px] w-full rounded-[12px] border border-hc-n-200 bg-hc-n-0 px-4 py-[14px] text-[15px] font-semibold leading-[18px] text-hc-n-900"
              >
                {t('pos.pago.reportarError')}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      <PosPagoReporteModal
        open={reporteAbierto}
        onClose={() => setReporteAbierto(false)}
        token={token}
        codigoError={mensajeError}
      />
    </>,
  )
}
