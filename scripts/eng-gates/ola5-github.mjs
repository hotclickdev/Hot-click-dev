/**
 * Issues / comentarios / labels de ola 5. Soft-fail si no hay gh + token.
 * Reusa ola2-github (master). No depende de #58.
 */

import { execFileSync } from 'node:child_process';
import { ensureLabels, upsertIssue, upsertPrComment } from './ola2-github.mjs';
import { disableAutoMerge } from './github.mjs';

function token() {
  return process.env.GH_TOKEN || process.env.GITHUB_TOKEN || '';
}

function repo() {
  return process.env.GITHUB_REPOSITORY || '';
}

export function hasGhContext() {
  return Boolean(repo() && token());
}

export function gh(args, input) {
  return execFileSync('gh', args, {
    encoding: 'utf8',
    input,
    env: { ...process.env, GH_TOKEN: token() },
    stdio: ['pipe', 'pipe', 'pipe'],
    maxBuffer: 20 * 1024 * 1024,
  });
}

export { ensureLabels, upsertIssue, upsertPrComment };

export function upsertPrCommentOn(prNumber, marker, body) {
  const prev = process.env.PR_NUMBER;
  process.env.PR_NUMBER = String(prNumber);
  try {
    return upsertPrComment(marker, body);
  } finally {
    if (prev == null) delete process.env.PR_NUMBER;
    else process.env.PR_NUMBER = prev;
  }
}

export function addLabelsToPr(prNumber, labels) {
  if (!hasGhContext() || !prNumber || !labels?.length) return false;
  ensureLabels(labels);
  try {
    gh(['pr', 'edit', String(prNumber), '--repo', repo(), '--add-label', labels.join(',')]);
    return true;
  } catch (error) {
    console.warn(`[ola5] no se pudieron aplicar labels: ${error.message}`);
    return false;
  }
}

export function removeLabelsFromPr(prNumber, labels) {
  if (!hasGhContext() || !prNumber || !labels?.length) return false;
  try {
    gh(['pr', 'edit', String(prNumber), '--repo', repo(), '--remove-label', labels.join(',')]);
    return true;
  } catch (error) {
    console.warn(`[ola5] no se pudieron quitar labels: ${error.message}`);
    return false;
  }
}

export function blockAutoMerge(prNumber) {
  const prev = process.env.PR_NUMBER;
  if (prNumber) process.env.PR_NUMBER = String(prNumber);
  try {
    disableAutoMerge();
    removeLabelsFromPr(prNumber || process.env.PR_NUMBER, [
      'safe-to-automerge',
      'automerge-candidate',
    ]);
    return true;
  } catch (error) {
    console.warn(`[ola5] no se pudo bloquear auto-merge: ${error.message}`);
    return false;
  } finally {
    if (prev == null) delete process.env.PR_NUMBER;
    else process.env.PR_NUMBER = prev;
  }
}

export function listOpenDependabotPrs() {
  if (!hasGhContext()) return [];
  try {
    const raw = gh([
      'pr', 'list',
      '--repo', repo(),
      '--state', 'open',
      '--limit', '80',
      '--json', 'number,title,labels,author,headRefName,url,updatedAt,body',
    ]);
    const prs = JSON.parse(raw || '[]');
    return prs.filter((pr) => {
      const login = pr.author?.login || '';
      const head = pr.headRefName || '';
      return login === 'dependabot[bot]' || head.startsWith('dependabot/');
    });
  } catch (error) {
    console.warn(`[ola5] no se listaron PRs Dependabot: ${error.message}`);
    return [];
  }
}

export function listOpenEngAgentIssues() {
  if (!hasGhContext()) return [];
  try {
    const raw = gh([
      'issue', 'list',
      '--repo', repo(),
      '--state', 'open',
      '--label', 'eng-agent',
      '--limit', '50',
      '--json', 'number,title,labels,updatedAt,createdAt,body,url',
    ]);
    return JSON.parse(raw || '[]');
  } catch (error) {
    console.warn(`[ola5] no se listaron issues eng-agent: ${error.message}`);
    return [];
  }
}

export function commentOnIssue(number, body) {
  if (!hasGhContext() || !number) return false;
  try {
    gh(['issue', 'comment', String(number), '--repo', repo(), '--body', body]);
    return true;
  } catch (error) {
    console.warn(`[ola5] no se comentó issue #${number}: ${error.message}`);
    return false;
  }
}

export function closeIssue(number, body) {
  if (!hasGhContext() || !number) return false;
  try {
    if (body) gh(['issue', 'comment', String(number), '--repo', repo(), '--body', body]);
    gh(['issue', 'close', String(number), '--repo', repo(), '--reason', 'not planned']);
    return true;
  } catch (error) {
    console.warn(`[ola5] no se cerró issue #${number}: ${error.message}`);
    return false;
  }
}

export function fetchIssue(number) {
  if (!hasGhContext() || !number) return null;
  try {
    const raw = gh([
      'issue', 'view', String(number),
      '--repo', repo(),
      '--json', 'number,title,body,labels,state',
    ]);
    return JSON.parse(raw || 'null');
  } catch {
    return null;
  }
}

export function fetchPrMeta(prNumber) {
  if (!hasGhContext() || !prNumber) return null;
  try {
    const raw = gh([
      'pr', 'view', String(prNumber),
      '--repo', repo(),
      '--json', 'number,title,body,labels,closingIssuesReferences,headRefName',
    ]);
    return JSON.parse(raw || 'null');
  } catch {
    return null;
  }
}

export function sendTelegram(text) {
  const bot = process.env.TELEGRAM_BOT_TOKEN || '';
  const chat = process.env.TELEGRAM_CHAT_ID || '';
  if (!bot || !chat) {
    console.log('[ola5] Telegram omitido: TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID ausentes');
    return false;
  }
  try {
    execFileSync('curl', [
      '-sS',
      '-X', 'POST',
      `https://api.telegram.org/bot${bot}/sendMessage`,
      '-d', `chat_id=${chat}`,
      '-d', `text=${text}`,
      '-d', 'parse_mode=Markdown',
    ], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return true;
  } catch (error) {
    console.warn(`[ola5] Telegram falló: ${error.message}`);
    return false;
  }
}

export function postLineComments(headSha, comments, header = 'E18 PgBouncer') {
  const pr = process.env.PR_NUMBER;
  if (!hasGhContext() || !pr || !comments?.length) return false;
  const payload = {
    commit_id: headSha,
    body: `${header} — hallazgos file:line (ver comentario sticky).`,
    event: 'COMMENT',
    comments: comments.slice(0, 20).map((item) => ({
      path: item.path,
      line: item.line,
      side: 'RIGHT',
      body: `**${item.title}**\n\n\`${item.snippet}\``,
    })),
  };
  try {
    gh(['api', `repos/${repo()}/pulls/${pr}/reviews`, '--input', '-'], JSON.stringify(payload));
    return true;
  } catch (error) {
    console.warn(`[ola5] review inline no publicado (${error.message})`);
    return false;
  }
}
