// Detecta el color mencionado en el nombre de un producto (ej. "Renegado marron oscuro hombre")
// para poder agrupar variantes del mismo producto y mostrarlas como un círculo de color.

type ColorDef = {
  name: string
  hex: string | null
  aliases: string[]
}

const BASE_COLORS: ColorDef[] = [
  { name: 'negro',     hex: '#1c1c1c', aliases: ['negro'] },
  { name: 'blanco',    hex: '#f5f5f4', aliases: ['blanco'] },
  { name: 'marrón',    hex: '#7b4a2d', aliases: ['marron', 'cafe', 'chocolate'] },
  { name: 'camel',     hex: '#c19a6b', aliases: ['camel'] },
  { name: 'beige',     hex: '#ddc9a0', aliases: ['beige', 'arena', 'crema'] },
  { name: 'azul',      hex: '#2563eb', aliases: ['azul'] },
  { name: 'celeste',   hex: '#7dd3fc', aliases: ['celeste'] },
  { name: 'rojo',      hex: '#dc2626', aliases: ['rojo'] },
  { name: 'vino',      hex: '#7f1d3a', aliases: ['vino', 'burdeos', 'guinda'] },
  { name: 'verde',     hex: '#16a34a', aliases: ['verde'] },
  { name: 'oliva',     hex: '#6b7a3a', aliases: ['oliva', 'militar'] },
  { name: 'amarillo',  hex: '#eab308', aliases: ['amarillo', 'mostaza'] },
  { name: 'naranja',   hex: '#f97316', aliases: ['naranja'] },
  { name: 'gris',      hex: '#8b8f96', aliases: ['gris', 'plomo'] },
  { name: 'rosado',    hex: '#f472b6', aliases: ['rosado', 'rosa', 'fucsia'] },
  { name: 'morado',    hex: '#7c3aed', aliases: ['morado', 'violeta', 'purpura'] },
  { name: 'dorado',    hex: '#c9a227', aliases: ['dorado', 'oro'] },
  { name: 'plateado',  hex: '#b7bcc4', aliases: ['plateado', 'plata'] },
  { name: 'turquesa',  hex: '#14b8a6', aliases: ['turquesa'] },
  { name: 'multicolor', hex: null,    aliases: ['multicolor', 'estampado'] },
]

const ALIAS_TO_COLOR = new Map<string, ColorDef>()
BASE_COLORS.forEach((c) => c.aliases.forEach((a) => ALIAS_TO_COLOR.set(a, c)))

const ALIAS_PATTERN = [...ALIAS_TO_COLOR.keys()].sort((a, b) => b.length - a.length).join('|')
const COLOR_RE = new RegExp(`\\b(oscuro|claro)?\\s?(${ALIAS_PATTERN})\\s?(oscuro|claro)?\\b`, 'i')

const ACENTOS: Record<string, string> = { á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ñ: 'n' }

// Quita acentos preservando la longitud del string, para que los índices del regex
// (calculado sobre esta versión) sigan siendo válidos al recortar el string original.
function aplano(str: string) {
  return str.toLowerCase().split('').map((ch) => ACENTOS[ch] ?? ch).join('')
}

function capitalizar(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

// Aclara (percent > 0) u oscurece (percent < 0) un color hex. percent en rango -1..1.
function shadeColor(hex: string, percent: number) {
  const f = parseInt(hex.slice(1), 16)
  const t = percent < 0 ? 0 : 255
  const p = percent < 0 ? -percent : percent
  const R = f >> 16, G = (f >> 8) & 0x00ff, B = f & 0x0000ff
  return '#' + (
    0x1000000 +
    (Math.round((t - R) * p) + R) * 0x10000 +
    (Math.round((t - G) * p) + G) * 0x100 +
    (Math.round((t - B) * p) + B)
  ).toString(16).slice(1)
}

export type ColorDetectado = {
  label: string | null
  hex: string | null
  nombreSinColor: string
}

/**
 * @param nombre - nombre del producto, ej. "Renegado marron oscuro hombre"
 */
export function detectarColor(nombre?: string | null): ColorDetectado {
  const limpio = (nombre ?? '').replace(/\s+/g, ' ').trim()
  if (!limpio) return { label: null, hex: null, nombreSinColor: limpio }

  const plano = aplano(limpio)
  const m = COLOR_RE.exec(plano)
  if (!m) return { label: null, hex: null, nombreSinColor: limpio }

  const colorKey = m[2]
  if (!colorKey) return { label: null, hex: null, nombreSinColor: limpio }
  const color = ALIAS_TO_COLOR.get(colorKey.toLowerCase())
  if (!color) return { label: null, hex: null, nombreSinColor: limpio }
  const modificador = (m[1] || m[3] || '').toLowerCase() || null

  let hex = color.hex
  if (hex && modificador === 'oscuro') hex = shadeColor(hex, -0.3)
  if (hex && modificador === 'claro')  hex = shadeColor(hex, 0.35)

  const label = modificador ? `${capitalizar(color.name)} ${modificador}` : capitalizar(color.name)

  const nombreSinColor = (limpio.slice(0, m.index) + ' ' + limpio.slice(m.index + m[0].length))
    .replace(/\s+/g, ' ')
    .trim()

  return { label, hex, nombreSinColor: nombreSinColor || limpio }
}
