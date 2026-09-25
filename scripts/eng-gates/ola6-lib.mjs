/**
 * Helpers de ola 6 (S6 / S9 / S10 / S11 / S12 / E13 / E15 / E17).
 * Autocontenido respecto de lógica de negocio: no toca pago/auth ni schedulers.
 * Reusa APIs de Node 22. Sin secretos en git.
 */

import { appendFileSync, existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const FRONTEND_ROOT = join(REPO_ROOT, 'Hot_click_outlet', 'frontend');
export const FRONTEND_SRC = join(FRONTEND_ROOT, 'src');
export const FRONTEND_PKG = join(FRONTEND_ROOT, 'package.json');
export const STATIC_ASSETS = join(
  REPO_ROOT,
  'Hot_click_outlet',
  'src',
  'main',
  'resources',
  'static',
  'assets',
);
export const JAVA_MAIN = join(REPO_ROOT, 'Hot_click_outlet', 'src', 'main', 'java');
export const I18N_DIR = join(FRONTEND_SRC, 'i18n', 'locales');
export const K6_BASELINE_REL = 'scripts/eng-gates/baselines/k6-hikari.json';
export const K6_SMOKE_REL = 'scripts/eng-gates/fixtures/k6-smoke.js';
export const LOADTEST_SCRIPTS = [
  'loadtest/k6-pos-checkout.js',
  'performance/k6/checkout-concurrente.js',
  'performance/k6/pos-concurrente.js',
  'performance/k6/billing-concurrente.js',
  'performance/k6/sse-concurrente.js',
];
export const HACIENDA_XML_REL = 'Hot_click_outlet/src/test/resources/hacienda/factura-muestra.xml';
export const HACIENDA_XSD_REL = 'Hot_click_outlet/src/main/resources/hacienda/factura-electronica-4.3-subset.xsd';
export const XML_BUILDER_REL = 'Hot_click_outlet/src/main/java/com/hotclick/service/XmlFacturaBuilder.java';
export const FACTURACION_REL = 'Hot_click_outlet/src/main/java/com/hotclick/service/FacturacionService.java';
export const HIKARI_PROPS_REL = 'Hot_click_outlet/src/main/resources/application.properties';
export const HIKARI_METRICS_REL =
  'Hot_click_outlet/src/main/java/com/hotclick/controller/observabilidad/ObservabilityJvmMetrics.java';

export const CHUNK_WARN_BYTES = 400 * 1024;
export const RAG_LAG_THRESHOLD = 50;
export const RAG_MODEL = 'voyage-3-lite';
export const TOP_LOC_COUNT = 15;

export const SKIP_LABELS = {
  k6: 'skip-k6-hikari',
  bundle: 'skip-bundle-lint',
  god: 'skip-god-class',
  hacienda: 'skip-hacienda-xml',
  rag: 'skip-rag-lag',
  spaPush: 'skip-spa-push',
  spike: 'skip-product-spike',
  i18nPr: 'skip-i18n-pr',
};

export const PROD_HOST_RE =
  /(?:^|[/.])(?:hotclick\.lat|www\.hotclick\.lat|18\.227\.68\.15)(?:[:/]|$)/i;

export const SENSITIVE_EXTRACT_RE = /(?:^|\/)(Payment|Auth|Pos|Sinpe|Wallet)[^/]*\.(java|ts|tsx)$/i;

export const SPIKE_LABELS = new Set(['bug', 'pago', 'pos', 'checkout', 'sinpe']);
export const SPIKE_TITLE_RE = /\b(bug|pago|pos|checkout|sinpe|stripe|pedido|caja)\b/i;

export const SPIKE_FILES = {
  default: [
    'Hot_click_outlet/src/main/java/com/hotclick/service/PedidoService.java',
    'Hot_click_outlet/frontend/src/pages/CheckoutPage.tsx',
    'Hot_click_outlet/src/main/java/com/hotclick/controller/PosController.java',
  ],
  pago: [
    'Hot_click_outlet/src/main/java/com/hotclick/service/PedidoService.java',
    'Hot_click_outlet/frontend/src/pages/CheckoutPage.tsx',
    'Hot_click_outlet/frontend/src/pages/checkout/ejecutarPagarCheckout.ts',
  ],
  pos: [
    'Hot_click_outlet/src/main/java/com/hotclick/controller/PosController.java',
    'Hot_click_outlet/frontend/src/pages/admin/pos/StepVenta.tsx',
  ],
};

export const RAG_LAG_SELECT = `
SELECT COUNT(*)::int AS lag
FROM hot_click_producto_tb p
LEFT JOIN hot_click_producto_embedding_tb e
       ON e.fk_id_producto = p.id_producto
WHERE p.fk_id_estado = 1
  AND p.visible_catalogo = true
  AND p.fk_id_empresa IS NOT NULL
  AND (e.id_embedding IS NULL OR e.modelo_version <> '${RAG_MODEL}')
`.trim();

const SKIP_WALK = new Set([
  'node_modules', 'target', '.git', 'dist', 'playwright-report', 'test-results', 'static',
]);

export function hasLabel(raw, name) {
  if (!name) return false;
  return String(raw || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .includes(String(name).toLowerCase());
}

export function writeGithubOutput(pairs) {
  const dest = process.env.GITHUB_OUTPUT;
  if (!dest) return;
  const body = Object.entries(pairs)
    .map(([key, value]) => `${key}=${String(value ?? '').replaceAll('\n', '%0A')}`)
    .join('\n');
  appendFileSync(dest, `${body}\n`);
}

export function readRepo(relPath, root = REPO_ROOT) {
  const abs = join(root, relPath);
  return existsSync(abs) ? readFileSync(abs, 'utf8') : '';
}

export function relRepo(absPath, root = REPO_ROOT) {
  return relative(root, absPath).split(sep).join('/');
}

export function walkFiles(root, pred) {
  if (!existsSync(root)) return [];
  const out = [];
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    pushWalkEntries(stack, out, dir, entries, pred);
  }
  return out.sort();
}

function pushWalkEntries(stack, out, dir, entries, pred) {
  for (const entry of entries) {
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_WALK.has(entry.name)) continue;
      stack.push(abs);
      continue;
    }
    if (!pred || pred(abs, entry.name)) out.push(abs);
  }
}

