import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateAmenazas,
  evaluatePentest,
  evaluateSeguridadMerge,
  evaluateStripeTests,
  isSuperficieSeguridad,
  scanCopilotTenantArgs,
} from './seguridad-merge.mjs';

const COPILOT = 'Hot_click_outlet/src/main/java/com/hotclick/service/copilot/AiCopilotToolDefinitions.java';
const STRIPE = 'Hot_click_outlet/src/main/java/com/hotclick/service/stripe/StripeWebhookSupport.java';
const PENDIENTE = 'estado: pendiente\nfecha:\nalcance: login, tenant, stripe, copilot\naltos-abiertos:\n';

test('superficie reconoce copilot, stripe y security', () => {
  assert.equal(isSuperficieSeguridad(COPILOT), true);
  assert.equal(isSuperficieSeguridad(STRIPE), true);
  assert.equal(isSuperficieSeguridad('Hot_click_outlet/src/main/java/com/hotclick/security/CompanyScope.java'), true);
  assert.equal(isSuperficieSeguridad('Hot_click_outlet/src/main/java/com/hotclick/service/PedidoService.java'), false);
});

test('amenazas falla si copilot cambia sin el markdown', () => {
  const verdict = evaluateAmenazas([COPILOT]);
  assert.equal(verdict.ok, false);
});

test('amenazas pasa si el markdown va en el mismo diff', () => {
  const verdict = evaluateAmenazas([COPILOT, 'docs/security/amenazas-activas.md']);
  assert.equal(verdict.ok, true);
});

test('stripe sin test nominal falla', () => {
  const verdict = evaluateStripeTests({ changedFiles: [STRIPE], testFiles: ['FooTest.java'] });
  assert.equal(verdict.ok, false);
});

test('stripe con test nominal pasa', () => {
  const verdict = evaluateStripeTests({
    changedFiles: [STRIPE],
    testFiles: ['Hot_click_outlet/src/test/java/com/hotclick/service/stripe/StripeWebhookSupportTest.java'],
  });
  assert.equal(verdict.ok, true);
});

test('tool con empresaId en el JSON falla', () => {
  const verdict = scanCopilotTenantArgs([
    { path: COPILOT, text: 'Map.of("empresaId", Map.of("type", "string"))' },
  ]);
  assert.equal(verdict.ok, false);
});

test('log con empresaId= no es argumento', () => {
  const verdict = scanCopilotTenantArgs([
    { path: COPILOT, text: 'log.warn("[AI] empresaId={} ", empresaId);' },
  ]);
  assert.equal(verdict.ok, true);
});

test('pentest pendiente no bloquea', () => {
  assert.equal(evaluatePentest(PENDIENTE).ok, true);
});

test('vigente incompleto falla', () => {
  const text = 'estado: vigente\nfecha: 2026-10-01\nalcance: login\naltos-abiertos: 2\n';
  assert.equal(evaluatePentest(text, new Date('2026-10-06T00:00:00Z')).ok, false);
});

test('vigente completo pasa', () => {
  const text = 'estado: vigente\nfecha: 2026-10-01\nalcance: login, tenant, stripe, copilot\naltos-abiertos: 0\n';
  assert.equal(evaluatePentest(text, new Date('2026-10-06T00:00:00Z')).ok, true);
});

test('pasada vieja deja de ser vigente', () => {
  const text = 'estado: vigente\nfecha: 2025-01-01\nalcance: login, tenant, stripe, copilot\naltos-abiertos: 0\n';
  assert.equal(evaluatePentest(text, new Date('2026-10-06T00:00:00Z')).ok, false);
});

test('evaluate combina y el label salta el gate', () => {
  const fail = evaluateSeguridadMerge({
    changedFiles: [COPILOT],
    testFiles: [],
    pentestText: PENDIENTE,
    copilotFiles: [],
    skip: false,
  });
  assert.equal(fail.ok, false);
  const skipped = evaluateSeguridadMerge({
    changedFiles: [COPILOT],
    testFiles: [],
    pentestText: 'estado: roto',
    copilotFiles: [{ path: COPILOT, text: '"empresaId"' }],
    skip: true,
  });
  assert.equal(skipped.ok, true);
});
