import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  classifyFlake,
  diffJpaVsSql,
  evaluateHealth,
  evaluateSpaStale,
  isCriticalMajorTitle,
  javaTestClassName,
  mapSentryIssue,
  nextMigrationFilename,
  parseFlywaySql,
  parseJpaEntities,
  parseMigrationVersion,
  pickJavaTests,
  planCommitChecks,
  redactSecrets,
  scanCommitBlockers,
  sentryTokenPresent,
  tailLines,
} from './ola3-lib.mjs';
import { runDrift, buildIssueBody as buildDriftBody } from './flyway-jpa-drift.mjs';
import { runSpaStale, buildIssueBody as buildSpaBody } from './spa-stale.mjs';
import { fetchSentryIssues, buildDigestBody, collectHealthFallback } from './sentry-digest.mjs';
import { classifyOpenPr, buildPrComment, buildHumanIssue, ciPassed } from './dependabot-weekly.mjs';
import { analyzeCommitGate, formatVerdict, runTouchedTests } from './commit-gate.mjs';
import { buildDiagnosis, pickFailedJobName, runDiagnosis } from './ci-red-diagnose.mjs';
import { buildOutageBody, runHealthPager } from './health-pager.mjs';
import { evaluateDependabot } from './lib.mjs';

describe('ola3-lib parsers', () => {
  const entity = `
@Entity
@Table(name = "hot_click_bodega_tb")
class Bodega {
  @Column(name = "nombre_bodega", nullable = false)
  private String nombreBodega;
  @JoinColumn(name = "fk_id_empresa")
  private Empresa empresa;
}
`;
  const sql = `
CREATE TABLE IF NOT EXISTS hot_click_bodega_tb (
  id_bodega bigint PRIMARY KEY,
  nombre_bodega varchar(100)
);
ALTER TABLE hot_click_bodega_tb ADD COLUMN IF NOT EXISTS latitud numeric;
`;

  it('parsea @Table/@Column/@JoinColumn y CREATE/ALTER', () => {
    const [ent] = parseJpaEntities(entity, 'Bodega.java');
    assert.equal(ent.table, 'hot_click_bodega_tb');
    assert.deepEqual(ent.columns.map((c) => c.name).sort(), ['fk_id_empresa', 'nombre_bodega']);
    const tables = parseFlywaySql(sql);
    assert.ok(tables.get('hot_click_bodega_tb').has('nombre_bodega'));
    assert.ok(tables.get('hot_click_bodega_tb').has('latitud'));
    const multi = parseFlywaySql(`
ALTER TABLE hot_click_bodega_tb
    ADD COLUMN IF NOT EXISTS provincia VARCHAR(50),
    ADD COLUMN IF NOT EXISTS canton    VARCHAR(100);
`);
    assert.ok(multi.get('hot_click_bodega_tb').has('provincia'));
    assert.ok(multi.get('hot_click_bodega_tb').has('canton'));
  });

  it('diff reporta columna JPA ausente en SQL y sugiere V{N+1}', () => {
    const entities = parseJpaEntities(entity, 'model/Bodega.java');
    const drift = diffJpaVsSql(entities, parseFlywaySql(sql));
    assert.equal(drift.missingTables.length, 0);
    assert.ok(drift.missingColumns.some((c) => c.column === 'fk_id_empresa'));
    assert.equal(nextMigrationFilename([129, 130], 'hot_click_bodega_tb'), 'V131__hot_click_bodega_tb.sql');
    assert.equal(parseMigrationVersion('Hot_click_outlet/src/main/resources/db/migration/V130__x.sql'), 130);
  });

  it('SPA stale si frontend commit es más nuevo que static/', () => {
    const stale = evaluateSpaStale({
      frontendMeta: { sha: 'aaa1111', ts: 200, subject: 'feat ui' },
      staticMeta: { sha: 'bbb2222', ts: 100, subject: 'chore build' },
    });
    assert.equal(stale.stale, true);
    const ok = evaluateSpaStale({
      frontendMeta: { sha: 'aaa1111', ts: 100, subject: 'feat' },
      staticMeta: { sha: 'bbb2222', ts: 200, subject: 'build' },
    });
    assert.equal(ok.stale, false);
  });

  it('health outage solo al segundo fallo; redacta secretos', () => {
    assert.equal(evaluateHealth({ currentStatus: 500, previousStatus: 200 }).openOutage, false);
    assert.equal(evaluateHealth({ currentStatus: 503, previousStatus: 500 }).openOutage, true);
    assert.equal(evaluateHealth({ currentStatus: 200, previousStatus: 500 }).recovered, true);
    const red = redactSecrets('Authorization: Bearer sk_live_abcdefgh token=supersecret99');
    assert.ok(!red.includes('sk_live_abcdefgh'));
    assert.ok(red.includes('***'));
  });

  it('Sentry mapper y flake vs regresión', () => {
    const mapped = mapSentryIssue({
      id: '99',
      shortId: 'HOT-99',
      title: 'GET /api/health 500',
      culprit: '/api/health',
      permalink: 'https://hotclick.sentry.io/issues/99',
      level: 'error',
      metadata: { release: 'deadbeef1234' },
      tags: [['commit', 'deadbeef1234']],
    });
    assert.equal(mapped.endpoint, '/api/health');
    assert.equal(mapped.sha, 'deadbeef1234');
    assert.equal(classifyFlake({
      failedJob: 'Tests Java',
      masterFailedSameJob: true,
      masterLastGreen: false,
    }).kind, 'flake');
    assert.equal(classifyFlake({
      failedJob: 'Tests Java',
      masterFailedSameJob: false,
      masterLastGreen: true,
    }).kind, 'regression');
    assert.equal(tailLines('a\nb\nc\nd', 2), 'c\nd');
    assert.equal(sentryTokenPresent({}), false);
    assert.equal(sentryTokenPresent({ SENTRY_TOKEN: 'abc' }), true);
  });
});