export function countLoc(text) {
  return String(text).split(/\r?\n/).length;
}

export function isoWeek(date = new Date()) {
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((utc - yearStart) / 86400000 + 1) / 7);
  return { year: utc.getUTCFullYear(), week };
}

export function dbSecretNames(env = process.env) {
  return [
    'AI_USAGE_DATABASE_URL',
    'DATABASE_URL',
    'SUPABASE_DB_URL',
    'SUPABASE_BACKUP_URL',
  ].filter((name) => Boolean(String(env[name] || '').trim()));
}

export function dbSecretsPresent(env = process.env) {
  return dbSecretNames(env).length > 0;
}

export function pickDbUrl(env = process.env) {
  for (const name of [
    'AI_USAGE_DATABASE_URL',
    'DATABASE_URL',
    'SUPABASE_DB_URL',
    'SUPABASE_BACKUP_URL',
  ]) {
    const value = String(env[name] || '').trim();
    if (value) return { name, url: value };
  }
  return { name: '', url: '' };
}

export function flattenJsonKeys(value, prefix = '') {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) {
    return prefix ? [prefix] : [];
  }
  const keys = [];
  for (const [name, child] of Object.entries(value)) {
    const next = prefix ? `${prefix}.${name}` : name;
    if (child && typeof child === 'object' && !Array.isArray(child)) {
      keys.push(...flattenJsonKeys(child, next));
    } else {
      keys.push(next);
    }
  }
  return keys;
}

// ── S6 k6 / Hikari ───────────────────────────────────────────────────────────

export function isProductionBaseUrl(url) {
  const raw = String(url || '').trim();
  if (!raw) return false;
  try {
    const host = new URL(raw).hostname;
    return PROD_HOST_RE.test(host) || PROD_HOST_RE.test(raw);
  } catch {
    return PROD_HOST_RE.test(raw);
  }
}

export function resolveK6Target(env = process.env) {
  const url = String(env.K6_BASE_URL || env.K6_STAGING_URL || '').trim();
  if (!url) {
    return {
      mode: 'mock',
      url: '',
      reason: 'Sin K6_BASE_URL / K6_STAGING_URL — smoke contra mock local. No se inventa URL de prod.',
    };
  }
  if (isProductionBaseUrl(url) && env.K6_ALLOW_PRODUCTION !== '1') {
    return {
      mode: 'refused-prod',
      url: '',
      reason: `K6_BASE_URL apunta a producción (${safeHost(url)}). No se pega prod sin K6_ALLOW_PRODUCTION=1.`,
    };
  }
  return {
    mode: 'staging',
    url,
    reason: `Smoke contra URL de secreto (${safeHost(url)}).`,
  };
}

