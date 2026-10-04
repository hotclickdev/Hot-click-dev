import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import MainLayout from '@/layouts/MainLayout'
import IconoFigma from '@/components/comprador/IconoFigma'
import { ICONOS_CHECKOUT } from '@/pages/checkout/iconosCheckout'
import { WHATSAPP } from '@/pages/checkout/checkoutHelpers'
import { leerUltimoPedido } from '@/utils/ultimoPedido'
import revisionGuia from '@/assets/figma/pago/revision-guia.svg'
import revisionRecibido from '@/assets/figma/pago/revision-recibido.svg'
import revisionReloj from '@/assets/figma/pago/revision-reloj.svg'
import revisionSoporte from '@/assets/figma/pago/revision-soporte.svg'
import revisionVerificando from '@/assets/figma/pago/revision-verificando.svg'
import { BotonPago, IconoEstado } from './PiezasPago'

type PagoEnRevisionProps = {
  titulo: string
  texto: string
  numeroPedido?: string
  token: string | null
  /** Acción propia del pago por SINPE: avisar por WhatsApp con el comprobante. */
  onWhatsApp?: () => void
}

type Paso = { icono: string; color: string; titulo: string; sub: string; activo: boolean }

/**
 * "Tu pago está siendo revisado": Figma `45:1640` (móvil). Se usa tras subir el comprobante SINPE
 * y cuando la pasarela tarda en confirmar. Sin frame de escritorio: misma columna centrada.
 */
export default function PagoEnRevision({ titulo, texto, numeroPedido, token, onWhatsApp }: PagoEnRevisionProps) {
  const { t } = useTranslation()
  const paquetes = leerUltimoPedido()?.paquetes.length ?? 0
  const pasos: Paso[] = [
    { icono: revisionRecibido, color: 'text-hc-success', titulo: t('payment.revision.recibido'), sub: t('payment.revision.ahora'), activo: true },
    { icono: revisionVerificando, color: 'text-hc-warning', titulo: t('payment.revision.verificamos'), sub: t('payment.revision.minutos'), activo: true },
    { icono: ICONOS_CHECKOUT.campoCorreo, color: 'text-hc-n-600', titulo: t('payment.revision.correo'), sub: t('payment.revision.correoSub'), activo: false },
    { icono: revisionGuia, color: 'text-hc-n-600', titulo: t('payment.revision.guia'), sub: paquetes > 0 ? t('payment.fallo.paquetesN', { count: paquetes }) : t('payment.revision.guiaSub'), activo: false },
  ]
  const textoWa = encodeURIComponent(t('payment.fallo.whatsappTexto', { pedido: numeroPedido ?? '' }))

  return (
    <MainLayout variante="propia" encabezadoEscritorio="compacto" barraInferior={false}>
      <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col lg:min-h-0 lg:py-10">
        <div className="flex flex-col items-center gap-[14px] px-4 pb-6 pt-10 text-center leading-[normal]">
          <IconoEstado src={revisionReloj} tamano={34} circulo={72} clase="bg-hc-warning-bg text-hc-warning" />
          <h1 className="font-display text-[21px] font-bold leading-[normal] tracking-normal text-hc-n-900">{titulo}</h1>
          <p className="text-[14px] leading-5 text-hc-n-600">{texto}</p>
          {numeroPedido && (
            <div className="flex w-full items-start justify-center gap-[6px] rounded-[10px] border border-hc-n-200 bg-hc-n-0 py-[10px]">
              <p className="text-[13px] text-hc-n-600">{t('payment.revision.pedido')}</p>
              <p className="font-mono text-[14px] font-medium text-hc-n-900">{numeroPedido}</p>
            </div>
          )}
          <ol className="flex w-full flex-col overflow-hidden rounded-[14px] border border-hc-n-200 bg-hc-n-0 text-left">
            {pasos.map((paso, i) => (
              <li key={paso.titulo} className={`flex items-center gap-3 px-[14px] py-[11px] ${i > 0 ? 'border-t border-hc-n-200' : ''}`}>
                <IconoFigma src={paso.icono} size={18} className={paso.color} />
                <div className="flex min-w-0 flex-1 flex-col gap-px">
                  <p className={`text-[13px] font-semibold ${paso.activo ? 'text-hc-n-900' : 'text-hc-n-600'}`}>{paso.titulo}</p>
                  <p className="text-[12px] text-hc-n-600">{paso.sub}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="text-[12px] leading-4 text-hc-n-600">{t('payment.revision.sinConfirmacion')}</p>
        </div>
        <div className="flex-1" />
        <div className="flex flex-col items-center gap-[10px] rounded-[14px] border-t border-hc-n-200 bg-hc-n-0 px-4 pb-6 pt-3">
          <BotonPago to="/productos" variante="primario" compacto>{t('payment.revision.seguir')}</BotonPago>
          {onWhatsApp ? (
            <BotonPago onClick={onWhatsApp} variante="secundario" compacto>
              <IconoFigma src={revisionSoporte} size={18} className="text-hc-n-900" />
              {t('payment.revision.soporte')}
            </BotonPago>
          ) : (
            <a
              href={`https://wa.me/${WHATSAPP}?text=${textoWa}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-[12px] border border-hc-n-200 bg-hc-n-0 px-4 py-[13px] text-[14px] font-semibold leading-[normal] text-hc-n-900"
            >
              <IconoFigma src={revisionSoporte} size={18} className="text-hc-n-900" />
              {t('payment.revision.soporte')}
            </a>
          )}
          <Link to={token ? '/mis-pedidos' : '/registro'} className="text-[13px] font-semibold leading-[normal] text-hc-blue-600">
            {token ? t('payment.revision.verPedidos') : t('payment.revision.crearCuenta')}
          </Link>
        </div>
      </div>
    </MainLayout>
  )
}
