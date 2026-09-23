/**
 * Helpers compartidos de ola 3 (D1 / D3 / D4+E8 / S2 / E4 / E7 / E9).
 * Reusa ola 1/2 donde ya existe (lib.mjs, ola2-lib). No toca pago/auth/schedulers.
 */

import { execFileSync } from 'node:child_process';
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const MIGRATION_DIR = 'Hot_click_outlet/src/main/resources/db/migration';
export const MODEL_DIR = 'Hot_click_outlet/src/main/java/com/hotclick/model';
export const ACTUALIZADO = 'Hot_click_outlet/Actualizado.sql';
export const FRONTEND_SRC = 'Hot_click_outlet/frontend/src';
export const STATIC_DIR = 'Hot_click_outlet/src/main/resources/static';
export const DEFAULT_HEALTH_URL = 'https://hot-click-dev.onrender.com/api/health';

export const SKIP_LABELS = {
  drift: 'skip-flyway-drift',
  spa: 'skip-spa-stale',
  sentry: 'skip-sentry-digest',
  deps: 'skip-deps-weekly',
  commitGate: 'skip-commit-gate',
  ciRed: 'skip-ci-red',
  health: 'skip-health-pager',
};

export const CRITICAL_MAJOR_PACKAGES = [
  /spring-boot/i,
  /jjwt/i,
  /stripe-java/i,
];

// Word boundaries avoid false positives on camelCase (accessToken, sdkToken)
// and prose in docs ("password mínimo 8").
const SECRET_RE =
  /\b(api[_-]?key|token|password|secret|authorization|bearer|sk_live|sk_test|whsec)\b[=:\s]+['"]?[\w./+.-]{8,}/gi;

export function redactSecrets(text) {
  return String(text ?? '').replace(SECRET_RE, (match) => {
    const cut = match.search(/[=:\s]/);
    return `${match.slice(0, cut + 1)}***`;
  });
}

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

export function git(args, cwd = REPO_ROOT) {
  return execFileSync('git', args, {
    encoding: 'utf8',
    cwd,
    stdio: ['pipe', 'pipe', 'pipe'],
    maxBuffer: 20 * 1024 * 1024,
  });
}

export function gitChangedFiles(base, head) {
  const raw = git(['diff', '--name-only', `${base}...${head}`]);
  return raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

export function gitLatestCommitMeta(path) {
  try {
    const raw = git(['log', '-1', '--format=%H|%ct|%s', '--', path]).trim();
    if (!raw) return null;
    const [sha, ts, ...rest] = raw.split('|');
    return { sha, ts: Number(ts), subject: rest.join('|') };
  } catch {
    return null;
  }
}

export function gitTreeHash(path) {
  try {
    return git(['rev-parse', `HEAD:${path}`]).trim();
  } catch {
    return '';
  }
}

export function readRepo(relPath) {
  const abs = join(REPO_ROOT, relPath);
  return existsSync(abs) ? readFileSync(abs, 'utf8') : '';
}

export function toSnake(name) {
  return String(name)
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[-\s]+/g, '_')
    .toLowerCase();
}

export function quoteIdent(name) {
  return String(name || '').replace(/"/g, '').trim().toLowerCase();
}

export function parseAttrName(attrBlock) {
  const match = String(attrBlock || '').match(/\bname\s*=\s*"([^"]+)"/);
  return match ? quoteIdent(match[1]) : '';
}

export function parseJpaEntities(source, filePath = 'Entity.java') {
  if (!/@Entity\b/.test(source) && !/@MappedSuperclass\b/.test(source)) return [];
  const className = source.match(/(?:class|interface)\s+(\w+)/)?.[1] || 'Unknown';
  const table = parseAttrName(source.match(/@Table\s*\(([^)]*)\)/)?.[1] || '')
    || toSnake(className);
  const mappedSuper = /@MappedSuperclass\b/.test(source);
  const columns = [];
  const seen = new Set();

  const named = /@(Column|JoinColumn)\s*\(([^)]*)\)/g;
  let hit;
  while ((hit = named.exec(source))) {
    const col = parseAttrName(hit[2]);
    if (!col || seen.has(col)) continue;
    seen.add(col);
    columns.push({ name: col, from: hit[1] });
  }

  return [{
    file: filePath.replaceAll('\\', '/'),
    className,
    table,
    mappedSuper,
    columns,
  }];
}

