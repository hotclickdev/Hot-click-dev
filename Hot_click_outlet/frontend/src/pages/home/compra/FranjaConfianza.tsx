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
    <section aria-labelledby="home-confianza" className="flex flex-col gap-[14px] px-4 pb-5 pt-7 lg:px-8 lg:py-12 xl:px-[120px]">
      <h2 id="home-confianza" className="sr-only">{t('home.compra.confianzaTitulo')}</h2>
      <ul className="flex flex-col overflow-hidden rounded-[16px] border border-hc-n-200 bg-hc-n-0 lg:flex-row">
        {PROMESAS.map((promesa, i) => {
          const contenido = (
            <>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-hc-blue-50 text-hc-blue-600 lg:size-10">
                <IconoFigma src={promesa.icono} size={18} />
              </span>
              <span className="flex flex-col gap-px">
                <span className="text-[14px] font-semibold text-hc-n-900">{t(`home.compra.promesa.${promesa.clave}Titulo`)}</span>
                <span className="text-[12px] text-hc-n-500">{t(`home.compra.promesa.${promesa.clave}Texto`)}</span>
              </span>
            </>
          )
          const clases = 'flex items-center gap-3 px-[14px] py-3 lg:px-5 lg:py-[18px]'
          return (
            <li key={promesa.clave} className={`flex-1 ${i > 0 ? 'border-t border-hc-n-200 lg:border-l lg:border-t-0' : ''}`}>
              {'to' in promesa ? <Link to={promesa.to} className={clases}>{contenido}</Link> : <div className={clases}>{contenido}</div>}
            </li>
          )
        })}
      </ul>
      <p className="flex flex-wrap items-center gap-2 text-[13px] text-hc-n-600 lg:text-[14px]">
        <IconoFigma src={ICONOS_COMPRADOR.serviciosHot} size={18} className="text-hc-n-600" />
        {t('home.compra.noLoEncontras')}
        <Link to="/servicios" className="font-semibold text-hc-blue-600">{t('home.compra.pedilo')}</Link>
      </p>
    </section>
  )
}
