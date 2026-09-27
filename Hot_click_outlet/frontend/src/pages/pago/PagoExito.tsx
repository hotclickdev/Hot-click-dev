import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import IconoFigma from '@/components/comprador/IconoFigma'
import { useToast } from '@/components/ui/Toast'
import { copiarTexto } from '@/pages/checkout/checkoutHelpers'
import { leerCompra } from '@/pages/checkout/compraGuardada'
import EncabezadoCompraSegura from '@/pages/checkout/EncabezadoCompraSegura'
import { ICONOS_COMPRA } from '@/pages/checkout/iconosCompra'
import { numeroCompraVisible } from '@/pages/checkout/validacionCompra'
import PaquetesPedido from './PaquetesPedido'
import GuardarPedidoEnCuenta from './GuardarPedidoEnCuenta'
import type { PagoResumen } from './pagoHelpers'

type PagoExitoProps = {
  pagoData: PagoResumen | null
  numeroPedido: string | null
  token: string | null
}

function NumeroPedido({ numero }: { numero: string }) {
  const { t } = useTranslation()
  const toast = useToast()

  async function copiar() {
    const copiado = await copiarTexto(numero)
    toast({ message: copiado ? t('compra.exito.copiado') : t('compra.exito.noCopiado'), type: copiado ? 'success' : 'error' })
  }

  return (
    <p className="flex items-center justify-center gap-[6px]">
      <span className="text-[14px] text-hc-n-600">{t('compra.exito.pedido')}</span>
      <span className="font-mono text-[15px] font-medium text-hc-n-900">{numero}</span>
      <button type="button" onClick={() => void copiar()} aria-label={t('compra.exito.copiar')} className="flex text-hc-blue-600">
        <IconoFigma src={ICONOS_COMPRA.copiar} size={15} />
      </button>
    </p>
  )
}

/** Pago confirmado (Figma `29:1932`): un paquete por tienda, todos «Preparando». */
export default function PagoExito({ pagoData, numeroPedido, token }: PagoExitoProps) {
  const { t } = useTranslation()
  const [compra] = useState(leerCompra)
  const paquetes = compra?.paquetes ?? []
  const numero = numeroCompraVisible(pagoData?.numeroPedido || numeroPedido || undefined, paquetes.length)
  const nombre = compra?.nombre.split(' ')[0] ?? ''

  return (
    <div className="min-h-screen bg-hc-n-50">
      <EncabezadoCompraSegura />
      <main className="mx-auto flex w-full max-w-[480px] flex-col">
        <div className="flex flex-col items-center gap-[10px] px-[16px] pb-[12px] pt-[28px] text-center">
          <span className="flex size-[72px] items-center justify-center rounded-full bg-hc-green-50 text-hc-green-600">
            <IconoFigma src={ICONOS_COMPRA.exito} size={36} />
          </span>
          <h1 className="font-display text-[19px] font-bold text-hc-n-900">
            {nombre ? t('compra.exito.titulo', { nombre }) : t('compra.exito.tituloSinNombre')}
          </h1>
          {numero ? <NumeroPedido numero={numero} /> : null}
          {compra?.correo ? (
            <p className="text-[13px] text-hc-n-500">{t('compra.exito.comprobanteA', { correo: compra.correo })}</p>
          ) : null}
        </div>
        {paquetes.length > 0 ? (
          <div className="px-[16px] pb-[12px] pt-[4px]">
            <PaquetesPedido numeroPedido={numero} paquetes={paquetes} />
          </div>
        ) : null}
        <div className="flex flex-col gap-[10px] px-[16px] pb-[10px] pt-[14px]">
          {token ? (
            <Link to="/mis-pedidos" className="flex items-center justify-center rounded-[12px] bg-hc-red-500 px-[16px] py-[14px] text-[15px] font-semibold text-hc-n-0">
              {t('compra.exito.verPedido')}
            </Link>
          ) : null}
          <Link to="/productos" className="flex items-center justify-center rounded-[12px] border border-hc-n-200 bg-hc-n-0 px-[16px] py-[14px] text-[15px] font-semibold text-hc-n-900">
            {t('compra.exito.seguirComprando')}
          </Link>
        </div>
        {token ? null : <GuardarPedidoEnCuenta />}
      </main>
    </div>
  )
}
