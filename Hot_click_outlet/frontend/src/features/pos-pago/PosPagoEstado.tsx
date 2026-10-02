import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import TrustGlyph from '@/components/ui/TrustGlyph'
import { ICONOS_QR } from '@/features/qr-negocio/iconosQr'
import QrResultado from '@/features/qr-negocio/QrResultado'
import { formatPrice } from '@/utils/format'
import type { PosPagoVista } from './posPagoTypes'
import PosPagoReporteModal from './PosPagoReporteModal'

type Props = {
  vista: Exclude<PosPagoVista, 'cargando' | 'resumen'>
  mensajeError?: string | null
  onReintentar?: () => void
  token?: string
  total?: number
  negocio?: string
}

/**
 * Resultado del cobro: pagado (Figma `29:1888`) y vencido (`29:1913`) siguen
 * el frame. Cancelado y los errores no tienen frame: usan el mismo bloque
 * `QrResultado` con el ícono de alerta existente.
 */
export default function PosPagoEstado({ vista, mensajeError, onReintentar, token, total, negocio }: Props) {
  const { t } = useTranslation()
  const [reporteAbierto, setReporteAbierto] = useState(false)

  const config = configEstado(vista, mensajeError, t, total, negocio)
  const mostrarReporte = vista === 'error' || vista === 'cancelado'

  return (
    <div className="flex flex-col">
      <QrResultado
        icono={
          config.icono ?? (
            <span className="text-[var(--hc-red-500)]">
              <TrustGlyph tipo="alerta" className="size-[34px]" />
            </span>
          )
        }
        tono={config.tono}
        titulo={config.titulo}
        descripcion={config.descripcion}
      />
      <div className="flex flex-col gap-3 px-4 pb-6 pt-3">
        {vista === 'cancelado' && onReintentar ? (
          <button
            type="button"
            onClick={onReintentar}
            className="hc-btn-primary min-h-[46px] w-full rounded-[12px] px-4 py-[14px] text-[15px] font-semibold leading-[18px] text-white"
          >
            {t('pos.pago.reintentar')}
          </button>
        ) : null}
        {mostrarReporte ? (
          <button
            type="button"
            onClick={() => setReporteAbierto(true)}
            className="min-h-[46px] w-full rounded-[12px] border border-[var(--hc-n-200)] bg-[var(--hc-n-0)] px-4 py-[14px] text-[15px] font-semibold leading-[18px] text-[var(--hc-n-900)]"
          >
            {t('pos.pago.reportarError')}
          </button>
        ) : null}
      </div>
      <PosPagoReporteModal
        open={reporteAbierto}
        onClose={() => setReporteAbierto(false)}
        token={token}
        codigoError={mensajeError ?? vista}
      />
    </div>
  )
}

type ConfigEstado = {
  icono?: string
  tono: 'exito' | 'alerta'
  titulo: string
  descripcion: string
}

function configEstado(
  vista: Exclude<PosPagoVista, 'cargando' | 'resumen'>,
  mensajeError: string | null | undefined,
  t: (key: string, opts?: Record<string, unknown>) => string,
  total?: number,
  negocio?: string,
): ConfigEstado {
  if (vista === 'exito' || vista === 'pagado') {
    return {
      icono: ICONOS_QR.check,
      tono: 'exito',
      titulo: t('pos.pago.exitoTitulo'),
      descripcion:
        total && negocio
          ? t('pos.pago.pagoRecibidoDesc', { monto: formatPrice(total), negocio })
          : t('pos.pago.exitoDesc'),
    }
  }
  if (vista === 'vencido') {
    return {
      icono: ICONOS_QR.vencido,
      tono: 'alerta',
      titulo: t('pos.pago.vencidoTitulo'),
      descripcion: t('pos.pago.vencidoDesc'),
    }
  }
  if (vista === 'cancelado') {
    return { tono: 'alerta', titulo: t('pos.pago.canceladoTitulo'), descripcion: t('pos.pago.canceladoDesc') }
  }
  if (mensajeError === 'pago_fallido') {
    return { tono: 'alerta', titulo: t('pos.pago.errorPagoTitulo'), descripcion: t('pos.pago.errorPagoDesc') }
  }
  if (mensajeError === 'sin_items') {
    return { tono: 'alerta', titulo: t('pos.pago.errorTitulo'), descripcion: t('pos.pago.sinItems') }
  }
  if (mensajeError === 'qr_invalido' || mensajeError === 'token_faltante') {
    return { tono: 'alerta', titulo: t('pos.pago.errorTitulo'), descripcion: t('pos.pago.qrInvalido') }
  }
  return { tono: 'alerta', titulo: t('pos.pago.yaPagadoTitulo'), descripcion: t('pos.pago.yaPagadoDesc') }
}
