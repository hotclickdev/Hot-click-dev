/**
 * Helpers de ola 7 (D12 real health / S14 a11y+POS / E16 runtime endpoints).
 * Reusa olas 1–5 en master. No importa archivos de #60 (ola 6).
 * No toca pago/auth ni schedulers de negocio.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  FRONTEND_SRC,
  FRONTEND_TESTS,
  REPO_ROOT,
  hasLabel,
  redactSecrets,
  relRepo,
  walkFiles,
} from './ola2-lib.mjs';
import { writeGithubOutput } from './ola3-lib.mjs';
import { CI_E2E_SPECS } from './ola4-lib.mjs';

export {
  CI_E2E_SPECS,
  FRONTEND_SRC,
  FRONTEND_TESTS,
  REPO_ROOT,
  hasLabel,
  redactSecrets,
  relRepo,
  walkFiles,
  writeGithubOutput,
};

export const SKIP_LABELS = {
  health: 'skip-real-health',
  a11y: 'skip-a11y-pos',
  runtime: 'skip-runtime-endpoint',
};

export const DEFAULT_HEALTH_URL = 'https://hot-click-dev.onrender.com/api/health';
export const HEALTH_CONTROLLER_REL =
  'Hot_click_outlet/src/main/java/com/hotclick/controller/HealthController.java';
export const APP_PROPS_REL = 'Hot_click_outlet/src/main/resources/application.properties';
export const FRONTEND_PKG_REL = 'Hot_click_outlet/frontend/package.json';
export const POS_DIR_REL = 'Hot_click_outlet/frontend/src/pages/admin/pos';
export const WIZARD_DIRS = [
  'Hot_click_outlet/frontend/src/prototipo/compartido',
  'Hot_click_outlet/frontend/src/pages/admin/nuevo-producto',
];
export const FOCUS_TRAP_REL = 'Hot_click_outlet/frontend/src/hooks/useFocusTrap.ts';

export const CRITICAL_CONTROLLERS = [
  {
    name: 'PaymentController',
    endpointHint: '/api/payments',
    idempotency: 'StripeEvento.stripe_event_id (hot_click_stripe_evento_tb) + txn id del proveedor',
    scheduler: null,
  },
  {
    name: 'WebhookController',
    endpointHint: '/api/webhooks',
    idempotency: 'StripeEvento / id de evento inbound; no reprocesar el mismo payload',
    scheduler: null,
  },
  {
    name: 'FacturaController',
    endpointHint: '/api/facturas',
    idempotency: 'ComprobanteFiscal + cola offline (FOR UPDATE SKIP LOCKED)',
    scheduler: 'FacturacionContingenciaScheduler.procesarColaFacturacionOffline (ShedLock procesarColaFacturacionOffline); FacturacionService.consultarPendientes',
  },
];

export const A11Y_SURFACES = [
  {
    id: 'admin-pos',
    route: '/admin/pos',
    specNeedles: [/pos-atajos/, /pos-.*keyboard/, /a11y.*pos/],
    notes: 'Atajos F2/F4/F8 y dialogos de caja',
  },
  {
    id: 'seller-wizard',
    route: 'wizard seller (emprendedor/pyme/negocio-plus + producto)',
    specNeedles: [/seller-wizard/, /emprendedor-wizard/, /seller-qa-escape/, /focus-trap/, /focustrap/],
    notes: 'Focus trap / Escape en pasos del wizard',
  },
];

export function readRepo(relPath) {
  const abs = join(REPO_ROOT, relPath);
  return existsSync(abs) ? readFileSync(abs, 'utf8') : '';
}

export function formatHttpStatus(status) {
  const n = Number(status);
  return Number.isFinite(n) ? String(n) : '000';
}

export function snippetBody(raw, max = 400) {
  const clean = redactSecrets(String(raw || '')).replace(/\s+/g, ' ').trim();
  if (!clean) return '(cuerpo vacío)';
  return clean.length <= max ? clean : `${clean.slice(0, max)}…`;
}

export function tryJson(text) {
  try {
    return JSON.parse(String(text || ''));
  } catch {
    return null;
  }
}

export function looksLikeHtml(body) {
  return /<!doctype html|<html[\s>]/i.test(String(body || ''));
}

export function jsonHealthFlag(body) {
  const json = tryJson(String(body || '').trim());
  if (!json || typeof json !== 'object') return null;
  const flag = String(json.status || json.health || '').toUpperCase();
  return flag || '';
}

export function isHealthyResponse(status, body) {
  if (Number(status) !== 200) return false;
  const trimmed = String(body || '').trim();
  if (!trimmed) return false;
  if (looksLikeHtml(trimmed)) return false;
  const flag = jsonHealthFlag(trimmed);
  if (flag && !['UP', 'OK', 'HEALTHY'].includes(flag)) return false;
  return true;
}

export function evaluateRealHealth({ currentOk, previousOk }) {
  const consecutiveFails = currentOk === false && previousOk === false;
  return {
    currentOk: Boolean(currentOk),
    previousOk,
    consecutiveFails,
    openOutage: consecutiveFails,
    recovered: currentOk === true && previousOk === false,
  };
}

export function isCosmeticHealthSource(javaSource) {
  const src = String(javaSource || '');
  if (!src.includes('/health')) return false;
  const alwaysUp = /["']status["']\s*,\s*["']UP["']/.test(src);
  const checksDb = /DataSource|jdbcTemplate|entityManager|SELECT 1/i.test(src);
  return alwaysUp && !checksDb;
}

export function actuatorDocumentedAbsent(propsText) {
  return /spring-boot-starter-actuator NO está instalado/i.test(String(propsText || ''));
}

export function resolveHealthTargets(env = process.env, propsText = '') {
  const primary = String(env.HEALTH_URL || '').trim() || DEFAULT_HEALTH_URL;
  const secondary = String(env.HEALTH_SECONDARY_URL || '').trim();
  return {
    primary,
    secondary: secondary || null,
    actuatorAbsent: actuatorDocumentedAbsent(propsText),
    inventedActuator: false,
  };
}

export function packageHasAxe(pkgJsonText) {
  const json = tryJson(pkgJsonText);
  if (!json) return false;
  const deps = { ...(json.dependencies || {}), ...(json.devDependencies || {}) };
  return Object.keys(deps).some((name) => /axe-core|@axe-core\//i.test(name));
}

export function specInCi(specName, ciSpecs = CI_E2E_SPECS) {
  const name = String(specName || '').replace(/^tests\//, '');
  return ciSpecs.some((ci) => ci.replace(/^tests\//, '') === name || ci.endsWith(specName));
}

export function listSpecNames(testDir = FRONTEND_TESTS) {
  if (!existsSync(testDir)) return [];
  const out = [];
  const stack = [testDir];
  while (stack.length) {
    const dir = stack.pop();
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const abs = join(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push(abs);
        continue;
      }
      if (entry.name.endsWith('.spec.ts')) {
        out.push(abs.replace(/\\/g, '/').split('/frontend/tests/')[1] || entry.name);
      }
    }
  }
  return out.sort();
}

export function matchSurfaceSpecs(specNames, needles) {
  return specNames.filter((name) => needles.some((re) => re.test(name)));
}

export function fileHasDialog(source) {
  return /aria-modal\s*=\s*\{?["']true["']\}?|role=["']dialog["']/.test(String(source || ''));
}

export function fileUsesFocusTrap(source) {
  return /useFocusTrap\s*\(/.test(String(source || ''));
}

export function scanDialogFocusGaps(files) {
  const gaps = [];
  for (const file of files || []) {
    if (!fileHasDialog(file.source)) continue;
    if (fileUsesFocusTrap(file.source)) continue;
    gaps.push({ path: file.path, lineHint: 'dialog sin useFocusTrap' });
  }
  return gaps;
}

export function classifyController(text) {
  const blob = String(text || '');
  return CRITICAL_CONTROLLERS.find((item) => blob.includes(item.name)) || null;
}

export function fingerprintMarker(fingerprint) {
  const safe = String(fingerprint || 'unknown')
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return `hotclick-e16-${safe || 'unknown'}`;
}

export function parseFingerprintPayload(raw) {
  if (raw == null || String(raw).trim() === '') {
    return { ok: false, error: 'JSON vacío', payload: null };
  }
  const json = tryJson(raw);
  if (!json || typeof json !== 'object' || Array.isArray(json)) {
    return { ok: false, error: 'JSON inválido (objeto esperado)', payload: null };
  }
  const controller = classifyController(
    [json.controller, json.culprit, json.title, json.fingerprint].filter(Boolean).join(' '),
  );
  const fingerprint = String(json.fingerprint || json.culprit || controller?.name || '').trim();
  if (!fingerprint) {
    return { ok: false, error: 'Falta fingerprint/culprit/controller', payload: null };
  }
  return {
    ok: true,
    error: '',
    payload: {
      fingerprint: redactSecrets(fingerprint).slice(0, 120),
      title: redactSecrets(json.title || fingerprint).slice(0, 160),
      culprit: redactSecrets(json.culprit || '').slice(0, 160),
      controller: controller?.name || redactSecrets(json.controller || '').slice(0, 80),
      endpoint: redactSecrets(json.endpoint || controller?.endpointHint || '').slice(0, 120),
      txnId: redactSecrets(json.txnId || json.transactionId || '').slice(0, 80),
      stripeEventId: redactSecrets(json.stripeEventId || json.eventId || '').slice(0, 80),
      level: redactSecrets(json.level || 'error').slice(0, 20),
      hints: controller,
    },
  };
}

export function sentryQueryControllers() {
  return 'is:unresolved (PaymentController OR WebhookController OR FacturaController)';
}

export function eventIsCron(eventName) {
  return String(eventName || '') === 'schedule';
}

export function sentryTokenPresent(env = process.env) {
  return Boolean(String(env.SENTRY_TOKEN || env.SENTRY_AUTH_TOKEN || '').trim());
}
