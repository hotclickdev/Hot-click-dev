// Verificación EXTERNA de origen al cierre (defecto 2).
// Enumera TODOS los check runs del SHA con el nombre efectivo (filter=all, paginado completo) y
// exige que CADA uno sea el check de un job de un intento de un run aplicable
// (job.check_run_url == url del check). Un homónimo sin job/origen válido => falla.
// name/external_id/details_url NO dan confianza. Decide el ÚLTIMO intento aplicable; los rojos
// anteriores con origen válido se conservan para auditoría y no bloquean.
// data = { prLive:{number,head_sha}, callerBlobAtHead,
//          runsPages:[{total_count, workflow_runs[]}],
//          attempts:{'<runId>_<n>': attemptJson}  (TODOS los n=1..run_attempt de runs aplicables),
//          jobs:{'<runId>_<n>': {total_count, jobs[]}},
//          checkRunsPages:[{total_count, check_runs[]}],        (checkRunName: escaneo de confianza)
//          testsCheckRunsPages:[{total_count, check_runs[]}] }  (testsCheckName: job SIN privilegios)
// r3: el check de tests (Maven/pnpm del head, job no privilegiado del caller) es OBLIGATORIO con
// la misma asociación check_run_url->job; ausente, homónimo o no success en el último intento => rojo.
import { verdict } from './common.mjs';

function complete(pages, field, label, r) {
  if (!Array.isArray(pages) || pages.length === 0) { r.push(`origin: ${label} sin páginas`); return null; }
  const total = pages[0]?.total_count;
  const all = pages.flatMap((p) => (Array.isArray(p?.[field]) ? p[field] : [null]));
  if (typeof total !== 'number' || total < 0 || all.includes(null) || all.length !== total || pages.some((p) => p.total_count !== total)) {
    r.push(`origin: paginación incompleta/inconsistente de ${label} (${all.length}/${total})`); return null;
  }
  const ids = new Set(all.map((x) => x.id)); if (ids.size !== all.length) { r.push(`origin: ${label} con IDs duplicados entre páginas`); return null; }
  return all;
}

