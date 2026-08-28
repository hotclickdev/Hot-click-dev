import { MSG_DIRECCION_DOMICILIO } from './tiendaCheckoutValidacion'
import { CLASE_INPUT_TIENDA } from './tiendaTheme'

/** Dirección de entrega: obligatoria solo con envío a domicilio. */
export default function TiendaCheckoutDireccion({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-medium text-[var(--t-muted)] mb-1" htmlFor="tienda-direccion">
        Dirección de entrega *
      </label>
      <textarea
        id="tienda-direccion"
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Provincia, cantón, señas exactas..."
        rows={2}
        maxLength={500}
        className={`${CLASE_INPUT_TIENDA} resize-none`}
      />
      <p className="text-xs text-[var(--t-muted)] mt-1">{MSG_DIRECCION_DOMICILIO}</p>
    </div>
  )
}
