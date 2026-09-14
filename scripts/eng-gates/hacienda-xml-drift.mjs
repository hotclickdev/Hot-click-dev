#!/usr/bin/env node
/**
 * S11 — Weekly Hacienda XML/XSD vs Java builders.
 * Heurística: tags del sample + XSD required vs XmlFacturaBuilder / FacturacionService.
 * Issue si faltan campos requeridos. No pega API de Hacienda.
 */

import { basename } from 'node:path';
import {
  FACTURACION_REL,
  HACIENDA_XML_REL,
  HACIENDA_XSD_REL,
  SKIP_LABELS,
  XML_BUILDER_REL,
  diffHacienda,
  hasLabel,
  javaBuilderTags,
  readRepo,
  xmlLocalNames,
  xsdRequiredElements,
  writeGithubOutput,
} from './ola6-lib.mjs';
import { upsertIssue } from './ola6-github.mjs';

export function scanHacienda(readFile = readRepo) {
  const xml = readFile(HACIENDA_XML_REL);
  const xsd = readFile(HACIENDA_XSD_REL);
  const builders = `${readFile(XML_BUILDER_REL)}\n${readFile(FACTURACION_REL)}`;
  return diffHacienda({
    sampleNames: xmlLocalNames(xml),
    xsdRequired: xsdRequiredElements(xsd),
    builderTags: javaBuilderTags(builders),
  });
}

export function buildS11IssueBody(diff, ranAt) {
  const lines = [
    '## S11 — Hacienda XML vs Java builders',
    '',
    `Última corrida: ${ranAt}`,
    '',
    diff.reason,
    '',
    'Fuentes (solo lectura):',
    `- \`${HACIENDA_XML_REL}\``,
    `- \`${HACIENDA_XSD_REL}\` (subset local, no el XSD oficial completo)`,
    `- \`${XML_BUILDER_REL}\` + \`${FACTURACION_REL}\``,
    '',
    'Heurística de tags `<Nombre>` / `append("<Nombre")`. No valida tipos ni orden XSD completo.',
    '',
  ];
  if (diff.missingRequired.length) {
    lines.push('### Requeridos XSD ausentes en builders', '');
    for (const name of diff.missingRequired) lines.push(`- \`${name}\``);
    lines.push('');
  }
  if (diff.missingFromSample.length) {
    lines.push('### Presentes en factura-muestra.xml y no vistos en builders', '');
    for (const name of diff.missingFromSample.slice(0, 30)) lines.push(`- \`${name}\``);
    lines.push('');
  }
  lines.push('No se modifica FacturacionService ni schedulers de Hacienda. Issue-only.');
  return lines.join('\n');
}

export function runHaciendaXml({ env = process.env, readFile = readRepo } = {}) {
  if (hasLabel(env.PR_LABELS, SKIP_LABELS.hacienda) || env.SKIP_HACIENDA_XML === '1') {
    return { skipped: true, shouldIssue: false };
  }
  const diff = scanHacienda(readFile);
  return { skipped: false, shouldIssue: diff.shouldIssue, diff };
}

function main() {
  const result = runHaciendaXml();
  if (result.skipped) {
    console.log('S11 skip');
    writeGithubOutput({ skipped: 'true' });
    return;
  }
  console.log(`S11 ${result.shouldIssue ? 'ISSUE' : 'OK'} ${result.diff.reason}`);
  writeGithubOutput({
    skipped: 'false',
    issue: result.shouldIssue ? 'true' : 'false',
    missing: String(result.diff.missingRequired.length),
  });
  if (result.shouldIssue) {
    upsertIssue({
      title: '[S11] Hacienda XML vs XmlFacturaBuilder — campos requeridos',
      marker: 'hotclick-s11-hacienda-xml',
      labels: ['eng-agent', 'hacienda'],
      body: buildS11IssueBody(result.diff, new Date().toISOString()),
    });
  }
}

if (basename(process.argv[1] || '') === 'hacienda-xml-drift.mjs') main();
