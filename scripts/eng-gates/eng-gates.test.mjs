import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  classifySemver,
  evaluateDependabot,
  evaluateFlyway,
  evaluateSensitive,
  evaluateSpa,
  evaluateTenant,
  isCriticalPackage,
  isEntityPath,
  isMigrationPath,
  looksLikeSchemaChange,
  matchSensitiveFamily,
  parseDependabotTitle,
  parseLabels,
  parseUnifiedDiff,
  scanTenantDiff,
} from './lib.mjs';

test('parseLabels splits and trims', () => {
  assert.deepEqual(parseLabels('skip-flyway-gate, needs-human'), ['skip-flyway-gate', 'needs-human']);
});

test('path helpers', () => {
  assert.equal(isEntityPath('Hot_click_outlet/src/main/java/com/hotclick/model/Pedido.java'), true);
  assert.equal(isEntityPath('Hot_click_outlet/src/main/java/com/hotclick/service/PedidoService.java'), false);
  assert.equal(isMigrationPath('Hot_click_outlet/src/main/resources/db/migration/V100__pedido_col.sql'), true);
  assert.equal(isMigrationPath('Hot_click_outlet/Actualizado.sql'), false);
});

test('schema hint detects JPA annotations', () => {
  assert.equal(looksLikeSchemaChange(['    @Column(name = "nuevo")']), true);
  assert.equal(looksLikeSchemaChange(['    public String getNombre() {']), false);
});

test('parseUnifiedDiff tracks added line numbers', () => {
  const diff = [
    'diff --git a/Foo.java b/Foo.java',
    '--- a/Foo.java',
    '+++ b/Foo.java',
    '@@ -10,3 +10,4 @@ class Foo {',
    '     void a() {}',
    '+    repo.findById(id);',
    '     void b() {}',
    ' }',
    '',
  ].join('\n');
  const files = parseUnifiedDiff(diff);
  assert.equal(files[0].path, 'Foo.java');
  const added = files[0].hunks[0].lines.filter((line) => line.type === 'add');
  assert.equal(added[0].text, '    repo.findById(id);');
  assert.equal(added[0].newLine, 11);
});

test('E1 fails when entity schema changes without migration', () => {
  const diffFiles = parseUnifiedDiff([
    '--- a/Hot_click_outlet/src/main/java/com/hotclick/model/Pedido.java',
    '+++ b/Hot_click_outlet/src/main/java/com/hotclick/model/Pedido.java',
    '@@ -1,2 +1,3 @@',
    ' class Pedido {',
    '+    @Column(name = "nota")',
    ' }',
    '',
  ].join('\n'));
  const verdict = evaluateFlyway({
    changedFiles: ['Hot_click_outlet/src/main/java/com/hotclick/model/Pedido.java'],
    diffFiles,
    actualizadoExists: true,
    skip: false,
  });
  assert.equal(verdict.ok, false);
});

test('E1 passes when migration is present and reminds Actualizado.sql', () => {
  const verdict = evaluateFlyway({
    changedFiles: [
      'Hot_click_outlet/src/main/java/com/hotclick/model/Pedido.java',
      'Hot_click_outlet/src/main/resources/db/migration/V200__nota.sql',
    ],
    diffFiles: parseUnifiedDiff([
      '--- a/Hot_click_outlet/src/main/java/com/hotclick/model/Pedido.java',
      '+++ b/Hot_click_outlet/src/main/java/com/hotclick/model/Pedido.java',
      '@@ -1,1 +1,2 @@',
      '+    @Column(name = "nota")',
      ' class Pedido {}',
      '',
    ].join('\n')),
    actualizadoExists: true,
    skip: false,
  });
  assert.equal(verdict.ok, true);
  assert.equal(verdict.reminders.length, 1);
});

test('E1 skips schema-less model edits', () => {
  const verdict = evaluateFlyway({
    changedFiles: ['Hot_click_outlet/src/main/java/com/hotclick/model/Pedido.java'],
    diffFiles: parseUnifiedDiff([
      '--- a/x',
      '+++ b/Hot_click_outlet/src/main/java/com/hotclick/model/Pedido.java',
      '@@ -1,1 +1,2 @@',
      '+    public int totalItems() { return 0; }',
      ' class Pedido {}',
      '',
    ].join('\n')),
    actualizadoExists: true,
    skip: false,
  });
  assert.equal(verdict.ok, true);
});

