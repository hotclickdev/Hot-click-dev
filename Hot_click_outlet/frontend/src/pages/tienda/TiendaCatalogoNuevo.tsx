import { useTranslation } from 'react-i18next'
import EstadoVacio from '@/components/comprador/estados/EstadoVacio'
import { IconoPaquete } from '@/components/comprador/estados/iconosEstado'

/** Tienda pública sin catálogo: tienda nueva, no catálogo roto (derivado de Figma: estados vacíos `45:1692`). */
export default function TiendaCatalogoNuevo({ nombre }: { nombre: string }) {
  const { t } = useTranslation()
  return (
    <EstadoVacio
      icono={<IconoPaquete />}
      titulo={t('tienda.nuevaTitulo')}
      texto={t('tienda.nuevaTexto', { nombre })}
      accion={{ texto: t('tienda.verProductosHotclick'), to: '/productos' }}
    />
  )
}
