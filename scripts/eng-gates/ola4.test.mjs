import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  extractControllerRoutes,
  extractFrontendApiPaths,
  findFlakySpecs,
  flattenJsonKeys,
  isPathIdRoute,
  namespaceOf,
  normalizeClientPath,
  parseFailedSpecs,
  redactFindingValue,
  routeMatches,
  scanDocSecrets,
  selectPlaywrightSpecs,
} from './ola4-lib.mjs';
import { buildIssueBody as buildFlakeBody, inferPassesFromSiblings, runFlakeHunter } from './flake-hunter.mjs';
import { buildIssueBody as buildI18nBody, diffI18nKeys, groupByNamespace, runI18nDrift } from './i18n-drift.mjs';
import { buildIssueBody as buildSecretsBody, isDocNarrative as isDoc, runSecretsDocs } from './secrets-in-docs.mjs';
import { buildIssueBody as buildApiBody, findLikely404s, runApiDrift } from './api-contract-drift.mjs';
import {
  buildStubJava,
  coverageFor,
  findUncovered,
  runIdorGap,
} from './idor-suite-gap.mjs';
import { buildPrComment, runPlaywrightArea } from './playwright-area.mjs';

describe('ola4-lib parsers', () => {
  it('aplana keys i18n y namespace', () => {
    const keys = flattenJsonKeys({ home: { title: 'H', cta: 'C' }, checkout: { pay: 'P' } });
    assert.deepEqual(keys.sort(), ['checkout.pay', 'home.cta', 'home.title']);
    assert.equal(namespaceOf('checkout.pay'), 'checkout');
  });

  it('parsea mappings Java con class prefix y path-id', () => {
    const src = `
@RequestMapping("/api/bodegas")
class BodegaController {
  @GetMapping
  List all() { return null; }
  @GetMapping("/{id}")
  Bodega get() { return null; }
  @PutMapping("/{id}")
  void upd() {}
}
`;
    const routes = extractControllerRoutes(src, 'BodegaController.java');
    assert.ok(routes.some((r) => r.method === 'GET' && r.path === '/api/bodegas'));
    assert.ok(routes.some((r) => r.path === '/api/bodegas/{id}' && r.pathId));
    assert.equal(isPathIdRoute('/api/pos/caja/{id}/cerrar'), true);
    assert.equal(isPathIdRoute('/api/pos/historial'), false);
  });

  it('extrae calls axios del frontend y normaliza ${id}', () => {
    const src = `
import api from './api'
export const posService = {
  cerrarCaja: (id) => api.put(\`/pos/caja/\${id}/cerrar\`, dto),
  login: () => api.post('/auth/login', body),
}
axios.post('/api/auth/refresh', {})
`;
    const calls = extractFrontendApiPaths(src, 'posService.ts');
    assert.ok(calls.some((c) => c.path === '/api/pos/caja/{id}/cerrar'));
    assert.ok(calls.some((c) => c.path === '/api/auth/login'));
    assert.ok(calls.some((c) => c.path === '/api/auth/refresh'));
    assert.equal(normalizeClientPath('/pos/venta'), '/api/pos/venta');
    assert.equal(
      normalizeClientPath('/sinpe/admin/comprobantes/${comprobanteId}/rechazar${params}'),
      '/api/sinpe/admin/comprobantes/{id}/rechazar',
    );
    assert.equal(routeMatches('/api/pos/caja/{id}/cerrar', '/api/pos/caja/{token}/cerrar'), true);
  });

  it('parsea specs fallidas Java/TS de logs CI', () => {
    const log = `
[ERROR] Tests run: 1, Failures: 1, Errors: 0, Skipped: 0, Time elapsed: 0.1 s <<< FAILURE! -- in com.hotclick.FooTest
[ERROR] com.hotclick.FooTest.testBar -- Time elapsed: 0.1 s <<< FAILURE!
  ✘  1 tests/pos-pago-express.spec.ts:12:5 › paga
 FAIL  src/services/api.test.ts
`;
    const specs = parseFailedSpecs(log);
    assert.ok(specs.some((s) => s.kind === 'java' && s.name.includes('FooTest')));
    assert.ok(specs.some((s) => s.name.includes('pos-pago-express.spec.ts')));
  });

  it('flaky = ≥2 fails + ≥1 pass', () => {
    const flaky = findFlakySpecs([
      { id: 1, conclusion: 'failure', failedSpecs: [{ name: 'FooTest', kind: 'java' }] },
      { id: 2, conclusion: 'success', passedSpecs: [{ name: 'FooTest', kind: 'java' }] },
      { id: 3, conclusion: 'failure', failedSpecs: [{ name: 'FooTest', kind: 'java' }] },
      { id: 4, conclusion: 'failure', failedSpecs: [{ name: 'OnceTest', kind: 'java' }] },
    ]);
    assert.ok(flaky.some((s) => s.name === 'FooTest' && s.failCount === 2 && s.passCount === 1));
    assert.ok(!flaky.some((s) => s.name === 'OnceTest'));
  });

  it('redacta secretos de docs y no deja el valor', () => {
    const text = [
      'password: hunter2secret',
      '-----BEGIN RSA PRIVATE KEY-----',
      'postgresql://u:supersecret99@db.example.com/x',
      'token=abcdefghijklmnop',
    ].join('\n');
    const hits = scanDocSecrets(text, 'docs/leak.md');
    assert.ok(hits.length >= 3);
    const blob = JSON.stringify(hits);
    assert.ok(!blob.includes('hunter2secret'));
    assert.ok(!blob.includes('supersecret99'));
    assert.ok(!blob.includes('abcdefghijklmnop'));
    assert.ok(hits.every((h) => h.redacted.includes('*') || h.redacted.includes('…') || h.redacted === '***'));
    assert.ok(!scanDocSecrets('JWT_SECRET in table', 'docs/AGENTES.md').length);
    assert.equal(scanDocSecrets('postgresql://postgres:[PASSWORD]@db.x.supabase.co/postgres', 'MIGRACION_AWS.md').length, 0);
    assert.equal(scanDocSecrets('postgresql://drill:drill@127.0.0.1:5432/restore_drill', 'docs/AGENTES_OLA2.md').length, 0);
    assert.equal(redactFindingValue('sk_live_abcdefghijklmnop').includes('sk_live_abcdefghijklmnop'), false);
  });

  it('E5 selecciona pos/seller/checkout por prefix', () => {
    const specs = ['pos-atajos.spec.ts', 'seller-wizard.spec.ts', 'checkout-cta.spec.ts', 'home-jobs.spec.ts'];
    const pos = selectPlaywrightSpecs(['Hot_click_outlet/frontend/src/services/posService.ts'], specs);
    assert.deepEqual(pos.areas, ['pos']);
    assert.ok(pos.specs.includes('pos-atajos.spec.ts'));
    assert.ok(!pos.specs.includes('home-jobs.spec.ts'));
    const seller = selectPlaywrightSpecs(['Hot_click_outlet/frontend/src/pages/seller/Wizard.tsx'], specs);
    assert.ok(seller.specs.includes('seller-wizard.spec.ts'));
    const none = selectPlaywrightSpecs(['Hot_click_outlet/src/main/java/Foo.java'], specs);
    assert.equal(none.specs.length, 0);
  });
});

