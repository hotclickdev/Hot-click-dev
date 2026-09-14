#!/usr/bin/env node
/**
 * S7 — Weekly Ley 8968 compliance checklist (heurística de paths/strings).
 * Issue si falta checkbox, ruta /privacidad, bitácora IP o ARCO.
 */

import {
  SKIP_LABELS,
  hasLabel,
  runLey8968Check,
  writeGithubOutput,
} from './ola5-lib.mjs';
import { upsertIssue } from './ola5-github.mjs';

export function buildLeyIssueBody(report, ranAt = new Date().toISOString()) {
  const lines = [
    '## S7 — Checklist Ley N.° 8968',
    '',
    `Última corrida: ${ranAt}`,
    '',
    '| Check | Estado | Archivos |',
    '| --- | --- | --- |',
  ];
  for (const item of report.results) {
    lines.push(`| ${item.title} | ${item.present ? 'OK' : 'FALTA'} | ${item.files.map((f) => `\`${f}\``).join(', ')} |`);
  }
  lines.push(
    '',
    'Heurística de path/string (FE+BE). No es asesoría legal.',
    'Faltantes típicos: `/privacidad`, checkbox checkout, consentimiento vendedor, `POST /api/consentimiento` + IP, sección ARCO.',
  );
  return lines.join('\n');
}

export function runLey8968({ env = process.env, check = runLey8968Check } = {}) {
  if (hasLabel(env.PR_LABELS, SKIP_LABELS.ley8968) || env.SKIP_LEY8968 === '1') {
    console.log(`S7 skip: ${SKIP_LABELS.ley8968}`);
    writeGithubOutput({ skipped: 'true' });
    return { skipped: true };
  }
  const report = check();
  console.log(`S7 ${report.ok ? 'OK' : 'ISSUE'} missing=${report.missing.map((m) => m.id).join(',') || '0'}`);
  writeGithubOutput({
    skipped: 'false',
    ok: report.ok ? 'true' : 'false',
  });
  if (!report.ok) {
    upsertIssue({
      title: '[S7] Ley 8968: falta checkbox / ruta / bitácora',
      marker: 'hotclick-s7-ley8968',
      body: buildLeyIssueBody(report),
      labels: ['eng-agent', 'compliance'],
    });
  }
  return report;
}

const isMain = process.argv[1] && process.argv[1].endsWith('ley8968-checklist.mjs');
if (isMain) runLey8968();
