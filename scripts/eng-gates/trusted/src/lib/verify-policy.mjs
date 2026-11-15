// Valida la política de confianza (P). Sin valores reales -> falla. No hay defaults.
import { deepFindUnset, verdict, SHA40, SHA64 } from './common.mjs';

// r4 C1: valores DESIGNADOS por el dueño (15-nov), fijados en el código de D: una P que no coincida es inválida,
// aunque pase el resto de comprobaciones (P no puede cambiar actor/repo/PR/tipo de vigencia por sí sola).
export const DESIGNATED = Object.freeze({ repository: 'hotclickdev/Hot-click-dev', approverActorId: 279566055, pullNumber: 553, validityKind: 'untilPullMerged' });

export function verifyPolicy(policy) {
  const r = [];
  if (!policy || typeof policy !== 'object') return verdict(['policy: ausente']);
  if (policy.schemaVersion !== 1) r.push('policy: schemaVersion != 1');
  if (policy.status !== 'ACTIVE') r.push(`policy: status=${policy.status} (solo ACTIVE habilita; ningún default)`);
  for (const p of deepFindUnset(policy)) r.push(`policy: valor sin fijar en ${p}`);
  if (r.length) return verdict(r);
  const chk = (cond, msg) => { if (!cond) r.push(msg); };
  chk(policy.repository === 'hotclickdev/Hot-click-dev', 'policy: repository inesperado');
  chk(policy.repository === DESIGNATED.repository, 'policy: repository != designado');
  chk(policy.approverActorId === DESIGNATED.approverActorId, 'policy: approverActorId != aprobador designado (279566055)');
  chk(policy.pullNumber === DESIGNATED.pullNumber, 'policy: pullNumber != PR designado');
  chk(policy.validity?.kind === DESIGNATED.validityKind, 'policy: validity.kind != designado');
  chk(Number.isInteger(policy.pullNumber) && policy.pullNumber > 0, 'policy: pullNumber inválido');
  chk(SHA40.test(policy.candidateHeadSha), 'policy: candidateHeadSha no es SHA-1 completo');
  chk(Number.isInteger(policy.approverActorId) && policy.approverActorId > 0, 'policy: approverActorId inválido');
  chk(Number.isInteger(policy.approvalCommentId) && policy.approvalCommentId > 0, 'policy: approvalCommentId inválido');
  chk(SHA40.test(policy.verifierCommit), 'policy: verifierCommit inválido');
  chk(!('policyCommit' in policy), 'policy: policyCommit dentro de la política es autorreferencia irrealizable');
  chk(typeof policy.checkRunName === 'string' && policy.checkRunName.length > 0, 'policy: checkRunName inválido');
  chk(SHA40.test(policy.detectorCommit) && policy.detectorCommit !== policy.candidateHeadSha, 'policy: detectorCommit inválido o igual al head (D no puede venir del head)');
  chk(typeof policy.testsCheckName === 'string' && policy.testsCheckName.length > 0 && policy.testsCheckName !== policy.checkRunName, 'policy: testsCheckName inválido (check obligatorio del job sin privilegios)');
  chk(policy.verifierCommit !== policy.candidateHeadSha, 'policy: verifierCommit no puede ser el head candidato (autorreferencia)');
  chk(SHA40.test(policy.trustedReusable?.sha), 'policy: trustedReusable.sha inválido');
  chk(policy.trustedReusable?.sha !== policy.candidateHeadSha, 'policy: reusable no puede fijarse al head candidato');
  chk(/^hotclickdev\/Hot-click-dev\/\.github\/workflows\/[A-Za-z0-9._-]+\.ya?ml$/.test(policy.trustedReusable?.path ?? ''), 'policy: trustedReusable.path inválido');
  chk(SHA40.test(policy.caller?.blob), 'policy: caller.blob inválido');
  chk(SHA40.test(policy.fixture?.blob) && SHA64.test(policy.fixture?.fingerprint) && typeof policy.fixture?.entryId === 'string' && policy.fixture.entryId.length > 0 && typeof policy.fixture?.path === 'string' && typeof policy.fixture?.constant === 'string', 'policy: fixture inválido');
  chk(SHA64.test(policy.gitleaks?.sha256) && SHA64.test(policy.gitleaks?.configSha256), 'policy: pins gitleaks inválidos');
  chk(SHA64.test(policy.corpusManifestSha256), 'policy: corpusManifestSha256 inválido');
  chk(policy.approverLogin === undefined || (typeof policy.approverLogin === 'string' && policy.approverLogin.length > 0), 'policy: approverLogin (informativo) debe ser string; la verificación va por approverActorId');
  // Vigencia: solo hasta mergear el PR fijado (sobre el head exacto aprobado). Sin plazos: cualquier otra clave (notAfter...) se rechaza.
  const va = policy.validity;
  chk(va && typeof va === 'object' && !Array.isArray(va) && va.kind === 'untilPullMerged' && va.pullNumber === policy.pullNumber && Object.keys(va).sort().join() === 'kind,pullNumber', 'policy: validity debe ser exactamente {kind:"untilPullMerged", pullNumber == policy.pullNumber} (sin notAfter ni otras claves)');
  return verdict(r);
}
