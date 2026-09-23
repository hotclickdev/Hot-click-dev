#!/usr/bin/env node
/**
 * E10 — Authorization catch-all on PR.
 * Si el PR agrega @RestController o mappings /api nuevos, exige una regla
 * explícita en SecurityAuthorizationRules (no solo el catch-all /api/**).
 */

import { basename, join } from 'node:path';
import {
  AUTH_CATCHALL_REL,
  AUTH_RULES_REL,
  REPO_ROOT,
  SKIP_LABELS,
  apiFamily,
  fileExists,
  gitChangedFiles,
  gitShow,
  hasLabel,
  normalizeApiPath,
  pathMatches,
  readText,
  writeGithubOutput,
} from './ola2-lib.mjs';
import { upsertPrComment } from './ola2-github.mjs';

const MAPPING_ANNOS = String.raw`(?:Get|Post|Put|Patch|Delete|Request)Mapping`;
const CLASS_MAP_RE = /@RequestMapping\s*(?:\((?:value|path)\s*=\s*)?[\(\s]*["']([^"']+)["']/;
const METHOD_MAP_RE = new RegExp(`@${MAPPING_ANNOS}\\s*(?:\\((?:value|path)\\s*=\\s*)?[\\(\\s]*["']([^"']+)["']`, 'g');
const MATCHER_RE = /\.requestMatchers\s*\(\s*(?:(?:GET|POST|PUT|PATCH|DELETE)\s*,\s*)?["']([^"']+)["']/g;

export function extractClassPrefix(source) {
  const hit = String(source).match(CLASS_MAP_RE);
  return hit ? normalizeApiPath(hit[1]) : '';
}

export function extractMappings(source) {
  const prefix = extractClassPrefix(source);
  const paths = new Set();
  if (prefix) paths.add(prefix);
  const re = new RegExp(METHOD_MAP_RE.source, 'g');
  let match = re.exec(source);
  while (match) {
    const suffix = normalizeApiPath(match[1]);
    paths.add(joinUrl(prefix, suffix));
    match = re.exec(source);
  }
  if (prefix && /@RestController/.test(source) && paths.size === 1) {
    const emptyMethods = source.match(new RegExp(`@${MAPPING_ANNOS}\\b`, 'g')) || [];
    if (emptyMethods.length) paths.add(prefix);
  }
  return [...paths];
}

function joinUrl(prefix, suffix) {
  if (!prefix) return suffix;
  if (!suffix || suffix === '/') return prefix;
  if (suffix.startsWith(prefix)) return suffix;
  return normalizeApiPath(`${prefix}/${suffix}`.replace(/\/{2,}/g, '/'));
}

export function extractMatchers(rulesSource) {
  const out = [];
  let match = MATCHER_RE.exec(rulesSource);
  while (match) {
    out.push(normalizeApiPath(match[1]));
    match = MATCHER_RE.exec(rulesSource);
  }
  MATCHER_RE.lastIndex = 0;
  return out;
}

export function hasCatchAll(matchers) {
  return matchers.some((m) => m === '/api/**');
}

export function coverageFor(path, matchers) {
  const explicit = matchers.filter((m) => m !== '/api/**' && m !== '/**');
  const family = apiFamily(path);
  const explicitHit = explicit.find((m) => pathMatches(path, m) || pathMatches(family, m) || path.startsWith(`${m.replace(/\/\*\*$/, '')}/`) || family.startsWith(m.replace(/\/\*\*$/, '')));
  if (explicitHit) return { covered: true, how: explicitHit };
  if (hasCatchAll(matchers) && path.startsWith('/api/')) {
    return { covered: false, how: '/api/** (catch-all only)', catchAllOnly: true };
  }
  return { covered: false, how: 'none', catchAllOnly: false };
}

export function newMappingsFromDiff({ changedFiles, readHead, readBase }) {
  const out = [];
  for (const file of changedFiles) {
    if (!file.endsWith('.java')) continue;
    if (!/\/controller\//.test(file) && !/@RestController/.test(readHead(file) || '')) continue;
    const head = readHead(file) || '';
    if (!/@RestController/.test(head) && !/@RequestMapping/.test(head)) continue;
    const base = readBase(file) || '';
    const headMaps = new Set(extractMappings(head));
    const baseMaps = new Set(extractMappings(base));
    const addedController = /@RestController/.test(head) && !/@RestController/.test(base);
    for (const path of headMaps) {
      if (addedController || !baseMaps.has(path)) {
        out.push({ file, path, addedController });
      }
    }
  }
  return out;
}

export function evaluateAuthz({ mappings, matchers, catchAllTestExists, skip }) {
  if (skip) return { ok: true, skipped: true, missing: [], reason: `skip label ${SKIP_LABELS.authz}` };
  if (!hasCatchAll(matchers)) {
    return {
      ok: false,
      skipped: false,
      missing: ['/api/**'],
      reason: 'Falta el catch-all requestMatchers("/api/**") en SecurityAuthorizationRules',
    };
  }
  if (!catchAllTestExists) {
    return {
      ok: false,
      skipped: false,
      missing: [AUTH_CATCHALL_REL],
      reason: 'Falta SecurityAuthorizationRulesCatchAllTest',
    };
  }
  if (!mappings.length) {
    return { ok: true, skipped: false, missing: [], reason: 'sin mappings /api nuevos' };
  }
  const missing = [];
  for (const item of mappings) {
    const cov = coverageFor(item.path, matchers);
    if (!cov.covered) missing.push({ ...item, how: cov.how });
  }
  if (missing.length) {
    return {
      ok: false,
      skipped: false,
      missing,
      reason: `${missing.length} path(s) /api sin regla explícita en SecurityAuthorizationRules`,
    };
  }
  return { ok: true, skipped: false, missing: [], reason: 'mappings cubiertos por reglas explícitas' };
}

export function runAuthz(opts = {}) {
  const skip = hasLabel(process.env.PR_LABELS, SKIP_LABELS.authz);
  const base = opts.base || process.env.BASE_SHA;
  const head = opts.head || process.env.HEAD_SHA;
  const changed = opts.changedFiles || (base && head ? gitChangedFiles(base, head) : []);
  const readHead = opts.readHead || ((file) => (opts.headSource && opts.headSource[file]) || gitShow(head, file) || readIfPresent(file));
  const readBase = opts.readBase || ((file) => (opts.baseSource && opts.baseSource[file]) || (base ? gitShow(base, file) : ''));
  const mappings = newMappingsFromDiff({ changedFiles: changed, readHead, readBase });
  const rulesSource = opts.rulesSource || readHead(AUTH_RULES_REL) || readIfPresent(AUTH_RULES_REL);
  const matchers = extractMatchers(rulesSource);
  const catchAllTestExists = opts.catchAllTestExists ?? (fileExists(AUTH_CATCHALL_REL) || Boolean(readHead(AUTH_CATCHALL_REL)));
  return evaluateAuthz({ mappings, matchers, catchAllTestExists, skip });
}

function readIfPresent(rel) {
  try {
    return readText(join(REPO_ROOT, rel));
  } catch {
    return '';
  }
}

function commentBody(verdict) {
  const lines = [
    '## E10 — Authorization catch-all',
    '',
    verdict.ok ? '**PASS**' : '**FAIL**',
    '',
    verdict.reason,
    '',
  ];
  if (verdict.missing?.length) {
    lines.push('### Paths sin cobertura explícita', '');
    for (const item of verdict.missing) {
      if (typeof item === 'string') {
        lines.push(`- \`${item}\``);
        continue;
      }
      lines.push(`- \`${item.path}\` en \`${item.file}\` — hoy cae en \`${item.how}\``);
    }
    lines.push(
      '',
      'Agregá un `requestMatchers` en `SecurityAuthorizationRules` (permitAll / authenticated / hasRole).',
      `No alcanza con el catch-all \`/api/**\`. Label de skip intencional: \`${SKIP_LABELS.authz}\`.`,
    );
  }
  return lines.join('\n');
}

function main() {
  if (!process.env.BASE_SHA || !process.env.HEAD_SHA) {
    console.error('BASE_SHA y HEAD_SHA son obligatorios');
    process.exit(2);
  }
  const verdict = runAuthz();
  console.log(`E10 Authz: ${verdict.ok ? 'PASS' : 'FAIL'} — ${verdict.reason}`);
  if (!verdict.skipped && (!verdict.ok || verdict.missing?.length)) {
    upsertPrComment('hotclick-e10-authz', commentBody(verdict));
  }
  writeGithubOutput({ ok: verdict.ok ? 'true' : 'false', reason: verdict.reason });
  process.exit(verdict.ok ? 0 : 1);
}

if (basename(process.argv[1] || '') === 'gate-authz.mjs') main();
