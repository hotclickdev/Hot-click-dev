#!/usr/bin/env node
/**
 * E13 — Push a master: recordatorio pnpm build si frontend/static se tocó.
 * Comenta el commit/SHA con hashes. No force deploy.
 */

import { basename } from 'node:path';
import {
  SKIP_LABELS,
  evaluateSpaPush,
  hasLabel,
  writeGithubOutput,
} from './ola6-lib.mjs';
import {
  FRONTEND_SRC,
  STATIC_DIR,
  gitLatestCommitMeta,
  gitTreeHash,
} from './ola3-lib.mjs';
import { commentOnCommit } from './ola6-github.mjs';

export function collectPushSignals(opts = {}) {
  return {
    frontendMeta: opts.frontendMeta || gitLatestCommitMeta(FRONTEND_SRC),
    staticMeta: opts.staticMeta || gitLatestCommitMeta(STATIC_DIR),
    frontendTree: opts.frontendTree ?? gitTreeHash(FRONTEND_SRC),
    staticTree: opts.staticTree ?? gitTreeHash(STATIC_DIR),
    commitSha: opts.commitSha || process.env.HEAD_SHA || process.env.GITHUB_SHA || '',
  };
}

export function buildCommitComment(verdict) {
  const short = (sha) => (sha ? sha.slice(0, 7) : '—');
  return [
    '## E13 — Recordatorio SPA / `pnpm build`',
    '',
    verdict.stale ? '**static/ puede estar desactualizado vs frontend/src**' : '**static/ parece al día**',
    '',
    verdict.reason,
    '',
    '| Señal | valor |',
    '| --- | --- |',
    `| commit | \`${short(verdict.commitSha)}\` |`,
    `| frontend/src SHA | \`${short(verdict.frontendSha)}\` |`,
    `| static/ SHA | \`${short(verdict.staticSha)}\` |`,
    `| frontend tree | \`${short(verdict.frontendTree)}\` |`,
    `| static tree | \`${short(verdict.staticTree)}\` |`,
    '',
    'Si tocaste React: `cd Hot_click_outlet/frontend && pnpm build` y commiteá `src/main/resources/static/`.',
    'La imagen Docker **no** compila el frontend. Este comentario **no** dispara deploy.',
    '',
    'Complementa **E3** (gate de PR) y **D3** (Issue diario). Marker: `hotclick-e13-spa-push`.',
  ].join('\n');
}

export function runSpaPushReminder({ env = process.env, signals } = {}) {
  if (hasLabel(env.PR_LABELS, SKIP_LABELS.spaPush) || env.SKIP_SPA_PUSH === '1') {
    return { skipped: true };
  }
  const collected = signals || collectPushSignals({ commitSha: env.HEAD_SHA || env.GITHUB_SHA });
  const verdict = evaluateSpaPush(collected);
  return { skipped: false, ...verdict };
}

function main() {
  const result = runSpaPushReminder();
  if (result.skipped) {
    console.log('E13 skip');
    writeGithubOutput({ skipped: 'true' });
    return;
  }
  const body = buildCommitComment(result);
  console.log(`E13 stale=${result.stale} sha=${(result.commitSha || '').slice(0, 7)}`);
  writeGithubOutput({ skipped: 'false', stale: result.stale ? 'true' : 'false' });
  commentOnCommit(result.commitSha, `${body}\n\n<!-- hotclick-e13-spa-push -->\n`);
}

if (basename(process.argv[1] || '') === 'spa-push-reminder.mjs') main();
