import { useState } from 'react'
import { urlGoogleMaps, urlMapaIncrustado } from '@/utils/mapaGoogle'
import { guardarPinBodega } from './bodegasVendedorApi'
import MapaGoogleBodega from './MapaGoogleBodega'

type BodegaPin = {
  id: string
  nombre: string
  latitud?: number | null
  longitud?: number | null
}

/** Mapa de una bodega ya creada, y el formulario para marcar o cambiar el pin. */
export default function PinBodegaLista({ bodega }: { bodega: BodegaPin }) {
  const [lat, setLat] = useState<number | null>(bodega.latitud ?? null)
  const [lng, setLng] = useState<number | null>(bodega.longitud ?? null)
  const [abierto, setAbierto] = useState(false)
  const [error, setError] = useState('')
  const hayPin = lat != null && lng != null

  async function guardar(latitud: number, longitud: number) {
    setLat(latitud)
    setLng(longitud)
    setError('')
    try {
      await guardarPinBodega(bodega.id, latitud, longitud)
    } catch (err: unknown) {
      console.error('[pin bodega]', err)
      setError('No se pudo guardar el pin. Probá de nuevo.')
    }
  }

  return (
    <div className="mt-3 flex flex-col gap-2">
      {hayPin && !abierto ? <VistaPin nombre={bodega.nombre} latitud={lat} longitud={lng} /> : null}
      <button
        type="button"
        className="self-start text-sm font-semibold"
        style={{ color: 'var(--hc-link)' }}
        onClick={() => setAbierto((v) => !v)}
      >
        {hayPin ? 'Cambiar pin' : 'Marcar en Google Maps'}
      </button>
      {abierto ? <MapaGoogleBodega latitud={lat} longitud={lng} onCambio={guardar} /> : null}
      {error ? <p className="text-sm text-hc-danger">{error}</p> : null}
    </div>
  )
}

function VistaPin({ nombre, latitud, longitud }: { nombre: string; latitud: number; longitud: number }) {
  return (
    <>
      <iframe
        title={`Mapa de ${nombre}`}
        src={urlMapaIncrustado(latitud, longitud)}
        className="h-36 w-full rounded-[14px] border border-hc-border"
        loading="lazy"
      />
      <a
        href={urlGoogleMaps(latitud, longitud)}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm font-semibold"
        style={{ color: 'var(--hc-link)' }}
      >
        Abrir en Google Maps
      </a>
    </>
  )
}
