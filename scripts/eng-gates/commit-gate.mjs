#!/usr/bin/env node
/**
 * E4 — Commit-gate en PR / workflow_dispatch.
 * Espíritu de .cursor/skills/commit-gate: lints/tests del diff, VEREDICTO LISTO|BLOQUEADO.
 * Runtime acotado: tests tocados + timeouts; no e2e; no mvn test del módulo entero.
 */

import { basename, join } from 'node:path';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import {
  evaluateFlyway,
  evaluateSensitive,
  evaluateSpa,
  evaluateTenant,
  gitChangedFiles,
  gitUnifiedDiff,
  isEntityPath,
  listFiles,
  parseUnifiedDiff,
  repoHasActualizado,
  scanTenantDiff,
} from './lib.mjs';
import {
  REPO_ROOT,
  SKIP_LABELS,
  git,
  hasLabel,
  javaTestClassName,
  pickJavaTests,
  planCommitChecks,
  scanCommitBlockers,
  writeGithubOutput,
} from './ola3-lib.mjs';
import { upsertPrComment } from './ola3-github.mjs';

const FE_TIMEOUT_MS = Number(process.env.COMMIT_GATE_FE_TIMEOUT_MS || 8 * 60 * 1000);
const BE_TIMEOUT_MS = Number(process.env.COMMIT_GATE_BE_TIMEOUT_MS || 10 * 60 * 1000);

export function analyzeCommitGate({ changedFiles, diffText, testFiles, skip }) {
  if (skip) {
    return {
      skipped: true,
      verdict: 'LISTO',
      reason: `Label ${SKIP_LABELS.commitGate} presente`,
      blockers: [],
      checks: [],
      plan: planCommitChecks([]),
    };
  }
  // Blockers: reportes reales (`**/playwright-report/**`), no menciones en skip-dir / artifacts YAML.
  // Tests Java: omitir stubs `@Disabled` bajo `src/test/java/**/pending/`.
  // Secretos: heurística en source; no en `**/src/main/resources/static/**` (E3 cubre frescura SPA).
  const blockers = scanCommitBlockers({ changedFiles, diffText });
  const plan = planCommitChecks(changedFiles);
  const javaTests = pickJavaTests(changedFiles, testFiles);
  const entityFiles = changedFiles.filter(isEntityPath);
  const diffFiles = parseUnifiedDiff(diffText || '');
  const flyway = evaluateFlyway({
    changedFiles,
    diffFiles,
    actualizadoExists: repoHasActualizado(),
    skip: false,
  });
  const tenant = evaluateTenant({
    findings: scanTenantDiff(diffFiles),
    skip: false,
  });
  const spa = evaluateSpa({
    frontendSrcChanged: changedFiles.some((f) => f.includes('Hot_click_outlet/frontend/src/')),
    staticChanged: changedFiles.some((f) => f.includes('Hot_click_outlet/src/main/resources/static/')),
    skip: false,
  });
  const sensitive = evaluateSensitive({
    changedMainFiles: changedFiles.filter((f) => f.includes('/src/main/java/')),
    testFiles: testFiles || [],
    skip: false,
  });

  const checks = [
    { id: 'blockers', ok: blockers.length === 0, detail: blockers.length ? blockers.map((b) => b.title).join('; ') : 'sin debug/secretos' },
    { id: 'flyway', ok: flyway.ok, detail: flyway.reason },
    { id: 'tenant', ok: tenant.ok, detail: tenant.reason },
    { id: 'spa', ok: spa.ok, detail: spa.reason },
    { id: 'sensitive', ok: sensitive.ok, detail: sensitive.reason },
  ];

  return {
    skipped: false,
    blockers,
    plan: { ...plan, javaTests },
    flyway,
    tenant,
    spa,
    sensitive,
    checks,
    verdict: blockers.length || !flyway.ok || !tenant.ok || !sensitive.ok ? 'BLOQUEADO' : 'LISTO',
    reason: blockers.length
      ? 'El diff trae instrumentación de debug, artefactos o secretos.'
      : !flyway.ok
        ? flyway.reason
        : !tenant.ok
          ? tenant.reason
          : !sensitive.ok
            ? sensitive.reason
            : 'Análisis estático OK. Tests tocados pendientes de corrida.',
  };
}

export function formatVerdict({ analysis, testResults = [] }) {
  const checks = [...(analysis.checks || []), ...testResults];
  const failed = checks.filter((c) => c.ok === false);
  const verdict = analysis.skipped ? 'LISTO' : failed.length ? 'BLOQUEADO' : 'LISTO';
  const lines = [
    `VEREDICTO: ${verdict}`,
    '',
    `Motivo: ${failed[0]?.detail || analysis.reason || 'checks del área tocada OK'}`,
    '',
    'Checks:',
  ];
  for (const check of checks) {
    lines.push(`- ${check.id}: ${check.ok ? 'OK' : 'FAIL'} — ${check.detail}`);
  }
  if (analysis.blockers?.length) {
    lines.push('', 'Bloqueos:');
    for (const item of analysis.blockers) {
      lines.push(`- \`${item.path}\` ${item.title}${item.snippet ? ` — \`${item.snippet}\`` : ''}`);
    }
  }
  lines.push(
    '',
    'Qué commitear: el diff del PR (sin `.env`, reportes Playwright, `debug-*.log`, `results.json`).',
    'Qué excluir: instrumentación `#region agent log`, secretos, `node_modules`.',
    '',
    'E4 no corre E2E Playwright. `ci.yml` sigue siendo el gate completo. Timeouts acotados.',
  );
  return { verdict, body: lines.join('\n'), checks };
}

function runTimed(command, args, { cwd, timeoutMs, env }) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    timeout: timeoutMs,
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const out = `${result.stdout || ''}\n${result.stderr || ''}`.trim();
  if (result.error?.code === 'ETIMEDOUT' || result.signal === 'SIGTERM') {
    return { ok: false, detail: `timeout ${timeoutMs}ms`, out };
  }
  return { ok: result.status === 0, detail: result.status === 0 ? 'exit 0' : `exit ${result.status}`, out };
}

