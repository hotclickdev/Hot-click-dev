#!/usr/bin/env node
/**
 * D9 — Daily AI quota / cost alert.
 * SELECT-only sobre hot_click_ai_uso_tb. Sin secretos de DB → skip honesto.
 * No escribe en prod. No inventa credenciales.
 */

import { spawnSync } from 'node:child_process';
import {
  AI_CONTROL_REL,
  AI_QUOTA_REL,
  AI_USAGE_SELECT,
  SKIP_LABELS,
  dbSecretsPresent,
  evaluateAiQuota,
  hasLabel,
  parseQuotaHeuristics,
  pickDbUrl,
  readRepo,
  writeGithubOutput,
} from './ola5-lib.mjs';
import { sendTelegram, upsertIssue } from './ola5-github.mjs';

export function loadHeuristics(readFile = readRepo) {
  return parseQuotaHeuristics(readFile(AI_QUOTA_REL), readFile(AI_CONTROL_REL));
}

export function parsePsqlTuples(stdout) {
  const lines = String(stdout || '').trim().split(/\n/).filter(Boolean);
  const rows = [];
  for (const line of lines) {
    const cols = line.split('|').map((c) => c.trim());
    if (cols.length < 8) continue;
    rows.push({
      id_empresa: cols[0],
      nombre: cols[1],
      plan_saas: cols[2],
      plan_nombre: cols[3],
      max_creditos_ai: cols[4] === '' || cols[4] === 'NULL' ? null : cols[4],
      llamadas: cols[5],
      tokens_entrada: cols[6],
      tokens_salida: cols[7],
    });
  }
  return rows;
}

export function queryUsage({ url, anio, mes, runner = defaultPsql }) {
  const sql = AI_USAGE_SELECT.replace('$1', String(anio)).replace('$2', String(mes));
  return runner(url, sql);
}

function defaultPsql(url, sql) {
  const res = spawnSync('psql', [
    url,
    '--no-psqlrc',
    '-v', 'ON_ERROR_STOP=1',
    '-A', '-F', '|', '-t',
    '-c', sql,
  ], {
    encoding: 'utf8',
    env: { ...process.env, PGSSLMODE: process.env.PGSSLMODE || 'require' },
    timeout: 25_000,
  });
  if (res.status !== 0) {
    return { ok: false, rows: [], error: (res.stderr || res.error?.message || 'psql failed').slice(0, 400) };
  }
  return { ok: true, rows: parsePsqlTuples(res.stdout), error: '' };
}

export function buildQuotaIssueBody(verdict, { skippedQuery, queryError, ranAt }) {
  const lines = [
    '## D9 — AI quota / cost alert',
    '',
    `Última corrida: ${ranAt}`,
    '',
    verdict.skipped
      ? verdict.reason
      : verdict.reason,
    '',
  ];
  if (skippedQuery) {
    lines.push(`Consulta DB omitida: ${skippedQuery}`, '');
  }
  if (queryError) {
    lines.push(`psql no pudo leer \`hot_click_ai_uso_tb\` (sin writes): \`${queryError.slice(0, 180)}\``, '');
  }
  const over = verdict.overTenants || [];
  if (over.length) {
    lines.push('| Empresa | Plan | Llamadas | Límite | % |', '| --- | --- | --- | --- | --- |');
    for (const row of over.slice(0, 30)) {
      lines.push(`| ${row.nombre} | ${row.plan} | ${row.llamadas} | ${row.limite} | ${row.pctLabel} |`);
    }
    lines.push('');
  }
  if (verdict.platformOver) {
    lines.push(`Plataforma (suma tenants con límite finito): **${Math.round(verdict.platformPct * 100)}%**.`, '');
  }
  lines.push(
    'Umbral ~80% (mismo criterio que `AiControlController`). Tabla `hot_click_ai_uso_tb`.',
    'SELECT only. No se aplicó SQL de escritura.',
  );
  return lines.join('\n');
}

export async function runAiQuotaAlert({
  env = process.env,
  now = new Date(),
  query = queryUsage,
} = {}) {
  if (hasLabel(env.PR_LABELS, SKIP_LABELS.aiQuota) || env.SKIP_AI_QUOTA === '1') {
    console.log(`D9 skip: ${SKIP_LABELS.aiQuota}`);
    writeGithubOutput({ skipped: 'true', alert: 'false' });
    return { skipped: true };
  }
  const heuristics = loadHeuristics();
  const secrets = dbSecretsPresent(env);
  let rows = [];
  let skippedQuery = '';
  let queryError = '';
  if (!secrets) {
    skippedQuery = 'sin secretos de DB';
  } else {
    const picked = pickDbUrl(env);
    const anio = now.getUTCFullYear();
    const mes = now.getUTCMonth() + 1;
    const result = query({ url: picked.url, anio, mes });
    if (!result.ok) {
      skippedQuery = `psql falló vía ${picked.name}`;
      queryError = result.error || 'error';
    } else {
      rows = result.rows;
    }
  }
  const verdict = evaluateAiQuota({
    rows,
    heuristics,
    secretsPresent: secrets && !skippedQuery.startsWith('psql'),
  });
  if (secrets && skippedQuery.startsWith('psql')) {
    verdict.skipped = true;
    verdict.shouldAlert = false;
    verdict.reason = `Skip honesto: hay URL de DB pero la consulta SELECT falló (${queryError.slice(0, 80)}). No se inventan filas.`;
  }
  console.log(`D9 ${verdict.skipped ? 'SKIP' : (verdict.shouldAlert ? 'ALERT' : 'OK')} — ${verdict.reason}`);
  writeGithubOutput({
    skipped: verdict.skipped ? 'true' : 'false',
    alert: verdict.shouldAlert ? 'true' : 'false',
  });
  if (verdict.shouldAlert) {
    const body = buildQuotaIssueBody(verdict, {
      skippedQuery,
      queryError,
      ranAt: now.toISOString(),
    });
    upsertIssue({
      title: '[D9] AI quota ≥ 80% (tenant o plataforma)',
      marker: 'hotclick-d9-ai-quota',
      body,
      labels: ['eng-agent', 'ai-quota', 'cost-alert'],
    });
    sendTelegram(`D9 AI quota ≥ 80%: ${verdict.reason}`);
  }
  return verdict;
}

const isMain = process.argv[1] && process.argv[1].endsWith('ai-quota-alert.mjs');
if (isMain) {
  runAiQuotaAlert().then((verdict) => {
    process.exit(verdict?.skipped || !verdict?.shouldAlert || verdict?.ok !== false ? 0 : 0);
  }).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
