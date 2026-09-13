/**
 * Shared helpers for HotClick engineering PR gates (ola 1).
 * Node 22+, no extra dependencies.
 */

import { execFileSync } from 'node:child_process';
import { appendFileSync, existsSync } from 'node:fs';

export const SKIP_LABELS = {
  flyway: 'skip-flyway-gate',
  tenant: 'skip-tenant-gate',
  spa: 'skip-spa-gate',
  sensitive: 'skip-sensitive-gate',
  dependabot: 'skip-dependabot-gate',
  scale: 'skip-scale-gate',
};

export const ALLOWED_ASYNC_EXECUTORS = new Set([
  'taskExecutor',
  'sseExecutor',
  'stockEventExecutor',
]);

export const CRITICAL_DEPENDABOT = [
  /spring-boot-starter-parent/i,
  /spring-boot-dependencies/i,
  /spring-boot/i,
  /jjwt/i,
  /stripe-java/i,
];

const SCHEMA_HINT =
  /@Column\b|@Table\b|@JoinColumn\b|@JoinTable\b|@Entity\b|@MappedSuperclass\b|@Id\b|@GeneratedValue\b|@Enumerated\b|@Lob\b|@Version\b|@OneToMany\b|@ManyToOne\b|@OneToOne\b|@ManyToMany\b|@Embedded\b|@Embeddable\b|@AttributeOverride\b|columnDefinition|nullable\s*=|unique\s*=|length\s*=|precision\s*=|scale\s*=/;