describe('D1 flyway-jpa-drift', () => {
  it('corre contra fixtures en memoria y no sugiere aplicar SQL a prod', () => {
    const files = {
      'model/Nueva.java': `
@Entity
@Table(name = "hot_click_nueva_tb")
class Nueva {
  @Column(name = "campo_nuevo")
  private String campoNuevo;
}
`,
      'Hot_click_outlet/src/main/resources/db/migration/V10__old.sql':
        'CREATE TABLE hot_click_otra_tb (id int);\n',
      'Hot_click_outlet/Actualizado.sql': 'CREATE TABLE hot_click_otra_tb (id int);\n',
    };
    const result = runDrift({
      entityFiles: ['model/Nueva.java'],
      migrationFiles: ['Hot_click_outlet/src/main/resources/db/migration/V10__old.sql'],
      readFile: (rel) => files[rel] || '',
      includeActualizado: true,
    });
    assert.equal(result.hasDrift, true);
    assert.ok(result.missingTables.some((t) => t.table === 'hot_click_nueva_tb'));
    assert.equal(result.nextFile, 'V11__hot_click_nueva_tb.sql');
    const body = buildDriftBody(result, '2026-09-14T00:00:00Z');
    assert.ok(body.includes('V11__hot_click_nueva_tb.sql'));
    assert.ok(body.includes('no aplica SQL') || body.includes('no aplica SQL a producción') || body.includes('No correr'));
  });
});

describe('D3 spa-stale', () => {
  it('arma Issue solo con señales hash/mtime (inyectadas)', () => {
    const result = runSpaStale({
      frontendMeta: { sha: 'fff', ts: 50, subject: 'ui' },
      staticMeta: { sha: 'sss', ts: 10, subject: 'old' },
      frontendTree: 'tree-fe',
      staticTree: 'tree-st',
    });
    assert.equal(result.stale, true);
    const body = buildSpaBody(result, '2026-09-14T00:00:00Z');
    assert.ok(body.includes('tree-fe'));
    assert.ok(body.includes('STALE'));
  });
});

