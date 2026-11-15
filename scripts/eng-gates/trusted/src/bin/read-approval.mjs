#!/usr/bin/env node
// Paso LECTOR (único con GH_TOKEN de solo lectura). Lee P como datos, hace SOLO GET REST + query
// GraphQL del comentario de aprobación y escribe las respuestas crudas en --out. No ejecuta git
// del head, gitleaks ni nada del head; el token no sale de github-read.mjs.
import { writeFileSync } from 'node:fs';
import { loadPolicyAsData } from '../lib/policy-source.mjs';
import { verifyPolicy } from '../lib/verify-policy.mjs';
import { fetchApprovalRaw } from '../lib/approval-live.mjs';
import { readOnlyClient } from '../lib/github-read.mjs';
import { isMain, runMain } from '../lib/cli.mjs';

export async function readApproval(a, client) {
  const P = loadPolicyAsData(a['policy-git'], a['policy-commit'], {});
  const pv = verifyPolicy(P.policy);
  if (!pv.ok) return { ok: false, reasons: pv.reasons };
  const raw = await fetchApprovalRaw(P.policy, client);
  return { ok: true, raw };
}

// r4: arranque con isMain/runMain; la evaluación (aprobada o no) la hace el escaneo, aquí solo la lectura (0 solo si se escribió --out).
if (isMain(import.meta.url)) await runMain(async () => {
  const argv = process.argv.slice(2); const a = {};
  for (let i = 0; i < argv.length; i += 2) a[argv[i].replace(/^--/, '')] = argv[i + 1];
  let res;
  try { const token = process.env.GH_TOKEN; delete process.env.GH_TOKEN; res = await readApproval(a, readOnlyClient(token)); }
  catch (e) { res = { ok: false, reasons: [e.message] }; }
  if (res.ok && !a.out) res = { ok: false, reasons: ['argumento --out ausente'] };
  if (res.ok) writeFileSync(a.out, JSON.stringify(res.raw), { flag: 'wx', mode: 0o444 });
  console.log(JSON.stringify({ ok: res.ok, reasons: res.reasons ?? [] }));
  return res.ok ? 0 : 2;
});
