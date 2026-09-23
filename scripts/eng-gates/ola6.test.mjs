import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import {
  CHUNK_WARN_BYTES,
  RAG_LAG_SELECT,
  RAG_MODEL,
  compareToBaseline,
  dbSecretsPresent,
  diffHacienda,
  evaluateBundleLint,
  evaluateEmbeddingsLag,
  evaluateI18nPr,
  evaluateSpaPush,
  extractTKeys,
  isProductionBaseUrl,
  isSensitiveExtractPath,
  javaBuilderTags,
  keysAddedInLocales,
  listLocRows,
  loadBaseline,
  mapSpikeFiles,
  mergeScriptThresholds,
  parseHikariPoolSize,
  parseK6Summary,
  parseK6Thresholds,
  parseLagCount,
  parseLintCiAllowlist,
  percentile,
  proposeMoveOnlyExtract,
  resolveK6Target,
  shouldSpikeIssue,
  xmlLocalNames,
  xsdRequiredElements,
} from './ola6-lib.mjs';
import { collectScriptThresholds, runK6Hikari } from './k6-hikari-regression.mjs';
import { runBundleLintCi } from './bundle-lint-ci.mjs';
import { runGodClassExtract } from './god-class-extract.mjs';
import { runHaciendaXml, scanHacienda } from './hacienda-xml-drift.mjs';
import { runRagLag } from './rag-embeddings-lag.mjs';
import { runSpaPushReminder } from './spa-push-reminder.mjs';
import { runProductIssueSpike } from './product-issue-spike.mjs';
import { runI18nPrGate } from './i18n-pr-gate.mjs';
import { REPO_ROOT } from './ola6-lib.mjs';

describe('S6 k6 / Hikari', () => {
  it('parsea p95 y error_rate de loadtest sin secretos', () => {
    const src = readFileSync(`${REPO_ROOT}/loadtest/k6-pos-checkout.js`, 'utf8');
    const parsed = parseK6Thresholds(src);
    assert.equal(parsed.p95, 1000);
    assert.equal(parsed.errorRate, 0.02);
    const merged = collectScriptThresholds();
    assert.ok(merged.scripts.includes('loadtest/k6-pos-checkout.js'));
    assert.ok(merged.p95 <= 1500);
  });

  it('niega producción y mockea si no hay secreto', () => {
    assert.equal(isProductionBaseUrl('https://hotclick.lat'), true);
    assert.equal(isProductionBaseUrl('http://18.227.68.15:8080'), true);
    assert.equal(isProductionBaseUrl('https://hot-click-dev.onrender.com'), false);
    const mock = resolveK6Target({});
    assert.equal(mock.mode, 'mock');
    const refused = resolveK6Target({ K6_BASE_URL: 'https://www.hotclick.lat/api' });
    assert.equal(refused.mode, 'refused-prod');
    const staging = resolveK6Target({ K6_BASE_URL: 'https://hot-click-dev.onrender.com' });
    assert.equal(staging.mode, 'staging');
  });

  it('compara contra baseline JSON (sin claves de pago)', () => {
    const baseline = loadBaseline(readFileSync(`${REPO_ROOT}/scripts/eng-gates/baselines/k6-hikari.json`, 'utf8'));
    assert.equal(baseline.p95_ms, 1500);
    assert.equal(baseline.error_rate, 0.02);
    const over = compareToBaseline({ p95_ms: 2000, error_rate: 0.01 }, baseline);
    assert.equal(over.over, true);
    const ok = compareToBaseline({ p95_ms: 40, error_rate: 0 }, baseline);
    assert.equal(ok.over, false);
    const summary = parseK6Summary({
      metrics: { http_req_duration: { values: { 'p(95)': 12 } }, http_req_failed: { values: { rate: 0 } } },
    });
    assert.equal(summary.p95_ms, 12);
  });

  it('percentile y hikari pool size', () => {
    assert.equal(percentile([1, 2, 3, 4, 100], 95), 100);
    assert.equal(parseHikariPoolSize('spring.datasource.hikari.maximum-pool-size=10\n'), 10);
  });

  it('runK6Hikari abre issue sin secreto (instrucciones) y no pega prod', async () => {
    const result = await runK6Hikari({
      env: {},
      smokeFn: async () => ({ p95_ms: 5, error_rate: 0, hikari_awaiting: 0, tool: 'test' }),
    });
    assert.equal(result.target.mode, 'mock');
    assert.equal(result.shouldIssue, true);
    assert.match(result.reason, /K6_BASE_URL|mock/i);
  });

  it('staging over baseline → issue; bajo baseline no', async () => {
    const over = await runK6Hikari({
      env: { K6_BASE_URL: 'https://staging.example.test' },
      smokeFn: async () => ({ p95_ms: 9000, error_rate: 0.5, hikari_awaiting: 0 }),
    });
    assert.equal(over.shouldIssue, true);
    const ok = await runK6Hikari({
      env: { K6_BASE_URL: 'https://staging.example.test' },
      smokeFn: async () => ({ p95_ms: 10, error_rate: 0, hikari_awaiting: 0 }),
    });
    assert.equal(ok.shouldIssue, false);
  });

  it('merge umbrales F29 + loadtest', () => {
    const merged = mergeScriptThresholds([
      { path: 'a.js', text: "http_req_duration: ['p(95)<1500']\nhttp_req_failed: ['rate<0.02']" },
      { path: 'b.js', text: "http_req_duration: ['p(95)<500']\nhttp_req_failed:     ['rate<0.01']" },
    ]);
    assert.equal(merged.p95, 500);
    assert.equal(merged.errorRate, 0.01);
  });
});

