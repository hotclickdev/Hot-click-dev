#!/usr/bin/env node
/**
 * E16 — Runtime endpoint failure → Issue.
 * PaymentController / WebhookController / FacturaController.
 * Dedup por fingerprint + hints de idempotencia (StripeEvento / txn).
 * Sin SENTRY_TOKEN: cron skip honesto; workflow_dispatch acepta JSON pegado.
 */

import { basename } from 'node:path';
import {
  CRITICAL_CONTROLLERS,
  SKIP_LABELS,
  classifyController,
  eventIsCron,
  fingerprintMarker,
  hasLabel,
  parseFingerprintPayload,
  redactSecrets,
  sentryQueryControllers,
  sentryTokenPresent,
  writeGithubOutput,
} from './ola7-lib.mjs';
import { upsertIssue } from './ola7-github.mjs';

const SENTRY_HOST = process.env.SENTRY_HOST || 'https://sentry.io';
const SENTRY_ORG = process.env.SENTRY_ORG || 'hotclick';
const SENTRY_PROJECT = process.env.SENTRY_PROJECT || 'hot-click-dev';

export function mapSentryHit(raw) {
  const title = redactSecrets(raw?.title || raw?.metadata?.value || 'Error runtime');
  const culprit = redactSecrets(raw?.culprit || '');
  const parsed = parseFingerprintPayload(JSON.stringify({
    fingerprint: raw?.id || raw?.shortId || title,
    title,
    culprit,
    endpoint: culprit,
    level: raw?.level || 'error',
  }));
  return {
    id: String(raw?.id || raw?.shortId || ''),
    shortId: raw?.shortId || raw?.id || '',
    permalink: String(raw?.permalink || ''),
    payload: parsed.ok ? parsed.payload : null,
    title,
    culprit,
  };
}

export async function fetchControllerIssues(opts = {}) {
  const env = opts.env || process.env;
  if (!sentryTokenPresent(env)) {
    return { skipped: true, hits: [], note: 'SENTRY_TOKEN ausente — API omitida. No se inventa el token.' };
  }
  const fetchImpl = opts.fetchImpl || globalThis.fetch;
  if (!fetchImpl) {
    return { skipped: true, hits: [], note: 'fetch no disponible — API Sentry omitida' };
  }
  const query = encodeURIComponent(sentryQueryControllers());
  const url = `${SENTRY_HOST}/api/0/projects/${SENTRY_ORG}/${SENTRY_PROJECT}/issues/?query=${query}&limit=15`;
  try {
    const res = await fetchImpl(url, {
      headers: { Authorization: `Bearer ${String(env.SENTRY_TOKEN || env.SENTRY_AUTH_TOKEN).trim()}` },
    });
    if (!res.ok) {
      return { skipped: false, hits: [], note: `Sentry API HTTP ${res.status}` };
    }
    const json = await res.json();
    const rows = Array.isArray(json) ? json : json.issues || [];
    const hits = rows
      .map(mapSentryHit)
      .filter((hit) => classifyController(`${hit.title} ${hit.culprit}`));
    return { skipped: false, hits, note: '' };
  } catch (error) {
    return { skipped: false, hits: [], note: `Sentry API error: ${error.message}` };
  }
}

export function evaluateRuntimeEndpoint({
  tokenPresent,
  eventName,
  pastedRaw,
  sentryHits = [],
}) {
  const cron = eventIsCron(eventName);
  const pasted = pastedRaw != null && String(pastedRaw).trim() !== ''
    ? parseFingerprintPayload(pastedRaw)
    : null;
  if (pasted && !pasted.ok) {
    return { skipped: false, error: pasted.error, items: [], reason: pasted.error };
  }
  if (pasted?.ok) {
    return { skipped: false, error: '', items: [pasted.payload], reason: 'fingerprint JSON (workflow_dispatch)' };
  }
  if (tokenPresent && sentryHits.length) {
    return {
      skipped: false,
      error: '',
      items: sentryHits.map((hit) => hit.payload).filter(Boolean),
      reason: 'Sentry API',
    };
  }
  if (!tokenPresent && cron) {
    return {
      skipped: true,
      error: '',
      items: [],
      reason: 'SENTRY_TOKEN ausente — cron no inventa eventos. Pegá fingerprint JSON en workflow_dispatch.',
    };
  }
  if (!tokenPresent) {
    return {
      skipped: true,
      error: '',
      items: [],
      reason: 'SENTRY_TOKEN ausente y sin JSON pegado — skip honesto.',
    };
  }
  return { skipped: false, error: '', items: [], reason: 'Sentry sin hits de controllers críticos' };
}

