#!/usr/bin/env node
/**
 * E6 Dependabot triage — labels, bloqueo de majors críticos, sin merge ciego de Spring Boot 4.
 * INF-08: este job NUNCA mergea ni habilita auto-merge; todo merge es manual con CI verde + APTO de Seguridad.
 */

import { SKIP_LABELS, appendGithubOutput, evaluateDependabot, hasLabel } from './lib.mjs';
import { addLabels, disableAutoMerge, upsertPrComment } from './github.mjs';

const title = process.env.PR_TITLE || '';
const skip = hasLabel(process.env.PR_LABELS, SKIP_LABELS.dependabot);
const verdict = evaluateDependabot({ title, skip });

console.log(`E6 Dependabot: ${verdict.ok ? 'PASS' : 'FAIL'} — ${verdict.reason}`);
if (verdict.labels?.length) console.log(`Labels: ${verdict.labels.join(', ')}`);

appendGithubOutput({
  ok: verdict.ok ? 'true' : 'false',
  reason: verdict.reason,
});

if (!verdict.skipped) {
  addLabels(verdict.labels);
  if (verdict.labels.includes('needs-human') || !verdict.ok) {
    disableAutoMerge();
  }
  if (verdict.comment) {
    upsertPrComment(
      'hotclick-dependabot-triage',
      [
        '## E6 Dependabot triage',
        '',
        verdict.comment,
        '',
        '| Label | Significado |',
        '| --- | --- |',
        '| `automerge-candidate` | patch/minor no crítico; CI conceptualmente verde |',
        '| `safe-to-automerge` | etiqueta informativa; **no** habilita auto-merge (merge manual con APTO de Seguridad) |',
        '| `needs-human` | major, Spring Boot, o parseo fallido — **sin** auto-merge |',
        '',
        'No se mergea Spring Boot 4.x a ciegas. Este job no reemplaza `ci.yml`.',
      ].join('\n'),
    );
  }
}

process.exit(verdict.ok ? 0 : 1);
