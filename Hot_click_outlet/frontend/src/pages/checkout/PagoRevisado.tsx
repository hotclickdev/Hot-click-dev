import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import IconoFigma from '@/components/comprador/IconoFigma'
import { WHATSAPP } from './checkoutHelpers'
import { ICONOS_COMPRA } from './iconosCompra'

type PagoRevisadoProps = {
  numeroPedido: string
  cantidadPaquetes: number
  esInvitado: boolean
  /** Textos para pagos con tarjeta aún sin confirmar; por defecto, los de SINPE con comprobante. */
  titulo?: string
  texto?: string
  pasoInicial?: string
}

type PasoSiguiente = { icono: string; colorIcono: string; titulo: string; detalle: string; activo: boolean }

function FilaPaso({ paso, primero }: { paso: PasoSiguiente; primero: boolean }) {
  return (
    <li className={`flex items-center gap-[12px] px-[14px] py-[11px] ${primero ? '' : 'border-t border-hc-n-200'}`}>
      <span className={`flex ${paso.colorIcono}`}><IconoFigma src={paso.icono} size={18} /></span>
      <span className="flex min-w-0 flex-1 flex-col gap-px">
        <span className={`text-[13px] font-semibold ${paso.activo ? 'text-hc-n-900' : 'text-hc-n-600'}`}>{paso.titulo}</span>
        <span className="text-[12px] text-hc-n-600">{paso.detalle}</span>
      </span>
    </li>
  )
}

/** Pago SINPE con comprobante subido, pendiente de verificación (Figma `45:1640`). */
export default function PagoRevisado({ numeroPedido, cantidadPaquetes, esInvitado, titulo, texto, pasoInicial }: PagoRevisadoProps) {
  const { t } = useTranslation()
  const pasos: PasoSiguiente[] = [
    {
      icono: ICONOS_COMPRA.comprobante, colorIcono: 'text-hc-success-text',
      titulo: pasoInicial ?? t('compra.revisado.recibido'), detalle: t('compra.revisado.ahora'), activo: true,
    },
    { icono: ICONOS_COMPRA.reloj, colorIcono: 'text-hc-warning', titulo: t('compra.revisado.verificamos'), detalle: t('compra.revisado.unosMinutos'), activo: true },
    { icono: ICONOS_COMPRA.correo, colorIcono: 'text-hc-n-600', titulo: t('compra.revisado.confirmamos'), detalle: t('compra.revisado.cadaTienda'), activo: false },
    {
      icono: ICONOS_COMPRA.guia, colorIcono: 'text-hc-n-600', titulo: t('compra.revisado.guias'),
      detalle: t('compra.revisado.paquetes', { count: cantidadPaquetes }), activo: false,
    },
  ]
  const mensajeSoporte = encodeURIComponent(t('compra.revisado.mensajeSoporte', { numero: numeroPedido }))

  return (
    <div className="flex min-h-screen flex-col bg-hc-n-50">
      <div className="mx-auto flex w-full max-w-[480px] flex-1 flex-col">
        <div className="flex flex-col items-center gap-[14px] px-[16px] pb-[24px] pt-[40px]">
          <span className="flex size-[72px] items-center justify-center rounded-full bg-hc-warning-bg text-hc-warning">
            <IconoFigma src={ICONOS_COMPRA.revision} size={34} />
          </span>
          <h1 className="text-center font-display text-[21px] font-bold text-hc-n-900">{titulo ?? t('compra.revisado.titulo')}</h1>
          <p className="text-center text-[14px] leading-[20px] text-hc-n-600">{texto ?? t('compra.revisado.texto')}</p>
          <p className="flex w-full items-center justify-center gap-[6px] rounded-[10px] border border-hc-n-200 bg-hc-n-0 py-[10px]">
            <span className="text-[13px] text-hc-n-600">{t('compra.revisado.pedido')}</span>
            <span className="font-mono text-[14px] font-medium text-hc-n-900">{numeroPedido}</span>
          </p>
          <ol className="w-full overflow-hidden rounded-[14px] border border-hc-n-200 bg-hc-n-0">
            {pasos.map((paso, indice) => <FilaPaso key={paso.titulo} paso={paso} primero={indice === 0} />)}
          </ol>
          <p className="text-center text-[12px] leading-[16px] text-hc-n-600">{t('compra.revisado.nota')}</p>
        </div>
        <div className="flex-1" />
        <div className="flex flex-col items-center gap-[10px] rounded-[14px] border-t border-hc-n-200 bg-hc-n-0 px-[16px] pb-[24px] pt-[12px]">
          <Link to="/productos" className="flex w-full items-center justify-center rounded-[12px] bg-hc-red-500 px-[16px] py-[13px] text-[14px] font-semibold text-hc-n-0">
            {t('compra.revisado.seguirComprando')}
          </Link>
          <a
            href={`https://wa.me/${WHATSAPP}?text=${mensajeSoporte}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-[8px] rounded-[12px] border border-hc-n-200 bg-hc-n-0 px-[16px] py-[13px] text-[14px] font-semibold text-hc-n-900"
          >
            <IconoFigma src={ICONOS_COMPRA.whatsapp} size={18} />
            {t('compra.revisado.soporte')}
          </a>
          {esInvitado ? (
            <Link to="/registro" className="text-[13px] font-semibold text-hc-blue-600">{t('compra.revisado.crearCuenta')}</Link>
          ) : null}
        </div>
      </div>
    </div>
  )
}
