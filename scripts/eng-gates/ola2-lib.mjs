/**
 * Helpers compartidos de ola 2 (D2 / S1 / S3 / E10 / S8).
 * Autocontenido: no importa scripts de ola 1 (PR #55).
 */

import { execFileSync } from 'node:child_process';
import { appendFileSync, existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const JAVA_MAIN = join(REPO_ROOT, 'Hot_click_outlet', 'src', 'main', 'java');
export const FRONTEND_SRC = join(REPO_ROOT, 'Hot_click_outlet', 'frontend', 'src');
export const FRONTEND_TESTS = join(REPO_ROOT, 'Hot_click_outlet', 'frontend', 'tests');
export const AUTH_RULES_REL =
  'Hot_click_outlet/src/main/java/com/hotclick/security/config/SecurityAuthorizationRules.java';
export const AUTH_CATCHALL_REL =
  'Hot_click_outlet/src/test/java/com/hotclick/integration/SecurityAuthorizationRulesCatchAllTest.java';

export const SKIP_LABELS = {
  authz: 'skip-authz-gate',
  idor: 'skip-idor-hunter',
  sonar: 'skip-sonar-batch',
  e2e: 'skip-e2e-gap',
  restore: 'skip-restore-drill',
};

const SECRET_RE =
  /(api[_-]?key|token|password|secret|authorization|bearer|sk_live|sk_test|whsec)[=:\s]+['\"]?[\w./+.-]{8,}/gi;

export function redactSecrets(text) {
  return String(text ?? '').replace(SECRET_RE, (match) => {
    const cut = match.search(/[=:\s]/);
    return `${match.slice(0, cut + 1)}***`;
  });
}

export function hasLabel(raw, name) {
  if (!name) return false;
  return String(raw || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .includes(String(name).toLowerCase());
}

export function readText(absPath) {
  return readFileSync(absPath, 'utf8');
}

export function relRepo(absPath) {
  return relative(REPO_ROOT, absPath).split(sep).join('/');
}

export function walkFiles(root, pred) {
  if (!existsSync(root)) return [];
  const out = [];
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const abs = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === 'target' || entry.name === '.git') continue;
        stack.push(abs);
        continue;
      }
      if (!pred || pred(abs, entry.name)) out.push(abs);
    }
  }
  return out.sort();
}

export function countLoc(text) {
  return String(text).split(/\r?\n/).length;
}

export function isSensitivePaymentAuthPos(relPath) {
  const base = relPath.split('/').pop() || '';
  return /^(Payment|Auth|Pos|Sinpe|Wallet)/i.test(base);
}

export function isoWeek(date = new Date()) {
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((utc - yearStart) / 86400000 + 1) / 7);
  return { year: utc.getUTCFullYear(), week };
}

export function snippet(line) {
  return redactSecrets(String(line).trim()).slice(0, 160);
}

export function git(args, cwd = REPO_ROOT) {
  return execFileSync('git', args, {
    encoding: 'utf8',
    cwd,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
}

export function gitChangedSince(since, globs) {
  const raw = git(['log', `--since=${since}`, '--name-only', '--pretty=format:']);
  const unique = [...new Set(raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean))];
  if (!globs?.length) return unique;
  return unique.filter((file) => globs.some((re) => re.test(file)));
}

export function gitChangedFiles(base, head) {
  const raw = git(['diff', '--name-only', `${base}...${head}`]);
  return raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

export function gitShow(sha, relPath) {
  try {
    return git(['show', `${sha}:${relPath}`]);
  } catch {
    return '';
  }
}

export function gitUnifiedDiff(base, head, paths = []) {
  const args = ['diff', '-U0', `${base}...${head}`];
  if (paths.length) args.push('--', ...paths);
  return git(args);
}

export function parseAddedLines(diff) {
  const files = new Map();
  let current = null;
  let newLine = 0;
  for (const line of String(diff).split(/\r?\n/)) {
    const fileHit = /^diff --git a\/(.+) b\/(.+)$/.exec(line);
    if (fileHit) {
      current = fileHit[2];
      if (!files.has(current)) files.set(current, []);
      continue;
    }
    const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
    if (hunk) {
      newLine = Number(hunk[1]);
      continue;
    }
    if (!current) continue;
    if (line.startsWith('+') && !line.startsWith('+++')) {
      files.get(current).push({ line: newLine, text: line.slice(1) });
      newLine += 1;
      continue;
    }
    if (line.startsWith('-') && !line.startsWith('---')) continue;
    newLine += 1;
  }
  return files;
}

export function fileExists(relPath) {
  return existsSync(join(REPO_ROOT, relPath));
}

export function fileSize(relPath) {
  const abs = join(REPO_ROOT, relPath);
  return existsSync(abs) ? statSync(abs).size : 0;
}

export function antToRegex(pattern) {
  const escaped = String(pattern)
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '::GLOBSTAR::')
    .replace(/\*/g, '[^/]*')
    .replace(/::GLOBSTAR::/g, '.*');
  return new RegExp(`^${escaped}$`);
}

export function normalizeApiPath(raw) {
  let path = String(raw || '').trim();
  if (!path.startsWith('/')) path = `/${path}`;
  path = path.replace(/\{[^}]+\}/g, '*');
  if (path.length > 1) path = path.replace(/\/+$/, '');
  return path;
}

export function pathMatches(path, pattern) {
  const normPath = normalizeApiPath(path);
  const normPat = normalizeApiPath(pattern);
  if (normPath === normPat) return true;
  return antToRegex(normPat).test(normPath);
}

export function apiFamily(path) {
  const parts = normalizeApiPath(path).split('/').filter(Boolean);
  if (parts[0] !== 'api' || parts.length < 2) return normalizeApiPath(path);
  if (parts[1] === 'admin' && parts[2]) return `/api/admin/${parts[2]}`;
  if (parts[1] === 'public' && parts[2]) return `/api/public/${parts[2]}`;
  return `/api/${parts[1]}`;
}

export function writeGithubOutput(pairs) {
  const dest = process.env.GITHUB_OUTPUT;
  if (!dest) return;
  const body = Object.entries(pairs)
    .map(([key, value]) => `${key}=${String(value).replaceAll('\n', '%0A')}`)
    .join('\n');
  appendFileSync(dest, `${body}\n`);
}