describe('S9 bundle + lint:ci', () => {
  it('parsea allowlist chico vs eslint .', () => {
    const pkg = JSON.parse(readFileSync(`${REPO_ROOT}/Hot_click_outlet/frontend/package.json`, 'utf8'));
    assert.match(pkg.scripts.lint, /eslint \./);
    const allow = parseLintCiAllowlist(pkg.scripts['lint:ci']);
    assert.ok(allow.includes('src/App.tsx'));
    assert.ok(allow.length < 40);
  });

  it('issue si chunks over o allowlist chico; no mass-enable', () => {
    const small = evaluateBundleLint({
      allowlist: ['src/App.tsx'],
      srcCount: 400,
      chunks: [{ name: 'ok.js', bytes: 1000 }],
      lintOk: true,
    });
    assert.equal(small.shouldIssue, true);
    assert.match(small.reason, /cubre/);
    const fat = evaluateBundleLint({
      allowlist: Array.from({ length: 200 }, (_, i) => `f${i}.ts`),
      srcCount: 200,
      chunks: [{ name: 'Big.js', bytes: CHUNK_WARN_BYTES + 1 }],
      lintOk: true,
    });
    assert.equal(fat.overChunks.length, 1);
    const lintFail = evaluateBundleLint({
      allowlist: ['a.ts'], srcCount: 1, chunks: [], lintOk: false,
    });
    assert.match(lintFail.reason, /lint:ci falló/);
  });

  it('runBundleLintCi skip label', () => {
    const out = runBundleLintCi({
      env: { SKIP_BUNDLE_LINT: '1' },
      allowlist: ['a'],
      srcCount: 1,
      chunks: [],
      lint: { ok: true, ran: false, output: '' },
    });
    assert.equal(out.skipped, true);
  });
});

describe('S10 god-class', () => {
  it('top 15 y extract fuera de Payment/Auth/Pos', () => {
    assert.equal(isSensitiveExtractPath('com/hotclick/service/PaymentService.java'), true);
    assert.equal(isSensitiveExtractPath('com/hotclick/controller/PosController.java'), true);
    assert.equal(isSensitiveExtractPath('pages/catalogo/CatalogProductGrid.tsx'), false);
    const files = [
      { path: 'Hot_click_outlet/src/main/java/com/hotclick/service/PaymentService.java', loc: 900 },
      {
        path: 'Hot_click_outlet/frontend/src/pages/catalogo/Grid.tsx',
        loc: 200,
        text: 'export function Grid() { return 1 }\nexport function ExtraBlock() {\n' + '  const x = 1;\n'.repeat(50) + '}\n',
      },
    ];
    const top = listLocRows(files);
    assert.equal(top[0].path.includes('Payment'), true);
    const proposal = proposeMoveOnlyExtract(top, (rel) => files.find((f) => f.path === rel)?.text || '');
    assert.ok(proposal);
    assert.match(proposal.path, /Grid\.tsx/);
    assert.match(proposal.hint, /Move-only/);
  });

  it('runGodClassExtract no toca Payment como propuesta', () => {
    const out = runGodClassExtract({
      files: [
        { path: 'Hot_click_outlet/src/main/java/com/hotclick/controller/PosQrController.java', loc: 800, text: 'class PosQrController {}' },
        {
          path: 'Hot_click_outlet/src/main/java/com/hotclick/service/EncargoService.java',
          loc: 120,
          text: 'class EncargoService {\n  void helper() {\n' + '    int a = 1;\n'.repeat(45) + '  }\n}\n',
        },
      ],
      readFile: (rel) => (rel.includes('Encargo')
        ? 'class EncargoService {\n  void helper() {\n' + '    int a = 1;\n'.repeat(45) + '  }\n}\n'
        : 'class Pos {}'),
    });
    assert.equal(out.shouldIssue, true);
    assert.equal(out.proposal.path.includes('Encargo'), true);
  });
});

