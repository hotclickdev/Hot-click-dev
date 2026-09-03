export const ZONA_GAM = 'GAM'
export const ZONA_FUERA_GAM = 'FUERA_GAM'

export const MSG_SOLO_GAM =
  'Por ahora solo recolectamos y entregamos en la GAM. Fuera de la GAM está en desarrollo.'

export function zonaPermitida(zona: string): boolean {
  return zona === ZONA_GAM
}
