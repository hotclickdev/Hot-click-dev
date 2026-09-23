#!/usr/bin/env node
/**
 * S1 — Weekly Sonar batch (Issue-only).
 * Lista un lote acotado de archivos ≥200 LOC fuera de Payment/Auth/POS.
 * Si falta SONAR_TOKEN, igual abre Issue con heurística de LOC.
 * No refactoriza código de negocio.
 */

import { basename, join } from 'node:path';
import {
  FRONTEND_SRC,
  JAVA_MAIN,
  REPO_ROOT,
  SKIP_LABELS,
  countLoc,
  hasLabel,
  isoWeek,
  isSensitivePaymentAuthPos,
  readText,
  relRepo,
  walkFiles,
  writeGithubOutput,
} from './ola2-lib.mjs';
import { upsertIssue } from './ola2-github.mjs';

export const MIN_LOC = 200;
export const BATCH_SIZE = 8;
export const SUGGESTED_RULES = [
  'java:S3776 (cognitive complexity)',
  'java:S138 (método demasiado largo)',
  'java:S107 (demasiados parámetros)',
  'typescript:S3776 (cognitive complexity)',
  'javascript:S3776 (si queda JS legado; no agregar JS nuevo en src/)',
];

const SONAR_HOST = process.env.SONAR_HOST_URL || 'https://sonarcloud.io';
const SONAR_PROJECT = process.env.SONAR_PROJECT_KEY || 'hotclickdev_Hot-click-dev';

export function listFatFiles(readFile = defaultRead) {
  const java = walkFiles(JAVA_MAIN, (_abs, name) => name.endsWith('.java'));
  const fe = walkFiles(FRONTEND_SRC, (_abs, name) => /\.(ts|tsx)$/.test(name));
  const rows = [];
  for (const abs of [...java, ...fe]) {
    const rel = relRepo(abs);
    if (isSensitivePaymentAuthPos(rel)) continue;
    if (/\/(Payment|Auth|Pos|Sinpe|Wallet)/i.test(rel)) continue;
    const loc = countLoc(readFile(rel));
    if (loc < MIN_LOC) continue;
    rows.push({ path: rel, loc });
  }
  return rows.sort((a, b) => b.loc - a.loc || a.path.localeCompare(b.path));
}

function defaultRead(rel) {
  return readText(join(REPO_ROOT, rel));
}

export function pickBatch(files, weekInfo = isoWeek(), size = BATCH_SIZE) {
  if (!files.length) return [];
  const offset = ((weekInfo.year * 53 + weekInfo.week) * size) % files.length;
  const batch = [];
  for (let i = 0; i < Math.min(size, files.length); i += 1) {
    batch.push(files[(offset + i) % files.length]);
  }
  return batch;
}

export async function fetchSonarForFiles(paths, fetchImpl = globalThis.fetch) {
  const token = process.env.SONAR_TOKEN;
  if (!token) return { skipped: true, issues: [], note: 'SONAR_TOKEN ausente — API Sonar omitida' };
  if (!fetchImpl) return { skipped: true, issues: [], note: 'fetch no disponible — API Sonar omitida' };

  const issues = [];
  for (const path of paths.slice(0, BATCH_SIZE)) {
    const url = new URL(`${SONAR_HOST}/api/issues/search`);
    url.searchParams.set('componentKeys', SONAR_PROJECT);
    url.searchParams.set('resolved', 'false');
    url.searchParams.set('ps', '15');
    url.searchParams.set('files', path);
    try {
      const res = await fetchImpl(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        issues.push({ path, error: `HTTP ${res.status}` });
        continue;
      }
      const json = await res.json();
      const rules = (json.issues || []).map((it) => it.rule).filter(Boolean);
      issues.push({
        path,
        total: json.total ?? rules.length,
        rules: [...new Set(rules)].slice(0, 8),
      });
    } catch (error) {
      issues.push({ path, error: error.message });
    }
  }
  return { skipped: false, issues, note: '' };
}

export function buildIssueBody({ weekInfo, batch, sonar, fatCount }) {
  const lines = [
    '## S1 — Weekly Sonar batch (solo propuesta)',
    '',
    `Semana ISO **${weekInfo.year}-W${String(weekInfo.week).padStart(2, '0')}**. Lote acotado: **${batch.length}** archivos (≥${MIN_LOC} LOC, ${fatCount} candidatos).`,
    '',
    'Este agente **no** refactoriza Payment*/Auth*/Pos* ni abre un PR masivo. El lote es para un humano o un PR de chore posterior, un archivo a la vez.',
    '',
    '### Archivos del lote',
    '',
  ];
  for (const file of batch) {
    lines.push(`- \`${file.path}\` — ${file.loc} LOC`);
  }
  lines.push('', '### Enfoque de reglas sugerido', '');
  for (const rule of SUGGESTED_RULES) lines.push(`- ${rule}`);
  lines.push('', '### SonarCloud API', '');
  if (sonar.skipped) {
    lines.push(sonar.note || 'SONAR_TOKEN ausente — se listó por heurística de LOC.');
  } else {
    for (const row of sonar.issues) {
      if (row.error) {
        lines.push(`- \`${row.path}\`: ${row.error}`);
        continue;
      }
      const rules = row.rules?.length ? row.rules.join(', ') : 'sin issues en la página';
      lines.push(`- \`${row.path}\`: ${row.total} issues — ${rules}`);
    }
  }
  lines.push(
    '',
    'Dashboard: https://sonarcloud.io/project/issues?id=hotclickdev_Hot-click-dev',
    '',
    'No mezclar extract con cambio de UI. No tocar pago/auth/POS en el mismo hunk que un refactor.',
  );
  return lines.join('\n');
}

export async function runSonarBatch(opts = {}) {
  if (hasLabel(process.env.PR_LABELS, SKIP_LABELS.sonar)) {
    return { skipped: true };
  }
  const files = opts.files || listFatFiles(opts.readFile || defaultRead);
  const weekInfo = opts.weekInfo || isoWeek();
  const batch = pickBatch(files, weekInfo);
  const sonar = opts.sonar || await fetchSonarForFiles(batch.map((f) => f.path), opts.fetchImpl);
  return { skipped: false, files, batch, weekInfo, sonar };
}

async function main() {
  const result = await runSonarBatch();
  if (result.skipped) {
    console.log('S1 Sonar batch: skip label');
    return;
  }
  const body = buildIssueBody({
    weekInfo: result.weekInfo,
    batch: result.batch,
    sonar: result.sonar,
    fatCount: result.files.length,
  });
  console.log(`S1 Sonar batch: ${result.batch.length} archivos (de ${result.files.length})`);
  for (const file of result.batch) console.log(`  ${file.loc}\t${file.path}`);
  if (result.sonar.skipped) console.log(`  ${result.sonar.note}`);
  upsertIssue({
    title: '[S1] Weekly Sonar batch (ola 2)',
    marker: 'hotclick-s1-sonar-batch',
    labels: ['eng-agent', 'sonar-batch'],
    body,
  });
  writeGithubOutput({
    batch: String(result.batch.length),
    sonar: result.sonar.skipped ? 'skipped' : 'queried',
  });
}

if (basename(process.argv[1] || '') === 'sonar-batch.mjs') {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
