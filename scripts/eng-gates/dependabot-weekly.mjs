#!/usr/bin/env node
/**
 * S2 — Weekly safe dependency upgrades.
 * Clasifica PRs Dependabot abiertos. No mergea majors.
 * Coordina con E6: no quita needs-human; solo agrega notas/labels compatibles.
 */

import { basename } from 'node:path';
import { evaluateDependabot, hasLabel as hasOla1Label } from './lib.mjs';
import { SKIP_LABELS, hasLabel, isCriticalMajorTitle, writeGithubOutput } from './ola3-lib.mjs';
import { addLabelsToPr, listOpenDependabotPrs, upsertIssue, upsertPrCommentOn } from './ola3-github.mjs';

export function ciPassed(pr) {
  const checks = pr.statusCheckRollup || [];
  if (!checks.length) return { known: false, pass: false };
  const relevant = checks.filter((c) => c.conclusion && c.conclusion !== 'skipped' && c.conclusion !== 'neutral');
  if (!relevant.length) return { known: false, pass: false };
  return {
    known: true,
    pass: relevant.every((c) => c.conclusion === 'success'),
    failed: relevant.filter((c) => c.conclusion === 'failure').map((c) => c.name),
  };
}

export function existingLabelNames(pr) {
  return (pr.labels || []).map((label) => (typeof label === 'string' ? label : label.name)).filter(Boolean);
}

export function classifyOpenPr(pr) {
  const labels = existingLabelNames(pr);
  const skip = hasOla1Label(labels.join(','), 'skip-dependabot-gate');
  const verdict = evaluateDependabot({ title: pr.title, skip });
  const ci = ciPassed(pr);
  const alreadyHuman = labels.includes('needs-human');
  const alreadyCandidate = labels.includes('automerge-candidate');
  const criticalMajor = isCriticalMajorTitle(pr.title) || (verdict.critical && verdict.bump === 'major') || verdict.spring4;
  const safeNote = !criticalMajor
    && (verdict.bump === 'patch' || verdict.bump === 'minor')
    && ci.pass
    && !alreadyHuman
    && !verdict.labels.includes('needs-human');

  return {
    number: pr.number,
    title: pr.title,
    url: pr.url,
    verdict,
    ci,
    labels,
    criticalMajor,
    safeNote,
    alreadyHuman,
    alreadyCandidate,
    addLabels: safeNote && !alreadyCandidate ? ['automerge-candidate'] : [],
  };
}

export function buildPrComment(row) {
  const lines = [
    '## S2 — Weekly safe dependency note',
    '',
    row.verdict.comment || row.title,
    '',
  ];
  if (row.safeNote) {
    lines.push(
      'CI del rollup está **verde**. Label `automerge-candidate` (nota segura).',
      'E6 sigue mandando: **no** se mergea solo. Un humano puede agregar `safe-to-automerge`.',
    );
  } else if (row.criticalMajor) {
    lines.push(
      '**needs-human** — major de `spring-boot*`, `jjwt-*` o `stripe-java` (o Spring Boot 4.x).',
      'S2 **no mergea** majors. No se quita `needs-human` si E6 ya lo puso.',
    );
  } else if (!row.ci.known) {
    lines.push('CI aún sin rollup usable. Sin cambio de labels. Esperá `ci.yml`.');
  } else if (!row.ci.pass) {
    lines.push(`CI rojo (${(row.ci.failed || []).join(', ') || 'checks'}). No es automerge-candidate.`);
  }
  lines.push('', 'No pelea con E6: este comentario es semanal, sticky (`hotclick-s2-deps`).');
  return lines.join('\n');
}

export function buildHumanIssue(rows, ranAt = new Date().toISOString()) {
  const majors = rows.filter((r) => r.criticalMajor);
  const lines = [
    '## S2 — Dependabot majors que necesitan humano',
    '',
    `Última corrida: ${ranAt}`,
    '',
    'Impacto: majors de **spring-boot***, **jjwt-***, **stripe-java** (y Spring Boot 4.x) pueden romper auth JWT, webhooks Stripe o el parent BOM.',
    'S2 **no mergea**. E6 ya labela `needs-human` / `spring-boot-major` en el PR.',
    '',
  ];
  if (!majors.length) {
    lines.push('No hay majors críticos abiertos en este recorte.');
    return lines.join('\n');
  }
  for (const row of majors) {
    lines.push(`- [#${row.number}](${row.url}) ${row.title}`);
    lines.push(`  ${row.verdict.reason}`);
  }
  return lines.join('\n');
}

export function runWeeklyDeps(opts = {}) {
  if (hasLabel(process.env.PR_LABELS, SKIP_LABELS.deps)) {
    return { skipped: true, rows: [] };
  }
  const prs = opts.prs || listOpenDependabotPrs();
  const rows = prs.map(classifyOpenPr);
  return { skipped: false, rows };
}

function main() {
  const result = runWeeklyDeps();
  if (result.skipped) {
    console.log('S2 weekly deps: skip label');
    return;
  }
  console.log(`S2 weekly deps: ${result.rows.length} PRs Dependabot`);
  for (const row of result.rows) {
    console.log(`  #${row.number} ${row.verdict.bump || '?'} safe=${row.safeNote} major=${row.criticalMajor}`);
    upsertPrCommentOn(row.number, 'hotclick-s2-deps', buildPrComment(row));
    if (row.addLabels.length) addLabelsToPr(row.number, row.addLabels);
    if (row.criticalMajor && !row.alreadyHuman) {
      addLabelsToPr(row.number, ['needs-human']);
    }
  }
  const majors = result.rows.filter((r) => r.criticalMajor);
  if (majors.length) {
    upsertIssue({
      title: '[S2] needs-human Dependabot majors',
      marker: 'hotclick-s2-deps-human',
      labels: ['needs-human', 'eng-agent', 'dependabot'],
      body: buildHumanIssue(result.rows),
    });
  }
  writeGithubOutput({
    prs: String(result.rows.length),
    safe: String(result.rows.filter((r) => r.safeNote).length),
    majors: String(majors.length),
  });
}

if (basename(process.argv[1] || '') === 'dependabot-weekly.mjs') {
  main();
}
