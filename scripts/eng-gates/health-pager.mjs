#!/usr/bin/env node
/**
 * E9 — Health down pager.
 * Si /api/health ≠ 200 dos veces seguidas → Issue outage + Telegram opcional.
 * Nunca hace git push para "despertar" Render.
 */

import { basename } from 'node:path';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import {
  DEFAULT_HEALTH_URL,
  SKIP_LABELS,
  evaluateHealth,
  formatHttpStatus,
  hasLabel,
  writeGithubOutput,
} from './ola3-lib.mjs';
import { sendTelegram, upsertIssue } from './ola3-github.mjs';

export function pingHealth(url, runner = defaultCurl) {
  const result = runner(url);
  return {
    url,
    status: formatHttpStatus(result.status),
    ok: Number(result.status) === 200,
    detail: result.detail,
  };
}

function defaultCurl(url) {
  const res = spawnSync('curl', ['-sS', '-o', '/dev/null', '-w', '%{http_code}', '--max-time', '20', url], {
    encoding: 'utf8',
  });
  if (res.status !== 0 && !res.stdout) {
    return { status: '000', detail: res.stderr || res.error?.message || 'curl failed' };
  }
  return { status: res.stdout.trim(), detail: res.stderr || '' };
}

export function readPreviousStatus(filePath) {
  if (!filePath || !existsSync(filePath)) return '';
  try {
    const raw = readFileSync(filePath, 'utf8').trim();
    const json = raw.startsWith('{') ? JSON.parse(raw) : { status: raw };
    return formatHttpStatus(json.status);
  } catch {
    return '';
  }
}

export function writeStatus(filePath, ping) {
  if (!filePath) return;
  writeFileSync(filePath, `${JSON.stringify({
    status: ping.status,
    url: ping.url,
    ts: new Date().toISOString(),
  })}\n`);
}

export function buildOutageBody({ ping, previousStatus, verdict, ranAt = new Date().toISOString() }) {
  return [
    '## E9 — Health down / outage',
    '',
    `Última corrida: ${ranAt}`,
    '',
    `| Campo | Valor |`,
    `| --- | --- |`,
    `| URL | \`${ping.url}\` |`,
    `| Status actual | \`${ping.status}\` |`,
    `| Status previo | \`${previousStatus || '—'}\` |`,
    `| Dos fallos seguidos | ${verdict.consecutiveFails ? 'sí' : 'no'} |`,
    '',
    verdict.recovered
      ? 'Health volvió a 200. Este Issue se actualiza como recuperación (no se cierra solo).'
      : verdict.openOutage
        ? '**OUTAGE** — `/api/health` ≠ 200 en dos corridas seguidas.'
        : verdict.currentOk
          ? 'Health 200. Sin outage.'
          : 'Primer fallo (se espera una segunda corrida antes de paginar).',
    '',
    'Este agente **no** hace `git push` ni redeploy para despertar Render. `keep-alive.yml` ya pinea el endpoint.',
    'Telegram solo si existen `TELEGRAM_BOT_TOKEN` y `TELEGRAM_CHAT_ID` (no se inventan).',
  ].join('\n');
}

export function runHealthPager(opts = {}) {
  if (hasLabel(process.env.PR_LABELS, SKIP_LABELS.health)) {
    return { skipped: true };
  }
  const url = opts.url || process.env.HEALTH_URL || DEFAULT_HEALTH_URL;
  const stateFile = opts.stateFile || process.env.HEALTH_STATE_FILE || '';
  const previousStatus = opts.previousStatus ?? readPreviousStatus(stateFile);
  const injected = process.env.HEALTH_STATUS;
  const ping = opts.ping
    || (injected
      ? { url, status: formatHttpStatus(injected), ok: Number(injected) === 200, detail: 'injected' }
      : pingHealth(url, opts.runner));
  const verdict = evaluateHealth({ currentStatus: ping.status, previousStatus });
  if (stateFile) writeStatus(stateFile, ping);
  return { skipped: false, ping, previousStatus, verdict };
}

function main() {
  const result = runHealthPager();
  if (result.skipped) {
    console.log('E9 health pager: skip label');
    return;
  }
  const { ping, previousStatus, verdict } = result;
  console.log(`E9 health: ${ping.url} status=${ping.status} prev=${previousStatus || '-'} outage=${verdict.openOutage}`);
  const body = buildOutageBody(result);
  if (verdict.openOutage || verdict.recovered) {
    upsertIssue({
      title: verdict.recovered ? '[E9] outage recuperado — /api/health' : '[E9] outage — /api/health ≠ 200',
      marker: 'hotclick-e9-outage',
      labels: ['outage', 'eng-agent'],
      body,
    });
  }
  if (verdict.openOutage) {
    sendTelegram(
      `[ALERTA] HOTCLICK health down\n\nURL: ${ping.url}\nStatus: ${ping.status} (prev ${previousStatus || '?'})\n\nIssue outage actualizado. No se hace git push.`,
    );
  } else if (verdict.recovered) {
    sendTelegram(`[OK] HOTCLICK health recuperado\n\nURL: ${ping.url}\nStatus: 200`);
  }
  writeGithubOutput({
    status: ping.status,
    outage: verdict.openOutage ? 'true' : 'false',
    recovered: verdict.recovered ? 'true' : 'false',
  });
  // El job de keep-alive no debe fallar en el primer ping; solo outage confirmado es failure suave.
  if (verdict.openOutage && process.env.HEALTH_FAIL_ON_OUTAGE === '1') {
    process.exit(1);
  }
}

if (basename(process.argv[1] || '') === 'health-pager.mjs') {
  main();
}