describe('D4 sentry-digest', () => {
  it('sin token no llama API y lo declara', async () => {
    const prev = process.env.SENTRY_TOKEN;
    delete process.env.SENTRY_TOKEN;
    delete process.env.SENTRY_AUTH_TOKEN;
    let called = false;
    const sentry = await fetchSentryIssues({
      env: {},
      fetchImpl: () => {
        called = true;
        return Promise.resolve({ ok: true, json: async () => [] });
      },
    });
    if (prev) process.env.SENTRY_TOKEN = prev;
    assert.equal(sentry.skipped, true);
    assert.equal(called, false);
    assert.ok(sentry.note.includes('SENTRY_TOKEN'));
    const health = collectHealthFallback([
      { conclusion: 'failure', databaseId: 1, url: 'https://example/1', displayTitle: 'Keep' },
      { conclusion: 'failure', databaseId: 2, url: 'https://example/2', displayTitle: 'Keep' },
    ]);
    assert.equal(health.recentFails, 2);
    const body = buildDigestBody({ sentry, health, ranAt: '2026-09-14T00:00:00Z' });
    assert.ok(body.includes('omitida') || body.includes('SENTRY_TOKEN'));
    assert.ok(body.includes('SentryWebhookService'));
  });

  it('mapea unresolved con endpoint y SHA', async () => {
    const sentry = await fetchSentryIssues({
      env: { SENTRY_TOKEN: 'dummy' },
      fetchImpl: () => Promise.resolve({
        ok: true,
        json: async () => [{
          id: '1',
          shortId: 'HOT-1',
          title: 'boom',
          culprit: '/api/pedidos',
          permalink: 'https://hotclick.sentry.io/issues/1',
          metadata: { release: 'abc1234' },
        }],
      }),
    });
    assert.equal(sentry.skipped, false);
    assert.equal(sentry.issues[0].endpoint, '/api/pedidos');
    const body = buildDigestBody({
      sentry,
      health: { recentFails: 0, samples: [] },
      ranAt: '2026-09-14T00:00:00Z',
    });
    assert.ok(body.includes('/api/pedidos'));
    assert.ok(body.includes('abc1234'));
  });
});

describe('S2 dependabot-weekly', () => {
  it('patch verde → automerge-candidate; major stripe → needs-human', () => {
    const patch = classifyOpenPr({
      number: 10,
      title: 'Bump axios from 1.7.0 to 1.7.1',
      url: 'https://github.com/x/y/pull/10',
      labels: [],
      statusCheckRollup: [{ conclusion: 'success', name: 'Tests Java' }],
    });
    assert.equal(patch.safeNote, true);
    assert.deepEqual(patch.addLabels, ['automerge-candidate']);
    assert.ok(buildPrComment(patch).includes('automerge-candidate'));

    const major = classifyOpenPr({
      number: 11,
      title: 'Bump stripe-java from 28.0.0 to 29.0.0',
      url: 'https://github.com/x/y/pull/11',
      labels: [{ name: 'needs-human' }],
      statusCheckRollup: [{ conclusion: 'success', name: 'CI' }],
    });
    assert.equal(major.criticalMajor, true);
    assert.equal(major.safeNote, false);
    assert.ok(isCriticalMajorTitle(major.title));
    const issue = buildHumanIssue([patch, major], '2026-09-14T00:00:00Z');
    assert.ok(issue.includes('stripe-java'));
    assert.ok(issue.includes('#11'));
    assert.equal(ciPassed({ statusCheckRollup: [] }).known, false);
    const e6 = evaluateDependabot({ title: major.title, skip: false });
    assert.ok(e6.labels.includes('needs-human'));
  });
});

