export type TelegramEstadoUi = {
  configurado: boolean
  vinculado: boolean
  telegramUsername: string | null
  fechaVinculacion: string | null
}

export type TelegramLinkUi = {
  deepLink: string
  expiraEnMin: number
}

export type TelegramMiembroUi = {
  usuarioId: string
  nombre: string
  detalle: string
}

export function parseEstadoTelegram(data: unknown): TelegramEstadoUi {
  const o = asRecord(data)
  return {
    configurado: o.configurado === true,
    vinculado: o.vinculado === true,
    telegramUsername: textoOpcional(o.telegramUsername),
    fechaVinculacion: textoOpcional(o.fechaVinculacion),
  }
}

export function parseLinkTelegram(data: unknown): TelegramLinkUi | null {
  const o = asRecord(data)
  const deepLink = textoOpcional(o.deepLink)
  if (!deepLink || !deepLink.startsWith('https://t.me/')) return null
  const expira = typeof o.expiraEnMin === 'number' ? o.expiraEnMin : 10
  return { deepLink, expiraEnMin: expira }
}

export function parseEquipoTelegram(data: unknown): TelegramMiembroUi[] {
  if (!Array.isArray(data)) return []
  return data.flatMap((fila) => {
    const o = asRecord(fila)
    if (o.usuarioId == null) return []
    const username = textoOpcional(o.telegramUsername)
    const correo = textoOpcional(o.correo)
    return [{
      usuarioId: String(o.usuarioId),
      nombre: textoOpcional(o.nombre) ?? 'Miembro',
      detalle: username ? mostrarUsername(username) : (correo ?? ''),
    }]
  })
}

export function mostrarUsername(username: string | null): string {
  if (!username) return 'Telegram conectado'
  return username.startsWith('@') ? username : `@${username}`
}

export function fechaVinculoCorta(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('es-CR')
}

function textoOpcional(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v : null
}

function asRecord(v: unknown): Record<string, unknown> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {}
  return v as Record<string, unknown>
}
