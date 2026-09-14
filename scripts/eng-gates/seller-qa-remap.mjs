#!/usr/bin/env node
/**
 * E12 — Seller QA remap on PR.
 * Default: dry-run del mapa de specs (hotclick-seller-qa). Smoke opcional.
 * Comenta si se rompe el mapa de rutas /emprendedor|/pyme|/negocio-plus.
 */

import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import {
  REPO_ROOT,
  SKIP_LABELS,
  evaluateSellerQa,
  gitChangedFiles,
  hasLabel,
  isSellerTouchPath,
  readRepo,
  writeGithubOutput,
} from './ola5-lib.mjs';
import { upsertPrComment } from './ola5-github.mjs';

const APP_ROUTES = 'Hot_click_outlet/frontend/src/app/AppRoutes.tsx';
const PLAN_PATHS = 'Hot_click_outlet/frontend/src/utils/planPaths.ts';
const SKILL = '.cursor/skills/hotclick-seller-qa/SKILL.md';

export function buildSellerComment(verdict) {
  const lines = [
    '## E12 — Seller QA remap',
    '',
    verdict.ok ? '**PASS**' : '**FAIL** — mapa de rutas seller',
    '',
    verdict.reason,
    '',
  ];
  if (verdict.specs?.length) {
    lines.push('Specs (skill `hotclick-seller-qa`):', '');
    for (const spec of verdict.specs) lines.push(`- \`${spec}\``);
    lines.push('');
  }
  if (verdict.dryRun !== false) {
    lines.push(
      'Modo **dry-run** (default): no instala browsers ni corre Playwright.',
      'Dispatch / `E12_SMOKE=1` corre un smoke acotado de esas specs.',
      '',
    );
  }
  if (verdict.broken?.length) {
    lines.push('Rutas rotas:', '');
    for (const item of verdict.broken) lines.push(`- ${item}`);
    lines.push('');
  }
  lines.push(
    'Mapa: `/emprendedor` · `/pyme` · `/negocio-plus`; Emp anida `opciones/*`; POS seller → `/admin/pos`.',
    `\`${SKILL}\` presente: ${readRepo(SKILL) ? 'sí' : 'no (se usa el mapa embebido)'}`,
  );
  return lines.join('\n');
}

export function runSellerSmoke(specs, { cwd = join(REPO_ROOT, 'Hot_click_outlet', 'frontend') } = {}) {
  if (!specs?.length) return { ok: true, detail: 'sin specs' };
  const args = ['exec', 'playwright', 'test', ...specs, '--reporter=list'];
  const res = spawnSync('pnpm', args, {
    cwd,
    encoding: 'utf8',
    timeout: 180_000,
    env: { ...process.env, CI: 'true' },
  });
  return {
    ok: res.status === 0,
    detail: (res.stdout || res.stderr || '').split('\n').slice(-20).join('\n'),
  };
}

export function runSellerQaRemap({
  env = process.env,
  changed,
  smoke = env.E12_SMOKE === '1' || env.E12_SMOKE === 'true',
} = {}) {
  if (hasLabel(env.PR_LABELS, SKIP_LABELS.sellerQa)) {
    console.log(`E12 skip: ${SKIP_LABELS.sellerQa}`);
    writeGithubOutput({ skipped: 'true', ok: 'true' });
    return { skipped: true, ok: true };
  }
  const base = env.BASE_SHA;
  const head = env.HEAD_SHA;
  const files = changed || (base && head ? gitChangedFiles(base, head) : []);
  if (!files.some(isSellerTouchPath)) {
    console.log('E12 PASS — PR no toca prototipo/seller wizard.');
    writeGithubOutput({ skipped: 'false', applicable: 'false', ok: 'true' });
    return { applicable: false, ok: true };
  }
  const verdict = evaluateSellerQa({
    changedFiles: files,
    appRoutes: readRepo(APP_ROUTES),
    planPaths: readRepo(PLAN_PATHS),
    smoke,
  });
  if (smoke && verdict.applicable && verdict.ok) {
    const ran = runSellerSmoke(verdict.specs);
    verdict.ok = ran.ok;
    verdict.dryRun = false;
    verdict.reason = ran.ok
      ? `${verdict.reason} Smoke OK.`
      : `Smoke FAIL:\n${ran.detail}`;
  }
  console.log(`E12 ${verdict.ok ? 'PASS' : 'FAIL'} — ${verdict.reason}`);
  writeGithubOutput({
    skipped: 'false',
    applicable: 'true',
    ok: verdict.ok ? 'true' : 'false',
    dry_run: verdict.dryRun !== false ? 'true' : 'false',
  });
  upsertPrComment('hotclick-e12-seller-qa', buildSellerComment(verdict));
  return verdict;
}

const isMain = process.argv[1] && process.argv[1].endsWith('seller-qa-remap.mjs');
if (isMain) {
  const verdict = runSellerQaRemap();
  process.exit(verdict?.ok === false ? 1 : 0);
}
