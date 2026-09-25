import { useTranslation } from 'react-i18next'
import { PLAN_LANDING_COPY } from '../planes/planLandingCopy'

const copy = PLAN_LANDING_COPY.pyme
// copy.precio ya viene aprobado con los montos correctos: "₡9.900/mes + 4% por venta"
const [montoMensual, comisionVenta] = copy.precio.split(' + ')

/** Precio destacado del plan PYME + comparación de comisión frente a Emprendedor. */
export default function PymeComparativaPrecio() {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div
        className="w-full rounded-2xl px-8 py-10 sm:py-12 flex flex-col items-center gap-3"
        style={{ backgroundColor: 'var(--hc-primary)', color: '#fff' }}
      >
        <p className="text-4xl sm:text-5xl font-bold" style={{ fontFamily: 'var(--hc-font-display)' }}>
          {montoMensual.replace('/mes', ' /mes')}
        </p>
        <p className="text-base sm:text-lg font-medium">+ {comisionVenta}</p>
      </div>
      <p className="text-sm max-w-2xl" style={{ color: 'var(--hc-text)', fontFamily: 'var(--hc-font-mono)' }}>
        {t('pyme.comparativaNota')}
      </p>
    </div>
  )
}