export function safeHost(url) {
  try {
    return new URL(url).host;
  } catch {
    return '(url inválida)';
  }
}

export function parseK6Thresholds(source) {
  const p95s = [...String(source).matchAll(/p\(95\)<(\d+)/g)].map((m) => Number(m[1]));
  const rates = [...String(source).matchAll(/http_req_failed:\s*\[[^\]]*rate<([0-9.]+)/g)]
    .map((m) => Number(m[1]));
  return {
    p95s,
    errorRates: rates,
    p95: p95s.length ? Math.min(...p95s) : null,
    errorRate: rates.length ? Math.min(...rates) : null,
  };
}

export function mergeScriptThresholds(sources) {
  const p95s = [];
  const rates = [];
  for (const src of sources) {
    const parsed = parseK6Thresholds(src.text || '');
    p95s.push(...parsed.p95s);
    rates.push(...parsed.errorRates);
  }
  return {
    scripts: sources.map((item) => item.path),
    p95s,
    errorRates: rates,
    p95: p95s.length ? Math.min(...p95s) : 1500,
    errorRate: rates.length ? Math.min(...rates) : 0.02,
  };
}

export function defaultBaseline() {
  return {
    version: 1,
    p95_ms: 1500,
    error_rate: 0.02,
    hikari_awaiting_max: 0,
    chunk_warn_bytes: CHUNK_WARN_BYTES,
    source: 'loadtest/k6-pos-checkout.js (p95<1500, rate<0.02). F29 checkout-concurrente es más estricto (500ms / 1%).',
  };
}

export function loadBaseline(jsonText) {
  if (!jsonText) return defaultBaseline();
  try {
    const parsed = JSON.parse(jsonText);
    return { ...defaultBaseline(), ...parsed };
  } catch {
    return defaultBaseline();
  }
}

export function parseK6Summary(summary) {
  const metrics = summary?.metrics || summary || {};
  const duration = metrics.http_req_duration?.values || metrics.http_req_duration || {};
  const failed = metrics.http_req_failed?.values || metrics.http_req_failed || {};
  const p95 = Number(duration['p(95)'] ?? duration.p95 ?? duration.avg ?? 0);
  const errorRate = Number(failed.rate ?? failed.value ?? 0);
  return { p95_ms: p95, error_rate: errorRate };
}

export function percentile(values, p) {
  const sorted = [...values].filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

export function compareToBaseline(metrics, baseline) {
  const p95 = Number(metrics.p95_ms);
  const err = Number(metrics.error_rate);
  const overP95 = Number.isFinite(p95) && p95 > Number(baseline.p95_ms);
  const overErr = Number.isFinite(err) && err > Number(baseline.error_rate);
  const hikari = Number(metrics.hikari_awaiting ?? 0);
  const overHikari = hikari > Number(baseline.hikari_awaiting_max ?? 0);
  return {
    over: overP95 || overErr || overHikari,
    overP95,
    overErr,
    overHikari,
    reason: overP95 || overErr || overHikari
      ? `Regresión: p95=${p95}ms (base ${baseline.p95_ms}) error_rate=${err} (base ${baseline.error_rate}) hikari_awaiting=${hikari}`
      : `Dentro de baseline (p95 ${p95}ms ≤ ${baseline.p95_ms}, error ${err} ≤ ${baseline.error_rate}).`,
  };
}

export function parseHikariPoolSize(props) {
  const match = String(props).match(/spring\.datasource\.hikari\.maximum-pool-size\s*=\s*(\d+)/);
  return match ? Number(match[1]) : null;
}

export function parseHikariMetricFields(javaSrc) {
  const names = [];
  for (const hit of String(javaSrc).matchAll(/hikari\.put\(\s*"(\w+)"/g)) names.push(hit[1]);
  return names;
}

// ── S9 bundle + lint:ci ──────────────────────────────────────────────────────

export function parseLintCiAllowlist(script) {
  const raw = String(script || '').trim();
  if (!raw) return [];
  const rest = raw.replace(/^eslint\s+/, '');
  return rest.split(/\s+/).filter(Boolean);
}

export function evaluateBundleLint({
  allowlist = [],
  srcCount = 0,
  chunks = [],
  lintOk = true,
  chunkLimit = CHUNK_WARN_BYTES,
}) {
  const over = chunks.filter((item) => item.bytes > chunkLimit);
  const coverage = srcCount > 0 ? allowlist.length / srcCount : 0;
  return {
    allowlistCount: allowlist.length,
    srcCount,
    coverage,
    overChunks: over,
    lintOk,
    shouldIssue: !lintOk || over.length > 0 || coverage < 0.25,
    reason: !lintOk
      ? 'lint:ci falló en el allowlist actual'
      : over.length
        ? `${over.length} chunk(s) sobre ${chunkLimit} bytes`
        : coverage < 0.25
          ? `lint:ci cubre ${allowlist.length}/${srcCount} archivos src (no mass-enable)`
          : 'lint:ci OK y chunks bajo umbral',
  };
}

export function measureJsChunks(dir, readStat = statSync) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith('.js') && !name.endsWith('.map.js'))
    .map((name) => {
      const abs = join(dir, name);
      const bytes = readStat(abs).size;
      let gzip = 0;
      try {
        gzip = gzipSync(readFileSync(abs)).length;
      } catch {
        gzip = 0;
      }
      return { name, path: relRepo(abs), bytes, gzip };
    })
    .sort((a, b) => b.bytes - a.bytes);
}

