#!/usr/bin/env node
/**
 * D10 — Daily Issues/PRs hygiene.
 * Labels Dependabot deps-major / deps-patch / stale.
 * Comenta riesgo won't-merge en Spring Boot 4 / jjwt major / stripe major si no está label.
 * Issues eng-agent: comenta primero; no cierra bugs de producto.
 */

import {
  D10_PING_MARKER,
  DEFAULT_CLOSE_AFTER_DAYS,
  DEFAULT_STALE_DAYS,
  SKIP_LABELS,
  classifyHygienePr,
  evaluateEngAgentIssue,
  hasLabel,
  writeGithubOutput,
} from './ola5-lib.mjs';
import {
  addLabelsToPr,
  closeIssue,
  commentOnIssue,
  listOpenDependabotPrs,
  listOpenEngAgentIssues,
  upsertPrCommentOn,
} from './ola5-github.mjs';

export function wontMergeComment(row) {
  return [
    '## D10 — Dependabot hygiene',
    '',
    `**won't-merge risk** (sin label de bloqueo): \`${row.title}\`.`,
    '',
    'Spring Boot 4.x / major de `jjwt-*` / major de `stripe*` no se mergean a ciegas.',
    'Pedí review humano. D10 agrega `deps-major` y no habilita auto-merge.',
    '',
    'Complementa E6 (PR) y S2 (semanal); no quita `needs-human` si ya está.',
  ].join('\n');
}

export function staleIssueComment() {
  return [
    '## D10 — Issue eng-agent stale',
    '',
    'Este Issue de agente lleva más de N días sin movimiento.',
    '¿Sigue aplicando? Comentá, asignalo o cerralo.',
    '',
    'D10 **no** cierra en este paso. Si no hay acción, un cron posterior puede cerrarlo',
    '(solo `eng-agent`, nunca bugs `prod-errors` / `outage` / `bug`).',
    '',
    `<!-- ${D10_PING_MARKER} -->`,
  ].join('\n');
}

export function closeIssueComment() {
  return [
    '## D10 — cierre de Issue eng-agent stale',
    '',
    'Se pidió acción y no hubo movimiento. Cierre automático **solo** de Issues `eng-agent`.',
    'Si era un bug de producto, reabrí y quitá `eng-agent` o agregá `bug`.',
    '',
    `<!-- ${D10_PING_MARKER} -->`,
  ].join('\n');
}

export function runHygiene({
  env = process.env,
  now = new Date(),
  listPrs = listOpenDependabotPrs,
  listIssues = listOpenEngAgentIssues,
  labelPr = addLabelsToPr,
  commentPr = upsertPrCommentOn,
  pingIssue = commentOnIssue,
  close = closeIssue,
} = {}) {
  if (hasLabel(env.PR_LABELS, SKIP_LABELS.hygiene) || env.SKIP_ISSUES_HYGIENE === '1') {
    console.log(`D10 skip: ${SKIP_LABELS.hygiene}`);
    writeGithubOutput({ skipped: 'true' });
    return { skipped: true, prs: [], issues: [] };
  }
  const staleDays = Number(env.D10_STALE_DAYS || DEFAULT_STALE_DAYS);
  const closeAfterDays = Number(env.D10_CLOSE_AFTER_DAYS || DEFAULT_CLOSE_AFTER_DAYS);
  const prs = listPrs().map((pr) => classifyHygienePr(pr, { now, staleDays }));
  for (const row of prs) {
    if (row.addLabels.length) labelPr(row.number, row.addLabels);
    if (row.commentWontMerge) {
      commentPr(row.number, 'hotclick-d10-wont-merge', wontMergeComment(row));
    }
    console.log(`D10 PR #${row.number} bump=${row.bump} stale=${row.stale} labels+${row.addLabels.join(',')}`);
  }
  const issues = listIssues().map((issue) => ({
    issue,
    verdict: evaluateEngAgentIssue(issue, { now, staleDays, closeAfterDays }),
  }));
  for (const row of issues) {
    if (row.verdict.action === 'comment') {
      pingIssue(row.issue.number, staleIssueComment());
    }
    if (row.verdict.action === 'close') {
      close(row.issue.number, closeIssueComment());
    }
    console.log(`D10 issue #${row.issue.number} → ${row.verdict.action} (${row.verdict.reason})`);
  }
  writeGithubOutput({
    skipped: 'false',
    prs: String(prs.length),
    issues: String(issues.length),
  });
  return { skipped: false, prs, issues };
}

const isMain = process.argv[1] && process.argv[1].endsWith('issues-hygiene.mjs');
if (isMain) runHygiene();
