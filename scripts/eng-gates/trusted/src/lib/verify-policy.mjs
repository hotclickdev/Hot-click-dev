// Valida la política de confianza (P). Sin valores reales -> falla. No hay defaults.
import { deepFindUnset, verdict, SHA40, SHA64 } from './common.mjs';

// r4 C1: valores DESIGNADOS por el dueño (15-nov), fijados en el código de D: una P que no coincida es inválida,
// aunque pase el resto de comprobaciones (P no puede cambiar actor/repo/PR/tipo de vigencia por sí sola).
export const DESIGNATED = Object.freeze({ repository: 'hotclickdev/Hot-click-dev', approverActorId: 279566055, pullNumber: 555, validityKind: 'untilPullMerged' });

// r6.1 (a): campo `mode` OBLIGATORIO y cerrado. Solo estos dos valores.
export const MODES = Object.freeze(['no-exceptions', 'live-exception']);
// r6.1 (a): en no-exceptions estas tres claves tienen que estar PRESENTES con JSON null (ausente != null).
export const NULL_FIELDS = Object.freeze(['candidateHeadSha', 'approvalCommentId', 'fixture']);

// r6.1 (b): head contra el que se cierra. live-exception: policy.candidateHeadSha (y no se admite --head).
// no-exceptions: --head <sha40> OBLIGATORIO de quien mergea; debe ser distinto de P, D, V y W.
export function resolveHead(policy, headArg, policyCommit) {
  const r = [];
  if (policy?.mode === 'live-exception') {
    if (headArg !== undefined) r.push('head: --head no se admite en live-exception (el head es candidateHeadSha de P)');
    return { head: policy.candidateHeadSha, reasons: r };
  }
  if (policy?.mode !== 'no-exceptions') return { head: null, reasons: ['head: mode inválido'] };
  if (typeof headArg !== 'string' || !SHA40.test(headArg)) return { head: null, reasons: ['head: --head <sha40> obligatorio en no-exceptions (ausente, corto o no hexadecimal)'] };
  const names = { P: policyCommit, D: policy.detectorCommit, V: policy.verifierCommit, W: policy.trustedReusable?.sha };
  for (const [n, v] of Object.entries(names)) if (v === headArg) r.push(`head: --head es igual a ${n} (el head del PR no puede ser P, D, V ni W)`);
  return { head: headArg, reasons: r };
}

