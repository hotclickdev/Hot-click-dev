#!/usr/bin/env node
/**
 * D2 — Daily IDOR / findById hunter.
 * Escanea Java de controllers/services: findById( de ids de cliente
 * sin findByIdAndEmpresaId / CompanyScope.assertCanAccess.
 * Abre/actualiza un Issue (dedup diario). No imprime secretos.
 */

import { basename, join } from 'node:path';
import {
  JAVA_MAIN,
  REPO_ROOT,
  SKIP_LABELS,
  gitChangedSince,
  hasLabel,
  readText,
  relRepo,
  snippet,
  walkFiles,
  writeGithubOutput,
} from './ola2-lib.mjs';
import { permalink, upsertIssue } from './ola2-github.mjs';

const FIND_RE = /\.findById\s*\(/;
const SAFE_METHOD_RE = /findByIdAnd(Empresa|Usuario|Tenant)/;
const TENANT_GUARD_RE = /(?:companyScope|CompanyScope)\.assertCanAccess(?:Nullable)?\s*\(/;
const TENANT_CTX_RE = /TenantContext\.get\s*\(/;
const CLIENT_ID_RE = /@(PathVariable|RequestParam|RequestBody)\b/;
const COMPOUND_FIND_RE = /findByIdAnd\w+\s*\(/;

export function methodWindow(lines, index) {
  let start = index;
  while (start > 0 && !/^\s*(public|protected|private).+\(/.test(lines[start]) && start > index - 80) {
    start -= 1;
  }
  let end = index;
  while (end < lines.length - 1 && end < index + 40) {
    end += 1;
    if (/^\s*(public|protected|private).+\(/.test(lines[end]) && end > index) {
      end -= 1;
      break;
    }
  }
  return { start, end, text: lines.slice(start, end + 1).join('\n') };
}

export function classifyFindById(relPath, lineNo, line, windowText) {
  if (SAFE_METHOD_RE.test(line) || COMPOUND_FIND_RE.test(line)) return null;
  if (/^\s*\/\//.test(line) || /^\s*\*/.test(line)) return null;
  if (/\.findById\s*\(\s*\d+L?\s*\)/.test(line)) return null;

  const inController = /\/controller\//.test(relPath);
  const clientId = CLIENT_ID_RE.test(windowText);
  const guarded = TENANT_GUARD_RE.test(windowText);
  const tenantCtx = TENANT_CTX_RE.test(windowText);
  const looksEmpresaLookup = /empresaRepository\.findById\s*\(\s*(eid|empresaId)/i.test(line);

  if (guarded) {
    return { severity: 'info', title: 'findById + assertCanAccess (validación posterior)' };
  }
  if (looksEmpresaLookup && tenantCtx) {
    return { severity: 'info', title: 'findById de la empresa del TenantContext' };
  }
  if (inController && clientId) {
    return { severity: 'high', title: 'Controller findById de id de cliente sin guard de tenant' };
  }
  if (inController) {
    return { severity: 'medium', title: 'Controller findById sin assertCanAccess visible' };
  }
  return { severity: 'medium', title: 'Service findById sin filtro de empresa visible' };
}

export function scanJavaSource(relPath, source) {
  const lines = String(source).split(/\r?\n/);
  const hits = [];
  lines.forEach((line, idx) => {
    if (!FIND_RE.test(line)) return;
    const window = methodWindow(lines, idx);
    const classified = classifyFindById(relPath, idx + 1, line, window.text);
    if (!classified) return;
    hits.push({
      path: relPath,
      line: idx + 1,
      snippet: snippet(line),
      ...classified,
    });
  });
  return hits;
}

export function collectScanTargets(mode = process.env.SCAN_MODE || 'auto') {
  const all = walkFiles(JAVA_MAIN, (abs, name) => {
    if (!name.endsWith('.java')) return false;
    return /\/(controller|service)\//.test(abs.replace(/\\/g, '/'));
  }).map(relRepo);

  if (mode === 'full') return { files: all, mode: 'full' };

  const recent = gitChangedSince('24 hours ago', [
    /Hot_click_outlet\/src\/main\/java\/.*\/(controller|service)\/.*\.java$/,
  ]);
  if (mode === 'recent') return { files: recent, mode: 'recent' };
  if (recent.length) return { files: recent, mode: 'recent' };
  return { files: all, mode: 'full-fallback' };
}

export function buildIssueBody(findings, meta) {
  const high = findings.filter((f) => f.severity === 'high');
  const medium = findings.filter((f) => f.severity === 'medium');
  const samples = [...high, ...medium].slice(0, 25);
  const lines = [
    '## D2 — Daily IDOR / findById hunter',
    '',
    `Última corrida: ${meta.ranAt}`,
    `Modo: \`${meta.mode}\` · archivos escaneados: **${meta.fileCount}** · hallazgos: **${findings.length}** (high ${high.length} / medium ${medium.length})`,
    `Fingerprint: \`${meta.fingerprint}\``,
    '',
    'No imprime secretos. No toca Payment/Auth/schedulers. Dedup: este Issue se actualiza cada día (mismo marker).',
    '',
    'Referencias: `DEVELOPER_GOLDEN_RULES.md`, `IDORCrosstenantAttackTest`, `F28TenantIsolationTest`.',
    'Mitigación correcta: `findByIdAndEmpresaId` **o** `CompanyScope.assertCanAccess` (mejor el filtro en la query).',
    '',
  ];
  if (!samples.length) {
    lines.push('Sin hallazgos high/medium en esta corrida.');
    return lines.join('\n');
  }
  lines.push('### Muestras (archivo:línea)', '');
  for (const item of samples) {
    const link = permalink(item.path, item.line);
    lines.push(
      `- **${item.severity.toUpperCase()}** [\`${item.path}:${item.line}\`](${link}) — ${item.title}`,
      `  \`${snippet(item.snippet)}\``,
    );
  }
  return lines.join('\n');
}

export function fingerprint(findings) {
  return findings
    .map((f) => `${f.severity}:${f.path}:${f.line}`)
    .sort()
    .join('|')
    .slice(0, 200) || 'none';
}

export function runHunter(opts = {}) {
  if (hasLabel(process.env.PR_LABELS, SKIP_LABELS.idor)) {
    return { skipped: true, findings: [], mode: 'skip' };
  }
  const targets = opts.files
    ? { files: opts.files, mode: opts.mode || 'injected' }
    : collectScanTargets(opts.mode);
  const findings = [];
  for (const rel of targets.files) {
    const source = opts.readFile ? opts.readFile(rel) : readRepoFile(rel);
    if (!source) continue;
    findings.push(...scanJavaSource(rel, source));
  }
  return { skipped: false, findings, mode: targets.mode, fileCount: targets.files.length };
}

function readRepoFile(rel) {
  try {
    return readText(join(REPO_ROOT, rel));
  } catch {
    return '';
  }
}

function main() {
  const result = runHunter();
  const fp = fingerprint(result.findings);
  const body = buildIssueBody(result.findings, {
    ranAt: new Date().toISOString(),
    mode: result.mode,
    fileCount: result.fileCount || 0,
    fingerprint: fp,
  });
  console.log(`D2 IDOR hunter: ${result.findings.length} hallazgos (modo ${result.mode})`);
  for (const item of result.findings.filter((f) => f.severity === 'high').slice(0, 15)) {
    console.log(`  [HIGH] ${item.path}:${item.line} ${item.snippet}`);
  }
  upsertIssue({
    title: '[D2] Daily IDOR / findById hunter',
    marker: 'hotclick-d2-idor',
    labels: ['idor', 'eng-agent'],
    body,
  });
  writeGithubOutput({
    findings: String(result.findings.length),
    mode: result.mode,
    fingerprint: fp,
  });
}

const launched = basename(process.argv[1] || '') === 'hunter-idor.mjs';
if (launched) main();