export function buildRuntimeIssueBody(item, ranAt = new Date().toISOString()) {
  const hints = item.hints || classifyController(item.controller || item.culprit || item.fingerprint);
  const lines = [
    '## E16 — Runtime endpoint failure',
    '',
    `Última corrida: ${ranAt}`,
    '',
    '| Campo | Valor |',
    '| --- | --- |',
    `| Fingerprint | \`${item.fingerprint}\` |`,
    `| Controller | \`${item.controller || '—'}\` |`,
    `| Culprit | \`${item.culprit || '—'}\` |`,
    `| Endpoint | \`${item.endpoint || hints?.endpointHint || '—'}\` |`,
    `| Nivel | \`${item.level || 'error'}\` |`,
    `| txn id | \`${item.txnId || '—'}\` |`,
    `| StripeEvento / event id | \`${item.stripeEventId || '—'}\` |`,
    '',
    redactSecrets(item.title || ''),
    '',
    '### Idempotencia',
    '',
    hints?.idempotency || 'Revisá ids de transacción / evento antes de reintentar a mano.',
    '',
    '### Scheduler relacionado (solo enlace; este agente no lo modifica)',
    '',
    hints?.scheduler || '_Ninguno de negocio para este controller. No se toca DataRetention / Hacienda / wallet / RAG._',
    '',
    'Controllers cubiertos: `PaymentController`, `WebhookController`, `FacturaController`.',
    'Dedup por fingerprint (`<!-- hotclick-e16-… -->`). No aplica fix. No escribe en prod.',
  ];
  return lines.join('\n');
}

export function controllersHelpBody(reason, ranAt = new Date().toISOString()) {
  return [
    '## E16 — stub / skip',
    '',
    `Última corrida: ${ranAt}`,
    '',
    reason,
    '',
    'Pegá un JSON así en `workflow_dispatch` → `fingerprint_json` (sin secretos):',
    '',
    '```json',
    '{"fingerprint":"PaymentController.timeout","culprit":"PaymentController","title":"timeout en checkout","txnId":"txn-ci-1","stripeEventId":"evt-ci-1"}',
    '```',
    '',
    `Query Sentry (si hay token): \`${sentryQueryControllers()}\``,
    '',
    `Controllers: ${CRITICAL_CONTROLLERS.map((c) => c.name).join(', ')}.`,
  ].join('\n');
}

export async function runRuntimeEndpoint(opts = {}) {
  if (hasLabel(process.env.PR_LABELS, SKIP_LABELS.runtime) || process.env.SKIP_RUNTIME_ENDPOINT === '1') {
    return { skipped: true };
  }
  const env = opts.env || process.env;
  const tokenPresent = sentryTokenPresent(env);
  const sentry = opts.sentry || (tokenPresent ? await fetchControllerIssues({ env, fetchImpl: opts.fetchImpl }) : {
    skipped: true,
    hits: [],
    note: 'SENTRY_TOKEN ausente',
  });
  const verdict = evaluateRuntimeEndpoint({
    tokenPresent,
    eventName: opts.eventName || env.GITHUB_EVENT_NAME,
    pastedRaw: opts.pastedRaw != null ? opts.pastedRaw : env.FINGERPRINT_JSON,
    sentryHits: sentry.hits || [],
  });
  return { skipped: verdict.skipped, tokenPresent, sentry, verdict };
}

async function main() {
  const result = await runRuntimeEndpoint();
  if (result.skipped && result.verdict == null) {
    console.log('E16 runtime endpoint: skip label');
    return;
  }
  const { verdict } = result;
  console.log(`E16 runtime: skipped=${verdict.skipped} items=${verdict.items.length} ${verdict.reason}`);
  if (verdict.error) {
    console.error(`E16 JSON: ${verdict.error}`);
    writeGithubOutput({ skipped: 'false', error: verdict.error });
    process.exit(1);
  }
  if (verdict.skipped) {
    console.log(verdict.reason);
    console.log(controllersHelpBody(verdict.reason));
    writeGithubOutput({ skipped: 'true', reason: verdict.reason });
    return;
  }
  for (const item of verdict.items.slice(0, 8)) {
    upsertIssue({
      title: `[E16] ${item.controller || 'endpoint'}: ${item.title}`.slice(0, 80),
      marker: fingerprintMarker(item.fingerprint),
      labels: ['eng-agent', 'prod-errors'],
      body: buildRuntimeIssueBody(item),
    });
  }
  writeGithubOutput({
    skipped: 'false',
    items: String(verdict.items.length),
    source: verdict.reason,
  });
}

if (basename(process.argv[1] || '') === 'runtime-endpoint-issue.mjs') {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
