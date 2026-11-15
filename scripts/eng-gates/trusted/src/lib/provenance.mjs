// Procedencia del escaneo publicada como anotación del check (::notice title=E4-PROVENANCE::<json>)
// y verificada en el cierre leyendo las anotaciones del check del ÚLTIMO intento aplicable.
// No acreditado contra GitHub real (solo mocks): ver CONEXIONES-r3.md.
import { createHash } from 'node:crypto';
import { canon } from './approval-live.mjs';
import { REQUIRED_STAGES } from './stages.mjs';

export const PROV_TITLE = 'E4-PROVENANCE';
const sha256 = (s) => createHash('sha256').update(s).digest('hex');

export function buildProvenance(x) {
  const body = { schemaVersion: 1, head: x.head, base: x.base, detectorCommit: x.detectorCommit, policyCommit: x.policyCommit, policyBlob: x.policyBlob,
    policySha256: x.policySha256, manifestSha256: x.manifestSha256, approval: x.approval ? { ok: x.approval.ok === true, commentId: x.approval.commentId ?? null, responsesSha256: x.approval.responsesSha256 ?? null } : null,
    stages: (x.stages ?? []).map((s) => ({ stage: s.stage, ran: s.ran === true, ok: s.ok === true })), e4: x.e4 ?? null, fixedBlock: x.fixedBlock ?? null, ok: x.ok === true };
  return { ...body, digest: sha256(canon(body)) };
}
export const annotationLine = (prov) => `::notice title=${PROV_TITLE}::${JSON.stringify(prov)}`;

// exp = { head, detectorCommit, policyCommit, policyBlob, policySha256, manifestSha256, commentId, exceptionRequired }
export function verifyProvenance(annotationsPages, exp) {
  const r = [];
  if (!Array.isArray(annotationsPages) || annotationsPages.some((p) => !Array.isArray(p) )) return ['provenance: anotaciones ilegibles (error/paginación => fail-closed)'];
  const ann = annotationsPages.flat().filter((a) => a?.title === PROV_TITLE);
  if (ann.length !== 1) return [`provenance: se esperaba exactamente 1 anotación ${PROV_TITLE} (hay ${ann.length})`];
  if (ann[0].annotation_level !== 'notice') r.push('provenance: nivel de anotación inesperado');
  let p; try { p = JSON.parse(ann[0].message); } catch { return [...r, 'provenance: JSON inválido']; }
  const { digest, ...body } = p ?? {};
  if (!p || digest !== sha256(canon(body))) r.push('provenance: digest no coincide');
  for (const k of ['head', 'detectorCommit', 'policyCommit', 'policyBlob', 'policySha256', 'manifestSha256']) if (p?.[k] !== exp[k]) r.push(`provenance: ${k} distinto del fijado`);
  const st = p?.stages ?? [];
  for (const s of REQUIRED_STAGES) if (st.filter((x) => x.stage === s && x.ran && x.ok).length !== 1) r.push(`provenance: etapa ${s} ausente o no OK`);
  if (st.length !== REQUIRED_STAGES.length) r.push('provenance: etapas extra/duplicadas');
  if (p?.fixedBlock !== null) r.push('provenance: bloqueo fijo presente');
  if (p?.ok !== true) r.push('provenance: escaneo no OK');
  if (exp.exceptionRequired) {
    if (p?.approval?.ok !== true || p?.approval?.commentId !== exp.commentId) r.push('provenance: aprobación no OK en el escaneo');
    if (p?.e4?.exception?.commentId !== exp.commentId) r.push('provenance: excepción no registrada');
  }
  return r;
}
