import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  classifyHygienePr,
  classifyUsageRow,
  collectTokenHexes,
  dbSecretsPresent,
  evaluateAiQuota,
  evaluateHotfixGate,
  evaluatePgbouncerMigration,
  evaluateSellerQa,
  expectedSellerRouteNeedles,
  hygieneLabelsForBump,
  isCriticalWontMerge,
  isHotfixRef,
  isMigrationPath,
  isSellerTouchPath,
  lineIsSessionSet,
  mapSellerSpecs,
  parseLinkedIssueNumbers,
  parseQuotaHeuristics,
  runLey8968Check,
  scanDesignDrift,
  scanMigrationSql,
  scanSellerRouteMap,
  summarizeDesignDrift,
} from './ola5-lib.mjs';
import { evaluateEngAgentIssue as evalIssue } from './ola5-lib.mjs';
import { runHygiene } from './issues-hygiene.mjs';
import { runLey8968 } from './ley8968-checklist.mjs';
import { runDesignTokens } from './design-tokens-drift.mjs';
import { runSellerQaRemap, buildSellerComment } from './seller-qa-remap.mjs';
import { runHotfixGate } from './hotfix-gate.mjs';
import { runPgbouncerMigration } from './pgbouncer-migration.mjs';
import { runAiQuotaAlert, parsePsqlTuples as parseAlertRows } from './ai-quota-alert.mjs';
import { readFileSync } from 'node:fs';
import { D10_PING_MARKER, QUOTA_THRESHOLD, REPO_ROOT } from './ola5-lib.mjs';

describe('D9 AI quota', () => {
  const heuristics = parseQuotaHeuristics(
    `10 = 10/mes (EMPRENDEDOR)\n80 = 80/mes (PYME)\nNEGOCIO_PLUS / ADMIN\ncase "ENTERPRISE" -> 500\ncase "PRO" -> 50`,
    'if (limite > 0 && pct >= 80 && pct < 100)',
  );

  it('parsea umbral 80% y planes desde código (sin credenciales)', () => {
    assert.equal(heuristics.threshold, 0.8);
    assert.equal(heuristics.plans.EMPRENDEDOR, 10);
    assert.equal(heuristics.plans.PYME, 80);
    assert.equal(heuristics.plans.ENTERPRISE, 500);
    assert.equal(QUOTA_THRESHOLD, 0.8);
  });

  it('skip honesto sin secretos de DB aunque pasen filas', () => {
    const verdict = evaluateAiQuota({
      secretsPresent: false,
      heuristics,
      rows: [{ id_empresa: 1, llamadas: 9, max_creditos_ai: 10, plan_saas: 'PYME' }],
    });
    assert.equal(verdict.skipped, true);
    assert.equal(verdict.shouldAlert, false);
    assert.match(verdict.reason, /no se inventan credenciales/i);
  });

  it('alerta tenant ≥80% y plataforma por suma de límites', () => {
    const pyme = classifyUsageRow({
      id_empresa: 2, nombre: 'Cafe', plan_saas: 'PYME', max_creditos_ai: 80, llamadas: 64,
    }, heuristics);
    assert.equal(pyme.over, true);
    const verdict = evaluateAiQuota({
      secretsPresent: true,
      heuristics,
      rows: [
        { id_empresa: 2, nombre: 'Cafe', plan_saas: 'PYME', max_creditos_ai: 80, llamadas: 64 },
        { id_empresa: 3, nombre: 'AdminCo', plan_saas: 'ADMIN', max_creditos_ai: -1, llamadas: 999 },
      ],
    });
    assert.equal(verdict.shouldAlert, true);
    assert.equal(verdict.overTenants.length, 1);
    assert.equal(verdict.skipped, false);
  });

  it('ADMIN ilimitado no cuenta como over', () => {
    const row = classifyUsageRow({
      id_empresa: 9, plan_saas: 'ADMIN', llamadas: 500, max_creditos_ai: 10,
    }, heuristics);
    assert.equal(row.over, false);
    assert.equal(row.pctLabel, 'ilimitado');
  });

  it('parsea tuples psql sin secretos', () => {
    const rows = parseAlertRows('1|Tienda|PYME|PYME|80|70|10|20\n');
    assert.equal(rows[0].id_empresa, '1');
    assert.equal(rows[0].llamadas, '70');
  });

  it('runAiQuotaAlert no abre alerta si query inyectada viene vacía', async () => {
    const env = { AI_USAGE_DATABASE_URL: 'postgresql://local/testdb' };
    const verdict = await runAiQuotaAlert({
      env,
      query: () => ({ ok: true, rows: [], error: '' }),
    });
    assert.equal(verdict.shouldAlert, false);
    assert.equal(verdict.skipped, false);
  });

  it('runAiQuotaAlert skip si psql falla (no inventa filas)', async () => {
    const env = { DATABASE_URL: 'postgresql://local/testdb' };
    const verdict = await runAiQuotaAlert({
      env,
      query: () => ({ ok: false, rows: [], error: 'connection refused' }),
    });
    assert.equal(verdict.skipped, true);
    assert.equal(verdict.shouldAlert, false);
  });

  it('dbSecretsPresent no usa placeholders inventados', () => {
    assert.equal(dbSecretsPresent({}), false);
    assert.equal(dbSecretsPresent({ SUPABASE_BACKUP_URL: 'postgresql://x' }), true);
  });
});

