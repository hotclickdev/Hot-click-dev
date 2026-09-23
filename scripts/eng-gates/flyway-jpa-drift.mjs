#!/usr/bin/env node
/**
 * D1 — Daily Flyway ↔ JPA drift.
 * Diff entidades JPA vs V*__.sql (+ Actualizado.sql). Nunca aplica SQL a prod.
 */

import { basename, join } from 'node:path';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import {
  ACTUALIZADO,
  MIGRATION_DIR,
  MODEL_DIR,
  REPO_ROOT,
  SKIP_LABELS,
  diffJpaVsSql,
  hasLabel,
  mergeSqlMaps,
  nextMigrationFilename,
  parseFlywaySql,
  parseJpaEntities,
  parseMigrationVersion,
  writeGithubOutput,
} from './ola3-lib.mjs';
import { upsertIssue } from './ola3-github.mjs';

export function listMigrationFiles(root = REPO_ROOT) {
  const dir = join(root, MIGRATION_DIR);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => /^V\d+__.+\.sql$/i.test(name))
    .map((name) => join(MIGRATION_DIR, name).replaceAll('\\', '/'));
}

export function listEntityFiles(root = REPO_ROOT) {
  const dir = join(root, MODEL_DIR);
  if (!existsSync(dir)) return [];
  return walkJava(dir).map((abs) => abs.slice(root.length + 1).replaceAll('\\', '/'));
}

function walkJava(dir, acc = []) {
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, name.name);
    if (name.isDirectory()) walkJava(abs, acc);
    else if (name.name.endsWith('.java')) acc.push(abs);
  }
  return acc;
}

export function collectJpa(readFile, files) {
  const entities = [];
  const superColumns = [];
  for (const file of files) {
    const parsed = parseJpaEntities(readFile(file), file);
    for (const entity of parsed) {
      if (entity.mappedSuper) {
        superColumns.push(...entity.columns.map((c) => c.name));
      }
      entities.push(entity);
    }
  }
  return { entities, superColumns };
}

export function collectSql(readFile, migrationFiles, includeActualizado = true) {
  const maps = [];
  for (const file of migrationFiles) {
    maps.push(parseFlywaySql(readFile(file)));
  }
  if (includeActualizado) {
    try {
      maps.push(parseFlywaySql(readFile(ACTUALIZADO)));
    } catch {
      // Actualizado.sql puede no existir en un checkout parcial
    }
  }
  return mergeSqlMaps(maps);
}

export function runDrift(opts = {}) {
  if (hasLabel(process.env.PR_LABELS, SKIP_LABELS.drift)) {
    return { skipped: true, missingTables: [], missingColumns: [], nextFile: '' };
  }
  const readFile = opts.readFile || ((rel) => readFileSync(join(REPO_ROOT, rel), 'utf8'));
  const entityFiles = opts.entityFiles || listEntityFiles(opts.root || REPO_ROOT);
  const migrationFiles = opts.migrationFiles || listMigrationFiles(opts.root || REPO_ROOT);
  const { entities, superColumns } = collectJpa(readFile, entityFiles);
  const sqlTables = collectSql(readFile, migrationFiles, opts.includeActualizado !== false);
  const drift = diffJpaVsSql(entities, sqlTables, superColumns);
  const versions = migrationFiles.map(parseMigrationVersion);
  const slug = drift.missingTables[0]?.table || drift.missingColumns[0]?.table || 'schema_drift';
  const nextFile = nextMigrationFilename(versions, slug);
  return {
    skipped: false,
    entities,
    migrationCount: migrationFiles.length,
    ...drift,
    nextFile,
    hasDrift: drift.missingTables.length + drift.missingColumns.length > 0,
  };
}

export function buildIssueBody(result, ranAt = new Date().toISOString()) {
  const lines = [
    '## D1 — Daily Flyway ↔ JPA schema-drift',
    '',
    `Última corrida: ${ranAt}`,
    `Entidades escaneadas: **${result.entities?.length || 0}** · migraciones: **${result.migrationCount || 0}**`,
    '',
    'Este agente **no aplica SQL a producción**. Solo propone el siguiente archivo Flyway.',
    'Complementa E1 (gate de PR): E1 exige migración en el mismo PR; D1 mira el árbol diario.',
    '',
    `Siguiente archivo sugerido: \`${MIGRATION_DIR}/${result.nextFile}\``,
    '',
  ];
  if (!result.hasDrift) {
    lines.push('Sin drift: columnas `@Column`/`@JoinColumn` con `name=` aparecen en `V*__.sql` o `Actualizado.sql`.');
    return lines.join('\n');
  }
  if (result.missingTables.length) {
    lines.push('### Tablas JPA sin `CREATE TABLE` en migraciones', '');
    for (const row of result.missingTables.slice(0, 30)) {
      lines.push(`- \`${row.table}\` ← \`${row.file}\` (${row.className})`);
    }
    lines.push('');
  }
  if (result.missingColumns.length) {
    lines.push('### Columnas JPA no vistas en SQL', '');
    for (const row of result.missingColumns.slice(0, 40)) {
      lines.push(`- \`${row.table}.${row.column}\` ← \`${row.file}\``);
    }
    lines.push('');
  }
  lines.push(
    'Creá `V{N}__…sql` idempotente (`IF NOT EXISTS`) y sincronizá `Actualizado.sql` si sigue siendo la referencia.',
    'No correr este SQL contra RDS/Supabase desde CI.',
  );
  return lines.join('\n');
}

function main() {
  const result = runDrift();
  if (result.skipped) {
    console.log('D1 Flyway drift: skip label');
    return;
  }
  const body = buildIssueBody(result);
  console.log(`D1 Flyway drift: tables=${result.missingTables.length} cols=${result.missingColumns.length} next=${result.nextFile}`);
  for (const row of result.missingColumns.slice(0, 15)) {
    console.log(`  missing ${row.table}.${row.column} (${row.file})`);
  }
  upsertIssue({
    title: '[D1] schema-drift Flyway ↔ JPA',
    marker: 'hotclick-d1-schema-drift',
    labels: ['schema-drift', 'eng-agent'],
    body,
  });
  writeGithubOutput({
    drift: result.hasDrift ? 'true' : 'false',
    next: result.nextFile,
    missing: String(result.missingTables.length + result.missingColumns.length),
  });
}

if (basename(process.argv[1] || '') === 'flyway-jpa-drift.mjs') {
  main();
}
