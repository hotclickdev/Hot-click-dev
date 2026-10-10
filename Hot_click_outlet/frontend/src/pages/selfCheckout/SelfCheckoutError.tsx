import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import TrustGlyph from '@/components/ui/TrustGlyph'
import QrPagina from '@/features/qr-negocio/QrPagina'
import QrResultado from '@/features/qr-negocio/QrResultado'

/**
 * QR inválido o mesa desactivada. No tiene frame en Figma: usa el bloque de
 * resultado de las pantallas QR con el ícono de alerta existente.
 */
export default function SelfCheckoutError({ error }: Readonly<{ error: string }>) {
  const { t } = useTranslation()
  return (
    <QrPagina>
      <div className="my-auto">
        <QrResultado
          tono="alerta"
          icono={
            <span className="text-hc-red-600">
              <TrustGlyph tipo="alerta" className="size-[34px]" />
            </span>
          }
          titulo={t('pos.mesa.errorQrTitulo')}
          descripcion={error}
        />
        <div className="mt-6 flex flex-col gap-3">
          <Link to="/" className="flex min-h-12 items-center justify-center rounded-[12px] bg-hc-red-500 px-4 text-[15px] font-semibold text-white">
            {t('comun.irAlInicio', { defaultValue: 'Ir al inicio' })}
          </Link>
          <Link to="/contacto" className="flex min-h-11 items-center justify-center text-[14px] font-semibold text-hc-blue-600">
            {t('comun.ayuda', { defaultValue: 'Ayuda' })}
          </Link>
        </div>
      </div>
    </QrPagina>
  )
}
