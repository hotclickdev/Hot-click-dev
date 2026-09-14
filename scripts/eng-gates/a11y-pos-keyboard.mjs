#!/usr/bin/env node
/**
 * S14 — Weekly a11y + POS keyboard.
 * Dry-run + Issue de huecos (axe, pos-atajos fuera de CI, focus traps).
 * No corre e2e largo por default. Smoke opt-in solo de specs ya en test:e2e:ci.
 */

import { basename, join } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import {
  A11Y_SURFACES,
  CI_E2E_SPECS,
  FOCUS_TRAP_REL,
  FRONTEND_PKG_REL,
  POS_DIR_REL,
  REPO_ROOT,
  SKIP_LABELS,
  WIZARD_DIRS,
  hasLabel,
  listSpecNames,
  matchSurfaceSpecs,
  packageHasAxe,
  readRepo,
  relRepo,
  scanDialogFocusGaps,
  specInCi,
  walkFiles,
  writeGithubOutput,
} from './ola7-lib.mjs';
import { upsertIssue } from './ola7-github.mjs';

function readSourceFiles(relDir) {
  const abs = join(REPO_ROOT, relDir);
  if (!existsSync(abs)) return [];
  return walkFiles(abs, (file) => /\.(tsx|ts)$/.test(file) && !file.endsWith('.test.ts')).map((file) => ({
    path: relRepo(file),
    source: readFileSync(file, 'utf8'),
  }));
}

export function collectA11yScan(opts = {}) {
  const specNames = opts.specNames || listSpecNames();
  const pkgText = opts.pkgJsonText ?? readRepo(FRONTEND_PKG_REL);
  const axe = packageHasAxe(pkgText);
  const hookExists = opts.hookExists ?? Boolean(readRepo(FOCUS_TRAP_REL));
  const posFiles = opts.posFiles || readSourceFiles(POS_DIR_REL);
  const wizardFiles = opts.wizardFiles || WIZARD_DIRS.flatMap(readSourceFiles);
  const posGaps = scanDialogFocusGaps(posFiles);
  const wizardGaps = scanDialogFocusGaps(wizardFiles);
  const surfaces = A11Y_SURFACES.map((surface) => {
    const specs = matchSurfaceSpecs(specNames, surface.specNeedles);
    const inCi = specs.filter((name) => specInCi(name, opts.ciSpecs || CI_E2E_SPECS));
    return { ...surface, specs, inCi };
  });
  return { specNames, axe, hookExists, posGaps, wizardGaps, surfaces };
}

