/** El coach de spotlight no se abre en una pantalla que ya está guiando el tour. */
let pantallaTourActiva = false

export function marcarTourPantallaActiva(activa: boolean) {
  pantallaTourActiva = activa
}

export function tourPantallaActiva(): boolean {
  return pantallaTourActiva
}
