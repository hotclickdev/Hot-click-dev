/** Copia texto al portapapeles. Falla visible si el navegador no lo permite. */
export async function copiarAlPortapapeles(texto) {
  if (!navigator.clipboard?.writeText) {
    throw new Error('Portapapeles no disponible')
  }
  await navigator.clipboard.writeText(texto)
}
