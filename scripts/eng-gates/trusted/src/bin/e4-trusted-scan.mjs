#!/usr/bin/env node
// Escaneo de confianza (parte de D). Tres etapas obligatorias (src/lib/stages.mjs): árbol gitleaks,
// rango gitleaks y E4 COMPLETO (analyzeCommitGate/formatVerdict de D sobre datos del head).
// r3: P se lee como datos (policy-source), la aprobación se evalúa con el mismo verificador que el
// cierre (approval-live) y la procedencia se emite como anotación del check.
// r6.1: P trae `mode` (no-exceptions | live-exception). En no-exceptions el escaneo NO recibe ni acepta --approval,
// no evalúa aprobación y applyLiveException no se invoca (ningún bloqueo 'secret' se puede quitar).
// BLOQUEO FIJO: mientras FIXED_BLOCK no sea null el proceso termina != 0 aunque todo pase.
// Solo se quita en un commit revisado por Seguridad, con el manifiesto definitivo REVISADO.
import { readFileSync, appendFileSync } from 'node:fs';
import { isMain, runMain } from '../lib/cli.mjs';
import { createHash } from 'node:crypto';
import { deepFindUnset, SHA64 } from '../lib/common.mjs';
import { validateManifest } from '../lib/classify-findings.mjs';
import { stageTree, stageRange, combineStages } from '../lib/stages.mjs';
import { stageE4Full } from '../lib/e4-full.mjs';
import { loadPolicyAsData } from '../lib/policy-source.mjs';
import { verifyPolicy } from '../lib/verify-policy.mjs';
import { evaluateApproval } from '../lib/approval-live.mjs';
import { buildProvenance, annotationLine } from '../lib/provenance.mjs';

export const FIXED_BLOCK = 'BLOQUEO FIJO: manifiesto definitivo no revisado por Seguridad y bootstrap no autorizado';

// Config del escaneo (en D): pins de gitleaks y sha256 del manifiesto. Sin defaults.
export function verifyScanConfig(c) {
  const r = [];
  if (!c || c.schemaVersion !== 1) return ['scan-config: ausente o schemaVersion != 1'];
  if (c.status !== 'ACTIVE') r.push(`scan-config: status=${c.status}`);
  for (const p of deepFindUnset(c)) r.push(`scan-config: valor sin fijar en ${p}`);
  if (r.length) return r;
  if (c.gitleaks?.version !== '8.30.1' || !SHA64.test(c.gitleaks?.sha256 ?? '') || !SHA64.test(c.gitleaks?.configSha256 ?? '')) r.push('scan-config: pins gitleaks inválidos');
  if (!SHA64.test(c.corpusManifestSha256 ?? '')) r.push('scan-config: corpusManifestSha256 inválido');
  return r;
}

export const REQUIRED_ARGS = Object.freeze(['head-git', 'head', 'base', 'gitleaks', 'gitleaks-config', 'detector-dir', 'detector-commit', 'policy-git', 'policy-commit']);
// r6.1: --approval es obligatorio SOLO en live-exception y está PROHIBIDO en no-exceptions (ver runScan).