const FIND_BY_ID_CALL = /(?<![A-Za-z])(?:findById|getById|getReferenceById|getOne)\s*\(/;
const PATH_ID_HINT = /@PathVariable|@RequestParam|@RequestBody/;
const MAPPING_HINT = /@(Get|Post|Put|Patch|Delete)Mapping\b|@RequestMapping\b/;
const TENANT_MITIGATION =
  /findByIdAndEmpresaId|assertCanAccess|CompanyScope|getCurrentEmpresaId|TenantContext\.get|IDOR|tenant-safe|empresaId/;

const PGBOUNCER_FAIL = [
  { id: 'pg_advisory', re: /pg_advisory_(?:xact_)?lock\s*\(/i, title: 'pg_advisory_lock no funciona con PgBouncer en transaction mode' },
  { id: 'set_config', re: /set_config\s*\(/i, title: 'set_config/sesión se pierde entre transacciones (PgBouncer)' },
  { id: 'set_app', re: /\bSET\s+(?:LOCAL\s+)?app\./i, title: 'SET app.* se resetea al devolver la conexión al pool' },
  { id: 'listen', re: /\bLISTEN\b/i, title: 'LISTEN requiere sesión persistente; PgBouncer transaction mode lo rompe' },
  { id: 'notify', re: /\bNOTIFY\b/i, title: 'NOTIFY requiere sesión persistente; PgBouncer transaction mode lo rompe' },
];

const SENSITIVE_FAMILIES = [
  { id: 'payment', source: /(^|\/)Payment[^/]*\.java$/i, test: /Payment.*Test.*\.java$/i },
  { id: 'auth', source: /(^|\/)Auth[^/]*\.java$/i, test: /Auth.*Test.*\.java$/i },
  { id: 'pos', source: /(^|\/)Pos[^/]*\.java$/i, test: /Pos.*Test.*\.java$/i },
  { id: 'sinpe', source: /(^|\/)Sinpe[^/]*\.java$/i, test: /Sinpe.*Test.*\.java$/i },
  { id: 'wallet', source: /(^|\/)Wallet[^/]*\.java$/i, test: /Wallet.*Test.*\.java$/i },
];

export function parseLabels(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map((item) => String(item).trim()).filter(Boolean);
  return String(raw)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function hasLabel(labels, name) {
  const needle = String(name).toLowerCase();
  return parseLabels(labels).some((label) => label.toLowerCase() === needle);
}

export function isEntityPath(filePath) {
  const normalized = filePath.replaceAll('\\', '/');
  if (!normalized.endsWith('.java')) return false;
  return /\/model\/|\/entity\//.test(normalized);
}

export function isMigrationPath(filePath) {
  const normalized = filePath.replaceAll('\\', '/');
  return /\/db\/migration\/V[^/]+__.+\.sql$/i.test(normalized);
}

export function isActualizadoPath(filePath) {
  return filePath.replaceAll('\\', '/').endsWith('/Actualizado.sql')
    || filePath.replaceAll('\\', '/') === 'Actualizado.sql';
}

export function isFrontendSrcPath(filePath) {
  return filePath.replaceAll('\\', '/').includes('Hot_click_outlet/frontend/src/');
}

export function isStaticPath(filePath) {
  return filePath.replaceAll('\\', '/').includes('Hot_click_outlet/src/main/resources/static/');
}

export function isTenantScanPath(filePath) {
  const normalized = filePath.replaceAll('\\', '/');
  if (!normalized.endsWith('.java')) return false;
  if (normalized.includes('/src/test/')) return false;
  return /\/controller\/|\/service\/|\/repository\//.test(normalized);
}

export function isMainJavaPath(filePath) {
  const normalized = filePath.replaceAll('\\', '/');
  return normalized.includes('/src/main/java/') && normalized.endsWith('.java');
}

export function looksLikeSchemaChange(lines) {
  return lines.some((line) => SCHEMA_HINT.test(stripDiffPrefix(line)));
}

export function stripDiffPrefix(line) {
  return line.replace(/^[-+]\s?/, '');
}

/**
 * Parse a unified diff into files/hunks with new-file line numbers.
 * @param {string} text
 */
export function parseUnifiedDiff(text) {
  const files = [];
  if (!text) return files;

  let current = null;
  let oldLine = 0;
  let newLine = 0;

  for (const raw of text.split('\n')) {
    if (raw.startsWith('diff --git ')) {
      current = null;
      continue;
    }
    const rename = raw.match(/^rename to (.+)$/);
    if (rename && current) {
      current.path = rename[1];
      continue;
    }
    const plusFile = raw.match(/^\+\+\+ (?:b\/)?(.+)$/);
    if (plusFile) {
      const path = plusFile[1];
      if (path === '/dev/null') {
        current = null;
        continue;
      }
      current = { path, hunks: [] };
      files.push(current);
      continue;
    }
    const hunk = raw.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunk && current) {
      oldLine = Number(hunk[1]);
      newLine = Number(hunk[2]);
      current.hunks.push({ oldStart: oldLine, newStart: newLine, lines: [] });
      continue;
    }
    if (!current || current.hunks.length === 0) continue;
    const hunkLines = current.hunks[current.hunks.length - 1].lines;
    if (raw.startsWith('+')) {
      hunkLines.push({ type: 'add', text: raw.slice(1), newLine });
      newLine += 1;
    } else if (raw.startsWith('-')) {
      hunkLines.push({ type: 'del', text: raw.slice(1), oldLine });
      oldLine += 1;
    } else if (raw.startsWith('\\')) {
      continue;
    } else {
      const textLine = raw.startsWith(' ') ? raw.slice(1) : raw;
      hunkLines.push({ type: 'ctx', text: textLine, oldLine, newLine });
      oldLine += 1;
      newLine += 1;
    }
  }
  return files;
}

export function addedAndRemovedTexts(diffFile) {
  const texts = [];
  for (const hunk of diffFile.hunks) {
    for (const line of hunk.lines) {
      if (line.type === 'add' || line.type === 'del') texts.push(line.text);
    }
  }
  return texts;
}

export function evaluateFlyway({ changedFiles, diffFiles, actualizadoExists, skip }) {
  if (skip) {
    return { ok: true, skipped: true, reason: `Label ${SKIP_LABELS.flyway} presente` };
  }

  const entityFiles = changedFiles.filter(isEntityPath);
  const migrationFiles = changedFiles.filter(isMigrationPath);
  const actualizadoChanged = changedFiles.some(isActualizadoPath);

  const schemaEntityFiles = [];
  for (const file of entityFiles) {
    const parsed = (diffFiles || []).find((item) => item.path === file);
    const texts = parsed ? addedAndRemovedTexts(parsed) : ['@Entity'];
    if (looksLikeSchemaChange(texts) || !parsed) {
      schemaEntityFiles.push(file);
    }
  }

  const reminders = [];
  if (migrationFiles.length > 0 && actualizadoExists && !actualizadoChanged) {
    reminders.push(
      'Hay cambios Flyway (`V*__.sql`) pero no se actualizó `Hot_click_outlet/Actualizado.sql`. Sincronizalo si ese archivo sigue siendo el schema de referencia.',
    );
  }

  if (schemaEntityFiles.length === 0) {
    return {
      ok: true,
      skipped: false,
      schemaEntityFiles,
      migrationFiles,
      reminders,
      reason: entityFiles.length
        ? 'Cambios en model/ sin hints de esquema (@Column/@Table/…); no se exige migración.'
        : 'Sin cambios de entidades JPA.',
    };
  }

  if (migrationFiles.length === 0) {
    return {
      ok: false,
      skipped: false,
      schemaEntityFiles,
      migrationFiles,
      reminders,
      reason: 'Entidades JPA con cambio de esquema y ningún `V*__.sql` nuevo/actualizado en db/migration.',
    };
  }

  return {
    ok: true,
    skipped: false,
    schemaEntityFiles,
    migrationFiles,
    reminders,
    reason: 'Entidades tocadas y hay migración Flyway en el mismo PR. No se aplica SQL a prod desde este gate.',
  };
}

function hunkLooksLikeComment(text) {
  const trimmed = text.trim();
  return trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*');
}

function collectHunkText(hunk) {
  return hunk.lines.map((line) => line.text).join('\n');
}

function layerOf(filePath) {
  const normalized = filePath.replaceAll('\\', '/');
  if (normalized.includes('/controller/')) return 'controller';
  if (normalized.includes('/service/')) return 'service';
  if (normalized.includes('/repository/')) return 'repository';
  return 'other';
}

export function scanTenantDiff(diffFiles) {
  const findings = [];

  for (const file of diffFiles) {
    if (!isTenantScanPath(file.path)) continue;
    const layer = layerOf(file.path);

    for (const hunk of file.hunks) {
      const hunkText = collectHunkText(hunk);
      const hasMitigation = TENANT_MITIGATION.test(hunkText);
      const hasPathId = PATH_ID_HINT.test(hunkText);
      const hasMapping = MAPPING_HINT.test(hunkText);

      for (const line of hunk.lines) {
        if (line.type !== 'add') continue;
        if (hunkLooksLikeComment(line.text)) continue;

        if (layer !== 'repository' && FIND_BY_ID_CALL.test(line.text)) {
          const clearlyUnsafe = layer === 'controller' && (hasPathId || hasMapping) && !hasMitigation;
          findings.push({
            severity: clearlyUnsafe ? 'fail' : 'warn',
            rule: 'idor-findById',
            path: file.path,
            line: line.newLine,
            snippet: line.text.trim(),
            title: clearlyUnsafe
              ? 'Nuevo endpoint parece usar findById(id) de un id de cliente sin filtro de empresa'
              : 'findById/getById sin empresaId en el hunk — riesgo IDOR si el id viene del cliente',
            hint: 'Preferí findByIdAndEmpresaId(id, empresaId) o CompanyScope.assertCanAccess. Ver DEVELOPER_GOLDEN_RULES.md y IDORCrosstenantAttackTest / F28TenantIsolationTest.',
          });
        }

        const asyncNamed = line.text.match(/@Async\s*\(\s*"([^"]+)"\s*\)/);
        if (asyncNamed && !ALLOWED_ASYNC_EXECUTORS.has(asyncNamed[1])) {
          findings.push({
            severity: 'fail',
            rule: 'async-unknown-executor',
            path: file.path,
            line: line.newLine,
            snippet: line.text.trim(),
            title: `@Async("${asyncNamed[1]}") no es un executor de AsyncConfig (sin TenantAwareTaskDecorator)`,
            hint: 'Usá taskExecutor, sseExecutor o stockEventExecutor. Un executor ad-hoc pierde TenantContext.',
          });
        } else if (/@Async\b/.test(line.text) && !asyncNamed) {
          findings.push({
            severity: 'warn',
            rule: 'async-unnamed',
            path: file.path,
            line: line.newLine,
            snippet: line.text.trim(),
            title: '@Async sin nombre cae en taskExecutor (sí tiene decorator). Evitá executors nuevos fuera de AsyncConfig.',
            hint: 'CompletableFuture / new Thread / Executors.* sí pierden TenantContext.',
          });
        }

        if (/CompletableFuture\.(?:runAsync|supplyAsync)\s*\(/.test(line.text)) {
          findings.push({
            severity: 'fail',
            rule: 'async-completable',
            path: file.path,
            line: line.newLine,
            snippet: line.text.trim(),
            title: 'CompletableFuture.runAsync/supplyAsync pierde TenantContext (ForkJoinPool.commonPool)',
            hint: 'Pasá un executor de AsyncConfig o usá @Async en un bean ya decorado.',
          });
        }

        if (/\bnew\s+Thread\s*\(/.test(line.text) || /Executors\.new/.test(line.text) || /\bnew\s+ThreadPoolExecutor\s*\(/.test(line.text)) {
          findings.push({
            severity: 'fail',
            rule: 'async-raw-thread',
            path: file.path,
            line: line.newLine,
            snippet: line.text.trim(),
            title: 'Thread/Executor ad-hoc sin TenantAwareTaskDecorator',
            hint: 'Definí el pool en AsyncConfig con setTaskDecorator(new TenantAwareTaskDecorator()).',
          });
        }

        for (const rule of PGBOUNCER_FAIL) {
          if (rule.re.test(line.text)) {
            findings.push({
              severity: 'fail',
              rule: rule.id,
              path: file.path,
              line: line.newLine,
              snippet: line.text.trim(),
              title: rule.title,
              hint: 'Usá ShedLock para locks distribuidos y TenantContext (ThreadLocal) para tenant. Ver CLAUDE.md → PgBouncer.',
            });
          }
        }
      }
    }
  }

  return findings;
}

export function evaluateTenant({ findings, skip }) {
  if (skip) {
    return { ok: true, skipped: true, failCount: 0, warnCount: 0, reason: `Label ${SKIP_LABELS.tenant} presente` };
  }
  const failCount = findings.filter((item) => item.severity === 'fail').length;
  const warnCount = findings.filter((item) => item.severity === 'warn').length;
  return {
    ok: failCount === 0,
    skipped: false,
    failCount,
    warnCount,
    reason: failCount
      ? `${failCount} hallazgo(s) de riesgo alto (IDOR / @Async / PgBouncer).`
      : warnCount
        ? `${warnCount} aviso(s); el check pasa. Revisá el comentario del PR.`
        : 'Sin patrones de tenant/PgBouncer inseguros en el diff.',
  };
}

export function evaluateSpa({ frontendSrcChanged, staticChanged, skip }) {
  if (skip) {
    return { action: 'skip', ok: true, reason: `Label ${SKIP_LABELS.spa} presente` };
  }
  if (!frontendSrcChanged) {
    return { action: 'skip', ok: true, reason: 'Sin cambios en Hot_click_outlet/frontend/src/**' };
  }
  if (staticChanged) {
    return {
      action: 'pass',
      ok: true,
      reason: 'Hay artefactos tocados en src/main/resources/static/ junto al cambio de frontend/src.',
    };
  }
  return {
    action: 'build',
    ok: true,
    reason: 'frontend/src cambió y static/ no. Hay que correr pnpm build y verificar que static/ no quede stale.',
  };
}

export function matchSensitiveFamily(filePath) {
  const normalized = filePath.replaceAll('\\', '/');
  return SENSITIVE_FAMILIES.filter((family) => family.source.test(normalized)).map((family) => family.id);
}

export function evaluateSensitive({ changedMainFiles, testFiles, skip }) {
  if (skip) {
    return { ok: true, skipped: true, missing: [], reason: `Label ${SKIP_LABELS.sensitive} presente` };
  }

  const touched = new Set();
  for (const file of changedMainFiles) {
    for (const family of matchSensitiveFamily(file)) touched.add(family);
  }

  const missing = [];
  for (const family of touched) {
    const spec = SENSITIVE_FAMILIES.find((item) => item.id === family);
    const present = testFiles.some((file) => spec.test.test(file.replaceAll('\\', '/')));
    if (!present) missing.push(family);
  }

  return {
    ok: missing.length === 0,
    skipped: false,
    families: [...touched],
    missing,
    reason: missing.length
      ? `Cambios en ${missing.join(', ')} sin tests con nombre *${missing.map(capitalize).join('* / *')}*Test*.java`
      : touched.size
        ? `Familias sensibles tocadas (${[...touched].join(', ')}) con tests nominales presentes.`
        : 'Sin paths sensibles Payment/Auth/Pos/Sinpe/Wallet.',
  };
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function parseDependabotTitle(title) {
  const match = String(title || '').match(
    /bump\s+(.+?)\s+from\s+v?(\d+\.\d+\.\d+\S*)\s+to\s+v?(\d+\.\d+\.\d+\S*)/i,
  );
  if (!match) return null;
  return { name: match[1].trim(), from: match[2], to: match[3] };
}

export function classifySemver(from, to) {
  const a = parseSemver(from);
  const b = parseSemver(to);
  if (!a || !b) return 'unknown';
  if (b.major !== a.major) return 'major';
  if (b.minor !== a.minor) return 'minor';
  if (b.patch !== a.patch) return 'patch';
  return 'same';
}

function parseSemver(raw) {
  const match = String(raw).match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;
  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) };
}

export function isCriticalPackage(name) {
  return CRITICAL_DEPENDABOT.some((re) => re.test(name));
}

export function isSpringBootPackage(name) {
  return /spring-boot/i.test(name);
}

export function evaluateDependabot({ title, skip }) {
  if (skip) {
    return { ok: true, skipped: true, labels: [], reason: `Label ${SKIP_LABELS.dependabot} presente` };
  }

  const parsed = parseDependabotTitle(title);
  if (!parsed) {
    return {
      ok: true,
      skipped: false,
      labels: ['dependabot', 'needs-human'],
      bump: null,
      reason: 'No se pudo parsear semver del título; requiere revisión humana.',
      comment: 'Dependabot PR sin título semver estándar. No auto-merge.',
    };
  }

  const bump = classifySemver(parsed.from, parsed.to);
  const critical = isCriticalPackage(parsed.name);
  const spring = isSpringBootPackage(parsed.name);
  const toMajor = parseSemver(parsed.to)?.major;
  const spring4 = spring && toMajor >= 4;

  const labels = ['dependabot', `semver-${bump}`];
  let ok = true;
  let comment = `Dependabot: **${parsed.name}** \`${parsed.from}\` → \`${parsed.to}\` (${bump}).`;

  const fromMajor = parseSemver(parsed.from)?.major;
  const zeroMinorCritical = critical && bump === 'minor' && fromMajor === 0;

  if (spring4) {
    labels.push('needs-human', 'spring-boot-major');
    ok = false;
    comment +=
      '\n\n**Bloqueado:** Spring Boot 4.x no se mergea a ciegas. Revisar breaking changes, Jakarta/Spring Framework 7, tests y compatibilidad Stripe/JJWT.';
  } else if (critical && bump === 'major') {
    labels.push('needs-human');
    ok = false;
    comment +=
      '\n\n**Bloqueado:** major de paquete crítico (`spring-boot*`, `jjwt-*`, `stripe-java`). Sin auto-merge. Pedí review humano.';
  } else if (zeroMinorCritical) {
    labels.push('needs-human');
    comment +=
      '\n\n0.x minor de paquete crítico (p. ej. jjwt): en la práctica suele ser breaking. `needs-human`, sin auto-merge.';
  } else if (spring && bump === 'minor') {
    labels.push('needs-human');
    comment +=
      '\n\nSpring Boot minor puede traer cambios de comportamiento. Label `needs-human`; no es `automerge-candidate`.';
  } else if (bump === 'major') {
    labels.push('needs-human');
    comment += '\n\nMajor no crítico: `needs-human`, sin auto-merge.';
  } else if (bump === 'patch' || bump === 'minor') {
    labels.push('automerge-candidate');
    comment +=
      '\n\nPatch/minor no crítico. Podés agregar el label `safe-to-automerge` (squash) **después** de que CI pase. No se aprueba solo.';
  } else {
    labels.push('needs-human');
  }

  return {
    ok,
    skipped: false,
    labels: [...new Set(labels)],
    bump,
    name: parsed.name,
    from: parsed.from,
    to: parsed.to,
    critical,
    spring4,
    reason: ok ? `Triage ${bump} para ${parsed.name}` : `Major crítico o Spring Boot 4.x: ${parsed.name}`,
    comment,
  };
}

export function gitChangedFiles(baseSha, headSha) {
  const out = execFileSync('git', ['diff', '--name-only', `${baseSha}...${headSha}`], {
    encoding: 'utf8',
  });
  return out.split('\n').map((line) => line.trim()).filter(Boolean);
}

export function gitUnifiedDiff(baseSha, headSha, paths = []) {
  const args = ['diff', '-U20', `${baseSha}...${headSha}`];
  if (paths.length) args.push('--', ...paths);
  return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
}

export function listFiles(root, predicate) {
  const out = execFileSync('git', ['ls-files', root], { encoding: 'utf8' });
  return out
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && (!predicate || predicate(line)));
}

export function repoHasActualizado() {
  return existsSync('Hot_click_outlet/Actualizado.sql');
}

export function appendGithubOutput(pairs) {
  const file = process.env.GITHUB_OUTPUT;
  if (!file) return;
  const body = Object.entries(pairs)
    .map(([key, value]) => `${key}=${String(value ?? '').replaceAll('\n', '%0A')}`)
    .join('\n');
  appendFileSync(file, `${body}\n`);
}
