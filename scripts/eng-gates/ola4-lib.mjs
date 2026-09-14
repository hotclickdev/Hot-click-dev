/**
 * Helpers compartidos de ola 4 (D6 / D7 / D8 / D11 / S4 / E5).
 * Reusa ola 2/3. No toca pago/auth/schedulers de negocio.
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hasLabel, normalizeApiPath, redactSecrets, writeGithubOutput } from './ola2-lib.mjs';

export const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const JAVA_MAIN = join(REPO_ROOT, 'Hot_click_outlet', 'src', 'main', 'java');
export const JAVA_TEST = join(REPO_ROOT, 'Hot_click_outlet', 'src', 'test', 'java');
export const FRONTEND_SRC = join(REPO_ROOT, 'Hot_click_outlet', 'frontend', 'src');
export const FRONTEND_SERVICES = join(FRONTEND_SRC, 'services');
export const FRONTEND_TESTS = join(REPO_ROOT, 'Hot_click_outlet', 'frontend', 'tests');
export const I18N_DIR = join(FRONTEND_SRC, 'i18n', 'locales');
export const CI_E2E_SPECS = [
  'tests/pos-pago-express.spec.ts',
  'tests/descubri-pago.spec.ts',
  'tests/seller-wizard.spec.ts',
  'tests/emprendedor-wizard.spec.ts',
  'tests/seller-qa-escape-remap.spec.ts',
  'tests/seller-wizard-remap.spec.ts',
];

export const SKIP_LABELS = {
  flake: 'skip-flake-hunter',
  i18n: 'skip-i18n-drift',
  secrets: 'skip-secrets-docs',
  api: 'skip-api-drift',
  idorGap: 'skip-idor-gap',
  playwright: 'skip-playwright-area',
};

export const PRIORITY_I18N_NS = ['home', 'checkout', 'pos'];
export const PRIORITY_API_FAMILIES = ['/api/sinpe', '/api/pos', '/api/auth', '/api/payments', '/api/pedidos'];

const MAPPING_ANNOS = String.raw`(?:Get|Post|Put|Patch|Delete|Request)Mapping`;
const CLASS_MAP_RE = /@RequestMapping\s*(?:\((?:value|path)\s*=\s*)?[\(\s]*["']([^"']+)["']/;
const METHOD_MAP_RE = new RegExp(
  `@(Get|Post|Put|Patch|Delete|Request)Mapping\\s*(?:\\((?:value|path)\\s*=\\s*)?[\\(\\s]*["']([^"']+)["']`,
  'g',
);
const EMPTY_METHOD_RE = /@(Get|Post|Put|Patch|Delete)Mapping\b(?!\s*\(\s*["'])/g;
const FE_CALL_RE =
  /\b(?:api|publicApi|axios)\s*\.\s*(get|post|put|patch|delete)\s*\(\s*(?:`([^`]+)`|'([^']+)'|"([^"]+)")/gi;
const FE_API_STR_RE = /['"`](\/api\/[A-Za-z0-9_./${}-]+)['"`]/g;

export { hasLabel, normalizeApiPath, redactSecrets, writeGithubOutput };

export function readRepo(relPath) {
  const abs = join(REPO_ROOT, relPath);
  return existsSync(abs) ? readFileSync(abs, 'utf8') : '';
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
    for (const entry of entries) {
      const abs = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (['node_modules', 'target', '.git', 'dist', 'playwright-report', 'test-results'].includes(entry.name)) {
          continue;
        }
        stack.push(abs);
        continue;
      }
      if (!pred || pred(abs, entry.name)) out.push(abs);
    }
  }
  return out.sort();
}

export function relRepo(absPath) {
  return relative(REPO_ROOT, absPath).split(sep).join('/');
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

export function namespaceOf(key) {
  return String(key || '').split('.')[0] || 'root';
}

/** Like ola2 normalizeApiPath but keeps `{id}` (ola2 lo convierte a `*`). */
export function normalizeTemplatePath(raw) {
  let path = String(raw || '').split(/[?#]/)[0].trim();
  if (!path) return '/';
  if (!path.startsWith('/')) path = `/${path}`;
  path = path.replace(/\{[^}]+\}/g, '{id}');
  path = path.replace(/\/{2,}/g, '/');
  if (path.length > 1) path = path.replace(/\/+$/, '');
  return path;
}

export function joinUrl(prefix, suffix) {
  if (!prefix) return suffix || '/';
  if (!suffix || suffix === '/') return prefix;
  if (suffix.startsWith(prefix)) return suffix;
  return normalizeTemplatePath(`${prefix}/${suffix}`.replace(/\/{2,}/g, '/'));
}

export function extractClassPrefix(source) {
  const hit = String(source).match(CLASS_MAP_RE);
  return hit ? normalizeTemplatePath(hit[1]) : '';
}

export function extractControllerRoutes(source, filePath = 'Controller.java') {
  const prefix = extractClassPrefix(source);
  const routes = [];
  const seen = new Set();
  const push = (method, path) => {
    const full = joinUrl(prefix, path || '/');
    const key = `${method} ${full}`;
    if (seen.has(key)) return;
    seen.add(key);
    routes.push({
      method,
      path: full,
      file: String(filePath).replaceAll('\\', '/'),
      pathId: isPathIdRoute(full),
    });
  };

  const methodRe = new RegExp(METHOD_MAP_RE.source, 'g');
  let match;
  while ((match = methodRe.exec(source))) {
    const verb = match[1] === 'Request' ? 'REQUEST' : match[1].toUpperCase();
    push(verb, normalizeTemplatePath(match[2]));
  }

  const emptyRe = new RegExp(EMPTY_METHOD_RE.source, 'g');
  while ((match = emptyRe.exec(source))) {
    push(match[1].toUpperCase(), prefix || '/');
  }
  return routes;
}

export function isPathIdRoute(path) {
  const parts = normalizeTemplatePath(path).split('/').filter(Boolean);
  return parts.some((part) => part === '{id}' || /^\{[A-Za-z][\w]*\}$/.test(part));
}

export function normalizeClientPath(raw, { axiosBase = '/api' } = {}) {
  let path = String(raw || '').split(/[?#]/)[0].trim();
  path = path.replace(/\$\{(?:params|queryString|query|qs)\}/g, '');
  path = path.replace(/\?\$\{[^}]+\}/g, '');
  path = path.replace(/\$\{[^}]+\}/g, '{id}');
  path = path.replace(/:[A-Za-z_]\w*/g, '{id}');
  if (!path.startsWith('/')) path = `/${path}`;
  if (axiosBase && !path.startsWith('/api') && !path.startsWith('http')) {
    path = joinUrl(axiosBase, path);
  }
  return normalizeTemplatePath(path);
}

export function extractFrontendApiPaths(source, filePath = 'service.ts') {
  const paths = [];
  const seen = new Set();
  const push = (method, raw) => {
    const path = normalizeClientPath(raw);
    const key = `${method} ${path}`;
    if (seen.has(key)) return;
    seen.add(key);
    paths.push({ method, path, file: String(filePath).replaceAll('\\', '/'), raw });
  };

  const callRe = new RegExp(FE_CALL_RE.source, 'gi');
  let match;
  while ((match = callRe.exec(source))) {
    const raw = match[2] || match[3] || match[4] || '';
    if (!raw || raw.startsWith('http')) continue;
    push(match[1].toUpperCase(), raw);
  }

  const strRe = new RegExp(FE_API_STR_RE.source, 'g');
  while ((match = strRe.exec(source))) {
    push('ANY', match[1]);
  }
  return paths;
}

export function routeMatches(clientPath, serverPath) {
  const a = normalizeTemplatePath(clientPath);
  const b = normalizeTemplatePath(serverPath);
  if (a === b) return true;
  const aParts = a.split('/').filter(Boolean);
  const bParts = b.split('/').filter(Boolean);
  if (aParts.length !== bParts.length) return false;
  return aParts.every((part, i) => part === bParts[i] || part === '*' || bParts[i] === '*'
    || part === '{id}' || bParts[i] === '{id}'
    || /^\{.+\}$/.test(part) || /^\{.+\}$/.test(bParts[i]));
}

export function familyOf(path) {
  const parts = normalizeTemplatePath(path).split('/').filter(Boolean);
  if (parts[0] !== 'api' || parts.length < 2) return normalizeApiPath(path);
  if (parts[1] === 'admin' && parts[2]) return `/api/admin/${parts[2]}`;
  if (parts[1] === 'public' && parts[2]) return `/api/public/${parts[2]}`;
  return `/api/${parts[1]}`;
}

const JAVA_FAIL_RE = /(?:<<<\s*FAILURE!|<<<\s*ERROR!).*?\b([A-Za-z][\w.$]*Test(?:s)?)\b|(?:^|\s)([A-Za-z][\w.$]*Test(?:s)?)\s*[>#.]\s*(\w+)/gm;
const JAVA_IN_RE = /-- in ([A-Za-z][\w.$]*Test(?:s)?)/g;
const TS_SPEC_RE = /(?:^|\s|›\s|FAIL\s+)((?:tests|src)\/[\w./-]+\.(?:spec|test)\.[tj]sx?)(?::\d+)?/g;
const TS_FAIL_RE = /(?:Error:\s+\d+\)\s+|✘\s+\d+\s+)([\w./-]+\.(?:spec|test)\.[tj]sx?)/g;

export function parseFailedSpecs(logText) {
  const specs = [];
  const seen = new Set();
  const add = (name, kind) => {
    const clean = String(name || '').replaceAll('\\', '/').trim();
    if (!clean || seen.has(`${kind}:${clean}`)) return;
    seen.add(`${kind}:${clean}`);
    specs.push({ name: clean, kind });
  };

  const javaFail = new RegExp(JAVA_FAIL_RE.source, 'gm');
  let match;
  while ((match = javaFail.exec(logText))) {
    add(match[1] || match[2], 'java');
  }
  const javaIn = new RegExp(JAVA_IN_RE.source, 'g');
  while ((match = javaIn.exec(logText))) add(match[1], 'java');

  const tsSpec = new RegExp(TS_SPEC_RE.source, 'g');
  while ((match = tsSpec.exec(logText))) add(match[1], 'ts');
  const tsFail = new RegExp(TS_FAIL_RE.source, 'g');
  while ((match = tsFail.exec(logText))) add(match[1], 'ts');
  return specs;
}

export function findFlakySpecs(runs) {
  const byName = new Map();
  for (const run of runs || []) {
    const failed = new Set((run.failedSpecs || []).map((s) => s.name));
    const names = new Set([
      ...failed,
      ...(run.passedSpecs || []).map((s) => s.name),
    ]);
    for (const spec of [...(run.failedSpecs || []), ...(run.passedSpecs || [])]) {
      if (!byName.has(spec.name)) {
        byName.set(spec.name, { name: spec.name, kind: spec.kind, failRuns: new Set(), passRuns: new Set() });
      }
      names.add(spec.name);
    }
    for (const name of names) {
      if (!byName.has(name)) continue;
      if (failed.has(name)) byName.get(name).failRuns.add(run.id);
      else if (run.conclusion === 'success' || (run.passedSpecs || []).some((s) => s.name === name)) {
        byName.get(name).passRuns.add(run.id);
      }
    }
    if (run.conclusion === 'success') {
      for (const spec of run.passedSpecs || []) {
        if (!byName.has(spec.name)) {
          byName.set(spec.name, { name: spec.name, kind: spec.kind, failRuns: new Set(), passRuns: new Set() });
        }
        byName.get(spec.name).passRuns.add(run.id);
      }
    }
  }

  const flaky = [];
  for (const item of byName.values()) {
    if (item.failRuns.size >= 2 && item.passRuns.size >= 1) {
      flaky.push({
        name: item.name,
        kind: item.kind,
        failCount: item.failRuns.size,
        passCount: item.passRuns.size,
        failRuns: [...item.failRuns],
        passRuns: [...item.passRuns],
      });
    }
  }
  return flaky.sort((a, b) => b.failCount - a.failCount || a.name.localeCompare(b.name));
}

export function redactFindingValue(value) {
  const raw = String(value ?? '');
  if (!raw) return '***';
  if (raw.length <= 8) return '***';
  return `${raw.slice(0, 3)}…${raw.slice(-2)}`.replace(/[A-Za-z0-9+/=_-]/g, (ch, i, s) => (
    i < 3 || i >= s.length - 2 ? ch : '*'
  ));
}

export function looksLikePlaceholder(value) {
  const v = String(value || '').trim();
  if (/^(placeholder|changeme|your-|xxx+|dummy|example|redacted|\*{3,}|<[^>]+>|\$\{|test-secret-for-ci|whsec_placeholder|ci-mock|pk_test_placeholder)$/i.test(v)) {
    return true;
  }
  if (/\[PASSWORD\]|\[PROJECT_REF\]|\[YOUR_|<password>|your-password/i.test(v)) return true;
  if (/@127\.0\.0\.1|@localhost\b/i.test(v) && /:(drill|pass|password|user|test)@/i.test(v)) return true;
  return false;
}

const DOC_SECRET_RULES = [
  { id: 'pem', title: 'PEM / private key', re: /-----BEGIN [A-Z ]{0,40}PRIVATE KEY-----/g },
  { id: 'dsn', title: 'DSN con credenciales', re: /\b(?:postgres(?:ql)?|mysql|mongodb|redis):\/\/[^\s/'"]+:[^\s/'"]+@[^\s'"]+/gi },
  { id: 'sentry-dsn', title: 'Sentry DSN con clave', re: /https:\/\/[a-f0-9]{20,}@[a-z0-9.-]*sentry[^\s'"]*/gi },
  { id: 'password', title: 'password con valor', re: /\bpassword\s*[:=]\s*['"]?([^\s'"]{8,})['"]?/gi },
  { id: 'token', title: 'token con valor', re: /\b(?:api[_-]?key|access[_-]?token|auth[_-]?token|secret[_-]?key|bearer)\s*[:=]\s*['"]?([A-Za-z0-9._/+-]{12,})['"]?/gi },
  { id: 'sk-live', title: 'Stripe sk_live', re: /\bsk_live_[A-Za-z0-9]{16,}\b/g },
  { id: 'github-pat', title: 'GitHub token', re: /\b(?:ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/g },
  { id: 'aws-key', title: 'AWS access key', re: /\bAKIA[0-9A-Z]{16}\b/g },
];

export function scanDocSecrets(text, filePath = 'README.md') {
  const findings = [];
  const rel = String(filePath).replaceAll('\\', '/');
  if (rel.includes('scripts/eng-gates/') && /\.(test\.)?mjs$/.test(rel)) return findings;
  for (const rule of DOC_SECRET_RULES) {
    const re = new RegExp(rule.re.source, rule.re.flags);
    let match;
    while ((match = re.exec(text))) {
      const value = match[1] || match[0];
      if (looksLikePlaceholder(value)) continue;
      if (rule.id === 'password' || rule.id === 'token') {
        if (/^(GITHUB_TOKEN|SONAR_TOKEN|SENTRY_TOKEN|TELEGRAM_|SUPABASE_|JWT_SECRET|VITE_)/i.test(value)) continue;
        if (value.length < 10) continue;
      }
      const line = text.slice(0, match.index).split(/\r?\n/).length;
      findings.push({
        id: rule.id,
        title: rule.title,
        path: rel,
        line,
        redacted: redactSecrets(redactFindingValue(value)),
      });
    }
  }
  return findings;
}

export function selectPlaywrightSpecs(changedFiles, specNames) {
  const files = (changedFiles || []).map((f) => f.replaceAll('\\', '/'));
  const specs = specNames || [];
  const areas = [];
  const selected = new Set();

  const rules = [
    { id: 'pos', fileRe: /(^|\/)(pos|Pos)(\/|\.|Service|Page|Qr)/, specRe: /^pos-/ },
    { id: 'seller', fileRe: /(seller|emprendedor|pyme|negocio-plus|wizard)/i, specRe: /^(seller-|emprendedor-)/ },
    { id: 'checkout', fileRe: /(checkout|carrito|cart|payment|pago|sinpe)/i, specRe: /^(checkout-|descubri-pago|tienda-checkout|asistente-checkout|pago-)/ },
  ];

  const feTouched = files.some((f) => f.includes('Hot_click_outlet/frontend/'));
  if (!feTouched) return { areas: [], specs: [], reason: 'El PR no toca frontend' };

  for (const rule of rules) {
    const hit = files.some((f) => f.includes('Hot_click_outlet/frontend/') && rule.fileRe.test(f));
    if (!hit) continue;
    areas.push(rule.id);
    for (const spec of specs) {
      const base = spec.replace(/^pending\//, '').split('/').pop() || spec;
      if (rule.specRe.test(base)) selected.add(spec);
    }
  }

  for (const file of files) {
    const m = file.match(/frontend\/tests\/(.+\.spec\.ts)$/);
    if (m) selected.add(m[1]);
  }

  return {
    areas,
    specs: [...selected].sort(),
    reason: areas.length
      ? `Áreas ${areas.join(', ')} por path prefix`
      : 'Frontend tocado pero sin prefix pos/seller/checkout',
  };
}

export function isoDay(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function hoursAgoIso(hours, now = new Date()) {
  return new Date(now.getTime() - hours * 3600 * 1000).toISOString();
}

export function fileMtimeMs(absPath) {
  try {
    return statSync(absPath).mtimeMs;
  } catch {
    return 0;
  }
}
