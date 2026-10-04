import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { abrirPreferenciasCookies } from '@/utils/cookieConsent'
import IconoFigma from './IconoFigma'
import { ICONOS_COMPRADOR } from './iconosComprador'
import { RUTA_VENDE } from './header/useHeaderComprador'

type EnlaceFooter = { clave: string; to: string }

const ENLACES: EnlaceFooter[] = [
  { clave: 'sobre', to: '/nosotros' },
  { clave: 'envios', to: '/envios' },
  { clave: 'devoluciones', to: '/devoluciones' },
  { clave: 'contacto', to: '/contacto' },
  { clave: 'terminos', to: '/terminos' },
  { clave: 'privacidad', to: '/privacidad' },
  { clave: 'cookies', to: '/cookies' },
]

function BannerVendedor() {
  const { t } = useTranslation()
  return (
    <Link
      to={RUTA_VENDE}
      className="flex flex-col gap-[2px] bg-hc-blue-900 p-4 lg:flex-row lg:items-center lg:justify-between lg:px-8 lg:py-[22px] xl:px-[120px]"
    >
      <span className="flex flex-col gap-[2px] whitespace-nowrap">
        <span className="text-[12px] text-hc-blue-100 lg:text-[13px]">{t('comprador.footer.bannerPregunta')}</span>
        <span className="flex items-center gap-1 font-display text-[15px] font-semibold text-hc-n-0 lg:text-[18px]">
          <span className="lg:hidden">{t('comprador.footer.bannerTitulo')}</span>
          <span className="hidden lg:inline">{t('comprador.footer.bannerTituloDesktop')}</span>
          <IconoFigma src={ICONOS_COMPRADOR.bannerFlecha} size={16} className="lg:hidden" />
        </span>
      </span>
      <span className="hidden shrink-0 items-center gap-1 rounded-[10px] border border-hc-n-0 px-4 py-[10px] text-[14px] font-semibold text-hc-n-0 lg:flex">
        {t('comprador.footer.bannerCta')}
        <IconoFigma src={ICONOS_COMPRADOR.bannerFlecha} size={16} />
      </span>
    </Link>
  )
}

function EnlacesLegales() {
  const { t } = useTranslation()
  return (
    <p className="text-[12px] leading-[18px] text-hc-n-600 lg:text-[13px] lg:leading-normal">
      {ENLACES.map((enlace, indice) => (
        <span key={enlace.clave}>
          {indice > 0 && ' · '}
          <Link to={enlace.to} className="hover:text-hc-n-900">{t(`comprador.footer.${enlace.clave}`)}</Link>
        </span>
      ))}
      {' · '}
      <button type="button" onClick={abrirPreferenciasCookies} className="hover:text-hc-n-900 bg-transparent p-0 border-0 cursor-pointer">
        {t('comprador.footer.configurarCookies')}
      </button>
    </p>
  )
}

/** Banner "Vendé en HotClick" + footer legal (Figma `7:349`/`7:355` y `9:550`/`9:559`). */
export default function FooterComprador() {
  const { t } = useTranslation()
  return (
    <footer aria-label={t('comprador.footer.aria')} className="mt-auto">
      <BannerVendedor />
      <div className="flex flex-col gap-[6px] bg-hc-n-100 px-4 pb-[18px] pt-4 lg:flex-row lg:items-start lg:justify-between lg:px-8 lg:pb-6 lg:pt-5 xl:px-[120px]">
        <EnlacesLegales />
        <p className="whitespace-nowrap text-[11px] text-hc-n-500 lg:text-[12px]">
          {t('comprador.footer.derechos', { anio: new Date().getFullYear() })}
        </p>
      </div>
    </footer>
  )
}
