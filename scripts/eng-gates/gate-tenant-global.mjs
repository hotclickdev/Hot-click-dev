#!/usr/bin/env node
/**
 * Gate «empresa nula = ver todo» (IDOR-vendedor). Escanea el árbol de controller/ y service/ y falla ante
 * cualquier ternario sobre una empresa nula (`empresaId != null ? … : …`, `eid == null ? …`) o
 * `if (empresaId == null) return true;` que no lleve un comentario de lista blanca con justificación:
 *
 *     // tenant-global-ok: <por qué la rama nula no expone datos de otros negocios>
 *
 * en la misma línea o en las 3 anteriores. La vista global se resuelve con
 * CompanyScope.requireEmpresaIdOrAdmin() (null solo para ADMIN explícito).
 *
 * Uso: node scripts/eng-gates/gate-tenant-global.mjs [raíz-java]
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const VAR = String.raw`\b\w*(?:[eE]mpresa\w*Id|eid\d?)\b`;
export const PATRONES = [
  new RegExp(String.raw`${VAR}\s*(?:!=|==)\s*null\s*\?`),
  new RegExp(String.raw`${VAR}\s*(?:!=|==)\s*null\s*$`), // ternario partido: el «?» va en la línea siguiente
  new RegExp(String.raw`if\s*\(\s*${VAR}\s*==\s*null\s*\)\s*return\s+true\b`),
];
const MARCA = /tenant-global-ok:[ \t]*(\S[^\n]{9,})/;

function esTernarioPartido(lineas, i) {
  return /^\s*\?/.test(lineas[i + 1] ?? '');
}

/** Devuelve hallazgos {line, snippet} de un archivo Java. */
export function escanearFuente(texto) {
  const lineas = texto.split('\n');
  const hallazgos = [];
  for (let i = 0; i < lineas.length; i++) {
    const l = lineas[i];
    if (/^\s*(\/\/|\*|\/\*)/.test(l)) continue;
    const [ternario, partido, returnTrue] = PATRONES;
    const coincide = ternario.test(l) || returnTrue.test(l) || (partido.test(l) && esTernarioPartido(lineas, i));
    if (!coincide) continue;
    const ventana = lineas.slice(Math.max(0, i - 3), i + 1).join('\n');
    if (MARCA.test(ventana)) continue;
    hallazgos.push({ line: i + 1, snippet: l.trim() });
  }
  return hallazgos;
}

function* javaFiles(dir) {
  for (const nombre of readdirSync(dir)) {
    const p = join(dir, nombre);
    if (statSync(p).isDirectory()) yield* javaFiles(p);
    else if (nombre.endsWith('.java')) yield p;
  }
}

export function escanearArbol(raiz) {
  const res = [];
  for (const capa of ['controller', 'service']) {
    let base;
    try { base = join(raiz, capa); statSync(base); } catch { continue; }
    for (const f of javaFiles(base)) {
      for (const h of escanearFuente(readFileSync(f, 'utf8'))) res.push({ path: relative(process.cwd(), f), ...h });
    }
  }
  return res;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const raiz = process.argv[2] ?? 'Hot_click_outlet/src/main/java/com/hotclick';
  const hallazgos = escanearArbol(raiz);
  if (hallazgos.length === 0) {
    console.log('Tenant global: PASS — ninguna rama «empresa nula» sin justificar.');
    process.exit(0);
  }
  console.log(`Tenant global: FAIL — ${hallazgos.length} rama(s) «empresa nula» sin «// tenant-global-ok: <motivo>»`);
  for (const h of hallazgos) console.log(`  ${h.path}:${h.line}  ${h.snippet}`);
  console.log('Usá CompanyScope.requireEmpresaIdOrAdmin() (null solo ADMIN) o justificá la rama con el comentario.');
  process.exit(1);
}
