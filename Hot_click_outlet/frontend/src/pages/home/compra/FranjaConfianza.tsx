import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import IconoFigma from '@/components/comprador/IconoFigma'
import { ICONOS_COMPRADOR } from '@/components/comprador/iconosComprador'

const PROMESAS = [
  { clave: 'envio', icono: ICONOS_COMPRADOR.promesaEnvio },
  { clave: 'pago', icono: ICONOS_COMPRADOR.promesaPago },
  { clave: 'sinCuenta', icono: ICONOS_COMPRADOR.promesaSinCuenta },
  { clave: 'devoluciones', icono: ICONOS_COMPRADOR.promesaDevoluciones, to: '/devoluciones' },
] as const

/** Promesas de compra + salida a Servicios HOT (Figma `7:309` y `9:505`). */
export default function FranjaConfianza() {
  const { t } = useTranslation()
  return (
    <section aria-labelledby="home-confianza" className="flex flex-col gap-[14px] px-4 pb-5 pt-7 lg:gap-4 lg:px-8 lg:py-12 xl:px-[max(120px,calc((100%_-_1200px)/2))]">
      <h2 id="home-confianza" className="sr-only">{t('home.compra.confianzaTitulo')}</h2>
      <ul className="flex flex-col overflow-hidden rounded-[16px] border border-hc-n-200 bg-hc-n-0 lg:flex-row">
        {PROMESAS.map((promesa, i) => {
          const contenido = (
            <>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-hc-blue-50 text-hc-blue-600 lg:size-10">
                <span className="flex size-[18px] lg:size-5">
                  <IconoFigma src={promesa.icono} size="100%" />
                </span>
              </span>
              <span className="flex min-w-0 flex-col gap-px leading-[normal] lg:gap-[2px]">
                <span className="truncate text-[14px] font-semibold text-hc-n-900">{t(`home.compra.promesa.${promesa.clave}Titulo`)}</span>
                <span className="truncate text-[12px] text-hc-n-600">{t(`home.compra.promesa.${promesa.clave}Texto`)}</span>
              </span>
            </>
          )
          const clases = 'flex items-center gap-3 px-[14px] py-3 lg:px-5 lg:py-[18px]'
          return (
            <li key={promesa.clave} className={`lg:min-w-0 lg:flex-1 lg:basis-0 ${i > 0 ? 'border-t border-hc-n-200 lg:border-l lg:border-t-0' : ''}`}>
              {'to' in promesa ? <Link to={promesa.to} className={clases}>{contenido}</Link> : <div className={clases}>{contenido}</div>}
            </li>
          )
        })}
      </ul>
      <p className="flex items-center gap-2 whitespace-nowrap text-[13px] leading-[normal] text-hc-n-600 lg:text-[14px]">
        <IconoFigma src={ICONOS_COMPRADOR.serviciosHot} size={18} className="text-hc-n-600" />
        <span className="lg:hidden">{t('home.compra.noLoEncontras')}</span>
        <span className="hidden lg:inline">{t('home.compra.noLoEncontrasDesktop')}</span>
        <Link to="/servicios" className="font-semibold text-hc-blue-600">
          <span className="lg:hidden">{t('home.compra.pedilo')}</span>
          <span className="hidden lg:inline">{t('home.compra.pediloDesktop')}</span>
        </Link>
      </p>
    </section>
  )
}
