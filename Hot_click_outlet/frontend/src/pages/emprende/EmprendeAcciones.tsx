import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { RUTA_CATALOGO_EMPRENDIMIENTOS, RUTA_EMPRENDIMIENTOS } from '@/utils/emprendimientoRutas'
import { RUTA_EMPRENDEDOR } from '@/utils/planPaths'

const btnPrimario = {
  backgroundColor: 'var(--hc-primary)',
  color: '#fff',
}

const btnSecundario = {
  backgroundColor: 'var(--hc-surface)',
  color: 'var(--hc-text)',
  border: '1px solid var(--hc-border)',
}

/** CTAs: crear negocio o Sistema, catálogo interno, directorio de aliados. */
export default function EmprendeAcciones({ yaEsDuenio }: { yaEsDuenio: boolean }) {
  const { t } = useTranslation()
  const primarioTo = yaEsDuenio ? RUTA_EMPRENDEDOR : '/registro-empresa'
  const primarioLabel = yaEsDuenio ? t('emprende.ctaSistema') : t('emprende.ctaCrear')

  return (
    <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 mt-10">
      <Link
        to={primarioTo}
        className="inline-flex items-center justify-center px-5 py-3 rounded-xl text-sm font-semibold min-h-[44px]"
        style={btnPrimario}
      >
        {primarioLabel}
      </Link>
      <Link
        to={RUTA_CATALOGO_EMPRENDIMIENTOS}
        className="inline-flex items-center justify-center px-5 py-3 rounded-xl text-sm font-semibold min-h-[44px]"
        style={btnSecundario}
      >
        {t('emprende.ctaCatalogo')}
      </Link>
      <Link
        to={RUTA_EMPRENDIMIENTOS}
        className="inline-flex items-center justify-center px-5 py-3 rounded-xl text-sm font-semibold min-h-[44px]"
        style={btnSecundario}
      >
        {t('emprende.ctaAliados')}
      </Link>
    </div>
  )
}
