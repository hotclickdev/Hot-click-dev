#!/usr/bin/env node
/**
 * S9 — Weekly bundle size + lint:ci real (allowlist).
 * No mass-enable eslint. Issue con cobertura del allowlist y chunks over threshold.
 */

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import {
  CHUNK_WARN_BYTES,
  FRONTEND_PKG,
  FRONTEND_ROOT,
  FRONTEND_SRC,
  SKIP_LABELS,
  STATIC_ASSETS,
  evaluateBundleLint,
  hasLabel,
  measureJsChunks,
  parseLintCiAllowlist,
  readRepo,
  walkFiles,
  writeGithubOutput,
} from './ola6-lib.mjs';
import { upsertIssue } from './ola6-github.mjs';

export function loadAllowlist(readFile = readRepo) {
  try {
    const pkg = JSON.parse(readFile('Hot_click_outlet/frontend/package.json') || readFileSync(FRONTEND_PKG, 'utf8'));
    return parseLintCiAllowlist(pkg.scripts?.['lint:ci'] || '');
  } catch {
    return [];
  }
}

export function countSrcFiles(root = FRONTEND_SRC) {
  return walkFiles(root, (_abs, name) => /\.(ts|tsx|js|jsx)$/.test(name)).length;
}

export function runLintCi({ cwd = FRONTEND_ROOT, spawn = spawnSync } = {}) {
  const res = spawn('pnpm', ['lint:ci'], {
    cwd,
    encoding: 'utf8',
    timeout: 180_000,
    env: { ...process.env, CI: 'true' },
  });
  if (res.error?.code === 'ENOENT') {
    return { ok: false, ran: false, output: 'pnpm no disponible' };
  }
  return {
    ok: res.status === 0,
    ran: true,
    output: `${res.stdout || ''}${res.stderr || ''}`.trim().slice(-2500),
  };
}

export function buildS9IssueBody(verdict, { allowlist, chunks, lint, ranAt }) {
  const lines = [
    '## S9 — Weekly bundle + lint:ci',
    '',
    `Última corrida: ${ranAt}`,
    '',
    verdict.reason,
    '',
    '### lint vs lint:ci',
    '',
    '`pnpm lint` = `eslint .` (árbol completo). `pnpm lint:ci` es un **allowlist chico** a propósito.',
    `Allowlist: **${verdict.allowlistCount}** archivos. \`frontend/src\` TS/JS: **${verdict.srcCount}**. Cobertura ≈ **${Math.round(verdict.coverage * 100)}%**.`,
    '',
    'No mass-enable archivos rotos. Extender el allowlist de a uno, con el archivo ya verde.',
    '',
    'Allowlist actual:',
    ...allowlist.map((file) => `- \`${file}\``),
    '',
    `### lint:ci (corrido: ${lint.ran ? 'sí' : 'no'})`,
    '',
    lint.ok ? 'PASS' : 'FAIL — ver output recortado',
    '',
    lint.output ? `\`\`\`\n${lint.output.slice(0, 1200)}\n\`\`\`` : '',
    '',
    `### Chunks en static/assets (umbral ${CHUNK_WARN_BYTES} bytes)`,
    '',
    '| Archivo | bytes | gzip |',
    '| --- | ---: | ---: |',
    ...chunks.slice(0, 15).map((c) => `| \`${c.name}\` | ${c.bytes} | ${c.gzip || '—'} |`),
    '',
  ];
  if (verdict.overChunks.length) {
    lines.push('Sobre umbral:', ...verdict.overChunks.map((c) => `- \`${c.name}\` ${c.bytes} bytes`));
  }
  lines.push(
    '',
    'Medición sobre `src/main/resources/static/` (lo que sirve Spring/Docker). Recordá `pnpm build` si el frontend cambió (E3/D3/E13).',
    'No se abre un PR que active eslint en masa.',
  );
  return lines.filter((line, i, arr) => line !== '' || arr[i - 1] !== '').join('\n');
}

export function runBundleLintCi({
  env = process.env,
  lint,
  chunks,
  allowlist,
  srcCount,
} = {}) {
  if (hasLabel(env.PR_LABELS, SKIP_LABELS.bundle) || env.SKIP_BUNDLE_LINT === '1') {
    return { skipped: true, shouldIssue: false };
  }
  const list = allowlist || loadAllowlist();
  const count = srcCount ?? countSrcFiles();
  const jsChunks = chunks || measureJsChunks(STATIC_ASSETS);
  const lintResult = lint || {
    ok: env.LINT_CI_EXIT !== '1',
    ran: env.LINT_CI_EXIT === '0' || env.LINT_CI_EXIT === '1',
    output: env.LINT_CI_OUTPUT || '',
  };
  const verdict = evaluateBundleLint({
    allowlist: list,
    srcCount: count,
    chunks: jsChunks,
    lintOk: lintResult.ok,
  });
  return {
    skipped: false,
    ...verdict,
    allowlist: list,
    chunks: jsChunks,
    lint: lintResult,
  };
}

function main() {
  const result = runBundleLintCi();
  if (result.skipped) {
    console.log('S9 skip');
    writeGithubOutput({ skipped: 'true' });
    return;
  }
  console.log(`S9 ${result.shouldIssue ? 'ISSUE' : 'OK'} ${result.reason}`);
  writeGithubOutput({
    skipped: 'false',
    issue: result.shouldIssue ? 'true' : 'false',
    over: String(result.overChunks.length),
  });
  upsertIssue({
    title: '[S9] Bundle size + lint:ci allowlist (no mass-enable)',
    marker: 'hotclick-s9-bundle-lint',
    labels: ['eng-agent', 'frontend'],
    body: buildS9IssueBody(result, {
      allowlist: result.allowlist,
      chunks: result.chunks,
      lint: result.lint,
      ranAt: new Date().toISOString(),
    }),
  });
}

if (basename(process.argv[1] || '') === 'bundle-lint-ci.mjs') main();
