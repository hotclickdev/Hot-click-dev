/**
 * Helpers de ola 5 (D9 / D10 / S5 / S7 / E12 / E14 / E18).
 * Autocontenido respecto de ola 4 (#58). Reusa solo APIs de Node 22.
 * No toca pago/auth ni schedulers de negocio.
 */

import { execFileSync } from 'node:child_process';
import { appendFileSync, existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const FRONTEND_SRC = join(REPO_ROOT, 'Hot_click_outlet', 'frontend', 'src');
export const FRONTEND_TESTS = join(REPO_ROOT, 'Hot_click_outlet', 'frontend', 'tests');
export const MIGRATION_DIR = join(
  REPO_ROOT,
  'Hot_click_outlet',
  'src',
  'main',
  'resources',
  'db',
  'migration',
);
export const TOKENS_REL = 'Hot_click_outlet/frontend/src/styles/hotclick-tokens.css';
export const AI_QUOTA_REL = 'Hot_click_outlet/src/main/java/com/hotclick/service/AiQuotaService.java';
export const AI_CONTROL_REL = 'Hot_click_outlet/src/main/java/com/hotclick/controller/AiControlController.java';
export const QUOTA_THRESHOLD = 0.8;
export const DEFAULT_STALE_DAYS = 14;
export const DEFAULT_CLOSE_AFTER_DAYS = 7;
export const D10_PING_MARKER = 'hotclick-d10-stale-ping';

export const SKIP_LABELS = {
  aiQuota: 'skip-ai-quota',
  hygiene: 'skip-issues-hygiene',
  tokens: 'skip-design-tokens',
  ley8968: 'skip-ley8968',
  sellerQa: 'skip-seller-qa',
  hotfix: 'skip-hotfix-gate',
  pgbouncer: 'skip-pgbouncer-migration',
};

export const SELLER_PREFIXES = ['/emprendedor', '/pyme', '/negocio-plus'];
export const SELLER_SPECS = [
  'tests/seller-wizard.spec.ts',
  'tests/seller-wizard-errors.spec.ts',
  'tests/seller-sidebar.spec.ts',
  'tests/emprendedor-wizard.spec.ts',
  'tests/emprendedor-sidebar.spec.ts',
  'tests/seller-wizard-remap.spec.ts',
  'tests/seller-qa-escape-remap.spec.ts',
];

const PRODUCT_ISSUE_LABELS = new Set([
  'bug', 'prod-errors', 'outage', 'sentry', 'enhancement', 'feature',
]);

const CRITICAL_MAJOR_NAME = /spring-boot|jjwt|stripe/i;

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
    for (const entry of entries) {
      const abs = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === 'target' || entry.name === '.git') continue;
        stack.push(abs);
        continue;
      }
      if (!pred || pred(abs, entry.name)) out.push(abs);
    }
  }
  return out.sort();
}

