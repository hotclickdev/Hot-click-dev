import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { describe, it } from 'node:test';
import {
  antToRegex,
  apiFamily,
  hasLabel,
  isSensitivePaymentAuthPos,
  isoWeek,
  normalizeApiPath,
  pathMatches,
  redactSecrets,
} from './ola2-lib.mjs';
import { classifyFindById, scanJavaSource, fingerprint, buildIssueBody } from './hunter-idor.mjs';
import { mapGaps, buildIssueBody as buildGapBody, PRIORITY_ROUTES, PENDING_STUBS } from './e2e-gap-map.mjs';
import {
  extractMappings,
  extractMatchers,
  coverageFor,
  evaluateAuthz,
  newMappingsFromDiff,
} from './gate-authz.mjs';
import { SUGGESTED_RULES, fetchSonarForFiles, buildIssueBody as buildSonarBody, pickBatch } from './sonar-batch.mjs';

describe('ola2-lib', () => {
  it('redacta secretos y no los deja en claro', () => {
    const raw = "password=supersecret99 token: abcdefghijklmnop Authorization: Bearer sk_live_abc12345";
    const red = redactSecrets(raw);
    assert.ok(!red.includes('supersecret99'));
    assert.ok(!red.includes('sk_live_abc12345'));
    assert.ok(red.includes('***'));
  });

  it('hasLabel es case-insensitive', () => {
    assert.equal(hasLabel('foo,Skip-Authz-Gate', 'skip-authz-gate'), true);
    assert.equal(hasLabel('idor', 'eng-agent'), false);
  });

  it('ant matchers: * un segmento, ** varios', () => {
    assert.equal(pathMatches('/api/pedidos/1', '/api/pedidos/*'), true);
    assert.equal(pathMatches('/api/pedidos/1/estado', '/api/pedidos/*'), false);
    assert.equal(pathMatches('/api/admin/foo/bar', '/api/admin/**'), true);
    assert.equal(antToRegex('/api/**').test('/api/x'), true);
  });

  it('apiFamily agrupa admin/public', () => {
    assert.equal(apiFamily('/api/widgets/{id}'), '/api/widgets');
    assert.equal(apiFamily('/api/admin/mesas/{id}'), '/api/admin/mesas');
    assert.equal(normalizeApiPath('api/foo/'), '/api/foo');
  });

  it('Payment/Auth/Pos son sensibles; Bodega no', () => {
    assert.equal(isSensitivePaymentAuthPos('com/hotclick/service/PaymentService.java'), true);
    assert.equal(isSensitivePaymentAuthPos('com/hotclick/controller/AuthController.java'), true);
    assert.equal(isSensitivePaymentAuthPos('com/hotclick/controller/PosQrController.java'), true);
    assert.equal(isSensitivePaymentAuthPos('com/hotclick/controller/BodegaController.java'), false);
  });
});

describe('D2 hunter-idor', () => {
  const risky = `
@RestController
@RequestMapping("/api/bodegas")
class BodegaController {
  @GetMapping("/{id}")
  public Bodega get(@PathVariable Long id) {
    return bodegaRepository.findById(id).orElseThrow();
  }
}
`;
  const guarded = `
@RestController
class X {
  @PutMapping("/{id}")
  public void upd(@PathVariable Long id) {
    Bodega b = bodegaRepository.findById(id).orElseThrow();
    companyScope.assertCanAccessNullable(b.getEmpresaId());
  }
}
`;
  const compound = `
class Repo {
  Optional<Bodega> one(Long id, Long empresaId) {
    return bodegaRepository.findByIdAndEmpresaId(id, empresaId);
  }
}
`;

  it('marca HIGH un controller findById de PathVariable sin guard', () => {
    const hits = scanJavaSource('Hot_click_outlet/src/main/java/com/hotclick/controller/BodegaController.java', risky);
    assert.equal(hits.length, 1);
    assert.equal(hits[0].severity, 'high');
    assert.ok(hits[0].snippet.includes('findById'));
  });

  it('baja a info si hay assertCanAccess', () => {
    const hits = scanJavaSource('a/controller/X.java', guarded);
    assert.equal(hits[0].severity, 'info');
  });

  it('ignora findByIdAndEmpresaId', () => {
    assert.equal(scanJavaSource('a/service/S.java', compound).length, 0);
  });

  it('classifyFindById ignora literales y comentarios', () => {
    assert.equal(classifyFindById('c/C.java', 1, '    // repo.findById(id)', '@PathVariable'), null);
    assert.equal(classifyFindById('c/C.java', 1, '    repo.findById(1L);', ''), null);
  });

  it('fingerprint es estable y el body no filtra secretos', () => {
    const findings = [
      { severity: 'high', path: 'A.java', line: 3, snippet: 'password=nope12345 findById(id)', title: 'x' },
    ];
    assert.equal(fingerprint(findings), 'high:A.java:3');
    const body = buildIssueBody(findings, {
      ranAt: '2026-09-13T00:00:00Z',
      mode: 'full',
      fileCount: 1,
      fingerprint: 'high:A.java:3',
    });
    assert.ok(body.includes('A.java:3'));
    assert.ok(!body.includes('nope12345'));
  });
});

