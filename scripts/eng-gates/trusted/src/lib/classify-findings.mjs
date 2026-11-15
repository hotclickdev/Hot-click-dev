// Clasificación exhaustiva de hallazgos gitleaks (árbol y rango). TODO se escanea; cada hallazgo
// es corpus-esperado (coincidencia EXACTA con el manifiesto de confianza), histórico catalogado
// (coincidencia EXACTA commit+path+regla+posición+sha256) o producto (falla).
// Esquemas:
//  manifest.files[]: {path, blob, sha256, expectedFindings:[{tool:'gitleaks', rule, line, column, secretSha256}]}
//  manifest.files[].expectedE4: [{id, snippetSha256}]  (bloqueos E4 esperados si el fichero está en el diff)
//  manifest.historical[]: {tool:'gitleaks', commit, path, rule, line, column, secretSha256}
import { verdict, deepFindUnset, SHA40, SHA64 } from './common.mjs';
import { validatePath } from './head-data.mjs';

const CORPUS_DIR = 'scripts/eng-gates/fixtures/e4-synthetic/';
const fk = (f) => [f.rule, f.line, f.column, f.secretSha256].join('|');
const okFinding = (f) => f && f.tool === 'gitleaks' && typeof f.rule === 'string' && f.rule.length > 0 &&
  Number.isInteger(f.line) && f.line > 0 && Number.isInteger(f.column) && f.column > 0 && SHA64.test(f.secretSha256 ?? '');
const safePath = (p) => { try { validatePath(Buffer.from(p, 'utf8')); return true; } catch { return false; } };

export function validateManifest(m) {
  const r = [];
  if (!m || m.schemaVersion !== 2) return verdict(['manifest: ausente o schemaVersion != 2']);
  for (const p of deepFindUnset(m)) r.push(`manifest: valor sin fijar en ${p}`);
  if (r.length) return verdict(r);
  if (!Array.isArray(m.files) || m.files.length === 0) r.push('manifest: files vacío');
  if (!Array.isArray(m.historical)) r.push('manifest: historical no es array');
  if (r.length) return verdict(r);
  const seen = new Set();
  for (const e of m.files) {
    if (typeof e.path !== 'string' || !safePath(e.path) || !e.path.startsWith(CORPUS_DIR) || !e.path.endsWith('.txt')) r.push(`manifest: ruta fuera del corpus ${e.path}`);
    if (!SHA40.test(e.blob ?? '') || !SHA64.test(e.sha256 ?? '')) r.push(`manifest: pins inválidos ${e.path}`);
    if (seen.has(e.path)) r.push(`manifest: ruta duplicada ${e.path}`); seen.add(e.path);
    if (!Array.isArray(e.expectedFindings)) { r.push(`manifest: ${e.path} expectedFindings no es array`); continue; }
    if (!Array.isArray(e.expectedE4)) r.push(`manifest: ${e.path} expectedE4 no es array`);
    else { const es = new Set(); for (const x of e.expectedE4) { const k = `${x?.id}|${x?.snippetSha256}`; if (typeof x?.id !== 'string' || !x.id || !SHA64.test(x?.snippetSha256 ?? '')) r.push(`manifest: expectedE4 inválido en ${e.path}`); else if (es.has(k)) r.push(`manifest: expectedE4 duplicado en ${e.path}`); else es.add(k); } }
    const ks = new Set();
    for (const f of e.expectedFindings) { if (!okFinding(f)) r.push(`manifest: hallazgo esperado inválido en ${e.path}`); else if (ks.has(fk(f))) r.push(`manifest: hallazgo duplicado en ${e.path}`); else ks.add(fk(f)); }
  }
  const hs = new Set();
  for (const h of m.historical) {
    if (!okFinding(h) || !SHA40.test(h.commit ?? '') || typeof h.path !== 'string' || !safePath(h.path)) { r.push(`historical: entrada inválida ${JSON.stringify(h)}`); continue; }
    const k = `${h.commit}|${h.path}|${fk(h)}`; if (hs.has(k)) r.push(`historical: duplicada ${k}`); hs.add(k);
  }
  return verdict(r);
}

