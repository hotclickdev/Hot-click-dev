export const TIPOS_CEDULA = [{ v: '01', l: 'Física' }, { v: '02', l: 'Jurídica' }, { v: '03', l: 'DIMEX' }, { v: '04', l: 'NITE' }]
export const AMBIENTES    = [{ v: 'STAG', l: 'Sandbox (pruebas)' }, { v: 'PROD', l: 'Producción (Hacienda real) — solo ADMIN' }]

/** @param {string|number|null|undefined} id */
export const draftKey = (id) => `hotclick-fiscal-draft-${id ?? 'anon'}`

export const lsGet  = (k) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null } catch { return null } }
export const lsSet  = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* noop */ } }
export const lsRm   = (k) => { try { localStorage.removeItem(k) } catch { /* noop */ } }

export const EMPTY_FORM = {
  cedulaJuridica: '', tipoCedula: '02', actividadEconomica: '',
  nombreComercialFe: '', usuarioHacienda: '', claveHacienda: '',
  ambienteHacienda: 'STAG',
}

/** @param {object} data */
export function serverFormFromPerfil(data) {
  return {
    cedulaJuridica:     data.cedulaJuridica    ?? '',
    tipoCedula:         data.tipoCedula        ?? '02',
    actividadEconomica: data.actividadEconomica ?? '',
    nombreComercialFe:  data.nombreComercialFe ?? '',
    usuarioHacienda:    data.usuarioHacienda   ?? '',
    claveHacienda:      '',
    ambienteHacienda:   data.ambienteHacienda  ?? 'STAG',
  }
}
