#!/usr/bin/env node
/**
 * S6 — Weekly k6 / Hikari regression.
 * Mock local o K6_BASE_URL de staging. Nunca pega prod sin K6_ALLOW_PRODUCTION.
 * Issue si no hay secreto (instrucciones + umbrales parseados) o si p95/error > baseline.
 */

import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import http from 'node:http';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import {
  HIKARI_METRICS_REL,
  HIKARI_PROPS_REL,
  K6_BASELINE_REL,
  K6_SMOKE_REL,
  LOADTEST_SCRIPTS,
  REPO_ROOT,
  SKIP_LABELS,
  compareToBaseline,
  hasLabel,
  loadBaseline,
  mergeScriptThresholds,
  parseHikariMetricFields,
  parseHikariPoolSize,
  parseK6Summary,
  percentile,
  readRepo,
  resolveK6Target,
  writeGithubOutput,
} from './ola6-lib.mjs';
import { upsertIssue } from './ola6-github.mjs';

export function collectScriptThresholds(readFile = readRepo) {
  const sources = LOADTEST_SCRIPTS
    .map((path) => ({ path, text: readFile(path) }))
    .filter((item) => item.text);
  return mergeScriptThresholds(sources);
}

export function startMockHealthServer() {
  const server = http.createServer((req, res) => {
    const url = String(req.url || '');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(url.includes('health') ? '{"status":"UP"}' : '{"ok":true}');
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, url: `http://127.0.0.1:${port}` });
    });
  });
}

export function runNodeSmoke(baseUrl, { fetchImpl = fetch, times = 8 } = {}) {
  const durations = [];
  let fails = 0;
  return (async () => {
    for (let i = 0; i < times; i += 1) {
      const started = Date.now();
      try {
        const res = await fetchImpl(`${baseUrl}/api/health`);
        durations.push(Date.now() - started);
        if (res.status !== 200) fails += 1;
      } catch {
        durations.push(Date.now() - started);
        fails += 1;
      }
    }
    return {
      tool: 'node-smoke',
      p95_ms: percentile(durations, 95),
      error_rate: fails / times,
      hikari_awaiting: 0,
    };
  })();
}

export function runK6Smoke(baseUrl, { runner = defaultK6, script = join(REPO_ROOT, K6_SMOKE_REL) } = {}) {
  return runner(baseUrl, script);
}

function defaultK6(baseUrl, script) {
  const dir = mkdtempSync(join(tmpdir(), 'k6-s6-'));
  const summaryPath = join(dir, 'summary.json');
  const res = spawnSync('k6', [
    'run',
    '--quiet',
    '--summary-export', summaryPath,
    '-e', `BASE_URL=${baseUrl}`,
    script,
  ], {
    encoding: 'utf8',
    timeout: 60_000,
  });
  if (res.status !== 0 && res.error?.code === 'ENOENT') {
    return { ok: false, missing: true, metrics: null, error: 'k6 no instalado' };
  }
  if (res.status !== 0) {
    return { ok: false, missing: false, metrics: null, error: (res.stderr || res.stdout || 'k6 failed').slice(0, 400) };
  }
  try {
    const summary = JSON.parse(readFileSync(summaryPath, 'utf8'));
    return { ok: true, missing: false, metrics: parseK6Summary(summary), error: '' };
  } catch (error) {
    return { ok: false, missing: false, metrics: null, error: error.message };
  }
}

export function hikariNotes(readFile = readRepo) {
  return {
    poolSize: parseHikariPoolSize(readFile(HIKARI_PROPS_REL)),
    fields: parseHikariMetricFields(readFile(HIKARI_METRICS_REL)),
    endpoint: 'GET /api/admin/observabilidad (ADMIN). S6 no lo pega: requiere JWT. F29 métricas Hikari en ObservabilityJvmMetrics.',
  };
}

