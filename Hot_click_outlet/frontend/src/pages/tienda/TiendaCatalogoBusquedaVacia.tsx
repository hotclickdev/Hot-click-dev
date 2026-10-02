import { useTranslation } from 'react-i18next'

/** Búsqueda o filtro sin resultados en la tienda del vendedor. */
export default function TiendaCatalogoBusquedaVacia({ onLimpiar }: { onLimpiar: () => void }) {
  const { t } = useTranslation()
  return (
    <div className="text-center py-16 px-4">
      <p className="text-[var(--t-text)] font-semibold">{t('tienda.busquedaVaciaTitulo')}</p>
      <p className="text-sm mt-2 text-[var(--t-muted)]">{t('tienda.busquedaVaciaTexto')}</p>
      <button
        type="button"
        onClick={onLimpiar}
        className="inline-flex items-center justify-center mt-6 px-5 min-h-11 rounded-lg text-sm font-semibold border border-[var(--t-border)] text-[var(--t-text)] bg-[var(--t-surface)]"
      >
        {t('tienda.verTodo')}
      </button>
    </div>
  )
}
