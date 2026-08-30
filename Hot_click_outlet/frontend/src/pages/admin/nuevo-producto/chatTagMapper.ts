/** Chips del chat (ambiente / tipo / estilo / para quién). El wizard y el mapper de IA los comparten. */
export const TAG_GROUPS = [
  { label: 'Ambiente', tags: ['sala', 'cocina', 'dormitorio', 'baño', 'jardín', 'oficina', 'comedor', 'terraza', 'garaje', 'lavandería'] },
  { label: 'Tipo de producto', tags: ['mueble', 'decoración', 'iluminación', 'textil', 'electrodoméstico', 'herramienta', 'arte', 'almacenamiento', 'colchón', 'espejo'] },
  { label: 'Estilo', tags: ['moderno', 'rústico', 'minimalista', 'clásico', 'industrial', 'bohemio', 'escandinavo', 'tropical'] },
  { label: 'Para quién', tags: ['niños', 'mascotas', 'adultos', 'familia', 'pareja', 'soltero', 'oficina en casa'] },
]

const SINONIMOS: Record<string, string> = {
  living: 'sala',
  sofa: 'sala',
  couch: 'sala',
  'sofá': 'sala',
  kitchen: 'cocina',
  bedroom: 'dormitorio',
  bathroom: 'baño',
  bath: 'baño',
  garden: 'jardín',
  patio: 'jardín',
  office: 'oficina',
  desk: 'oficina',
  dining: 'comedor',
  terrace: 'terraza',
  garage: 'garaje',
  laundry: 'lavandería',
  lamp: 'iluminación',
  lighting: 'iluminación',
  furniture: 'mueble',
  tool: 'herramienta',
  drill: 'herramienta',
  taladro: 'herramienta',
  mirror: 'espejo',
  mattress: 'colchón',
  kids: 'niños',
  pet: 'mascotas',
  pets: 'mascotas',
}

function sinAcentos(s: string) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function chipsDisponibles() {
  return new Set(TAG_GROUPS.flatMap(g => g.tags))
}

/**
 * Convierte etiquetas de Vision/Gemini a chips del chat.
 * @param {string[]} etiquetas
 * @returns {string[]}
 */
export function mapEtiquetasToChatTags(etiquetas: unknown) {
  if (!Array.isArray(etiquetas) || etiquetas.length === 0) return []
  const chips = chipsDisponibles()
  const chipPorNorm = new Map<string, string>()
  for (const chip of chips) chipPorNorm.set(sinAcentos(chip), chip)
  const out = new Set<string>()
  for (const raw of etiquetas) {
    const original = String(raw || '').toLowerCase().trim()
    if (!original) continue
    const partes = original.split(/[\s,/|-]+/).filter(Boolean)
    partes.push(original)
    for (const parte of partes) {
      if (chips.has(parte)) {
        out.add(parte)
        continue
      }
      const norm = sinAcentos(parte)
      if (chipPorNorm.has(norm)) {
        out.add(chipPorNorm.get(norm) as string)
        continue
      }
      const mapped = SINONIMOS[parte] || SINONIMOS[norm]
      if (mapped) out.add(mapped)
    }
  }
  return [...out]
}
