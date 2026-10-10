/**
 * Sinónimos de uso común en Costa Rica y tolerancia a errores de tipeo para la búsqueda
 * del catálogo. Todo en minúsculas y sin tildes (como deja `normalizar`).
 */
const GRUPOS: string[][] = [
  ['camiseta', 'camisa', 'polo', 'blusa'],
  ['tenis', 'zapatillas', 'zapatos'],
  ['chancletas', 'sandalias'],
  ['mochila', 'salveque', 'bulto'],
  ['carro', 'auto', 'vehiculo', 'carros'],
  ['celular', 'telefono', 'cel', 'movil'],
  ['computadora', 'compu', 'laptop', 'portatil'],
  ['cafe', 'cafecito', 'grano'],
  ['refresco', 'fresco', 'bebida', 'gaseosa'],
  ['ropa', 'vestimenta', 'prendas'],
  ['gorra', 'cachucha', 'sombrero'],
  ['regalo', 'detalle', 'obsequio'],
  ['artesania', 'artesanias', 'hecho a mano', 'manualidad'],
  ['bebe', 'chiquito', 'infantil', 'nino'],
  ['mascota', 'perro', 'gato', 'chucho'],
  ['bolso', 'cartera', 'bolsa'],
  ['jabon', 'jabones', 'cuidado personal'],
  ['dulce', 'cajeta', 'golosina', 'confite'],
]

const MAPA = new Map<string, string[]>()
for (const grupo of GRUPOS) for (const palabra of grupo) MAPA.set(palabra, grupo.filter((g) => g !== palabra))

/** Sinónimos de una palabra ya normalizada (sin incluirla). */
export function sinonimosDe(palabra: string): string[] {
  return MAPA.get(palabra) ?? []
}

/** Distancia de edición acotada (Damerau: incluye letras traspuestas); corta en cuanto supera `max`. */
export function distanciaMaxima(a: string, b: string, max: number): boolean {
  if (Math.abs(a.length - b.length) > max) return false
  let antepenultima: number[] = []
  let previa = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const actual = [i]
    let minimoFila = i
    for (let j = 1; j <= b.length; j++) {
      const costo = a[i - 1] === b[j - 1] ? 0 : 1
      actual[j] = Math.min(previa[j] + 1, actual[j - 1] + 1, previa[j - 1] + costo)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) actual[j] = Math.min(actual[j], antepenultima[j - 2] + 1)
      minimoFila = Math.min(minimoFila, actual[j])
    }
    if (minimoFila > max) return false
    antepenultima = previa
    previa = actual
  }
  return previa[b.length] <= max
}

/** Errores tolerados: 1 letra desde 5 caracteres, 2 desde 8. Palabras cortas exigen coincidencia exacta. */
export function erroresTolerados(palabra: string): number {
  if (palabra.length >= 8) return 2
  if (palabra.length >= 5) return 1
  return 0
}

/** La palabra (o un sinónimo) aparece en el texto, exacta o con un error de tipeo tolerado. */
export function palabraEnTexto(palabra: string, texto: string, tokens: string[]): boolean {
  if (texto.includes(palabra)) return true
  if (sinonimosDe(palabra).some((s) => texto.includes(s))) return true
  const max = erroresTolerados(palabra)
  if (max === 0) return false
  return tokens.some((t) => t.length >= 4 && distanciaMaxima(palabra, t, max))
}