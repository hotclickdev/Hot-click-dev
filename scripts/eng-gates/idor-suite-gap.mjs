#!/usr/bin/env node
/**
 * S4 — Weekly anti-IDOR suite gap.
 * Busca @GetMapping("/{id}") y similares; cruza con *TenantIsolation* / IDOR tests.
 * Issue + stubs @Disabled en pending/ (no flakean CI).
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import {
  extractControllerRoutes,
  hasLabel,
  isPathIdRoute,
  JAVA_MAIN,
  JAVA_TEST,
  REPO_ROOT,
  relRepo,
  SKIP_LABELS,
  walkFiles,
  writeGithubOutput,
} from './ola4-lib.mjs';
import { upsertIssue } from './ola2-github.mjs';

export const PENDING_STUB_REL =
  'Hot_click_outlet/src/test/java/com/hotclick/pending/IdorSuiteGapStubsTest.java';

const IDOR_TEST_RE = /TenantIsolation|IDOR|Crosstenant|Idor/i;
const TEST_PATH_RE = /["'`](\/api\/[^"'`]+)["'`]/g;

export function collectPathIdEndpoints(opts = {}) {
  const root = opts.javaRoot || JAVA_MAIN;
  const files = opts.controllerFiles || walkFiles(root, (abs, name) => (
    name.endsWith('.java') && /\/controller\//.test(abs.replaceAll('\\', '/'))
  ));
  const endpoints = [];
  for (const abs of files) {
    const rel = opts.readFile && typeof abs === 'string' && !String(abs).includes('/')
      ? abs
      : relRepo(abs);
    const source = opts.readFile ? opts.readFile(rel) : readFileSync(abs, 'utf8');
    for (const route of extractControllerRoutes(source, rel)) {
      if (route.pathId || isPathIdRoute(route.path)) endpoints.push(route);
    }
  }
  return endpoints;
}

export function collectIdorTestCorpus(opts = {}) {
  const root = opts.testRoot || JAVA_TEST;
  const files = opts.testFiles || walkFiles(root, (abs, name) => (
    name.endsWith('.java') && (IDOR_TEST_RE.test(name) || /\/pending\//.test(abs.replaceAll('\\', '/')))
  ));
  const paths = new Set();
  const names = [];
  for (const abs of files) {
    const rel = opts.readFile && typeof abs === 'string' && !String(abs).includes('/')
      ? abs
      : relRepo(abs);
    const source = opts.readFile ? opts.readFile(rel) : readFileSync(abs, 'utf8');
    names.push(rel);
    if (!IDOR_TEST_RE.test(rel) && !IDOR_TEST_RE.test(source) && !/pending/.test(rel)) continue;
    let match;
    const re = new RegExp(TEST_PATH_RE.source, 'g');
    while ((match = re.exec(source))) {
      paths.add(normalizeTestPath(match[1]));
    }
    const concat = source.match(/["'`](\/api\/[^"'`]*\/)["'`]\s*\+/g);
    if (concat) {
      for (const hit of concat) {
        const p = hit.match(/["'`](\/api\/[^"'`]*\/)["'`]/);
        if (p) paths.add(normalizeTestPath(`${p[1]}{id}`));
      }
    }
  }
  return { paths: [...paths], files: names };
}

function normalizeTestPath(raw) {
  return String(raw)
    .replace(/\/\d+(\/|$)/g, '/{id}$1')
    .replace(/\/\$\{[^}]+\}/g, '/{id}')
    .replace(/\/:[A-Za-z_]\w*/g, '/{id}');
}

export function coverageFor(endpoint, corpusPaths) {
  const target = endpoint.path;
  return corpusPaths.some((known) => pathsAlign(target, known));
}

function pathsAlign(endpoint, tested) {
  const a = endpoint.replace(/\{[^}]+\}/g, '{id}');
  const b = tested.replace(/\{[^}]+\}/g, '{id}');
  if (a === b) return true;
  const aDir = a.replace(/\/\{id\}$/, '/');
  return b.startsWith(aDir) || a.startsWith(b.replace(/\/\{id\}$/, '/'));
}

const TENANT_HINT = /\/api\/(bodegas|sucursales|facturas|cotizaciones|crm|pedidos|productos|gastos|equipo|usuarios|carrito|marcas)\b/;

