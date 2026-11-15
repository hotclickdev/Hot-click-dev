/**
 * E4 — excepciones auditadas para el detector GENÉRICO de secretos en src/test.
 *
 * Estado de confianza (fail-closed): NO existe hoy una fuente de aprobaciones
 * protegida FUERA del PR que CI pueda verificar con los permisos existentes
 * (master sin branch protection ni rulesets, sin CODEOWNERS; el registro JSON
 * vive en el mismo árbol que el PR puede editar). Por eso:
 *   - el registro del repo es solo METADATA (huella, motivo); nunca concede nada;
 *   - una excepción solo podría aplicar si un verificador independiente
 *     (`verifyApproval`) atestigua la huella y el digest exacto de la entrada;
 *   - en producción el verificador es `null` → TODA excepción queda inactiva y
 *     el hallazgo sigue bloqueando. Los tests usan verificadores SINTÉTICOS.
 *
 * Huella canónica: ruta normalizada + nombre de constante + SHA-256 del literal.
 * Jamás aplica: src/main, fuera de src/test, no-Java, prefijos fuertes, entrada
 * corrupta/caducada/futura/vigencia excesiva/huérfana/valor cambiado/duplicada,
 * autoaprobación, aprobación no verificada o digest distinto.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

export const E4_EXCEPTIONS_PATH = 'scripts/eng-gates/e4-secret-exceptions.json';
export const SHA256_RE = /^[a-f0-9]{64}$/;
export const SRC_TEST_RE = /(?:^|\/)src\/test\//;
export const SRC_MAIN_RE = /(?:^|\/)src\/main\//;
/** Vigencia máxima de una aprobación (approvedAt → expiresAt). */
export const MAX_VALIDITY_DAYS = 90;

/**
 * Fuente de aprobación independiente. `null` = no configurada: ninguna
 * excepción puede aplicar. Cambiar esto exige una decisión de proceso/infra
 * revisada por Seguridad (fuente fuera del PR + permisos), no un commit del PR.
 */
export const PRODUCTION_APPROVAL_VERIFIER = null;
export const APPROVAL_SOURCE_STATUS = Object.freeze({
  configured: false,
  reason: 'fuente de aprobación independiente no configurada (prerrequisito de proceso no resuelto): toda excepción queda inactiva',
});