export function stripSqlComments(sql) {
  return String(sql)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/--[^\n]*/g, '');
}

export function parseFlywaySql(sql) {
  const cleaned = stripSqlComments(sql);
  const tables = new Map();
  const ensure = (table) => {
    const key = quoteIdent(table);
    if (!tables.has(key)) tables.set(key, new Set());
    return tables.get(key);
  };

  const create = /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:"?([\w.]+)"?)/gi;
  let match;
  while ((match = create.exec(cleaned))) {
    const table = match[1].split('.').pop();
    const open = cleaned.indexOf('(', match.index + match[0].length - 1);
    if (open < 0) {
      ensure(table);
      continue;
    }
    const close = findMatchingParen(cleaned, open);
    const body = cleaned.slice(open + 1, close);
    ensure(table);
    for (const col of columnsFromCreateBody(body)) ensure(table).add(col);
  }

  const alterStart = /alter\s+table\s+(?:if\s+exists\s+)?(?:"?([\w.]+)"?)/gi;
  while ((match = alterStart.exec(cleaned))) {
    const table = match[1].split('.').pop();
    const start = match.index + match[0].length;
    const end = findSqlStatementEnd(cleaned, start);
    const chunk = cleaned.slice(start, end);
    ensure(table);
    const addCol = /add\s+column\s+(?:if\s+not\s+exists\s+)?(?:"?(\w+)"?)/gi;
    let col;
    while ((col = addCol.exec(chunk))) {
      ensure(table).add(quoteIdent(col[1]));
    }
  }

  return tables;
}

function findSqlStatementEnd(text, from) {
  let depth = 0;
  for (let i = from; i < text.length; i += 1) {
    if (text[i] === '(') depth += 1;
    else if (text[i] === ')') depth = Math.max(0, depth - 1);
    else if (text[i] === ';' && depth === 0) return i;
  }
  return text.length;
}

