/**
 * S1-17: el checkout recuerda la última dirección del comprador con sesión (provincia, cantón,
 * distrito y señas) para no volver a elegir tres listas. Queda solo en este navegador, con una clave
 * por usuario; el invitado no guarda nada y escribe la dirección completa como siempre.
 */
export type DireccionRecordada = {
  provincia: string
  canton: string
  distrito: string
  direccion: string
}

const PREFIJO = 'hotclick-ultima-direccion:'

function almacen(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null
  } catch {
    return null
  }
}

export function leerDireccionRecordada(userId: string | number | null | undefined): DireccionRecordada | null {
  if (userId == null || userId === '') return null
  try {
    const crudo = almacen()?.getItem(PREFIJO + userId)
    if (!crudo) return null
    const d = JSON.parse(crudo) as Partial<DireccionRecordada>
    if (typeof d.provincia !== 'string' || !d.provincia) return null
    return {
      provincia: d.provincia,
      canton: typeof d.canton === 'string' ? d.canton : '',
      distrito: typeof d.distrito === 'string' ? d.distrito : '',
      direccion: typeof d.direccion === 'string' ? d.direccion : '',
    }
  } catch {
    return null
  }
}

export function guardarDireccionRecordada(userId: string | number | null | undefined, d: DireccionRecordada): void {
  if (userId == null || userId === '' || !d.provincia) return
  try {
    almacen()?.setItem(PREFIJO + userId, JSON.stringify(d))
  } catch { /* almacenamiento lleno o bloqueado: no se recuerda */ }
}
