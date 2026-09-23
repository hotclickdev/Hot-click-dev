#!/usr/bin/env node
/**
 * D12 — Real health (no keep-alive cosmético).
 * Ping /api/health con cuerpo; 2 fallos seguidos → Issue outage + snippet.
 * No inventa /actuator. No hace git push para despertar Render.
 */

import { basename } from 'node:path';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import {
  APP_PROPS_REL,
  DEFAULT_HEALTH_URL,
  HEALTH_CONTROLLER_REL,
  SKIP_LABELS,
  evaluateRealHealth,
  formatHttpStatus,
  hasLabel,
  isCosmeticHealthSource,
  isHealthyResponse,
  readRepo,
  resolveHealthTargets,
  snippetBody,
  writeGithubOutput,
} from './ola7-lib.mjs';
import { sendTelegram, upsertIssue } from './ola7-github.mjs';

export function pingHealth(url, runner = defaultCurl) {
  const result = runner(url);
  const status = formatHttpStatus(result.status);
  const body = String(result.body || '');
  return {
    url,
    status,
    body,
    snippet: snippetBody(body),
    ok: isHealthyResponse(status, body),
    detail: result.detail || '',
  };
}

function defaultCurl(url) {
  const res = spawnSync(
    'curl',
    ['-sS', '--max-time', '20', '-w', '\n__HC_STATUS__:%{http_code}', url],
    { encoding: 'utf8' },
  );
  const out = String(res.stdout || '');
  const match = out.match(/\n__HC_STATUS__:(\d+)\s*$/);
  if (res.status !== 0 && !out) {
    return { status: '000', body: '', detail: res.stderr || res.error?.message || 'curl failed' };
  }
  return {
    status: match ? match[1] : '000',
    body: match ? out.slice(0, match.index) : out,
    detail: res.stderr || '',
  };
}

export function readPrevious(filePath) {
  if (!filePath || !existsSync(filePath)) return { ok: null, status: '' };
  try {
    const json = JSON.parse(readFileSync(filePath, 'utf8'));
    if (typeof json.ok === 'boolean') return { ok: json.ok, status: formatHttpStatus(json.status) };
    return { ok: Number(json.status) === 200, status: formatHttpStatus(json.status) };
  } catch {
    return { ok: null, status: '' };
  }
}

export function writePrevious(filePath, ping) {
  if (!filePath) return;
  writeFileSync(filePath, `${JSON.stringify({
    ok: ping.ok,
    status: ping.status,
    url: ping.url,
    snippet: ping.snippet,
    ts: new Date().toISOString(),
  })}\n`);
}

export function buildOutageBody({ ping, previous, secondary, verdict, cosmetic, actuatorAbsent, ranAt }) {
  const lines = [
    '## D12 — Real health / outage',
    '',
    `Última corrida: ${ranAt}`,
    '',
    '| Campo | Valor |',
    '| --- | --- |',
    `| URL | \`${ping.url}\` |`,
    `| HTTP | \`${ping.status}\` |`,
    `| Cuerpo (snippet) | \`${ping.snippet}\` |`,
    `| Previo | \`${previous.status || '—'}\` ok=${previous.ok ?? '—'} |`,
    `| Dos fallos reales | ${verdict.consecutiveFails ? 'sí' : 'no'} |`,
    '',
  ];
  if (verdict.openOutage) {
    lines.push('**OUTAGE** — `/api/health` falló dos veces (HTTP ≠200, cuerpo vacío, HTML de parking, o JSON no UP).');
  } else if (verdict.recovered) {
    lines.push('Health volvió a una respuesta real 200. Este Issue se actualiza (no se cierra solo).');
  } else if (!verdict.currentOk) {
    lines.push('Primer fallo real (se espera una segunda corrida antes de paginar).');
  } else {
    lines.push('Health 200 con cuerpo de servicio (no HTML de keep-alive).');
  }
  lines.push('');
  if (secondary) {
    lines.push(
      `### Path secundario (solo si ` + '`HEALTH_SECONDARY_URL`' + ` existe)`,
      '',
      `| URL | HTTP | ok | snippet |`,
      `| --- | --- | --- | --- |`,
      `| \`${secondary.url}\` | \`${secondary.status}\` | ${secondary.ok ? 'sí' : 'no'} | \`${secondary.snippet}\` |`,
      '',
    );
  } else {
    lines.push(
      'No hay path secundario: `HEALTH_SECONDARY_URL` no está seteado.',
      actuatorAbsent
        ? '`application.properties` documenta que **actuator no está instalado** — no se pinea `/actuator/**`.'
        : 'Sin URL secundaria documentada; no se inventa actuator.',
      '',
    );
  }
  if (cosmetic) {
    lines.push(
      'Nota de código: `HealthController` responde `status=UP` sin ping a DB. D12 no trata eso como outage (el proceso está up); E9/keep-alive siguen siendo status-only.',
      '',
    );
  }
  lines.push(
    'Este agente **no** hace `git push` ni redeploy para despertar Render.',
    '`keep-alive.yml` sigue siendo el ping cosmético. Complementa E9 con cuerpo + HTML-as-fail.',
    'Telegram solo si existen `TELEGRAM_BOT_TOKEN` y `TELEGRAM_CHAT_ID`.',
  );
  return lines.join('\n');
}

