import { useTranslation } from 'react-i18next'
import Chip from '@/components/comprador/Chip'
import { FILTROS_COMPRAS, type FiltroCompras } from './comprasCliente'

type FiltrosComprasProps = {
  activo: FiltroCompras
  onCambiar: (filtro: FiltroCompras) => void
}

/** Chips de estado de «Mis pedidos» (Figma `28:1316`). */
export default function FiltrosCompras({ activo, onCambiar }: FiltrosComprasProps) {
  const { t } = useTranslation()
  return (
    <div role="group" aria-label={t('misPedidos.filtrosAria')} className="pb-[4px] pt-[14px]">
      <div className="scrollbar-hide mx-auto flex max-w-[720px] items-center gap-[8px] overflow-x-auto px-[16px]">
        {FILTROS_COMPRAS.map((filtro) => (
          <Chip
            key={filtro}
            texto={t(`misPedidos.filtro.${filtro}`)}
            variante={filtro === activo ? 'seleccionado' : 'categoria'}
            presionado={filtro === activo}
            onClick={() => onCambiar(filtro)}
            className="leading-[15px]"
          />
        ))}
      </div>
    </div>
  )
}
