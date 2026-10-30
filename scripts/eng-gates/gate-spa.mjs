#!/usr/bin/env node
/**
 * E3 Gate SPA — frontend/src exige static/ actualizado o pnpm build en CI.
 */

import {
  SKIP_LABELS,
  appendGithubOutput,
  evaluateSpa,
  findSpaPlaceholdersInDir,
  gitChangedFiles,
  hasLabel,
  isFrontendSrcPath,
  isStaticPath,
} from './lib.mjs';
import { upsertPrComment } from './github.mjs';

const STATIC_DIR = process.env.SPA_STATIC_DIR || 'Hot_click_outlet/src/main/resources/static';

const base = process.env.BASE_SHA;
const head = process.env.HEAD_SHA;
if (!base || !head) {
  console.error('BASE_SHA y HEAD_SHA son obligatorios');
  process.exit(2);
}

// static/ nunca puede llevar los VITE_* de relleno de CI (rompe Clerk/Google en prod).
// Sin bypass por label: corre aunque el gate E3 vaya a skip/pass.
const placeholderHits = findSpaPlaceholdersInDir(STATIC_DIR);
if (placeholderHits.length > 0) {
  const listed = placeholderHits.slice(0, 10).map((h) => `- \`${h.file}\` (${h.markers.join(', ')})`);
  console.error(`::error::E3: static/ contiene VITE_* de relleno de CI en ${placeholderHits.length} archivo(s).`);
  for (const h of placeholderHits.slice(0, 10)) console.error(`  ${h.file}: ${h.markers.join(', ')}`);
  upsertPrComment(
    'hotclick-gate-spa-placeholders',
    [
      '## E3 Gate SPA — placeholders en static/',
      '',
      '**FAIL** — `src/main/resources/static/` contiene valores de relleno de CI (`pk_test_placeholder` / `ci-spa-gate`). Con eso Clerk y Google no funcionan en prod.',
      '',
      ...listed,
      '',
      'Reconstruí `static/` con un build limpio, **sin** ningún `VITE_*` en el entorno: `cd Hot_click_outlet/frontend && env -u VITE_CLERK_PUBLISHABLE_KEY -u VITE_STRIPE_PUBLIC_KEY -u VITE_APP_RELEASE pnpm build` (Node 22, pnpm 11.1.2). Este chequeo no tiene label de bypass.',
    ].join('\n'),
  );
  process.exit(1);
}

const changed = gitChangedFiles(base, head);
const verdict = evaluateSpa({
  frontendSrcChanged: changed.some(isFrontendSrcPath),
  staticChanged: changed.some(isStaticPath),
  skip: hasLabel(process.env.PR_LABELS, SKIP_LABELS.spa),
});

console.log(`E3 SPA: action=${verdict.action} — ${verdict.reason}`);
appendGithubOutput({
  action: verdict.action,
  ok: verdict.ok ? 'true' : 'false',
  reason: verdict.reason,
});

if (verdict.action === 'build') {
  upsertPrComment(
    'hotclick-gate-spa',
    [
      '## E3 Gate SPA',
      '',
      'Cambió `Hot_click_outlet/frontend/src/**` y **no** hay artefactos nuevos en `src/main/resources/static/`.',
      '',
      'CI va a correr `pnpm build` y fallar si `static/` queda stale (Docker **no** buildea React).',
      '',
      'En local: `cd Hot_click_outlet/frontend && pnpm build` y commiteá `src/main/resources/static/`.',
      '',
      `Falso positivo (solo comentarios que no afectan el bundle): label \`${SKIP_LABELS.spa}\`.`,
    ].join('\n'),
  );
}

process.exit(0);
