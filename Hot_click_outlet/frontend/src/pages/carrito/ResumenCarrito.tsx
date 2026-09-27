import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import IconoFigma from '@/components/comprador/IconoFigma'
import { ICONOS_COMPRA } from '@/pages/checkout/iconosCompra'
import { costoEnvio, type PaqueteCompra, type TotalesCompra } from '@/pages/checkout/paquetesCompra'
import { formatPrice } from '@/utils/format'

type ResumenCarritoProps = {
  paquetes: PaqueteCompra[]
  envios: Record<string, string>
  totales: TotalesCompra
  codigoCupon: string | null
}

/** Resumen móvil del carrito (Figma `37:1647`) con el envío por paquete desplegable. */
export default function ResumenCarrito({ paquetes, envios, totales, codigoCupon }: ResumenCarritoProps) {
  const { t } = useTranslation()
  const [detalleAbierto, setDetalleAbierto] = useState(true)

  return (
    <section className="flex w-full flex-col gap-[8px] rounded-[14px] border border-hc-n-200 bg-hc-n-0 p-[14px]">
      <div className="flex items-center justify-between text-[14px] text-hc-n-900">
        <p className="font-medium">{t('compra.resumen.productos', { count: totales.cantidadProductos })}</p>
        <p className="font-semibold">{formatPrice(totales.subtotal)}</p>
      </div>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setDetalleAbierto((abierto) => !abierto)}
          aria-expanded={detalleAbierto}
          className="flex items-center gap-[4px] text-[14px] font-medium text-hc-n-900"
        >
          {t('compra.resumen.envio', { count: paquetes.length })}
          <IconoFigma
            src={detalleAbierto ? ICONOS_COMPRA.chevronArriba : ICONOS_COMPRA.chevronAbajo}
            size={14}
            className={detalleAbierto ? 'text-hc-blue-600' : 'text-hc-n-500'}
          />
        </button>
        <p className="text-[14px] font-semibold text-hc-n-900">{formatPrice(totales.envio)}</p>
      </div>
      {detalleAbierto ? (
        <div className="flex flex-col gap-[4px] border-l-2 border-hc-n-200 pl-[12px] text-[12px] text-hc-n-500">
          {paquetes.map((paquete) => (
            <div key={paquete.clave} className="flex items-center justify-between gap-[8px]">
              <p>{[paquete.nombre, paquete.provincia].filter(Boolean).join(' · ')}</p>
              <p>{formatPrice(costoEnvio(envios[paquete.clave]))}</p>
            </div>
          ))}
        </div>
      ) : null}
      {totales.descuento > 0 ? (
        <div className="flex items-center justify-between text-[14px] text-hc-green-600">
          <p className="font-medium">{t('compra.resumen.descuento', { codigo: codigoCupon })}</p>
          <p className="font-semibold">−{formatPrice(totales.descuento)}</p>
        </div>
      ) : null}
      <div className="h-px w-full bg-hc-n-200" />
      <div className="flex items-center justify-between font-display font-bold text-hc-n-900">
        <p className="text-[16px]">{t('compra.resumen.totalEstimado')}</p>
        <p className="text-[18px]">{formatPrice(totales.total)}</p>
      </div>
      <p className="text-[11px] leading-[15px] text-hc-n-500">{t('compra.resumen.notaMovil')}</p>
    </section>
  )
}