describe('D6 flake-hunter', () => {
  it('infiere pases desde runs verdes y arma tabla', () => {
    const annotated = inferPassesFromSiblings([
      { id: 11, conclusion: 'failure', failedSpecs: [{ name: 'BarTest', kind: 'java' }] },
      { id: 12, conclusion: 'success', failedSpecs: [] },
      { id: 13, conclusion: 'failure', failedSpecs: [{ name: 'BarTest', kind: 'java' }] },
    ]);
    const result = runFlakeHunter({
      annotated,
      runs: annotated,
      sinceIso: '2000-01-01T00:00:00Z',
    });
    assert.equal(result.skipped, false);
    assert.ok(result.flaky.some((s) => s.name === 'BarTest'));
    const body = buildFlakeBody(result.flaky, { ranAt: '2026-09-14T00:00:00Z', lookbackHours: 48, runCount: 3 });
    assert.ok(body.includes('BarTest'));
    assert.ok(body.includes('GITHUB_TOKEN'));
  });
});

describe('D7 i18n-drift', () => {
  it('agrupa missing/orphan por namespace home/checkout/pos', () => {
    const diff = diffI18nKeys({
      es: { home: { title: 'H' }, checkout: { pay: 'P' }, pos: { caja: 'C' } },
      en: { home: { title: 'H' }, extra: { x: 'X' } },
      pt: { home: { title: 'H' }, checkout: { pay: 'P' } },
    });
    assert.ok(diff.missing.some((r) => r.key === 'checkout.pay' && r.absent.includes('en')));
    assert.ok(diff.missing.some((r) => r.key === 'pos.caja'));
    assert.ok(diff.orphan.some((r) => r.key === 'extra.x'));
    const groups = groupByNamespace(diff.missing);
    assert.ok(['home', 'checkout', 'pos'].includes(groups[0].namespace));
    const result = runI18nDrift({
      locales: {
        es: { home: { a: '1' } },
        en: { home: { a: '1' } },
        pt: { home: { a: '1' } },
      },
    });
    assert.equal(result.diff.missing.length, 0);
    const body = buildI18nBody(diff, { ranAt: '2026-09-14T00:00:00Z' });
    assert.ok(body.includes('checkout'));
    assert.ok(body.includes('pos'));
  });
});

