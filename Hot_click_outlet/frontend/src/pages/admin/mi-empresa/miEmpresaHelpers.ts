import { formatDate } from '@/utils/format'
import type { Id } from '@/types/api'

export type FormularioEmpresa = {
  nombreComercial: string
  descripcion: string
  telefonoEmpresa: string
  correoEmpresa: string
  numeroWhatsapp: string
  colorPrimario: string
  colorSecundario: string
  logoUrl: string
}

export type EmpresaPerfil = {
  id: Id
  nombreEmpresa?: string
  nombreComercial?: string
  slug?: string
  descripcion?: string
  telefonoEmpresa?: string
  correoEmpresa?: string
  numeroWhatsapp?: string
  categoriaNegocio?: string | null
  instagram?: string | null
  zonaEnvio?: string | null
  colorPrimario?: string
  colorSecundario?: string
  logoUrl?: string | null
  planSaas?: string
  estadoEmpresa?: string
  visibilidadPublica?: boolean
  fechaRegistro?: string
  fechaAprobacion?: string
}

export type ErroresPerfil = Partial<Record<keyof FormularioEmpresa, string>>

export const PLAN_COLOR: Record<string, string> = {
  GRATUITO:   'bg-gray-500/15 text-gray-400',
  BASICO:     'bg-blue-500/15 text-blue-400',
  PRO:        'bg-[var(--hc-blue-500)]/15 text-[var(--hc-blue-400)]',
  ENTERPRISE: 'bg-amber-500/15 text-amber-400',
}

export const ESTADO_COLOR: Record<string, string> = {
  ACTIVO:               'bg-green-500/15 text-green-400',
  PENDIENTE_APROBACION: 'bg-yellow-500/15 text-yellow-400',
  SUSPENDIDO:           'bg-red-500/15 text-red-400',
  RECHAZADO:            'bg-red-500/15 text-red-400',
}

export const MAX_FOTOS = 10

export const CAMPOS_DIRTY: (keyof FormularioEmpresa)[] = [
  'nombreComercial', 'descripcion', 'telefonoEmpresa', 'correoEmpresa',
  'numeroWhatsapp', 'colorPrimario', 'colorSecundario', 'logoUrl',
]

export const FORMULARIO_VACIO: FormularioEmpresa = {
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

export function unwrapEmpresa(data: unknown): EmpresaPerfil | null {
  if (!data || typeof data !== 'object') return (data as EmpresaPerfil | null) ?? null
  const obj = data as EmpresaPerfil & { data?: EmpresaPerfil }
  return obj.id ? obj : (obj.data ?? obj)
}

export function descripcionVisible(descRaw?: string): string {
  return (descRaw ?? '').replace(TAG_FOTOS, '').trim()
}

export function fotosDesdeDescripcion(descRaw?: string): string[] {
  try {
    const match = (descRaw ?? '').match(/\[FOTOS\](.*?)(\[\/FOTOS\]|$)/s)
    if (match) return JSON.parse(match[1]) as string[]
    return []
  } catch {
    return []
  }
}

export function descripcionSinTagFotos(descripcion: string): string {
  return descripcion.trim().replace(TAG_FOTOS, '').trim()
}

export function formularioDesdeEmpresa(empresa: EmpresaPerfil): FormularioEmpresa {
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

export function validarPerfil(form: FormularioEmpresa): ErroresPerfil {
  const e: ErroresPerfil = {}
  if (!form.nombreComercial.trim()) e.nombreComercial = 'El nombre comercial es requerido'
  if (form.descripcion.includes('[FOTOS]') || form.descripcion.includes('[/FOTOS]')) {
    e.descripcion = 'La descripción no puede contener el texto "[FOTOS]" — usá la sección Galería para subir fotos'
  }
  return e
}

export function perfilCompletitud(form: FormularioEmpresa): {
  checks: { label: string; done: boolean }[]
  done: number
  pct: number
} {
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

export function fechaPerfil(date?: string | number | Date | null): string {
  if (!date) return '—'
  return formatDate(date)
}

export function mensajeErrorEmpresa(err: unknown, fallback: string): string {
  if (!err || typeof err !== 'object') return fallback
  const message = (err as { response?: { data?: { message?: unknown } } }).response?.data?.message
  return typeof message === 'string' && message ? message : fallback
}
