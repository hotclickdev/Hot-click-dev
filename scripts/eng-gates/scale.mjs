/**
 * SCALE1 — heurísticas de escalabilidad sobre un unified diff (PR)
 * y un scan semanal de hotspots (tamaño + findAll).
 */
import { TRIVIAL_CALL, analyzeJavaFile } from './java-loop-map.mjs';

const LIST_LIMIT = /Pageable|Page<|PageRequest|PageImpl|\.limit\s*\(|LIMIT\s+\d+|setMaxResults|slice\s*\(|MAX_\w*LINEAS|MAX_\w*IMPORT|MAX_LIST_/;
const FIND_ALL = /(?<![A-Za-z])findAll\s*\(/;
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

export function scanScaleDiff(diffFiles, options = {}) {
  const findings = [];
  const fileTexts = options.fileTexts || {};
  const parse = options.parse;

  for (const file of diffFiles) {
    const layer = layerOf(file.path);
    const java = isJava(file.path);
    const ts = isTs(file.path);
    const addedLines = [];
    for (const hunk of file.hunks) {
      for (const line of hunk.lines) {
        if (line.type === 'add') addedLines.push(line);
      }
    }
    const addedLineSet = new Set(addedLines.map((line) => line.newLine));
    const ast = java && addedLines.length
      ? javaAstFor(file.path, fileTexts[file.path], parse)
      : null;
    if (ast && ast.status !== 'ok') {
      findings.push(item('fail', 'p1-java-parser', file.path, addedLines[0] || { newLine: 1 },
        ast.error || ast.status,
        `Parser Java sobre el archivo completo no pudo mapear loops (${ast.status}) — se mantiene el bloqueo`,
        'Sin fallback de llaves/hunk ni skip. Corregí el parse o entregá el archivo y su SHA-256 exactos de HEAD.'));
    }

    if (ast && ast.status === 'ok') {
      for (const loop of ast.loops) {
        const intersects = addedLines.some((line) => (
          line.newLine >= loop.startLine && line.newLine <= loop.endLine
        ));
        if (!intersects) continue;
        if (loop.ambiguous) {
          findings.push(item('fail', 'p1-java-parser', file.path, { newLine: loop.startLine },
            (loop.source || `loop ${loop.kind}`).split('\n')[0],
            `Ambigüedad: ${loop.kind} con trabajo en líneas ${loop.startLine}-${loop.endLine} sin invocación identificable — se mantiene el bloqueo`,
            'Sin fallback permisivo. Revisión humana del lambda/referencia.'));
          continue;
        }
        if (!loop.hasPerItemWork || loop.hasBound) continue;
        // Origen: cabecera del loop agregada (loop nuevo) o loop preexistente con líneas nuevas en su cuerpo.
        const headerAdded = addedLineSet.has(loop.startLine);
        const newWork = [...new Set(loop.workCalls
          .filter((c) => addedLineSet.has(c.startLine) && !TRIVIAL_CALL.test(c.name))
          .map((c) => c.name))];
        const origin = headerAdded
          ? 'loop nuevo'
          : `loop preexistente; trabajo por ítem nuevo: ${newWork.length ? newWork.join(', ') : 'ninguna llamada nueva no trivial (cambio en el cuerpo)'}`;
        findings.push(item('fail', 'p1-unbounded-loop-work', file.path, { newLine: loop.startLine },
          (loop.source || '').split('\n')[0],
          `Iteración sin cota demostrable localmente (${loop.kind}${loop.iterationMethod ? ':' + loop.iterationMethod : ''}; ${loop.boundEvidence}; ${origin}) con trabajo por ítem (P1)`,
          'Diagnóstico, no falso positivo de ubicación: acotá la colección o el lote (Pageable/limit) o demostrá la cota en revisión. El análisis es intraprocedural.'));
      }
    }
    for (const hunk of file.hunks) {
      const hunkText = collectHunkText(hunk);
      const hasLimit = LIST_LIMIT.test(hunkText) || PAGEABLE_PARAM.test(hunkText);

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

        if (java && !SKIP_NPLUS1_PATH.test(file.path.replaceAll('\\', '/'))) {
          if (!ast || ast.status !== 'ok') {
            // p1-java-parser ya bloquea el archivo; sin heurístico de hunk (era la fuente del FP de ubicación).
          } else {
            // Llamadas DB por CST (identificador del método/receptor), no por regex del texto: ignora strings y comentarios.
            const calls = ast.dbCallsAt(line.newLine);
            const lineCtx = ast.lineContext(line.newLine);
            if (calls.length && lineCtx.ambiguous) {
              findings.push(item('fail', 'p1-java-parser', file.path, line, line.text,
                'Ambigüedad al mapear la llamada DB a ancestros loop/lambda — se mantiene el bloqueo',
                'Sin fallback de hunk ni skip.'));
            } else if (calls.length && (lineCtx.inLoop || lineCtx.inIterationLambda)) {
              const innermost = lineCtx.ancestors[lineCtx.ancestors.length - 1];
              const bounded = lineCtx.ancestors.length > 0 && lineCtx.ancestors.every((a) => a.hasBound);
              findings.push(item('fail', 'p1-nplus1', file.path, line, line.text,
                bounded
                  ? `Llamada DB por ítem (${calls.map((c) => c.name).join(', ')}) en loop con cota visible (${innermost?.boundEvidence}) — el costo DB/red por ítem es real (P1)`
                  : `Posible N+1: llamada DB (${calls.map((c) => c.name).join(', ')}) dentro de ${innermost?.kind || 'loop'} sin cota demostrable (P1)`,
                'Batch (findByIdIn), join fetch o @EntityGraph. No queries por item.'));
            }
          }
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

function javaAstFor(path, rec, parse) {
  if (!rec || rec.text == null) {
    return { ok: false, status: 'missing-source', error: 'falta el archivo completo en HEAD para el parser Java' };
  }
  return analyzeJavaFile(rec.text, { parse, expectedHash: rec.hash });
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
