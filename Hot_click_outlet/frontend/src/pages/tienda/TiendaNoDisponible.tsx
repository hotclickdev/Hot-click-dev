import { useTranslation } from 'react-i18next'
import EstadoVacio from '@/components/comprador/estados/EstadoVacio'
import { IconoBuscarNada } from '@/components/comprador/estados/iconosEstado'
import MarcaComprador from '@/components/comprador/header/MarcaComprador'
import { estiloMarcaTienda } from './tiendaTheme'

/**
 * Slug sin tienda pública: no existe o no está publicada; el API responde 404 en ambos casos
 * (derivado de Figma: 404 `45:2198`, con la barra de marca del comprador).
 */
export default function TiendaNoDisponible() {
  const { t } = useTranslation()
  return (
    <div className="hc-tenant-theme flex min-h-screen flex-col bg-hc-n-50" style={estiloMarcaTienda(null)}>
      <div role="banner" className="flex h-14 items-center justify-center border-b border-hc-n-200 bg-hc-n-0 px-4">
        <MarcaComprador tamano="centrada" />
      </div>
      <main className="flex flex-1 items-center justify-center">
        <EstadoVacio
          nivel="h1"
          icono={<IconoBuscarNada />}
          titulo={t('tienda.noDisponibleTitulo')}
          texto={t('tienda.noDisponibleTexto')}
          accion={{ texto: t('tienda.verProductosHotclick'), to: '/productos' }}
          secundaria={{ texto: t('tienda.irAHotclick'), to: '/' }}
        />
      </main>
    </div>
  )
}
