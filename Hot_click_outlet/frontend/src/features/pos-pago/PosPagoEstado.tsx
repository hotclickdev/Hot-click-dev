import { useTranslation } from 'react-i18next'
import TrustGlyph from '@/components/ui/TrustGlyph'
import type { PosPagoVista } from './posPagoTypes'

type Props = {
  vista: Exclude<PosPagoVista, 'cargando' | 'resumen'>
  mensajeError?: string | null
  onReintentar?: () => void
}

export default function PosPagoEstado({ vista, mensajeError, onReintentar }: Props) {
  const { t } = useTranslation()

  const config = configEstado(vista, mensajeError, t)
  const iconoColor = vista === 'exito' || vista === 'pagado' ? '#34d399' : '#fbbf24'

  return (
    <div className="text-center max-w-xs mx-auto space-y-3">
      <div className="flex justify-center" style={{ color: iconoColor }}>
        <TrustGlyph tipo={config.glyph} className="w-12 h-12" />
      </div>
      <p className="font-bold text-[var(--hc-text)]">{config.titulo}</p>
      <p className="text-sm text-[var(--hc-muted)]">{config.descripcion}</p>
      {vista === 'cancelado' && onReintentar ? (
        <button
          type="button"
          onClick={onReintentar}
          className="mt-2 w-full rounded-[14px] py-3 text-sm font-bold text-white"
          style={{ background: 'var(--hc-primary)' }}
        >
          {t('pos.pago.reintentar')}
        </button>
      ) : null}
    </div>
  )
}

function configEstado(
  vista: Exclude<PosPagoVista, 'cargando' | 'resumen'>,
  mensajeError: string | null | undefined,
  t: (key: string) => string,
) {
  if (vista === 'exito' || vista === 'pagado') {
    return {
      glyph: 'check' as const,
      titulo: t('pos.pago.exitoTitulo'),
      descripcion: t('pos.pago.exitoDesc'),
    }
  }
  if (vista === 'cancelado') {
    return {
      glyph: 'alerta' as const,
      titulo: t('pos.pago.canceladoTitulo'),
      descripcion: t('pos.pago.canceladoDesc'),
    }
  }
  if (mensajeError === 'pago_fallido') {
    return {
      glyph: 'alerta' as const,
      titulo: t('pos.pago.errorPagoTitulo'),
      descripcion: t('pos.pago.errorPagoDesc'),
    }
  }
  if (mensajeError === 'sin_items') {
    return {
      glyph: 'alerta' as const,
      titulo: t('pos.pago.errorTitulo'),
      descripcion: t('pos.pago.sinItems'),
    }
  }
  if (mensajeError === 'qr_invalido' || mensajeError === 'token_faltante') {
    return {
      glyph: 'alerta' as const,
      titulo: t('pos.pago.errorTitulo'),
      descripcion: t('pos.pago.qrInvalido'),
    }
  }
  return {
    glyph: 'alerta' as const,
    titulo: t('pos.pago.yaPagadoTitulo'),
    descripcion: t('pos.pago.yaPagadoDesc'),
  }
}
