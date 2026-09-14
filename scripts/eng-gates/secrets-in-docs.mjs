#!/usr/bin/env node
/**
 * D8 — Daily secrets-in-docs scan.
 * Escanea *.md, txt/, docs/ y narrativas tipo api_cloud_google.
 * Issue P0 si hay hallazgos. NUNCA reimprime el valor (redact).
 * Complementa Gitleaks (security.yml); foco en prosa de docs.
 */

import { readFileSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import {
  hasLabel,
  REPO_ROOT,
  relRepo,
  scanDocSecrets,
  SKIP_LABELS,
  walkFiles,
  writeGithubOutput,
} from './ola4-lib.mjs';
import { upsertIssue } from './ola2-github.mjs';

const NARRATIVE_NAMES = /^(api_cloud_google|google.?cloud|vision.?api|openapi.?narrative)/i;
const SKIP_DIR = /(^|\/)(node_modules|target|\.git|dist|playwright-report|test-results)(\/|$)/;

export function isDocNarrative(relPath) {
  const rel = String(relPath).replaceAll('\\', '/');
  if (SKIP_DIR.test(rel)) return false;
  if (rel.startsWith('docs/') && /\.(md|txt)$/i.test(rel)) return true;
  if (rel.startsWith('txt/')) return true;
  if (/\.md$/i.test(rel) && !rel.includes('/frontend/node_modules/')) return true;
  if (NARRATIVE_NAMES.test(basename(rel))) return true;
  return false;
}

export function collectDocFiles(root = REPO_ROOT) {
  return walkFiles(root, (abs, name) => {
    const rel = relRepo(abs);
    if (name === 'package-lock.json' || name === 'pnpm-lock.yaml') return false;
    if (rel.startsWith('Hot_click_outlet/frontend/src/')) return false;
    return isDocNarrative(rel) || (rel.startsWith('txt/') && extname(name) === '.txt');
  }).map(relRepo);
}

export function buildIssueBody(findings, meta) {
  const p0 = findings.length > 0;
  const lines = [
    `## D8 — Secrets in docs ${p0 ? '**P0**' : '(limpio)'}`,
    '',
    `Última corrida: ${meta.ranAt}`,
    `Archivos escaneados: **${meta.fileCount}** · hallazgos: **${findings.length}**`,
    '',
    'Complementa Gitleaks (`security.yml`). Este job mira prosa (`*.md`, `docs/`, `txt/`, `api_cloud_google`).',
    '**Los valores NO se reimprimen.** Solo path:línea + tipo + redact.',
    '',
  ];
  if (!findings.length) {
    lines.push('Sin hallazgos en esta corrida.');
  } else {
    lines.push('| Sev | Archivo | Tipo | Redact |', '| --- | --- | --- | --- |');
    for (const item of findings.slice(0, 40)) {
      lines.push(`| P0 | \`${item.path}:${item.line}\` | ${item.title} | \`${item.redacted}\` |`);
    }
  }
  lines.push('', 'Rotar en el origen si el hallazgo es real. Marker: `hotclick-d8-secrets-docs`.');
  return lines.join('\n');
}

export function runSecretsDocs(opts = {}) {
  if (hasLabel(process.env.PR_LABELS, SKIP_LABELS.secrets)) {
    return { skipped: true, findings: [], fileCount: 0 };
  }
  const files = opts.files || collectDocFiles(opts.root);
  const findings = [];
  for (const rel of files) {
    const text = opts.readFile ? opts.readFile(rel) : readRepoFile(rel);
    findings.push(...scanDocSecrets(text, rel));
  }
  return { skipped: false, findings, fileCount: files.length };
}

function readRepoFile(rel) {
  try {
    return readFileSync(join(REPO_ROOT, rel), 'utf8');
  } catch {
    return '';
  }
}

function main() {
  const result = runSecretsDocs();
  if (result.skipped) {
    console.log('D8 secrets-docs: skip label');
    return;
  }
  const body = buildIssueBody(result.findings, {
    ranAt: new Date().toISOString(),
    fileCount: result.fileCount,
  });
  console.log(`D8 secrets-docs: ${result.findings.length} hallazgos (valores redactados)`);
  for (const item of result.findings.slice(0, 15)) {
    console.log(`  P0 ${item.path}:${item.line} ${item.title} ${item.redacted}`);
  }
  upsertIssue({
    title: result.findings.length ? '[D8][P0] Secrets in docs' : '[D8] Secrets in docs — limpio',
    marker: 'hotclick-d8-secrets-docs',
    labels: result.findings.length
      ? ['secrets-docs', 'p0', 'eng-agent']
      : ['secrets-docs', 'eng-agent'],
    body,
  });
  writeGithubOutput({
    findings: String(result.findings.length),
    p0: result.findings.length ? 'true' : 'false',
  });
}

if (basename(process.argv[1] || '') === 'secrets-in-docs.mjs') main();