// Etapa árbol: tree=[{path,blob}] del head; findings normalizados (dir).
export function classifyTree(manifest, tree, findings) {
  const mv = validateManifest(manifest);
  if (!mv.ok) return { ...mv, corpus: [], product: [] };
  const r = [];
  const byPath = new Map(manifest.files.map((e) => [e.path, e]));
  const treeByPath = new Map(tree.map((t) => [t.path, t.blob]));
  for (const t of tree) if (t.path.startsWith(CORPUS_DIR) && !byPath.has(t.path)) r.push(`corpus: fichero no catalogado ${t.path} (nuevo/renombrado)`);
  for (const e of manifest.files) {
    const b = treeByPath.get(e.path);
    if (b === undefined) r.push(`corpus: falta ${e.path} (borrado/renombrado)`);
    else if (b !== e.blob) r.push(`corpus: blob alterado ${e.path}`);
  }
  const expected = new Map();
  for (const e of manifest.files) for (const f of e.expectedFindings) expected.set(`${e.path}|${e.blob}|${fk(f)}`, false);
  const corpus = [], product = [];
  for (const f of findings) {
    const k = `${f.path}|${f.blob}|${fk(f)}`;
    if (f.tool === 'gitleaks' && expected.has(k)) { corpus.push(f); expected.set(k, true); } else product.push(f);
  }
  for (const f of product) r.push(`producto: hallazgo no catalogado ${f.rule} ${f.path}:${f.line}`);
  for (const [k, v] of expected) if (!v) r.push(`corpus: hallazgo esperado ausente ${k.split('|').slice(0, 3).join('|')}`);
  return { ...verdict(r), corpus, product };
}

// Etapa rango: findings con {commit, path, blob(del objeto commit:path)}; rangeCommits = rev-list mb..head.
export function classifyRange(manifest, rangeCommits, findings) {
  const mv = validateManifest(manifest);
  if (!mv.ok) return { ...mv, corpus: [], historical: [], product: [] };
  const r = [];
  if (!Array.isArray(rangeCommits) || rangeCommits.length === 0 || !rangeCommits.every((c) => SHA40.test(c))) return { ...verdict(['rango: lista de commits vacía o inválida']), corpus: [], historical: [], product: [] };
  const inRange = new Set(rangeCommits);
  const corpusKeys = new Set(); for (const e of manifest.files) for (const f of e.expectedFindings) corpusKeys.add(`${e.path}|${e.blob}|${fk(f)}`);
  const hist = new Map(); for (const h of manifest.historical) hist.set(`${h.commit}|${h.path}|${fk(h)}`, false);
  const corpus = [], historical = [], product = [];
  for (const f of findings) {
    if (!SHA40.test(f.commit ?? '') || !inRange.has(f.commit)) { r.push(`rango: hallazgo con commit fuera del rango ${f.commit}`); continue; }
    const hk = `${f.commit}|${f.path}|${fk(f)}`;
    if (f.tool === 'gitleaks' && corpusKeys.has(`${f.path}|${f.blob}|${fk(f)}`)) corpus.push(f);
    else if (f.tool === 'gitleaks' && hist.has(hk)) { historical.push(f); hist.set(hk, true); }
    else product.push(f);
  }
  for (const f of product) r.push(`producto(rango): hallazgo no catalogado ${f.rule} ${f.commit.slice(0, 8)}:${f.path}:${f.line}`);
  for (const [k, seen] of hist) if (!seen && inRange.has(k.split('|')[0])) r.push(`historical: esperado en el rango y ausente ${k.split('|').slice(0, 3).join('|')}`);
  return { ...verdict(r), corpus, historical, product };
}

// Etapa E4: blockers de scanCommitBlockers (D) sobre el diff mb..head. Un bloqueo solo es
// corpus-esperado si su ruta es del manifiesto, el blob del head es el fijado y (id, sha256(snippet))
// está en expectedE4. Cualquier otro bloqueo => falla. Si un fichero del corpus está en el diff,
// todos sus expectedE4 deben aparecer.
export function classifyE4(manifest, treeByPath, changedFiles, blockers, sha256) {
  const mv = validateManifest(manifest);
  if (!mv.ok) return { ...mv, corpus: [], product: [] };
  if (!Array.isArray(blockers) || !Array.isArray(changedFiles)) return { ...verdict(['e4: entrada inválida']), corpus: [], product: [] };
  const r = []; const corpus = [], product = [];
  const byPath = new Map(manifest.files.map((e) => [e.path, e]));
  const seen = new Set();
  for (const b of blockers) {
    const e = byPath.get(b?.path);
    const k = `${b?.path}|${b?.id}|${sha256(String(b?.snippet ?? ''))}`;
    if (e && treeByPath.get(e.path) === e.blob && e.expectedE4.some((x) => `${e.path}|${x.id}|${x.snippetSha256}` === k)) { corpus.push(b); seen.add(k); }
    else product.push(b);
  }
  for (const b of product) r.push(`e4: bloqueo ${b?.id} ${b?.path} ${b?.title ?? ''}`.trim());
  const changed = new Set(changedFiles);
  for (const e of manifest.files) if (changed.has(e.path)) for (const x of e.expectedE4) if (!seen.has(`${e.path}|${x.id}|${x.snippetSha256}`)) r.push(`e4: bloqueo esperado ausente ${e.path}|${x.id}`);
  return { ...verdict(r), corpus, product };
}