describe('D10 hygiene', () => {
  it('labels deps-major / deps-patch / stale y riesgo unlabeled', () => {
    assert.deepEqual(hygieneLabelsForBump('major'), ['deps-major']);
    assert.deepEqual(hygieneLabelsForBump('patch'), ['deps-patch']);
    const pr = classifyHygienePr({
      number: 3,
      title: 'Bump spring-boot-starter-parent from 3.4.4 to 4.0.0',
      labels: [],
      updatedAt: '2026-01-01T00:00:00Z',
    }, { now: new Date('2026-02-01T00:00:00Z'), staleDays: 14 });
    assert.equal(pr.wontMerge, true);
    assert.equal(pr.commentWontMerge, true);
    assert.ok(pr.addLabels.includes('deps-major'));
    assert.ok(pr.addLabels.includes('stale'));
    assert.equal(isCriticalWontMerge({ name: 'jjwt-api', bump: 'major', to: '1.0.0' }), true);
    assert.equal(isCriticalWontMerge({ name: 'axios', bump: 'major', to: '2.0.0' }), false);
  });

  it('no cierra bugs de producto; comenta eng-agent stale primero', () => {
    const bug = evalIssue({
      labels: ['eng-agent', 'bug'],
      updatedAt: '2020-01-01',
      body: '',
    }, { now: new Date('2026-01-01') });
    assert.equal(bug.action, 'skip');
    const stale = evalIssue({
      labels: ['eng-agent'],
      updatedAt: '2020-01-01',
      body: 'hola',
    }, { now: new Date('2026-01-01') });
    assert.equal(stale.action, 'comment');
    const pinged = evalIssue({
      labels: ['eng-agent'],
      updatedAt: '2020-01-01',
      body: `x <!-- ${D10_PING_MARKER} -->`,
    }, { now: new Date('2026-01-01'), staleDays: 14, closeAfterDays: 7 });
    assert.equal(pinged.action, 'close');
  });

  it('runHygiene inyectado no llama red y no mass-close', () => {
    const labeled = [];
    const closed = [];
    const commented = [];
    const out = runHygiene({
      env: {},
      now: new Date('2026-09-01'),
      listPrs: () => [{
        number: 11,
        title: 'Bump stripe-java from 28.0.0 to 29.0.0',
        labels: ['dependabot'],
        updatedAt: '2026-08-31T00:00:00Z',
      }],
      listIssues: () => [{
        number: 22,
        title: 'producto real',
        labels: ['bug'],
        updatedAt: '2020-01-01',
        body: '',
      }, {
        number: 23,
        title: 'eng stale',
        labels: ['eng-agent'],
        updatedAt: '2020-01-01',
        body: '',
      }],
      labelPr: (n, labs) => labeled.push({ n, labs }),
      commentPr: (n) => commented.push(n),
      pingIssue: (n) => commented.push(n),
      close: (n) => closed.push(n),
    });
    assert.equal(closed.length, 0);
    assert.ok(commented.includes(23));
    assert.ok(labeled[0].labs.includes('deps-major'));
    assert.ok(out.prs[0].commentWontMerge);
  });
});

