#!/usr/bin/env node
/**
 * DOC1 CLI — escribe docs/GENERATED_STACK.md y opcionalmente parchea
 * README/ESTADO_ACTUAL con claims seguros (Java/Flyway/React).
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import {
  GENERATED_STACK_PATH,
  applyPatches,
  collectStackFacts,
  plannedSafeDocPatches,
  readFingerprint,
  renderGeneratedStack,
  summarizeDrift,
  writeGeneratedStack,
} from './stack-docs.mjs';

function readFingerprintSafe(text) {
  return readFingerprint(text);
}
import { appendGithubOutput } from './lib.mjs';
import { upsertIssue } from './github.mjs';

const args = new Set(process.argv.slice(2));
const root = '.';
const facts = collectStackFacts(root);
const generatedOn = (process.env.DOC_GENERATED_ON || new Date().toISOString()).slice(0, 10);
const markdown = renderGeneratedStack(facts, generatedOn);
const previous = existsSync(GENERATED_STACK_PATH) ? readFileSync(GENERATED_STACK_PATH, 'utf8') : '';
const drift = summarizeDrift(previous, markdown);

if (args.has('--write') || args.has('--apply-safe-docs')) {
  if (!args.has('--force') && previous && !drift.drifted && readFingerprintSafe(previous)) {
    console.log(`${GENERATED_STACK_PATH} al día (fingerprint igual); no se reescribe.`);
  } else {
    writeGeneratedStack(root, facts, generatedOn);
    console.log(`Escrito ${GENERATED_STACK_PATH}`);
  }
}

let applied = [];
if (args.has('--apply-safe-docs')) {
  const files = {
    readme: existsSync('README.md') ? readFileSync('README.md', 'utf8') : '',
    estado: existsSync('ESTADO_ACTUAL.md') ? readFileSync('ESTADO_ACTUAL.md', 'utf8') : '',
  };
  const planned = plannedSafeDocPatches(facts, files);
  applied = applyPatches(planned, {
    'README.md': files.readme,
    'ESTADO_ACTUAL.md': files.estado,
  }, {
    'README.md': (text) => writeFileSync('README.md', text),
    'ESTADO_ACTUAL.md': (text) => writeFileSync('ESTADO_ACTUAL.md', text),
  });
  for (const patch of applied) {
    console.log(`Patch seguro: ${patch.file}: ${patch.from} → ${patch.to} (${patch.reason})`);
  }
  if (!planned.length) console.log('Sin patches seguros pendientes en README/ESTADO_ACTUAL.');
}

console.log(`DOC1 Java=${facts.javaVersion} Boot=${facts.springBoot} Flyway=${facts.flywayCount} (V${facts.flywayMin}–V${facts.flywayMax}) React=${facts.react}`);
console.log(`Drift GENERATED_STACK: ${drift.drifted ? 'sí' : 'no'}`);

appendGithubOutput({
  drift: drift.drifted ? 'true' : 'false',
  flyway_max: String(facts.flywayMax),
  java: facts.javaVersion,
});

if (args.has('--weekly-issue')) {
  const planned = plannedSafeDocPatches(facts, {
    readme: existsSync('README.md') ? readFileSync('README.md', 'utf8') : '',
    estado: existsSync('ESTADO_ACTUAL.md') ? readFileSync('ESTADO_ACTUAL.md', 'utf8') : '',
  });
  const body = [
    '## DOC1 — reporte semanal de stack',
    '',
    `| Hecho | Valor |`,
    `| --- | --- |`,
    `| Java | ${facts.javaVersion} |`,
    `| Spring Boot | ${facts.springBoot} |`,
    `| Flyway | ${facts.flywayCount} archivos, V${facts.flywayMin}–V${facts.flywayMax} (\`${facts.flywayLatest}\`) |`,
    `| React / Vite | ${facts.react} / ${facts.vite} |`,
    `| Controllers / services / repos | ${facts.controllers} / ${facts.services} / ${facts.repositories} |`,
    `| GENERATED_STACK.md drift | ${drift.drifted ? 'SÍ — hay que refrescar' : 'no'} |`,
    '',
    planned.length
      ? ['Claims desfasados (seguros de parchear):', ...planned.map((p) => `- \`${p.file}\`: ${p.reason}`)].join('\n')
      : 'README / ESTADO_ACTUAL alineados en claims seguros (Java / Flyway / React).',
    '',
    'Artifact del workflow + `scripts/generate-stack-docs.sh`. No se inventan secretos.',
  ].join('\n');
  upsertIssue({ title: '[DOC1] Stack docs weekly', marker: 'hotclick-doc1-weekly', body });
}
