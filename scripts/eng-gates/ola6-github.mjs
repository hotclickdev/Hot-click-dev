/**
 * Issues / comentarios de ola 6. Soft-fail si no hay gh + token.
 * Reusa ola2-github / ola5-github (ya en master).
 */

import { execFileSync } from 'node:child_process';
import { ensureLabels, upsertIssue, upsertPrComment } from './ola2-github.mjs';
import { commentOnIssue, hasGhContext } from './ola5-github.mjs';

function token() {
  return process.env.GH_TOKEN || process.env.GITHUB_TOKEN || '';
}

function repo() {
  return process.env.GITHUB_REPOSITORY || '';
}

function gh(args, input) {
  return execFileSync('gh', args, {
    encoding: 'utf8',
    input,
    env: { ...process.env, GH_TOKEN: token() },
    stdio: ['pipe', 'pipe', 'pipe'],
    maxBuffer: 8 * 1024 * 1024,
  });
}

export { commentOnIssue, ensureLabels, hasGhContext, upsertIssue, upsertPrComment };

export function commentOnCommit(sha, body) {
  if (!hasGhContext() || !sha) {
    console.log('[ola6] skip commit comment: no gh context / sha');
    return false;
  }
  try {
    gh(
      ['api', `repos/${repo()}/commits/${sha}/comments`, '--input', '-'],
      JSON.stringify({ body }),
    );
    return true;
  } catch (error) {
    console.warn(`[ola6] no se comentó el commit: ${error.message}`);
    return false;
  }
}

export function listIssueComments(number) {
  if (!hasGhContext() || !number) return [];
  try {
    const raw = gh([
      'api',
      `repos/${repo()}/issues/${number}/comments`,
      '--paginate',
    ]);
    return JSON.parse(raw || '[]');
  } catch (error) {
    console.warn(`[ola6] no se listaron comentarios: ${error.message}`);
    return [];
  }
}

export function commentOnIssueOnce(number, marker, body) {
  const comments = listIssueComments(number);
  if (comments.some((item) => String(item.body || '').includes(`<!-- ${marker} -->`))) {
    console.log(`[ola6] issue #${number} ya tiene ${marker}`);
    return false;
  }
  const stamped = `${body.trim()}\n\n<!-- ${marker} -->\n`;
  return commentOnIssue(number, stamped);
}