// r6.1: `headArg` = head contra el que se cierra (--head en no-exceptions). Sin headArg, solo live-exception (candidateHeadSha de P).
// TODO lo que deba coincidir con ese head (PR vivo, runs, attempts, jobs, checks) se compara contra `head`.
export function verifyOrigin(policy, data, headArg) {
  const r = [];
  if (!data) return verdict(['origin: datos ausentes']);
  const head = headArg ?? (policy.mode === 'live-exception' ? policy.candidateHeadSha : null), repo = policy.repository;
  if (!/^[0-9a-f]{40}$/.test(head ?? '')) return verdict(['origin: head de cierre ausente o inválido']);
  if (policy.mode === 'live-exception' && head !== policy.candidateHeadSha) return verdict(['origin: head != candidateHeadSha de P (live-exception)']);
  const crUrl = (id) => `https://api.github.com/repos/${repo}/check-runs/${id}`;
  if (data.prLive?.number !== policy.pullNumber) r.push('origin: PR vivo no coincide');
  if (data.prLive?.head_sha !== head) r.push('origin: head vivo del PR != SHA candidato (head movido)');
  if (data.callerBlobAtHead !== policy.caller.blob) r.push('origin: blob del caller en el head != caller aprobado');
  const runs = complete(data.runsPages, 'workflow_runs', 'runs', r);
  const checks = complete(data.checkRunsPages, 'check_runs', 'check runs', r);
  const tchecks = complete(data.testsCheckRunsPages, 'check_runs', 'check runs de tests', r);
  if (!runs || !checks || !tchecks || r.length) return verdict(r);
  const applicable = runs.filter((w) => w.repository?.full_name === repo && w.head_repository?.full_name === repo &&
    w.event === 'pull_request' && w.head_sha === head && w.path === policy.caller.path &&
    (w.pull_requests ?? []).some((p) => p.number === policy.pullNumber && p.head?.sha === head));
  if (applicable.length === 0) return verdict(['origin: ningún run aplicable']);
  // Índice check_run_url -> (run, attempt, job) sobre TODOS los intentos de los runs aplicables.
  const idx = new Map();
  for (const w of applicable) {
    if (!Number.isInteger(w.run_attempt) || w.run_attempt < 1) { r.push(`origin: run ${w.id} sin run_attempt`); continue; }
    for (let n = 1; n <= w.run_attempt; n++) {
      const k = `${w.id}_${n}`, att = data.attempts?.[k], jp = data.jobs?.[k];
      if (!att || att.id !== w.id || att.run_attempt !== n || att.head_sha !== head) { r.push(`origin: attempt ${k} ausente o inconsistente`); continue; }
      if (!jp || !Array.isArray(jp.jobs) || jp.total_count !== jp.jobs.length) { r.push(`origin: jobs de ${k} incompletos`); continue; }
      for (const j of jp.jobs) {
        if (j.run_id !== w.id || j.run_attempt !== n) { r.push(`origin: job ${j.id} no pertenece a ${k}`); continue; }
        idx.set(j.check_run_url, { run: w, n, att, job: j });
      }
    }
  }
  if (r.length) return verdict(r);
  const bind = (list, name, slot, required) => {
    if (list.length === 0) { if (required) r.push(`origin: ningún check '${name}' en el SHA`); return; }
    for (const c of list) {
      const o = idx.get(crUrl(c.id));
      if (!o) { r.push(`origin: check ${c.id} homónimo sin job de run aplicable (ajeno/falso)`); continue; }
      if (c.head_sha !== head || o.job.head_sha !== head) r.push(`origin: check ${c.id} con head distinto`);
      if (c.app?.slug !== 'github-actions') r.push(`origin: check ${c.id} no es de github-actions`);
      if (c.name !== name || o.job.name !== name) r.push(`origin: check ${c.id} nombre efectivo distinto`);
      if (o[slot === 'check' ? 'tcheck' : 'check']) r.push(`origin: check ${c.id} asociado a dos roles`);
      o[slot] = c;
    }
  };
  bind(checks, policy.checkRunName, 'check', true);
  bind(tchecks, policy.testsCheckName, 'tcheck', false); // ausencia => rojo abajo (último intento)
  if (r.length) return verdict(r);
  // Último intento aplicable: run más reciente (created_at, id) y su intento máximo.
  applicable.sort((a, b) => (Date.parse(a.created_at) - Date.parse(b.created_at)) || (a.id - b.id));
  const last = applicable[applicable.length - 1];
  const k = `${last.id}_${last.run_attempt}`;
  const att = data.attempts[k];
  const expRef = `${policy.trustedReusable.path}@${policy.trustedReusable.sha}`;
  const refs = att.referenced_workflows;
  if (!Array.isArray(refs)) r.push('origin: referenced_workflows ausente');
  else {
    if (refs.filter((x) => x.path === expRef && x.sha === policy.trustedReusable.sha).length !== 1) r.push('origin: reusable@SHA de confianza no referenciado exactamente');
    if (refs.some((x) => String(x.path).startsWith(policy.trustedReusable.path + '@') && x.sha !== policy.trustedReusable.sha)) r.push('origin: reusable referenciado con SHA distinto');
  }
  if (att.status !== 'completed' || att.conclusion !== 'success') r.push(`origin: último intento aplicable ${k} no es success (${att.status}/${att.conclusion})`);
  const lastChecks = [...idx.values()].filter((o) => o.run.id === last.id && o.n === last.run_attempt && o.check);
  if (lastChecks.length === 0) r.push(`origin: el último intento ${k} no tiene check '${policy.checkRunName}'`);
  for (const o of lastChecks) if (o.check.conclusion !== 'success' || o.job.conclusion !== 'success') r.push(`origin: check ${o.check.id} del último intento no success`);
  const lastTests = [...idx.values()].filter((o) => o.run.id === last.id && o.n === last.run_attempt && o.tcheck);
  if (lastTests.length === 0) r.push(`origin: el último intento ${k} no tiene check de tests '${policy.testsCheckName}' (omitido/renombrado => rojo)`);
  for (const o of lastTests) if (o.tcheck.conclusion !== 'success' || o.job.conclusion !== 'success') r.push(`origin: check de tests ${o.tcheck.id} del último intento no success`);
  const audit = [...idx.values()].filter((o) => o.check && !(o.run.id === last.id && o.n === last.run_attempt)).map((o) => ({ check: o.check.id, run: o.run.id, attempt: o.n, conclusion: o.check.conclusion }));
  return { ...verdict(r), lastApplicable: k, lastScanCheckIds: lastChecks.map((o) => o.check.id), audit };
}
