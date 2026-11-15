// E4 COMPLETO en contexto de confianza (adaptador fuera del repo; D no se modifica).
// - Código: SOLO los blobs de scripts/eng-gates/ del commit D verificado (copiados byte a byte).
// - Datos: árbol del head exportado (head-data.mjs). El overlay = head exportado SIN su código de
//   scripts/eng-gates/ (y sin node_modules del head) + código de D + node_modules de D.
//   Así REPO_ROOT (ola3-lib/commit-gate) y el cwd (lib.mjs) apuntan a DATOS del head, no a D.
// - r6: el REGISTRO de excepciones (scripts/eng-gates/e4-secret-exceptions.json) se lee de D, NO del head:
//   es el único JSON que el detector parsea y decide con él, así que el head no puede aportar ni alterar
//   entradas (se descarta el del head y se copia el blob de D). El resto de datos de scripts/eng-gates
//   (otros JSON, fixtures) siguen viniendo del head como datos que E4 no usa para decidir.
// - analyzeCommitGate + formatVerdict de D, skip=false y skipFlyway=false SIEMPRE (sin labels).
// - Sin Maven/pnpm/tests: el plan (javaTests/FE) se publica en la procedencia y los tests corren
//   en el job NO privilegiado del caller; su check es obligatorio en el cierre.
// - Corpus: bloqueos E4 esperados del manifiesto se clasifican (classifyE4).
// - Excepción: solo con aprobación EN VIVO OK (readApprovalLive) y huella+blob de P exactos.
import { mkdirSync, writeFileSync, rmSync, symlinkSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { gitData, readTree, exportTreeAsData } from './head-data.mjs';
import { classifyE4 } from './classify-findings.mjs';
import { verifyDetectorCheckout, resolveRange } from './stages.mjs';

const ENG = 'scripts/eng-gates';
// Bajo scripts/eng-gates: CÓDIGO viene SOLO de D (lo del head se descarta, nunca se importa);
// DATOS (fixtures, baselines, otros JSON) vienen del HEAD como datos; EXCEPCIÓN r6: el registro de excepciones viene de D (DETECTOR_DATA).
export const DETECTOR_DATA = Object.freeze(['e4-secret-exceptions.json']);
export const isEngCode = (p) => /\.(mjs|js|cjs|ts|mts|cts|node|sh)$/.test(p) || /(^|\/)package(-lock)?\.json$/.test(p) || /(^|\/)node_modules(\/|$)/.test(p);
export const fromDetector = (p) => isEngCode(p) || DETECTOR_DATA.includes(p); // relativo a scripts/eng-gates/
const sha256 = (b) => createHash('sha256').update(b).digest('hex');
export const PENDING_REASON_PREFIX = 'entrada pending inactiva hasta aprobación';

export function buildOverlay({ gitDir, head, detectorDir, detectorCommit, limits }) {
  const d = verifyDetectorCheckout(detectorDir, detectorCommit);
  if (d === head) throw new Error('detector: D no puede ser el head');
  const tree = readTree(gitDir, head, limits);
  const dataTree = tree.filter((t) => !/(^|\/)node_modules\//.test(t.path) && !(t.path.startsWith(`${ENG}/`) && fromDetector(t.path.slice(ENG.length + 1))));
  const root = exportTreeAsData(gitDir, head, dataTree, limits);
  // Código de D: ls-tree del commit D (no del working tree) y blobs byte a byte.
  const dls = gitData(detectorDir, ['ls-tree', '-r', '-z', '--full-tree', d, `${ENG}/`]).toString().split('\0').filter(Boolean);
  let n = 0;
  for (const rec of dls) {
    const [meta, path] = rec.split('\t'); const [mode, type, blob] = meta.split(' ');
    if (!fromDetector(path.slice(ENG.length + 1))) continue; // otros datos de D no: son del head (salvo el registro de excepciones)
    if (type !== 'blob' || (mode !== '100644' && mode !== '100755')) throw new Error(`detector: entrada no permitida ${path}`);
    const dest = resolve(root, ...path.split('/'));
    if (!dest.startsWith(root + sep)) throw new Error('detector: ruta fuera del overlay');
    mkdirSync(resolve(dest, '..'), { recursive: true });
    writeFileSync(dest, gitData(detectorDir, ['cat-file', 'blob', blob]), { flag: 'wx', mode: 0o444 }); n++;
  }
  if (n === 0) throw new Error('detector: D sin scripts/eng-gates');
  const nm = join(detectorDir, ENG, 'node_modules');
  if (!existsSync(join(nm, 'java-parser'))) throw new Error('detector: node_modules de D ausente (npm ci --ignore-scripts)');
  symlinkSync(nm, join(root, ENG, 'node_modules'));
  return { root, tree, detectorCommit: d, detectorFiles: n };
}

// Excepción del fixture: suprime EXACTAMENTE un bloqueo 'secret' del fixture si todo coincide.
export function applyLiveException({ blockers, secretAudit, policy, approval, treeByPath, head }) {
  const reasons = [];
  if (!policy || policy.candidateHeadSha !== head) reasons.push('excepción: head escaneado != candidateHeadSha de P');
  const fx = policy?.fixture;
  if (!approval || approval.ok !== true) reasons.push(`excepción: aprobación en vivo no OK (${approval == null ? 'null' : (approval.reasons ?? []).join('; ')})`);
  else if (approval.head !== policy.candidateHeadSha || approval.fingerprint !== fx?.fingerprint || approval.commentId !== policy.approvalCommentId) reasons.push('excepción: aprobación no vinculada a head/huella/comentario de P');
  if (treeByPath.get(fx?.path) !== fx?.blob) reasons.push('excepción: blob del fixture en el head != P');
  const audits = (secretAudit ?? []).filter((a) => a?.path === fx?.path);
  const hits = (blockers ?? []).filter((b) => b?.id === 'secret' && b?.path === fx?.path);
  const exact = audits.filter((a) => a.rule === 'generic' && a.constant === fx?.constant && a.fingerprint === fx?.fingerprint && a.entryId === fx?.entryId && a.decision === 'blocked' &&
    Array.isArray(a.reasons) && a.reasons.length === 1 && a.reasons[0].startsWith(PENDING_REASON_PREFIX));
  if (audits.some((a) => a.rule !== 'generic')) reasons.push('excepción: prefijo fuerte o regla no genérica en el fixture (jamás excepcionable)');
  if (audits.length !== 1 || exact.length !== 1 || hits.length !== 1) reasons.push(`excepción: huella no exacta (auditorías=${audits.length}, exactas=${exact.length}, bloqueos=${hits.length})`);
  if (reasons.length) return { applied: false, reasons, blockers };
  return { applied: true, reasons: [], blockers: blockers.filter((b) => b !== hits[0]), suppressed: { path: fx.path, fingerprint: fx.fingerprint, commentId: policy.approvalCommentId } };
}

export async function stageE4Full({ gitDir, base, head, manifest, detectorDir, detectorCommit, policy, approval, limits, now }) {
  const prevCwd = process.cwd();
  try {
    const { mergeBase } = resolveRange(gitDir, base, head);
    const ov = buildOverlay({ gitDir, head, detectorDir, detectorCommit, limits });
    const cg = await import(pathToFileURL(join(ov.root, ENG, 'commit-gate.mjs')).href);
    const jlm = await import(pathToFileURL(join(ov.root, ENG, 'java-loop-map.mjs')).href);
    if (typeof cg.analyzeCommitGate !== 'function' || typeof cg.formatVerdict !== 'function') throw new Error('detector: analyzeCommitGate/formatVerdict ausentes en D');
    const parsed = await jlm.resolveParse();
    if (!parsed.ok) throw new Error(`detector: parser no disponible (${parsed.status})`);
    const changedFiles = gitData(gitDir, ['diff', '--no-ext-diff', '--no-textconv', '--name-only', `${mergeBase}`, head]).toString().split('\n').map((s) => s.trim()).filter(Boolean);
    const diffText = gitData(gitDir, ['diff', '--no-ext-diff', '--no-textconv', '-U20', mergeBase, head]).toString();
    const treeByPath = new Map(ov.tree.map((t) => [t.path, t.blob]));
    const testFiles = ov.tree.map((t) => t.path).filter((p) => p.startsWith('Hot_click_outlet/src/test/java') && p.endsWith('.java'));
    const fileTexts = {};
    for (const p of changedFiles) {
      if (!/(?:^|\/)src\/test\/.*\.java$/.test(p) || !treeByPath.has(p)) continue;
      const text = gitData(gitDir, ['cat-file', 'blob', treeByPath.get(p)]).toString('utf8');
      fileTexts[p] = { text, blob: treeByPath.get(p), hash: jlm.sha256Text(text) };
    }
    process.chdir(ov.root); // lib.mjs resuelve rutas relativas al cwd: DATOS del head
    // El overlay no es repo git: cualquier git interno de D falla cerrado (no sube a repos padre).
    const envPrev = { GIT_DIR: process.env.GIT_DIR, GIT_CEILING_DIRECTORIES: process.env.GIT_CEILING_DIRECTORIES };
    process.env.GIT_DIR = join(ov.root, '.no-git'); process.env.GIT_CEILING_DIRECTORIES = ov.root;
    let analysis;
    try { analysis = cg.analyzeCommitGate({ changedFiles, diffText, testFiles, skip: false, skipFlyway: false, fileTexts, parse: parsed.parse, prAuthor: '', now: now ?? new Date() }); }
    finally { for (const [k, v] of Object.entries(envPrev)) { if (v == null) delete process.env[k]; else process.env[k] = v; } process.chdir(prevCwd); }
    if (analysis.skipped) throw new Error('E4: análisis marcado skipped (no permitido)');
    const corpusC = classifyE4(manifest, treeByPath, changedFiles, analysis.blockers, (x) => sha256(Buffer.from(x)));
    const nonCorpus = analysis.blockers.filter((b) => !corpusC.corpus.includes(b));
    // Todo motivo de classifyE4 que no sea 'bloqueo de producto' (manifiesto inválido, esperado ausente) falla.
    const corpusMissing = corpusC.reasons.filter((r) => !r.startsWith('e4: bloqueo ') || r.includes('esperado ausente'));
    const exc = (nonCorpus.some((b) => b.id === 'secret' && b.path === policy?.fixture?.path))
      ? applyLiveException({ blockers: nonCorpus, secretAudit: analysis.secretAudit, policy, approval, treeByPath, head })
      : { applied: false, reasons: [], blockers: nonCorpus };
    const remaining = exc.blockers;
    const checks = analysis.checks.map((c) => (c.id === 'blockers' ? { id: 'blockers', ok: remaining.length === 0, detail: remaining.length ? remaining.map((b) => b.title).join('; ') : 'sin debug/secretos (corpus/excepción clasificados)' } : c));
    const formatted = cg.formatVerdict({ analysis: { ...analysis, blockers: remaining, checks }, testResults: [] });
    const reasons = [...corpusMissing, ...(exc.applied ? [] : exc.reasons), ...checks.filter((c) => !c.ok).map((c) => `e4: ${c.id}: ${c.detail}`)];
    if (formatted.verdict !== 'LISTO') reasons.push(`e4: VEREDICTO ${formatted.verdict}`);
    return { stage: 'e4-full', ran: true, ok: reasons.length === 0, reasons: [...new Set(reasons)],
      evidence: { detectorCommit: ov.detectorCommit, detectorFiles: ov.detectorFiles, mergeBase, changedFiles: changedFiles.length, verdict: formatted.verdict,
        checks: checks.map((c) => ({ id: c.id, ok: c.ok })), plan: { javaTests: analysis.plan?.javaTests ?? [], runFrontendTests: !!analysis.plan?.runFrontendTests },
        corpus: corpusC.corpus.length, exception: exc.applied ? exc.suppressed : null, secretAudit: analysis.secretAudit ?? [], bodySha256: sha256(Buffer.from(formatted.body)) } };
  } catch (e) { return { stage: 'e4-full', ran: true, ok: false, reasons: [`error: ${e.message}`], evidence: {} }; }
  finally { if (process.cwd() !== prevCwd) process.chdir(prevCwd); }
}
