export const PLAZOS = [30, 60] as const

export function mensajeTiendaRapida(persona: string, negocio: string, dias: number, url: string): string {
  const nombre = persona.trim().split(/\s+/)[0]
  const saludo = nombre ? `Hola ${nombre}, soy de HotClick.` : 'Hola, soy de HotClick.'
  return `${saludo} Te dejé lista la tienda ${negocio} por ${dias} días. Yo cargo los productos; vos completá tus datos aquí: ${url}`
}

export function enlaceTiendaRapida(token: string): string {
  if (typeof window === 'undefined' || !token) return ''
  return `${window.location.origin}/tienda-rapida/${token}`
}

export function etiquetaRapida(estado: string): string {
  if (estado === 'LISTA') return 'Datos listos'
  if (estado === 'VENCIDA') return 'Venció'
  return 'Esperando datos'
}
