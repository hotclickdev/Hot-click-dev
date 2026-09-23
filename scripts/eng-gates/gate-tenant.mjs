#!/usr/bin/env node
/**
 * E2 Reviewer de tenant — escanea el DIFF (no el árbol completo).
 */

import {
  SKIP_LABELS,
  appendGithubOutput,
  evaluateTenant,
  gitChangedFiles,
  gitUnifiedDiff,
  hasLabel,
  isTenantScanPath,
  parseUnifiedDiff,
  scanTenantDiff,
} from './lib.mjs';
import { permalink, postLineReview, upsertPrComment } from './github.mjs';

const base = process.env.BASE_SHA;
const head = process.env.HEAD_SHA;
if (!base || !head) {
  console.error('BASE_SHA y HEAD_SHA son obligatorios');
  process.exit(2);
}

const skip = hasLabel(process.env.PR_LABELS, SKIP_LABELS.tenant);
const changed = gitChangedFiles(base, head).filter(isTenantScanPath);
if (changed.length === 0 && !skip) {
  console.log('E2 Tenant: PASS — sin Java de controller/service/repository en el diff.');
  appendGithubOutput({ ok: 'true', reason: 'sin archivos relevantes' });
  process.exit(0);
}

const diffFiles = parseUnifiedDiff(changed.length ? gitUnifiedDiff(base, head, changed) : '');
const findings = scanTenantDiff(diffFiles);
const verdict = evaluateTenant({ findings, skip });

console.log(`E2 Tenant: ${verdict.ok ? 'PASS' : 'FAIL'} — ${verdict.reason}`);
for (const item of findings) {
  console.log(`  [${item.severity}] ${item.path}:${item.line} ${item.title}`);
  console.log(`           ${item.snippet}`);
}

appendGithubOutput({
  ok: verdict.ok ? 'true' : 'false',
  reason: verdict.reason,
  fails: String(verdict.failCount || 0),
});

if (findings.length && !verdict.skipped) {
  const lines = [
    '## E2 Reviewer de tenant',
    '',
    verdict.ok ? '**PASS** (avisos, no bloquea)' : '**FAIL** — riesgos altos en endpoints o infra',
    '',
    verdict.reason,
    '',
    'Referencias: `DEVELOPER_GOLDEN_RULES.md`, `IDORCrosstenantAttackTest`, `F28TenantIsolationTest`.',
    '',
  ];
  for (const item of findings) {
    const link = permalink(item.path, item.line);
    lines.push(
      `- **${item.severity.toUpperCase()}** [\`${item.path}:${item.line}\`](${link}) — ${item.title}`,
      `  \`${item.snippet}\``,
      `  ${item.hint}`,
    );
  }
  if (!verdict.ok) {
    lines.push('', `Para un falso positivo documentado, label \`${SKIP_LABELS.tenant}\`.`);
  }
  upsertPrComment('hotclick-gate-tenant', lines.join('\n'));
  postLineReview(head, findings.filter((item) => item.severity === 'fail' && item.line));
}

process.exit(verdict.ok ? 0 : 1);
