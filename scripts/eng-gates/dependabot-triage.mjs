#!/usr/bin/env node
/**
 * E6 Dependabot triage — labels, bloqueo de majors críticos, sin merge ciego de Spring Boot 4.
 */

import { SKIP_LABELS, appendGithubOutput, evaluateDependabot, hasLabel } from './lib.mjs';
import { addLabels, disableAutoMerge, enableSquashAutoMerge, upsertPrComment } from './github.mjs';

const title = process.env.PR_TITLE || '';
const skip = hasLabel(process.env.PR_LABELS, SKIP_LABELS.dependabot);
const wantsSafeMerge = hasLabel(process.env.PR_LABELS, 'safe-to-automerge');
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
        '| `safe-to-automerge` | opt-in humano → squash auto-merge |',
        '| `needs-human` | major, Spring Boot, o parseo fallido — **sin** auto-merge |',
        '',
        'No se mergea Spring Boot 4.x a ciegas. Este job no reemplaza `ci.yml`.',
      ].join('\n'),
    );
  }
}

if (
  !verdict.skipped
  && verdict.ok
  && verdict.labels.includes('automerge-candidate')
  && wantsSafeMerge
  && !verdict.labels.includes('needs-human')
) {
  const enabled = enableSquashAutoMerge();
  console.log(enabled ? 'Auto-merge squash habilitado (safe-to-automerge).' : 'No se habilitó auto-merge.');
}

process.exit(verdict.ok ? 0 : 1);
