#!/usr/bin/env node
/**
 * E1 Gate Flyway — entidades JPA cambiadas deben traer V*__.sql.
 * No aplica SQL a producción.
 */

import {
  SKIP_LABELS,
  appendGithubOutput,
  evaluateFlyway,
  gitChangedFiles,
  gitUnifiedDiff,
  hasLabel,
  isEntityPath,
  parseUnifiedDiff,
  repoHasActualizado,
} from './lib.mjs';
import { upsertPrComment } from './github.mjs';

const base = process.env.BASE_SHA;
const head = process.env.HEAD_SHA;
if (!base || !head) {
  console.error('BASE_SHA y HEAD_SHA son obligatorios');
  process.exit(2);
}

const skip = hasLabel(process.env.PR_LABELS, SKIP_LABELS.flyway);
const changedFiles = gitChangedFiles(base, head);
const entityFiles = changedFiles.filter(isEntityPath);
const diffText = entityFiles.length ? gitUnifiedDiff(base, head, entityFiles) : '';
const verdict = evaluateFlyway({
  changedFiles,
  diffFiles: parseUnifiedDiff(diffText),
  actualizadoExists: repoHasActualizado(),
  skip,
});

console.log(`E1 Flyway: ${verdict.ok ? 'PASS' : 'FAIL'} — ${verdict.reason}`);
if (verdict.schemaEntityFiles?.length) {
  console.log('Entidades con hint de esquema:');
  for (const file of verdict.schemaEntityFiles) console.log(`  - ${file}`);
}
if (verdict.migrationFiles?.length) {
  console.log('Migraciones en el PR:');
  for (const file of verdict.migrationFiles) console.log(`  - ${file}`);
}
for (const reminder of verdict.reminders || []) console.log(`Recordatorio: ${reminder}`);

appendGithubOutput({
  ok: verdict.ok ? 'true' : 'false',
  reason: verdict.reason,
});

if (!verdict.ok || verdict.reminders?.length) {
  const lines = [
    '## E1 Gate Flyway',
    '',
    verdict.ok ? '**PASS** (con recordatorios)' : '**FAIL**',
    '',
    verdict.reason,
  ];
  if (verdict.schemaEntityFiles?.length) {
    lines.push('', 'Entidades:', ...verdict.schemaEntityFiles.map((file) => `- \`${file}\``));
  }
  if (!verdict.ok) {
    lines.push(
      '',
      'Agregá un archivo `Hot_click_outlet/src/main/resources/db/migration/V{N}__descripcion.sql` (idempotente, `IF NOT EXISTS`).',
      'Este gate **no** corre SQL contra prod.',
      '',
      `Si el cambio de Java no toca el esquema, agregá el label \`${SKIP_LABELS.flyway}\`.`,
    );
  }
  if (verdict.reminders?.length) {
    lines.push('', ...verdict.reminders.map((item) => `> ${item}`));
  }
  upsertPrComment('hotclick-gate-flyway', lines.join('\n'));
}

process.exit(verdict.ok ? 0 : 1);
