import { useTranslation } from 'react-i18next'
import IconoFigma from '@/components/comprador/IconoFigma'
import { formatPrice } from '@/utils/format'
import { ICONOS_COMPRA } from './iconosCompra'
import { opcionesEntrega, type OpcionEntrega, type PaqueteCompra } from './paquetesCompra'
import { useTextosEntrega } from './useTextosEntrega'

type PaqueteEntregaProps = {
  paquete: PaqueteCompra
  metodo: string
  onElegir: (metodo: string) => void
}

type OpcionProps = {
  opcion: OpcionEntrega
  elegida: boolean
  onElegir: () => void
}

function Precio({ precio, className }: { precio: number | null; className: string }) {
  const { t } = useTranslation()
  if (precio === null) return <span className={`${className} text-hc-n-900`}>{t('compra.entrega.varia')}</span>
  if (precio === 0) return <span className={`${className} text-hc-green-600`}>{t('compra.entrega.gratis')}</span>
  return <span className={`${className} text-hc-n-900`}>{formatPrice(precio)}</span>
}

function Radio({ elegida, tamano }: { elegida: boolean; tamano: 'movil' | 'desktop' }) {
  const medida = tamano === 'movil' ? 'size-[20px] rounded-[10px]' : 'size-[18px] rounded-[9px]'
  const borde = elegida ? `border-hc-blue-600 ${tamano === 'movil' ? 'border-[6px]' : 'border-[5px]'}` : 'border-[1.5px] border-[#9aa1ae]'
  return <span aria-hidden className={`shrink-0 bg-hc-n-0 ${medida} ${borde}`} />
}

function NotaDistancia() {
  const { t } = useTranslation()
  return (
    <p className="flex items-start gap-[6px] rounded-[8px] bg-hc-warning-bg px-[8px] py-[6px] text-[11px] leading-[15px] text-hc-warning">
      <IconoFigma src={ICONOS_COMPRA.notaDistancia} size={14} />
      <span className="min-w-0 flex-1">{t('compra.entrega.notaDistancia')}</span>
    </p>
  )
}

/** Fila de opción en móvil (`29:1248`). */
function OpcionFila({ opcion, elegida, onElegir }: OpcionProps) {
  const textos = useTextosEntrega()
  return (
    <button
      type="button"
      role="radio"
      aria-checked={elegida}
      onClick={onElegir}
      className={`flex w-full items-center gap-[10px] border-t border-hc-n-200 px-[14px] py-[11px] text-left ${elegida ? 'bg-hc-blue-50' : 'bg-hc-n-0'}`}
    >
      <Radio elegida={elegida} tamano="movil" />
      <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
        <span className={`text-[14px] text-hc-n-900 ${elegida ? 'font-semibold' : 'font-medium'}`}>{textos.titulo(opcion.metodo)}</span>
        <span className="text-[12px] leading-[16px] text-hc-n-500">{textos.detalle(opcion)}</span>
        {opcion.retiro ? <span className="mt-[4px]"><NotaDistancia /></span> : null}
      </span>
      <Precio precio={opcion.precio} className="text-[14px] font-semibold" />
    </button>
  )
}

/** Opción en píldora de desktop (`38:1546`). */
function OpcionPildora({ opcion, elegida, onElegir }: OpcionProps) {
  const textos = useTextosEntrega()
  return (
    <button
      type="button"
      role="radio"
      aria-checked={elegida}
      onClick={onElegir}
      className={`flex items-center gap-[8px] rounded-[10px] py-[10px] pl-[12px] pr-[14px] ${elegida ? 'border-[1.5px] border-hc-blue-600 bg-hc-blue-50' : 'border border-hc-n-200 bg-hc-n-0'}`}
    >
      <Radio elegida={elegida} tamano="desktop" />
      <span className={`text-[13px] text-hc-n-900 ${elegida ? 'font-semibold' : 'font-medium'}`}>{textos.titulo(opcion.metodo)}</span>
      <Precio precio={opcion.precio} className="text-[13px] font-semibold" />
    </button>
  )
}

/** Entrega de un paquete: filas en móvil, píldoras en desktop. */
export default function PaqueteEntrega({ paquete, metodo, onElegir }: PaqueteEntregaProps) {
  const { t } = useTranslation()
  const opciones = opcionesEntrega(paquete)
  const titulo = t('compra.carrito.paqueteTitulo', { numero: paquete.numero, tienda: paquete.nombre })
  const cantidad = t('compra.resumen.cantidad', { count: paquete.cantidadProductos })
  const origen = paquete.provincia ? `${t('compra.carrito.saleDe', { provincia: paquete.provincia })} · ${cantidad}` : cantidad

  return (
    <div className="overflow-hidden rounded-[14px] border border-hc-n-200 bg-hc-n-0 lg:flex lg:flex-col lg:gap-[10px] lg:rounded-[12px] lg:p-[14px]">
      <div className="flex items-center gap-[8px] bg-hc-n-50 px-[14px] py-[12px] lg:bg-transparent lg:p-0">
        <IconoFigma src={ICONOS_COMPRA.tienda} size={18} className="text-hc-n-900" />
        <div className="flex min-w-0 flex-1 flex-col lg:flex-row lg:items-center lg:gap-[8px]">
          <p className="text-[14px] font-semibold text-hc-n-900">{titulo}</p>
          <p className="flex items-center gap-[4px] text-[12px] text-hc-n-500">
            {paquete.provincia ? <span className="flex lg:hidden"><IconoFigma src={ICONOS_COMPRA.origen} size={12} /></span> : null}
            {origen}
          </p>
        </div>
      </div>
      <div role="radiogroup" aria-label={titulo} className="flex flex-col lg:hidden">
        {opciones.map((opcion) => (
          <OpcionFila key={opcion.metodo} opcion={opcion} elegida={opcion.metodo === metodo} onElegir={() => onElegir(opcion.metodo)} />
        ))}
      </div>
      <div role="radiogroup" aria-label={titulo} className="hidden flex-wrap items-center gap-[8px] lg:flex">
        {opciones.map((opcion) => (
          <OpcionPildora key={opcion.metodo} opcion={opcion} elegida={opcion.metodo === metodo} onElegir={() => onElegir(opcion.metodo)} />
        ))}
      </div>
      {paquete.retiro ? <div className="hidden lg:block"><NotaDistancia /></div> : null}
    </div>
  )
}
