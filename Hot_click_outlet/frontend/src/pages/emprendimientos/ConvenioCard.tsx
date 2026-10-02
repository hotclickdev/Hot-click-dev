import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import IconoFigma from '@/components/comprador/IconoFigma'
import directorioChevron from '@/assets/figma/tienda/directorio-chevron.svg'
import { inicialesNegocio } from '@/pages/tienda/tiendaHelpers'
import { RUTA_CATALOGO_EMPRENDIMIENTOS } from '@/utils/emprendimientoRutas'

export type ConvenioPublico = {
  id?: number | string
  nombre?: string
  logoUrl?: string | null
  descripcion?: string | null
  urlWeb?: string | null
}

/** Fondos de las iniciales cuando el negocio no tiene logo (azul 900, rojo 500 y verde del Figma `29:1201`). */
const FONDOS_INICIALES = ['var(--hc-blue-900)', 'var(--hc-red-500)', 'var(--hc-success)']

function LogoNegocio({ nombre, logoUrl, indice }: { nombre: string; logoUrl?: string | null; indice: number }) {
  if (logoUrl) {
    return <img src={logoUrl} alt="" className="size-12 shrink-0 rounded-[14px] border border-hc-n-200 bg-hc-n-0 object-contain p-1" />
  }
  return (
    <div
      aria-hidden="true"
      className="flex size-12 shrink-0 items-center justify-center rounded-[14px] font-display text-base font-extrabold leading-[normal] text-white"
      style={{ backgroundColor: FONDOS_INICIALES[indice % FONDOS_INICIALES.length] }}
    >
      {inicialesNegocio(nombre)}
    </div>
  )
}

/**
 * Tarjeta de negocio del directorio (Figma `29:1199`): logo, nombre, descripción y pie con enlaces.
 * Faltan del diseño las miniaturas, la ciudad y el conteo de productos: el listado de convenios no los trae.
 */
export default function ConvenioCard({ convenio, indice }: { convenio: ConvenioPublico; indice: number }) {
  const { t } = useTranslation()
  const nombre = convenio.nombre ?? ''
  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-hc-n-200 bg-hc-n-0 p-[14px]">
      <Link to={RUTA_CATALOGO_EMPRENDIMIENTOS} className="flex items-center gap-3" aria-label={t('emprendimientos.verProductosAria', { nombre })}>
        <LogoNegocio nombre={nombre} logoUrl={convenio.logoUrl} indice={indice} />
        <span className="flex min-w-0 flex-1 flex-col gap-[2px] leading-[normal]">
          <span className="truncate font-display text-base font-bold leading-[normal] text-hc-n-900">{nombre}</span>
          {convenio.descripcion && <span className="truncate text-xs leading-[normal] text-hc-n-500">{convenio.descripcion}</span>}
        </span>
        <IconoFigma src={directorioChevron} size={18} className="text-hc-n-400" />
      </Link>
      <div className="flex items-center justify-between text-[13px] font-semibold leading-[normal]">
        {convenio.urlWeb ? (
          <a
            href={convenio.urlWeb}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t('emprendimientos.sitioExternoAria', { nombre })}
            className="text-hc-n-900"
          >
            {t('emprendimientos.sitioExterno')}
          </a>
        ) : <span />}
        <Link to={RUTA_CATALOGO_EMPRENDIMIENTOS} className="text-hc-blue-600">{t('emprendimientos.verProductos')}</Link>
      </div>
    </article>
  )
}
