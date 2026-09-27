import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import IconoFigma from '@/components/comprador/IconoFigma'
import { ICONOS_COMPRA } from '@/pages/checkout/iconosCompra'

/** Tarjeta para invitados del pago exitoso (Figma `29:1988`). */
export default function GuardarPedidoEnCuenta() {
  const { t } = useTranslation()
  return (
    <div className="px-[16px] pb-[24px] pt-[6px]">
      <div className="flex flex-col gap-[10px] rounded-[16px] bg-hc-blue-50 p-[16px]">
        <p className="flex items-center gap-[10px] text-[14px] font-semibold text-hc-blue-600">
          <IconoFigma src={ICONOS_COMPRA.persona} size={20} className="shrink-0" />
          {t('compra.exito.guardarTitulo')}
        </p>
        <p className="text-[13px] leading-[18px] text-hc-n-600">{t('compra.exito.guardarTexto')}</p>
        <Link to="/registro" className="flex items-center justify-center rounded-[12px] bg-hc-blue-600 px-[16px] py-[14px] text-[15px] font-semibold text-hc-n-0">
          {t('compra.exito.crearCuenta')}
        </Link>
      </div>
    </div>
  )
}
