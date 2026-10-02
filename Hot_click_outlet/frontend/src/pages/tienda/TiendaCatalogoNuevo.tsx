import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import TiendaPlaceholder from './TiendaPlaceholder'

/** Vacío de tienda pública sin catálogo: tienda nueva, no catálogo roto. */
export default function TiendaCatalogoNuevo({ nombre }: { nombre: string }) {
  const { t } = useTranslation()
  return (
    <div className="text-center py-16 px-4">
      <TiendaPlaceholder className="mx-auto h-12 w-12 mb-4 text-[var(--t-muted)]" />
      <h2 className="text-xl font-bold text-[var(--t-text)]">{t('tienda.nuevaTitulo')}</h2>
      <p className="text-sm mt-2 max-w-md mx-auto text-[var(--t-muted)] leading-relaxed">
        {t('tienda.nuevaTexto', { nombre })}
      </p>
      <Link
        to="/productos"
        className="inline-flex items-center justify-center mt-6 px-5 min-h-11 rounded-lg text-white text-sm font-semibold"
        style={{ backgroundColor: 'var(--t-primary)' }}
      >
        {t('tienda.verProductosHotclick')}
      </Link>
    </div>
  )
}
