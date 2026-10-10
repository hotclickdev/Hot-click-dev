/**
 * QA-130-5: «Vence a las 3:45 p. m.» + el punto de la frase daba «p. m..». Colapsa el punto final duplicado
 * que deja una abreviatura (p. m., a. m.) al cierre de la oración.
 */
export function sinPuntoDoble(texto: string): string {
  return texto.replace(/\.\.$/, '.')
}
