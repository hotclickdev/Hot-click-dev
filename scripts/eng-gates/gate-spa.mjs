#!/usr/bin/env node
/**
 * E3 Gate SPA — frontend/src exige static/ actualizado o pnpm build en CI.
 */

import {
  SKIP_LABELS,
  appendGithubOutput,
  evaluateSpa,
  gitChangedFiles,
  hasLabel,
  isFrontendSrcPath,
  isStaticPath,
} from './lib.mjs';
import { upsertPrComment } from './github.mjs';

const base = process.env.BASE_SHA;
const head = process.env.HEAD_SHA;
if (!base || !head) {
  console.error('BASE_SHA y HEAD_SHA son obligatorios');
  process.exit(2);
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