// a['approval'] = fichero escrito por el paso lector (read-approval.mjs, único con token).
// Este proceso NO recibe token: gitleaks/git/datos del head corren sin credenciales.
export async function runScan(a, { fixedBlock = FIXED_BLOCK, now = new Date().toISOString() } = {}) {
  const reasons = [];
  let scfg, manifest, manifestRaw;
  try { scfg = JSON.parse(readFileSync(a['scan-config'], 'utf8')); } catch (e) { return { ok: false, exit: 2, stage: 'config', reasons: [`scan-config ilegible: ${e.message}`] }; }
  try { manifestRaw = readFileSync(a.manifest); manifest = JSON.parse(manifestRaw); } catch (e) { return { ok: false, exit: 2, stage: 'config', reasons: [`manifest ilegible: ${e.message}`] }; }
  reasons.push(...verifyScanConfig(scfg), ...validateManifest(manifest).reasons);
  const manifestSha256 = createHash('sha256').update(manifestRaw).digest('hex');
  if (!reasons.length && manifestSha256 !== scfg.corpusManifestSha256) reasons.push('manifest: sha256 != scan-config');
  for (const k of REQUIRED_ARGS) if (!a[k]) reasons.push(`argumento --${k} ausente`);
  if (reasons.length) return { ok: false, exit: 2, stage: 'config', reasons };
  // P como DATOS (árbol de un solo fichero; nunca head/base). Su commit+blob van a la procedencia.
  let P;
  try { P = loadPolicyAsData(a['policy-git'], a['policy-commit'], { head: a.head, base: a.base }); } catch (e) { return { ok: false, exit: 2, stage: 'policy', reasons: [e.message] }; }
  const pv = verifyPolicy(P.policy);
  if (!pv.ok) return { ok: false, exit: 2, stage: 'policy', reasons: pv.reasons };
  const pol = P.policy;
  const noExc = pol.mode === 'no-exceptions';
  if (noExc) {
    if (Object.hasOwn(a, 'approval')) return { ok: false, exit: 2, stage: 'policy', reasons: ['argumento --approval no se acepta en no-exceptions (ningún archivo de aprobación)'] };
    // El head del PR no puede ser P, D, V ni W (mismo criterio que el cierre con --head).
    const same = Object.entries({ P: P.commit, D: a['detector-commit'], V: pol.verifierCommit, W: pol.trustedReusable.sha }).filter(([, v]) => v === a.head).map(([n]) => n);
    if (same.length) return { ok: false, exit: 2, stage: 'policy', reasons: [`head: el head del PR es igual a ${same.join(',')} (no puede ser P, D, V ni W)`] };
  } else if (!a.approval) return { ok: false, exit: 2, stage: 'config', reasons: ['argumento --approval ausente (live-exception)'] };
  const coh = [];
  if (pol.detectorCommit !== a['detector-commit']) coh.push('policy: detectorCommit de P != D fijado por W');
  if (pol.corpusManifestSha256 !== manifestSha256) coh.push('policy: corpusManifestSha256 de P != manifiesto');
  if (pol.gitleaks.sha256 !== scfg.gitleaks.sha256 || pol.gitleaks.configSha256 !== scfg.gitleaks.configSha256) coh.push('policy: pins gitleaks de P != scan-config');
  // Aprobación: mismo evaluador que el cierre, sobre las respuestas crudas del lector.
  let approval = null; // no-exceptions: null (no se lee ni se evalúa nada)
  if (!noExc) {
    try { approval = evaluateApproval(pol, JSON.parse(readFileSync(a.approval, 'utf8')), now); }
    catch (e) { approval = { ok: false, reasons: [`approval: lectura ausente/ilegible (${e.message})`] }; }
  }
  const gl = { binary: a.gitleaks, binarySha256: scfg.gitleaks.sha256, config: a['gitleaks-config'], configSha256: scfg.gitleaks.configSha256 };
  const results = [
    stageTree({ gitDir: a['head-git'], head: a.head, manifest, gl }),
    stageRange({ gitDir: a['head-git'], base: a.base, head: a.head, manifest, gl }),
    await stageE4Full({ gitDir: a['head-git'], base: a.base, head: a.head, manifest, detectorDir: a['detector-dir'], detectorCommit: a['detector-commit'], policy: pol, approval, now: new Date(now) }),
  ];
  const v = combineStages(results);
  v.reasons.unshift(...coh);
  if (fixedBlock) v.reasons.push(fixedBlock);
  const ok = v.reasons.length === 0;
  const e4 = results[2].evidence ?? null;
  const provenance = buildProvenance({ head: a.head, base: a.base, detectorCommit: a['detector-commit'], policyCommit: P.commit, policyBlob: P.blob, policySha256: P.sha256,
    manifestSha256, mode: pol.mode, approval, stages: results, e4: e4 && { verdict: e4.verdict, checks: e4.checks, exception: e4.exception, plan: e4.plan, bodySha256: e4.bodySha256 }, fixedBlock: fixedBlock || null, ok });
  return { ok, exit: ok ? 0 : 1, stage: 'scan', head: a.head, base: a.base, reasons: v.reasons, stages: v.stages, mode: pol.mode, approval: approval && { ok: approval.ok, reasons: approval.reasons }, provenance };
}

// r4: arranque con isMain/runMain (rutas con espacio/codificadas/symlink); sin anotación de procedencia => != 0.
if (isMain(import.meta.url)) await runMain(async () => {
  const argv = process.argv.slice(2); const a = {};
  for (let i = 0; i < argv.length; i += 2) { if (!argv[i].startsWith('--')) { console.error('argumento inválido'); return 2; } a[argv[i].slice(2)] = argv[i + 1]; }
  const res = await runScan(a);
  console.log(JSON.stringify(res, null, 2));
  if (res.provenance) console.log(annotationLine(res.provenance)); // el cierre la lee del check (una sola línea ::notice)
  else { console.error('procedencia: no se pudo emitir la anotación E4-PROVENANCE'); return res.exit === 0 ? 1 : res.exit; }
  if (process.env.GITHUB_OUTPUT && res.provenance?.e4?.plan) {
    const jt = (res.provenance.e4.plan.javaTests ?? []).filter((t) => /^[A-Za-z0-9_.$]+$/.test(t)).join(',');
    appendFileSync(process.env.GITHUB_OUTPUT, `java_tests=${jt}\nfe=${res.provenance.e4.plan.runFrontendTests ? 'true' : 'false'}\n`);
  }
  return res.exit;
});