describe('S5 design tokens', () => {
  const tokens = collectTokenHexes(':root { --hc-red-500: #E73B33; --hc-n-0: #FFFFFF; }');

  it('ignora hex en tokens y .hc-superadmin-theme', () => {
    const css = `
.hc-superadmin-theme { color: #E31E24; }
.foo { color: #123456; }
.bar { color: #E73B33; }
`;
    const findings = scanDesignDrift('src/pages/Foo.tsx', css, tokens);
    const kinds = findings.map((f) => f.kind);
    assert.ok(kinds.includes('hex'));
    assert.ok(!findings.some((f) => f.snippet === '#E31E24'));
    assert.ok(findings.some((f) => f.kind === 'hex-token' && f.snippet.toLowerCase() === '#e73b33'));
    const summary = summarizeDesignDrift(findings);
    assert.equal(summary.shouldIssue, true);
  });

  it('no marca style={{ solo con var(--hc-*)', () => {
    const src = '<div style={{ color: "var(--hc-accent)", border: "1px solid var(--hc-border)" }} />';
    const findings = scanDesignDrift('src/x.tsx', src, tokens);
    assert.equal(findings.filter((f) => f.kind === 'inline-style').length, 0);
  });

  it('runDesignTokens con scan inyectado no toca prod', () => {
    const summary = runDesignTokens({
      env: {},
      scan: () => ({ total: 0, high: 0, tokenish: 0, sample: [], shouldIssue: false }),
    });
    assert.equal(summary.shouldIssue, false);
  });
});

describe('S7 Ley 8968', () => {
  it('falla si falta /privacidad o checkbox', () => {
    const report = runLey8968Check(() => '');
    assert.equal(report.ok, false);
    assert.ok(report.missing.some((m) => m.id === 'privacidad-route'));
    assert.ok(report.missing.some((m) => m.id === 'checkout-consent'));
  });

  it('pasa con blobs mínimos de ruta + consentimiento + IP + ARCO', () => {
    const files = {
      'Hot_click_outlet/frontend/src/app/AppRoutes.tsx': '<Route path="/privacidad" element={<PrivacidadPage />} />',
      'Hot_click_outlet/frontend/src/pages/checkout/CheckoutSummary.tsx': '<input type="checkbox" checked={aceptaDatos} />',
      'Hot_click_outlet/frontend/src/pages/checkout/ejecutarPagarCheckout.ts': "registrarConsentimiento('CHECKOUT')",
      'Hot_click_outlet/frontend/src/pages/registrar-negocio/AcuerdoYSubmit.tsx': '<input type="checkbox" /> Ley N.° 8968',
      'Hot_click_outlet/src/main/java/com/hotclick/controller/ConsentimientoController.java':
        '@RequestMapping("/api/consentimiento") obtenerIp X-Forwarded-For ip_address',
      'Hot_click_outlet/src/main/resources/db/migration/V56__consentimiento_log.sql': 'ip_address',
      'Hot_click_outlet/frontend/src/pages/PrivacidadPage.tsx': 'id: "arco" derechos ARCO',
    };
    const report = runLey8968Check((f) => files[f] || '');
    assert.equal(report.ok, true);
  });

  it('runLey8968 skip por env', () => {
    const out = runLey8968({ env: { SKIP_LEY8968: '1' }, check: () => ({ ok: false, missing: [{}], results: [] }) });
    assert.equal(out.skipped, true);
  });
});

