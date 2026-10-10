import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Campo, CampoSelector } from '@/pages/checkout/PiezasCheckout'
import { useDivisionTerritorial } from '@/utils/useDivisionTerritorial'
import { MSG_DIRECCION_DOMICILIO } from './tiendaCheckoutValidacion'
import { componerDireccion, type PartesDireccion } from './direccionTienda'

const CLASE_AREA = 'hc-input-libre w-full resize-none rounded-[12px] border border-hc-n-200 bg-hc-n-0 px-[14px] py-[13px] text-[15px] leading-[20px] text-hc-n-900 outline-none placeholder:text-hc-n-500 focus:border-hc-blue-600 lg:rounded-[10px]'

/**
 * Dirección de entrega con el mismo selector provincia / cantón / distrito del marketplace (QA-114-3).
 * El pedido sigue recibiendo un solo texto: se compone con componerDireccion.
 */
export default function TiendaCheckoutDireccion({ onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useTranslation()
  const territorio = useDivisionTerritorial()
  const [partes, setPartes] = useState<PartesDireccion>({ provincia: '', canton: '', distrito: '', senas: '' })

  const cambiar = (nuevo: Partial<PartesDireccion>) => {
    const siguiente = { ...partes, ...nuevo }
    setPartes(siguiente)
    onChange(componerDireccion(siguiente))
  }

  const cantones = partes.provincia ? territorio.cantonesDe(partes.provincia) : []
  const distritos = territorio.distritosDe(partes.provincia, partes.canton)

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Campo etiqueta={t('checkout.f.provincia')}>
          {({ id, describedBy }) => (
            <CampoSelector id={id} describedBy={describedBy} escritorio={false} valor={partes.provincia} opciones={territorio.provincias}
              placeholder={t('checkout.f.elegir')} onCambiar={(v) => cambiar({ provincia: v, canton: '', distrito: '' })} />
          )}
        </Campo>
        <Campo etiqueta={t('checkout.f.canton')}>
          {({ id, describedBy }) => (
            <CampoSelector id={id} describedBy={describedBy} escritorio={false} valor={partes.canton} opciones={cantones}
              placeholder={t('checkout.f.elegir')} onCambiar={(v) => cambiar({ canton: v, distrito: '' })} deshabilitado={!partes.provincia} />
          )}
        </Campo>
      </div>
      <Campo etiqueta={t('checkout.f.distrito')}>
        {({ id, describedBy }) => (
          <CampoSelector id={id} describedBy={describedBy} escritorio={false} valor={partes.distrito} opciones={distritos}
            placeholder={t('checkout.f.elegir')} onCambiar={(v) => cambiar({ distrito: v })} deshabilitado={!partes.canton || distritos.length === 0} />
        )}
      </Campo>
      <Campo etiqueta="Señas exactas" ayuda={MSG_DIRECCION_DOMICILIO}>
        {({ id, describedBy }) => (
          <textarea
            id={id}
            required
            aria-describedby={describedBy}
            value={partes.senas}
            onChange={(e) => cambiar({ senas: e.target.value })}
            placeholder="Casa, color, punto de referencia..."
            rows={2}
            maxLength={400}
            className={CLASE_AREA}
          />
        )}
      </Campo>
    </div>
  )
}
