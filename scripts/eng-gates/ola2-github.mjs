/**
 * Issues / comentarios de PR para ola 2. Soft-fail si no hay gh + token.
 */

import { execFileSync } from 'node:child_process';

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
  });
}

export function ensureLabels(labels, color = '0E7490') {
  if (!repo() || !token() || !labels?.length) return;
  for (const label of labels) {
    try {
      gh([
        'label', 'create', label,
        '--repo', repo(),
        '--force',
        '--color', color,
        '--description', 'HotClick ola 2 eng-agent',
      ]);
    } catch {
      // ya existe o sin permiso de crear; se intenta aplicar igual
    }
  }
}

export function upsertIssue({ title, marker, body, labels = ['eng-agent'] }) {
  if (!repo() || !token()) {
    console.log(`[ola2] skip issue (${marker}): no gh context`);
    return { ok: false, number: null };
  }
  const stamped = `${body.trim()}\n\n<!-- ${marker} -->\n`;
  ensureLabels(labels);
  try {
    const raw = gh([
      'issue', 'list',
      '--repo', repo(),
      '--state', 'open',
      '--search', `${marker} in:body`,
      '--json', 'number,title,body',
      '--limit', '20',
    ]);
    const issues = JSON.parse(raw || '[]');
    const existing = issues.find((item) => String(item.body || '').includes(`<!-- ${marker} -->`));
    if (existing) {
      gh(
        ['api', '-X', 'PATCH', `repos/${repo()}/issues/${existing.number}`, '--input', '-'],
        JSON.stringify({ title, body: stamped, labels }),
      );
      console.log(`[ola2] issue #${existing.number} actualizado (${marker})`);
      return { ok: true, number: existing.number, updated: true };
    }
    const created = gh([
      'issue', 'create',
      '--repo', repo(),
      '--title', title,
      '--body', stamped,
      '--label', labels.join(','),
    ]);
    console.log(`[ola2] issue creado (${marker}): ${created.trim()}`);
    return { ok: true, number: null, updated: false };
  } catch (error) {
    console.warn(`[ola2] no se pudo upsert issue: ${error.message}`);
    return { ok: false, number: null };
  }
}

export function upsertPrComment(marker, body) {
  const pr = process.env.PR_NUMBER;
  if (!repo() || !token() || !pr) {
    console.log(`[ola2] skip PR comment (${marker}): no gh context`);
    return false;
  }
  const stamped = `${body.trim()}\n\n<!-- ${marker} -->\n`;
  try {
    const raw = gh(['api', `repos/${repo()}/issues/${pr}/comments`, '--paginate']);
    const comments = JSON.parse(raw || '[]');
    const existing = comments.find((item) => String(item.body || '').includes(`<!-- ${marker} -->`));
    const payload = JSON.stringify({ body: stamped });
    if (existing) {
      gh(['api', '-X', 'PATCH', `repos/${repo()}/issues/comments/${existing.id}`, '--input', '-'], payload);
    } else {
      gh(['api', `repos/${repo()}/issues/${pr}/comments`, '--input', '-'], payload);
    }
    return true;
  } catch (error) {
    console.warn(`[ola2] no se pudo comentar el PR: ${error.message}`);
    return false;
  }
}

export function permalink(path, line) {
  const sha = process.env.HEAD_SHA || 'HEAD';
  const r = repo() || 'hotclickdev/Hot-click-dev';
  return `https://github.com/${r}/blob/${sha}/${path}#L${line}`;
}