function tenantDiff(path, extraCtx, added) {
  return parseUnifiedDiff([
    `--- a/${path}`,
    `+++ b/${path}`,
    '@@ -1,6 +1,8 @@',
    extraCtx,
    `+${added}`,
    ' }',
    '',
  ].join('\n'));
}

test('E2 fails controller findById with PathVariable and no tenant guard', () => {
  const findings = scanTenantDiff(tenantDiff(
    'Hot_click_outlet/src/main/java/com/hotclick/controller/BodegaController.java',
    '    @GetMapping("/{id}")\n    public Bodega get(@PathVariable Long id) {',
    '        return repo.findById(id).orElseThrow();',
  ));
  assert.equal(findings.some((item) => item.rule === 'idor-findById' && item.severity === 'fail'), true);
  assert.equal(evaluateTenant({ findings, skip: false }).ok, false);
});

test('E2 warns service findById (not a new endpoint)', () => {
  const findings = scanTenantDiff(tenantDiff(
    'Hot_click_outlet/src/main/java/com/hotclick/service/BodegaService.java',
    '    public Bodega get(Long id) {',
    '        return repo.findById(id).orElseThrow();',
  ));
  assert.equal(findings[0].severity, 'warn');
  assert.equal(evaluateTenant({ findings, skip: false }).ok, true);
});

test('E2 ignores findByIdAndEmpresaId', () => {
  const findings = scanTenantDiff(tenantDiff(
    'Hot_click_outlet/src/main/java/com/hotclick/controller/BodegaController.java',
    '    @GetMapping("/{id}")\n    public Bodega get(@PathVariable Long id) {',
    '        return repo.findByIdAndEmpresaId(id, empresaId).orElseThrow();',
  ));
  assert.equal(findings.filter((item) => item.rule === 'idor-findById').length, 0);
});

test('E2 fails PgBouncer and raw async patterns', () => {
  const findings = scanTenantDiff(parseUnifiedDiff([
    '--- a/Hot_click_outlet/src/main/java/com/hotclick/service/JobService.java',
    '+++ b/Hot_click_outlet/src/main/java/com/hotclick/service/JobService.java',
    '@@ -1,1 +1,5 @@',
    '+    @Async("customPool")',
    '+    CompletableFuture.runAsync(() -> go());',
    '+    jdbc.query("select pg_advisory_lock(1)");',
    '+    jdbc.execute("LISTEN stock");',
    ' class JobService {}',
    '',
  ].join('\n')));
  const rules = new Set(findings.map((item) => item.rule));
  assert.ok(rules.has('async-unknown-executor'));
  assert.ok(rules.has('async-completable'));
  assert.ok(rules.has('pg_advisory'));
  assert.ok(rules.has('listen'));
});

test('E3 asks for build when src changed and static did not', () => {
  const verdict = evaluateSpa({ frontendSrcChanged: true, staticChanged: false, skip: false });
  assert.equal(verdict.action, 'build');
});

test('E3 passes when static artifacts are in the PR', () => {
  const verdict = evaluateSpa({ frontendSrcChanged: true, staticChanged: true, skip: false });
  assert.equal(verdict.action, 'pass');
});

test('E11 requires named tests per family', () => {
  const missing = evaluateSensitive({
    changedMainFiles: ['Hot_click_outlet/src/main/java/com/hotclick/service/wallet/WalletCreditService.java'],
    testFiles: ['Hot_click_outlet/src/test/java/com/hotclick/service/PaymentServiceTest.java'],
    skip: false,
  });
  assert.equal(missing.ok, false);
  assert.deepEqual(missing.missing, ['wallet']);

  const ok = evaluateSensitive({
    changedMainFiles: ['Hot_click_outlet/src/main/java/com/hotclick/service/PaymentService.java'],
    testFiles: ['Hot_click_outlet/src/test/java/com/hotclick/service/PaymentServiceTest.java'],
    skip: false,
  });
  assert.equal(ok.ok, true);
  assert.deepEqual(matchSensitiveFamily('AuthLoginHandler.java'), ['auth']);
});