export function stubPriority(endpoint) {
  const path = endpoint.path || '';
  if (TENANT_HINT.test(path) && !/\/api\/admin\//.test(path)) return 0;
  if (/\/api\/admin\//.test(path)) return 2;
  return 1;
}

export function findUncovered(endpoints, corpus) {
  return endpoints
    .filter((ep) => !coverageFor(ep, corpus.paths))
    .sort((a, b) => stubPriority(a) - stubPriority(b) || a.path.localeCompare(b.path));
}

export function buildStubJava(uncovered) {
  const samples = uncovered.slice(0, 12);
  const methods = samples.map((ep, i) => {
    const safe = `${ep.method}_${ep.path}`
      .replace(/[^A-Za-z0-9]+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 60);
    return `
    @Test
    @DisplayName("PENDING ${ep.method} ${ep.path}")
    void pending_${i}_${safe}() {
        // Implementar: tenant A no lee/escribe recurso de tenant B → 403
        // Controller: ${ep.file}
        org.junit.jupiter.api.Assumptions.assumeTrue(false, "S4 stub — no ejecutar");
    }`;
  });
  return `package com.hotclick.pending;

import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * S4 stubs — huecos de la suite anti-IDOR / TenantIsolation.
 * {@code @Disabled} a propósito: no deben flakear ni alargar CI.
 * Ver docs/AGENTES_OLA4.md. Completar en un PR dedicado, no habilitar aquí.
 */
@Disabled("S4 pending IDOR stubs — fuera de CI hasta implementar")
@DisplayName("[S4] Pending IDOR / tenant isolation stubs")
class IdorSuiteGapStubsTest {
${methods.join('\n')}
}
`;
}

export function buildIssueBody(uncovered, covered, meta) {
  const lines = [
    '## S4 — Weekly anti-IDOR suite gap',
    '',
    `Última corrida: ${meta.ranAt}`,
    `Endpoints path-id: **${meta.total}** · cubiertos por *TenantIsolation* / IDOR: **${covered}** · huecos: **${uncovered.length}**`,
    '',
    'Criterio: `@GetMapping("/{id}")` (y PUT/PATCH/DELETE equivalentes) vs tests cuyo nombre o body menciona TenantIsolation / IDOR.',
    `Stubs @Disabled: \`${PENDING_STUB_REL}\` (Surefire los ve skipped; no fallan).`,
    '',
    '| Método | Path | Controller |',
    '| --- | --- | --- |',
  ];
  if (!uncovered.length) {
    lines.push('| — | — | Sin huecos |');
  } else {
    for (const ep of uncovered.slice(0, 40)) {
      lines.push(`| ${ep.method} | \`${ep.path}\` | \`${ep.file}\` |`);
    }
  }
  lines.push(
    '',
    'No habilitar los stubs en CI. No toca Payment/Auth/schedulers. Marker: `hotclick-s4-idor-gap`.',
  );
  return lines.join('\n');
}

export function writePendingStub(uncovered, { destRel = PENDING_STUB_REL, writeFile = writeFileSync } = {}) {
  const abs = join(REPO_ROOT, destRel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFile(abs, buildStubJava(uncovered));
  return destRel;
}

export function runIdorGap(opts = {}) {
  if (hasLabel(process.env.PR_LABELS, SKIP_LABELS.idorGap)) {
    return { skipped: true, uncovered: [], endpoints: [], corpus: { paths: [], files: [] } };
  }
  const endpoints = collectPathIdEndpoints(opts);
  const corpus = collectIdorTestCorpus(opts);
  const uncovered = findUncovered(endpoints, corpus);
  return { skipped: false, uncovered, endpoints, corpus };
}

function main() {
  const result = runIdorGap();
  if (result.skipped) {
    console.log('S4 idor-gap: skip label');
    return;
  }
  const writeStubs = process.env.S4_WRITE_STUBS === '1';
  if (writeStubs) writePendingStub(result.uncovered);
  const covered = result.endpoints.length - result.uncovered.length;
  const body = buildIssueBody(result.uncovered, covered, {
    ranAt: new Date().toISOString(),
    total: result.endpoints.length,
  });
  console.log(`S4 idor-gap: ${result.uncovered.length}/${result.endpoints.length} sin test IDOR/TenantIsolation`);
  upsertIssue({
    title: '[S4] Weekly anti-IDOR suite gap',
    marker: 'hotclick-s4-idor-gap',
    labels: ['idor-gap', 'eng-agent'],
    body,
  });
  writeGithubOutput({
    uncovered: String(result.uncovered.length),
    total: String(result.endpoints.length),
  });
}

if (basename(process.argv[1] || '') === 'idor-suite-gap.mjs') main();
