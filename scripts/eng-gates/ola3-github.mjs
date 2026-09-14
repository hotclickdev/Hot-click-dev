/**
 * Issues / comentarios / gh helpers de ola 3. Soft-fail si no hay token.
 */

import { execFileSync } from 'node:child_process';
import { ensureLabels, upsertIssue, upsertPrComment } from './ola2-github.mjs';

function token() {
  return process.env.GH_TOKEN || process.env.GITHUB_TOKEN || '';
}

function repo() {
  return process.env.GITHUB_REPOSITORY || '';
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

export function hasGhContext() {
  return Boolean(repo() && token());
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
    console.warn(`[ola3] no se pudieron aplicar labels: ${error.message}`);
    return false;
  }
}

export function listOpenDependabotPrs() {
  if (!hasGhContext()) return [];
  try {
    const raw = gh([
      'pr', 'list',
      '--repo', repo(),
      '--state', 'open',
      '--limit', '50',
      '--json', 'number,title,labels,author,headRefName,url,statusCheckRollup',
    ]);
    const prs = JSON.parse(raw || '[]');
    return prs.filter((pr) => {
      const login = pr.author?.login || '';
      const head = pr.headRefName || '';
      return login === 'dependabot[bot]' || head.startsWith('dependabot/');
    });
  } catch (error) {
    console.warn(`[ola3] no se listaron PRs Dependabot: ${error.message}`);
    return [];
  }
}

export function findPrForSha(sha) {
  if (!hasGhContext() || !sha) return null;
  try {
    const raw = gh([
      'pr', 'list',
      '--repo', repo(),
      '--state', 'open',
      '--search', sha,
      '--json', 'number,title,url,headRefOid',
      '--limit', '10',
    ]);
    const prs = JSON.parse(raw || '[]');
    return prs.find((pr) => String(pr.headRefOid || '').startsWith(sha.slice(0, 7))) || prs[0] || null;
  } catch {
    return null;
  }
}

export function listWorkflowRuns({ workflow, branch = 'master', limit = 5 }) {
  if (!hasGhContext()) return [];
  try {
    const raw = gh([
      'run', 'list',
      '--repo', repo(),
      '--workflow', workflow,
      '--branch', branch,
      '--limit', String(limit),
      '--json', 'databaseId,conclusion,status,headSha,displayTitle,url,name',
    ]);
    return JSON.parse(raw || '[]');
  } catch (error) {
    console.warn(`[ola3] no se listaron runs de ${workflow}: ${error.message}`);
    return [];
  }
}

export function failedRunLog(runId) {
  if (!hasGhContext() || !runId) return '';
  try {
    return gh(['run', 'view', String(runId), '--repo', repo(), '--log-failed']);
  } catch (error) {
    console.warn(`[ola3] no se pudo leer log-failed: ${error.message}`);
    return '';
  }
}

export function failedJobs(runId) {
  if (!hasGhContext() || !runId) return [];
  try {
    const raw = gh(['run', 'view', String(runId), '--repo', repo(), '--json', 'jobs']);
    const data = JSON.parse(raw || '{}');
    return (data.jobs || []).filter((job) => job.conclusion === 'failure');
  } catch {
    return [];
  }
}

export function sendTelegram(text) {
  const bot = process.env.TELEGRAM_BOT_TOKEN || '';
  const chat = process.env.TELEGRAM_CHAT_ID || '';
  if (!bot || !chat) {
    console.log('[ola3] Telegram omitido: TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID ausentes');
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
    console.warn(`[ola3] Telegram falló: ${error.message}`);
    return false;
  }
}
