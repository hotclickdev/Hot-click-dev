import { useTranslation } from 'react-i18next'
import IconoFigma from '@/components/comprador/IconoFigma'
import { ICONOS_COMPRA } from '@/pages/checkout/iconosCompra'

type CantidadPaqueteProps = {
  cantidad: number
  nombre: string
  maximo: number
  onCambiar: (cantidad: number) => void
  className?: string
}

/** Selector de cantidad del carrito (Figma `37:1534`). */
export default function CantidadPaquete({ cantidad, nombre, maximo, onCambiar, className = '' }: CantidadPaqueteProps) {
  const { t } = useTranslation()
  return (
    <div className={`flex items-center gap-[10px] rounded-[8px] border border-hc-n-200 px-[8px] ${className}`}>
      <button
        type="button"
        onClick={() => onCambiar(cantidad - 1)}
        aria-label={t('compra.carrito.restar', { nombre })}
        className="flex items-center text-hc-n-600"
      >
        <IconoFigma src={ICONOS_COMPRA.menos} size={14} />
      </button>
      <span className="text-[13px] font-semibold text-hc-n-900">{cantidad}</span>
      <button
        type="button"
        onClick={() => onCambiar(cantidad + 1)}
        disabled={cantidad >= maximo}
        aria-label={t('compra.carrito.sumar', { nombre })}
        className="flex items-center text-hc-n-600 disabled:opacity-40"
      >
        <IconoFigma src={ICONOS_COMPRA.mas} size={14} />
      </button>
    </div>
  )
}
