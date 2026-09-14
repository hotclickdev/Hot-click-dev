#!/usr/bin/env node
/**
 * D4 + E8 — Sentry digest → GitHub Issue.
 * Si falta SENTRY_TOKEN el job corre igual, declara el skip y opcionalmente
 * arma un Issue liviano con fallos de keep-alive / health. No inventa tokens.
 */

import { basename } from 'node:path';
import {
  SKIP_LABELS,
  hasLabel,
  mapSentryIssue,
  redactSecrets,
  sentryTokenPresent,
  writeGithubOutput,
} from './ola3-lib.mjs';
import { listWorkflowRuns, upsertIssue } from './ola3-github.mjs';

const SENTRY_HOST = process.env.SENTRY_HOST || 'https://sentry.io';
const SENTRY_ORG = process.env.SENTRY_ORG || 'hotclick';
const SENTRY_PROJECT = process.env.SENTRY_PROJECT || 'hot-click-dev';

export async function fetchSentryIssues(opts = {}) {
  const env = opts.env || process.env;
  const token = String(env.SENTRY_TOKEN || env.SENTRY_AUTH_TOKEN || '').trim();
  if (!token) {
    return {
      skipped: true,
      issues: [],
      note: 'SENTRY_TOKEN (o SENTRY_AUTH_TOKEN) ausente — API Sentry omitida. No se inventa el token.',
    };
  }
  const fetchImpl = opts.fetchImpl || globalThis.fetch;
  if (!fetchImpl) {
    return { skipped: true, issues: [], note: 'fetch no disponible — API Sentry omitida' };
  }
  const org = opts.org || SENTRY_ORG;
  const project = opts.project || SENTRY_PROJECT;
  const url = `${SENTRY_HOST}/api/0/projects/${org}/${project}/issues/?query=is:unresolved&limit=15`;
  try {
    const res = await fetchImpl(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      return {
        skipped: false,
        issues: [],
        note: `Sentry API HTTP ${res.status}. Revisá SENTRY_ORG/SENTRY_PROJECT y scopes event:read.`,
      };
    }
    const json = await res.json();
    const issues = (Array.isArray(json) ? json : json.issues || []).map(mapSentryIssue);
    return { skipped: false, issues, note: '' };
  } catch (error) {
    return { skipped: false, issues: [], note: `Sentry API error: ${error.message}` };
  }
}

export function collectHealthFallback(runs = []) {
  const failed = runs.filter((run) => run.conclusion === 'failure');
  return {
    recentFails: failed.length,
    lastConclusion: runs[0]?.conclusion || 'unknown',
    samples: failed.slice(0, 5).map((run) => ({
      id: run.databaseId,
      url: run.url,
      title: run.displayTitle || run.name,
    })),
  };
}

export function buildDigestBody({ sentry, health, ranAt = new Date().toISOString() }) {
  const lines = [
    '## D4 + E8 — Sentry digest / prod-errors',
    '',
    `Última corrida: ${ranAt}`,
    '',
    'Complementa `SentryWebhookService` (`POST /api/webhooks/sentry` → Telegram + remediación).',
    'Este agente **tira** issues no resueltos por API; no reemplaza el webhook inbound.',
    'No commitear DSN ni tokens. Labels: `sentry` / `prod-errors`.',
    '',
    '### Sentry API',
    '',
  ];
  if (sentry.skipped) {
    lines.push(sentry.note || 'SENTRY_TOKEN ausente — Sentry omitido.');
  } else if (sentry.note) {
    lines.push(sentry.note);
  } else if (!sentry.issues.length) {
    lines.push('Sin issues unresolved en el recorte (o proyecto vacío).');
  } else {
    lines.push(`Unresolved (tope 15): **${sentry.issues.length}**`, '');
    for (const issue of sentry.issues.slice(0, 15)) {
      const link = issue.permalink || '(sin permalink)';
      const extra = [
        issue.endpoint && `endpoint \`${issue.endpoint}\``,
        issue.release && `release \`${issue.release}\``,
        issue.sha && `SHA \`${issue.sha}\``,
      ].filter(Boolean).join(' · ');
      lines.push(
        `- **${issue.level}** [${issue.shortId}](${link}) — ${redactSecrets(issue.title)}`,
        extra ? `  ${extra}` : '  (sin culprit/release en el payload)',
      );
    }
  }
  lines.push('', '### Fallback keep-alive / health (si Sentry se omitió o como contexto)', '');
  if (!health || health.recentFails === 0) {
    lines.push('Sin fallos recientes de `Keep Render Alive` / health-pager en el recorte.');
  } else {
    lines.push(`${health.recentFails} run(s) en failure. Última conclusión: \`${health.lastConclusion}\`.`);
    for (const sample of health.samples) {
      lines.push(`- [${sample.title || sample.id}](${sample.url})`);
    }
  }
  return lines.join('\n');
}