describe('S1 sonar-batch', () => {
  it('rota el lote por semana y excluye Payment*', () => {
    const files = [
      { path: 'PaymentService.java', loc: 900 },
      { path: 'BodegaController.java', loc: 250 },
      { path: 'GastoController.java', loc: 260 },
      { path: 'AdminFinanzas.tsx', loc: 400 },
    ].filter((f) => !isSensitivePaymentAuthPos(f.path));
    assert.ok(files.every((f) => !f.path.startsWith('Payment')));
    const a = pickBatch(files, { year: 2026, week: 1 }, 2);
    const b = pickBatch(files, { year: 2026, week: 2 }, 2);
    assert.equal(a.length, 2);
    assert.ok(a[0].path !== b[0].path || a[1].path !== b[1].path);
    assert.ok(isoWeek(new Date('2026-09-14T00:00:00Z')).week >= 1);
  });

  it('sin SONAR_TOKEN no llama API y lo declara', async () => {
    const prev = process.env.SONAR_TOKEN;
    delete process.env.SONAR_TOKEN;
    let called = false;
    const result = await fetchSonarForFiles(['Foo.java'], () => {
      called = true;
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });
    if (prev) process.env.SONAR_TOKEN = prev;
    assert.equal(result.skipped, true);
    assert.equal(called, false);
    assert.ok(result.note.includes('SONAR_TOKEN'));
    const body = buildSonarBody({
      weekInfo: { year: 2026, week: 38 },
      batch: [{ path: 'BodegaController.java', loc: 250 }],
      sonar: result,
      fatCount: 10,
    });
    assert.ok(body.includes('SONAR_TOKEN'));
    assert.ok(SUGGESTED_RULES.length >= 3);
  });
});

describe('S3 e2e-gap-map', () => {
  it('marca gap si la ruta no aparece en specs vivas', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ola2-e2e-'));
    const live = join(dir, 'checkout-cta.spec.ts');
    writeFileSync(live, "await page.goto('/checkout')\n");
    const gaps = mapGaps([live], (p) => readFileSafe(p));
    const checkout = gaps.find((g) => g.id === 'checkout');
    const twofa = gaps.find((g) => g.id === 'auth-2fa');
    const finanzas = gaps.find((g) => g.id === 'admin-finanzas');
    assert.equal(checkout.covered, true);
    assert.equal(twofa.covered, false);
    assert.equal(finanzas.covered, false);
    assert.ok(PRIORITY_ROUTES.length >= 6);
    assert.equal(PENDING_STUBS.length, 3);
    const body = buildGapBody(gaps, PENDING_STUBS.map((s) => ({ ...s, exists: true })));
    assert.ok(body.includes('auth 2FA') || body.includes('2FA'));
  });
});

