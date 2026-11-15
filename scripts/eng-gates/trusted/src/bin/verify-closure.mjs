#!/usr/bin/env node
// Verificador externo al CIERRE (no instalado; no ejecutado contra la red en este paquete).
// Defecto 4: se ejecuta SOLO desde la fuente V fijada: comprueba con git que el checkout que
// contiene este fichero está en V = policy.verifierCommit y limpio, calcula sha256 de sus
// fuentes y registra procedencia. La política se lee como objeto git P:<ruta> (P no figura
// dentro de la política). El resultado queda vinculado (head, V, P, política, respuestas API).
// No sustituye CI: solo comprueba la procedencia del resultado de CI y la aprobación en vivo.
// Uso futuro: node src/bin/verify-closure.mjs --policy-commit <P> [--head <sha40>]  (GH_TOKEN solo lectura; P = commit de un solo fichero e4-policy.json)
// r6.1: mode no-exceptions => --head <sha40> OBLIGATORIO (lo da quien mergea): coincide con el head vivo del PR, el head_sha de runs/checks/attempts
//   y la procedencia; distinto de P, D, V y W; el merge se hace con ESE sha (un push nuevo cambia el head vivo e invalida el cierre). Sin comentario de aprobación.
//   mode live-exception => como r6 (candidateHeadSha y comentario de P); --head no se admite.
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyPolicy, resolveHead } from '../lib/verify-policy.mjs';
import { readApprovalLive } from '../lib/approval-live.mjs';
import { loadPolicyAsData } from '../lib/policy-source.mjs';
import { verifyProvenance } from '../lib/provenance.mjs';
import { verifyOrigin } from '../lib/verify-origin.mjs';
import { readOnlyClient } from '../lib/github-read.mjs';
import { isMain, runMain } from '../lib/cli.mjs';

const SHA40 = /^[0-9a-f]{40}$/;
const sha256 = (b) => createHash('sha256').update(b).digest('hex');
const canon = (v) => JSON.stringify(v, (k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map((y) => [y, x[y]])) : x));
const git = (dir, args) => execFileSync('git', ['-C', dir, ...args], { env: { PATH: '/usr/bin:/bin', GIT_CONFIG_NOSYSTEM: '1', HOME: '/nonexistent' } }).toString();

export const DEFAULT_SOURCE_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

// Procedencia de la fuente en ejecución. sourceRoot = raíz del checkout git que contiene src/.
export function sourceProvenance(sourceRoot) {
  const top = git(sourceRoot, ['rev-parse', '--show-toplevel']).trim();
  const commit = git(top, ['rev-parse', 'HEAD']).trim();
  const dirty = git(top, ['status', '--porcelain', '--untracked-files=all']).split('\n').filter(Boolean);
  const srcDir = join(sourceRoot, 'src');
  const files = {};
  const walk = (d) => { for (const e of readdirSync(d, { withFileTypes: true })) { const p = join(d, e.name); if (e.isDirectory()) walk(p); else files[relative(top, p)] = sha256(readFileSync(p)); } };
  walk(srcDir);
  // Cada fuente cargada debe coincidir byte a byte con el blob de V.
  const mismatched = Object.entries(files).filter(([p, h]) => { try { return sha256(execFileSync('git', ['-C', top, 'cat-file', 'blob', `${commit}:${p}`])) !== h; } catch { return true; } }).map(([p]) => p);
  return { top, commit, dirty: dirty.length, mismatched, files };
}

export function checkSource(prov, policy) {
  const r = [];
  if (!SHA40.test(policy?.verifierCommit ?? '')) r.push('fuente: verifierCommit sin fijar');
  else if (prov.commit !== policy.verifierCommit) r.push(`fuente: ejecutando ${prov.commit} != V ${policy.verifierCommit}`);
  if (prov.dirty !== 0) r.push(`fuente: árbol sucio (${prov.dirty})`);
  if (prov.mismatched.length) r.push(`fuente: ficheros distintos de V: ${prov.mismatched.join(',')}`);
  return r;
}

