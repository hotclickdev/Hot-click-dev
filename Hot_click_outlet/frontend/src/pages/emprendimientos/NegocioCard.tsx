import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import IconoFigma from '@/components/comprador/IconoFigma'
import directorioChevron from '@/assets/figma/tienda/directorio-chevron.svg'
import { inicialesNegocio } from '@/pages/tienda/tiendaHelpers'
import type { NegocioDirectorio } from './directorioHelpers'

/** Fondos de las iniciales (azul 900, rojo 500 y verde del Figma `29:1159`). */
const FONDOS_INICIALES = ['var(--hc-blue-900)', 'var(--hc-red-500)', 'var(--hc-success)']

/** Tarjeta de negocio del directorio (Figma `29:1159`): iniciales, nombre, rubro · ciudad, 3 fotos, conteo y "Ver tienda". */
export default function NegocioCard({ negocio, indice }: { negocio: NegocioDirectorio; indice: number }) {
  const { t } = useTranslation()
  const ruta = `/tienda/${negocio.slug}`
  const subtitulo = [negocio.rubro, negocio.ciudad].filter(Boolean).join(' · ')
  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-hc-n-200 bg-hc-n-0 p-[14px]">
      <Link to={ruta} className="flex items-center gap-3" aria-label={t('emprendimientos.verTiendaAria', { nombre: negocio.nombre })}>
        <span
          aria-hidden="true"
          className="flex size-12 shrink-0 items-center justify-center rounded-[14px] font-display text-base font-extrabold leading-[normal] text-white"
          style={{ backgroundColor: FONDOS_INICIALES[indice % FONDOS_INICIALES.length] }}
        >
          {inicialesNegocio(negocio.nombre)}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-[2px] leading-[normal]">
          <span className="truncate font-display text-base font-bold leading-[normal] text-hc-n-900">{negocio.nombre}</span>
          {subtitulo && <span className="truncate text-xs leading-[normal] text-hc-n-600">{subtitulo}</span>}
        </span>
        <IconoFigma src={directorioChevron} size={18} className="text-hc-n-400" />
      </Link>
      {negocio.imagenes.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {negocio.imagenes.map((src) => (
            <img key={src} src={src} alt="" loading="lazy" className="aspect-[104/84] w-full rounded-lg bg-hc-n-100 object-cover" />
          ))}
        </div>
      )}
      <div className="flex items-center justify-between text-[13px] font-semibold leading-[normal]">
        <span className="text-hc-n-900">{t('emprendimientos.productos', { count: negocio.cantidad })}</span>
        <Link to={ruta} className="text-hc-blue-600">{t('emprendimientos.verTienda')}</Link>
      </div>
    </article>
  )
}
