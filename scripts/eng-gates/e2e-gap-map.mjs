#!/usr/bin/env node
/**
 * S3 — Weekly E2E gap map.
 * Cruza rutas UI críticas vs Playwright *.spec.ts y documenta huecos.
 * Los stubs SKIP van en tests/pending/ (fuera de test:e2e:ci).
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { FRONTEND_TESTS, REPO_ROOT, SKIP_LABELS, hasLabel, writeGithubOutput } from './ola2-lib.mjs';
import { upsertIssue } from './ola2-github.mjs';

export const PRIORITY_ROUTES = [
  {
    id: 'checkout',
    route: '/checkout',
    strong: ['/checkout'],
    specName: /checkout/,
    priority: 'high',
    notes: 'Pago + SINPE + gift card',
  },
  {
    id: 'admin-pos',
    route: '/admin/pos',
    strong: ['/admin/pos'],
    specName: /^pos-/,
    priority: 'high',
    notes: 'POS caja / historial',
  },
  {
    id: 'admin-finanzas',
    route: '/admin/finanzas',
    strong: ['/admin/finanzas'],
    specName: /finanzas/,
    priority: 'high',
    notes: 'Finanzas ENTREGADO',
  },
  {
    id: 'auth-2fa',
    route: '/login (2FA)',
    strong: ['/api/auth/2fa', 'webauthn', 'totp'],
    specName: /2fa/,
    priority: 'high',
    notes: 'Login 2FA email/OTP/WebAuthn',
  },
  {
    id: 'sinpe',
    route: '/checkout SINPE + /api/sinpe',
    strong: ['sinpe/guest-checkout', 'sinpe-flujo'],
    specName: /sinpe-flujo|^sinpe/,
    weak: ['sinpe móvil', 'sinpe'],
    priority: 'high',
    notes: 'Flujo SINPE completo (comprobante, guest)',
  },
  {
    id: 'wallet',
    route: '/admin/billetera',
    strong: ['/admin/billetera'],
    specName: /billetera|wallet/,
    priority: 'high',
    notes: 'Billetera / payouts',
  },
  {
    id: 'hacienda',
    route: '/admin/facturas + /admin/config-fiscal',
    strong: ['/admin/facturas', '/admin/config-fiscal', '/api/hacienda'],
    specName: /hacienda|config-fiscal/,
    priority: 'high',
    notes: 'Hacienda / FE',
  },
  {
    id: 'tenant-ui',
    route: 'UI aislamiento tenant',
    strong: ['crosstenant', 'empresa b', 'tenant isolation', 'otra empresa'],
    specName: /tenant-isolation/,
    priority: 'high',
    notes: 'Un vendedor no ve datos de otra empresa en UI',
  },
];

export const PENDING_STUBS = [
  {
    id: 'sinpe',
    rel: 'Hot_click_outlet/frontend/tests/pending/sinpe-flujo.spec.ts',
    reason: 'SINPE guest + comprobante no está en test:e2e:ci',
  },
  {
    id: 'auth-2fa',
    rel: 'Hot_click_outlet/frontend/tests/pending/auth-2fa.spec.ts',
    reason: '2FA no tiene spec de flujo',
  },
  {
    id: 'tenant-ui',
    rel: 'Hot_click_outlet/frontend/tests/pending/tenant-isolation-ui.spec.ts',
    reason: 'Aislamiento tenant en UI (no solo API)',
  },
];

export function listSpecFiles(testDir = FRONTEND_TESTS) {
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
      if (entry.name.endsWith('.spec.ts')) out.push(abs);
    }
  }
  return out.sort();
}

function specNameOf(abs) {
  const parts = abs.replace(/\\/g, '/').split('/frontend/tests/');
  return parts[1] || basename(abs);
}

function strongHit(spec, route) {
  if (route.specName && route.specName.test(spec.name.replace(/^pending\//, ''))) return true;
  return (route.strong || []).some((token) => spec.text.includes(token.toLowerCase()));
}

function weakHit(spec, route) {
  return (route.weak || []).some((token) => spec.text.includes(token.toLowerCase()));
}

export function mapGaps(specFiles, readFile = (p) => readFileSync(p, 'utf8')) {
  const specs = specFiles.map((abs) => ({
    abs,
    name: specNameOf(abs),
    text: readFile(abs).toLowerCase(),
  }));
  return PRIORITY_ROUTES.map((route) => {
    const pending = specs.filter((spec) => spec.name.startsWith('pending/') && (strongHit(spec, route) || weakHit(spec, route)));
    const liveStrong = specs.filter((spec) => !spec.name.startsWith('pending/') && strongHit(spec, route));
    const liveWeak = specs.filter((spec) => !spec.name.startsWith('pending/') && !strongHit(spec, route) && weakHit(spec, route));
    return {
      ...route,
      covered: liveStrong.length > 0,
      liveSpecs: liveStrong.map((s) => s.name),
      weakSpecs: liveWeak.map((s) => s.name),
      pendingSpecs: pending.map((s) => s.name),
      stubOnly: liveStrong.length === 0 && pending.length > 0,
      inCi: liveStrong.some((spec) => !spec.name.includes('pending')),
    };
  });
}

export function stubStatus(existsFn = existsSync) {
  return PENDING_STUBS.map((stub) => ({
    ...stub,
    exists: existsFn(join(REPO_ROOT, stub.rel)),
  }));
}

export function buildIssueBody(gaps, stubs) {
  const missing = gaps.filter((g) => !g.covered);
  const lines = [
    '## S3 — Weekly E2E gap map',
    '',
    `Rutas prioritarias: **${gaps.length}**. Sin spec viva: **${missing.length}**.`,
    '',
    'CI (`pnpm test:e2e:ci`) solo corre una lista fija de specs. Los stubs viven en `tests/pending/` con `test.describe.skip` y **no** están en esa lista.',
    '',
    '| Ruta | Prioridad | Specs vivas | Stubs | Estado |',
    '| --- | --- | --- | --- | --- |',
  ];
  for (const gap of gaps) {
    const live = gap.liveSpecs.join(', ') || '—';
    const pending = gap.pendingSpecs.join(', ') || '—';
    const estado = gap.covered
      ? 'cubierto'
      : gap.stubOnly
        ? 'solo stub skip'
        : gap.weakSpecs?.length
          ? 'mención débil (no alcanza)'
          : 'sin cobertura';
    lines.push(`| \`${gap.route}\` | ${gap.priority} | ${live} | ${pending} | ${estado} |`);
  }
  lines.push('', '### Stubs prioritarios (1–3)', '');
  for (const stub of stubs) {
    lines.push(`- \`${stub.rel}\` — ${stub.exists ? 'presente' : 'FALTA crear'} — ${stub.reason}`);
  }
  lines.push(
    '',
    'Huecos conocidos de producto: SINPE completo, 2FA, Hacienda FE, wallet/payouts, aislamiento tenant en UI.',
    'No agregar estos stubs a `test:e2e:ci` hasta que dejen de ser skip y no flakeen.',
  );
  return lines.join('\n');
}

export function runGapMap(opts = {}) {
  if (hasLabel(process.env.PR_LABELS, SKIP_LABELS.e2e)) return { skipped: true };
  const specs = opts.specFiles || listSpecFiles();
  const gaps = mapGaps(specs, opts.readFile);
  const stubs = stubStatus(opts.existsFn);
  return { skipped: false, gaps, stubs };
}

function main() {
  const result = runGapMap();
  if (result.skipped) {
    console.log('S3 E2E gap: skip label');
    return;
  }
  const body = buildIssueBody(result.gaps, result.stubs);
  const missing = result.gaps.filter((g) => !g.covered).length;
  console.log(`S3 E2E gap: ${missing} rutas sin spec viva`);
  for (const gap of result.gaps) {
    console.log(`  ${gap.covered ? 'OK' : 'GAP'} ${gap.route} → ${(gap.liveSpecs[0] || gap.pendingSpecs[0] || 'none')}`);
  }
  upsertIssue({
    title: '[S3] Weekly E2E gap map (ola 2)',
    marker: 'hotclick-s3-e2e-gap',
    labels: ['eng-agent', 'e2e-gap'],
    body,
  });
  writeGithubOutput({ missing: String(missing) });
}

if (basename(process.argv[1] || '') === 'e2e-gap-map.mjs') main();
