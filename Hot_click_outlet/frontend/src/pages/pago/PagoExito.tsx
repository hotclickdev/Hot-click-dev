import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import IconoFigma from '@/components/comprador/IconoFigma'
import useAuthStore from '@/store/authStore'
import { leerUltimoPedido } from '@/utils/ultimoPedido'
import { ICONOS_PAGO } from './iconosPago'
import { BotonPago, IconoEstado, MarcoPago } from './PiezasPago'
import type { PagoResumen } from './pagoHelpers'

type PagoExitoProps = {
  pagoData: PagoResumen | null
  numeroPedido: string | null
  token: string | null
}

function primerNombre(nombre: string | null | undefined): string {
  return (nombre ?? '').trim().split(/\s+/)[0] ?? ''
}

/** Confirmación del pago: Figma `29:1932` (móvil). Sin frame de escritorio: misma columna centrada. */
export default function PagoExito({ pagoData, numeroPedido, token }: PagoExitoProps) {
  const { t } = useTranslation()
  const userName = useAuthStore((s) => s.userName)
  const userEmail = useAuthStore((s) => s.userEmail)
  const [copiado, setCopiado] = useState(false)
  // Lectura única al montar: el resumen del pedido se guardó al pagar (solo sesión del navegador).
  const [ultimo] = useState(() => leerUltimoPedido())

  const pedido = pagoData?.numeroPedido || numeroPedido || ''
  const nombre = primerNombre(token ? userName : ultimo?.nombre) || primerNombre(ultimo?.nombre)
  const correo = (token ? userEmail : ultimo?.correo) || ultimo?.correo || ''
  const paquetes = ultimo?.paquetes ?? []
  const rutaPedido = token ? '/mis-pedidos' : pagoData?.tokenSeguimiento ? `/seguimiento/${pagoData.tokenSeguimiento}` : null

  async function copiar() {
    try {
      await navigator.clipboard.writeText(pedido)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 1_800)
    } catch {
      /* el portapapeles puede estar bloqueado: el número sigue visible */
    }
  }

  return (
    <MarcoPago>
      <div className="flex flex-col items-center gap-[10px] px-4 pb-3 pt-7 text-center leading-[normal]">
        <IconoEstado src={ICONOS_PAGO.exitoCheck} tamano={36} circulo={72} clase="bg-hc-success-bg text-hc-success" />
        <h1 className="font-display text-[19px] font-bold leading-[normal] tracking-normal text-hc-n-900">
          {nombre ? t('payment.exito.titulo', { nombre }) : t('payment.exito.tituloSinNombre')}
        </h1>
        {pedido && (
          <div className="flex items-center justify-center gap-[6px]">
            <p className="text-[14px] text-hc-n-600">{t('payment.exito.pedido')}</p>
            <p className="font-mono text-[15px] font-medium text-hc-n-900">{pedido}</p>
            <button type="button" onClick={copiar} aria-label={t('payment.exito.copiar')} className="relative flex size-[15px] items-center justify-center text-hc-blue-600 after:absolute after:-inset-3">
              <IconoFigma src={ICONOS_PAGO.copiarPedido} size={15} />
            </button>
            {copiado && <span role="status" className="text-[12px] font-semibold text-hc-success">{t('payment.exito.copiado')}</span>}
          </div>
        )}
        {correo && <p className="text-[13px] text-hc-n-500">{t('payment.exito.comprobante', { correo })}</p>}
      </div>

      {paquetes.length > 0 && (
        <section className="px-4 pb-3 pt-1">
          <div className="flex flex-col overflow-hidden rounded-[14px] border border-hc-n-200 bg-hc-n-0 leading-[normal]">
            <h2 className="bg-hc-n-50 px-[14px] py-3 font-display text-[15px] font-bold tracking-normal text-hc-n-900">
              {t('payment.exito.paquetesTitulo', { pedido, count: paquetes.length })}
            </h2>
            {paquetes.map((paquete) => (
              <div key={paquete.negocio} className="flex items-center gap-[10px] border-t border-hc-n-200 px-[14px] py-3">
                <span className="flex size-[34px] shrink-0 items-center justify-center rounded-[10px] bg-hc-blue-50 text-hc-blue-600">
                  <IconoFigma src={ICONOS_PAGO.paqueteCaja} size={18} />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-px">
                  <p className="text-[14px] font-semibold text-hc-n-900">{paquete.negocio}</p>
                  <p className="text-[12px] leading-4 text-hc-n-500">
                    {t('cart.paqueteProductos', { count: paquete.productos })} · {t(`checkout.f.metodoResumen.${paquete.metodoEnvio}`)}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-hc-warning-bg px-2 py-[3px] text-[11px] font-semibold text-hc-warning">{t('payment.exito.preparando')}</span>
              </div>
            ))}
            <p className="flex items-center gap-2 border-t border-hc-n-200 px-[14px] py-3 text-[12px] leading-4 text-hc-n-600">
              <IconoFigma src={ICONOS_PAGO.avisoCorreo} size={16} className="text-hc-n-600" />
              <span className="min-w-0 flex-1">{t('payment.exito.avisoGuias')}</span>
            </p>
          </div>
        </section>
      )}

      <div className="flex flex-col gap-[10px] px-4 pb-[10px] pt-[14px]">
        {rutaPedido && <BotonPago to={rutaPedido} variante="primario">{t('payment.exito.verPedido')}</BotonPago>}
        <BotonPago to="/productos" variante={rutaPedido ? 'secundario' : 'primario'}>{t('checkout.continueShopping')}</BotonPago>
      </div>

      {/* Funciones previas que Figma `29:1932` no dibuja ni elimina: garantía de 40 días (política de InformacionPage) e imprimir. */}
      <div className="flex flex-col items-center gap-1 px-4 pb-3 pt-1 text-center leading-[normal]">
        <p className="text-[13px] font-semibold text-hc-success">{t('payment.exito.garantia')}</p>
        <p className="text-[12px] text-hc-n-500">{t('payment.exito.garantiaAyuda')}</p>
        <button type="button" onClick={() => globalThis.print()} className="mt-1 text-[13px] font-medium text-hc-n-600 underline-offset-2 hover:underline">
          {t('payment.print')}
        </button>
      </div>

      {!token && (
        <section className="px-4 pb-6 pt-[6px]">
          <div className="flex flex-col gap-[10px] rounded-[16px] bg-hc-blue-50 p-4 leading-[normal]">
            <h2 className="flex items-center gap-[10px] font-sans text-[14px] font-semibold tracking-normal text-hc-blue-600">
              <IconoFigma src={ICONOS_PAGO.cuentaUsuario} size={20} />
              {t('payment.exito.guardarTitulo')}
            </h2>
            <p className="text-[13px] leading-[18px] text-hc-n-600">{t('payment.exito.guardarTexto')}</p>
            <BotonPago to="/registro" variante="azul">{t('payment.exito.guardarBoton')}</BotonPago>
          </div>
        </section>
      )}
    </MarcoPago>
  )
}
