import { useState } from 'react'
import { Campo } from './ui'
import { puntoDesdeEnlaceGoogle, urlGoogleMaps, urlMapaIncrustado } from '@/utils/mapaGoogle'

type Props = Readonly<{
  latitud: number | null
  longitud: number | null
  onCambio: (latitud: number, longitud: number) => void
}>

const CLASE_BOTON =
  'inline-flex h-12 items-center justify-center rounded-xl border border-hc-border bg-hc-surface px-4 text-sm font-semibold text-hc-text'

/** Pin de la bodega. El mapa es el de Google; el pin se guarda con la bodega. */
export default function MapaGoogleBodega({ latitud, longitud, onCambio }: Props) {
  const [enlace, setEnlace] = useState('')
  const [error, setError] = useState('')
  const hayPin = latitud != null && longitud != null

  function marcarEnlace() {
    const punto = puntoDesdeEnlaceGoogle(enlace)
    if (!punto) {
      setError('Pegá el enlace de Google Maps que trae el pin (Compartir).')
      return
    }
    setError('')
    onCambio(punto.latitud, punto.longitud)
  }

  function usarAqui() {
    if (!navigator.geolocation) {
      setError('Este navegador no comparte la ubicación. Pegá el enlace del mapa.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setError('')
        onCambio(pos.coords.latitude, pos.coords.longitude)
      },
      () => setError('No se pudo leer la ubicación. Permití el acceso o pegá el enlace.'),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  return (
    <div className="mt-4 flex flex-col gap-3">
      <p className="text-sm font-semibold text-hc-text">Punto en Google Maps</p>
      {hayPin ? (
        <iframe
          title="Ubicación de la bodega en Google Maps"
          src={urlMapaIncrustado(latitud, longitud)}
          className="h-48 w-full rounded-[14px] border border-hc-border"
          loading="lazy"
        />
      ) : (
        <p className="rounded-xl border border-hc-border bg-hc-surface-2 px-3 py-3 text-sm text-hc-muted">
          Todavía no hay un pin. Usá tu ubicación o pegá el enlace de Google Maps.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="button" className={CLASE_BOTON} onClick={usarAqui}>Usar mi ubicación</button>
        {hayPin ? (
          <a href={urlGoogleMaps(latitud, longitud)} target="_blank" rel="noopener noreferrer" className={CLASE_BOTON}>
            Abrir en Google Maps
          </a>
        ) : null}
      </div>
      <Campo
        etiqueta="Enlace de Google Maps"
        value={enlace}
        onChange={setEnlace}
        placeholder="https://maps.google.com/..."
      />
      <button type="button" className={CLASE_BOTON} onClick={marcarEnlace}>Marcar este enlace</button>
      {error ? <p className="text-sm text-hc-danger">{error}</p> : null}
    </div>
  )
}
