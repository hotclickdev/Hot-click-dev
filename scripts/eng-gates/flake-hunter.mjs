#!/usr/bin/env node
/**
 * D6 — Daily CI flake hunter.
 * Lee runs recientes de ci.yml (24–48 h) via gh api.
 * Tabla de specs Java/TS que fallaron ≥2 veces y pasaron en otro run.
 * Issue flake + eng-agent. Solo GITHUB_TOKEN.
 */

import { basename } from 'node:path';
import { findFlakySpecs, hasLabel, parseFailedSpecs, SKIP_LABELS, writeGithubOutput } from './ola4-lib.mjs';
import { upsertIssue } from './ola2-github.mjs';
import { gh, hasGhContext } from './ola3-github.mjs';

const CI_WORKFLOW = process.env.CI_WORKFLOW || 'ci.yml';
const LOOKBACK_HOURS = Number(process.env.FLAKE_LOOKBACK_HOURS || 48);

export function listCiRunsViaApi({
  repo = process.env.GITHUB_REPOSITORY,
  sinceIso,
  limit = 40,
  ghFn = gh,
} = {}) {
  if (!repo) return [];
  const created = sinceIso ? `&created=>=${sinceIso}` : '';
  try {
    const raw = ghFn([
      'api',
      `repos/${repo}/actions/workflows/${CI_WORKFLOW}/runs?per_page=${limit}${created}`,
    ]);
    const data = JSON.parse(raw || '{}');
    return (data.workflow_runs || []).map((run) => ({
      id: run.id,
      conclusion: run.conclusion,
      status: run.status,
      createdAt: run.created_at,
      url: run.html_url,
      headSha: run.head_sha,
      displayTitle: run.display_title || run.name,
    }));
  } catch (error) {
    console.warn(`[d6] no se listaron runs: ${error.message}`);
    return [];
  }
}

export function failedLogForRun(runId, { ghFn = gh } = {}) {
  if (!runId) return '';
  try {
    return ghFn(['run', 'view', String(runId), '--log-failed']);
  } catch (error) {
    console.warn(`[d6] log-failed ${runId}: ${error.message}`);
    return '';
  }
}

export function collectRunSpecs(runs, { logForRun = failedLogForRun } = {}) {
  return (runs || []).map((run) => {
    const failedSpecs = run.conclusion === 'failure'
      ? parseFailedSpecs(logForRun(run.id) || '')
      : [];
    const passedSpecs = run.conclusion === 'success' ? [] : [];
    return { ...run, failedSpecs, passedSpecs };
  });
}

export function inferPassesFromSiblings(annotated) {
  const allFailedNames = new Map();
  for (const run of annotated) {
    for (const spec of run.failedSpecs || []) {
      allFailedNames.set(spec.name, spec);
    }
  }
  return annotated.map((run) => {
    if (run.conclusion !== 'success') return run;
    const passedSpecs = [...allFailedNames.values()];
    return { ...run, passedSpecs };
  });
}

export function buildIssueBody(flaky, meta) {
  const lines = [
    '## D6 — Daily CI flake hunter',
    '',
    `Última corrida: ${meta.ranAt}`,
    `Ventana: últimas **${meta.lookbackHours} h** · runs de \`${CI_WORKFLOW}\`: **${meta.runCount}** · flaky: **${flaky.length}**`,
    '',
    'Flaky = falló ≥2 veces **y** pasó en otro run de la ventana. No re-corre tests. Solo `GITHUB_TOKEN`.',
    '',
    '| Spec | Kind | Fallos | Pases | Runs fail |',
    '| --- | --- | ---: | ---: | --- |',
  ];
  if (!flaky.length) {
    lines.push('| — | — | 0 | — | Sin flakes en la ventana |');
  } else {
    for (const item of flaky.slice(0, 40)) {
      lines.push(
        `| \`${item.name}\` | ${item.kind} | ${item.failCount} | ${item.passCount} | ${(item.failRuns || []).slice(0, 5).join(', ')} |`,
      );
    }
  }
  lines.push(
    '',
    'Complementa E7 (comentario en el PR al fallar) y `ci.yml`. No toca pago/auth.',
    `Marker: \`hotclick-d6-flake\`.`,
  );
  return lines.join('\n');
}

export function runFlakeHunter(opts = {}) {
  if (hasLabel(process.env.PR_LABELS, SKIP_LABELS.flake)) {
    return { skipped: true, flaky: [], runs: [] };
  }
  const lookbackHours = opts.lookbackHours ?? LOOKBACK_HOURS;
  const sinceIso = opts.sinceIso || new Date(Date.now() - lookbackHours * 3600 * 1000).toISOString();
  const rawRuns = opts.runs || (hasGhContext() ? listCiRunsViaApi({ sinceIso }) : []);
  const windowed = rawRuns.filter((run) => {
    if (!run.createdAt) return true;
    return new Date(run.createdAt).getTime() >= Date.parse(sinceIso);
  });
  const annotated = inferPassesFromSiblings(
    opts.annotated || collectRunSpecs(windowed, { logForRun: opts.logForRun }),
  );
  const flaky = findFlakySpecs(annotated);
  return { skipped: false, flaky, runs: annotated, lookbackHours };
}

function main() {
  const result = runFlakeHunter();
  if (result.skipped) {
    console.log('D6 flake hunter: skip label');
    return;
  }
  const body = buildIssueBody(result.flaky, {
    ranAt: new Date().toISOString(),
    lookbackHours: result.lookbackHours,
    runCount: result.runs.length,
  });
  console.log(`D6 flake hunter: ${result.flaky.length} specs flaky en ${result.runs.length} runs`);
  for (const item of result.flaky.slice(0, 15)) {
    console.log(`  ${item.kind} ${item.name} fail=${item.failCount} pass=${item.passCount}`);
  }
  upsertIssue({
    title: '[D6] Daily CI flake hunter',
    marker: 'hotclick-d6-flake',
    labels: ['flake', 'eng-agent'],
    body,
  });
  writeGithubOutput({
    flaky: String(result.flaky.length),
    runs: String(result.runs.length),
  });
}

if (basename(process.argv[1] || '') === 'flake-hunter.mjs') main();
