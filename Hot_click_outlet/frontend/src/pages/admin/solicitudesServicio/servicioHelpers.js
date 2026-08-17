export const ESTADOS = ['PENDIENTE', 'EN_BUSQUEDA', 'ENCONTRADO', 'NO_ENCONTRADO', 'CANCELADO']

export const ESTADO_STYLES = {
  PENDIENTE:     { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  EN_BUSQUEDA:   { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  ENCONTRADO:    { color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  NO_ENCONTRADO: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  CANCELADO:     { color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
}

/** @param {object} s */
export function waLinkServicio(s) {
  const tel = s.telefonoContacto || s.usuario?.telefono || ''
  if (!tel) return null
  const num = tel.replace(/\D/g, '')
  const full = num.startsWith('506') ? num : `506${num}`
  const msg = encodeURIComponent(
    `Hola ${s.nombreContacto || s.usuario?.nombre || ''}! 👋 Te contactamos de HotClick sobre tu solicitud de "${s.descripcion.slice(0, 60)}${s.descripcion.length > 60 ? '...' : ''}".`
  )
  return `https://wa.me/${full}?text=${msg}`
}

/** @param {string|null|undefined} fotosUrls */
export function parseFotosUrls(fotosUrls) {
  if (!fotosUrls) return []
  try { return JSON.parse(fotosUrls) } catch { return [] }
}
