#!/usr/bin/env node
/**
 * SCALE1 — reviewer de escalabilidad sobre el DIFF del PR.
 */

import {
  SKIP_LABELS,
  appendGithubOutput,
  gitChangedFiles,
  gitUnifiedDiff,
  hasLabel,
  parseUnifiedDiff,
} from './lib.mjs';
import { evaluateScale, scanScaleDiff } from './scale.mjs';
import { resolveParse, sha256Text } from './java-loop-map.mjs';
import { execFileSync } from 'node:child_process';
import { permalink, postLineReview, upsertPrComment } from './github.mjs';

const base = process.env.BASE_SHA;
const head = process.env.HEAD_SHA;
if (!base || !head) {
  console.error('BASE_SHA y HEAD_SHA son obligatorios');
  process.exit(2);
}

const skip = hasLabel(process.env.PR_LABELS, SKIP_LABELS.scale);
const changed = gitChangedFiles(base, head).filter((file) => {
  const n = file.replaceAll('\\', '/');
  return n.endsWith('.java') || n.includes('/frontend/src/') || n.includes('/resources/static/');
});

if (changed.length === 0 && !skip) {
  console.log('SCALE1: PASS — sin Java/TS/static en el diff.');
  appendGithubOutput({ ok: 'true', reason: 'sin archivos relevantes' });
  process.exit(0);
}

const parser = await resolveParse();
const fileTexts = {};
for (const filePath of changed.filter((f) => f.replaceAll('\\', '/').endsWith('.java') && !f.includes('/src/test/'))) {
  try {
    // Archivo exacto de HEAD: blob id de git + SHA-256 del contenido leído de ese blob.
    const blob = execFileSync('git', ['rev-parse', '--verify', `${head}:${filePath}`], { encoding: 'utf8' }).trim();
    const text = execFileSync('git', ['cat-file', 'blob', blob], { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
    fileTexts[filePath] = { text, hash: sha256Text(text), blob, ref: head };
    console.log(`SCALE1 source ${filePath} blob=${blob} sha256=${fileTexts[filePath].hash}`);
  } catch (err) {
    // Archivo borrado o ilegible: sin texto → p1-java-parser (missing-source) si hay líneas agregadas.
    fileTexts[filePath] = { error: String(err.message || err).split('\n')[0] };
  }
}
const findings = scanScaleDiff(
  parseUnifiedDiff(changed.length ? gitUnifiedDiff(base, head, changed) : ''),
  { parse: parser.ok ? parser.parse : undefined, fileTexts, parserError: parser.ok ? undefined : parser.error },
);
const verdict = evaluateScale({ findings, skip });
if (!parser.ok && findings.some((item) => item.rule === 'p1-java-parser')) {
  console.error(`SCALE1 parser: ${parser.error}`);
}

console.log(`SCALE1: ${verdict.ok ? 'PASS' : 'FAIL'} — ${verdict.reason}`);
for (const item of findings) {
  console.log(`  [${item.severity}] ${item.path}:${item.line} ${item.title}`);
}

appendGithubOutput({
  ok: verdict.ok ? 'true' : 'false',
  reason: verdict.reason,
  fails: String(verdict.failCount || 0),
});

if (findings.length && !verdict.skipped) {
  const lines = [
    '## SCALE1 Reviewer de escalabilidad',
    '',
    verdict.ok ? '**PASS** (avisos)' : '**FAIL** — P0/P1 de escala',
    '',
    verdict.reason,
    '',
  ];
  for (const item of findings) {
    const link = permalink(item.path, item.line);
    lines.push(
      `- **${item.severity.toUpperCase()}** [\`${item.path}:${item.line}\`](${link}) — ${item.title}`,
      `  \`${item.snippet}\``,
      `  ${item.hint}`,
    );
  }
  if (!verdict.ok) lines.push('', `Falso positivo: label \`${SKIP_LABELS.scale}\`.`);
  upsertPrComment('hotclick-gate-scale', lines.join('\n'));
  postLineReview(head, findings.filter((item) => item.severity === 'fail' && item.line));
}

process.exit(verdict.ok ? 0 : 1);
