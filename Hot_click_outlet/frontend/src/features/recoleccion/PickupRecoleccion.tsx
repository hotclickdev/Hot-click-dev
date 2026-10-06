import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import { Campo } from '@/prototipo/compartido/ui'
import { urlGoogleMaps, urlMapaIncrustado } from '@/utils/mapaGoogle'
import { warehouseService } from '@/services/orderService'
import { bodegasMarcables, direccionDeBodega, type BodegaMarcable } from './marcaBodega'
import type { RecoleccionCreatePayload } from './recoleccionTipos'

type Props = Readonly<{
  form: RecoleccionCreatePayload
  onChange: Dispatch<SetStateAction<RecoleccionCreatePayload>>
}>

export default function PickupRecoleccion({ form, onChange }: Props) {
  const [bodegas, setBodegas] = useState<BodegaMarcable[]>([])
  const marcada = bodegas.find((b) => b.id === String(form.bodegaId ?? ''))

  useEffect(() => {
    let vivo = true
    warehouseService.getAll()
      .then(({ data }) => { if (vivo) setBodegas(bodegasMarcables(data)) })
      .catch((err: unknown) => console.error('[recoleccion bodegas]', err))
    return () => { vivo = false }
  }, [])

  function marcar(bodega: BodegaMarcable) {
    onChange((prev) => ({
      ...prev,
      bodegaId: Number(bodega.id),
      direccionRecoleccion: direccionDeBodega(bodega),
      contactoRecoleccion: bodega.encargado || prev.contactoRecoleccion,
      telefonoRecoleccion: bodega.telefono || prev.telefonoRecoleccion,
    }))
  }

  return (
    <div className="flex flex-col gap-3">
      {bodegas.length > 0 ? (
        <SelectorBodegas bodegas={bodegas} marcadaId={form.bodegaId} onMarcar={marcar} />
      ) : null}
      {marcada ? <AvisoPin bodega={marcada} /> : null}
      <Campo
        etiqueta="Dirección de recolección"
        value={form.direccionRecoleccion}
        onChange={(v) => onChange((prev) => ({ ...prev, direccionRecoleccion: v }))}
        placeholder="Provincia, cantón, señas"
      />
      <Campo
        etiqueta="Quién entrega el paquete"
        value={form.contactoRecoleccion}
        onChange={(v) => onChange((prev) => ({ ...prev, contactoRecoleccion: v }))}
      />
      <Campo
        etiqueta="Teléfono de recolección"
        value={form.telefonoRecoleccion}
        onChange={(v) => onChange((prev) => ({ ...prev, telefonoRecoleccion: v }))}
        type="tel"
      />
    </div>
  )
}

function SelectorBodegas({
  bodegas,
  marcadaId,
  onMarcar,
}: {
  bodegas: BodegaMarcable[]
  marcadaId?: number
  onMarcar: (bodega: BodegaMarcable) => void
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-xs font-medium text-hc-muted">Marcá la bodega de la recolección</legend>
      <div className="flex flex-col gap-2">
        {bodegas.map((bodega) => (
          <label key={bodega.id} className="flex min-h-11 items-start gap-2 rounded-xl border border-hc-border px-3 py-3 text-sm">
            <input
              type="radio"
              name="bodega-recoleccion"
              className="mt-1"
              checked={marcadaId === Number(bodega.id)}
              onChange={() => onMarcar(bodega)}
            />
            <span>
              <span className="block font-semibold text-hc-text">{bodega.nombre}</span>
              <span className="block text-hc-muted">{bodega.direccion || 'Sin dirección'}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

function AvisoPin({ bodega }: { bodega: BodegaMarcable }) {
  if (bodega.latitud == null || bodega.longitud == null) {
    return (
      <p className="rounded-xl border border-hc-border bg-hc-surface-2 px-3 py-3 text-sm text-hc-muted">
        Esta bodega no tiene pin. Marcala en Mis bodegas para que el recolector vea el mapa.
      </p>
    )
  }
  return (
    <div className="flex flex-col gap-2">
      <iframe
        title={`Mapa de ${bodega.nombre}`}
        src={urlMapaIncrustado(bodega.latitud, bodega.longitud)}
        className="h-40 w-full rounded-[14px] border border-hc-border"
        loading="lazy"
      />
      <a
        href={urlGoogleMaps(bodega.latitud, bodega.longitud)}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm font-semibold"
        style={{ color: 'var(--hc-link)' }}
      >
        Ver bodega en Google Maps
      </a>
    </div>
  )
}
