/** Cantidad de variables {{n}} de una plantilla (la más alta); 0 si no tiene. */
export function contarVariables(cuerpo: string): number {
  let max = 0
  for (const m of cuerpo.matchAll(/\{\{(\d+)\}\}/g)) max = Math.max(max, Number(m[1]))
  return max
}

/** Meta no admite que el texto de la plantilla empiece o termine con una variable. */
export function variableAlBorde(cuerpo: string): boolean {
  const t = cuerpo.trim()
  return t.startsWith('{{') || t.endsWith('}}')
}

/** Nombre técnico válido de plantilla: minúsculas, números y guion bajo (3 a 100). */
export function nombrePlantillaValido(nombre: string): boolean {
  return /^[a-z0-9_]{3,100}$/.test(nombre)
}

/** Porcentaje entero de `parte` sobre `total`; 0 si no hay total. */
export function porcentaje(parte: number, total: number): number {
  return total > 0 ? Math.round((parte * 100) / total) : 0
}

/** Se puede lanzar: borrador, plantilla aprobada y al menos un contacto alcanzable. */
export function puedeLanzar(estado: string, plantilla: string | undefined, permitidos: number): boolean {
  return estado === 'BORRADOR' && plantilla === 'APROBADA' && permitidos > 0
}

/** Valores por defecto de los parámetros: el primero es el nombre del cliente, el resto vacíos. */
export function parametrosIniciales(cuerpo: string): string[] {
  const n = contarVariables(cuerpo)
  return Array.from({ length: n }, (_, i) => (i === 0 ? '{nombre}' : ''))
}
