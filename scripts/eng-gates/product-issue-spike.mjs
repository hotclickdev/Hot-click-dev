#!/usr/bin/env node
/**
 * E15 — Issue de producto (bug/pago/pos) → comentario spike técnico.
 * Sugiere archivos + test. No implementa el fix.
 */

import { basename } from 'node:path';
import {
  SKIP_LABELS,
  hasLabel,
  mapSpikeFiles,
  shouldSpikeIssue,
  suggestedSpikeTest,
  writeGithubOutput,
} from './ola6-lib.mjs';
import { commentOnIssueOnce } from './ola6-github.mjs';

export function buildSpikeComment(issue, mapping) {
  return [
    '## E15 — Spike técnico (no es el fix)',
    '',
    `Clasificación heurística: **${mapping.kind}**.`,
    '',
    'Archivos sospechosos (punto de partida, no un diagnóstico):',
    ...mapping.files.map((file) => `- \`${file}\``),
    '',
    suggestedSpikeTest(mapping.kind),
    '',
    'Este agente **no** implementa el arreglo ni abre PR. Agregá un test de regresión en el PR que cierre este Issue.',
    'Si el label no aplica, ignorá el comentario o poné `skip-product-spike`.',
  ].join('\n');
}

export function runProductIssueSpike({
  env = process.env,
  issue,
} = {}) {
  if (hasLabel(env.PR_LABELS, SKIP_LABELS.spike) || env.SKIP_PRODUCT_SPIKE === '1') {
    return { skipped: true, commented: false };
  }
  const payload = issue || parseIssueFromEnv(env);
  if (!shouldSpikeIssue(payload)) {
    return { skipped: false, applicable: false, commented: false, reason: 'no es bug/pago/pos' };
  }
  const mapping = mapSpikeFiles({
    title: payload.title,
    labels: payload.labels,
  });
  return {
    skipped: false,
    applicable: true,
    commented: true,
    number: payload.number,
    mapping,
    body: buildSpikeComment(payload, mapping),
  };
}

export function parseIssueFromEnv(env = process.env) {
  const labels = String(env.ISSUE_LABELS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    number: Number(env.ISSUE_NUMBER || 0),
    title: env.ISSUE_TITLE || '',
    labels,
    isPullRequest: env.ISSUE_IS_PR === '1' || env.ISSUE_IS_PR === 'true',
    skip: hasLabel(labels.join(','), SKIP_LABELS.spike),
  };
}

function main() {
  const result = runProductIssueSpike();
  if (result.skipped || !result.applicable) {
    console.log(`E15 ${result.skipped ? 'skip' : 'no-op'} ${result.reason || ''}`);
    writeGithubOutput({ skipped: result.skipped ? 'true' : 'false', applicable: 'false' });
    return;
  }
  console.log(`E15 spike #${result.number} kind=${result.mapping.kind}`);
  writeGithubOutput({ skipped: 'false', applicable: 'true', kind: result.mapping.kind });
  commentOnIssueOnce(result.number, 'hotclick-e15-spike', result.body);
}

if (basename(process.argv[1] || '') === 'product-issue-spike.mjs') main();
