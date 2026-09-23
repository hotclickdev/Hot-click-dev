#!/usr/bin/env node
/**
 * E5 — Playwright area selection on frontend PRs.
 * Elige specs pos-* / seller-* / checkout-* según path prefixes.
 * Default: dry-run (lista) + smoke si existe y hay browsers.
 * Soft-fail + comentario si no hay deps de browser. No alarga el budget de CI.
 */

import { existsSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { basename, join } from 'node:path';
import {
  CI_E2E_SPECS,
  FRONTEND_TESTS,
  hasLabel,
  REPO_ROOT,
  selectPlaywrightSpecs,
  SKIP_LABELS,
  writeGithubOutput,
} from './ola4-lib.mjs';
import { gitChangedFiles } from './ola2-lib.mjs';
import { upsertPrComment } from './ola2-github.mjs';

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
        const rel = abs.replace(/\\/g, '/').split('/frontend/tests/')[1] || entry.name;
        out.push(rel);
      }
    }
  }
  return out.sort();
}

function gitChangedFilesFromEnv() {
  const base = process.env.BASE_SHA || 'origin/master';
  const head = process.env.HEAD_SHA || 'HEAD';
  try {
    return gitChangedFiles(base, head);
  } catch {
    return [];
  }
}

export function browsersAvailable(cwd = join(REPO_ROOT, 'Hot_click_outlet', 'frontend')) {
  const probe = spawnSync('pnpm', ['exec', 'playwright', 'install', '--dry-run'], {
    cwd,
    encoding: 'utf8',
    timeout: 20_000,
  });
  if (probe.status === 0 && /chromium/i.test(`${probe.stdout}\n${probe.stderr}`)) {
    return /is already installed|up to date/i.test(`${probe.stdout}\n${probe.stderr}`);
  }
  const cached = process.env.PLAYWRIGHT_BROWSERS_PATH
    || join(process.env.HOME || '', '.cache', 'ms-playwright');
  return existsSync(cached);
}

export function buildPrComment(selection, meta) {
  const lines = [
    '## E5 — Playwright area selection',
    '',
    `Áreas: **${selection.areas.join(', ') || '—'}**`,
    `Razón: ${selection.reason}`,
    '',
    '### Specs que correrían',
    '',
  ];
  if (!selection.specs.length) {
    lines.push('_Ninguna spec pos-*/seller-*/checkout-* seleccionada._');
  } else {
    for (const spec of selection.specs) {
      const inCi = CI_E2E_SPECS.some((ci) => ci.endsWith(spec) || ci === `tests/${spec}`);
      lines.push(`- \`${spec}\`${inCi ? ' (ya en `test:e2e:ci`)' : ''}`);
    }
  }
  lines.push(
    '',
    `Modo: **${meta.mode}** · browsers: **${meta.browsers ? 'sí' : 'no'}**`,
    meta.note || '',
    '',
    'No instala browsers por default (budget de CI). `ci.yml` ya corre `test:e2e:ci`.',
    'Marker sticky: `hotclick-e5-playwright-area`.',
  );
  return lines.filter((line) => line !== undefined).join('\n');
}

export function runPlaywrightArea(opts = {}) {
  if (hasLabel(process.env.PR_LABELS, SKIP_LABELS.playwright)) {
    return { skipped: true, selection: { areas: [], specs: [], reason: 'skip' } };
  }
  const changed = opts.changedFiles || gitChangedFilesFromEnv();
  const specNames = opts.specNames || listSpecNames(opts.testDir);
  const selection = selectPlaywrightSpecs(changed, specNames);
  const wantRun = opts.forceRun || process.env.E5_RUN === '1';
  const browsers = opts.browsers != null ? opts.browsers : (wantRun && browsersAvailable());
  const smokeExists = existsSync(join(REPO_ROOT, 'Hot_click_outlet', 'frontend', 'tests', 'smoke.spec.ts'));
  let mode = 'dry-run';
  let note = 'Lista únicamente (sin browsers). Soft-pass.';
  if (wantRun && browsers && selection.specs.length) {
    mode = 'subset';
    note = `Correría ${selection.specs.length} specs (cap ${opts.cap || 4}).`;
  } else if (wantRun && !browsers) {
    mode = 'soft-fail';
    note = 'Sin browser deps — no se instala Playwright Chromium para no romper el budget. Comentario only.';
  } else if (smokeExists && selection.areas.length) {
    note = 'Dry-run + `test:e2e:smoke` existe (`tests/smoke.spec.ts`). No se corre aquí salvo `E5_RUN=1`.';
  }
  return { skipped: false, selection, mode, browsers: Boolean(browsers), note, smokeExists };
}

export function commentSmokeFailure() {
  const body = [
    '## E5 — Playwright smoke falló',
    '',
    'Se subió artifact `e5-playwright-*` (screenshots / report).',
    'Job en soft-fail: no bloquea merge. Revisá el artifact.',
  ].join('\n');
  upsertPrComment('hotclick-e5-playwright-fail', body);
}

function main() {
  if (process.env.E5_COMMENT_FAIL === '1') {
    commentSmokeFailure();
    return;
  }
  const result = runPlaywrightArea();
  if (result.skipped) {
    console.log('E5 playwright-area: skip label');
    writeGithubOutput({ skipped: 'true', specs: '' });
    return;
  }
  const body = buildPrComment(result.selection, {
    mode: result.mode,
    browsers: result.browsers,
    note: result.note,
  });
  console.log(`E5 playwright-area: ${result.selection.specs.join(' ') || '(none)'} [${result.mode}]`);
  upsertPrComment('hotclick-e5-playwright-area', body);
  writeGithubOutput({
    skipped: 'false',
    mode: result.mode,
    areas: result.selection.areas.join(','),
    specs: result.selection.specs.join(' '),
    soft: result.mode === 'soft-fail' || result.mode === 'dry-run' ? 'true' : 'false',
  });
}

if (basename(process.argv[1] || '') === 'playwright-area.mjs') main();
