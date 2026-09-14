#!/usr/bin/env node
/**
 * E14 — Stricter hotfix branch gate.
 * Exige Issue ligado con outage/prod-errors (o label) + gitleaks verde.
 * Bloquea labels de auto-merge si falta. No-op fuera de hotfix/* para no
 * romper en silencio el job auto-merge de ci.yml.
 */

import {
  SKIP_LABELS,
  evaluateHotfixGate,
  hasLabel,
  isHotfixRef,
  parseLinkedIssueNumbers,
  writeGithubOutput,
} from './ola5-lib.mjs';
import {
  blockAutoMerge,
  fetchIssue,
  fetchPrMeta,
  upsertPrComment,
} from './ola5-github.mjs';

export function resolveLinkedIssues(prBody, meta, fetch = fetchIssue) {
  const fromBody = parseLinkedIssueNumbers(prBody);
  const fromMeta = (meta?.closingIssuesReferences || []).map((item) => item.number).filter(Boolean);
  const numbers = [...new Set([...fromBody, ...fromMeta])];
  return numbers.map((n) => fetch(n)).filter(Boolean);
}

export function buildHotfixComment(verdict) {
  const lines = [
    '## E14 — Hotfix gate',
    '',
    verdict.ok ? '**PASS**' : '**FAIL**',
    '',
    verdict.reason,
    '',
    'Requisitos en `hotfix/**`:',
    '- Issue ligado (`Fixes #N`) cuyo título/cuerpo/labels mencionen `outage` o `prod-errors`, **o** label `outage`/`prod-errors` en el PR',
    '- gitleaks verde',
    '',
    'Si falta: se quitan `safe-to-automerge` / `automerge-candidate` y se deshabilita auto-merge.',
    'Coordina con `ci.yml` job `auto-merge` (hotfix): este check extra debe pasar; no se salta el job en PRs normales (no-op PASS).',
  ];
  return lines.join('\n');
}

export function runHotfixGate({
  env = process.env,
  fetchPr = fetchPrMeta,
  fetchIss = fetchIssue,
  block = blockAutoMerge,
  comment = upsertPrComment,
} = {}) {
  const headRef = env.PR_HEAD_REF || env.GITHUB_HEAD_REF || '';
  const isHotfix = isHotfixRef(headRef);
  const skip = hasLabel(env.PR_LABELS, SKIP_LABELS.hotfix);
  if (!isHotfix) {
    const verdict = evaluateHotfixGate({ isHotfix: false });
    console.log(`E14 ${verdict.reason}`);
    writeGithubOutput({ ok: 'true', hotfix: 'false' });
    return verdict;
  }
  const meta = env.PR_NUMBER ? fetchPr(env.PR_NUMBER) : null;
  const body = env.PR_BODY || meta?.body || '';
  const labels = env.PR_LABELS
    || (meta?.labels || []).map((item) => (typeof item === 'string' ? item : item.name)).join(',');
  const linkedIssues = resolveLinkedIssues(body, meta, fetchIss);
  const verdict = evaluateHotfixGate({
    isHotfix: true,
    skip,
    prLabels: labels,
    prBody: body,
    linkedIssues,
    gitleaks: env.GITLEAKS_CONCLUSION || 'unknown',
  });
  console.log(`E14 ${verdict.ok ? 'PASS' : 'FAIL'} — ${verdict.reason}`);
  writeGithubOutput({
    ok: verdict.ok ? 'true' : 'false',
    hotfix: 'true',
    block_automerge: verdict.blockAutoMerge ? 'true' : 'false',
  });
  if (!verdict.skipped) {
    comment('hotclick-e14-hotfix', buildHotfixComment(verdict));
  }
  if (verdict.blockAutoMerge) {
    block(env.PR_NUMBER);
  }
  return verdict;
}

const isMain = process.argv[1] && process.argv[1].endsWith('hotfix-gate.mjs');
if (isMain) {
  const verdict = runHotfixGate();
  process.exit(verdict.ok ? 0 : 1);
}