export function gitChangedFiles(base, head, cwd = REPO_ROOT) {
  const raw = execFileSync('git', ['diff', '--name-only', `${base}...${head}`], {
    encoding: 'utf8',
    cwd,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  return raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

export function daysBetween(thenIso, now = new Date()) {
  const then = new Date(thenIso);
  if (Number.isNaN(then.getTime())) return 0;
  return Math.floor((now.getTime() - then.getTime()) / 86_400_000);
}

export function stripSqlComments(sql) {
  return String(sql)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/--[^\n]*/g, '');
}

// ── D9 AI quota ──────────────────────────────────────────────────────────────

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

export function parseQuotaHeuristics(aiQuotaSrc = '', aiControlSrc = '') {
  const plans = {};
  const fromComment = aiQuotaSrc.matchAll(/(\d+)\s*=\s*\d+\/mes[^\n]*\((EMPRENDEDOR|PYME)\)/gi);
  for (const hit of fromComment) plans[hit[2].toUpperCase()] = Number(hit[1]);
  if (/NEGOCIO_PLUS|ADMIN/i.test(aiQuotaSrc)) plans.NEGOCIO_PLUS = -1;
  const enter = aiQuotaSrc.match(/case\s+"ENTERPRISE"\s*->\s*(\d+)/);
  const pro = aiQuotaSrc.match(/case\s+"PRO"\s*->\s*(\d+)/);
  if (enter) plans.ENTERPRISE = Number(enter[1]);
  if (pro) plans.PRO = Number(pro[1]);
  const pct = aiControlSrc.match(/pct\s*>=\s*(\d+)/);
  const threshold = pct ? Number(pct[1]) / 100 : QUOTA_THRESHOLD;
  return { plans, threshold: Number.isFinite(threshold) ? threshold : QUOTA_THRESHOLD };
}

export function resolveTenantLimit(row, heuristics) {
  if (String(row.plan_saas || '').toUpperCase() === 'ADMIN') return -1;
  const max = Number(row.max_creditos_ai);
  if (Number.isFinite(max) && row.max_creditos_ai != null && row.max_creditos_ai !== '') return max;
  const plan = String(row.plan_nombre || row.plan_saas || '').toUpperCase();
  if (plan && heuristics.plans[plan] != null) return heuristics.plans[plan];
  return 0;
}

export function classifyUsageRow(row, heuristics) {
  const limite = resolveTenantLimit(row, heuristics);
  const llamadas = Number(row.llamadas || 0);
  const pct = limite > 0 ? llamadas / limite : 0;
  const over = limite > 0 && pct >= heuristics.threshold;
  return {
    id: row.id_empresa,
    nombre: row.nombre || row.nombre_comercial || `empresa-${row.id_empresa}`,
    plan: row.plan_nombre || row.plan_saas || '',
    llamadas,
    limite,
    pct,
    pctLabel: limite < 0 ? 'ilimitado' : `${Math.round(pct * 100)}%`,
    over,
    tokensEntrada: Number(row.tokens_entrada || 0),
    tokensSalida: Number(row.tokens_salida || 0),
  };
}

export function evaluateAiQuota({ rows = [], heuristics, secretsPresent }) {
  if (!secretsPresent) {
    return {
      skipped: true,
      reason: 'Sin secretos de DB (AI_USAGE_DATABASE_URL / DATABASE_URL / SUPABASE_BACKUP_URL). Skip honesto; no se inventan credenciales.',
      tenants: [],
      platformOver: false,
      shouldAlert: false,
      heuristics,
    };
  }
  const tenants = rows.map((row) => classifyUsageRow(row, heuristics));
  const finite = tenants.filter((item) => item.limite > 0);
  const used = finite.reduce((sum, item) => sum + item.llamadas, 0);
  const cap = finite.reduce((sum, item) => sum + item.limite, 0);
  const platformPct = cap > 0 ? used / cap : 0;
  const platformOver = cap > 0 && platformPct >= heuristics.threshold;
  const overTenants = tenants.filter((item) => item.over);
  return {
    skipped: false,
    reason: overTenants.length || platformOver
      ? `Cuota ≥ ${Math.round(heuristics.threshold * 100)}% (tenants=${overTenants.length}, plataforma=${Math.round(platformPct * 100)}%)`
      : `Nadie supera ${Math.round(heuristics.threshold * 100)}% (plataforma ${Math.round(platformPct * 100)}%).`,
    tenants,
    overTenants,
    platformPct,
    platformOver,
    shouldAlert: platformOver || overTenants.length > 0,
    heuristics,
  };
}

export const AI_USAGE_SELECT = `
SELECT
  e.id_empresa,
  COALESCE(e.nombre_comercial, e.nombre_empresa) AS nombre,
  e.plan_saas,
  COALESCE(pl.nombre, e.plan_saas) AS plan_nombre,
  pl.max_creditos_ai,
  COALESCE(u.llamadas, 0) AS llamadas,
  COALESCE(u.tokens_entrada, 0) AS tokens_entrada,
  COALESCE(u.tokens_salida, 0) AS tokens_salida
FROM hot_click_empresa_tb e
LEFT JOIN hot_click_plan_tb pl ON pl.id_plan = e.fk_id_plan
LEFT JOIN hot_click_ai_uso_tb u
       ON u.fk_id_empresa = e.id_empresa AND u.anio = $1 AND u.mes = $2
WHERE e.estado_empresa = 'ACTIVO'
`.trim();

// ── D10 hygiene ──────────────────────────────────────────────────────────────

export function parseDependabotTitle(title) {
  const match = String(title || '').match(
    /bump\s+(.+?)\s+from\s+v?(\d+\.\d+\.\d+\S*)\s+to\s+v?(\d+\.\d+\.\d+\S*)/i,
  );
  if (!match) return null;
  return { name: match[1].trim(), from: match[2], to: match[3] };
}

export function classifySemver(from, to) {
  const a = String(from).split('.').map(Number);
  const b = String(to).split('.').map(Number);
  if (b[0] !== a[0]) return 'major';
  if (b[1] !== a[1]) return 'minor';
  if (b[2] !== a[2]) return 'patch';
  return 'same';
}

export function hygieneLabelsForBump(bump) {
  if (bump === 'major') return ['deps-major'];
  if (bump === 'patch' || bump === 'minor') return ['deps-patch'];
  return [];
}

export function isCriticalWontMerge({ name, bump, to }) {
  const n = String(name || '');
  if (!CRITICAL_MAJOR_NAME.test(n)) return false;
  if (/spring-boot/i.test(n) && Number(String(to).split('.')[0]) >= 4) return true;
  return bump === 'major';
}

export function classifyHygienePr(pr, { now = new Date(), staleDays = DEFAULT_STALE_DAYS } = {}) {
  const title = pr.title || '';
  const labels = (pr.labels || []).map((item) => (typeof item === 'string' ? item : item.name));
  const parsed = parseDependabotTitle(title);
  const bump = parsed ? classifySemver(parsed.from, parsed.to) : null;
  const extra = hygieneLabelsForBump(bump);
  const stale = daysBetween(pr.updatedAt || pr.updated_at, now) >= staleDays;
  if (stale) extra.push('stale');
  const wontMerge = parsed ? isCriticalWontMerge({ name: parsed.name, bump, to: parsed.to }) : false;
  const unlabeledRisk = wontMerge
    && !labels.includes('needs-human')
    && !labels.includes('deps-major')
    && !labels.includes('spring-boot-major');
  return {
    number: pr.number,
    title,
    labels,
    bump,
    addLabels: extra.filter((name) => !labels.includes(name)),
    stale,
    wontMerge,
    unlabeledRisk,
    commentWontMerge: unlabeledRisk,
  };
}

export function evaluateEngAgentIssue(issue, {
  now = new Date(),
  staleDays = DEFAULT_STALE_DAYS,
  closeAfterDays = DEFAULT_CLOSE_AFTER_DAYS,
} = {}) {
  const labels = (issue.labels || []).map((item) => (typeof item === 'string' ? item : item.name));
  const isEng = labels.includes('eng-agent');
  const product = labels.some((name) => PRODUCT_ISSUE_LABELS.has(name));
  const age = daysBetween(issue.updatedAt || issue.updated_at || issue.createdAt, now);
  const body = String(issue.body || '');
  const pinged = body.includes(`<!-- ${D10_PING_MARKER} -->`);
  if (!isEng) {
    return { action: 'skip', reason: 'no es eng-agent' };
  }
  if (product) {
    return { action: 'skip', reason: 'label de producto/bug — no mass-close' };
  }
  if (age < staleDays) {
    return { action: 'ok', reason: `activo (${age}d)` };
  }
  if (!pinged) {
    return { action: 'comment', reason: `stale ${age}d — pedir acción antes de cerrar` };
  }
  if (age >= staleDays + closeAfterDays) {
    return { action: 'close', reason: `ya se pidió acción y sigue stale (${age}d)` };
  }
  return { action: 'wait', reason: 'ping enviado; aún no vence el plazo de cierre' };
}

// ── S5 design tokens ─────────────────────────────────────────────────────────

const HEX_RE = /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g;
const STYLE_RE = /style=\{\{/g;

export function collectTokenHexes(css) {
  const found = new Set();
  let hit;
  HEX_RE.lastIndex = 0;
  while ((hit = HEX_RE.exec(css))) found.add(hit[0].toLowerCase());
  return found;
}

export function superadminRanges(source) {
  const ranges = [];
  const re = /\.hc-superadmin-theme\b[^{]*\{/g;
  let hit;
  while ((hit = re.exec(source))) {
    const open = source.indexOf('{', hit.index);
    const close = matchingBrace(source, open);
    ranges.push([hit.index, close]);
  }
  return ranges;
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

export function inRanges(index, ranges) {
  return ranges.some(([a, b]) => index >= a && index <= b);
}

export function lineAt(source, index) {
  return source.slice(0, index).split(/\n/).length;
}

const LAYOUT_STYLE = /style=\{\{\s*(?:(?:display|gap|width|height|margin|padding|flex|alignItems|justifyContent|cursor|overflow|position|top|left|right|bottom|zIndex|maxWidth|minHeight|flexShrink|lineHeight|fontSize|transition|borderRadius)\s*:)/;

export function scanDesignDrift(relPath, source, tokenHexes) {
  const findings = [];
  if (relPath.replaceAll('\\', '/').endsWith('hotclick-tokens.css')) return findings;
  const ranges = superadminRanges(source);
  HEX_RE.lastIndex = 0;
  let hit;
  while ((hit = HEX_RE.exec(source))) {
    if (inRanges(hit.index, ranges)) continue;
    const hex = hit[0].toLowerCase();
    const line = lineAt(source, hit.index);
    findings.push({
      kind: tokenHexes.has(hex) ? 'hex-token' : 'hex',
      path: relPath,
      line,
      snippet: hit[0],
      hint: tokenHexes.has(hex)
        ? 'Hex canónico: preferí var(--hc-*) en vez de repetir el literal.'
        : 'Hex fuera de hotclick-tokens.css / .hc-superadmin-theme.',
    });
  }
  STYLE_RE.lastIndex = 0;
  while ((hit = STYLE_RE.exec(source))) {
    if (inRanges(hit.index, ranges)) continue;
    const slice = source.slice(hit.index, hit.index + 180);
    const hasHex = /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/.test(slice);
    if (/var\(--hc-/.test(slice) && !hasHex) continue;
    if (LAYOUT_STYLE.test(slice) && !hasHex && !/rgb\(|hsl\(/.test(slice)) continue;
    findings.push({
      kind: 'inline-style',
      path: relPath,
      line: lineAt(source, hit.index),
      snippet: slice.replace(/\s+/g, ' ').slice(0, 80),
      hint: 'style={{ con color/hex — mover a token o className hc-*.',
    });
  }
  return findings;
}

export function summarizeDesignDrift(findings, { max = 40 } = {}) {
  const high = findings.filter((item) => item.kind === 'hex' || item.kind === 'inline-style');
  const tokenish = findings.filter((item) => item.kind === 'hex-token');
  return {
    total: findings.length,
    high: high.length,
    tokenish: tokenish.length,
    sample: [...high, ...tokenish].slice(0, max),
    shouldIssue: high.length > 0,
  };
}

export function designCodemodHint() {
  return [
    'Codemod sugerido (no auto-aplicar en masa):',
    '- Reemplazar hex que ya están en `hotclick-tokens.css` por `var(--hc-red-500)` / `var(--hc-blue-600)` / `var(--hc-n-*)`.',
    '- Dejar `.hc-superadmin-theme` (Super Admin) como excepción documentada.',
    '- No reescribir `style={{` de layout (gap/display) ni abrir un PR gigante.',
  ].join('\n');
}

// ── S7 Ley 8968 ──────────────────────────────────────────────────────────────

export const LEY8968_CHECKS = [
  {
    id: 'privacidad-route',
    title: 'Ruta /privacidad',
    files: ['Hot_click_outlet/frontend/src/app/AppRoutes.tsx'],
    re: /path=["']\/privacidad["']/,
  },
  {
    id: 'checkout-consent',
    title: 'Checkbox consentimiento checkout',
    files: [
      'Hot_click_outlet/frontend/src/pages/checkout/CheckoutSummary.tsx',
      'Hot_click_outlet/frontend/src/pages/checkout/ejecutarPagarCheckout.ts',
    ],
    re: /type=["']checkbox["']|registrarConsentimiento\(\s*['"]CHECKOUT['"]/,
  },
  {
    id: 'seller-consent',
    title: 'Consentimiento registro vendedor',
    files: [
      'Hot_click_outlet/frontend/src/pages/registrar-negocio/AcuerdoYSubmit.tsx',
      'Hot_click_outlet/frontend/src/pages/registrar-negocio/RegistrarNegocioPage.tsx',
    ],
    re: /type=["']checkbox["']|VENDEDOR|Ley N\.° 8968/,
  },
  {
    id: 'ip-audit',
    title: 'Bitácora IP /api/consentimiento',
    files: [
      'Hot_click_outlet/src/main/java/com/hotclick/controller/ConsentimientoController.java',
      'Hot_click_outlet/src/main/resources/db/migration/V56__consentimiento_log.sql',
    ],
    re: /\/api\/consentimiento|obtenerIp|ip_address|X-Forwarded-For/,
  },
  {
    id: 'arco',
    title: 'ARCO en privacidad FE',
    files: ['Hot_click_outlet/frontend/src/pages/PrivacidadPage.tsx'],
    re: /arco|ARCO|derechos ARCO/i,
  },
];

export function runLey8968Check(readFile = readRepo) {
  const results = LEY8968_CHECKS.map((check) => {
    const blobs = check.files.map((file) => ({ file, text: readFile(file) }));
    const combined = blobs.map((item) => item.text).join('\n');
    const present = check.re.test(combined) && blobs.some((item) => item.text);
    return {
      id: check.id,
      title: check.title,
      present,
      files: check.files,
    };
  });
  const missing = results.filter((item) => !item.present);
  return {
    results,
    missing,
    ok: missing.length === 0,
  };
}

// ── E12 seller QA remap ──────────────────────────────────────────────────────

export function isSellerTouchPath(filePath) {
  const p = String(filePath || '').replaceAll('\\', '/');
  if (p.includes('frontend/src/prototipo/')) return true;
  if (/seller-wizard|FormularioPorPasos/.test(p)) return true;
  if (/planPaths\.ts$|PlanPathGate|FigmaSellerGate|SellerRoutes|EmprendedorRoutes|PymeRoutes|NegocioPlusRoutes/.test(p)) {
    return true;
  }
  if (/\/(emprendedor|pyme|negocio-plus)\//.test(p) && p.includes('frontend/')) return true;
  return false;
}

export function expectedSellerRouteNeedles() {
  return {
    prefixes: SELLER_PREFIXES,
    nestedEmprendedor: '/emprendedor/opciones',
    marketplace: '/productos',
    posAdmin: '/admin/pos',
  };
}

export function scanSellerRouteMap({ appRoutes = '', planPaths = '' }) {
  const broken = [];
  for (const prefix of SELLER_PREFIXES) {
    const needle = `path="${prefix}/*"`;
    if (!appRoutes.includes(needle) && !appRoutes.includes(`path='${prefix}/*'`)) {
      broken.push(`AppRoutes no declara ${prefix}/*`);
    }
  }
  if (!planPaths.includes("'/emprendedor'") && !planPaths.includes('"/emprendedor"')) {
    broken.push('planPaths perdió RUTA_EMPRENDEDOR');
  }
  if (!planPaths.includes('opciones')) {
    broken.push('planPaths no anida Emprendedor en opciones/*');
  }
  if (!planPaths.includes('/admin/pos')) {
    broken.push('planPaths no deja POS seller en /admin/pos');
  }
  return { ok: broken.length === 0, broken };
}

export function mapSellerSpecs(changedFiles) {
  const files = (changedFiles || []).map((f) => f.replaceAll('\\', '/'));
  const specs = new Set();
  const touchedSeller = files.some(isSellerTouchPath);
  if (!touchedSeller) return { applicable: false, specs: [], dryRun: true };
  for (const file of files) {
    if (/emprendedor/.test(file)) {
      specs.add('tests/emprendedor-wizard.spec.ts');
      specs.add('tests/emprendedor-sidebar.spec.ts');
    }
    if (/pyme|negocio-plus/.test(file)) {
      specs.add('tests/seller-wizard.spec.ts');
      specs.add('tests/seller-sidebar.spec.ts');
    }
    if (/wizard|FormularioPorPasos|producto/i.test(file)) {
      specs.add('tests/seller-wizard.spec.ts');
      specs.add('tests/seller-wizard-errors.spec.ts');
    }
    if (/sidebar|shell/i.test(file)) {
      specs.add('tests/seller-sidebar.spec.ts');
      specs.add('tests/emprendedor-sidebar.spec.ts');
    }
    if (/planPaths|remap|AdminRoleSwitch/i.test(file)) {
      specs.add('tests/seller-wizard-remap.spec.ts');
    }
    if (/sucursal/i.test(file)) {
      specs.add('tests/seller-qa-escape-remap.spec.ts');
    }
  }
  if (specs.size === 0) {
    for (const spec of SELLER_SPECS) specs.add(spec);
  }
  return { applicable: true, specs: [...specs], dryRun: true };
}

export function evaluateSellerQa({ changedFiles, appRoutes, planPaths, smoke = false }) {
  const map = mapSellerSpecs(changedFiles);
  if (!map.applicable) {
    return { applicable: false, ok: true, reason: 'PR no toca prototipo/seller wizard', specs: [] };
  }
  const routes = scanSellerRouteMap({ appRoutes, planPaths });
  return {
    applicable: true,
    ok: routes.ok,
    reason: routes.ok
      ? `Mapa de rutas seller OK. Specs: ${map.specs.join(', ')}${smoke ? ' (smoke)' : ' (dry-run)'}`
      : `Mapa de rutas roto: ${routes.broken.join('; ')}`,
    specs: map.specs,
    broken: routes.broken,
    dryRun: !smoke,
  };
}

// ── E14 hotfix ───────────────────────────────────────────────────────────────

export function isHotfixRef(ref) {
  return String(ref || '').startsWith('hotfix/');
}

export function parseLinkedIssueNumbers(body) {
  const text = String(body || '');
  const found = new Set();
  const re = /(?:fixes|closes|resolves|related(?:\s+to)?|hotfix\s+for)\s+#(\d+)|(?:^|\s)#(\d+)/gi;
  let hit;
  while ((hit = re.exec(text))) {
    const n = Number(hit[1] || hit[2]);
    if (Number.isFinite(n) && n > 0) found.add(n);
  }
  return [...found];
}

export function issueMentionsOutage(issue) {
  const labels = (issue.labels || []).map((item) => (typeof item === 'string' ? item : item.name));
  if (labels.includes('outage') || labels.includes('prod-errors')) return true;
  const blob = `${issue.title || ''} ${issue.body || ''}`;
  return /outage|prod-errors|producción caid|prod down|incidente prod/i.test(blob);
}

export function evaluateHotfixGate({
  isHotfix,
  skip = false,
  prLabels = [],
  prBody = '',
  linkedIssues = [],
  gitleaks = 'success',
}) {
  if (!isHotfix) {
    return { ok: true, skipped: true, reason: 'No es hotfix/* — PASS no-op (no rompe auto-merge de ci.yml).' };
  }
  if (skip) {
    return { ok: true, skipped: true, reason: `Label ${SKIP_LABELS.hotfix} presente` };
  }
  const labels = Array.isArray(prLabels) ? prLabels : String(prLabels).split(',').map((s) => s.trim()).filter(Boolean);
  const prHasOutageLabel = labels.includes('outage') || labels.includes('prod-errors');
  const linkedOk = linkedIssues.some(issueMentionsOutage) || prHasOutageLabel;
  const gitleaksOk = String(gitleaks).toLowerCase() === 'success';
  const missing = [];
  if (!linkedOk) missing.push('Issue ligado con outage/prod-errors (o label en el PR)');
  if (!gitleaksOk) missing.push('gitleaks no está verde');
  const blockAutoMerge = missing.length > 0;
  return {
    ok: missing.length === 0,
    skipped: false,
    linkedNumbers: parseLinkedIssueNumbers(prBody),
    blockAutoMerge,
    removeAutoMergeLabels: blockAutoMerge,
    reason: missing.length
      ? `E14 FAIL — ${missing.join('; ')}`
      : 'E14 PASS — Issue/label de outage + gitleaks verde.',
  };
}

// ── E18 PgBouncer migrations ─────────────────────────────────────────────────

export function isMigrationPath(filePath) {
  return /\/db\/migration\/V\d+__.+\.sql$/i.test(String(filePath || '').replaceAll('\\', '/'));
}

export function lineIsSessionSet(line) {
  const t = stripSqlComments(line).trim();
  if (!t) return false;
  if (/\b(update|insert)\b/i.test(t) && /\bset\b/i.test(t)) return false;
  if (/\bset\s+(not\s+null|default|storage|statistics|tablespace)\b/i.test(t)) return false;
  if (/\balter\s+column\b/i.test(t) && /\bset\b/i.test(t)) return false;
  if (/\bset\s+search_path\b/i.test(t)) return true;
  if (/^\s*set\s+(session|local)\b/i.test(t)) return true;
  if (/^\s*set\s+[a-z_][a-z0-9_.]*\s*=/i.test(t)) return true;
  if (/\bset_config\s*\(/i.test(t)) return true;
  return false;
}

export function scanMigrationSql(relPath, sql) {
  const findings = [];
  const lines = String(sql).split(/\n/);
  /** UPDATE/INSERT multi-línea: `SET col =` no es SET de sesión PgBouncer. */
  let inDmlSet = false;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const n = i + 1;
    const t = stripSqlComments(line);
    if (/\b(update|insert)\b/i.test(t)) inDmlSet = true;
    const push = (id, title, severity = 'fail') => {
      findings.push({
        id, title, severity, path: relPath, line: n, snippet: line.trim().slice(0, 160),
      });
    };
    if (/pg_advisory_(?:xact_)?lock\s*\(/i.test(t)) {
      push('pg_advisory', 'pg_advisory_lock no funciona con PgBouncer transaction mode');
    }
    if (lineIsSessionSet(line) && !inDmlSet) {
      push('set', 'SET/set_config de sesión se pierde al devolver la conexión al pool');
    }
    if (/;/.test(t)) inDmlSet = false;
    if (/\bLISTEN\s+\w+/i.test(t)) {
      push('listen', 'LISTEN requiere sesión persistente (PgBouncer transaction mode)');
    }
    if (/\bNOTIFY\s+\w+/i.test(t)) {
      push('notify', 'NOTIFY requiere sesión persistente (PgBouncer transaction mode)');
    }
    if (/\bPREPARE\s+(?!TRANSACTION)\S+\s+AS\b/i.test(t) || /^\s*PREPARE\s+(?!TRANSACTION)/i.test(t)) {
      push('prepare', 'PREPARE persistente se pierde entre transacciones (PgBouncer)');
    }
    if (/\bCREATE\s+TABLE\b/i.test(t) && !/\bIF\s+NOT\s+EXISTS\b/i.test(t)) {
      push('if-not-exists', 'Recordatorio: CREATE TABLE IF NOT EXISTS (migraciones idempotentes)', 'warn');
    }
    if (/\bADD\s+COLUMN\b/i.test(t) && !/\bIF\s+NOT\s+EXISTS\b/i.test(t)) {
      push('if-not-exists', 'Recordatorio: ADD COLUMN IF NOT EXISTS', 'warn');
    }
    if (/\bCREATE\s+(?:UNIQUE\s+)?INDEX\b/i.test(t) && !/\bIF\s+NOT\s+EXISTS\b/i.test(t)) {
      push('if-not-exists', 'Recordatorio: CREATE INDEX IF NOT EXISTS', 'warn');
    }
  }
  return findings;
}

export function evaluatePgbouncerMigration({ findings, skip = false }) {
  if (skip) {
    return { ok: true, skipped: true, failCount: 0, reason: `Label ${SKIP_LABELS.pgbouncer} presente` };
  }
  const fails = findings.filter((item) => item.severity === 'fail');
  const warns = findings.filter((item) => item.severity === 'warn');
  return {
    ok: fails.length === 0,
    skipped: false,
    failCount: fails.length,
    warnCount: warns.length,
    reason: fails.length
      ? `${fails.length} anti-patrón(es) PgBouncer en V*.sql`
      : warns.length
        ? `PASS con recordatorios IF NOT EXISTS (${warns.length})`
        : 'PASS — migraciones sin SET/LISTEN/pg_advisory/PREPARE de sesión',
  };
}

export function frontendScanPred(abs, name) {
  if (abs.includes(`${sep}node_modules${sep}`)) return false;
  return /\.(css|ts|tsx|js|jsx)$/.test(name);
}

export function fileSizeOk(abs, maxBytes = 400_000) {
  try {
    return statSync(abs).size <= maxBytes;
  } catch {
    return false;
  }
}
