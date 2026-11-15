// Utilidades comunes. Todo verificador devuelve {ok, reasons[]} y es FAIL-CLOSED:
// cualquier dato ausente, ambiguo o "__UNSET__" produce ok=false.
export const UNSET = '__UNSET__';
export const SHA40 = /^[0-9a-f]{40}$/;
export const SHA64 = /^[0-9a-f]{64}$/;
export function isUnset(v) {
  return v === undefined || v === null || v === '' || v === UNSET ||
    (typeof v === 'string' && v.includes(UNSET));
}
export function verdict(reasons) { return { ok: reasons.length === 0, reasons }; }
export function deepFindUnset(obj, path = '$', out = []) {
  if (obj === null || obj === undefined) { out.push(path); return out; }
  if (typeof obj === 'string') { if (isUnset(obj)) out.push(path); return out; }
  if (Array.isArray(obj)) { obj.forEach((v, i) => deepFindUnset(v, `${path}[${i}]`, out)); return out; }
  if (typeof obj === 'object') { for (const [k, v] of Object.entries(obj)) deepFindUnset(v, `${path}.${k}`, out); }
  return out;
}