function pingOrInject(url, opts) {
  if (opts.ping) return opts.ping;
  const injected = process.env.HEALTH_STATUS;
  if (injected != null && injected !== '') {
    const body = process.env.HEALTH_BODY || '';
    const status = formatHttpStatus(injected);
    return { url, status, body, snippet: snippetBody(body), ok: isHealthyResponse(status, body), detail: 'injected' };
  }
  return pingHealth(url, opts.runner);
}

export function runRealHealth(opts = {}) {
  if (hasLabel(process.env.PR_LABELS, SKIP_LABELS.health) || process.env.SKIP_REAL_HEALTH === '1') {
    return { skipped: true };
  }
  const propsText = opts.propsText ?? readRepo(APP_PROPS_REL);
  const javaSrc = opts.javaSource ?? readRepo(HEALTH_CONTROLLER_REL);
  const targets = resolveHealthTargets(opts.env || process.env, propsText);
  const url = opts.url || targets.primary || DEFAULT_HEALTH_URL;
  const stateFile = opts.stateFile || process.env.HEALTH_STATE_FILE || '';
  const previous = opts.previous ?? readPrevious(stateFile);
  const ping = pingOrInject(url, opts);
  const verdict = evaluateRealHealth({ currentOk: ping.ok, previousOk: previous.ok });
  if (stateFile) writePrevious(stateFile, ping);
  let secondary = null;
  if (targets.secondary) {
    secondary = opts.secondaryPing || pingHealth(targets.secondary, opts.runner);
  }
  return {
    skipped: false,
    ping,
    previous,
    verdict,
    secondary,
    cosmetic: isCosmeticHealthSource(javaSrc),
    actuatorAbsent: targets.actuatorAbsent,
    targets,
  };
}

function main() {
  const result = runRealHealth();
  if (result.skipped) {
    console.log('D12 real health: skip label');
    return;
  }
  const { ping, previous, verdict, secondary } = result;
  console.log(
    `D12 health: ${ping.url} status=${ping.status} ok=${ping.ok} prev=${previous.status || '-'} outage=${verdict.openOutage}`,
  );
  const body = buildOutageBody({ ...result, ranAt: new Date().toISOString() });
  if (verdict.openOutage || verdict.recovered) {
    upsertIssue({
      title: verdict.recovered
        ? '[D12] outage recuperado — /api/health real'
        : '[D12] outage — /api/health real ≠ UP',
      marker: 'hotclick-d12-real-health',
      labels: ['outage', 'eng-agent'],
      body,
    });
  }
  if (verdict.openOutage) {
    sendTelegram(
      `[ALERTA] HOTCLICK health real down\n\nURL: ${ping.url}\nHTTP: ${ping.status}\nBody: ${ping.snippet}\n\nIssue D12 actualizado. No se hace git push.`,
    );
  } else if (verdict.recovered) {
    sendTelegram(`[OK] HOTCLICK health real recuperado\n\nURL: ${ping.url}\nHTTP: ${ping.status}`);
  }
  writeGithubOutput({
    status: ping.status,
    ok: ping.ok ? 'true' : 'false',
    outage: verdict.openOutage ? 'true' : 'false',
    recovered: verdict.recovered ? 'true' : 'false',
    secondary: secondary ? (secondary.ok ? 'ok' : 'fail') : 'unset',
  });
  if (verdict.openOutage && process.env.D12_FAIL_ON_OUTAGE === '1') process.exit(1);
}

if (basename(process.argv[1] || '') === 'real-health.mjs') {
  main();
}
