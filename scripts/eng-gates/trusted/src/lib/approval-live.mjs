// Aprobación EN VIVO — una sola implementación para ESCANEO y CIERRE.
//  fetchApprovalRaw(policy, client): SOLO lecturas REST + GraphQL. El token vive únicamente en
//    `client` (github-read.mjs). En el workflow corre en un paso propio que escribe approval.json;
//    el paso de escaneo (gitleaks, git, datos del head) NO recibe token.
//  evaluateApproval(policy, raw, now): verifyApproval (mismo verificador) + coherencia REST/GraphQL
//    + frescura. 404/null = revocado; no-200, errors, rate limit o campos ausentes = FAIL.
import { createHash } from 'node:crypto';
import { verifyApproval } from './verify-approval.mjs';
import { verifyPolicy } from './verify-policy.mjs';

export const APPROVAL_GQL = 'query($id:ID!){ node(id:$id){ ... on IssueComment { id databaseId body createdAt updatedAt lastEditedAt includesCreatedEdit isMinimized minimizedReason author{ __typename ... on User { databaseId } } userContentEdits(first:1){ totalCount } } } }';
export const MAX_RAW_AGE_MS = 15 * 60 * 1000;
export const canon = (v) => JSON.stringify(v, (k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map((y) => [y, x[y]])) : x));
const sha256 = (s) => createHash('sha256').update(s).digest('hex');

export async function fetchApprovalRaw(policy, client, now = new Date().toISOString()) {
  const rest = await client.get(`/repos/${policy.repository}/issues/comments/${policy.approvalCommentId}`);
  // PR (solo GET): la vigencia es "hasta mergear" sobre el head exacto; se lee siempre, también si el comentario falla.
  const pull = await client.get(`/repos/${policy.repository}/pulls/${policy.pullNumber}`);
  // Sin node_id no se consulta GraphQL; la evaluación falla (404 => revocado; otro => fail-closed).
  const gql = rest?.status === 200 && typeof rest.json?.node_id === 'string' && rest.json.node_id
    ? await client.graphql(APPROVAL_GQL, { id: rest.json.node_id }) : { ok: false, json: null, skipped: true };
  return { schemaVersion: 1, fetchedAt: now, commentId: policy.approvalCommentId, rest, gql, pull };
}

export function evaluateApproval(policy, raw, now = new Date().toISOString()) {
  const pv = verifyPolicy(policy);
  if (!pv.ok) return { ok: false, reasons: pv.reasons };
  if (!raw || raw.schemaVersion !== 1 || raw.commentId !== policy.approvalCommentId) return { ok: false, reasons: ['approval: lectura en vivo ausente o de otro comentario'] };
  const age = Date.parse(now) - Date.parse(raw.fetchedAt);
  const r = [];
  if (!Number.isFinite(age) || age < 0 || age > MAX_RAW_AGE_MS) r.push('approval: lectura no reciente (fail-closed)');
  const v = verifyApproval(policy, { rest: raw.rest, gql: raw.gql, pull: raw.pull, now });
  r.push(...v.reasons);
  const n = raw.gql?.json?.data?.node;
  if (v.ok && (n?.id !== raw.rest.json.node_id || n?.createdAt !== raw.rest.json.created_at)) r.push('approval: REST y GraphQL incoherentes (node_id/createdAt)');
  return { ok: r.length === 0, reasons: r, commentId: policy.approvalCommentId, head: policy.candidateHeadSha, fingerprint: policy.fixture.fingerprint, at: now, responsesSha256: sha256(canon({ rest: raw.rest, gql: raw.gql, pull: raw.pull ?? null })) };
}

export async function readApprovalLive(policy, client, now = new Date().toISOString()) {
  const pv = verifyPolicy(policy);
  if (!pv.ok) return { ok: false, reasons: pv.reasons };
  let raw;
  try { raw = await fetchApprovalRaw(policy, client, now); } catch (e) { return { ok: false, reasons: [`approval: error de lectura (${e.message})`] }; }
  return { ...evaluateApproval(policy, raw, now), raw };
}
