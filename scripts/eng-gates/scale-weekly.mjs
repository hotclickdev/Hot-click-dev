#!/usr/bin/env node
/**
 * SCALE1 weekly — hotspots por tamaño + findAll en controllers/services.
 */

import { readFileSync } from 'node:fs';
import { listFiles } from './lib.mjs';
import { scanScaleHotspots } from './scale.mjs';
import { upsertIssue } from './github.mjs';

const files = listFiles('Hot_click_outlet/src/main/java', (file) => (
  file.endsWith('Controller.java') || file.endsWith('Service.java')
));
const texts = files.map((path) => ({ path, text: readFileSync(path, 'utf8') }));
const hotspots = scanScaleHotspots(texts);

console.log('SCALE1 weekly hotspots:');
for (const row of hotspots.slice(0, 15)) {
  console.log(`  ${row.score}\tfindAll=${row.findAll}\tlines=${row.lines}\t${row.path}`);
}

const table = [
  '| Score | findAll | Líneas | Archivo |',
  '| --- | --- | --- | --- |',
  ...hotspots.slice(0, 15).map((row) => `| ${row.score} | ${row.findAll} | ${row.lines} | \`${row.path}\` |`),
].join('\n');

upsertIssue({
  title: '[SCALE1] Hotspots semanales de escalabilidad',
  marker: 'hotclick-scale1-weekly',
  body: [
    '## SCALE1 — hotspots (heurística cruda)',
    '',
    'Score = `findAll * 40 + lines/20`. No es un profiler. Sirve para priorizar review.',
    '',
    table,
    '',
    'En PRs, `gate-scale.yml` comenta N+1 / listas sin Pageable / I/O bloqueante.',
    'No toca schedulers de negocio ni lógica de pago/auth.',
  ].join('\n'),
});
