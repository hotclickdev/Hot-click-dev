import { useTranslation } from 'react-i18next'
import { SearchPanelBody } from '@/components/ui/searchPanel/SearchPanelBody'
import { useResultadosBusqueda } from '@/components/ui/searchPanel/useResultadosBusqueda'

type DesplegableBusquedaProps = {
  consulta: string
  abierto: boolean
  onCerrar: () => void
  onCambiar: (texto: string) => void
}

/** Resultados bajo el buscador del header (Figma `8:163`), también si ninguna palabra coincide con un producto. */
export default function DesplegableBusqueda({ consulta, abierto, onCerrar, onCambiar }: DesplegableBusquedaProps) {
  const { t } = useTranslation()
  const modelo = useResultadosBusqueda(consulta, abierto, onCerrar, onCambiar)
  if (!abierto) return null

  return (
    <div
      id="resultados-busqueda"
      role="region"
      aria-label={t('search.dialogLabel')}
      className="absolute left-0 right-0 top-[calc(100%+8px)] z-[60] flex max-h-[min(70vh,640px)] flex-col overflow-hidden rounded-[16px] border border-hc-n-200 bg-hc-n-0 shadow-[0_24px_60px_rgba(20,23,28,0.18)]"
    >
      <SearchPanelBody {...modelo} />
    </div>
  )
}