function findMatchingParen(text, openIdx) {
  let depth = 0;
  for (let i = openIdx; i < text.length; i += 1) {
    if (text[i] === '(') depth += 1;
    else if (text[i] === ')') {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return text.length;
}

function columnsFromCreateBody(body) {
  const cols = [];
  for (const raw of body.split(',')) {
    const line = raw.trim();
    if (!line) continue;
    if (/^(constraint|primary|unique|check|foreign|exclude)\b/i.test(line)) continue;
    const col = line.match(/^"?(\w+)"?/);
    if (col) cols.push(quoteIdent(col[1]));
  }
  return cols;
}

export function mergeSqlMaps(maps) {
  const out = new Map();
  for (const map of maps) {
    for (const [table, cols] of map) {
      if (!out.has(table)) out.set(table, new Set());
      for (const col of cols) out.get(table).add(col);
    }
  }
  return out;
}

export function nextMigrationFilename(versions, slug = 'schema_drift') {
  const nums = versions.map((v) => Number(v)).filter((n) => Number.isFinite(n) && n > 0);
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  const safe = String(slug).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'schema_drift';
  return `V${next}__${safe}.sql`;
}

export function parseMigrationVersion(filename) {
  const match = String(filename).match(/\/V(\d+)__/i) || String(filename).match(/^V(\d+)__/i);
  return match ? Number(match[1]) : 0;
}

export function diffJpaVsSql(entities, sqlTables, superColumns = []) {
  const missingTables = [];
  const missingColumns = [];
  const inherited = new Set(superColumns.map(quoteIdent));

  for (const entity of entities) {
    if (entity.mappedSuper) continue;
    const table = quoteIdent(entity.table);
    const sqlCols = sqlTables.get(table);
    if (!sqlCols) {
      missingTables.push({ table, file: entity.file, className: entity.className });
      continue;
    }
    for (const col of entity.columns) {
      if (inherited.has(col.name)) continue;
      if (sqlCols.has(col.name)) continue;
      let foundElsewhere = false;
      for (const set of sqlTables.values()) {
        if (set.has(col.name)) {
          foundElsewhere = true;
          break;
        }
      }
      if (foundElsewhere) continue;
      missingColumns.push({
        table,
        column: col.name,
        file: entity.file,
        className: entity.className,
      });
    }
  }
  return { missingTables, missingColumns };
}

export function evaluateSpaStale({ frontendMeta, staticMeta, frontendTree, staticTree }) {
  if (!frontendMeta) {
    return { stale: false, reason: 'Sin historial git de frontend/src' };
  }
  if (!staticMeta) {
    return {
      stale: true,
      reason: 'Hay frontend/src y no hay evidencia git de static/ (Docker no buildea React).',
    };
  }
  if (frontendMeta.ts > staticMeta.ts) {
    return {
      stale: true,
      reason: `frontend/src cambió después de static/ (${frontendMeta.sha.slice(0, 7)} vs ${staticMeta.sha.slice(0, 7)}).`,
      frontendSha: frontendMeta.sha,
      staticSha: staticMeta.sha,
      frontendTree,
      staticTree,
    };
  }
  return {
    stale: false,
    reason: 'static/ tiene commit igual o posterior al último cambio de frontend/src.',
    frontendSha: frontendMeta.sha,
    staticSha: staticMeta.sha,
    frontendTree,
    staticTree,
  };
}

export function evaluateHealth({ currentStatus, previousStatus }) {
  const currentOk = Number(currentStatus) === 200;
  const previousOk = previousStatus == null || previousStatus === ''
    ? null
    : Number(previousStatus) === 200;
  const consecutiveFails = !currentOk && previousOk === false;
  return {
    currentOk,
    previousOk,
    consecutiveFails,
    openOutage: consecutiveFails,
    recovered: currentOk && previousOk === false,
  };
}

export function sentryTokenPresent(env = process.env) {
  return Boolean(String(env.SENTRY_TOKEN || env.SENTRY_AUTH_TOKEN || '').trim());
}

export function mapSentryIssue(raw) {
  const id = String(raw?.id || raw?.shortId || '');
  const title = String(raw?.title || raw?.metadata?.value || 'Error Sentry');
  const culprit = String(raw?.culprit || raw?.metadata?.filename || '');
  const permalink = String(raw?.permalink || raw?.shareId || '');
  const level = String(raw?.level || 'error');
  const count = raw?.count ?? raw?.userCount ?? '';
  const lastSeen = raw?.lastSeen || '';
  const firstSeen = raw?.firstSeen || '';
  const release = raw?.metadata?.release
    || raw?.project?.slug
    || pickTag(raw, 'release')
    || '';
  const sha = pickTag(raw, 'commit') || extractSha(release);
  const endpoint = culprit || pickTag(raw, 'url') || pickTag(raw, 'transaction') || '';
  return {
    id,
    shortId: raw?.shortId || id,
    title,
    culprit,
    endpoint,
    permalink,
    level,
    count,
    lastSeen,
    firstSeen,
    release,
    sha,
  };
}

function pickTag(raw, key) {
  const tags = raw?.tags;
  if (!Array.isArray(tags)) return '';
  for (const tag of tags) {
    if (Array.isArray(tag) && String(tag[0]) === key) return String(tag[1] || '');
    if (tag && typeof tag === 'object' && String(tag.key) === key) return String(tag.value || '');
  }
  return '';
}

function extractSha(release) {
  const match = String(release || '').match(/\b([0-9a-f]{7,40})\b/i);
  return match ? match[1] : '';
}

export function classifyFlake({ failedJob, masterFailedSameJob, masterLastGreen }) {
  if (masterFailedSameJob) {
    return {
      kind: 'flake',
      hint: `El job \`${failedJob}\` también falló recientemente en master — posible flake, no solo regresión del PR.`,
    };
  }
  if (masterLastGreen) {
    return {
      kind: 'regression',
      hint: `Master está verde y \`${failedJob}\` falló en este run — más parecido a regresión que a flake.`,
    };
  }
  return {
    kind: 'unknown',
    hint: 'No hay señal clara vs master (pocos runs o job distinto). Revisá el log.',
  };
}

export function tailLines(text, n = 30) {
  const lines = String(text || '').replace(/\r\n/g, '\n').split('\n');
  return lines.slice(Math.max(0, lines.length - n)).join('\n');
}

const DEBUG_BLOCKERS = [
  { id: 'agent-log', re: /#region agent log/i, title: 'Instrumentación `#region agent log`' },
  { id: 'debug-log', re: /debug-[\w.-]+\.log/i, title: 'Archivo debug-*.log' },
  { id: 'ndjson-ignored', re: /catch\s*\(\s*Exception\s+ignored\s*\)/i, title: 'catch (Exception ignored) NDJSON local' },
  { id: 'dotenv', re: /(^|\/)\.env(\.|$)/, title: 'Archivo .env (secretos)' },
  { id: 'vitest-results', re: /(^|\/)results\.json$/, title: 'results.json de Vitest' },
];

/** Solo artefactos reales (dirs playwright-report o test-results), no allowlists ni YAML. */
export function isPlaywrightReportArtifact(filePath) {
  const normalized = String(filePath || '').replaceAll('\\', '/');
  return /(^|\/)(playwright-report|test-results)\/./.test(normalized);
}

const SELF_SCAN_PATH = /(?:^|\/)scripts\/eng-gates\/(?:ola3-lib|commit-gate|ola3\.test)\.mjs$/;
const CI_PLACEHOLDER_RE =
  /test-secret-for-ci-only|whsec_placeholder|ci-mock-not-a-stripe-key|pk_test_placeholder|sk_live_abc|supersecret99/;

export function isSelfScanPath(filePath) {
  return SELF_SCAN_PATH.test(String(filePath || '').replaceAll('\\', '/'));
}

/** Vite hashed bundles — `token:` / Clerk minificado no es un secreto del diff. */
export function isBundledSpaAsset(filePath) {
  return /(?:^|\/)src\/main\/resources\/static\//.test(
    String(filePath || '').replaceAll('\\', '/'),
  );
}

export function scanCommitBlockers({ changedFiles, diffText }) {
  const findings = [];
  for (const file of changedFiles || []) {
    const normalized = file.replaceAll('\\', '/');
    if (isSelfScanPath(normalized)) continue;
    if (/(^|\/)\.env(\.|$)/.test(normalized) && !normalized.endsWith('.example')) {
      findings.push({ id: 'dotenv', path: normalized, title: 'No commitear `.env`', snippet: normalized });
    }
    if (/debug-[\w.-]+\.log$/i.test(normalized)) {
      findings.push({ id: 'debug-log', path: normalized, title: 'No commitear debug-*.log', snippet: normalized });
    }
    if (isPlaywrightReportArtifact(normalized)) {
      findings.push({ id: 'playwright-report', path: normalized, title: 'No commitear reportes Playwright', snippet: normalized });
    }
  }
  const files = parseSimpleDiff(diffText || '');
  for (const file of files) {
    if (isSelfScanPath(file.path) || isBundledSpaAsset(file.path)) continue;
    if (isPlaywrightReportArtifact(file.path)) {
      findings.push({
        id: 'playwright-report',
        path: file.path,
        title: 'No commitear reportes Playwright',
        snippet: file.path,
      });
    }
    for (const line of file.added) {
      if (CI_PLACEHOLDER_RE.test(line)) continue;
      for (const rule of DEBUG_BLOCKERS) {
        if (rule.id === 'dotenv') continue;
        if (rule.re.test(line) || rule.re.test(file.path)) {
          findings.push({
            id: rule.id,
            path: file.path,
            title: rule.title,
            snippet: redactSecrets(line).trim().slice(0, 160),
          });
        }
      }
      if (SECRET_RE.test(line) && !/\.example$/.test(file.path)) {
        SECRET_RE.lastIndex = 0;
        findings.push({
          id: 'secret',
          path: file.path,
          title: 'Posible secreto en el diff',
          snippet: redactSecrets(line).trim().slice(0, 160),
        });
      }
      SECRET_RE.lastIndex = 0;
    }
  }
  return dedupeFindings(findings);
}

function parseSimpleDiff(text) {
  const files = [];
  let current = null;
  for (const raw of String(text).split('\n')) {
    const plusFile = raw.match(/^\+\+\+ (?:b\/)?(.+)$/);
    if (plusFile) {
      current = { path: plusFile[1], added: [] };
      if (plusFile[1] !== '/dev/null') files.push(current);
      continue;
    }
    if (current && raw.startsWith('+') && !raw.startsWith('+++')) {
      current.added.push(raw.slice(1));
    }
  }
  return files;
}

function dedupeFindings(findings) {
  const seen = new Set();
  const out = [];
  for (const item of findings) {
    const key = `${item.id}:${item.path}:${item.snippet}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

export function planCommitChecks(changedFiles) {
  const files = (changedFiles || []).map((f) => f.replaceAll('\\', '/'));
  const frontend = files.filter((f) => f.includes('Hot_click_outlet/frontend/') && /\.(ts|tsx)$/.test(f));
  const frontendSrc = frontend.filter((f) => f.includes('/frontend/src/'));
  const typeOrImport = frontendSrc.filter((f) => /\.(ts|tsx)$/.test(f));
  const javaMain = files.filter((f) => f.includes('/src/main/java/') && f.endsWith('.java'));
  const javaTest = files.filter((f) => f.includes('/src/test/java/') && f.endsWith('.java'));
  const javaTouched = [...javaMain, ...javaTest];
  return {
    runFrontendTests: frontendSrc.length > 0,
    runFrontendTypecheck: typeOrImport.length > 0,
    javaTouched,
    javaMain,
    javaTest,
    tooManyJava: javaTouched.length > 8,
    runEngGates: files.some((f) =>
      f.endsWith('.java')
      || f.includes('/db/migration/')
      || f.includes('/frontend/src/')
      || f.includes('/resources/static/')),
  };
}

export function javaTestClassName(filePath) {
  const base = filePath.replaceAll('\\', '/').split('/').pop() || '';
  if (!base.endsWith('.java')) return '';
  const name = base.slice(0, -5);
  if (name.endsWith('Test') || name.endsWith('IT') || name.endsWith('Tests')) return name;
  return `${name}Test`;
}

export function isPendingJavaTest(filePath) {
  return /\/pending\//.test(String(filePath || '').replaceAll('\\', '/'));
}

export function pickJavaTests(changedFiles, existingTests) {
  const wanted = new Set();
  for (const file of changedFiles || []) {
    if (isPendingJavaTest(file)) continue;
    const cls = javaTestClassName(file);
    if (cls) wanted.add(cls);
  }
  const have = new Set(
    (existingTests || []).map((f) => (f.replaceAll('\\', '/').split('/').pop() || '').replace(/\.java$/, '')),
  );
  return [...wanted].filter((name) => have.has(name)).slice(0, 8);
}

export function isCriticalMajorTitle(title) {
  const parsed = String(title || '').match(
    /bump\s+(.+?)\s+from\s+v?(\d+\.\d+\.\d+\S*)\s+to\s+v?(\d+\.\d+\.\d+\S*)/i,
  );
  if (!parsed) return false;
  const name = parsed[1];
  const fromMaj = Number(parsed[2].split('.')[0]);
  const toMaj = Number(parsed[3].split('.')[0]);
  if (toMaj <= fromMaj) return false;
  return CRITICAL_MAJOR_PACKAGES.some((re) => re.test(name));
}

export function formatHttpStatus(status) {
  const n = Number(status);
  return Number.isFinite(n) ? String(n) : '000';
}
