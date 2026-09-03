import StepperNumero from './motion/StepperNumero'
import type { ModoPrecioPersonalizado } from './personalizadoProductoHelpers'
import { MODOS_PRECIO_PERSONALIZADO } from './personalizadoProductoHelpers'

type Props = Readonly<{
  instrucciones: string
  onInstruccionesChange: (v: string) => void
  idPrefijo?: string
  modoPrecio?: ModoPrecioPersonalizado
  onModoChange?: (modo: ModoPrecioPersonalizado) => void
  precioMin?: string
  onPrecioMinChange?: (v: string) => void
  precioMax?: string
  onPrecioMaxChange?: (v: string) => void
  compra?: string
  onCompraChange?: (v: string) => void
  venta?: string
  onVentaChange?: (v: string) => void
}>

/**
 * Campos para producto personalizado: forma de cobro + instrucciones al cliente.
 */
export default function CamposPersonalizadoProducto({
  instrucciones,
  onInstruccionesChange,
  idPrefijo = 'pers',
  modoPrecio = 'COTIZACION',
  onModoChange,
  precioMin = '',
  onPrecioMinChange,
  precioMax = '',
  onPrecioMaxChange,
  compra = '',
  onCompraChange,
  venta = '',
  onVentaChange,
}: Props) {
  const instruccionesId = `${idPrefijo}-instrucciones`
  const labelId = `${idPrefijo}-forma-cobro`

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-xl border border-hc-border p-3">
      <p className="text-xs font-medium text-hc-muted" id={labelId}>Forma de cobro</p>
      <div className="flex flex-col gap-2" role="radiogroup" aria-labelledby={labelId}>
        {MODOS_PRECIO_PERSONALIZADO.map((modo) => (
          <OpcionFormaCobro
            key={modo.valor}
            name={`${idPrefijo}-modoPrecio`}
            titulo={modo.titulo}
            ayuda={modo.ayuda}
            seleccionada={modoPrecio === modo.valor}
            onSeleccionar={() => onModoChange?.(modo.valor)}
          />
        ))}
      </div>
      {modoPrecio === 'FIJO' && onCompraChange && onVentaChange ? (
        <div className="grid grid-cols-2 gap-2">
          <StepperNumero etiqueta="Precio compra" value={compra} onChange={onCompraChange} placeholder="₡ 0" />
          <StepperNumero etiqueta="Precio venta" value={venta} onChange={onVentaChange} placeholder="₡ 0" />
        </div>
      ) : null}
      {modoPrecio === 'RANGO' && onPrecioMinChange && onPrecioMaxChange ? (
        <div className="grid grid-cols-2 gap-2">
          <StepperNumero etiqueta="Precio mínimo" value={precioMin} onChange={onPrecioMinChange} placeholder="₡ 5.000" />
          <StepperNumero etiqueta="Precio máximo" value={precioMax} onChange={onPrecioMaxChange} placeholder="₡ 25.000" />
        </div>
      ) : null}
      {modoPrecio === 'COTIZACION' ? (
        <p className="text-sm text-hc-muted">
          El cliente envía fotos y notas; vos cotizás cuando revisés el encargo.
        </p>
      ) : null}
      <label htmlFor={instruccionesId} className="text-xs font-medium text-hc-muted">
        Instrucciones para el cliente
      </label>
      <textarea
        id={instruccionesId}
        className="min-h-[80px] w-full rounded-xl border border-hc-border px-3 py-2 text-sm"
        value={instrucciones}
        onChange={(e) => onInstruccionesChange(e.target.value)}
        placeholder="Ej: Subí foto del diseño. Indicá talla y color."
        maxLength={3000}
      />
    </div>
  )
}

function OpcionFormaCobro({
  name, titulo, ayuda, seleccionada, onSeleccionar,
}: Readonly<{
  name: string
  titulo: string
  ayuda: string
  seleccionada: boolean
  onSeleccionar: () => void
}>) {
  const clase = seleccionada
    ? 'flex cursor-pointer items-start gap-2 rounded-xl border border-hc-primary bg-hc-primary/5 px-3 py-2'
    : 'flex cursor-pointer items-start gap-2 rounded-xl border border-hc-border px-3 py-2'
  return (
    <label className={clase} aria-label={titulo}>
      <input
        type="radio"
        name={name}
        checked={seleccionada}
        onChange={onSeleccionar}
      />
      <span>
        <span className="block text-sm font-medium text-hc-text">{titulo}</span>
        <span className="block text-xs text-hc-muted">{ayuda}</span>
      </span>
    </label>
  )
}