describe('E4 commit-gate', () => {
  it('BLOQUEADO por agent log / .env; LISTO en diff limpio', () => {
    const blocked = analyzeCommitGate({
      changedFiles: ['Hot_click_outlet/frontend/src/App.tsx', 'Hot_click_outlet/.env'],
      diffText: [
        '+++ b/Hot_click_outlet/frontend/src/App.tsx',
        '+#region agent log',
        '+fetch("https://x")',
      ].join('\n'),
      testFiles: [],
      skip: false,
    });
    assert.ok(blocked.blockers.length >= 1);
    assert.equal(formatVerdict({ analysis: blocked }).verdict, 'BLOQUEADO');

    const cleanDiff = [
      '+++ b/Hot_click_outlet/src/main/java/com/hotclick/controller/BodegaController.java',
      '+    public void ok() {}',
    ].join('\n');
    const clean = analyzeCommitGate({
      changedFiles: ['Hot_click_outlet/src/main/java/com/hotclick/controller/BodegaController.java'],
      diffText: cleanDiff,
      testFiles: ['Hot_click_outlet/src/test/java/com/hotclick/controller/BodegaControllerTest.java'],
      skip: false,
    });
    assert.equal(clean.blockers.length, 0);
    assert.deepEqual(clean.plan.javaTests, ['BodegaControllerTest']);
    assert.equal(javaTestClassName('FooService.java'), 'FooServiceTest');
    assert.deepEqual(
      pickJavaTests(['FooService.java'], ['src/test/java/FooServiceTest.java']),
      ['FooServiceTest'],
    );
    const plan = planCommitChecks(['Hot_click_outlet/frontend/src/pages/X.tsx']);
    assert.equal(plan.runFrontendTests, true);
    const tests = runTouchedTests(clean.plan, () => ({ ok: true, detail: 'ok' }));
    assert.ok(tests.some((t) => t.id.startsWith('tests')));

    const self = scanCommitBlockers({
      changedFiles: ['scripts/eng-gates/ola3-lib.mjs', '.github/workflows/commit-gate.yml'],
      diffText: [
        '+++ b/scripts/eng-gates/ola3-lib.mjs',
        '+  { id: "agent-log", re: /#region agent log/i }',
        '+++ b/.github/workflows/commit-gate.yml',
        '+          JWT_SECRET: test-secret-for-ci-only-not-production',
        '+          STRIPE_WEBHOOK_SECRET: whsec_placeholder',
      ].join('\n'),
    });
    assert.equal(self.length, 0);

    const skipMentions = scanCommitBlockers({
      changedFiles: ['scripts/eng-gates/ola4-lib.mjs', '.github/workflows/playwright-area.yml'],
      diffText: [
        '+++ b/scripts/eng-gates/ola4-lib.mjs',
        "+        if (['node_modules', 'playwright-report', 'test-results'].includes(entry.name)) {",
        '+++ b/.github/workflows/playwright-area.yml',
        '+            Hot_click_outlet/frontend/test-results',
        '+            Hot_click_outlet/frontend/playwright-report',
      ].join('\n'),
    });
    assert.equal(skipMentions.filter((item) => item.id === 'playwright-report').length, 0);

    const realReport = scanCommitBlockers({
      changedFiles: ['Hot_click_outlet/frontend/playwright-report/index.html'],
      diffText: [
        '+++ b/Hot_click_outlet/frontend/playwright-report/index.html',
        '+<html></html>',
      ].join('\n'),
    });
    assert.ok(realReport.some((item) => item.id === 'playwright-report'));
    assert.deepEqual(
      pickJavaTests(
        ['Hot_click_outlet/src/test/java/com/hotclick/pending/IdorSuiteGapStubsTest.java'],
        ['Hot_click_outlet/src/test/java/com/hotclick/pending/IdorSuiteGapStubsTest.java'],
      ),
      [],
    );
  });
});

describe('E7 ci-red', () => {
  it('dedup body incluye job + 30 líneas + hint', () => {
    const diagnosis = runDiagnosis({
      runId: '',
      sha: 'abc1234',
      conclusion: 'failure',
      runUrl: 'https://example/run/1',
      jobs: [{ name: 'Tests Java', conclusion: 'failure' }],
      logText: Array.from({ length: 40 }, (_, i) => `line-${i}`).join('\n'),
      masterRuns: [{ conclusion: 'success' }],
      prNumber: 42,
    });
    assert.equal(diagnosis.jobName, 'Tests Java');
    assert.equal(diagnosis.hint.kind, 'regression');
    assert.ok(!diagnosis.logTail.includes('line-0'));
    assert.ok(diagnosis.logTail.includes('line-39'));
    const body = buildDiagnosis(diagnosis);
    assert.ok(body.includes('Tests Java'));
    assert.ok(body.includes('hotclick-e7-ci-red') || body.includes('E7'));
    assert.equal(pickFailedJobName([], ''), 'CI');
  });
});

describe('E9 health-pager', () => {
  it('abre outage al segundo 5xx y escribe estado', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ola3-e9-'));
    const state = join(dir, 'state.json');
    writeFileSync(state, JSON.stringify({ status: '503' }));
    const result = runHealthPager({
      url: 'https://example.test/api/health',
      stateFile: state,
      runner: () => ({ status: '502', detail: '' }),
    });
    assert.equal(result.verdict.openOutage, true);
    const body = buildOutageBody({ ...result, ranAt: '2026-09-14T00:00:00Z' });
    assert.ok(body.includes('OUTAGE'));
    assert.ok(body.includes('no') && body.includes('git push'));
  });
});
