export type PuntoMapa = { latitud: number; longitud: number }

const EN_ARROBA = /@(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/
const EN_QUERY = /[?&](?:q|query|ll)=(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/
const EN_EMBED = /!3d(-?\d{1,3}\.\d+)!4d(-?\d{1,3}\.\d+)/

function punto(latitud: string, longitud: string): PuntoMapa | null {
  const lat = Number(latitud)
  const lng = Number(longitud)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null
  return { latitud: lat, longitud: lng }
}

/** Lee el pin de un enlace de Google Maps (Compartir). Sin coordenadas, null. */
export function puntoDesdeEnlaceGoogle(texto: string): PuntoMapa | null {
  const limpio = texto.trim()
  const match = limpio.match(EN_ARROBA) ?? limpio.match(EN_QUERY) ?? limpio.match(EN_EMBED)
  if (!match) return null
  return punto(match[1], match[2])
}

export function urlGoogleMaps(latitud: number, longitud: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${latitud},${longitud}`
}

/** Vista previa con OpenStreetMap (decisión: Leaflet/OSM, sin APIs pagas). La CSP solo permite este frame. */
export function urlMapaIncrustado(latitud: number, longitud: number): string {
  const d = 0.005
  const bbox = [longitud - d, latitud - d, longitud + d, latitud + d].map(n => n.toFixed(6)).join(',')
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitud},${longitud}`
}