// ── S10 god-class ────────────────────────────────────────────────────────────

export function isSensitiveExtractPath(relPath) {
  const base = String(relPath || '').split('/').pop() || '';
  return SENSITIVE_EXTRACT_RE.test(base) || /\/(Payment|Auth|Pos|Sinpe|Wallet)/i.test(relPath);
}

export function listLocRows(files) {
  return files
    .map((item) => ({ path: item.path, loc: item.loc ?? countLoc(item.text || '') }))
    .sort((a, b) => b.loc - a.loc || a.path.localeCompare(b.path))
    .slice(0, TOP_LOC_COUNT);
}

export function findNamedBlocks(source, path) {
  const text = String(source || '');
  const blocks = [];
  const re = /(?:export\s+(?:default\s+)?)?(?:async\s+)?function\s+(\w+)|(?:export\s+)?(?:default\s+)?(?:function|const|class)\s+(\w+)/g;
  let hit;
  while ((hit = re.exec(text))) {
    const name = hit[1] || hit[2];
    if (!name) continue;
    const open = text.indexOf('{', hit.index);
    if (open < 0) continue;
    const close = matchingBrace(text, open);
    const loc = countLoc(text.slice(hit.index, close + 1));
    if (loc < 40) continue;
    blocks.push({ name, loc, path, start: lineAt(text, hit.index) });
  }
  return blocks.sort((a, b) => b.loc - a.loc);
}

function matchingBrace(text, openIdx) {
  let depth = 0;
  for (let i = openIdx; i < text.length; i += 1) {
    if (text[i] === '{') depth += 1;
    else if (text[i] === '}') {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return text.length;
}

function lineAt(source, index) {
  return source.slice(0, index).split(/\n/).length;
}

export function proposeMoveOnlyExtract(topRows, readFile) {
  for (const row of topRows) {
    if (isSensitiveExtractPath(row.path)) continue;
    if (row.path.includes('/test/') || row.path.includes('/tests/')) continue;
    const source = readFile(row.path);
    const blocks = findNamedBlocks(source, row.path);
    const inner = blocks.find((b) => b.loc < row.loc - 10) || blocks[0];
    if (!inner) continue;
    return {
      path: row.path,
      loc: row.loc,
      extractName: inner.name,
      extractLoc: inner.loc,
      line: inner.start,
      hint: `Move-only: extraer \`${inner.name}\` (~${inner.loc} LOC) de \`${row.path}\` a un sibling. Sin cambiar orden de llamadas. Fuera de Payment/Auth/Pos.`,
    };
  }
  return null;
}

// ── S11 Hacienda XML ─────────────────────────────────────────────────────────

export function xmlLocalNames(xml) {
  const names = new Set();
  for (const hit of String(xml).matchAll(/<([A-Za-z][\w.-]*)\b/g)) {
    const name = hit[1];
    if (name.startsWith('?') || name.startsWith('xs:') || name.startsWith('/')) continue;
    names.add(name);
  }
  return [...names];
}

export function xsdRequiredElements(xsd) {
  const required = [];
  const re = /<xs:element\s+([^>]+)\/>|<xs:element\s+([^>]+)>/g;
  let hit;
  while ((hit = re.exec(xsd))) {
    const attrs = hit[1] || hit[2] || '';
    const name = attrs.match(/\bname="([^"]+)"/)?.[1];
    if (!name) continue;
    const min = attrs.match(/\bminOccurs="([^"]+)"/);
    const minOccurs = min ? Number(min[1]) : 1;
    if (minOccurs > 0) required.push(name);
  }
  return [...new Set(required)];
}

