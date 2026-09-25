#!/usr/bin/env node
/**
 * Gate de severidad sobre salida JSON de osv-scanner.
 * Falla solo en HIGH/CRITICAL (y severidad irresoluble = fail-closed).
 * Medium/Low/Moderate: se reportan y no bloquean.
 *
 * Uso:
 *   node scripts/eng-gates/osv-deps-gate.mjs <osv.json> [--osv-rc N] [--allowlist path]
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const SEVERITIES = new Set(['critical', 'high', 'moderate', 'medium', 'low']);
const BLOCKING = new Set(['critical', 'high']);

export function bandFromCvss(score) {
  const n = Number.parseFloat(score);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (n >= 9.0) return 'critical';
  if (n >= 7.0) return 'high';
  if (n >= 4.0) return 'moderate';
  return 'low';
}

export function normalizeSeverity(raw) {
  const s = String(raw || '').trim().toLowerCase();
  if (s === 'medium') return 'moderate';
  return s;
}

export function primaryId(vuln) {
  const id = vuln?.id;
  if (typeof id === 'string' && id.length > 0) {
    if (id.startsWith('GHSA-') || id.startsWith('CVE-')) return id;
  }
  for (const alias of vuln?.aliases || []) {
    if (typeof alias === 'string' && alias.startsWith('GHSA-')) return alias;
  }
  for (const alias of vuln?.aliases || []) {
    if (typeof alias === 'string' && alias.startsWith('CVE-')) return alias;
  }
  return typeof id === 'string' && id.length > 0 ? id : '?';
}

export function iterFindings(doc) {
  const findings = [];
  for (const result of doc?.results || []) {
    const source = result?.source?.path || '?';
    for (const pkg of result?.packages || []) {
      const p = pkg?.package || {};
      const name = p.name || '?';
      const version = p.version || '?';
      const ecosystem = p.ecosystem || '?';
      const idCvss = {};
      for (const g of pkg?.groups || []) {
        const band = bandFromCvss(g?.max_severity);
        if (!band) continue;
        for (const key of [...(g.ids || []), ...(g.aliases || [])]) {
          idCvss[key] = band;
        }
      }
      for (const vuln of pkg?.vulnerabilities || []) {
        let sev = normalizeSeverity(vuln?.database_specific?.severity);
        if (!SEVERITIES.has(sev)) {
          sev = idCvss[vuln?.id] || '';
          if (!sev) {
            for (const alias of vuln?.aliases || []) {
              if (idCvss[alias]) {
                sev = idCvss[alias];
                break;
              }
            }
          }
        }
        if (!sev) {
          const fromSeverity = (vuln?.severity || [])
            .map((item) => bandFromCvss(item?.score))
            .find(Boolean);
          sev = fromSeverity || '';
        }
        findings.push({
          name,
          version,
          ecosystem,
          source,
          id: primaryId(vuln),
          aliases: Array.isArray(vuln?.aliases) ? vuln.aliases : [],
          severity: sev,
          summary: vuln?.summary || vuln?.id || '?',
        });
      }
    }
  }
  return findings;
}

export function loadAllowlist(path) {
  const raw = JSON.parse(readFileSync(path, 'utf8'));
  if (!raw || !Array.isArray(raw.entries)) {
    throw new Error(`allowlist inválido: falta entries[] en ${path}`);
  }
  const today = new Date().toISOString().slice(0, 10);
  const active = new Map();
  const expired = [];
  for (const entry of raw.entries) {
    if (!entry?.id || !entry?.reason || !entry?.acceptedAt) {
      throw new Error(
        `entrada allowlist incompleta (exige id, reason, acceptedAt): ${JSON.stringify(entry)}`,
      );
    }
    const expiresOn = entry.expiresOn || null;
    if (expiresOn && expiresOn < today) {
      expired.push(entry);
      continue;
    }
    active.set(entry.id, entry);
    for (const alias of entry.aliases || []) {
      active.set(alias, entry);
    }
  }
  return { active, expired, version: raw.version };
}

export function evaluateFindings(findings, allowlist) {
  const informational = [];
  const suppressed = [];
  const blocking = [];
  const unclassified = [];

  for (const f of findings) {
    if (!SEVERITIES.has(f.severity)) {
      unclassified.push(f);
      continue;
    }
    if (!BLOCKING.has(f.severity)) {
      informational.push(f);
      continue;
    }
    const match =
      allowlist.active.get(f.id) ||
      f.aliases.map((a) => allowlist.active.get(a)).find(Boolean);
    if (match) {
      suppressed.push({ ...f, allowlist: match });
    } else {
      blocking.push(f);
    }
  }

  return { informational, suppressed, blocking, unclassified };
}

function formatFinding(f) {
  return `${f.name}@${f.version} [${f.ecosystem}] sev=${f.severity || 'unknown'} ${f.id} — ${f.summary} (fuente: ${f.source})`;
}

function printSection(title, items, lineFn) {
  if (items.length === 0) return;
  console.log(`\n=== ${title} (${items.length}) ===`);
  for (const item of items) {
    console.log(`- ${lineFn(item)}`);
  }
}

export function runGate({ doc, allowlist, osvRc }) {
  if (osvRc !== undefined && osvRc !== null && osvRc !== 0 && osvRc !== 1) {
    console.error(`ERROR: osv-scanner falló (rc=${osvRc}). Solo se aceptan 0 (limpio) o 1 (hallazgos).`);
    return 2;
  }
  if (!doc || !Array.isArray(doc.results)) {
    console.error("ERROR: JSON de osv-scanner sin 'results' — fail-closed.");
    return 2;
  }

  const findings = iterFindings(doc);
  if (osvRc === 1 && findings.length === 0) {
    console.error(
      'ERROR: osv-scanner reportó vulnerabilidades (rc=1) pero el gate no parseó ninguna — posible drift de schema.',
    );
    return 2;
  }

  const verdict = evaluateFindings(findings, allowlist);

  console.log(
    `osv-deps-gate: ${findings.length} hallazgo(s) · bloqueantes=${verdict.blocking.length} · informativos=${verdict.informational.length} · suprimidos=${verdict.suppressed.length} · sin-severidad=${verdict.unclassified.length}`,
  );

  printSection('INFORMATIVO (medium/low — no bloquea)', verdict.informational, formatFinding);
  printSection('SUPRIMIDO (allowlist)', verdict.suppressed, (f) => {
    const until = f.allowlist.expiresOn ? ` expira ${f.allowlist.expiresOn}` : ' permanente';
    return `${formatFinding(f)} [${f.allowlist.acceptedAt}${until}: ${f.allowlist.reason}]`;
  });

  if (allowlist.expired.length > 0) {
    console.log('\n=== ALLOWLIST EXPIRADA (ya no suprime) ===');
    for (const e of allowlist.expired) {
      console.log(`- ${e.id} expiró ${e.expiresOn}: ${e.reason}`);
    }
  }

  if (verdict.unclassified.length > 0) {
    printSection('SIN SEVERIDAD (fail-closed)', verdict.unclassified, formatFinding);
    console.error(
      `\nFALLO: ${verdict.unclassified.length} hallazgo(s) sin severidad resoluble. Clasificá o actualizá el gate.`,
    );
    return 2;
  }

  if (verdict.blocking.length > 0) {
    printSection('BLOQUEA (HIGH/CRITICAL)', verdict.blocking, formatFinding);
    console.error(
      `\nFALLO: ${verdict.blocking.length} vulnerabilidad(es) HIGH/CRITICAL. Actualizá la dependencia o documentá una excepción en scripts/eng-gates/osv-deps-allowlist.json (ver docs/security/dependency-scanning.md).`,
    );
    return 1;
  }

  console.log('\nOK — ninguna HIGH/CRITICAL sin allowlist.');
  return 0;
}

function main(argv) {
  const args = argv.slice(2);
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(
      'Uso: node scripts/eng-gates/osv-deps-gate.mjs <osv.json> [--osv-rc N] [--allowlist path]',
    );
    process.exit(args.includes('--help') || args.includes('-h') ? 0 : 2);
  }

  let jsonPath = null;
  let osvRc = null;
  let allowlistPath = resolve('scripts/eng-gates/osv-deps-allowlist.json');

  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];
    if (a === '--osv-rc') {
      osvRc = Number.parseInt(args[++i], 10);
    } else if (a === '--allowlist') {
      allowlistPath = resolve(args[++i]);
    } else if (!a.startsWith('-')) {
      jsonPath = resolve(a);
    } else {
      console.error(`flag desconocida: ${a}`);
      process.exit(2);
    }
  }

  if (!jsonPath) {
    console.error('falta ruta al JSON de osv-scanner');
    process.exit(2);
  }

  let doc;
  try {
    doc = JSON.parse(readFileSync(jsonPath, 'utf8'));
  } catch (err) {
    console.error(`ERROR: no se pudo leer ${jsonPath}: ${err.message}`);
    process.exit(2);
  }

  let allowlist;
  try {
    allowlist = loadAllowlist(allowlistPath);
  } catch (err) {
    console.error(`ERROR: allowlist: ${err.message}`);
    process.exit(2);
  }

  process.exit(runGate({ doc, allowlist, osvRc }));
}

const invokedAsCli =
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (invokedAsCli) {
  main(process.argv);
}