describe('S11 Hacienda XML', () => {
  it('extrae tags de sample y XSD required', () => {
    const xml = '<FacturaElectronica><Clave>1</Clave><TotalComprobante>1</TotalComprobante></FacturaElectronica>';
    const names = xmlLocalNames(xml);
    assert.ok(names.includes('Clave'));
    const xsd = '<xs:element name="Clave" type="xs:string"/><xs:element name="Opcional" minOccurs="0"/>';
    const req = xsdRequiredElements(xsd);
    assert.ok(req.includes('Clave'));
    assert.equal(req.includes('Opcional'), false);
  });

  it('issue si el builder no emite un requerido', () => {
    const diff = diffHacienda({
      sampleNames: ['Clave', 'CodigoActividad'],
      xsdRequired: ['Clave', 'CodigoActividad', 'NumeroConsecutivo'],
      builderTags: ['Clave', 'CodigoActividad'],
    });
    assert.equal(diff.shouldIssue, true);
    assert.ok(diff.missingRequired.includes('NumeroConsecutivo'));
  });

  it('XmlFacturaBuilder cubre factura-muestra + XSD subset (heurística repo)', () => {
    const diff = scanHacienda();
    assert.equal(diff.shouldIssue, false, diff.reason);
    const java = readFileSync(`${REPO_ROOT}/Hot_click_outlet/src/main/java/com/hotclick/service/XmlFacturaBuilder.java`, 'utf8');
    const tags = javaBuilderTags(java);
    assert.ok(tags.includes('Clave'));
    assert.ok(tags.includes('TotalComprobante'));
  });

  it('runHaciendaXml skip', () => {
    const out = runHaciendaXml({ env: { SKIP_HACIENDA_XML: '1' } });
    assert.equal(out.skipped, true);
  });
});

describe('S12 RAG lag', () => {
  it('skip honesto sin secretos; SQL es SELECT y usa tablas V62/V64', () => {
    assert.equal(dbSecretsPresent({}), false);
    assert.match(RAG_LAG_SELECT, /hot_click_producto_embedding_tb/);
    assert.match(RAG_LAG_SELECT, /hot_click_producto_tb/);
    assert.match(RAG_LAG_SELECT, new RegExp(RAG_MODEL));
    assert.doesNotMatch(RAG_LAG_SELECT, /INSERT|UPDATE|DELETE/i);
    const skip = evaluateEmbeddingsLag({ secretsPresent: false });
    assert.equal(skip.skipped, true);
    assert.equal(skip.shouldIssue, false);
  });

  it('issue si lag > N; no inventa filas si psql falla', async () => {
    const over = evaluateEmbeddingsLag({ secretsPresent: true, lag: 80, threshold: 50, queryOk: true });
    assert.equal(over.shouldIssue, true);
    const ok = evaluateEmbeddingsLag({ secretsPresent: true, lag: 2, threshold: 50, queryOk: true });
    assert.equal(ok.shouldIssue, false);
    const fail = await runRagLag({
      env: { DATABASE_URL: 'postgresql://local/testdb' },
      query: () => ({ ok: false, lag: 0, error: 'connection refused' }),
    });
    assert.equal(fail.skipped, true);
    assert.equal(fail.shouldIssue, false);
    assert.equal(parseLagCount('42\n'), 42);
  });
});

describe('E13 SPA push reminder', () => {
  it('stale si frontend es más nuevo; no menciona force deploy', () => {
    const stale = evaluateSpaPush({
      frontendMeta: { sha: 'aaa1111', ts: 200 },
      staticMeta: { sha: 'bbb2222', ts: 100 },
      frontendTree: 'fe',
      staticTree: 'st',
      commitSha: 'ccc3333',
    });
    assert.equal(stale.stale, true);
    assert.match(stale.reason, /pnpm build/);
    assert.match(stale.reason, /Sin deploy automático/);
    assert.doesNotMatch(stale.reason, /git push --force|force-push/i);
    const out = runSpaPushReminder({
      env: {},
      signals: {
        frontendMeta: { sha: 'a', ts: 1 },
        staticMeta: { sha: 'b', ts: 9 },
        frontendTree: 'x',
        staticTree: 'y',
        commitSha: 'deadbeef',
      },
    });
    assert.equal(out.stale, false);
  });
});