export function javaBuilderTags(javaSrc) {
  const tags = new Set();
  for (const hit of String(javaSrc).matchAll(/<([A-Za-z][\w.-]*)>/g)) tags.add(hit[1]);
  for (const hit of String(javaSrc).matchAll(/append\(\s*"<([A-Za-z][\w.-]*)/g)) tags.add(hit[1]);
  return [...tags];
}

export function diffHacienda({ sampleNames, xsdRequired, builderTags }) {
  const built = new Set(builderTags);
  const missingFromSample = sampleNames.filter((name) => !built.has(name) && name !== 'FacturaElectronica');
  const missingRequired = xsdRequired.filter((name) => !built.has(name) && name !== 'FacturaElectronica');
  const missing = [...new Set([...missingRequired, ...missingFromSample])];
  return {
    missing,
    missingRequired,
    missingFromSample,
    shouldIssue: missingRequired.length > 0,
    reason: missingRequired.length
      ? `Campos XSD requeridos ausentes en builders: ${missingRequired.join(', ')}`
      : missingFromSample.length
        ? `Sample tiene tags no emitidos (no bloqueantes): ${missingFromSample.join(', ')}`
        : 'Builders cubren sample XML + XSD requerido (heurística).',
  };
}

// ── S12 RAG lag ──────────────────────────────────────────────────────────────

export function evaluateEmbeddingsLag({ secretsPresent, lag = 0, threshold = RAG_LAG_THRESHOLD, queryOk = true, queryError = '' }) {
  if (!secretsPresent) {
    return {
      skipped: true,
      shouldIssue: false,
      lag: 0,
      reason: 'Sin secretos de DB (AI_USAGE_DATABASE_URL / DATABASE_URL / SUPABASE_*). Skip honesto; no se inventan credenciales. SELECT only, no writes.',
    };
  }
  if (!queryOk) {
    return {
      skipped: true,
      shouldIssue: false,
      lag: 0,
      reason: `psql falló (${String(queryError).slice(0, 180)}). No se inventan filas.`,
    };
  }
  const over = Number(lag) > Number(threshold);
  return {
    skipped: false,
    shouldIssue: over,
    lag: Number(lag),
    threshold,
    reason: over
      ? `${lag} productos visibles sin embedding ${RAG_MODEL} (umbral ${threshold}). Tabla hot_click_producto_embedding_tb (V62/V64).`
      : `Lag ${lag} ≤ ${threshold}.`,
  };
}

export function parseLagCount(stdout) {
  const line = String(stdout || '').trim().split(/\n/).filter(Boolean)[0] || '';
  const n = Number(line);
  return Number.isFinite(n) ? n : 0;
}

// ── E13 SPA push ─────────────────────────────────────────────────────────────

export function evaluateSpaPush({ frontendMeta, staticMeta, frontendTree, staticTree, commitSha }) {
  const feTs = Number(frontendMeta?.ts || 0);
  const stTs = Number(staticMeta?.ts || 0);
  const stale = Boolean(frontendMeta) && (!staticMeta || feTs > stTs);
  return {
    stale,
    commitSha: commitSha || '',
    frontendSha: frontendMeta?.sha || '',
    staticSha: staticMeta?.sha || '',
    frontendTree: frontendTree || '',
    staticTree: staticTree || '',
    reason: stale
      ? 'frontend/src parece más nuevo que static/. Recordá `cd Hot_click_outlet/frontend && pnpm build` y commitear static/. Docker no buildea React. Sin deploy automático.'
      : 'static/ tiene evidencia git igual o posterior a frontend/src.',
  };
}

// ── E15 product spike ────────────────────────────────────────────────────────

export function isAgentIssueTitle(title) {
  return /^\s*\[[DES]\d+/i.test(String(title || '')) || /^\s*\[[A-Z]+\d+\]/.test(String(title || ''));
}

export function shouldSpikeIssue({ title, labels = [], isPullRequest = false, skip = false }) {
  if (skip || isPullRequest) return false;
  if (isAgentIssueTitle(title)) return false;
  const names = labels.map((item) => (typeof item === 'string' ? item : item?.name)).filter(Boolean);
  if (names.some((name) => SPIKE_LABELS.has(name.toLowerCase()))) return true;
  return SPIKE_TITLE_RE.test(String(title || ''));
}

export function spikeKind({ title, labels = [] }) {
  const blob = `${title} ${labels.join(' ')}`.toLowerCase();
  if (/\bpos\b/.test(blob)) return 'pos';
  if (/\bpago|checkout|sinpe|stripe\b/.test(blob)) return 'pago';
  return 'default';
}

export function mapSpikeFiles(issue) {
  const kind = spikeKind(issue);
  const files = SPIKE_FILES[kind] || SPIKE_FILES.default;
  return { kind, files: [...new Set([...SPIKE_FILES.default, ...files])] };
}

export function suggestedSpikeTest(kind) {
  if (kind === 'pos') {
    return 'Test: `PosController*Test` o Playwright `tests/pos-pago-express.spec.ts` (no auto-implementar).';
  }
  if (kind === 'pago') {
    return 'Test: `PedidoService*Test` / checkout spec. No tocar lógica de cobro en el mismo PR del spike.';
  }
  return 'Test: unitario junto al archivo sospechoso + spec de regresión. El agente no implementa el fix.';
}

// ── E17 i18n PR ──────────────────────────────────────────────────────────────

export function extractTKeys(source) {
  const keys = new Set();
  const re = /\b(?:t|i18n\.t)\(\s*['"]([a-zA-Z][a-zA-Z0-9_.-]*)['"]/g;
  let hit;
  while ((hit = re.exec(String(source)))) keys.add(hit[1]);
  return [...keys];
}

export function extractJsxHardcoded(source) {
  const hits = [];
  const re = />([A-ZÁÉÍÓÚÑÜ][^<{]{8,80})</g;
  let hit;
  while ((hit = re.exec(String(source)))) {
    const text = hit[1].trim();
    if (/^https?:/i.test(text)) continue;
    hits.push(text);
  }
  return hits;
}

export function addedLinesFromDiff(diff) {
  return String(diff)
    .split(/\n/)
    .filter((line) => line.startsWith('+') && !line.startsWith('+++'))
    .map((line) => line.slice(1));
}

export function keysAddedInLocales(before = {}, after = {}) {
  const added = new Set();
  for (const code of ['es', 'en', 'pt']) {
    const prev = new Set(flattenJsonKeys(before[code] || {}));
    for (const key of flattenJsonKeys(after[code] || {})) {
      if (!prev.has(key)) added.add(key);
    }
  }
  return [...added].sort();
}

/** Leaf keys from JSON diffs (e.g. `navComision`) match nested paths (`adminConfig.navComision`). */
export function localeHasI18nKey(set, key) {
  if (set.has(key)) return true;
  if (!key || String(key).includes('.')) return false;
  const suffix = `.${key}`;
  for (const full of set) {
    if (full.endsWith(suffix)) return true;
  }
  return false;
}

export function evaluateI18nPr({ locales = { es: {}, en: {}, pt: {} }, addedKeys = [], hardcoded = [] }) {
  const sets = {
    es: new Set(flattenJsonKeys(locales.es || {})),
    en: new Set(flattenJsonKeys(locales.en || {})),
    pt: new Set(flattenJsonKeys(locales.pt || {})),
  };
  const missing = [];
  for (const key of [...new Set(addedKeys)].sort()) {
    const absent = ['es', 'en', 'pt'].filter((code) => !localeHasI18nKey(sets[code], key));
    if (absent.length) missing.push({ key, absent });
  }
  return {
    ok: missing.length === 0,
    missing,
    hardcodedCount: hardcoded.length,
    reason: missing.length
      ? `${missing.length} key(s) sin par es/en/pt (E17 PR gate; D7 es Issue diario del árbol)`
      : hardcoded.length
        ? `Keys OK. ${hardcoded.length} string(s) JSX hardcoded (aviso, no FAIL).`
        : 'Keys es/en/pt alineadas en el diff.',
  };
}

export function i18nApplies(changedFiles) {
  return (changedFiles || []).some((file) => {
    const p = String(file).replaceAll('\\', '/');
    if (/\/i18n\/locales\/(es|en|pt)\.json$/.test(p)) return true;
    if (/\.(tsx|jsx)$/.test(p) && p.includes('frontend/')) return true;
    return false;
  });
}
