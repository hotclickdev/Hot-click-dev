import { useDivisionTerritorial } from '@/utils/useDivisionTerritorial'
import { Campo } from './ui'
import CampoSelectAnimado from './motion/CampoSelectAnimado'
import { conCanton, conProvincia, type ErroresUbicacion, type UbicacionDespacho } from './ubicacionDespachoHelpers'

type Props = Readonly<{
  ubicacion: UbicacionDespacho
  onChange: (ubicacion: UbicacionDespacho) => void
  /** Errores por campo; se pasan solo después de un intento de avanzar. */
  errores?: ErroresUbicacion
}>

/**
 * Ubicación de despacho de una bodega: provincia, cantón y distrito del IGN, dirección exacta y retiro en sitio.
 */
export default function CamposUbicacion({ ubicacion, onChange, errores = {} }: Props) {
  const territorio = useDivisionTerritorial()
  const distritos = territorio.distritosDe(ubicacion.provincia, ubicacion.canton)
  return (
    <>
      {territorio.error && (
        <p className="mb-3 text-xs text-hc-muted" role="status">
          No se pudo cargar la división del IGN. Los distritos no están disponibles.
        </p>
      )}
      <CampoSelectAnimado
        etiqueta="Provincia"
        valor={ubicacion.provincia}
        opciones={territorio.provincias}
        onChange={(provincia) => onChange(conProvincia(ubicacion, provincia))}
        errorMensaje={errores.provincia}
      />
      <CampoSelectAnimado
        etiqueta="Cantón"
        valor={ubicacion.canton}
        opciones={territorio.cantonesDe(ubicacion.provincia)}
        onChange={(canton) => onChange(conCanton(ubicacion, canton))}
        placeholder={ubicacion.provincia ? 'Elegí una opción' : 'Primero elegí la provincia'}
        deshabilitado={!ubicacion.provincia}
        errorMensaje={errores.canton}
      />
      <CampoSelectAnimado
        etiqueta="Distrito"
        valor={ubicacion.distrito ?? ''}
        opciones={distritos}
        onChange={(distrito) => onChange({ ...ubicacion, distrito })}
        placeholder={ubicacion.canton ? 'Elegí una opción' : 'Primero elegí el cantón'}
        deshabilitado={!ubicacion.canton || distritos.length === 0}
      />
      <Campo
        etiqueta="Dirección exacta"
        value={ubicacion.direccionExacta}
        onChange={(direccionExacta) => onChange({ ...ubicacion, direccionExacta })}
        placeholder="Ej: 200 m norte de la iglesia, casa esquinera"
        errorMensaje={errores.direccionExacta}
      />
      <InterruptorRetiro
        activo={ubicacion.permiteRetiroCliente}
        onCambiar={(permiteRetiroCliente) => onChange({ ...ubicacion, permiteRetiroCliente })}
      />
    </>
  )
}

function InterruptorRetiro({ activo, onCambiar }: { activo: boolean; onCambiar: (activo: boolean) => void }) {
  return (
    <div className="rounded-xl border border-hc-border bg-hc-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-hc-text">Los clientes pueden retirar aquí</p>
          <p className="mt-1 text-xs text-hc-muted">
            Si lo activás, en el checkout aparece la opción de retiro en esta bodega.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={activo}
          aria-label="Permitir retiro de clientes en esta bodega"
          onClick={() => onCambiar(!activo)}
          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
            activo ? 'bg-hc-primary' : 'bg-[var(--hc-border-strong)]'
          }`}
        >
          <span
            className={`absolute top-0.5 size-6 rounded-full bg-white hc-papel-blanco shadow transition-transform ${
              activo ? 'left-5' : 'left-0.5'
            }`}
          />
        </button>
      </div>
    </div>
  )
}
