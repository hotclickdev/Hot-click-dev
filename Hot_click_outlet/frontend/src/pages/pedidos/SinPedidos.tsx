import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import IconoFigma from '@/components/comprador/IconoFigma'
import { ICONOS_PEDIDOS } from './iconosPedidos'

/** Estado vacío de «Mis pedidos» (Figma `45:1854` y `45:1861`). */
export default function SinPedidos() {
  const { t } = useTranslation()
  return (
    <section className="mx-auto w-full max-w-[720px]">
      <div className="flex flex-col items-center gap-[12px] px-[20px] pb-[8px] pt-[40px] text-center">
        <span className="flex size-[64px] items-center justify-center rounded-full bg-hc-n-100 text-hc-n-600">
          <IconoFigma src={ICONOS_PEDIDOS.sinPedidos} size={28.16} />
        </span>
        <h2 className="font-display text-[20px] font-bold text-hc-n-900">{t('misPedidos.vacio.titulo')}</h2>
        <p className="text-[14px] leading-[20px] text-hc-n-600">{t('misPedidos.vacio.texto')}</p>
      </div>
      <div className="flex flex-col gap-[14px] px-[20px] pb-[8px] pt-[12px]">
        <Link to="/productos" className="flex w-full items-center justify-center rounded-[12px] bg-hc-red-500 py-[14px] text-[15px] font-semibold text-hc-n-0">
          {t('misPedidos.vacio.empezar')}
        </Link>
        <div className="flex flex-col gap-[4px] rounded-[12px] bg-hc-n-50 px-[14px] py-[12px]">
          <p className="text-[13px] font-semibold text-hc-n-900">{t('misPedidos.vacio.invitadoTitulo')}</p>
          <p className="text-[12px] leading-[17px] text-hc-n-600">{t('misPedidos.vacio.invitadoTexto')}</p>
        </div>
      </div>
    </section>
  )
}