export function buildS6IssueBody({ target, thresholds, baseline, comparison, hikari, ranAt, smoke }) {
  const lines = [
    '## S6 — Weekly k6 / Hikari regression',
    '',
    `Última corrida: ${ranAt}`,
    '',
    `**Modo:** \`${target.mode}\` — ${target.reason}`,
    '',
    '### Umbrales parseados de scripts existentes',
    '',
    `p95 más estricto visto: **${thresholds.p95} ms**. error_rate más estricto: **${thresholds.errorRate}**.`,
    '',
    'Scripts:',
    ...thresholds.scripts.map((path) => `- \`${path}\``),
    '',
    '### Baseline (commiteado)',
    '',
    `- p95 ≤ **${baseline.p95_ms} ms**`,
    `- error_rate ≤ **${baseline.error_rate}**`,
    `- hikari_awaiting ≤ **${baseline.hikari_awaiting_max}**`,
    `- fuente: ${baseline.source || K6_BASELINE_REL}`,
    '',
    '### Smoke',
    '',
    smoke
      ? `tool=${smoke.tool || 'k6'} p95=${smoke.p95_ms}ms error_rate=${smoke.error_rate}`
      : 'No se corrió smoke contra un host remoto.',
    comparison ? `\n${comparison.reason}` : '',
    '',
    '### Hikari (F29, solo lectura de código)',
    '',
    `- pool size en properties: **${hikari.poolSize ?? '—'}**`,
    `- campos MXBean: ${hikari.fields.join(', ') || '—'}`,
    `- ${hikari.endpoint}`,
    '',
    '### Cómo correr contra staging',
    '',
    '1. Secretos de repo: `K6_BASE_URL` (staging, p. ej. Render). **No** uses `https://hotclick.lat` ni `18.227.68.15`.',
    '2. Opcional: `K6_ALLOW_PRODUCTION=1` solo si un humano quiere pegar prod a propósito.',
    '3. Local: `k6 run -e BASE_URL=http://localhost:8080 loadtest/k6-pos-checkout.js` (eso sí pega tu JVM local; no es CI).',
    '',
    'Este agente **no** fuerza deploy ni escribe en prod.',
  ];
  return lines.filter((line) => line !== '').join('\n');
}

export async function runK6Hikari({
  env = process.env,
  readFile = readRepo,
  smokeFn,
} = {}) {
  if (hasLabel(env.PR_LABELS, SKIP_LABELS.k6) || env.SKIP_K6_HIKARI === '1') {
    return { skipped: true, shouldIssue: false, reason: `Label ${SKIP_LABELS.k6}` };
  }
  const target = resolveK6Target(env);
  const thresholds = collectScriptThresholds(readFile);
  const baseline = loadBaseline(readFile(K6_BASELINE_REL));
  const hikari = hikariNotes(readFile);
  let smoke = null;
  let comparison = null;

  if (target.mode === 'staging') {
    smoke = await runSmoke(target.url, smokeFn);
    comparison = compareToBaseline(smoke, baseline);
  } else if (target.mode === 'mock') {
    const mock = await startMockHealthServer();
    try {
      smoke = await runSmoke(mock.url, smokeFn);
      smoke.tool = smoke.tool || 'mock';
      comparison = compareToBaseline(smoke, baseline);
    } finally {
      mock.server.close();
    }
  }

  const shouldIssue = target.mode !== 'staging' || Boolean(comparison?.over);
  return {
    skipped: false,
    shouldIssue,
    target,
    thresholds,
    baseline,
    hikari,
    smoke,
    comparison,
    reason: shouldIssue
      ? (target.mode === 'staging' ? comparison.reason : target.reason)
      : comparison?.reason,
  };
}

async function runSmoke(url, smokeFn) {
  if (smokeFn) return smokeFn(url);
  const k6 = runK6Smoke(url);
  if (k6.ok && k6.metrics) return { tool: 'k6', ...k6.metrics, hikari_awaiting: 0 };
  return runNodeSmoke(url);
}

async function main() {
  const result = await runK6Hikari();
  if (result.skipped) {
    console.log(`S6 skip: ${result.reason}`);
    writeGithubOutput({ skipped: 'true' });
    return;
  }
  const body = buildS6IssueBody({ ...result, ranAt: new Date().toISOString() });
  console.log(`S6 ${result.shouldIssue ? 'ISSUE' : 'OK'} ${result.reason}`);
  writeGithubOutput({
    skipped: 'false',
    issue: result.shouldIssue ? 'true' : 'false',
    mode: result.target.mode,
  });
  if (result.shouldIssue) {
    upsertIssue({
      title: '[S6] k6 / Hikari regression (baseline + smoke)',
      marker: 'hotclick-s6-k6-hikari',
      labels: ['eng-agent', 'perf'],
      body,
    });
  }
}

if (basename(process.argv[1] || '') === 'k6-hikari-regression.mjs') {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