describe('D8 secrets-in-docs', () => {
  it('clasifica narrativas y no reimprime el secreto en el Issue', () => {
    assert.equal(isDoc('docs/AGENTES_OLA4.md'), true);
    assert.equal(isDoc('api_cloud_google'), true);
    assert.equal(isDoc('txt/andres-zuniga.txt'), true);
    assert.equal(isDoc('Hot_click_outlet/frontend/src/services/api.ts'), false);
    const result = runSecretsDocs({
      files: ['docs/leak.md'],
      readFile: () => 'aws key AKIAIOSFODNN7EXAMPLE extra',
    });
    assert.ok(result.findings.length >= 1);
    const body = buildSecretsBody(result.findings, { ranAt: '2026-09-14T00:00:00Z', fileCount: 1 });
    assert.ok(body.includes('P0'));
    assert.ok(!body.includes('AKIAIOSFODNN7EXAMPLE'));
    assert.ok(body.includes('NO se reimprimen'));
  });
});

describe('D11 api-contract', () => {
  it('marca FE /api/sinpe si no hay controller', () => {
    const be = extractControllerRoutes(`
@RequestMapping("/api/auth")
class AuthController {
  @PostMapping("/login")
  void login() {}
}
`, 'AuthController.java');
    const fe = extractFrontendApiPaths(`
api.post('/auth/login')
api.post('/sinpe/checkout')
api.get('/pos/historial')
`, 'paymentService.ts');
    const likely = findLikely404s(fe, be);
    assert.ok(likely.some((x) => x.path === '/api/sinpe/checkout' && x.priority));
    assert.ok(likely.some((x) => x.path === '/api/pos/historial'));
    assert.ok(!likely.some((x) => x.path === '/api/auth/login'));
    const result = runApiDrift({
      controllerFiles: ['AuthController.java'],
      serviceFiles: ['paymentService.ts'],
      readFile: (rel) => (rel.includes('Auth')
        ? '@RequestMapping("/api/auth")\nclass A { @PostMapping("/login") void l(){} }'
        : "api.post('/sinpe/guest-checkout')"),
    });
    assert.ok(result.likely.some((x) => x.path.includes('/api/sinpe')));
    const body = buildApiBody(result.likely, { ranAt: '2026-09-14T00:00:00Z', beCount: 1, feCount: 1 });
    assert.ok(body.includes('api-drift') || body.includes('404'));
  });
});

describe('S4 idor-suite-gap', () => {
  it('detecta /{id} sin test TenantIsolation y genera stub @Disabled', () => {
    const result = runIdorGap({
      controllerFiles: ['BodegaController.java'],
      testFiles: ['F28TenantIsolationTest.java'],
      readFile: (rel) => {
        if (rel.includes('Bodega')) {
          return '@RequestMapping("/api/bodegas")\nclass B { @GetMapping("/{id}") Bodega g(){return null;} }';
        }
        return 'mockMvc.perform(get("/api/productos/" + id)) // TenantIsolation';
      },
    });
    assert.ok(result.uncovered.some((e) => e.path === '/api/bodegas/{id}'));
    assert.ok(!findUncovered(
      [{ method: 'GET', path: '/api/productos/{id}', file: 'P.java' }],
      { paths: ['/api/productos/{id}'] },
    ).length);
    assert.equal(coverageFor({ path: '/api/gastos/{id}' }, ['/api/gastos/{id}']), true);
    const java = buildStubJava(result.uncovered);
    assert.ok(java.includes('@Disabled'));
    assert.ok(java.includes('package com.hotclick.pending'));
    assert.ok(!java.includes('@SpringBootTest'));
  });
});

describe('E5 playwright-area', () => {
  it('dry-run comenta specs y no exige browsers', () => {
    const result = runPlaywrightArea({
      changedFiles: ['Hot_click_outlet/frontend/src/pages/checkout/CheckoutPage.tsx'],
      specNames: ['checkout-cta.spec.ts', 'pos-atajos.spec.ts'],
      browsers: false,
    });
    assert.ok(result.selection.specs.includes('checkout-cta.spec.ts'));
    assert.equal(result.mode, 'dry-run');
    const body = buildPrComment(result.selection, { mode: result.mode, browsers: false, note: result.note });
    assert.ok(body.includes('checkout-cta.spec.ts'));
    assert.ok(body.includes('hotclick-e5') || body.includes('E5'));
  });
});