// r3: P se lee como DATOS de un commit de un solo fichero (policy-source.mjs); se devuelve commit+blob.
export function loadPolicyFromCommit(sourceTop, policyCommit) {
  const P = loadPolicyAsData(sourceTop, policyCommit, {});
  return { raw: P.raw, policy: P.policy, blob: P.blob, sha256: P.sha256 };
}

// r6.1: argumentos del CLI, estrictos: solo --policy-commit y --head, sin duplicados ni valores ausentes.
export function parseClosureArgs(argv) {
  const a = {}; const errs = [];
  if (argv.length % 2 !== 0) errs.push('argumentos: cada --opción lleva un valor');
  for (let i = 0; i + 1 < argv.length; i += 2) {
    const k = argv[i];
    if (k !== '--policy-commit' && k !== '--head') { errs.push(`argumento desconocido ${k}`); continue; }
    const n = k.slice(2);
    if (Object.hasOwn(a, n)) { errs.push(`argumento repetido ${k}`); continue; }
    a[n] = argv[i + 1];
  }
  if (a['policy-commit'] === undefined) errs.push('argumento --policy-commit ausente');
  return { args: a, errs };
}

export function bindResult(core, ctx) {
  const binding = { head: ctx.head, mode: ctx.policy.mode, verifierCommit: ctx.prov.commit, policyCommit: ctx.policyCommit, policyBlob: ctx.policyBlob ?? null,
    policySha256: sha256(ctx.policyRaw), sourceFiles: ctx.prov.files, inputsSha256: sha256(canon(ctx.inputs)), at: ctx.now };
  return { ...core, binding, bindingSha256: sha256(canon({ ok: core.ok, reasons: core.reasons, binding })) };
}

// Comprueba que un resultado corresponde EXACTAMENTE a (head, V, P, política) esperados.
export function checkBinding(res, exp) {
  const r = [];
  if (!res?.binding || typeof res.bindingSha256 !== 'string') return ['resultado sin vinculación'];
  if (sha256(canon({ ok: res.ok, reasons: res.reasons, binding: res.binding })) !== res.bindingSha256) r.push('vinculación alterada');
  for (const k of ['head', 'verifierCommit', 'policyCommit', 'policyBlob', 'policySha256']) if (res.binding[k] !== exp[k]) r.push(`vinculación: ${k} distinto`);
  if (res.ok !== true) r.push('resultado no OK');
  return r;
}

