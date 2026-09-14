#!/usr/bin/env node
/**
 * D11 — Daily/weekly OpenAPI / controller vs frontend API contract.
 * Compara @RequestMapping/@GetMapping Java vs frontend/src/services (axios).
 * Issue api-drift con 404s probables. Heurística OK.
 */

import { readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import {
  extractControllerRoutes,
  extractFrontendApiPaths,
  familyOf,
  FRONTEND_SERVICES,
  hasLabel,
  JAVA_MAIN,
  PRIORITY_API_FAMILIES,
  relRepo,
  routeMatches,
  SKIP_LABELS,
  walkFiles,
  writeGithubOutput,
} from './ola4-lib.mjs';
import { upsertIssue } from './ola2-github.mjs';

export function collectControllerRoutes(opts = {}) {
  const root = opts.javaRoot || JAVA_MAIN;
  const files = opts.controllerFiles || walkFiles(root, (abs, name) => (
    name.endsWith('.java') && /\/controller\//.test(abs.replaceAll('\\', '/'))
  ));
  const routes = [];
  for (const abs of files) {
    const rel = typeof abs === 'string' && abs.endsWith('.java') && !abs.includes('/') && opts.readFile
      ? abs
      : relRepo(abs);
    const source = opts.readFile ? opts.readFile(rel) : readFileSync(abs, 'utf8');
    routes.push(...extractControllerRoutes(source, rel));
  }
  return routes;
}

export function collectFrontendCalls(opts = {}) {
  const root = opts.feRoot || FRONTEND_SERVICES;
  const files = opts.serviceFiles || walkFiles(root, (abs, name) => /\.(ts|js)$/.test(name) && !name.includes('.test.'));
  const calls = [];
  for (const abs of files) {
    const rel = typeof abs === 'string' && !abs.includes('/') && opts.readFile ? abs : relRepo(abs);
    const source = opts.readFile ? opts.readFile(rel) : readFileSync(abs, 'utf8');
    calls.push(...extractFrontendApiPaths(source, rel));
  }
  return calls;
}

export function findLikely404s(feCalls, beRoutes) {
  const likely = [];
  for (const call of feCalls) {
    const hit = beRoutes.some((route) => routeMatches(call.path, route.path));
    if (hit) continue;
    likely.push({
      ...call,
      family: familyOf(call.path),
      priority: PRIORITY_API_FAMILIES.includes(familyOf(call.path)),
    });
  }
  likely.sort((a, b) => Number(b.priority) - Number(a.priority) || a.path.localeCompare(b.path));
  return likely;
}

export function buildIssueBody(likely, meta) {
  const prio = likely.filter((x) => x.priority);
  const lines = [
    '## D11 — API contract drift (controllers vs frontend services)',
    '',
    `Última corrida: ${meta.ranAt}`,
    `Rutas Java: **${meta.beCount}** · calls FE: **${meta.feCount}** · 404s heurísticos: **${likely.length}** (prioridad ${prio.length})`,
    '',
    'Compara `@RequestMapping` / `@GetMapping` en `com.hotclick.controller` vs `frontend/src/services` (axios `baseURL: /api`).',
    'Heurística: `{id}` ≡ `${expr}`. Familias foco: `/api/sinpe`, `/api/pos`, `/api/auth`, `/api/payments`.',
    '',
    '| Prioridad | FE path | Método | Service |',
    '| --- | --- | --- | --- |',
  ];
  if (!likely.length) {
    lines.push('| — | — | — | Sin drift |');
  } else {
    for (const item of likely.slice(0, 60)) {
      lines.push(`| ${item.priority ? 'alta' : 'media'} | \`${item.path}\` | ${item.method} | \`${item.file}\` |`);
    }
  }
  lines.push(
    '',
    'No cambia controladores ni lógica de cobro o autenticación.',
    'Issue dedup: ola4-d11-contract.',
  );
  return lines.join('\n');
}

export function runApiDrift(opts = {}) {
  if (hasLabel(process.env.PR_LABELS, SKIP_LABELS.api)) {
    return { skipped: true, likely: [], be: [], fe: [] };
  }
  const be = collectControllerRoutes(opts);
  const fe = collectFrontendCalls(opts);
  const likely = findLikely404s(fe, be);
  return { skipped: false, likely, be, fe };
}

function main() {
  const result = runApiDrift();
  if (result.skipped) {
    console.log('D11 api-drift: skip label');
    return;
  }
  const body = buildIssueBody(result.likely, {
    ranAt: new Date().toISOString(),
    beCount: result.be.length,
    feCount: result.fe.length,
  });
  console.log(`D11 api-drift: ${result.likely.length} 404s heurísticos (BE ${result.be.length} / FE ${result.fe.length})`);
  for (const item of result.likely.filter((x) => x.priority).slice(0, 15)) {
    console.log(`  ${item.method} ${item.path} ← ${item.file}`);
  }
  upsertIssue({
    title: '[D11] API contract drift (controller vs frontend)',
    marker: 'ola4-d11-contract',
    labels: ['api-drift', 'eng-agent'],
    body,
  });
  writeGithubOutput({
    likely: String(result.likely.length),
    priority: String(result.likely.filter((x) => x.priority).length),
  });
}

if (basename(process.argv[1] || '') === 'api-contract-drift.mjs') main();
