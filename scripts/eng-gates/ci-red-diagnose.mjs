#!/usr/bin/env node
/**
 * E7 — CI red diagnosis.
 * Comenta el PR/commit con job fallido + ~30 líneas del log + hint flake vs regresión.
 * Dedup via marker sticky.
 */

import { basename } from 'node:path';
import {
  SKIP_LABELS,
  classifyFlake,
  hasLabel,
  redactSecrets,
  tailLines,
  writeGithubOutput,
} from './ola3-lib.mjs';
import {
  failedJobs,
  failedRunLog,
  findPrForSha,
  listWorkflowRuns,
  upsertPrComment,
  upsertPrCommentOn,
} from './ola3-github.mjs';

export function pickFailedJobName(jobs, logText) {
  if (jobs?.length) return jobs[0].name || jobs[0].displayName || 'unknown';
  const match = String(logText || '').match(/^(\S.+)\t/m);
  return match ? match[1].trim() : 'CI';
}

export function buildDiagnosis({
  jobName,
  logTail,
  hint,
  runUrl,
  sha,
  conclusion,
}) {
  return [
    '## E7 — CI red diagnosis',
    '',
    `**Job:** \`${jobName}\``,
    `**SHA:** \`${sha || '—'}\``,
    `**Conclusion:** \`${conclusion || 'failure'}\``,
    runUrl ? `**Run:** ${runUrl}` : '',
    '',
    `**Señal:** ${hint.kind} — ${hint.hint}`,
    '',
    '### Últimas ~30 líneas del log fallido',
    '',
    '```',
    redactSecrets(logTail || '(sin log)'),
    '```',
    '',
    'Comentario sticky (dedup `hotclick-e7-ci-red`). No re-corre tests. No toca pago/auth.',
  ].filter((line) => line !== '').join('\n');
}

export function runDiagnosis(opts = {}) {
  if (hasLabel(process.env.PR_LABELS, SKIP_LABELS.ciRed)) {
    return { skipped: true };
  }
  const runId = opts.runId || process.env.TARGET_RUN_ID;
  const sha = opts.sha || process.env.TARGET_SHA || '';
  const conclusion = opts.conclusion || process.env.TARGET_CONCLUSION || 'failure';
  const runUrl = opts.runUrl || process.env.TARGET_RUN_URL || '';
  const jobs = opts.jobs || (runId ? failedJobs(runId) : []);
  const rawLog = opts.logText != null ? opts.logText : (runId ? failedRunLog(runId) : '');
  const logTail = tailLines(rawLog, 30);
  const jobName = pickFailedJobName(jobs, rawLog);
  const masterRuns = opts.masterRuns || listWorkflowRuns({ workflow: 'CI — Tests y Build', branch: 'master', limit: 6 });
  const masterFailedSameJob = masterRuns.some((run) => {
    if (run.conclusion !== 'failure') return false;
    if (opts.masterFailedJobs) {
      return opts.masterFailedJobs.includes(jobName);
    }
    return true;
  }) && masterRuns.some((run) => run.conclusion === 'failure');
  const masterLastGreen = masterRuns[0]?.conclusion === 'success';
  const hint = classifyFlake({
    failedJob: jobName,
    masterFailedSameJob: Boolean(masterFailedSameJob && masterRuns.some((r) => r.conclusion === 'failure')),
    masterLastGreen,
  });
  return {
    skipped: false,
    jobName,
    logTail,
    hint,
    runUrl,
    sha,
    conclusion,
    prNumber: opts.prNumber || process.env.PR_NUMBER || findPrForSha(sha)?.number,
  };
}

function main() {
  const conclusion = process.env.TARGET_CONCLUSION || 'failure';
  if (conclusion !== 'failure') {
    console.log(`E7: run conclusion=${conclusion} — no-op`);
    return;
  }
  const result = runDiagnosis();
  if (result.skipped) {
    console.log('E7 CI red: skip label');
    return;
  }
  const body = buildDiagnosis(result);
  console.log(`E7 CI red: job=${result.jobName} kind=${result.hint.kind} pr=${result.prNumber || '-'}`);
  if (result.prNumber) {
    upsertPrCommentOn(result.prNumber, 'hotclick-e7-ci-red', body);
  } else if (process.env.PR_NUMBER) {
    upsertPrComment('hotclick-e7-ci-red', body);
  } else {
    console.log('E7: sin PR asociado; se imprime el diagnóstico:');
    console.log(body);
  }
  writeGithubOutput({
    job: result.jobName,
    kind: result.hint.kind,
    pr: String(result.prNumber || ''),
  });
}

if (basename(process.argv[1] || '') === 'ci-red-diagnose.mjs') {
  main();
}