export async function closure({ policy, policyRaw, policyCommit, policyBlob, prov, client, head: headArg, now = new Date().toISOString() }) {
  const pv = verifyPolicy(policy);
  if (!pv.ok) return { ok: false, stage: 'policy', reasons: pv.reasons };
  const sr = checkSource(prov, policy);
  if (sr.length) return { ok: false, stage: 'source', reasons: sr };
  const liveExc = policy.mode === 'live-exception';
  // r6.1 (b): head de cierre (--head en no-exceptions; candidateHeadSha en live-exception) y su distinción de P, D, V y W.
  const rh = resolveHead(policy, headArg, policyCommit);
  if (rh.reasons.length) return { ok: false, stage: 'head', reasons: rh.reasons };
  const head = rh.head;
  // r6.2 (S5): defensa explícita, un mensaje por lado. En live-exception P no vive dentro de la política (verifyPolicy no la compara con candidateHeadSha): esta es la única comprobación de P != head candidato.
  if (policyCommit === policy.verifierCommit) return { ok: false, stage: 'policy', reasons: ['policy: P debe ser distinto de V'] };
  if (policyCommit === head) return { ok: false, stage: 'policy', reasons: ['policy: P debe ser distinto del head'] };
  if (!SHA40.test(policyBlob ?? '')) return { ok: false, stage: 'policy', reasons: ['policy: blob de P ausente'] };
  const repo = policy.repository;
  // Aprobación: MISMA función que el escaneo (approval-live.mjs). En no-exceptions NO se exige ni se lee (sin lector, sin comentario).
  const ap = liveExc ? await readApprovalLive(policy, client, now) : { ok: true, reasons: [], raw: null };
  const pr = await client.get(`/repos/${repo}/pulls/${policy.pullNumber}`);
  const runsPages = await client.paginate(`/repos/${repo}/actions/runs?head_sha=${head}&per_page=100`, 'workflow_runs');
  const byName = (n) => client.paginate(`/repos/${repo}/commits/${head}/check-runs?check_name=${encodeURIComponent(n)}&filter=all&per_page=100`, 'check_runs');
  const checkRunsPages = await byName(policy.checkRunName);
  const testsCheckRunsPages = await byName(policy.testsCheckName);
  const attempts = {}, jobs = {};
  for (const w of runsPages.flatMap((p) => p.workflow_runs ?? [])) {
    if (w.event !== 'pull_request' || w.head_sha !== head || w.path !== policy.caller.path) continue; // solo candidatos; el resto no aporta origen
    for (let n = 1; n <= (w.run_attempt ?? 0); n++) {
      const k = `${w.id}_${n}`;
      attempts[k] = (await client.get(`/repos/${repo}/actions/runs/${w.id}/attempts/${n}`)).json;
      const jp = await client.paginate(`/repos/${repo}/actions/runs/${w.id}/attempts/${n}/jobs?per_page=100`, 'jobs');
      jobs[k] = { total_count: jp[0]?.total_count, jobs: jp.flatMap((p) => p.jobs ?? []) };
    }
  }
  const caller = await client.get(`/repos/${repo}/contents/${policy.caller.path}?ref=${head}`);
  const og = verifyOrigin(policy, { prLive: { number: pr.json?.number, head_sha: pr.json?.head?.sha }, runsPages, attempts, jobs, checkRunsPages, testsCheckRunsPages, callerBlobAtHead: caller.json?.sha }, head);
  // Procedencia del escaneo: anotación del check del ÚLTIMO intento aplicable (exactamente uno).
  const annotations = {}; const provR = [];
  if (og.ok) {
    if (og.lastScanCheckIds?.length !== 1) provR.push('provenance: se esperaba exactamente un check de escaneo en el último intento');
    else {
      const id = og.lastScanCheckIds[0];
      annotations[id] = await client.paginateArray(`/repos/${repo}/check-runs/${id}/annotations?per_page=100`);
      provR.push(...verifyProvenance(annotations[id], { head, detectorCommit: policy.detectorCommit, policyCommit, policyBlob, policySha256: sha256(policyRaw),
        manifestSha256: policy.corpusManifestSha256, mode: policy.mode, commentId: policy.approvalCommentId, exceptionRequired: liveExc }));
    }
  }
  const inputs = { rest: ap.raw?.rest ?? null, gql: ap.raw?.gql ?? null, pull: ap.raw?.pull ?? null, pr: pr.json, runsPages, checkRunsPages, testsCheckRunsPages, attempts, jobs, caller: caller.json?.sha ?? null, annotations };
  const reasons = [...ap.reasons, ...og.reasons, ...provR];
  const core = { ok: ap.ok === true && og.ok === true && provR.length === 0 && reasons.length === 0, stage: 'closure', reasons, lastApplicable: og.lastApplicable, audit: og.audit };
  return bindResult(core, { policy, policyRaw, policyCommit, policyBlob, prov, inputs, now, head });
}

// r4: arranque con isMain/runMain (antes la comparación con file:// no corría con rutas con espacio/codificadas/symlink y salía 0).
if (isMain(import.meta.url)) await runMain(async () => {
  const { args: a, errs } = parseClosureArgs(process.argv.slice(2));
  let out;
  try {
    if (errs.length) throw new Error(errs.join('; '));
    const prov = sourceProvenance(DEFAULT_SOURCE_ROOT);
    const { raw, policy, blob } = loadPolicyFromCommit(prov.top, a['policy-commit']);
    const pv = verifyPolicy(policy); const sr = checkSource(prov, policy);
    if (!pv.ok || sr.length) out = { ok: false, stage: !pv.ok ? 'policy' : 'source', reasons: [...pv.reasons, ...sr] };
    else out = await closure({ policy, policyRaw: raw, policyCommit: a['policy-commit'], policyBlob: blob, prov, head: a.head, client: readOnlyClient(process.env.GH_TOKEN) });
  } catch (e) { out = { ok: false, stage: 'error', reasons: [e.message] }; }
  console.log(JSON.stringify(out, null, 2)); return out.ok === true ? 0 : 2;
});