describe('E12 seller QA remap', () => {
  const appRoutes = `
      <Route path="/emprendedor/*" element={<EmprendedorArea />} />
      <Route path="/pyme/*" element={<PymeArea />} />
      <Route path="/negocio-plus/*" element={<NegocioPlusArea />} />
      <Route path="/productos" element={<ProductsPage />} />
  `;
  const planPaths = `
export const RUTA_EMPRENDEDOR = '/emprendedor'
return limpio ? \`opciones/\${limpio}\` : 'opciones'
pathname.startsWith('/admin/pos')
`;

  it('detecta paths prototipo y arma specs dry-run', () => {
    assert.equal(isSellerTouchPath('Hot_click_outlet/frontend/src/prototipo/pyme/Foo.tsx'), true);
    assert.equal(isSellerTouchPath('Hot_click_outlet/frontend/src/pages/HomePage.tsx'), false);
    const mapped = mapSellerSpecs([
      'Hot_click_outlet/frontend/src/prototipo/emprendedor/pages/ProductosPage.tsx',
    ]);
    assert.equal(mapped.applicable, true);
    assert.ok(mapped.specs.some((s) => s.includes('emprendedor')));
    assert.deepEqual(expectedSellerRouteNeedles().prefixes, ['/emprendedor', '/pyme', '/negocio-plus']);
  });

  it('rompe si AppRoutes pierde un prefijo seller', () => {
    const broken = scanSellerRouteMap({ appRoutes: '<Route path="/pyme/*" />', planPaths });
    assert.equal(broken.ok, false);
    const ok = evaluateSellerQa({
      changedFiles: ['Hot_click_outlet/frontend/src/prototipo/pyme/x.tsx'],
      appRoutes,
      planPaths,
      smoke: false,
    });
    assert.equal(ok.ok, true);
    assert.match(ok.reason, /dry-run/);
    const comment = buildSellerComment(ok);
    assert.match(comment, /Seller QA remap/);
    assert.match(comment, /dry-run/);
  });

  it('runSellerQaRemap no-op si el diff no es seller', () => {
    const out = runSellerQaRemap({
      env: { BASE_SHA: 'a', HEAD_SHA: 'b' },
      changed: ['docs/README.md'],
    });
    assert.equal(out.ok, true);
    assert.equal(out.applicable, false);
  });
});

describe('E14 hotfix gate', () => {
  it('no-op fuera de hotfix para no romper auto-merge', () => {
    const v = evaluateHotfixGate({ isHotfix: false, gitleaks: 'failure' });
    assert.equal(v.ok, true);
    assert.equal(v.skipped, true);
    assert.equal(isHotfixRef('hotfix/prod-500'), true);
    assert.equal(isHotfixRef('feature/x'), false);
  });

  it('exige issue outage o label y gitleaks verde', () => {
    const fail = evaluateHotfixGate({
      isHotfix: true,
      prBody: 'Fixes #10',
      linkedIssues: [{ number: 10, title: 'typo docs', labels: [] }],
      gitleaks: 'success',
    });
    assert.equal(fail.ok, false);
    assert.equal(fail.blockAutoMerge, true);
    const pass = evaluateHotfixGate({
      isHotfix: true,
      prLabels: ['outage'],
      prBody: '',
      linkedIssues: [],
      gitleaks: 'success',
    });
    assert.equal(pass.ok, true);
    const leaks = evaluateHotfixGate({
      isHotfix: true,
      prLabels: ['prod-errors'],
      gitleaks: 'failure',
    });
    assert.equal(leaks.ok, false);
    assert.deepEqual(parseLinkedIssueNumbers('Fixes #42 and related to #7'), [42, 7]);
  });

  it('runHotfixGate no-op sin head hotfix', () => {
    const v = runHotfixGate({ env: { PR_HEAD_REF: 'cursor/foo' } });
    assert.equal(v.ok, true);
  });
});

