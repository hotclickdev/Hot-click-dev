import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import IconoFigma from '@/components/comprador/IconoFigma'
import { ICONOS_COMPRA } from '@/pages/checkout/iconosCompra'
import { costoEnvio, type PaqueteCompra, type TotalesCompra } from '@/pages/checkout/paquetesCompra'
import type { EstadoCupon } from '@/pages/checkout/useCupon'
import { formatPrice } from '@/utils/format'
import CampoCupon from './CampoCupon'
import LineaMonto from './LineaMonto'
import PaqueteResumen from './PaqueteResumen'

type ResumenLateralProps = {
  paquetes: PaqueteCompra[]
  envios: Record<string, string>
  totales: TotalesCompra
  cupon: EstadoCupon
  textoBoton: string
  onBoton: () => void
  botonDeshabilitado?: boolean
  /** Campos que se abren junto al cupón (tarjeta de regalo en el pago). */
  extraCupon?: ReactNode
  /** Contenido justo antes del botón (consentimiento de datos en el pago). */
  antesDelBoton?: ReactNode
}

/** Resumen lateral desktop: carrito `30:2351` y checkout `30:2492`. */
export default function ResumenLateral({
  paquetes, envios, totales, cupon, textoBoton, onBoton, botonDeshabilitado = false, extraCupon, antesDelBoton,
}: ResumenLateralProps) {
  const { t } = useTranslation()
  const [cuponAbierto, setCuponAbierto] = useState(Boolean(cupon.cupon))

  return (
    <aside className="flex w-[380px] shrink-0 flex-col gap-[14px] rounded-[18px] border border-hc-n-200 bg-hc-n-0 p-[24px]">
      <h2 className="font-display text-[18px] font-bold text-hc-n-900">{t('compra.resumen.titulo')}</h2>
      <div className="h-px w-full bg-hc-n-200" />
      {paquetes.map((paquete) => (
        <PaqueteResumen key={paquete.clave} paquete={paquete} envio={costoEnvio(envios[paquete.clave])} />
      ))}
      <div className="h-px w-full bg-hc-n-200" />
      <LineaMonto etiqueta={t('compra.resumen.productos', { count: totales.cantidadProductos })} monto={formatPrice(totales.subtotal)} />
      <LineaMonto etiqueta={t('compra.resumen.envio', { count: paquetes.length })} monto={formatPrice(totales.envio)} />
      {totales.descuento > 0 ? (
        <LineaMonto
          etiqueta={t('compra.resumen.descuento', { codigo: cupon.cupon?.codigo })}
          monto={`−${formatPrice(totales.descuento)}`}
        />
      ) : null}
      {totales.descuentoSinpe > 0 ? (
        <LineaMonto etiqueta={t('compra.resumen.descuentoSinpe')} monto={`−${formatPrice(totales.descuentoSinpe)}`} />
      ) : null}
      {totales.giftCard > 0 ? (
        <LineaMonto etiqueta={t('compra.resumen.giftCard')} monto={`−${formatPrice(totales.giftCard)}`} />
      ) : null}
      {cuponAbierto ? (
        <>
          <CampoCupon cupon={cupon} />
          {extraCupon}
        </>
      ) : (
        <button
          type="button"
          onClick={() => setCuponAbierto(true)}
          className="flex items-center gap-[6px] self-start text-[13px] font-semibold text-hc-blue-600"
        >
          <IconoFigma src={ICONOS_COMPRA.cuponChico} size={14} />
          {t('compra.cupon.agregar')}
        </button>
      )}
      <div className="h-px w-full bg-hc-n-200" />
      <div className="flex items-center justify-between text-hc-n-900">
        <p className="text-[16px] font-semibold">{t('compra.resumen.total')}</p>
        <p className="font-display text-[20px] font-bold">{formatPrice(totales.total)}</p>
      </div>
      <p className="text-[12px] text-hc-n-500">{t('compra.resumen.ivaIncluido')}</p>
      {antesDelBoton}
      <button
        type="button"
        onClick={onBoton}
        disabled={botonDeshabilitado}
        className="flex w-full items-center justify-center rounded-[12px] bg-hc-red-500 px-[18px] py-[14px] text-[15px] font-semibold text-hc-n-0 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {textoBoton}
      </button>
      <p className="text-[11px] leading-[15px] text-hc-n-500">{t('compra.resumen.notaDesktop')}</p>
      <p className="flex items-center justify-center gap-[6px] text-[12px] text-hc-n-500">
        <IconoFigma src={ICONOS_COMPRA.candado} size={14} className="text-hc-green-600" />
        {t('compra.resumen.pagoProtegido')}
      </p>
    </aside>
  )
}
