import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { posService } from '@/services/posService'
import { formatPrice } from '@/utils/format'
import { fechaComprobante, nombreItem, tituloYCodigo } from './posPagoFormat'
import type { QrComprobante } from './posPagoTypes'

type Estado = 'cerrado' | 'cargando' | 'listo' | 'error'

/**
 * "Ver comprobante" del cobro pagado (Figma `29:1888`, decisión B16). Lo arma el
 * backend solo con el cobro PAGADO; se puede imprimir o guardar como PDF desde
 * el navegador. No se promete envío por correo: el QR no pide correo.
 */
export default function PosPagoComprobante({ token }: Readonly<{ token: string }>) {
  const { t } = useTranslation()
  const [estado, setEstado] = useState<Estado>('cerrado')
  const [datos, setDatos] = useState<QrComprobante | null>(null)

  const abrir = () => {
    setEstado('cargando')
    posService.comprobanteQrSesion(token)
      .then((data) => {
        setDatos(data as QrComprobante)
        setEstado('listo')
      })
      .catch(() => setEstado('error'))
  }

  if (estado !== 'listo' || !datos) {
    return (
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={abrir}
          disabled={estado === 'cargando'}
          className="min-h-[46px] w-full rounded-[12px] border border-hc-n-200 bg-hc-n-0 px-4 py-[14px] text-[15px] font-semibold leading-[18px] text-hc-n-900 disabled:opacity-60"
        >
          {estado === 'cargando' ? t('pos.pago.comprobanteCargando') : t('pos.pago.verComprobante')}
        </button>
        {estado === 'error' ? (
          <p role="alert" className="text-center text-[13px] leading-[18px] text-hc-red-600">
            {t('pos.pago.comprobanteError')}
          </p>
        ) : null}
      </div>
    )
  }

  const metodo = datos.metodoPago === 'SINPE' ? t('pos.pago.sinpeMetodo') : t('pos.pago.tarjetaMetodo')
  const filas: Array<[string, string]> = [
    [t('pos.pago.comprobanteNumero'), datos.numeroCobro ? `#${datos.numeroCobro}` : ''],
    [t('pos.pago.comprobanteFecha'), fechaComprobante(datos.fechaPago)],
    [t('pos.pago.comprobanteCaja'), datos.caja ?? ''],
    [t('pos.pago.comprobanteMetodo'), metodo],
    [t('pos.pago.comprobanteReferencia'), datos.referencia ?? ''],
  ]

  return (
    <section
      data-testid="pos-pago-comprobante"
      aria-labelledby="pos-pago-comprobante-titulo"
      className="flex flex-col gap-3 rounded-[16px] border border-hc-n-200 bg-hc-n-0 p-4"
    >
      <h2 id="pos-pago-comprobante-titulo" className="font-sans text-[15px] font-semibold leading-[18px] text-hc-n-900">
        {t('pos.pago.comprobanteTitulo', { negocio: datos.empresaNombre ?? '' })}
      </h2>
      <dl className="flex flex-col gap-1 text-[13px] leading-[18px]">
        {filas.filter(([, valor]) => valor).map(([etiqueta, valor]) => (
          <div key={etiqueta} className="flex justify-between gap-3">
            <dt className="text-hc-n-600">{etiqueta}</dt>
            <dd className="text-right font-medium text-hc-n-900">{valor}</dd>
          </div>
        ))}
      </dl>
      <ul className="flex flex-col gap-1 border-t border-hc-n-200 pt-3 text-[13px] leading-[18px]">
        {(datos.items ?? []).map((item, idx) => {
          const cantidad = Math.max(1, item.cantidad ?? 1)
          return (
            <li key={`${item.productoId ?? idx}-comprobante`} className="flex justify-between gap-3">
              <span className="min-w-0 truncate text-hc-n-600">{cantidad} × {tituloYCodigo(nombreItem(item)).titulo}</span>
              <span className="shrink-0 text-hc-n-900">{formatPrice((item.precioUnitario ?? 0) * cantidad)}</span>
            </li>
          )
        })}
      </ul>
      <p className="flex justify-between border-t border-hc-n-200 pt-3 text-[15px] font-semibold text-hc-n-900">
        <span>{t('pos.pago.total')}</span>
        <span>{formatPrice(datos.total ?? 0)}</span>
      </p>
      <button
        type="button"
        onClick={() => window.print()}
        className="min-h-[44px] w-full rounded-[12px] border border-hc-n-200 bg-hc-n-0 px-4 py-3 text-[14px] font-semibold text-hc-n-900 print:hidden"
      >
        {t('pos.pago.imprimirComprobante')}
      </button>
    </section>
  )
}
