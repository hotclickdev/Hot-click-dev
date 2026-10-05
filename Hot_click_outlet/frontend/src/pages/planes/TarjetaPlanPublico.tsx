import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  LANDING_POR_PLAN, rutaRegistroPlan, type AliasPlan,
} from '@/components/comprador/negocios/negociosPublicos'
import { CLAVE_PLAN, detallePlan, textosPlan } from './planesPublicos'

/** Tarjeta de un plan en /planes. Derivada de las tarjetas del directorio (Figma `29:1159`) y los tokens hc. */
export default function TarjetaPlanPublico({ alias }: { alias: AliasPlan }) {
  const { t } = useTranslation()
  const clave = CLAVE_PLAN[alias]
  const nombre = t(`emprende.${clave}Title`)
  const { precio, incluye } = detallePlan(textosPlan(t(`emprende.${clave}Puntos`, { returnObjects: true })))

  return (
    <article id={alias} className="flex flex-col gap-3 rounded-[14px] border border-hc-n-200 bg-hc-n-0 p-4">
      <p className="text-xs font-semibold text-hc-blue-600">{t(`emprende.${clave}Badge`)}</p>
      <h2 className="font-display text-[17px] font-bold leading-[22px] text-hc-n-900">{nombre}</h2>
      <p className="text-sm leading-[21px] text-hc-n-600">{t(`emprende.${clave}Desc`)}</p>
      <p className="font-display text-[26px] font-extrabold leading-8 text-hc-n-900">{t(`planesPublicos.precio.${alias}`)}</p>
      {precio && <p className="text-sm font-semibold leading-[21px] text-hc-n-600">{precio}</p>}
      <ul className="flex flex-col gap-2">
        {incluye.map((punto) => (
          <li key={punto} className="flex gap-2 text-sm leading-[21px] text-hc-n-900">
            <span aria-hidden="true" className="text-hc-success-text">✓</span>
            {punto}
          </li>
        ))}
      </ul>
      <div className="mt-auto flex flex-col gap-2 pt-2">
        <Link
          to={LANDING_POR_PLAN[alias].pagina}
          className="flex h-12 items-center justify-center rounded-[12px] bg-hc-red-500 px-4 text-[15px] font-semibold text-hc-n-0 hover:bg-hc-red-600"
        >
          {t('planesPublicos.conocer', { plan: nombre })}
        </Link>
        <Link
          to={rutaRegistroPlan(alias)}
          className="flex h-12 items-center justify-center rounded-[12px] border border-hc-n-200 bg-hc-n-0 px-4 text-[15px] font-semibold text-hc-n-900"
        >
          {t('planesPublicos.empezar', { plan: nombre })}
        </Link>
      </div>
    </article>
  )
}