export function buildPerIssueBody(issue) {
  return [
    '## E8 — Sentry prod error',
    '',
    `**${issue.level}** \`${issue.shortId}\``,
    '',
    redactSecrets(issue.title),
    '',
    `| Campo | Valor |`,
    `| --- | --- |`,
    `| Endpoint / culprit | \`${issue.endpoint || '—'}\` |`,
    `| Release | \`${issue.release || '—'}\` |`,
    `| SHA | \`${issue.sha || '—'}\` |`,
    `| Count | ${issue.count || '—'} |`,
    `| Last seen | ${issue.lastSeen || '—'} |`,
    `| Link | ${issue.permalink || '—'} |`,
    '',
    'Dedup por id Sentry. No se aplica fix automático. No tocar pago/auth desde este Issue.',
  ].join('\n');
}

export async function runSentryDigest(opts = {}) {
  if (hasLabel(process.env.PR_LABELS, SKIP_LABELS.sentry)) {
    return { skipped: true };
  }
  const sentry = opts.sentry || await fetchSentryIssues(opts);
  const healthRuns = opts.healthRuns || listWorkflowRuns({
    workflow: 'Keep Render Alive',
    limit: 8,
  });
  const health = collectHealthFallback(healthRuns);
  return { skipped: false, sentry, health };
}

async function main() {
  const result = await runSentryDigest();
  if (result.skipped) {
    console.log('D4 Sentry digest: skip label');
    return;
  }
  const tokenMissing = result.sentry.skipped;
  if (tokenMissing) {
    console.log(`D4 Sentry digest: ${result.sentry.note}`);
  } else {
    console.log(`D4 Sentry digest: ${result.sentry.issues.length} unresolved`);
  }

  const digestBody = buildDigestBody(result);
  const openLightHealth = tokenMissing && result.health.recentFails >= 2;
  upsertIssue({
    title: tokenMissing
      ? '[D4] Sentry omitido — digest keep-alive/health'
      : '[D4] Sentry digest unresolved',
    marker: 'hotclick-d4-sentry-digest',
    labels: ['sentry', 'prod-errors', 'eng-agent'],
    body: digestBody,
  });

  if (!tokenMissing) {
    for (const issue of result.sentry.issues.slice(0, 5)) {
      if (!issue.id) continue;
      upsertIssue({
        title: `[E8] ${issue.shortId}: ${issue.title}`.slice(0, 80),
        marker: `hotclick-e8-sentry-${issue.id}`,
        labels: ['sentry', 'prod-errors', 'eng-agent'],
        body: buildPerIssueBody(issue),
      });
    }
  } else if (openLightHealth) {
    upsertIssue({
      title: '[D4] Health/keep-alive failures (Sentry omitido)',
      marker: 'hotclick-d4-health-fallback',
      labels: ['sentry', 'prod-errors', 'eng-agent'],
      body: digestBody,
    });
  }

  writeGithubOutput({
    sentry: tokenMissing ? 'skipped' : 'queried',
    issues: String(result.sentry.issues.length),
    healthFails: String(result.health.recentFails),
  });
}

if (basename(process.argv[1] || '') === 'sentry-digest.mjs') {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
