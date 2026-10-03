import { useTranslation } from 'react-i18next'
import EstadoVacio from '@/components/comprador/estados/EstadoVacio'
import { IconoBuscarNada } from '@/components/comprador/estados/iconosEstado'

/** Búsqueda o filtro sin resultados en la tienda (derivado de Figma: estados vacíos `45:2198`). */
export default function TiendaCatalogoBusquedaVacia({ onLimpiar }: { onLimpiar: () => void }) {
  const { t } = useTranslation()
  return (
    <EstadoVacio
      icono={<IconoBuscarNada />}
      titulo={t('tienda.busquedaVaciaTitulo')}
      texto={t('tienda.busquedaVaciaTexto')}
      secundaria={{ texto: t('tienda.verTodo'), onClick: onLimpiar }}
    />
  )
}