export function a11yGaps(scan) {
  const gaps = [];
  if (!scan.axe) {
    gaps.push({
      id: 'axe',
      detail: 'No hay `axe-core` / `@axe-core/playwright` en package.json del frontend. No se corre axe en CI.',
    });
  }
  const pos = scan.surfaces.find((s) => s.id === 'admin-pos');
  if (!pos?.specs.length) {
    gaps.push({ id: 'pos-keyboard-spec', detail: 'No hay spec de teclado POS (`pos-atajos.spec.ts`).' });
  } else if (!pos.inCi.length) {
    gaps.push({
      id: 'pos-atajos-not-in-ci',
      detail: `\`${pos.specs.join(', ')}\` existe pero **no** está en \`test:e2e:ci\` (evitar e2e largo/flaky en el cron).`,
    });
  }
  if (scan.posGaps.length) {
    gaps.push({
      id: 'pos-focus-trap',
      detail: `Dialogos POS sin \`useFocusTrap\`: ${scan.posGaps.map((g) => `\`${g.path}\``).join(', ')}.`,
    });
  }
  const wizard = scan.surfaces.find((s) => s.id === 'seller-wizard');
  const wizardKeyboard = (wizard?.specs || []).filter((name) => /focus-trap|focustrap|keyboard|a11y/.test(name));
  if (!wizardKeyboard.length) {
    gaps.push({
      id: 'wizard-focus-spec',
      detail: 'Wizard seller no tiene spec de focus trap (hay Escape remap en CI; no cubre Tab cycle).',
    });
  }
  if (scan.wizardGaps.length) {
    gaps.push({
      id: 'wizard-dialog-trap',
      detail: `Dialogos wizard sin trap: ${scan.wizardGaps.map((g) => `\`${g.path}\``).join(', ')}.`,
    });
  } else if (scan.hookExists) {
    gaps.push({
      id: 'wizard-hook-unused',
      detail: '`useFocusTrap` existe (`hooks/useFocusTrap.ts`) pero el wizard no declara dialogos con trap propio.',
    });
  }
  return gaps;
}

export function ciSmokeSpecs(scan, ciSpecs = CI_E2E_SPECS) {
  const names = new Set(scan.surfaces.flatMap((s) => s.specs));
  return ciSpecs
    .map((ci) => ci.replace(/^tests\//, ''))
    .filter((name) => names.has(name) || /seller-wizard|emprendedor-wizard|seller-qa-escape/.test(name));
}

export function buildA11yIssueBody(scan, gaps, meta, ranAt = new Date().toISOString()) {
  const lines = [
    '## S14 — Weekly a11y + POS keyboard',
    '',
    `Última corrida: ${ranAt}`,
    '',
    `Modo: **${meta.mode}** · axe en package: **${scan.axe ? 'sí' : 'no'}** · hook focus trap: **${scan.hookExists ? 'sí' : 'no'}**`,
    '',
    'Preferimos dry-run + Issue. No se instala Chromium en el cron. Smoke opt-in solo de specs **ya** en `test:e2e:ci`.',
    '',
    '### Superficies',
    '',
  ];
  for (const surface of scan.surfaces) {
    lines.push(
      `- **${surface.route}** — specs: ${surface.specs.map((s) => `\`${s}\``).join(', ') || 'ninguna'}; en CI: ${surface.inCi.map((s) => `\`${s}\``).join(', ') || 'ninguna'}. ${surface.notes}`,
    );
  }
  lines.push('', '### Huecos', '');
  if (!gaps.length) {
    lines.push('_Sin huecos heurísticos._');
  } else {
    for (const gap of gaps) lines.push(`- **${gap.id}**: ${gap.detail}`);
  }
  lines.push(
    '',
    '### Qué no hace este agente',
    '',
    '- No corre `pos-atajos.spec.ts` en el cron (no está en `test:e2e:ci`; riesgo de flake).',
    '- No agrega `@axe-core/playwright` al frontend.',
    '- Complementa S3 (mapa E2E) y E5 (subset en PR); no los reemplaza.',
  );
  if (meta.smokeNote) {
    lines.push('', meta.smokeNote);
  }
  return lines.join('\n');
}

export function runA11yPosKeyboard(opts = {}) {
  if (hasLabel(process.env.PR_LABELS, SKIP_LABELS.a11y) || process.env.SKIP_A11Y_POS === '1') {
    return { skipped: true };
  }
  const scan = collectA11yScan(opts);
  const gaps = a11yGaps(scan);
  const wantRun = opts.forceRun || process.env.S14_RUN === '1';
  const smoke = ciSmokeSpecs(scan, opts.ciSpecs);
  let mode = 'dry-run';
  let smokeNote = `Specs CI que un smoke opt-in podría correr: ${smoke.map((s) => `\`${s}\``).join(', ') || 'ninguna'}.`;
  let smokeResult = null;
  if (wantRun && opts.runSmokeFn && smoke.length) {
    mode = 'smoke-ci';
    smokeResult = opts.runSmokeFn(smoke);
    smokeNote = `Smoke CI: exit=${smokeResult.status}. ${smokeNote}`;
  }
  return { skipped: false, scan, gaps, mode, smoke, smokeNote, smokeResult };
}

export function defaultSmokeRunner(specs) {
  const cwd = join(REPO_ROOT, 'Hot_click_outlet', 'frontend');
  const files = specs.map((name) => `tests/${name}`);
  const res = spawnSync('pnpm', ['exec', 'playwright', 'test', ...files], {
    cwd,
    encoding: 'utf8',
    timeout: 8 * 60 * 1000,
  });
  return { status: res.status, stdout: res.stdout, stderr: res.stderr };
}

function main() {
  const result = runA11yPosKeyboard({
    forceRun: process.env.S14_RUN === '1',
    runSmokeFn: process.env.S14_RUN === '1' ? defaultSmokeRunner : undefined,
  });
  if (result.skipped) {
    console.log('S14 a11y/POS: skip');
    return;
  }
  console.log(`S14 a11y/POS: mode=${result.mode} gaps=${result.gaps.length}`);
  const body = buildA11yIssueBody(result.scan, result.gaps, result);
  upsertIssue({
    title: '[S14] a11y + POS keyboard — huecos semanales',
    marker: 'hotclick-s14-a11y-pos',
    labels: ['eng-agent', 'a11y'],
    body,
  });
  writeGithubOutput({
    skipped: 'false',
    mode: result.mode,
    gaps: String(result.gaps.length),
  });
}

if (basename(process.argv[1] || '') === 'a11y-pos-keyboard.mjs') {
  main();
}
