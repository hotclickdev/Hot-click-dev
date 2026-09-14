import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  actuatorDocumentedAbsent,
  classifyController,
  evaluateRealHealth,
  eventIsCron,
  fingerprintMarker,
  isCosmeticHealthSource,
  isHealthyResponse,
  looksLikeHtml,
  packageHasAxe,
  parseFingerprintPayload,
  resolveHealthTargets,
  scanDialogFocusGaps,
  sentryTokenPresent,
  snippetBody,
  specInCi,
} from './ola7-lib.mjs';
import { buildOutageBody, runRealHealth } from './real-health.mjs';
import { a11yGaps, buildA11yIssueBody, ciSmokeSpecs, collectA11yScan, runA11yPosKeyboard } from './a11y-pos-keyboard.mjs';
import {
  buildRuntimeIssueBody,
  evaluateRuntimeEndpoint,
  runRuntimeEndpoint,
} from './runtime-endpoint-issue.mjs';

const HEALTH_JAVA = `
@GetMapping("/health")
public Map health() {
  response.put("status", "UP");
  return response;
}
`;

const ACTUATOR_PROPS = `
# spring-boot-starter-actuator NO está instalado (intencionalmente).
# Sin él no existen endpoints /actuator/** — más seguro que protegerlos.
`;

describe('D12 real health', () => {
  it('HTML 200 (parking) no cuenta como healthy', () => {
    assert.equal(looksLikeHtml('<!DOCTYPE html><html>'), true);
    assert.equal(isHealthyResponse(200, '<html><body>Render</body></html>'), false);
    assert.equal(isHealthyResponse(200, '{"status":"UP","service":"HOT_CLICK Outlet"}'), true);
    assert.equal(isHealthyResponse(200, '{"status":"DOWN"}'), false);
    assert.equal(isHealthyResponse(200, ''), false);
    assert.equal(isHealthyResponse(503, '{"status":"UP"}'), false);
  });

  it('abre outage al segundo fallo real y mete snippet de cuerpo', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ola7-d12-'));
    const state = join(dir, 'state.json');
    writeFileSync(state, JSON.stringify({ ok: false, status: '502' }));
    const result = runRealHealth({
      url: 'https://example.test/api/health',
      stateFile: state,
      javaSource: HEALTH_JAVA,
      propsText: ACTUATOR_PROPS,
      runner: () => ({ status: '502', body: '{"error":"bad gateway"}', detail: '' }),
    });
    assert.equal(result.verdict.openOutage, true);
    assert.equal(result.ping.ok, false);
    assert.match(result.ping.snippet, /bad gateway/);
    const body = buildOutageBody({ ...result, ranAt: '2026-09-14T00:00:00Z' });
    assert.match(body, /OUTAGE/);
    assert.match(body, /no.*git push/i);
    assert.match(body, /actuator no está instalado/);
    const saved = JSON.parse(readFileSync(state, 'utf8'));
    assert.equal(saved.ok, false);
  });

  it('200 HTML dos veces también pagina (E9 lo habría tratado como OK)', () => {
    const result = runRealHealth({
      url: 'https://example.test/api/health',
      previous: { ok: false, status: '200' },
      javaSource: HEALTH_JAVA,
      propsText: ACTUATOR_PROPS,
      ping: {
        url: 'https://example.test/api/health',
        status: '200',
        body: '<!doctype html><html>starting</html>',
        snippet: snippetBody('<!doctype html><html>starting</html>'),
        ok: isHealthyResponse('200', '<!doctype html><html>starting</html>'),
        detail: '',
      },
    });
    assert.equal(result.ping.ok, false);
    assert.equal(result.verdict.openOutage, true);
  });

  it('no inventa actuator; secondary solo si el env existe', () => {
    const none = resolveHealthTargets({}, ACTUATOR_PROPS);
    assert.equal(none.secondary, null);
    assert.equal(none.inventedActuator, false);
    assert.equal(none.actuatorAbsent, true);
    const withSec = resolveHealthTargets({ HEALTH_SECONDARY_URL: 'https://example.test/api/health' }, ACTUATOR_PROPS);
    assert.equal(withSec.secondary, 'https://example.test/api/health');
    assert.equal(actuatorDocumentedAbsent(ACTUATOR_PROPS), true);
    assert.equal(isCosmeticHealthSource(HEALTH_JAVA), true);
    assert.equal(isCosmeticHealthSource('DataSource ds; status UP'), false);
  });

  it('evaluateRealHealth: primer fallo no pagina; recovery sí', () => {
    assert.equal(evaluateRealHealth({ currentOk: false, previousOk: true }).openOutage, false);
    assert.equal(evaluateRealHealth({ currentOk: false, previousOk: false }).openOutage, true);
    assert.equal(evaluateRealHealth({ currentOk: true, previousOk: false }).recovered, true);
  });

  it('recorta el snippet y no inventa un cuerpo vacío', () => {
    assert.equal(snippetBody(''), '(cuerpo vacío)');
    assert.equal(snippetBody('  placeholder-body  '), 'placeholder-body');
    const long = `ok-REDACTED ${'x'.repeat(500)}`;
    const snip = snippetBody(long, 40);
    assert.equal(snip.endsWith('…'), true);
    assert.equal(snip.length, 41);
    assert.match(snip, /^ok-REDACTED /);
  });
});

