import type { ModoPrecioPersonalizado } from './personalizadoProductoHelpers'
import { MODOS_PRECIO_PERSONALIZADO } from './personalizadoProductoHelpers'

type Props = Readonly<{
  modoPrecio: ModoPrecioPersonalizado
  onModoChange: (modo: ModoPrecioPersonalizado) => void
  precioMin: string
  onPrecioMinChange: (v: string) => void
  precioMax: string
  onPrecioMaxChange: (v: string) => void
  instrucciones: string
  onInstruccionesChange: (v: string) => void
  idPrefijo?: string
}>

/**
 * Campos comunes para publicar producto personalizado (Emprendedor / PYME).
 */
export default function CamposPersonalizadoProducto({
  modoPrecio,
  onModoChange,
  precioMin,
  onPrecioMinChange,
  precioMax,
  onPrecioMaxChange,
  instrucciones,
  onInstruccionesChange,
  idPrefijo = 'pers',
}: Props) {
  const labelId = `${idPrefijo}-modo-precio`
  const instruccionesId = `${idPrefijo}-instrucciones`

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-xl border border-hc-border p-3">
      <p className="text-xs font-medium text-hc-muted" id={labelId}>Cómo se define el precio</p>
      <div className="flex flex-col gap-2" role="radiogroup" aria-labelledby={labelId}>
        {MODOS_PRECIO_PERSONALIZADO.map((modo) => (
          <label
            key={modo.valor}
            className="flex cursor-pointer items-start gap-2 rounded-xl border border-hc-border px-3 py-2"
            aria-label={modo.titulo}
          >
            <input
              type="radio"
              name={`${idPrefijo}-modoPrecio`}
              checked={modoPrecio === modo.valor}
              onChange={() => onModoChange(modo.valor)}
            />
            <span>
              <span className="block text-sm font-medium text-hc-text">{modo.titulo}</span>
              <span className="block text-xs text-hc-muted">{modo.ayuda}</span>
            </span>
          </label>
        ))}
      </div>
      {modoPrecio === 'RANGO' ? (
        <div className="grid grid-cols-2 gap-2">
          <CampoNumero etiqueta="Precio mínimo" value={precioMin} onChange={onPrecioMinChange} placeholder="₡ 5.000" />
          <CampoNumero etiqueta="Precio máximo" value={precioMax} onChange={onPrecioMaxChange} placeholder="₡ 25.000" />
        </div>
      ) : null}
      {modoPrecio === 'COTIZACION' ? (
        <p className="text-xs text-hc-muted">El cliente envía fotos y notas; vos cotizás al aprobar el encargo.</p>
      ) : null}
      <label htmlFor={instruccionesId} className="text-xs font-medium text-hc-muted">
        Instrucciones para el cliente
      </label>
      <textarea
        id={instruccionesId}
        className="min-h-[80px] w-full rounded-xl border border-hc-border px-3 py-2 text-sm"
        value={instrucciones}
        onChange={(e) => onInstruccionesChange(e.target.value)}
        placeholder="Ej: Subí foto del diseño. Indicá talla."
        maxLength={3000}
      />
    </div>
  )
}

function CampoNumero({
  etiqueta, value, onChange, placeholder,
}: Readonly<{
  etiqueta: string
  value: string
  onChange: (v: string) => void
  placeholder: string
}>) {
  const id = `campo-${etiqueta.replace(/\s+/g, '-').toLowerCase()}`
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-hc-muted">{etiqueta}</label>
      <input
        id={id}
        type="number"
        className="w-full rounded-xl border border-hc-border px-3 py-2 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  )
}
