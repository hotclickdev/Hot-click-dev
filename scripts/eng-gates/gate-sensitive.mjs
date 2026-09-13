#!/usr/bin/env node
/**
 * E11 — paths sensibles Payment/Auth/Pos/Sinpe/Wallet requieren tests nominales.
 */

import {
  SKIP_LABELS,
  appendGithubOutput,
  evaluateSensitive,
  gitChangedFiles,
  hasLabel,
  isMainJavaPath,
  listFiles,
} from './lib.mjs';
import { upsertPrComment } from './github.mjs';

const base = process.env.BASE_SHA;
const head = process.env.HEAD_SHA;
if (!base || !head) {
  console.error('BASE_SHA y HEAD_SHA son obligatorios');
  process.exit(2);
}

const changedMainFiles = gitChangedFiles(base, head).filter(isMainJavaPath);
const testFiles = listFiles('Hot_click_outlet/src/test', (file) => file.endsWith('Test.java') || file.includes('Test'));
const verdict = evaluateSensitive({
  changedMainFiles,
  testFiles,
  skip: hasLabel(process.env.PR_LABELS, SKIP_LABELS.sensitive),
});

console.log(`E11 Sensitive: ${verdict.ok ? 'PASS' : 'FAIL'} — ${verdict.reason}`);
if (verdict.families?.length) console.log(`Familias: ${verdict.families.join(', ')}`);

appendGithubOutput({
  ok: verdict.ok ? 'true' : 'false',
  reason: verdict.reason,
});

if (!verdict.ok) {
  upsertPrComment(
    'hotclick-gate-sensitive',
    [
      '## E11 Paths sensibles',
      '',
      '**FAIL** — ' + verdict.reason,
      '',
      'Este check es liviano: no corre los tests (eso es `ci.yml`). Solo exige que exista al menos un `*Payment*Test*.java` / `*Auth*Test*` / `*Pos*Test*` / `*Sinpe*Test*` / `*Wallet*Test*` cuando tocás esas superficies.',
      '',
      `Falso positivo: label \`${SKIP_LABELS.sensitive}\`.`,
    ].join('\n'),
  );
}

process.exit(verdict.ok ? 0 : 1);
