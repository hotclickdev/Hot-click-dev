// Lectura del head SOLO como datos (defecto 3). Modos aceptados: 100644 y 100755 (como bytes, escritos 0444). Dos fases: (1) listar y VALIDAR todo el árbol
// (modo, componentes, codificación, tamaños, límites) sin escribir nada; (2) solo si todo es
// válido, escribir en un directorio nuevo con 'wx' (sin sobrescribir ni seguir enlaces).
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';

export const LIMITS = Object.freeze({
  // maxFileBytes = 100 MiB: límite duro de GitHub por fichero (el HEAD real tiene uno de 23.970.819 B).
  maxFiles: 200000, maxFileBytes: 100 * 1024 * 1024, maxTotalBytes: 1024 * 1024 * 1024,
  maxPathBytes: 4096, maxComponentBytes: 255, maxDepth: 64,
});
const SHA40 = /^[0-9a-f]{40}$/;
const utf8 = new TextDecoder('utf-8', { fatal: true });

export function gitData(gitDir, args, opts = {}) {
  // Sin hooks/drivers externos: -c core.hooksPath=/dev/null, sin textconv/ext-diff en los diffs.
  return execFileSync('git', ['-c', 'core.hooksPath=/dev/null', '-c', 'core.fsmonitor=false', '-C', gitDir, ...args],
    { maxBuffer: 1 << 30, env: { PATH: '/usr/bin:/bin', GIT_CONFIG_NOSYSTEM: '1', HOME: '/nonexistent', GIT_TERMINAL_PROMPT: '0' }, ...opts });
}

export function validatePath(raw) {
  // raw: Buffer con la ruta tal como la guarda git.
  if (!Buffer.isBuffer(raw) || raw.length === 0) throw new Error('ruta vacía');
  if (raw.length > LIMITS.maxPathBytes) throw new Error('ruta demasiado larga');
  let s; try { s = utf8.decode(raw); } catch { throw new Error('ruta no UTF-8'); }
  if (/[\u0000-\u001f\u007f\\]/.test(s)) throw new Error(`ruta con control/backslash: ${JSON.stringify(s)}`);
  if (s.startsWith('/')) throw new Error(`ruta absoluta: ${s}`);
  const comps = s.split('/');
  if (comps.length > LIMITS.maxDepth) throw new Error('ruta demasiado profunda');
  for (const c of comps) {
    if (c === '' || c === '.' || c === '..') throw new Error(`componente inválido en ${JSON.stringify(s)}`);
    if (c.toLowerCase() === '.git') throw new Error(`componente .git en ${s}`);
    if (Buffer.byteLength(c) > LIMITS.maxComponentBytes) throw new Error('componente demasiado largo');
  }
  return s;
}

// ls-tree -r -z -l: "<mode> <type> <sha> <size>\t<path>\0"
export function readTree(gitDir, sha, limits = LIMITS) {
  if (!SHA40.test(sha)) throw new Error('head no es SHA-1 completo');
  const out = gitData(gitDir, ['ls-tree', '-r', '-z', '-l', '--full-tree', sha]);
  const entries = []; let total = 0; const seen = new Set();
  let i = 0;
  while (i < out.length) {
    const nul = out.indexOf(0, i); if (nul < 0) throw new Error('ls-tree truncado');
    const rec = out.subarray(i, nul); i = nul + 1;
    const tab = rec.indexOf(9); if (tab < 0) throw new Error('ls-tree sin tab');
    const meta = rec.subarray(0, tab).toString('ascii').trim().split(/\s+/);
    const [mode, type, blob, sizeStr] = meta;
    const path = validatePath(rec.subarray(tab + 1));
    if (type === 'commit' || mode === '160000') throw new Error(`submódulo no permitido: ${path}`);
    if (mode === '120000') throw new Error(`symlink no permitido: ${path}`);
    // 100755 se acepta SOLO como datos: se escribe 0444 (sin bit de ejecución) y nunca se ejecuta.
    if ((mode !== '100644' && mode !== '100755') || type !== 'blob' || !SHA40.test(blob)) throw new Error(`modo/tipo no permitido ${mode} ${type}: ${path}`);
    const size = Number(sizeStr);
    if (!Number.isSafeInteger(size) || size < 0) throw new Error(`tamaño inválido: ${path}`);
    if (size > limits.maxFileBytes) throw new Error(`fichero excede límite (${size} B): ${path}`);
    total += size; if (total > limits.maxTotalBytes) throw new Error('árbol excede límite total');
    if (seen.has(path)) throw new Error(`ruta duplicada: ${path}`); seen.add(path);
    entries.push({ path, blob, mode, size });
    if (entries.length > limits.maxFiles) throw new Error('demasiados ficheros');
  }
  // Prefijo fichero/directorio en conflicto (p.ej. "a" fichero y "a/b"):
  for (const p of seen) { const parts = p.split('/'); for (let k = 1; k < parts.length; k++) if (seen.has(parts.slice(0, k).join('/'))) throw new Error(`conflicto fichero/directorio: ${p}`); }
  return entries;
}

export function exportTreeAsData(gitDir, sha, tree, limits = LIMITS) {
  // Fase 1 ya hecha por readTree; se revalida aquí por si el árbol llega de otra fuente.
  for (const t of tree) {
    validatePath(Buffer.from(t.path, 'utf8'));
    if ((t.mode !== '100644' && t.mode !== '100755') || !SHA40.test(t.blob) || !(t.size <= limits.maxFileBytes)) throw new Error(`entrada no validada: ${t.path}`);
  }
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'headdata-')));
  for (const t of tree) {
    const dest = resolve(root, ...t.path.split('/'));
    if (!dest.startsWith(root + sep)) throw new Error(`fuera del destino: ${t.path}`);
    mkdirSync(resolve(dest, '..'), { recursive: true });
    const data = gitData(gitDir, ['cat-file', 'blob', t.blob]);
    if (data.length !== t.size) throw new Error(`tamaño cambió: ${t.path}`);
    writeFileSync(dest, data, { flag: 'wx', mode: 0o444 }); // siempre sin ejecución, también para 100755
  }
  return root;
}
