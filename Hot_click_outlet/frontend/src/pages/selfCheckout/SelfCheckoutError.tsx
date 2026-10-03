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
      </div>
    </QrPagina>
  )
}