describe('E18 PgBouncer migrations', () => {
  it('falla advisory/SET/LISTEN/PREPARE; UPDATE SET y SET NOT NULL no', () => {
    assert.equal(isMigrationPath('Hot_click_outlet/src/main/resources/db/migration/V200__x.sql'), true);
    assert.equal(isMigrationPath('Hot_click_outlet/Actualizado.sql'), false);
    assert.equal(lineIsSessionSet('SET app.tenant_id = 1'), true);
    assert.equal(lineIsSessionSet('UPDATE t SET n = n + 1'), false);
    assert.equal(lineIsSessionSet('ALTER COLUMN foo SET NOT NULL'), false);
    const sql = `
CREATE TABLE hot_click_x_tb (id int);
SELECT pg_advisory_lock(1);
SET search_path TO public;
LISTEN foo;
NOTIFY foo;
PREPARE fooplan AS SELECT 1;
ALTER TABLE hot_click_x_tb ADD COLUMN bar int;
`;
    const hits = scanMigrationSql('db/migration/V9__x.sql', sql);
    const ids = new Set(hits.map((h) => h.id));
    assert.ok(ids.has('pg_advisory'));
    assert.ok(ids.has('set'));
    assert.ok(ids.has('listen'));
    assert.ok(ids.has('notify'));
    assert.ok(ids.has('prepare'));
    assert.ok(ids.has('if-not-exists'));
    const verdict = evaluatePgbouncerMigration({ findings: hits });
    assert.equal(verdict.ok, false);
    assert.ok(hits.some((h) => h.line >= 1));
  });

  it('IF NOT EXISTS idempotente pasa (solo warns ausentes)', () => {
    const sql = 'CREATE TABLE IF NOT EXISTS hot_click_ok_tb (id int);\nCREATE INDEX IF NOT EXISTS idx_ok ON hot_click_ok_tb (id);';
    const hits = scanMigrationSql('db/migration/V10__ok.sql', sql);
    const verdict = evaluatePgbouncerMigration({ findings: hits });
    assert.equal(verdict.ok, true);
    assert.equal(verdict.failCount, 0);
  });

  it('runPgbouncerMigration PASS sin V*.sql', () => {
    const out = runPgbouncerMigration({
      env: { BASE_SHA: 'a', HEAD_SHA: 'b' },
      changed: ['README.md'],
    });
    assert.equal(out.ok, true);
  });

  it('runPgbouncerMigration comenta file:line en memoria', () => {
    const rel = 'Hot_click_outlet/src/main/resources/db/migration/V1__bad.sql';
    const out = runPgbouncerMigration({
      env: { BASE_SHA: 'a', HEAD_SHA: 'b', PR_LABELS: '' },
      changed: [rel],
      readFile: () => 'SELECT pg_advisory_lock(1);\n',
    });
    assert.equal(out.ok, false);
    assert.equal(out.findings[0].line, 1);
    assert.equal(out.findings[0].path, rel);
  });
});

describe('gitleaks PR range (no other-branch history)', () => {
  it('el script acota pull_request a base..head + dir HEAD', () => {
    const sh = readFileSync(`${REPO_ROOT}/scripts/eng-gates/gitleaks-scan.sh`, 'utf8');
    assert.match(sh, /log-opts="\$\{base\}\.\.\$\{head\}"/);
    assert.match(sh, /gitleaks dir|dir "\$\{COMMON/);
    assert.doesNotMatch(sh, /detect --source/);
    const sec = readFileSync(`${REPO_ROOT}/.github/workflows/security.yml`, 'utf8');
    assert.match(sec, /gitleaks-scan\.sh/);
    assert.doesNotMatch(sec, /gitleaks detect --source/);
  });
});