export function runTouchedTests(plan, runner = runTimed) {
  const results = [];
  if (plan.runFrontendTests && process.env.COMMIT_GATE_RUN_TESTS === '1') {
    const fe = join(REPO_ROOT, 'Hot_click_outlet/frontend');
    if (existsSync(join(fe, 'package.json'))) {
      const test = runner('pnpm', ['test'], { cwd: fe, timeoutMs: FE_TIMEOUT_MS });
      results.push({ id: 'tests FE', ok: test.ok, detail: test.detail });
      if (plan.runFrontendTypecheck && process.env.COMMIT_GATE_TYPECHECK === '1') {
        const tc = runner('pnpm', ['typecheck'], { cwd: fe, timeoutMs: FE_TIMEOUT_MS });
        results.push({ id: 'typecheck FE', ok: tc.ok, detail: tc.detail });
      }
    } else {
      results.push({ id: 'tests FE', ok: true, detail: 'package.json ausente — omitido' });
    }
  } else if (plan.runFrontendTests) {
    results.push({ id: 'tests FE', ok: true, detail: 'planificados; runner desactivado (COMMIT_GATE_RUN_TESTS≠1)' });
  }

  if (plan.javaTests?.length && process.env.COMMIT_GATE_RUN_TESTS === '1' && !plan.tooManyJava) {
    const mvn = existsSync(join(REPO_ROOT, 'maven/bin/mvn')) ? join(REPO_ROOT, 'maven/bin/mvn') : 'mvn';
    const be = runner(mvn, [
      'test', '--no-transfer-progress',
      '-f', 'Hot_click_outlet/pom.xml',
      `-Dtest=${plan.javaTests.join(',')}`,
    ], {
      cwd: REPO_ROOT,
      timeoutMs: BE_TIMEOUT_MS,
      env: {
        DB_URL: 'jdbc:h2:mem:testdb',
        DB_USERNAME: 'sa',
        DB_PASSWORD: '',
        JWT_SECRET: 'test-secret-for-ci-only-not-production',
        SENTRY_DSN: '',
      },
    });
    results.push({ id: 'tests BE', ok: be.ok, detail: `${be.detail} (${plan.javaTests.join(',')})` });
  } else if (plan.tooManyJava) {
    results.push({ id: 'tests BE', ok: true, detail: 'más de 8 clases Java — omitido; confiamos en ci.yml' });
  } else if (plan.javaTouched?.length) {
    results.push({
      id: 'tests BE',
      ok: true,
      detail: plan.javaTests?.length
        ? 'planificados; runner desactivado'
        : `sin *Test.java nominal para ${plan.javaTouched.map(javaTestClassName).join(',')}`,
    });
  }
  return results;
}

function listJavaTests() {
  try {
    return listFiles('Hot_click_outlet/src/test/java', (f) => f.endsWith('.java'));
  } catch {
    try {
      return git(['ls-files', 'Hot_click_outlet/src/test/java'])
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.endsWith('.java'));
    } catch {
      return [];
    }
  }
}

function main() {
  const skip = hasLabel(process.env.PR_LABELS, SKIP_LABELS.commitGate);
  const base = process.env.BASE_SHA;
  const head = process.env.HEAD_SHA;
  if (!skip && (!base || !head)) {
    console.error('BASE_SHA y HEAD_SHA son obligatorios');
    process.exit(2);
  }
  const changedFiles = skip ? [] : gitChangedFiles(base, head);
  const diffText = skip ? '' : gitUnifiedDiff(base, head);
  const analysis = analyzeCommitGate({
    changedFiles,
    diffText,
    testFiles: listJavaTests(),
    skip,
  });
  const testResults = skip ? [] : runTouchedTests(analysis.plan);
  const formatted = formatVerdict({ analysis, testResults });
  console.log(formatted.body);
  upsertPrComment('hotclick-e4-commit-gate', ['## E4 Commit-gate', '', formatted.body].join('\n'));
  writeGithubOutput({
    verdict: formatted.verdict,
    fe: analysis.plan.runFrontendTests ? 'true' : 'false',
    java_tests: (analysis.plan.javaTests || []).join(','),
  });
  process.exit(formatted.verdict === 'BLOQUEADO' ? 1 : 0);
}

if (basename(process.argv[1] || '') === 'commit-gate.mjs') {
  main();
}
