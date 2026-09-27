import { useTranslation } from 'react-i18next'
import AvisoVariosEmprendimientos from '@/components/comprador/AvisoVariosEmprendimientos'
import { PROVINCIAS_CR, cantonesDe } from '@/utils/divisionTerritorialCR'
import { formatPrice } from '@/utils/format'
import CampoCompra from './CampoCompra'
import PaqueteEntrega from './PaqueteEntrega'
import SeccionCompra from './SeccionCompra'
import SelectorCompra from './SelectorCompra'
import { requiereDireccion } from './paquetesCompra'
import type { FormularioCompra } from './useFormularioCompra'

function DireccionEntrega({ form }: { form: FormularioCompra }) {
  const { t } = useTranslation()
  const { direccion, cambiarDireccion, errores } = form
  return (
    <div className="flex flex-col gap-[12px] pt-[18px] lg:gap-[14px] lg:pt-0">
      <h3 className="font-display text-[16px] font-semibold text-hc-n-900 lg:hidden">{t('compra.entrega.direccionTitulo')}</h3>
      <div className="flex gap-[10px] lg:gap-[14px]">
        <SelectorCompra
          id="compra-provincia"
          etiqueta={t('compra.entrega.provincia')}
          valor={direccion.provincia}
          opciones={PROVINCIAS_CR}
          onCambiar={(valor) => cambiarDireccion('provincia', valor)}
          placeholder={t('compra.entrega.elegir')}
          error={errores.provincia}
        />
        <SelectorCompra
          id="compra-canton"
          etiqueta={t('compra.entrega.canton')}
          valor={direccion.canton}
          opciones={cantonesDe(direccion.provincia)}
          onCambiar={(valor) => cambiarDireccion('canton', valor)}
          placeholder={t('compra.entrega.elegir')}
          error={errores.canton}
          deshabilitado={!direccion.provincia}
        />
      </div>
      <CampoCompra
        id="compra-senas"
        etiqueta={t('compra.entrega.senas')}
        valor={direccion.senas}
        onCambiar={(valor) => cambiarDireccion('senas', valor)}
        placeholder={t('compra.entrega.senasPlaceholder')}
        error={errores.senas}
        autoComplete="street-address"
      />
    </div>
  )
}

/** Paso 2 · Entrega: móvil `29:1248`, tarjeta «Entrega» de desktop `30:2385`. */
export default function SeccionEntrega({ form, visibleEnMovil }: { form: FormularioCompra; visibleEnMovil: boolean }) {
  const { t } = useTranslation()
  const { paquetes, envios, elegirEnvio, totales } = form
  const cantidad = paquetes.length
  const conDireccion = requiereDireccion(envios)

  return (
    <SeccionCompra numero={2} titulo={t('compra.entrega.tituloDesktop')} visibleEnMovil={visibleEnMovil}>
      {conDireccion ? <DireccionEntrega form={form} /> : null}
      <div className={`flex flex-col gap-[12px] pb-[18px] lg:p-0 ${conDireccion ? 'pt-[8px]' : 'pt-[18px]'}`}>
        <div className="flex flex-col gap-[4px]">
          <h3 className="font-display text-[18px] font-bold text-hc-n-900 lg:font-sans lg:text-[15px] lg:font-semibold">
            {t('compra.entrega.porPaqueteTitulo')}
          </h3>
          <p className="text-[13px] leading-[18px] text-hc-n-600 lg:hidden">{t('compra.entrega.porPaqueteSubtitulo', { count: cantidad })}</p>
        </div>
        <AvisoVariosEmprendimientos cantidadNegocios={cantidad} />
        {paquetes.map((paquete) => (
          <PaqueteEntrega
            key={paquete.clave}
            paquete={paquete}
            metodo={envios[paquete.clave]}
            onElegir={(metodo) => elegirEnvio(paquete.clave, metodo)}
          />
        ))}
        <p className="text-[12px] leading-[16px] text-hc-n-500">
          <span className="lg:hidden">{t('compra.entrega.notaRetiroMovil')}</span>
          <span className="hidden lg:inline">{t('compra.entrega.notaRetiroDesktop')}</span>
        </p>
        <div className="flex items-center justify-between rounded-[12px] bg-hc-n-100 px-[14px] py-[12px] text-[14px] text-hc-n-900 lg:rounded-[10px] lg:bg-hc-n-50 lg:py-[10px]">
          <p className="font-medium">{t('compra.entrega.envioTotal', { count: cantidad })}</p>
          <p className="font-semibold">{formatPrice(totales.envio)}</p>
        </div>
      </div>
    </SeccionCompra>
  )
}
