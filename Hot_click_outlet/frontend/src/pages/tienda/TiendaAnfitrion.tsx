import { useTranslation } from 'react-i18next'

/**
 * Anfitrión de la vitrina: el nombre puede recortarse; "en HotClick" no.
 */
export default function TiendaAnfitrion({ nombre, className = '' }: { nombre: string; className?: string }) {
  const { t } = useTranslation()
  return (
    <span className={`inline-flex min-w-0 max-w-full items-baseline ${className}`}>
      <span className="truncate">{t('tienda.tiendaDe', { nombre })}</span>
      <span className="shrink-0 whitespace-nowrap">&nbsp;{t('tienda.enHotclick')}</span>
    </span>
  )
}
