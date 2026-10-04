import { useTranslation } from 'react-i18next'
import type { NavigateFunction } from 'react-router-dom'
import { BOTON_HOJA_PRIMARIO } from '@/components/ui/sistema/estilosHoja'

type PromoWelcomeSuccessProps = {
  dismiss: () => void
  navigate: NavigateFunction
}

/** Cupón enviado. Figma no dibuja este paso: usa el mismo sistema de la hoja (texto n/600, botón rojo). */
export default function PromoWelcomeSuccess({ dismiss, navigate }: PromoWelcomeSuccessProps) {
  const { t } = useTranslation()

  return (
    <>
      <p className="text-[12px] leading-4 text-hc-n-600">{t('promo.successSub')}</p>
      <div className="flex">
        <button type="button" onClick={() => { dismiss(); navigate('/productos') }} className={BOTON_HOJA_PRIMARIO}>
          {t('promo.viewProducts')}
        </button>
      </div>
    </>
  )
}
