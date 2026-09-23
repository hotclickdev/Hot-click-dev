/**
 * SCALE1 — heurísticas de escalabilidad sobre un unified diff (PR)
 * y un scan semanal de hotspots (tamaño + findAll).
 */

const LIST_LIMIT = /Pageable|Page<|PageRequest|PageImpl|\.limit\s*\(|LIMIT\s+\d+|setMaxResults|slice\s*\(|MAX_\w*LINEAS|MAX_\w*IMPORT|MAX_LIST_/;
const FIND_ALL = /(?<![A-Za-z])findAll\s*\(/;
const LOOP = /\bfor\s*\(|\.forEach\s*\(|\.map\s*\(/;
const DB_CALL = /\.(findAll|findBy|findOne|getBy|save|saveAll|delete|deleteBy)\s*\(/;
/** Seeders y backfills: save en loop no es N+1 de request path. */
const SKIP_NPLUS1_PATH = /\/(?:config\/DataSeeder|service\/inventario\/InventarioPaqueteService)\.java$/;
const BLOCKING = /Thread\.sleep\s*\(|RestTemplate|\.block\s*\(|HttpURLConnection|openStream\s*\(|CompletableFuture\.[a-zA-Z]*\s*\([^)]*\)\s*\.\s*(get|join)\s*\(/;
const FAT_TX = /@Transactional\b/;
const PAGEABLE_PARAM = /Pageable|@PageableDefault/;
const HEAVY_IMPORT = /from\s+['"]xlsx['"]|from\s+['"]framer-motion['"]|from\s+['"]@clerk\/react['"]/;
const LAZY = /React\.lazy|import\s*\(|manualChunks/;

function layerOf(filePath) {
  const n = filePath.replaceAll('\\', '/');
  if (n.includes('/controller/')) return 'controller';
  if (n.includes('/service/')) return 'service';
  if (n.includes('/repository/')) return 'repository';
  if (n.includes('/frontend/src/')) return 'frontend';
  if (n.includes('/resources/static/')) return 'static';
  return 'other';
}

function isJava(path) {
  return path.replaceAll('\\', '/').endsWith('.java') && !path.includes('/src/test/');
}

function isTs(path) {
  return /\.(tsx?|jsx?)$/.test(path) && path.includes('/frontend/src/');
}

function hunkLooksLikeComment(text) {
  const t = text.trim();
  return t.startsWith('//') || t.startsWith('*') || t.startsWith('/*') || t.startsWith('#');
}

function collectHunkText(hunk) {
  return hunk.lines.map((line) => line.text).join('\n');
}

function addedCount(hunk) {
  return hunk.lines.filter((line) => line.type === 'add').length;
}

export function scanScaleDiff(diffFiles) {
  const findings = [];

  for (const file of diffFiles) {
    const layer = layerOf(file.path);
    const java = isJava(file.path);
    const ts = isTs(file.path);

    for (const hunk of file.hunks) {
      const hunkText = collectHunkText(hunk);
      const hasLimit = LIST_LIMIT.test(hunkText) || PAGEABLE_PARAM.test(hunkText);
      const hasLoop = LOOP.test(hunkText);
      const addedDb = hunk.lines.some((line) => line.type === 'add' && DB_CALL.test(line.text));

      for (const line of hunk.lines) {
        if (line.type !== 'add' || hunkLooksLikeComment(line.text)) continue;

        if (java && layer === 'controller' && FIND_ALL.test(line.text) && !hasLimit) {
          findings.push(item('fail', 'p1-findall-controller', file.path, line, line.text,
            'findAll() en controller sin Pageable/limit — lista no acotada (P1)',
            'Devolvé Page<T> + Pageable o un tope explícito. Nunca listes el tenant entero en un GET.'));
        } else if (java && layer === 'service' && FIND_ALL.test(line.text) && !hasLimit) {
          findings.push(item('warn', 'p2-findall-service', file.path, line, line.text,
            'findAll() en service sin límite visible en el hunk',
            'Filtrá por empresaId y paginá. findAll() escala mal en multi-tenant.'));
        }

        if (java && layer === 'controller' && /List\s*</.test(line.text)
          && /@(Get|Post)Mapping\b/.test(hunkText) && !hasLimit) {
          findings.push(item('fail', 'p1-list-no-page', file.path, line, line.text,
            'Endpoint de lista (List<) sin Pageable/limit en el hunk (P1)',
            'Usá Pageable o un maxResults. Ver ProductoController (catálogo ya pagina).'));
        }

        if (java && hasLoop && addedDb && DB_CALL.test(line.text)
            && !SKIP_NPLUS1_PATH.test(file.path.replaceAll('\\', '/'))) {
          findings.push(item('fail', 'p1-nplus1', file.path, line, line.text,
            'Posible N+1: llamada DB dentro de un hunk con for/forEach (P1)',
            'Batch (findByIdIn), join fetch o @EntityGraph. No queries por item.'));
        }

        if (java && layer === 'controller' && BLOCKING.test(line.text)) {
          findings.push(item('fail', 'p1-blocking-controller', file.path, line, line.text,
            'I/O bloqueante en controller (sleep / RestTemplate / .block / Future.get) (P1)',
            'Mové I/O a un service + executor de AsyncConfig. El thread del request es caro.'));
        }

        if (java && FAT_TX.test(line.text) && (layer === 'controller' || addedCount(hunk) >= 30)) {
          findings.push(item('warn', 'p2-fat-tx', file.path, line, line.text,
            '@Transactional en controller o hunk gordo — transacción larga bajo carga',
            'Transacciones cortas, sin I/O externo adentro (PgBouncer + lock time).'));
        }

        if (ts && HEAVY_IMPORT.test(line.text) && !LAZY.test(hunkText)) {
          findings.push(item('warn', 'p2-heavy-import', file.path, line, line.text,
            'Import pesado (xlsx / clerk / framer-motion) sin lazy/import() en el hunk',
            'Vite ya parte vendor-*; igual evitá import estático en páginas seller si podés code-split.'));
        }
      }

      if (layer === 'static' && /\.(js|css)$/.test(file.path) && !file.path.includes('/assets/')) {
        findings.push(item('warn', 'p2-static-no-split', file.path, hunk.lines[0], file.path,
          'Asset estático nuevo fuera de assets/ — Docker no buildea React; ojo el peso del SPA',
          'El build Vite usa manualChunks (vendor-react/motion/…). No subas bundles a mano.'));
      }
    }
  }

  return dedupe(findings);
}

function item(severity, rule, path, line, snippet, title, hint) {
  return {
    severity,
    rule,
    path,
    line: typeof line === 'object' ? line.newLine : 1,
    snippet: String(snippet || '').trim().slice(0, 200),
    title,
    hint,
  };
}

function dedupe(findings) {
  const seen = new Set();
  return findings.filter((f) => {
    const key = `${f.rule}|${f.path}|${f.line}|${f.snippet}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function evaluateScale({ findings, skip }) {
  if (skip) {
    return { ok: true, skipped: true, failCount: 0, warnCount: 0, reason: 'Label skip-scale-gate presente' };
  }
  const failCount = findings.filter((item) => item.severity === 'fail').length;
  const warnCount = findings.filter((item) => item.severity === 'warn').length;
  return {
    ok: failCount === 0,
    skipped: false,
    failCount,
    warnCount,
    reason: failCount
      ? `${failCount} hallazgo(s) P0/P1 de escala (lista no acotada, N+1 o I/O bloqueante).`
      : warnCount
        ? `${warnCount} aviso(s); el check pasa.`
        : 'Sin patrones P0/P1 de escala en el diff.',
  };
}

export function scanScaleHotspots(fileTexts) {
  const rows = [];
  for (const { path, text } of fileTexts) {
    const findAll = (text.match(/findAll\s*\(/g) || []).length;
    const lines = text.split('\n').length;
    const lists = (text.match(/List\s*</g) || []).length;
    if (findAll === 0 && lines < 250) continue;
    rows.push({
      path,
      lines,
      findAll,
      lists,
      score: findAll * 40 + Math.floor(lines / 20) + (lists > 8 ? 10 : 0),
    });
  }
  return rows.sort((a, b) => b.score - a.score).slice(0, 20);
}
