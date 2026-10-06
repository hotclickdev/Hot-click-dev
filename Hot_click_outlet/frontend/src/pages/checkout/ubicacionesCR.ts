/** Provincias y cantones de Costa Rica para la dirección de entrega (Figma `29:1248`, `30:2385`). */
export const UBICACIONES_CR: Record<string, string[]> = {
  'San José': [
    'San José', 'Escazú', 'Desamparados', 'Puriscal', 'Tarrazú', 'Aserrí', 'Mora', 'Goicoechea', 'Santa Ana', 'Alajuelita',
    'Vázquez de Coronado', 'Acosta', 'Tibás', 'Moravia', 'Montes de Oca', 'Turrubares', 'Dota', 'Curridabat', 'Pérez Zeledón', 'León Cortés Castro',
  ],
  Alajuela: [
    'Alajuela', 'San Ramón', 'Grecia', 'San Mateo', 'Atenas', 'Naranjo', 'Palmares', 'Poás', 'Orotina', 'San Carlos',
    'Zarcero', 'Sarchí', 'Upala', 'Los Chiles', 'Guatuso', 'Río Cuarto',
  ],
  Cartago: ['Cartago', 'Paraíso', 'La Unión', 'Jiménez', 'Turrialba', 'Alvarado', 'Oreamuno', 'El Guarco'],
  Heredia: ['Heredia', 'Barva', 'Santo Domingo', 'Santa Bárbara', 'San Rafael', 'San Isidro', 'Belén', 'Flores', 'San Pablo', 'Sarapiquí'],
  Guanacaste: ['Liberia', 'Nicoya', 'Santa Cruz', 'Bagaces', 'Carrillo', 'Cañas', 'Abangares', 'Tilarán', 'Nandayure', 'La Cruz', 'Hojancha'],
  Puntarenas: [
    'Puntarenas', 'Esparza', 'Buenos Aires', 'Montes de Oro', 'Osa', 'Quepos', 'Golfito', 'Coto Brus', 'Parrita', 'Corredores',
    'Garabito', 'Monteverde', 'Puerto Jiménez',
  ],
  Limón: ['Limón', 'Pococí', 'Siquirres', 'Talamanca', 'Matina', 'Guácimo'],
}

/** Cantones del Gran Área Metropolitana (Envío normal: 2 a 4 días). El resto va por el envío normal fuera del GAM (3 a 4 días). */
const CANTONES_GAM: Record<string, string[]> = {
  'San José': ['San José', 'Escazú', 'Desamparados', 'Aserrí', 'Mora', 'Goicoechea', 'Santa Ana', 'Alajuelita', 'Vázquez de Coronado', 'Tibás', 'Moravia', 'Montes de Oca', 'Curridabat'],
  Alajuela: ['Alajuela', 'Atenas', 'Poás'],
  Cartago: ['Cartago', 'Paraíso', 'La Unión', 'Alvarado', 'Oreamuno', 'El Guarco'],
  Heredia: ['Heredia', 'Barva', 'Santo Domingo', 'Santa Bárbara', 'San Rafael', 'San Isidro', 'Belén', 'Flores', 'San Pablo'],
}

function sinTildes(valor: string): string {
  return valor.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

/** Sin destino elegido se asume GAM (es la opción que Figma muestra por defecto). */
export function esDestinoGAM(provincia: string, canton: string): boolean {
  if (!provincia || !canton) return true
  const claveProvincia = sinTildes(provincia)
  const nombre = Object.keys(CANTONES_GAM).find((item) => sinTildes(item) === claveProvincia)
  if (!nombre) return false
  const claveCanton = sinTildes(canton)
  return CANTONES_GAM[nombre].some((item) => sinTildes(item) === claveCanton)
}

export const PROVINCIAS_CR = Object.keys(UBICACIONES_CR)

export function cantonesDeProvincia(provincia: string): string[] {
  return UBICACIONES_CR[provincia] ?? []
}

/** Dirección completa para el pedido: "señas, distrito, cantón, provincia". */
export function direccionCompleta(senas: string, canton: string, provincia: string, distrito = ''): string {
  return [senas.trim(), distrito.trim(), canton, provincia].filter(Boolean).join(', ')
}
