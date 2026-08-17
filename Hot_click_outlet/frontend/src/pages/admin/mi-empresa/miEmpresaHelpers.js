import { formatDate } from '@/utils/format'

export const PLAN_COLOR = {
  GRATUITO:   'bg-gray-500/15 text-gray-400',
  BASICO:     'bg-blue-500/15 text-blue-400',
  PRO:        'bg-[var(--hc-blue-500)]/15 text-[var(--hc-blue-400)]',
  ENTERPRISE: 'bg-amber-500/15 text-amber-400',
}

export const ESTADO_COLOR = {
  ACTIVO:               'bg-green-500/15 text-green-400',
  PENDIENTE_APROBACION: 'bg-yellow-500/15 text-yellow-400',
  SUSPENDIDO:           'bg-red-500/15 text-red-400',
  RECHAZADO:            'bg-red-500/15 text-red-400',
}

export const MAX_FOTOS = 10

export const CAMPOS_DIRTY = [
  'nombreComercial', 'descripcion', 'telefonoEmpresa', 'correoEmpresa',
  'numeroWhatsapp', 'colorPrimario', 'colorSecundario', 'logoUrl',
]

export const FORMULARIO_VACIO = {
  nombreComercial: '',
  descripcion: '',
  telefonoEmpresa: '',
  correoEmpresa: '',
  numeroWhatsapp: '',
  colorPrimario: '#E73B33',
  colorSecundario: '#1747A8',
  logoUrl: '',
}

const TAG_FOTOS = /\[FOTOS\].*?(\[\/FOTOS\]|$)/s

/**
 * @param {unknown} data
 * @returns {object|unknown}
 */
export function unwrapEmpresa(data) {
  return data?.id ? data : (data?.data ?? data)
}

/**
 * Texto visible de la descripción, sin el bloque embebido de fotos.
 * @param {string} descRaw
 * @returns {string}
 */
export function descripcionVisible(descRaw) {
  return (descRaw ?? '').replace(TAG_FOTOS, '').trim()
}

/**
 * URLs de fotos embebidas en `[FOTOS]...[/FOTOS]` dentro de la descripción.
 * @param {string} descRaw
 * @returns {string[]}
 */
export function fotosDesdeDescripcion(descRaw) {
  try {
    const match = (descRaw ?? '').match(/\[FOTOS\](.*?)(\[\/FOTOS\]|$)/s)
    if (match) return JSON.parse(match[1])
    return []
  } catch {
    return []
  }
}

/**
 * Quita el tag de fotos de la descripción editable (trim + replace).
 * @param {string} descripcion
 * @returns {string}
 */
export function descripcionSinTagFotos(descripcion) {
  return descripcion.trim().replace(TAG_FOTOS, '').trim()
}

/**
 * @param {object} empresa
 * @returns {typeof FORMULARIO_VACIO}
 */
export function formularioDesdeEmpresa(empresa) {
  return {
    nombreComercial: empresa.nombreComercial ?? '',
    descripcion:     descripcionVisible(empresa.descripcion ?? ''),
    telefonoEmpresa: empresa.telefonoEmpresa ?? '',
    correoEmpresa:   empresa.correoEmpresa ?? '',
    numeroWhatsapp:  empresa.numeroWhatsapp ?? '',
    colorPrimario:   empresa.colorPrimario ?? '#E73B33',
    colorSecundario: empresa.colorSecundario ?? '#1747A8',
    logoUrl:         empresa.logoUrl ?? '',
  }
}

/**
 * @param {object} form
 * @returns {{ nombreComercial?: string, descripcion?: string }}
 */
export function validarPerfil(form) {
  const e = {}
  if (!form.nombreComercial.trim()) e.nombreComercial = 'El nombre comercial es requerido'
  if (form.descripcion.includes('[FOTOS]') || form.descripcion.includes('[/FOTOS]')) {
    e.descripcion = 'La descripción no puede contener el texto "[FOTOS]" — usá la sección Galería para subir fotos'
  }
  return e
}

/**
 * @param {object} form
 * @returns {{ checks: { label: string, done: boolean }[], done: number, pct: number }}
 */
export function perfilCompletitud(form) {
  const checks = [
    { label: 'Logo',        done: !!form.logoUrl },
    { label: 'Descripción', done: form.descripcion.trim().length > 10 },
    { label: 'Teléfono',    done: !!form.telefonoEmpresa.trim() },
    { label: 'Correo',      done: !!form.correoEmpresa.trim() },
    { label: 'WhatsApp',    done: !!form.numeroWhatsapp.trim() },
  ]
  const done = checks.filter(c => c.done).length
  const pct = Math.round((done / checks.length) * 100)
  return { checks, done, pct }
}

/**
 * @param {string|number|Date} [date]
 * @returns {string}
 */
export function fechaPerfil(date) {
  if (!date) return '—'
  return formatDate(date)
}