describe('E10 gate-authz', () => {
  const rules = `
    .requestMatchers(GET, "/api/productos").permitAll()
    .requestMatchers("/api/admin/**").hasRole("ADMIN")
    .requestMatchers("/api/**").authenticated()
  `;

  it('extrae mappings de clase + método', () => {
    const src = `
      @RestController
      @RequestMapping("/api/widgets")
      class Widgets {
        @GetMapping("/{id}")
        public Widget one() { return null; }
        @PostMapping
        public Widget create() { return null; }
      }
    `;
    const paths = extractMappings(src);
    assert.ok(paths.includes('/api/widgets'));
    assert.ok(paths.includes('/api/widgets/*'));
  });

  it('FAIL si el prefix nuevo solo cae en /api/**', () => {
    const matchers = extractMatchers(rules);
    const cov = coverageFor('/api/widgets', matchers);
    assert.equal(cov.catchAllOnly, true);
    const verdict = evaluateAuthz({
      mappings: [{ file: 'W.java', path: '/api/widgets' }],
      matchers,
      catchAllTestExists: true,
      skip: false,
    });
    assert.equal(verdict.ok, false);
    assert.equal(verdict.missing[0].path, '/api/widgets');
  });

  it('PASS si hay regla explícita o skip label', () => {
    const matchers = extractMatchers(`${rules}\n.requestMatchers("/api/widgets/**").authenticated()`);
    const ok = evaluateAuthz({
      mappings: [{ file: 'W.java', path: '/api/widgets/x' }],
      matchers,
      catchAllTestExists: true,
      skip: false,
    });
    assert.equal(ok.ok, true);
    const skipped = evaluateAuthz({
      mappings: [{ file: 'W.java', path: '/api/widgets' }],
      matchers: extractMatchers(rules),
      catchAllTestExists: true,
      skip: true,
    });
    assert.equal(skipped.ok, true);
    assert.equal(skipped.skipped, true);
  });

  it('FAIL si faltan catch-all o el test catch-all', () => {
    const noCatch = evaluateAuthz({
      mappings: [],
      matchers: extractMatchers('.requestMatchers("/api/health").permitAll()'),
      catchAllTestExists: true,
      skip: false,
    });
    assert.equal(noCatch.ok, false);
    const noTest = evaluateAuthz({
      mappings: [],
      matchers: extractMatchers(rules),
      catchAllTestExists: false,
      skip: false,
    });
    assert.equal(noTest.ok, false);
  });

  it('detecta mappings nuevos vs base', () => {
    const added = newMappingsFromDiff({
      changedFiles: ['FooController.java'],
      readHead: () => '@RestController\n@RequestMapping("/api/widgets")\nclass Foo {}',
      readBase: () => '',
    });
    assert.ok(added.some((a) => a.path === '/api/widgets' && a.addedController));
  });

  it('/api/admin/** cubre un controller admin nuevo', () => {
    const matchers = extractMatchers(rules);
    const cov = coverageFor('/api/admin/mesas', matchers);
    assert.equal(cov.covered, true);
  });
});

describe('S8 restore-drill script', () => {
  it('verify acepta fixture gzip y refuse-prod rechaza supabase', () => {
    const sql = join(process.cwd(), 'scripts/eng-gates/fixtures/restore-drill-sample.sql');
    const gz = join(mkdtempSync(join(tmpdir(), 'ola2-s8-')), 'sample.sql.gz');
    execFileSync('bash', ['-lc', `gzip -c "$1" > "$2"`, '_', sql, gz]);
    const out = execFileSync('bash', ['scripts/eng-gates/restore-drill.sh', 'verify', gz], {
      encoding: 'utf8',
    });
    assert.ok(out.includes('verify OK'));
    const refuse = execFileSync('bash', ['scripts/eng-gates/restore-drill.sh', 'refuse-prod'], {
      encoding: 'utf8',
      env: { ...process.env, DATABASE_URL: 'postgresql://u:p@db.supabase.co:5432/postgres' },
    });
    assert.ok(refuse.includes('prod rechazada'));
    unlinkSync(gz);
  });

  it('restore sin DRILL_ALLOW_RESTORE o URL prod falla', () => {
    const sql = join(process.cwd(), 'scripts/eng-gates/fixtures/restore-drill-sample.sql');
    const gz = join(mkdtempSync(join(tmpdir(), 'ola2-s8b-')), 'sample.sql.gz');
    execFileSync('bash', ['-lc', `gzip -c "$1" > "$2"`, '_', sql, gz]);
    assert.throws(() => {
      execFileSync('bash', ['scripts/eng-gates/restore-drill.sh', 'restore', gz], {
        encoding: 'utf8',
        env: {
          ...process.env,
          DATABASE_URL: 'postgresql://u:p@127.0.0.1:5432/restore_drill',
          DRILL_ALLOW_RESTORE: '',
        },
      });
    });
    assert.throws(() => {
      execFileSync('bash', ['scripts/eng-gates/restore-drill.sh', 'restore', gz], {
        encoding: 'utf8',
        env: {
          ...process.env,
          DATABASE_URL: 'postgresql://u:p@db.supabase.co:5432/postgres',
          DRILL_ALLOW_RESTORE: '1',
        },
      });
    });
  });
});

function readFileSafe(p) {
  return execFileSync('cat', [p], { encoding: 'utf8' });
}