describe('S14 a11y + POS keyboard', () => {
  const posDialog = {
    path: 'Hot_click_outlet/frontend/src/pages/admin/pos/StepVenta.tsx',
    source: 'role="dialog" aria-modal="true"',
  };

  it('lista huecos: axe ausente, pos-atajos fuera de CI, dialog sin trap', () => {
    const scan = collectA11yScan({
      specNames: ['pos-atajos.spec.ts', 'seller-wizard.spec.ts', 'seller-qa-escape-remap.spec.ts'],
      pkgJsonText: '{"devDependencies":{"playwright":"1.0.0"}}',
      hookExists: true,
      posFiles: [posDialog],
      wizardFiles: [{ path: 'FormularioPorPasos.tsx', source: 'export function Form()' }],
      ciSpecs: ['tests/seller-wizard.spec.ts', 'tests/seller-qa-escape-remap.spec.ts'],
    });
    assert.equal(scan.axe, false);
    const gaps = a11yGaps(scan);
    const ids = gaps.map((g) => g.id);
    assert.ok(ids.includes('axe'));
    assert.ok(ids.includes('pos-atajos-not-in-ci'));
    assert.ok(ids.includes('pos-focus-trap'));
    assert.ok(ids.includes('wizard-focus-spec'));
    const smoke = ciSmokeSpecs(scan, ['tests/seller-wizard.spec.ts']);
    assert.deepEqual(smoke, ['seller-wizard.spec.ts']);
  });

  it('packageHasAxe y specInCi', () => {
    assert.equal(packageHasAxe('{"devDependencies":{"@axe-core/playwright":"4.0.0"}}'), true);
    assert.equal(specInCi('pos-atajos.spec.ts', ['tests/pos-pago-express.spec.ts']), false);
    assert.equal(specInCi('seller-wizard.spec.ts', ['tests/seller-wizard.spec.ts']), true);
    assert.equal(scanDialogFocusGaps([{ path: 'Modal.tsx', source: 'useFocusTrap(ref, open) aria-modal="true"' }]).length, 0);
  });

  it('dry-run no ejecuta playwright y el Issue nombra pos-atajos', () => {
    let ran = 0;
    const result = runA11yPosKeyboard({
      specNames: ['pos-atajos.spec.ts', 'seller-wizard.spec.ts'],
      pkgJsonText: '{}',
      hookExists: true,
      posFiles: [posDialog],
      wizardFiles: [],
      ciSpecs: ['tests/seller-wizard.spec.ts'],
      runSmokeFn: () => {
        ran += 1;
        return { status: 0 };
      },
    });
    assert.equal(result.mode, 'dry-run');
    assert.equal(ran, 0);
    const body = buildA11yIssueBody(result.scan, result.gaps, result, '2026-09-14T00:00:00Z');
    assert.match(body, /pos-atajos/);
    assert.match(body, /dry-run/);
    assert.match(body, /\/admin\/pos/);
  });

  it('árbol del repo: pos-atajos existe y no está en CI', () => {
    const result = runA11yPosKeyboard();
    const pos = result.scan.surfaces.find((s) => s.id === 'admin-pos');
    assert.ok(pos.specs.includes('pos-atajos.spec.ts'));
    assert.equal(pos.inCi.length, 0);
    const ids = result.gaps.map((g) => g.id);
    assert.ok(ids.includes('pos-atajos-not-in-ci'));
    assert.ok(ids.includes('axe'));
  });
});