export function verifyPolicy(policy) {
  const r = [];
  if (!policy || typeof policy !== 'object') return verdict(['policy: ausente']);
  if (policy.schemaVersion !== 1) r.push('policy: schemaVersion != 1');
  if (policy.status !== 'ACTIVE') r.push(`policy: status=${policy.status} (solo ACTIVE habilita; ningún default)`);
  if (!MODES.includes(policy.mode)) { r.push(`policy: mode=${JSON.stringify(policy.mode)} inválido (solo ${MODES.join(' | ')}; ausente o desconocido se rechaza)`); return verdict(r); }
  const noExc = policy.mode === 'no-exceptions';
  // En no-exceptions los tres campos van presentes en null: se comprueban con hasOwn (un campo AUSENTE no es null) y se excluyen del barrido de UNSET.
  let toScan = policy;
  if (noExc) {
    for (const k of NULL_FIELDS) {
      if (!Object.hasOwn(policy, k)) r.push(`policy: ${k} ausente (en no-exceptions debe estar presente y ser null; ausente != null)`);
      else if (policy[k] !== null) r.push(`policy: ${k} debe ser null en no-exceptions`);
    }
    toScan = Object.fromEntries(Object.entries(policy).filter(([k]) => !NULL_FIELDS.includes(k)));
  }
  for (const p of deepFindUnset(toScan)) r.push(`policy: valor sin fijar en ${p}`);
  if (r.length) return verdict(r);
  const chk = (cond, msg) => { if (!cond) r.push(msg); };
  chk(policy.repository === 'hotclickdev/Hot-click-dev', 'policy: repository inesperado');
  chk(policy.repository === DESIGNATED.repository, 'policy: repository != designado');
  chk(policy.approverActorId === DESIGNATED.approverActorId, 'policy: approverActorId != aprobador designado (279566055)');
  chk(policy.pullNumber === DESIGNATED.pullNumber, 'policy: pullNumber != PR designado');
  chk(policy.validity?.kind === DESIGNATED.validityKind, 'policy: validity.kind != designado');
  chk(Number.isInteger(policy.pullNumber) && policy.pullNumber > 0, 'policy: pullNumber inválido');
  chk(Number.isInteger(policy.approverActorId) && policy.approverActorId > 0, 'policy: approverActorId inválido');
  chk(SHA40.test(policy.verifierCommit), 'policy: verifierCommit inválido');
  chk(!('policyCommit' in policy), 'policy: policyCommit dentro de la política es autorreferencia irrealizable');
  chk(typeof policy.checkRunName === 'string' && policy.checkRunName.length > 0, 'policy: checkRunName inválido');
  chk(SHA40.test(policy.detectorCommit), 'policy: detectorCommit inválido');
  chk(typeof policy.testsCheckName === 'string' && policy.testsCheckName.length > 0 && policy.testsCheckName !== policy.checkRunName, 'policy: testsCheckName inválido (check obligatorio del job sin privilegios)');
  chk(SHA40.test(policy.trustedReusable?.sha), 'policy: trustedReusable.sha inválido');
  chk(/^hotclickdev\/Hot-click-dev\/\.github\/workflows\/[A-Za-z0-9._-]+\.ya?ml$/.test(policy.trustedReusable?.path ?? ''), 'policy: trustedReusable.path inválido');
  chk(SHA40.test(policy.caller?.blob), 'policy: caller.blob inválido');
  chk(SHA64.test(policy.gitleaks?.sha256) && SHA64.test(policy.gitleaks?.configSha256), 'policy: pins gitleaks inválidos');
  chk(SHA64.test(policy.corpusManifestSha256), 'policy: corpusManifestSha256 inválido');
  chk(policy.approverLogin === undefined || (typeof policy.approverLogin === 'string' && policy.approverLogin.length > 0), 'policy: approverLogin (informativo) debe ser string; la verificación va por approverActorId');
  if (!noExc) { // live-exception (camino r6, sin cambios): head candidato, comentario y fixture obligatorios
    chk(SHA40.test(policy.candidateHeadSha), 'policy: candidateHeadSha no es SHA-1 completo');
    chk(Number.isInteger(policy.approvalCommentId) && policy.approvalCommentId > 0, 'policy: approvalCommentId inválido');
    chk(SHA40.test(policy.detectorCommit) && policy.detectorCommit !== policy.candidateHeadSha, 'policy: detectorCommit inválido o igual al head (D no puede venir del head)');
    chk(policy.verifierCommit !== policy.candidateHeadSha, 'policy: verifierCommit no puede ser el head candidato (autorreferencia)');
    chk(policy.trustedReusable?.sha !== policy.candidateHeadSha, 'policy: reusable no puede fijarse al head candidato');
    chk(SHA40.test(policy.fixture?.blob) && SHA64.test(policy.fixture?.fingerprint) && typeof policy.fixture?.entryId === 'string' && policy.fixture.entryId.length > 0 && typeof policy.fixture?.path === 'string' && typeof policy.fixture?.constant === 'string', 'policy: fixture inválido');
  }
  // Vigencia: solo hasta mergear el PR fijado (sobre el head exacto aprobado). Sin plazos: cualquier otra clave (notAfter...) se rechaza.
  const va = policy.validity;
  chk(va && typeof va === 'object' && !Array.isArray(va) && va.kind === 'untilPullMerged' && va.pullNumber === policy.pullNumber && Object.keys(va).sort().join() === 'kind,pullNumber', 'policy: validity debe ser exactamente {kind:"untilPullMerged", pullNumber == policy.pullNumber} (sin notAfter ni otras claves)');
  return verdict(r);
}
