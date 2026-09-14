#!/usr/bin/env node
/**
 * D7 — Daily/weekly i18n drift ES/EN/PT.
 * Diff de keys en frontend locales. Issue con huérfanas/faltantes por namespace.
 */

import { existsSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import {
  flattenJsonKeys,
  hasLabel,
  I18N_DIR,
  namespaceOf,
  PRIORITY_I18N_NS,
  SKIP_LABELS,
  writeGithubOutput,
} from './ola4-lib.mjs';
import { upsertIssue } from './ola2-github.mjs';

export function loadLocale(dir, code, readFile = readFileSync) {
  const abs = join(dir, `${code}.json`);
  if (!existsSync(abs) && !dir.startsWith('memory:')) {
    try {
      return JSON.parse(readFile(abs, 'utf8'));
    } catch {
      return {};
    }
  }
  try {
    return JSON.parse(readFile(abs, 'utf8'));
  } catch {
    return {};
  }
}

export function diffI18nKeys(locales) {
  const sets = Object.fromEntries(
    Object.entries(locales).map(([code, obj]) => [code, new Set(flattenJsonKeys(obj))]),
  );
  const all = new Set(Object.values(sets).flatMap((s) => [...s]));
  const missing = [];
  const orphan = [];
  for (const key of [...all].sort()) {
    const present = Object.entries(sets)
      .filter(([, set]) => set.has(key))
      .map(([code]) => code);
    const absent = Object.keys(sets).filter((code) => !sets[code].has(key));
    if (!absent.length) continue;
    const row = { key, namespace: namespaceOf(key), present, absent };
    if (present.includes('es') && absent.length) missing.push(row);
    else orphan.push(row);
  }
  return { missing, orphan, counts: Object.fromEntries(Object.entries(sets).map(([k, v]) => [k, v.size])) };
}

export function groupByNamespace(rows, priority = PRIORITY_I18N_NS) {
  const groups = new Map();
  for (const row of rows) {
    const ns = row.namespace;
    if (!groups.has(ns)) groups.set(ns, []);
    groups.get(ns).push(row);
  }
  const ordered = [
    ...priority.filter((ns) => groups.has(ns)),
    ...[...groups.keys()].filter((ns) => !priority.includes(ns)).sort(),
  ];
  return ordered.map((ns) => ({ namespace: ns, rows: groups.get(ns), priority: priority.includes(ns) }));
}

export function buildIssueBody(diff, meta) {
  const missGroups = groupByNamespace(diff.missing);
  const orphanGroups = groupByNamespace(diff.orphan);
  const lines = [
    '## D7 — i18n drift ES / EN / PT',
    '',
    `Última corrida: ${meta.ranAt}`,
    `Keys: es **${diff.counts.es || 0}** · en **${diff.counts.en || 0}** · pt **${diff.counts.pt || 0}**`,
    `Faltantes (están en es, no en otro): **${diff.missing.length}** · huérfanas (no están en es): **${diff.orphan.length}**`,
    '',
    'Fuente de verdad: `Hot_click_outlet/frontend/src/i18n/locales/es.json`.',
    'Namespaces prioritarios: `home`, `checkout`, `pos`.',
    '',
  ];
  const renderGroup = (title, groups) => {
    lines.push(`### ${title}`, '');
    if (!groups.length) {
      lines.push('Sin hallazgos.', '');
      return;
    }
    for (const group of groups) {
      const tag = group.priority ? ' (prioridad)' : '';
      lines.push(`#### \`${group.namespace}\`${tag} — ${group.rows.length}`, '');
      for (const row of group.rows.slice(0, 25)) {
        lines.push(`- \`${row.key}\` — falta en **${row.absent.join(', ')}** (presente: ${row.present.join(', ')})`);
      }
      if (group.rows.length > 25) lines.push(`- … +${group.rows.length - 25} más`);
      lines.push('');
    }
  };
  renderGroup('Faltantes (es → en/pt)', missGroups);
  renderGroup('Huérfanas (en/pt sin es)', orphanGroups);
  lines.push('No modifica JSON. Marker: `hotclick-d7-i18n`.');
  return lines.join('\n');
}

export function runI18nDrift(opts = {}) {
  if (hasLabel(process.env.PR_LABELS, SKIP_LABELS.i18n)) {
    return { skipped: true, diff: { missing: [], orphan: [], counts: {} } };
  }
  const dir = opts.dir || I18N_DIR;
  const readFile = opts.readFile || readFileSync;
  const locales = {
    es: opts.locales?.es || loadLocale(dir, 'es', readFile),
    en: opts.locales?.en || loadLocale(dir, 'en', readFile),
    pt: opts.locales?.pt || loadLocale(dir, 'pt', readFile),
  };
  return { skipped: false, diff: diffI18nKeys(locales) };
}

function main() {
  const result = runI18nDrift();
  if (result.skipped) {
    console.log('D7 i18n: skip label');
    return;
  }
  const body = buildIssueBody(result.diff, { ranAt: new Date().toISOString() });
  const drift = result.diff.missing.length + result.diff.orphan.length;
  console.log(`D7 i18n drift: ${result.diff.missing.length} missing, ${result.diff.orphan.length} orphan`);
  upsertIssue({
    title: '[D7] i18n drift ES/EN/PT',
    marker: 'hotclick-d7-i18n',
    labels: ['i18n-drift', 'eng-agent'],
    body,
  });
  writeGithubOutput({ drift: String(drift), missing: String(result.diff.missing.length) });
}

if (basename(process.argv[1] || '') === 'i18n-drift.mjs') main();