describe('E15 product spike', () => {
  it('comenta PedidoService / CheckoutPage / PosController y no auto-fix', () => {
    assert.equal(shouldSpikeIssue({ title: 'Falla el POS en feria', labels: [] }), true);
    assert.equal(shouldSpikeIssue({ title: '[S1] Weekly sonar', labels: ['bug'] }), false);
    assert.equal(shouldSpikeIssue({ title: 'x', labels: ['bug'], isPullRequest: true }), false);
    const mapping = mapSpikeFiles({ title: 'bug de pago', labels: ['pago'] });
    assert.ok(mapping.files.some((f) => f.includes('PedidoService')));
    assert.ok(mapping.files.some((f) => f.includes('CheckoutPage')));
    assert.ok(mapping.files.some((f) => f.includes('PosController')));
    const run = runProductIssueSpike({
      issue: { number: 9, title: 'POS no cobra', labels: ['pos'], isPullRequest: false },
    });
    assert.equal(run.applicable, true);
    assert.match(run.body, /no\*\* implementa|no implementa el arreglo/);
    assert.match(run.body, /PosController/);
  });
});

describe('E17 i18n PR vs D7', () => {
  it('exige la misma key nueva en es/en/pt; hardcoded no falla', () => {
    const keys = extractTKeys("t('home.hello') + i18n.t(\"pos.caja\")");
    assert.deepEqual(keys.sort(), ['home.hello', 'pos.caja']);
    const missing = evaluateI18nPr({
      locales: {
        es: { home: { hello: 'Hola' } },
        en: { home: {} },
        pt: { home: { hello: 'Oi' } },
      },
      addedKeys: ['home.hello'],
    });
    assert.equal(missing.ok, false);
    assert.deepEqual(missing.missing[0].absent, ['en']);
    const hard = evaluateI18nPr({
      locales: { es: { a: '1' }, en: { a: '1' }, pt: { a: '1' } },
      addedKeys: ['a'],
      hardcoded: ['Texto visible largo'],
    });
    assert.equal(hard.ok, true);
    assert.ok(hard.hardcodedCount >= 1);
    // Leaf keys from JSON diffs deben resolver a paths anidados
    const leaf = evaluateI18nPr({
      locales: {
        es: { adminConfig: { navComision: 'x' } },
        en: { adminConfig: { navComision: 'y' } },
        pt: { adminConfig: { navComision: 'z' } },
      },
      addedKeys: ['navComision'],
    });
    assert.equal(leaf.ok, true);
  });

  it('keysAddedInLocales solo mira el diff (no el backlog de D7)', () => {
    const added = keysAddedInLocales(
      { es: { home: { old: 'a' } }, en: { home: { old: 'a' } }, pt: { home: { old: 'a' } } },
      { es: { home: { old: 'a', neu: 'n' } }, en: { home: { old: 'a' } }, pt: { home: { old: 'a' } } },
    );
    assert.deepEqual(added, ['home.neu']);
  });

  it('runI18nPrGate FAIL si falta en pt; skip label; no-op si no aplica', () => {
    const fail = runI18nPrGate({
      changed: ['Hot_click_outlet/frontend/src/i18n/locales/es.json'],
      locales: {
        es: { k: 'es' },
        en: { k: 'en' },
        pt: {},
      },
      beforeLocales: { es: {}, en: {}, pt: {} },
      diffFor: () => '+  "k": "es"\n',
    });
    assert.equal(fail.ok, false);
    const skip = runI18nPrGate({ env: { SKIP_I18N_PR: '1' }, changed: ['x.tsx'] });
    assert.equal(skip.skipped, true);
    const noop = runI18nPrGate({ changed: ['README.md'] });
    assert.equal(noop.applicable, false);
  });
});

describe('gitleaks / secretos ola 6', () => {
  it('baseline y tests no meten sk_ ni keys de alta entropía', () => {
    const baseline = readFileSync(`${REPO_ROOT}/scripts/eng-gates/baselines/k6-hikari.json`, 'utf8');
    assert.doesNotMatch(baseline, /sk_(live|test)_/);
    const tests = readFileSync(`${REPO_ROOT}/scripts/eng-gates/ola6.test.mjs`, 'utf8');
    assert.doesNotMatch(tests, /sk_(live|test)_[A-Za-z0-9]{8,}/);
    const smoke = readFileSync(`${REPO_ROOT}/scripts/eng-gates/fixtures/k6-smoke.js`, 'utf8');
    assert.match(smoke, /\/api\/health/);
    assert.doesNotMatch(smoke, /Bearer |JWT_TOKEN|sk_/);
  });
});
