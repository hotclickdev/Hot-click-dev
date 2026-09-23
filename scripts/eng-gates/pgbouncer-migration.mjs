#!/usr/bin/env node
/**
 * E18 — Migration PR PgBouncer safety.
 * Falla si V*.sql usa pg_advisory_lock, SET de sesión, LISTEN/NOTIFY o PREPARE.
 * Recuerda IF NOT EXISTS. Comenta file:line.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  REPO_ROOT,
  SKIP_LABELS,
  evaluatePgbouncerMigration,
  gitChangedFiles,
  hasLabel,
  isMigrationPath,
  scanMigrationSql,
  writeGithubOutput,
} from './ola5-lib.mjs';
import { postLineComments, upsertPrComment } from './ola5-github.mjs';

export function buildMigrationComment(verdict, findings) {
  const lines = [
    '## E18 — PgBouncer safety (Flyway V*.sql)',
    '',
    verdict.ok ? '**PASS**' : '**FAIL**',
    '',
    verdict.reason,
    '',
  ];
  for (const item of findings) {
    lines.push(
      `- **${item.severity.toUpperCase()}** \`${item.path}:${item.line}\` — ${item.title}`,
      `  \`${item.snippet}\``,
    );
  }
  lines.push(
    '',
    'PgBouncer transaction mode: no `pg_advisory_lock`, `SET` de sesión, `LISTEN`/`NOTIFY`, ni `PREPARE` persistente.',
    'Migraciones: `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`.',
  );
  if (!verdict.ok) {
    lines.push('', `Skip documentado: label \`${SKIP_LABELS.pgbouncer}\`.`);
  }
  return lines.join('\n');
}

export function runPgbouncerMigration({
  env = process.env,
  changed,
  readFile = (rel) => readFileSync(join(REPO_ROOT, rel), 'utf8'),
} = {}) {
  const skip = hasLabel(env.PR_LABELS, SKIP_LABELS.pgbouncer);
  const base = env.BASE_SHA;
  const head = env.HEAD_SHA;
  const files = (changed || (base && head ? gitChangedFiles(base, head) : []))
    .filter(isMigrationPath);
  if (!files.length && !skip) {
    console.log('E18 PASS — sin V*.sql en el diff.');
    writeGithubOutput({ ok: 'true', reason: 'sin migraciones' });
    return { ok: true, findings: [] };
  }
  const findings = [];
  for (const file of files) {
    findings.push(...scanMigrationSql(file, readFile(file)));
  }
  const verdict = evaluatePgbouncerMigration({ findings, skip });
  console.log(`E18 ${verdict.ok ? 'PASS' : 'FAIL'} — ${verdict.reason}`);
  for (const item of findings) {
    console.log(`  [${item.severity}] ${item.path}:${item.line} ${item.title}`);
  }
  writeGithubOutput({
    ok: verdict.ok ? 'true' : 'false',
    fails: String(verdict.failCount || 0),
  });
  if (findings.length && !verdict.skipped) {
    upsertPrComment('hotclick-e18-pgbouncer', buildMigrationComment(verdict, findings));
    const fails = findings.filter((item) => item.severity === 'fail' && item.line);
    if (fails.length && head) postLineComments(head, fails, 'E18 PgBouncer');
  }
  return { ...verdict, findings };
}

const isMain = process.argv[1] && process.argv[1].endsWith('pgbouncer-migration.mjs');
if (isMain) {
  if (!process.env.BASE_SHA || !process.env.HEAD_SHA) {
    console.error('BASE_SHA y HEAD_SHA son obligatorios');
    process.exit(2);
  }
  const verdict = runPgbouncerMigration();
  process.exit(verdict.ok ? 0 : 1);
}
