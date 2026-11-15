// Defecto 1: tres etapas OBLIGATORIAS (árbol gitleaks, rango git base..head, E4 scanCommitBlockers).
// Cada etapa devuelve {stage, ran, ok, reasons, evidence}. Etapa ausente, no ejecutada, con error
// o fallida => veredicto global no OK. El detector E4 solo se importa del checkout D verificado
// (commit exacto y árbol limpio), NUNCA del head.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { gitData, readTree, exportTreeAsData } from './head-data.mjs';
import { buildGitleaks, normalizeGitleaks } from './gitleaks-args.mjs';
import { classifyTree, classifyRange, classifyE4 } from './classify-findings.mjs';

// r3: la etapa E4 es el E4 COMPLETO (src/lib/e4-full.mjs); stageE4 (solo bloqueos) queda como
// utilidad de diagnóstico y NO satisface la etapa obligatoria.
export const REQUIRED_STAGES = Object.freeze(['tree-gitleaks', 'range-gitleaks', 'e4-full']);
const SHA40 = /^[0-9a-f]{40}$/;
const fail = (stage, reasons, evidence = {}) => ({ stage, ran: true, ok: false, reasons, evidence });

export function resolveRange(gitDir, base, head) {
  if (!SHA40.test(base ?? '') || !SHA40.test(head ?? '')) throw new Error('rango: base/head no son SHA-1 completos');
  if (base === head) throw new Error('rango: base == head');
  for (const s of [base, head]) {
    let t; try { t = gitData(gitDir, ['cat-file', '-t', s], { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { throw new Error(`rango: ${s} inexistente`); }
    if (t !== 'commit') throw new Error(`rango: ${s} no es commit`);
  }
  let mb;
  try { mb = gitData(gitDir, ['merge-base', base, head], { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { throw new Error('rango: base y head sin ancestro común'); }
  if (!SHA40.test(mb)) throw new Error('rango: merge-base inválido');
  const commits = gitData(gitDir, ['rev-list', `${mb}..${head}`]).toString().trim().split('\n').filter(Boolean);
  if (commits.length === 0) throw new Error('rango: vacío (head ya contenido en base)');
  return { mergeBase: mb, commits };
}

function runGitleaks(gl, mode, target, logOpts) {
  const empty = mkdtempSync(join(tmpdir(), 'glignore-'));
  const report = join(mkdtempSync(join(tmpdir(), 'glrep-')), 'r.json');
  const inv = buildGitleaks({ ...gl, emptyIgnoreDir: empty, mode, target, report, logOpts });
  execFileSync(inv.cmd, inv.argv, { env: inv.env, stdio: ['ignore', 'ignore', 'pipe'] });
  return JSON.parse(readFileSync(report, 'utf8'));
}

export function stageTree({ gitDir, head, manifest, gl, limits }) {
  try {
    const tree = readTree(gitDir, head, limits);
    const dir = exportTreeAsData(gitDir, head, tree, limits);
    const findings = normalizeGitleaks(runGitleaks(gl, 'dir', dir), { mode: 'dir', target: dir, treeByPath: new Map(tree.map((t) => [t.path, t.blob])) });
    const c = classifyTree(manifest, tree, findings);
    return { stage: 'tree-gitleaks', ran: true, ok: c.ok, reasons: c.reasons, evidence: { files: tree.length, findings: findings.length, corpus: c.corpus.length, product: c.product.length } };
  } catch (e) { return fail('tree-gitleaks', [`error: ${e.message}`]); }
}

export function stageRange({ gitDir, base, head, manifest, gl }) {
  try {
    const { mergeBase, commits } = resolveRange(gitDir, base, head);
    const blobOf = (c, p) => gitData(gitDir, ['rev-parse', '--verify', `${c}:${p}`]).toString().trim();
    const findings = normalizeGitleaks(runGitleaks(gl, 'git', gitDir, `${mergeBase}..${head}`), { mode: 'git', blobOf });
    const c = classifyRange(manifest, commits, findings);
    return { stage: 'range-gitleaks', ran: true, ok: c.ok, reasons: c.reasons, evidence: { mergeBase, commits: commits.length, findings: findings.length, corpus: c.corpus.length, historical: c.historical.length, product: c.product.length } };
  } catch (e) { return fail('range-gitleaks', [`error: ${e.message}`]); }
}

// Verifica el checkout del detector D: commit exacto y sin cambios (solo se tolera node_modules
// sin seguimiento creado por `npm ci --ignore-scripts`).
export function verifyDetectorCheckout(dir, detectorCommit) {
  if (!SHA40.test(detectorCommit ?? '')) throw new Error('detector: detectorCommit sin fijar');
  const head = execFileSync('git', ['-C', dir, 'rev-parse', 'HEAD']).toString().trim();
  if (head !== detectorCommit) throw new Error(`detector: checkout ${head} != D ${detectorCommit}`);
  const st = execFileSync('git', ['-C', dir, 'status', '--porcelain', '--untracked-files=all', '--ignored=no']).toString()
    .split('\n').filter(Boolean).filter((l) => !/^\?\? scripts\/eng-gates\/node_modules(\/|$)/.test(l));
  if (st.length) throw new Error(`detector: árbol sucio (${st.length} entradas)`);
  return head;
}

export async function stageE4({ gitDir, base, head, manifest, detectorDir, detectorCommit, now, limits }) {
  try {
    const d = verifyDetectorCheckout(detectorDir, detectorCommit);
    const lib = await import(pathToFileURL(join(detectorDir, 'scripts/eng-gates/ola3-lib.mjs')).href);
    const jlm = await import(pathToFileURL(join(detectorDir, 'scripts/eng-gates/java-loop-map.mjs')).href);
    if (typeof lib.scanCommitBlockers !== 'function' || typeof jlm.resolveParse !== 'function') throw new Error('detector: API E4 ausente');
    const parsed = await jlm.resolveParse();
    if (!parsed.ok) throw new Error(`detector: parser no disponible (${parsed.status})`);
    const { mergeBase } = resolveRange(gitDir, base, head);
    const changedFiles = gitData(gitDir, ['diff', '--no-ext-diff', '--no-textconv', '--name-only', mergeBase, head]).toString().split('\n').map((s) => s.trim()).filter(Boolean);
    const diffText = gitData(gitDir, ['diff', '--no-ext-diff', '--no-textconv', '-U20', mergeBase, head]).toString();
    const fileTexts = {};
    for (const p of changedFiles) {
      if (!/(?:^|\/)src\/test\/.*\.java$/.test(p)) continue;
      let blob; try { blob = gitData(gitDir, ['rev-parse', '--verify', `${head}:${p}`]).toString().trim(); } catch { continue; }
      const text = gitData(gitDir, ['cat-file', 'blob', blob]).toString('utf8');
      fileTexts[p] = { text, blob, hash: createHash('sha256').update(text).digest('hex') };
    }
    const audit = [];
    // Registro de excepciones: el de D (loadExceptionRegistry por defecto lee REPO_ROOT de D), nunca el del head.
    // approvalVerifier: el de D (PRODUCTION_APPROVAL_VERIFIER, hoy null) => ninguna excepción aplica.
    const blockers = lib.scanCommitBlockers({ changedFiles, diffText, fileTexts, parse: parsed.parse, now: now ?? new Date(), audit });
    if (!Array.isArray(blockers)) throw new Error('detector: salida E4 inválida');
    const tree = readTree(gitDir, head, limits);
    const c = classifyE4(manifest, new Map(tree.map((t) => [t.path, t.blob])), changedFiles, blockers, (x) => createHash('sha256').update(x).digest('hex'));
    return { stage: 'e4-blockers', ran: true, ok: c.ok, reasons: c.reasons,
      evidence: { detectorCommit: d, mergeBase, changedFiles: changedFiles.length, blockers: blockers.length, corpus: c.corpus.length, product: c.product.length, audit: audit.map((a) => ({ entryId: a.entryId, decision: a.decision, reasons: a.reasons })) } };
  } catch (e) { return fail('e4-blockers', [`error: ${e.message}`]); }
}

// Veredicto global: exige exactamente las 3 etapas, ejecutadas y OK.
export function combineStages(results) {
  const reasons = [];
  if (!Array.isArray(results)) return { ok: false, reasons: ['etapas: resultado ausente'], stages: [] };
  for (const s of REQUIRED_STAGES) {
    const rs = results.filter((x) => x?.stage === s);
    if (rs.length !== 1) { reasons.push(`etapa ${s}: ${rs.length === 0 ? 'omitida' : 'duplicada'}`); continue; }
    const x = rs[0];
    if (x.ran !== true) reasons.push(`etapa ${s}: no ejecutada`);
    if (x.ok !== true) reasons.push(`etapa ${s}: falla (${(x.reasons ?? []).slice(0, 5).join('; ')})`);
  }
  for (const x of results) if (!REQUIRED_STAGES.includes(x?.stage)) reasons.push(`etapa desconocida: ${x?.stage}`);
  return { ok: reasons.length === 0, reasons, stages: results.map((x) => ({ stage: x?.stage, ran: x?.ran, ok: x?.ok, evidence: x?.evidence })) };
}
