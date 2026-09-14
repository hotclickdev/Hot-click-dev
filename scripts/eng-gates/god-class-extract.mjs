#!/usr/bin/env node
/**
 * S10 — Weekly god-class extract candidates.
 * Top ~15 LOC Java + frontend. Propone UN extract move-only fuera de Payment/Auth/Pos.
 * No abre PR de refactor masivo.
 */

import { readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import {
  FRONTEND_SRC,
  JAVA_MAIN,
  REPO_ROOT,
  SKIP_LABELS,
  countLoc,
  hasLabel,
  isSensitiveExtractPath,
  listLocRows,
  proposeMoveOnlyExtract,
  relRepo,
  walkFiles,
  writeGithubOutput,
} from './ola6-lib.mjs';
import { upsertIssue } from './ola6-github.mjs';

export function collectLocFiles({
  javaRoot = JAVA_MAIN,
  feRoot = FRONTEND_SRC,
  readFile = (rel) => readFileSync(join(REPO_ROOT, rel), 'utf8'),
} = {}) {
  const java = walkFiles(javaRoot, (_abs, name) => name.endsWith('.java'));
  const fe = walkFiles(feRoot, (_abs, name) => /\.(ts|tsx)$/.test(name));
  const rows = [];
  for (const abs of [...java, ...fe]) {
    const path = relRepo(abs);
    const loc = countLoc(readFile(path));
    rows.push({ path, loc, sensitive: isSensitiveExtractPath(path) });
  }
  return rows.sort((a, b) => b.loc - a.loc || a.path.localeCompare(b.path));
}

export function buildS10IssueBody({ top, proposal, ranAt }) {
  const lines = [
    '## S10 — God-class extract candidates (move-only)',
    '',
    `Última corrida: ${ranAt}`,
    '',
    'Top archivos por LOC bajo `Hot_click_outlet` (Java main + frontend/src).',
    '**No** se abre un PR de extract masivo. Un humano elige el candidato y mueve código sin cambiar side effects (regla de refactor bit-idéntico).',
    '',
    '| LOC | Payment/Auth/Pos | Path |',
    '| ---: | --- | --- |',
    ...top.map((row) => `| ${row.loc} | ${row.sensitive ? 'sí — no extraer acá' : ''} | \`${row.path}\` |`),
    '',
  ];
  if (proposal) {
    lines.push(
      '### Propuesta única (fuera de Payment/Auth/Pos)',
      '',
      `- Archivo: \`${proposal.path}\` (${proposal.loc} LOC)`,
      `- Extraer: \`${proposal.extractName}\` (~${proposal.extractLoc} LOC, línea ~${proposal.line})`,
      `- ${proposal.hint}`,
      '',
      'Move-only: mismo orden de llamadas. No “mejorar” lógica en el PR de limpieza.',
    );
  } else {
    lines.push('No hay candidato move-only obvio fuera de Payment/Auth/Pos esta semana.');
  }
  lines.push('', 'Complementa S1 (lote Sonar ≥200 LOC) y SCALE1 (findAll). No los duplica.');
  return lines.join('\n');
}

export function runGodClassExtract({ env = process.env, files, readFile } = {}) {
  if (hasLabel(env.PR_LABELS, SKIP_LABELS.god) || env.SKIP_GOD_CLASS === '1') {
    return { skipped: true, shouldIssue: false };
  }
  const all = files || collectLocFiles({ readFile });
  const top = listLocRows(all).map((row) => ({
    ...row,
    sensitive: isSensitiveExtractPath(row.path),
  }));
  const reader = readFile || ((rel) => readFileSync(join(REPO_ROOT, rel), 'utf8'));
  const proposal = proposeMoveOnlyExtract(top, reader);
  return { skipped: false, shouldIssue: true, top, proposal };
}

function main() {
  const result = runGodClassExtract();
  if (result.skipped) {
    console.log('S10 skip');
    writeGithubOutput({ skipped: 'true' });
    return;
  }
  console.log(`S10 top=${result.top.length} proposal=${result.proposal?.path || 'none'}`);
  writeGithubOutput({ skipped: 'false', proposal: result.proposal?.path || '' });
  upsertIssue({
    title: '[S10] God-class extract candidates (move-only, no Payment/Auth/Pos)',
    marker: 'hotclick-s10-god-class',
    labels: ['eng-agent', 'refactor'],
    body: buildS10IssueBody({ ...result, ranAt: new Date().toISOString() }),
  });
}

if (basename(process.argv[1] || '') === 'god-class-extract.mjs') main();
