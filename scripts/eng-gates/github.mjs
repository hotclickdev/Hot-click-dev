/**
 * Sticky PR comments / labels via `gh`. Soft-fails if gh or token is missing
 * (local runs, forks without write permission).
 */

import { execFileSync } from 'node:child_process';

function ghAvailable() {
  return Boolean(process.env.GH_TOKEN || process.env.GITHUB_TOKEN)
    && Boolean(process.env.GITHUB_REPOSITORY)
    && Boolean(process.env.PR_NUMBER);
}

function gh(args, input) {
  return execFileSync('gh', args, {
    encoding: 'utf8',
    input,
    env: { ...process.env, GH_TOKEN: process.env.GH_TOKEN || process.env.GITHUB_TOKEN },
    stdio: ['pipe', 'pipe', 'pipe'],
  });
}

export function upsertPrComment(marker, body) {
  if (!ghAvailable()) {
    console.log(`[eng-gates] skip PR comment (${marker}): no gh context`);
    return false;
  }
  const repo = process.env.GITHUB_REPOSITORY;
  const pr = process.env.PR_NUMBER;
  const stamped = `${body.trim()}\n\n<!-- ${marker} -->\n`;
  try {
    const raw = gh([
      'api',
      `repos/${repo}/issues/${pr}/comments`,
      '--paginate',
    ]);
    const comments = JSON.parse(raw || '[]');
    const existing = comments.find((item) => String(item.body || '').includes(`<!-- ${marker} -->`));
    const payload = JSON.stringify({ body: stamped });
    if (existing) {
      gh(['api', '-X', 'PATCH', `repos/${repo}/issues/comments/${existing.id}`, '--input', '-'], payload);
    } else {
      gh(['api', `repos/${repo}/issues/${pr}/comments`, '--input', '-'], payload);
    }
    return true;
  } catch (error) {
    console.warn(`[eng-gates] no se pudo comentar el PR: ${error.message}`);
    return false;
  }
}

export function addLabels(labels) {
  if (!ghAvailable() || !labels?.length) return;
  const repo = process.env.GITHUB_REPOSITORY;
  const pr = process.env.PR_NUMBER;
  for (const label of labels) {
    try {
      gh(['label', 'create', label, '--repo', repo, '--force', '--color', '0E7490', '--description', 'HotClick eng-gate']);
    } catch {
      // label may already exist without --force permission; apply anyway
    }
  }
  try {
    gh(['pr', 'edit', pr, '--repo', repo, '--add-label', labels.join(',')]);
  } catch (error) {
    console.warn(`[eng-gates] no se pudieron aplicar labels: ${error.message}`);
  }
}

export function disableAutoMerge() {
  if (!ghAvailable()) return;
  try {
    gh(['pr', 'merge', process.env.PR_NUMBER, '--repo', process.env.GITHUB_REPOSITORY, '--disable-auto']);
  } catch {
    // already disabled or not enabled
  }
}

export function enableSquashAutoMerge() {
  if (!ghAvailable()) return false;
  try {
    gh([
      'pr', 'merge', process.env.PR_NUMBER,
      '--repo', process.env.GITHUB_REPOSITORY,
      '--squash', '--auto',
    ]);
    return true;
  } catch (error) {
    console.warn(`[eng-gates] no se pudo habilitar auto-merge: ${error.message}`);
    return false;
  }
}

export function permalink(path, line) {
  const repo = process.env.GITHUB_REPOSITORY || 'hotclickdev/Hot-click-dev';
  const sha = process.env.HEAD_SHA || 'HEAD';
  return `https://github.com/${repo}/blob/${sha}/${path}#L${line}`;
}

export function postLineReview(headSha, comments) {
  if (!ghAvailable() || !comments.length) return false;
  const repo = process.env.GITHUB_REPOSITORY;
  const pr = process.env.PR_NUMBER;
  const payload = {
    commit_id: headSha,
    body: 'E2 Reviewer de tenant — hallazgos en el diff (ver también el comentario sticky).',
    event: 'COMMENT',
    comments: comments.slice(0, 20).map((item) => ({
      path: item.path,
      line: item.line,
      side: 'RIGHT',
      body: `**${item.title}**\n\n\`${item.snippet}\`\n\n${item.hint}`,
    })),
  };
  try {
    gh(['api', `repos/${repo}/pulls/${pr}/reviews`, '--input', '-'], JSON.stringify(payload));
    return true;
  } catch (error) {
    console.warn(`[eng-gates] review inline no publicado (${error.message}); queda el comentario sticky.`);
    return false;
  }
}
