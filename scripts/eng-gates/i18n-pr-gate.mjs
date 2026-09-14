#!/usr/bin/env node
/**
 * E17 — PR gate i18n: misma key en es/en/pt.
 * D7 es el Issue diario del árbol; E17 solo mira el diff del PR y comenta faltantes.
 */

import { execFileSync } from 'node:child_process';
import { basename } from 'node:path';
import {
  REPO_ROOT,
  SKIP_LABELS,
  addedLinesFromDiff,
  evaluateI18nPr,
  extractJsxHardcoded,
  extractTKeys,
  hasLabel,
  i18nApplies,
  keysAddedInLocales,
  readRepo,
  writeGithubOutput,
} from './ola6-lib.mjs';
import { gitChangedFiles } from './ola5-lib.mjs';
import { upsertPrComment } from './ola6-github.mjs';

export function loadLocales(readFile = readRepo) {
  const parse = (code) => {
    try {
      return JSON.parse(readFile(`Hot_click_outlet/frontend/src/i18n/locales/${code}.json`) || '{}');
    } catch {
      return {};
    }
  };
  return { es: parse('es'), en: parse('en'), pt: parse('pt') };
}

export function keysFromAddedJsonLines(lines) {
  const keys = [];
  for (const line of lines) {
    const hit = line.match(/^\s*"([^"]+)"\s*:/);
    if (hit && !['es', 'en', 'pt'].includes(hit[1])) keys.push(hit[1]);
  }
  return keys;
}

export function gitDiff(base, head, path, cwd = REPO_ROOT) {
  try {
    return execFileSync('git', ['diff', `${base}...${head}`, '--', path], {
      encoding: 'utf8',
      cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch {
    return '';
  }
}

export function collectAddedKeys({ changed, locales, beforeLocales, diffFor }) {
  const beforeCount = ['es', 'en', 'pt']
    .reduce((n, code) => n + Object.keys(beforeLocales?.[code] || {}).length, 0);
  const added = new Set(
    beforeCount ? keysAddedInLocales(beforeLocales || {}, locales || {}) : [],
  );
  for (const file of changed) {
    const p = file.replaceAll('\\', '/');
    const diff = diffFor ? diffFor(file) : '';
    const lines = addedLinesFromDiff(diff);
    if (/\/i18n\/locales\/(es|en|pt)\.json$/.test(p)) {
      for (const key of keysFromAddedJsonLines(lines)) added.add(key);
    }
    if (/\.(tsx|jsx)$/.test(p)) {
      for (const key of extractTKeys(lines.join('\n'))) added.add(key);
    }
  }
  return [...added];
}

export function collectHardcoded(changed, diffFor) {
  const texts = [];
  for (const file of changed) {
    if (!/\.(tsx|jsx)$/.test(file.replaceAll('\\', '/'))) continue;
    const diff = diffFor ? diffFor(file) : '';
    texts.push(...extractJsxHardcoded(addedLinesFromDiff(diff).join('\n')));
  }
  return texts.slice(0, 20);
}

export function buildE17Comment(verdict) {
  const lines = [
    '## E17 — i18n PR (es / en / pt)',
    '',
    verdict.ok ? '**PASS**' : '**FAIL** — keys faltantes en algún locale',
    '',
    verdict.reason,
    '',
    'D7 (`i18n-drift.yml`) abre el Issue **diario** del árbol completo. E17 es el gate del **diff**.',
    '',
  ];
  if (verdict.missing.length) {
    lines.push('Keys a completar:', '');
    for (const row of verdict.missing.slice(0, 40)) {
      lines.push(`- \`${row.key}\` — falta en **${row.absent.join(', ')}**`);
    }
    lines.push('');
  }
  if (verdict.hardcodedCount) {
    lines.push(`Aviso: ${verdict.hardcodedCount} string(s) JSX hardcoded en líneas nuevas (no bloquea). Preferí \`t('ns.key')\`.`, '');
  }
  lines.push(`Skip: label \`${SKIP_LABELS.i18nPr}\`.`);
  return lines.join('\n');
}

export function loadLocalesAt(sha, readAt) {
  const parse = (code) => {
    try {
      const raw = readAt
        ? readAt(sha, `Hot_click_outlet/frontend/src/i18n/locales/${code}.json`)
        : gitShowLocale(sha, code);
      return JSON.parse(raw || '{}');
    } catch {
      return {};
    }
  };
  return { es: parse('es'), en: parse('en'), pt: parse('pt') };
}

function gitShowLocale(sha, code) {
  if (!sha) return '{}';
  try {
    return execFileSync(
      'git',
      ['show', `${sha}:Hot_click_outlet/frontend/src/i18n/locales/${code}.json`],
      { encoding: 'utf8', cwd: REPO_ROOT, stdio: ['pipe', 'pipe', 'pipe'] },
    );
  } catch {
    return '{}';
  }
}

export function runI18nPrGate({
  env = process.env,
  changed,
  locales,
  beforeLocales,
  diffFor,
  readAt,
} = {}) {
  if (hasLabel(env.PR_LABELS, SKIP_LABELS.i18nPr) || env.SKIP_I18N_PR === '1') {
    return { skipped: true, ok: true, applicable: false };
  }
  const base = env.BASE_SHA || 'origin/master';
  const head = env.HEAD_SHA || 'HEAD';
  const files = changed || gitChangedFiles(base, head);
  if (!i18nApplies(files)) {
    return { skipped: false, ok: true, applicable: false, reason: 'PR no toca locales ni JSX' };
  }
  const loc = locales || loadLocales();
  const prev = beforeLocales || loadLocalesAt(base, readAt);
  const diff = diffFor || ((file) => gitDiff(base, head, file));
  const addedKeys = collectAddedKeys({
    changed: files,
    locales: loc,
    beforeLocales: prev,
    diffFor: diff,
  });
  const hardcoded = collectHardcoded(files, diff);
  const verdict = evaluateI18nPr({ locales: loc, addedKeys, hardcoded });
  return { skipped: false, applicable: true, ...verdict };
}

function main() {
  const result = runI18nPrGate();
  if (result.skipped || !result.applicable) {
    console.log(`E17 ${result.skipped ? 'skip' : 'no-op'}`);
    writeGithubOutput({ skipped: result.skipped ? 'true' : 'false', applicable: 'false' });
    return;
  }
  const body = buildE17Comment(result);
  console.log(`E17 ${result.ok ? 'PASS' : 'FAIL'} missing=${result.missing.length}`);
  writeGithubOutput({
    skipped: 'false',
    applicable: 'true',
    ok: result.ok ? 'true' : 'false',
    missing: String(result.missing.length),
  });
  upsertPrComment('hotclick-e17-i18n', body);
  if (!result.ok) process.exitCode = 1;
}

if (basename(process.argv[1] || '') === 'i18n-pr-gate.mjs') main();
