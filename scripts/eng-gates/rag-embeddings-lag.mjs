#!/usr/bin/env node
/**
 * S12 — Weekly RAG embeddings lag.
 * SELECT count de productos visibles sin embedding (V62/V64). Skip honesto sin DB secret.
 * No escribe en prod. No toca EmbeddingIndexerService / schedulers.
 */

import { spawnSync } from 'node:child_process';
import { basename } from 'node:path';
import {
  RAG_LAG_SELECT,
  RAG_LAG_THRESHOLD,
  RAG_MODEL,
  SKIP_LABELS,
  dbSecretsPresent,
  evaluateEmbeddingsLag,
  hasLabel,
  parseLagCount,
  pickDbUrl,
  writeGithubOutput,
} from './ola6-lib.mjs';
import { upsertIssue } from './ola6-github.mjs';

export function queryLag({ url, runner = defaultPsql }) {
  return runner(url, RAG_LAG_SELECT);
}

function defaultPsql(url, sql) {
  const res = spawnSync('psql', [
    url,
    '--no-psqlrc',
    '-v', 'ON_ERROR_STOP=1',
    '-A', '-t',
    '-c', sql,
  ], {
    encoding: 'utf8',
    env: { ...process.env, PGSSLMODE: process.env.PGSSLMODE || 'require' },
    timeout: 25_000,
  });
  if (res.status !== 0) {
    return { ok: false, lag: 0, error: (res.stderr || res.error?.message || 'psql failed').slice(0, 400) };
  }
  return { ok: true, lag: parseLagCount(res.stdout), error: '' };
}

export function buildS12IssueBody(verdict, ranAt) {
  return [
    '## S12 — RAG embeddings lag',
    '',
    `Última corrida: ${ranAt}`,
    '',
    verdict.reason,
    '',
    `Modelo actual: \`${RAG_MODEL}\` (V64). Tabla: \`hot_click_producto_embedding_tb\` (V62).`,
    `Criterio (igual espíritu que \`ProductoEmbeddingRepository.findProductosSinEmbedding\`): producto activo, visible_catalogo, con empresa, sin fila o modelo ≠ ${RAG_MODEL}.`,
    '',
    'SELECT only. **No** dispara el indexer ni toca `@Scheduled` / ShedLock.',
    '',
    '```sql',
    RAG_LAG_SELECT,
    '```',
  ].join('\n');
}

export async function runRagLag({
  env = process.env,
  query,
} = {}) {
  if (hasLabel(env.PR_LABELS, SKIP_LABELS.rag) || env.SKIP_RAG_LAG === '1') {
    return { skipped: true, shouldIssue: false, reason: `Label ${SKIP_LABELS.rag}` };
  }
  const secretsPresent = dbSecretsPresent(env);
  if (!secretsPresent) {
    return evaluateEmbeddingsLag({ secretsPresent: false });
  }
  const picked = pickDbUrl(env);
  const queried = query
    ? query(picked.url)
    : queryLag({ url: picked.url });
  return evaluateEmbeddingsLag({
    secretsPresent: true,
    lag: queried.lag,
    queryOk: queried.ok,
    queryError: queried.error,
    threshold: Number(env.RAG_LAG_THRESHOLD || RAG_LAG_THRESHOLD),
  });
}

async function main() {
  const verdict = await runRagLag();
  console.log(`S12 ${verdict.skipped ? 'SKIP' : verdict.shouldIssue ? 'ISSUE' : 'OK'} ${verdict.reason}`);
  writeGithubOutput({
    skipped: verdict.skipped ? 'true' : 'false',
    issue: verdict.shouldIssue ? 'true' : 'false',
    lag: String(verdict.lag || 0),
  });
  if (verdict.shouldIssue) {
    upsertIssue({
      title: `[S12] RAG embeddings lag ${verdict.lag} > ${verdict.threshold}`,
      marker: 'hotclick-s12-rag-lag',
      labels: ['eng-agent', 'rag'],
      body: buildS12IssueBody(verdict, new Date().toISOString()),
    });
  }
}

if (basename(process.argv[1] || '') === 'rag-embeddings-lag.mjs') {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
