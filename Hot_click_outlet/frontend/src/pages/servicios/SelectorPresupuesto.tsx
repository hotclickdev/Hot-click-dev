import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RANGOS_PRESUPUESTO } from '@/config/rangosPresupuesto'
import { CLASE_CAMPO } from './serviciosHelpers'
import { etiquetasRangosPresupuesto } from './presupuestoHelpers'

type Props = {
  valor: string
  onCambiar: (valor: string) => void
}

const CHIP = 'flex min-h-9 cursor-pointer items-center rounded-full px-3 text-[13px] font-semibold leading-[normal] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-hc-focus-ring'

/**
 * Presupuesto de «Te lo conseguimos» (Figma `28:1486`, decisión D12): rangos fijos y «Otro monto».
 * El valor que se envía sigue siendo texto (la etiqueta del rango o lo que se escribe en «Otro monto»),
 * así que el contrato con el backend no cambia. Los rangos son provisionales (`config/rangosPresupuesto`).
 */
export default function SelectorPresupuesto({ valor, onCambiar }: Props) {
  const { t } = useTranslation()
  const rangos = etiquetasRangosPresupuesto(RANGOS_PRESUPUESTO, t)
  const elegido = rangos.find((r) => r.texto === valor)
  const [otro, setOtro] = useState(valor !== '' && !elegido)

  function claseChip(activo: boolean) {
    return `${CHIP} ${activo ? 'bg-hc-blue-600 text-hc-n-0' : 'border border-hc-n-200 bg-hc-n-0 text-hc-n-700'}`
  }

  return (
    <fieldset className="flex flex-col gap-[6px]">
      <legend className="mb-[6px] text-[13px] font-semibold leading-[normal] text-hc-n-900">{t('serviciosPage.form.presupuesto')}</legend>
      <div className="flex flex-wrap gap-2">
        {rangos.map((rango) => {
          const activo = !otro && elegido?.id === rango.id
          return (
            <label key={rango.id} className={claseChip(activo)}>
              <input
                type="radio"
                name="srv-presupuesto"
                className="sr-only"
                checked={activo}
                onChange={() => { setOtro(false); onCambiar(rango.texto) }}
              />
              {rango.texto}
            </label>
          )
        })}
        <label className={claseChip(otro)}>
          <input
            type="radio"
            name="srv-presupuesto"
            className="sr-only"
            checked={otro}
            onChange={() => { setOtro(true); onCambiar('') }}
          />
          {t('serviciosPage.form.presupuestoOtro')}
        </label>
      </div>
      {otro && (
        <input
          id="srv-presupuesto-otro"
          type="text"
          aria-label={t('serviciosPage.form.presupuestoOtro')}
          placeholder={t('serviciosPage.form.presupuestoPh')}
          value={valor}
          onChange={(e) => onCambiar(e.target.value)}
          className={`${CLASE_CAMPO} mt-1`}
        />
      )}
    </fieldset>
  )
}
