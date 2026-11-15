// Protocolo de aprobación por comentario ORIGINAL con ID fijado en la política.
// Revocar = editar o borrar ese comentario. No se consultan eventos ni logs: su
// ausencia no prueba nada. Datos de entrada = lecturas en vivo al cierre (REST + GraphQL).
import { verdict } from './common.mjs';

export function expectedApprovalBody(policy) {
  return `E4-APRUEBO-EXCEPCION pr=${policy.pullNumber} head=${policy.candidateHeadSha} fixture=${policy.fixture.fingerprint} verifier=${policy.verifierCommit}`;
}

// live = { rest: {status, json}, gql: {ok, json}, pull: {status, json}, now: ISO }
export function verifyApproval(policy, live) {
  const r = [];
  if (!live || !live.rest || !live.gql || !live.pull) return verdict(['approval: lecturas en vivo ausentes']);
  const { rest, gql } = live;
  if (rest.status === 404) return verdict(['approval: comentario original borrado o inexistente (= revocado)']);
  if (rest.status !== 200 || !rest.json) return verdict([`approval: REST status ${rest.status} (fail-closed)`]);
  if (!gql.ok || gql.json?.errors?.length || !gql.json?.data) return verdict(['approval: GraphQL error/ambigüedad (fail-closed)']);
  const c = rest.json;
  const n = gql.json.data.node;
  if (!n) return verdict(['approval: GraphQL node nulo (borrado o inaccesible)']);
  // Identidad: ID numérico del actor designado (no login).
  if (c.id !== policy.approvalCommentId || n.databaseId !== policy.approvalCommentId) r.push('approval: ID de comentario distinto del fijado (un repost requiere NUEVA evaluación)');
  if (c.user?.id !== policy.approverActorId || n.author?.databaseId !== policy.approverActorId) r.push('approval: autor distinto del actor designado');
  if (c.user?.type !== 'User' || n.author?.__typename !== 'User') r.push('approval: autor no es User');
  if (c.performed_via_github_app !== null) r.push('approval: publicado vía GitHub App');
  const expIssue = `https://api.github.com/repos/${policy.repository}/issues/${policy.pullNumber}`;
  if (c.issue_url !== expIssue) r.push('approval: comentario no pertenece al PR fijado');
  // Sin ediciones, incluso revertidas.
  if (n.lastEditedAt !== null) r.push('approval: lastEditedAt no nulo (editado)');
  if (n.includesCreatedEdit !== false) r.push('approval: includesCreatedEdit != false (historial de ediciones)');
  const ue = n.userContentEdits;
  if (!ue || typeof ue.totalCount !== 'number') r.push('approval: userContentEdits ausente (ambiguo)');
  else if (ue.totalCount !== 0) r.push(`approval: userContentEdits.totalCount=${ue.totalCount} (edición, aun revertida)`);
  if (c.updated_at !== c.created_at) r.push('approval: updated_at != created_at (ambiguo, fail-closed)');
  if (n.isMinimized !== false) r.push('approval: comentario minimizado');
  // Contenido exacto (el SHA completo prueba que se escribió tras existir el head).
  if ((c.body ?? '').trim() !== expectedApprovalBody(policy) || (n.body ?? '').trim() !== expectedApprovalBody(policy)) r.push('approval: cuerpo no coincide exactamente');
  // Vigencia: solo hasta mergear el PR y sobre el hash exacto aprobado (el SHA va en el cuerpo y en la política). Sin plazos.
  const now = Date.parse(live.now), created = Date.parse(c.created_at);
  if (![now, created].every(Number.isFinite)) r.push('approval: fechas inválidas');
  else if (created > now) r.push('approval: created_at en el futuro');
  const { pull } = live, j = pull.json;
  if (pull.status !== 200 || !j || typeof j !== 'object') r.push(`approval: PR REST status ${pull.status} (fail-closed)`);
  else {
    if (j.merged === true || typeof j.merged_at === 'string') r.push('approval: vencida (PR mergeado)');
    else if (j.merged !== false || j.merged_at !== null) r.push('approval: PR merged/merged_at ausentes o ambiguos (fail-closed)');
    if (j.number !== policy.pullNumber) r.push('approval: PR leído distinto del fijado');
    if (j.state !== 'open') r.push(`approval: PR no abierto (state=${j.state})`);
    if (j.head?.sha !== policy.candidateHeadSha) r.push('approval: head del PR distinto del hash aprobado');
    if (j.base?.repo?.full_name !== policy.repository) r.push('approval: base.repo del PR distinto del repositorio fijado');
  }
  return verdict(r);
}
