#!/usr/bin/env node
/**
 * D3 — Daily SPA static/ vs frontend/src.
 * Issue spa-stale si React cambió sin evidencia de rebuild en static/.
 */

import { basename } from 'node:path';
import {
  FRONTEND_SRC,
  SKIP_LABELS,
  STATIC_DIR,
  evaluateSpaStale,
  gitLatestCommitMeta,
  gitTreeHash,
  hasLabel,
  writeGithubOutput,
} from './ola3-lib.mjs';
import { upsertIssue } from './ola3-github.mjs';

export function collectSpaSignals(opts = {}) {
  const frontendMeta = opts.frontendMeta || gitLatestCommitMeta(FRONTEND_SRC);
  const staticMeta = opts.staticMeta || gitLatestCommitMeta(STATIC_DIR);
  const frontendTree = opts.frontendTree ?? gitTreeHash(FRONTEND_SRC);
  const staticTree = opts.staticTree ?? gitTreeHash(STATIC_DIR);
  return { frontendMeta, staticMeta, frontendTree, staticTree };
}

export function runSpaStale(opts = {}) {
  if (hasLabel(process.env.PR_LABELS, SKIP_LABELS.spa)) {
    return { skipped: true, stale: false };
  }
  const signals = collectSpaSignals(opts);
  const verdict = evaluateSpaStale(signals);
  return { skipped: false, ...signals, ...verdict };
}

export function buildIssueBody(result, ranAt = new Date().toISOString()) {
  const fe = result.frontendMeta;
  const st = result.staticMeta;
  const lines = [
    '## D3 — Daily SPA static vs React source',
    '',
    `Última corrida: ${ranAt}`,
    '',
    'Complementa **E3** (gate de PR que corre `pnpm build`). D3 es el heartbeat diario del árbol en `master`.',
    'La imagen Docker **no** compila React: prod sirve `src/main/resources/static/`.',
    '',
    '| Señal | frontend/src | static/ |',
    '| --- | --- | --- |',
    `| SHA | \`${fe?.sha || '—'}\` | \`${st?.sha || '—'}\` |`,
    `| unix mtime (commit) | ${fe?.ts || '—'} | ${st?.ts || '—'} |`,
    `| tree hash | \`${result.frontendTree || '—'}\` | \`${result.staticTree || '—'}\` |`,
    `| subject | ${fe?.subject || '—'} | ${st?.subject || '—'} |`,
    '',
    result.stale ? `**STALE** — ${result.reason}` : `**OK** — ${result.reason}`,
    '',
  ];
  if (result.stale) {
    lines.push(
      'Reconstrucción: `cd Hot_click_outlet/frontend && pnpm build` y commiteá `Hot_click_outlet/src/main/resources/static/`.',
      'No hay deploy automático de JS desde este agente.',
    );
  }
  return lines.join('\n');
}

function main() {
  const result = runSpaStale();
  if (result.skipped) {
    console.log('D3 SPA stale: skip label');
    return;
  }
  const body = buildIssueBody(result);
  console.log(`D3 SPA stale: ${result.stale ? 'STALE' : 'OK'} — ${result.reason}`);
  if (result.stale) {
    upsertIssue({
      title: '[D3] spa-stale frontend/src vs static/',
      marker: 'hotclick-d3-spa-stale',
      labels: ['spa-stale', 'eng-agent'],
      body,
    });
  } else {
    upsertIssue({
      title: '[D3] spa-stale frontend/src vs static/',
      marker: 'hotclick-d3-spa-stale',
      labels: ['spa-stale', 'eng-agent'],
      body,
    });
  }
  writeGithubOutput({
    stale: result.stale ? 'true' : 'false',
    reason: result.reason,
  });
}

if (basename(process.argv[1] || '') === 'spa-stale.mjs') {
  main();
}