describe('E16 runtime endpoint Issue', () => {
  it('parsea fingerprint JSON sin secretos y clasifica PaymentController', () => {
    const parsed = parseFingerprintPayload(JSON.stringify({
      fingerprint: 'PaymentController.timeout',
      culprit: 'PaymentController',
      title: 'timeout en checkout',
      txnId: 'txn-ci-1',
      stripeEventId: 'evt-ci-1',
    }));
    assert.equal(parsed.ok, true);
    assert.equal(parsed.payload.controller, 'PaymentController');
    assert.match(parsed.payload.hints.idempotency, /StripeEvento/);
    assert.equal(classifyController('FacturaController.emitir').name, 'FacturaController');
    assert.match(classifyController('FacturaController').scheduler, /FacturacionContingenciaScheduler/);
    assert.equal(fingerprintMarker('PaymentController.timeout'), 'hotclick-e16-paymentcontroller.timeout');
  });

  it('cron sin token: skip honesto; dispatch con JSON abre item', () => {
    const cron = evaluateRuntimeEndpoint({
      tokenPresent: false,
      eventName: 'schedule',
      pastedRaw: '',
    });
    assert.equal(cron.skipped, true);
    assert.match(cron.reason, /no inventa/);
    assert.equal(eventIsCron('schedule'), true);
    assert.equal(sentryTokenPresent({}), false);

    const pasted = evaluateRuntimeEndpoint({
      tokenPresent: false,
      eventName: 'workflow_dispatch',
      pastedRaw: '{"fingerprint":"WebhookController.sentry","culprit":"WebhookController","title":"firma"}',
    });
    assert.equal(pasted.skipped, false);
    assert.equal(pasted.items[0].controller, 'WebhookController');
    const body = buildRuntimeIssueBody(pasted.items[0], '2026-09-14T00:00:00Z');
    assert.match(body, /Idempotencia/);
    assert.match(body, /WebhookController/);
    assert.doesNotMatch(body, /DataRetentionScheduler/);
  });

  it('JSON inválido en dispatch no se traga; FacturaController enlaza scheduler', () => {
    const bad = evaluateRuntimeEndpoint({
      tokenPresent: false,
      eventName: 'workflow_dispatch',
      pastedRaw: 'not-json',
    });
    assert.equal(bad.skipped, false);
    assert.match(bad.error, /inválido/);
    const factura = evaluateRuntimeEndpoint({
      tokenPresent: false,
      eventName: 'workflow_dispatch',
      pastedRaw: '{"fingerprint":"FacturaController.emitir","controller":"FacturaController","title":"hacienda 503"}',
    });
    const body = buildRuntimeIssueBody(factura.items[0]);
    assert.match(body, /FacturacionContingenciaScheduler/);
    assert.match(body, /consultarPendientes/);
  });

  it('runRuntimeEndpoint skip en cron sin token (no llama Sentry)', async () => {
    const result = await runRuntimeEndpoint({
      env: { GITHUB_EVENT_NAME: 'schedule' },
      eventName: 'schedule',
      pastedRaw: '',
      fetchImpl: async () => {
        throw new Error('no debería llamar Sentry');
      },
    });
    assert.equal(result.verdict.skipped, true);
    assert.match(result.verdict.reason, /SENTRY_TOKEN/);
  });
});
