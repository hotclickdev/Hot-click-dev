/** Ficha de tienda: aprobar/activar pasa por la misma aprobación de Moderación (correo + Telegram al vendedor). */
export function esPendienteAprobacion(estado: unknown): boolean {
  return String(estado ?? '').toUpperCase() === 'PENDIENTE_APROBACION'
}

export function mensajeConfirmarAprobacion(negocio: string, cuentaAprobada: boolean, reactivar = false): string {
  const base = reactivar
    ? `¿Reactivar ${negocio}? Se publica de nuevo y se avisa al vendedor.`
    : `¿Aprobar ${negocio}? Se publica y se avisa al vendedor por correo y Telegram.`
  return cuentaAprobada
    ? base
    : `${base}\n\nOjo: este negocio no tiene una cuenta de cobro aprobada; no va a poder recibir retiros hasta que la registre y se apruebe.`
}

export function cuentaAprobadaDe(respuesta: unknown): boolean {
  const r = respuesta as { data?: { data?: { aprobada?: unknown }; aprobada?: unknown } } | undefined
  return r?.data?.data?.aprobada === true || r?.data?.aprobada === true
}