test('E6 classifies dependabot and blocks Spring Boot 4 / critical majors', () => {
  assert.equal(classifySemver('3.4.4', '3.4.5'), 'patch');
  assert.equal(classifySemver('3.4.4', '4.0.0'), 'major');
  assert.equal(parseDependabotTitle('Bump stripe-java from 28.0.0 to 29.1.0').name, 'stripe-java');
  assert.equal(isCriticalPackage('io.jsonwebtoken:jjwt-api'), true);

  const sb4 = evaluateDependabot({ title: 'Bump spring-boot-starter-parent from 3.4.4 to 4.0.0', skip: false });
  assert.equal(sb4.ok, false);
  assert.ok(sb4.labels.includes('needs-human'));
  assert.ok(sb4.labels.includes('spring-boot-major'));

  const jjwtMajor = evaluateDependabot({ title: 'Bump jjwt-api from 0.12.6 to 1.0.0', skip: false });
  assert.equal(jjwtMajor.ok, false);
  const jjwtZero = evaluateDependabot({ title: 'Bump jjwt-api from 0.12.6 to 0.13.0', skip: false });
  assert.equal(jjwtZero.ok, true);
  assert.ok(jjwtZero.labels.includes('needs-human'));

  const patch = evaluateDependabot({ title: 'Bump axios from 1.7.0 to 1.7.1', skip: false });
  assert.equal(patch.ok, true);
  assert.ok(patch.labels.includes('automerge-candidate'));
});

import { applyPatches, collectStackFacts, plannedSafeDocPatches, renderGeneratedStack } from './stack-docs.mjs';
import { evaluateScale, scanScaleDiff, scanScaleHotspots } from './scale.mjs';

test('DOC1 collects java 21 and flyway >= 130 from this repo', () => {
  const facts = collectStackFacts('.');
  assert.equal(facts.javaVersion, '21');
  assert.equal(facts.springBoot, '3.4.4');
  assert.ok(facts.flywayMax >= 130);
  assert.ok(facts.flywayCount >= 100);
  assert.match(facts.react, /^19\./);
  const md = renderGeneratedStack(facts, '2026-09-13');
  assert.match(md, /Java \| \*\*21\*\*/);
  const patches = plannedSafeDocPatches(facts, {
    readme: 'Backend | Spring Boot 3.4.4 · Java 24\nFlyway (56 versiones, V1–V56)\nReact 18',
    estado: '| Backend | Spring Boot 3.4.4 / Java 24 |',
  });
  assert.ok(patches.some((item) => item.from === 'Java 24'));
  assert.ok(patches.some((item) => item.file === 'ESTADO_ACTUAL.md'));
  let readme = 'Java 24\nFlyway (56 versiones, V1–V56)\nReact 18';
  applyPatches(patches.filter((item) => item.file === 'README.md'), { 'README.md': readme }, {
    'README.md': (text) => { readme = text; },
  });
  assert.equal(readme.includes('Java 21'), true);
  assert.equal(readme.includes('React 19'), true);
  assert.equal(readme.includes('V1–V56'), false);
});

test('SCALE1 fails unbounded findAll and N+1 in controllers', () => {
  const findings = scanScaleDiff(parseUnifiedDiff([
    '--- a/Hot_click_outlet/src/main/java/com/hotclick/controller/FooController.java',
    '+++ b/Hot_click_outlet/src/main/java/com/hotclick/controller/FooController.java',
    '@@ -1,4 +1,8 @@',
    '     @GetMapping("/items")',
    '+    public List<Item> list() {',
    '+        return repo.findAll();',
    '+        for (Item i : items) { repo.findById(i.getId()); }',
    '+        new RestTemplate().getForObject(url, String.class);',
    '     }',
    '',
  ].join('\n')));
  const rules = new Set(findings.map((item) => item.rule));
  assert.ok(rules.has('p1-findall-controller') || rules.has('p1-list-no-page'));
  assert.ok(rules.has('p1-nplus1'));
  assert.ok(rules.has('p1-blocking-controller'));
  assert.equal(evaluateScale({ findings, skip: false }).ok, false);
});

test('SCALE1 weekly ranks findAll-heavy files', () => {
  const rows = scanScaleHotspots([
    { path: 'Small.java', text: 'class Small {}\n' },
    { path: 'Fat.java', text: `${'x\n'.repeat(300)} repo.findAll(); repo.findAll();\n` },
  ]);
  assert.equal(rows[0].path, 'Fat.java');
  assert.equal(rows[0].findAll, 2);
});