/** Prefijos literales de la segunda alternativa de SECRET_RE: jamás excepcionables. */
export const STRONG_PREFIX_RE =
  /\b(sk_live_[A-Za-z0-9]+|sk_test_[A-Za-z0-9]{8,}|whsec_[A-Za-z0-9]+|ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/i;

const GENERIC_ASSIGN_RE =
  /\b(api[_-]?key|token|password|secret|authorization)\b\s*[=:]\s*(['"])([A-Za-z0-9._/+-=]{12,})\2/i;

export function normalizePath(filePath) {
  return String(filePath || '').replaceAll('\\', '/');
}

export function sha256Utf8(value) {
  return createHash('sha256').update(String(value), 'utf8').digest('hex');
}

/** Huella canónica exacta: path + constante + sha256 del valor, separados por LF. */
export function canonicalFingerprint({ path, constant, valueSha256 }) {
  return sha256Utf8(`${normalizePath(path)}\n${constant}\n${String(valueSha256).toLowerCase()}`);
}

/** Digest de integridad de la entrada: cualquier cambio de campo invalida la aprobación atestiguada. */
export function entryDigest(entry) {
  const a = isObject(entry?.approval) ? entry.approval : {};
  const canonical = [
    'e4-secret-exception/v2',
    entry?.id, entry?.rule, normalizePath(entry?.path), entry?.constant,
    String(entry?.valueSha256 || '').toLowerCase(), entry?.reason,
    a.approver, a.reference, entry?.approvedAt, entry?.expiresAt,
  ].map((v) => (v == null ? '' : String(v)));
  return sha256Utf8(JSON.stringify(canonical));
}

export function extractConstantName(line) {
  const m = String(line || '').match(/\b([A-Za-z_][A-Za-z0-9_]*)\s*=\s*['"]/);
  return m ? m[1] : null;
}

export function describeSecretLine(line) {
  const text = String(line || '');
  const strong = text.match(STRONG_PREFIX_RE);
  if (strong) {
    return {
      ok: true,
      rule: 'strong-prefix',
      constant: extractConstantName(text),
      valueSha256: sha256Utf8(strong[0]),
    };
  }
  const generic = GENERIC_ASSIGN_RE.exec(text);
  if (!generic) return { ok: false };
  return {
    ok: true,
    rule: 'generic',
    constant: extractConstantName(text),
    valueSha256: sha256Utf8(generic[3]),
  };
}

function parseIsoDate(value) {
  if (value == null || value === '') return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/.test(String(value))) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Declaraciones de `constant` en el archivo Java COMPLETO vía parser establecido
 * (java-parser). Comentarios y strings no cuentan. Sin parser → no verificable.
 */
export function findConstantDeclarations(fileText, constant, parse) {
  if (typeof parse !== 'function') return { ok: false, reason: 'parser Java no disponible: no se puede verificar la constante' };
  let cst;
  try {
    cst = parse(String(fileText));
  } catch (err) {
    return { ok: false, reason: `parse-error del archivo: ${String(err.message || err).split('\n')[0]}` };
  }
  const found = [];
  (function rec(n) {
    if (!n || typeof n !== 'object' || n.tokenType) return;
    if (n.name === 'variableDeclarator') {
      const id = [].concat(n.children?.variableDeclaratorId || [])[0];
      const name = [].concat(id?.children?.Identifier || [])[0]?.image;
      if (name === constant) {
        const init = [].concat(n.children?.variableInitializer || [])[0];
        const toks = [];
        (function t(x) {
          if (!x || typeof x !== 'object') return;
          if (x.tokenType) { toks.push(x); return; }
          for (const v of Object.values(x.children || {})) for (const c of [].concat(v)) t(c);
        }(init));
        if (toks.length === 1 && toks[0].tokenType.name === 'StringLiteral') {
          found.push({ literal: true, valueSha256: sha256Utf8(toks[0].image.slice(1, -1)), line: toks[0].startLine });
        } else {
          found.push({ literal: false, valueSha256: null, line: id?.location?.startLine });
        }
      }
    }
    for (const v of Object.values(n.children || {})) for (const c of [].concat(v)) rec(c);
  }(cst));
  return { ok: true, declarations: found };
}

/**
 * Evalúa una entrada contra un hallazgo. Acumula TODOS los motivos de rechazo
 * (auditoría completa). Solo `applies:true` si no hay ninguno.
 * @returns {{ applies: boolean, inactive: boolean, reasons: string[], reason: string, digest: string|null }}
 */
export function evaluateExceptionEntry(entry, match, options = {}) {
  const {
    now = new Date(),
    fileText,
    parse,
    verifyApproval = PRODUCTION_APPROVAL_VERIFIER,
    prAuthor,
    maxValidityDays = MAX_VALIDITY_DAYS,
  } = options;
  const reasons = [];
  let inactive = false;
  const done = (digest = null) => ({
    applies: reasons.length === 0,
    inactive,
    reasons,
    reason: reasons.length ? reasons.join('; ') : 'excepción verificada por fuente independiente, vigente y con huella exacta',
    digest,
  });

  if (!isObject(entry)) { reasons.push('entrada corrupta: no es un objeto'); return done(); }
  const path = normalizePath(entry.path);
  const constant = entry.constant;
  const valueSha256 = String(entry.valueSha256 || '').toLowerCase();
  if (!String(entry.id || '').trim() || !path || !constant || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(constant) || !SHA256_RE.test(valueSha256)) {
    reasons.push('entrada corrupta: id/path/constant/valueSha256 inválidos');
    return done();
  }
  if (entry.rule !== 'generic') reasons.push('la excepción solo cubre la regla genérica');
  if (SRC_MAIN_RE.test(path) || !SRC_TEST_RE.test(path) || !path.endsWith('.java')) {
    reasons.push('la excepción jamás aplica fuera de src/test/**/*.java ni en src/main');
  }
  if (match?.rule === 'strong-prefix') reasons.push('prefijos fuertes no son excepcionables');
  if (normalizePath(match?.path) !== path || match?.constant !== constant || match?.valueSha256 !== valueSha256) {
    reasons.push('la huella canónica no coincide exactamente');
    return done();
  }

  // Archivo exacto: constante declarada una sola vez, literal String, mismo valor.
  if (typeof fileText !== 'string') {
    reasons.push('no verificable: falta el archivo exacto de HEAD (huérfana/valor no comprobables)');
  } else {
    const decl = findConstantDeclarations(fileText, constant, parse);
    if (!decl.ok) reasons.push(`no verificable: ${decl.reason}`);
    else if (decl.declarations.length === 0) reasons.push('entrada huérfana: la constante ya no está declarada en el archivo');
    else if (decl.declarations.length > 1) reasons.push('ambigua: la constante se declara más de una vez en el archivo');
    else if (!decl.declarations[0].literal) reasons.push('la constante no es un literal String simple');
    else if (decl.declarations[0].valueSha256 !== valueSha256) reasons.push('entrada invalidada: el valor de la constante cambió (huella distinta)');
  }

  const status = String(entry.status || '').toLowerCase();
  if (status !== 'approved') {
    inactive = true;
    reasons.push(`entrada ${status || 'sin estado'} inactiva hasta aprobación específica de Seguridad verificable fuera del PR`);
    return done(entryDigest(entry));
  }

  const approval = entry.approval;
  const approver = String(approval?.approver || '').trim();
  if (!isObject(approval) || !approver || !String(approval.reference || '').trim()) {
    reasons.push('entrada corrupta: approval.approver y approval.reference son obligatorios');
  }
  const approvedAt = parseIsoDate(entry.approvedAt);
  const expiresAt = parseIsoDate(entry.expiresAt);
  if (!approvedAt) reasons.push('entrada corrupta: approvedAt ausente o no es ISO-8601 con zona');
  if (!expiresAt) reasons.push('entrada corrupta: expiresAt ausente o no es ISO-8601 con zona');
  if (approvedAt && approvedAt.getTime() > now.getTime()) reasons.push('approvedAt en el futuro');
  if (approvedAt && expiresAt && expiresAt.getTime() <= approvedAt.getTime()) reasons.push('expiresAt no es posterior a approvedAt');
  if (approvedAt && expiresAt && expiresAt.getTime() - approvedAt.getTime() > maxValidityDays * 86400000) {
    reasons.push(`vigencia mayor al máximo de ${maxValidityDays} días`);
  }
  if (expiresAt && now.getTime() >= expiresAt.getTime()) reasons.push('entrada caducada; requiere nueva revisión de Seguridad');
  if (!String(prAuthor || '').trim()) {
    reasons.push('autor del PR desconocido: no se puede descartar autoaprobación');
  } else if (approver && approver.toLowerCase() === String(prAuthor).trim().toLowerCase()) {
    reasons.push('autoaprobación: el aprobador es el autor del PR');
  }

  const digest = entryDigest(entry);
  const fingerprint = canonicalFingerprint({ path, constant, valueSha256 });
  if (typeof verifyApproval !== 'function') {
    inactive = true;
    reasons.push(APPROVAL_SOURCE_STATUS.reason);
    return done(digest);
  }
  let att;
  let threw = false;
  try {
    att = verifyApproval({ entryId: entry.id, fingerprint, entryDigest: digest });
  } catch (err) {
    threw = true;
    reasons.push(`verificador independiente falló: ${String(err.message || err)}`);
  }
  if (!threw) {
    if (!isObject(att) || att.verified !== true) {
      reasons.push('aprobación no verificada por la fuente independiente (posible registro forjado)');
    } else {
      if (att.fingerprint !== fingerprint) reasons.push('integridad: la huella atestiguada no coincide');
      if (att.entryDigest !== digest) reasons.push('integridad: la entrada cambió respecto de lo aprobado (digest distinto)');
      if (String(att.approver || '').trim().toLowerCase() !== approver.toLowerCase()) reasons.push('integridad: el aprobador atestiguado no coincide');
      if (prAuthor && String(att.approver || '').trim().toLowerCase() === String(prAuthor).trim().toLowerCase()) {
        reasons.push('autoaprobación: la fuente atestigua al autor del PR');
      }
      const attAt = parseIsoDate(att.approvedAt);
      const attExp = parseIsoDate(att.expiresAt);
      if (!attAt || !approvedAt || attAt.getTime() !== approvedAt.getTime()) reasons.push('integridad: approvedAt atestiguado distinto');
      if (!attExp || !expiresAt || attExp.getTime() !== expiresAt.getTime()) reasons.push('integridad: expiresAt atestiguado distinto');
    }
  }
  return done(digest);
}

export function loadExceptionRegistry(source) {
  let data;
  let from;
  try {
    if (source == null) {
      from = join(REPO_ROOT, E4_EXCEPTIONS_PATH);
      if (!existsSync(from)) return { ok: false, reason: 'registro ausente', entries: [], pending: [] };
      data = JSON.parse(readFileSync(from, 'utf8'));
    } else if (typeof source === 'string') {
      from = source;
      data = JSON.parse(readFileSync(source, 'utf8'));
    } else {
      from = 'memory';
      data = source;
    }
  } catch (err) {
    return { ok: false, reason: `registro corrupto: ${err.message}`, entries: [], pending: [] };
  }
  if (!isObject(data) || !Array.isArray(data.entries)) {
    return { ok: false, reason: 'registro corrupto: falta entries[]', entries: [], pending: [] };
  }
  const ids = new Set();
  const fps = new Set();
  for (const e of data.entries) {
    if (!isObject(e)) continue;
    const fp = canonicalFingerprint({ path: e.path, constant: e.constant, valueSha256: e.valueSha256 });
    if (e.fingerprint != null && e.fingerprint !== fp) {
      return { ok: false, reason: `registro corrupto: fingerprint de ${e.id} no coincide con path+constant+valueSha256`, entries: [], pending: [] };
    }
    if (ids.has(e.id) || fps.has(fp)) {
      return { ok: false, reason: 'registro corrupto: id o huella duplicados', entries: [], pending: [] };
    }
    ids.add(e.id);
    fps.add(fp);
  }
  return { ok: true, reason: 'ok', data, entries: data.entries, pending: data.entries.filter((e) => e && e.status === 'pending'), from };
}

/**
 * @returns {{ suppress: boolean, pendingReview: object|null, reason: string, metadata?: object, audit: object|null }}
 */
export function matchSecretException({ registry, match, now = new Date(), fileText, parse, verifyApproval, prAuthor }) {
  if (!match?.ok) return { suppress: false, pendingReview: null, reason: 'sin hallazgo', audit: null };
  const metadata = {
    path: normalizePath(match.path),
    constant: match.constant,
    valueSha256: match.valueSha256,
    rule: match.rule,
    fingerprint: match.constant && match.valueSha256
      ? canonicalFingerprint({ path: match.path, constant: match.constant, valueSha256: match.valueSha256 })
      : null,
  };
  const audit = { at: now.toISOString(), ...metadata, entryId: null, decision: 'blocked', reasons: [] };
  if (!registry?.ok) {
    audit.reasons.push(`registro no utilizable: ${registry?.reason || 'ausente'}`);
    return { suppress: false, pendingReview: null, reason: audit.reasons[0], metadata, audit };
  }
  if (match.rule !== 'generic' || !SRC_TEST_RE.test(metadata.path) || !match.constant) {
    audit.reasons.push('no candidata a excepción (regla, ruta o constante)');
    return { suppress: false, pendingReview: null, reason: audit.reasons[0], metadata, audit };
  }
  const entry = registry.entries.find((e) => isObject(e)
    && normalizePath(e.path) === metadata.path && e.constant === metadata.constant
    && String(e.valueSha256 || '').toLowerCase() === metadata.valueSha256);
  if (!entry) {
    audit.reasons.push('sin entrada con huella exacta');
    return { suppress: false, pendingReview: null, reason: audit.reasons[0], metadata, audit };
  }
  const ev = evaluateExceptionEntry(entry, { ...match, path: metadata.path }, { now, fileText, parse, verifyApproval, prAuthor });
  audit.entryId = entry.id;
  audit.entryDigest = ev.digest;
  audit.reasons = ev.reasons;
  if (ev.applies) {
    audit.decision = 'suppressed';
    return { suppress: true, pendingReview: null, reason: ev.reason, metadata, audit };
  }
  const pendingReview = ev.inactive
    ? { ...metadata, id: entry.id, reason: entry.reason || ev.reason, status: entry.status, evaluation: ev.reason }
    : null;
  return { suppress: false, pendingReview, reason: ev.reason, metadata, audit };
}

export function pendingExceptionMetadata(registry) {
  return (registry?.entries || [])
    .filter((e) => e && e.status === 'pending')
    .map((e) => ({
      id: e.id,
      path: normalizePath(e.path),
      constant: e.constant,
      valueSha256: e.valueSha256,
      rule: e.rule,
      reason: e.reason,
      fingerprint: e.path && e.constant && e.valueSha256
        ? canonicalFingerprint({ path: e.path, constant: e.constant, valueSha256: e.valueSha256 })
        : null,
      status: 'pending',
    }));
}
