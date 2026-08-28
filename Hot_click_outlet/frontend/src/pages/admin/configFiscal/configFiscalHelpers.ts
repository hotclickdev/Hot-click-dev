export const TIPOS_CEDULA = [
  { v: '01', l: 'Física' },
  { v: '02', l: 'Jurídica' },
  { v: '03', l: 'DIMEX' },
  { v: '04', l: 'NITE' },
]
export const AMBIENTES = [
  { v: 'STAG', l: 'Sandbox (pruebas)' },
  { v: 'PROD', l: 'Producción (Hacienda real) — solo ADMIN' },
]

export type FiscalFormData = {
  cedulaJuridica: string
  tipoCedula: string
  actividadEconomica: string
  nombreComercialFe: string
  usuarioHacienda: string
  claveHacienda: string
  ambienteHacienda: string
}

export type CertInfoFiscal = {
  tieneCertP12: boolean
  tieneClaveHacienda: boolean
}

export type MsgFiscal = { ok: boolean; text: string }

type PerfilFiscal = {
  cedulaJuridica?: string | null
  tipoCedula?: string | null
  actividadEconomica?: string | null
  nombreComercialFe?: string | null
  usuarioHacienda?: string | null
  ambienteHacienda?: string | null
  tieneCertP12?: boolean
  tieneClaveHacienda?: boolean
}

export function draftKey(id: string | number | null | undefined) {
  return `hotclick-fiscal-draft-${id ?? 'anon'}`
}

export function lsGet(k: string): FiscalFormData | null {
  try {
    const v = localStorage.getItem(k)
    return v ? JSON.parse(v) as FiscalFormData : null
  } catch {
    return null
  }
}

export function lsSet(k: string, v: unknown) {
  try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* noop */ }
}

export function lsRm(k: string) {
  try { localStorage.removeItem(k) } catch { /* noop */ }
}

export const EMPTY_FORM: FiscalFormData = {
  cedulaJuridica: '', tipoCedula: '02', actividadEconomica: '',
  nombreComercialFe: '', usuarioHacienda: '', claveHacienda: '',
  ambienteHacienda: 'STAG',
}

export function serverFormFromPerfil(data: unknown): FiscalFormData {
  const d = (data && typeof data === 'object') ? data as PerfilFiscal : {}
  return {
    cedulaJuridica:     d.cedulaJuridica    ?? '',
    tipoCedula:         d.tipoCedula        ?? '02',
    actividadEconomica: d.actividadEconomica ?? '',
    nombreComercialFe:  d.nombreComercialFe ?? '',
    usuarioHacienda:    d.usuarioHacienda   ?? '',
    claveHacienda:      '',
    ambienteHacienda:   d.ambienteHacienda  ?? 'STAG',
  }
}

export function mensajeErrorFiscal(err: unknown, fallback: string): string {
  if (!err || typeof err !== 'object') return fallback
  const message = (err as { response?: { data?: { message?: unknown } } }).response?.data?.message
  return typeof message === 'string' ? message : fallback
}
