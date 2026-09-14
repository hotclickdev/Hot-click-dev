#!/usr/bin/env node
/**
 * S5 — Weekly design tokens vs hardcoded CSS.
 * Issue design-drift + sugerencia de codemod. No reescribe el frontend.
 */

import { readFileSync } from 'node:fs';
import {
  FRONTEND_SRC,
  SKIP_LABELS,
  TOKENS_REL,
  collectTokenHexes,
  designCodemodHint,
  fileSizeOk,
  frontendScanPred,
  hasLabel,
  readRepo,
  relRepo,
  scanDesignDrift,
  summarizeDesignDrift,
  walkFiles,
  writeGithubOutput,
} from './ola5-lib.mjs';
import { upsertIssue } from './ola5-github.mjs';

export function scanFrontendTokens(root = FRONTEND_SRC, readTokens = () => readRepo(TOKENS_REL)) {
  const tokenHexes = collectTokenHexes(readTokens());
  const findings = [];
  for (const abs of walkFiles(root, frontendScanPred)) {
    if (!fileSizeOk(abs)) continue;
    const rel = relRepo(abs);
    const source = readFileSync(abs, 'utf8');
    findings.push(...scanDesignDrift(rel, source, tokenHexes));
  }
  return summarizeDesignDrift(findings);
}

export function buildDesignIssueBody(summary, ranAt = new Date().toISOString()) {
  const lines = [
    '## S5 — Design tokens vs hardcoded CSS',
    '',
    `Última corrida: ${ranAt}`,
    '',
    `| Métrica | Valor |`,
    `| --- | --- |`,
    `| Hallazgos | ${summary.total} |`,
    `| Hex / inline (alta) | ${summary.high} |`,
    `| Hex que ya es token | ${summary.tokenish} |`,
    '',
    'Excepciones: `hotclick-tokens.css` y bloques `.hc-superadmin-theme`.',
    '',
    '### Muestra',
    '',
  ];
  for (const item of summary.sample) {
    lines.push(`- \`${item.path}:${item.line}\` \`${item.snippet}\` — ${item.hint}`);
  }
  lines.push('', '```', designCodemodHint(), '```', '', 'No se abrió un PR de rewrite masivo.');
  return lines.join('\n');
}

export function runDesignTokens({ env = process.env, scan = scanFrontendTokens } = {}) {
  if (hasLabel(env.PR_LABELS, SKIP_LABELS.tokens) || env.SKIP_DESIGN_TOKENS === '1') {
    console.log(`S5 skip: ${SKIP_LABELS.tokens}`);
    writeGithubOutput({ skipped: 'true' });
    return { skipped: true };
  }
  const summary = scan();
  console.log(`S5 ${summary.shouldIssue ? 'ISSUE' : 'OK'} high=${summary.high} tokenish=${summary.tokenish}`);
  writeGithubOutput({
    skipped: 'false',
    high: String(summary.high),
    issue: summary.shouldIssue ? 'true' : 'false',
  });
  if (summary.shouldIssue) {
    upsertIssue({
      title: '[S5] Design drift: hex / style={{ fuera de tokens',
      marker: 'hotclick-s5-design-drift',
      body: buildDesignIssueBody(summary),
      labels: ['eng-agent', 'design-drift'],
    });
  }
  return summary;
}

const isMain = process.argv[1] && process.argv[1].endsWith('design-tokens-drift.mjs');
if (isMain) runDesignTokens();
