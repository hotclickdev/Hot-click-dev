/**
 * SCALE1 — mapa de ancestros loop/lambda sobre un archivo Java COMPLETO, con
 * java-parser (prettier-java / JHipster, Chevrotain). No hay parser casero ni
 * fallback de llaves: parse error, parser ausente, hash distinto, CST sin
 * ubicaciones o ambigüedad se reportan como bloqueo (fail-closed).
 *
 * Cotas: se deciden por TOKENS del CST (comentarios fuera del CST; literales
 * String/TextBlock/char excluidos) y por contexto estructural (cabecera del
 * loop, cadena del stream, declaración local del iterable). Nunca por regex
 * sobre el texto del loop. Lo que no se puede demostrar localmente queda como
 * "cota no demostrable" (bloquea), sin afirmar que la colección es ilimitada.
 *
 * Límites reales (no se fingen): análisis intraprocedural; no sigue llamadas a
 * otros métodos ni reasignaciones; una cota en otro método (p. ej. el llamador
 * pasa una lista paginada) no se ve y el loop sigue bloqueando.
 */
import { createHash } from 'node:crypto';

const LOOP_NODES = new Set([
  'enhancedForStatement',
  'basicForStatement',
  'whileStatement',
  'doStatement',
]);

/** Invocaciones cuyo lambda / method reference se ejecuta por elemento. */
const ITERATION_METHODS = new Set([
  // Iterable / Map / Iterator / Collection
  'forEach', 'forEachOrdered', 'forEachRemaining', 'removeIf', 'replaceAll',
  // Stream
  'map', 'flatMap', 'mapMulti', 'peek', 'filter', 'anyMatch', 'allMatch', 'noneMatch',
  'reduce', 'collect', 'sorted', 'min', 'max', 'takeWhile', 'dropWhile', 'iterate', 'generate',
  'mapToInt', 'mapToLong', 'mapToDouble', 'mapToObj',
  'flatMapToInt', 'flatMapToLong', 'flatMapToDouble',
  // Collectors (las funciones se aplican por elemento del stream envolvente)
  'toMap', 'toUnmodifiableMap', 'toConcurrentMap', 'groupingBy', 'groupingByConcurrent',
  'partitioningBy', 'mapping', 'flatMapping', 'filtering', 'reducing', 'teeing',
  'summingInt', 'summingLong', 'summingDouble', 'averagingInt', 'averagingLong', 'averagingDouble',
  'summarizingInt', 'summarizingLong', 'summarizingDouble',
]);

/** Métodos Collectors: su cota es la del stream que los envuelve (collect(...)). */
const COLLECTOR_METHODS = new Set([
  'toMap', 'toUnmodifiableMap', 'toConcurrentMap', 'groupingBy', 'groupingByConcurrent',
  'partitioningBy', 'mapping', 'flatMapping', 'filtering', 'reducing', 'teeing',
  'summingInt', 'summingLong', 'summingDouble', 'averagingInt', 'averagingLong', 'averagingDouble',
  'summarizingInt', 'summarizingLong', 'summarizingDouble',
]);

const TRIVIAL_CALL = /^(get[A-Z].*|is[A-Z].*|has[A-Z].*|toString|equals|hashCode|name|ordinal|length|size|iterator|hasNext|next|compareTo|toList|toArray|stream|boxed|intValue|longValue|booleanValue)$/;

/** Llamadas a BD por nombre (Spring Data) — evaluado sobre el identificador del CST, no sobre texto. */
const DB_METHOD = /^(findAll\w*|findBy\w*|findOne\w*|findFirst\w*|findTop\w*|getBy\w*|readBy\w*|queryBy\w*|streamBy\w*|save|saveAll|saveAndFlush|delete\w*|existsBy\w*|countBy\w*|flush)$/;
/** Receptor con aspecto de repositorio: cualquier método invocado sobre él es BD. */
const DB_RECEIVER = /(?:Repository|Repo|repository|repo|Dao|dao|entityManager|EntityManager|jdbcTemplate|JdbcTemplate)$/;

/** Identificadores (tokens de código) que evidencian una cota estructural. */
const BOUND_IDENTIFIERS = new Set(['Pageable', 'PageRequest', 'Page', 'Slice', 'setMaxResults']);
const BOUND_CALLS = new Set(['limit', 'subList']);
const BOUND_CONSTANT = /^MAX_[A-Z0-9_]+$/;
const BOUND_FINDER = /^find(?:Top|First)\d+/;

const NON_CODE_TOKENS = new Set(['StringLiteral', 'TextBlock', 'CharLiteral']);
const INT_LITERAL_TOKENS = new Set(['DecimalLiteral', 'HexLiteral', 'OctalLiteral', 'BinaryLiteral']);
const RELATIONAL = new Set(['Less', 'LessEquals', 'Greater', 'GreaterEquals']);
const CONDITION_END = new Set(['AndAnd', 'OrOr', 'RBrace', 'Semicolon']);

const MAX_RESOLVE_DEPTH = 3;

export function sha256Text(text) {
  return createHash('sha256').update(String(text), 'utf8').digest('hex');
}

let cachedParse;

export async function resolveParse(override) {
  if (typeof override === 'function') return { ok: true, parse: override };
  if (cachedParse) return { ok: true, parse: cachedParse };
  try {
    const mod = await import('java-parser');
    if (typeof mod.parse !== 'function') {
      return { ok: false, status: 'parser-missing', error: 'java-parser no exporta parse()' };
    }
    cachedParse = mod.parse;
    return { ok: true, parse: cachedParse };
  } catch (err) {
    return { ok: false, status: 'parser-missing', error: String(err.message || err) };
  }
}

/**
 * Analiza un archivo completo. Exige un parse ya resuelto (CI lo resuelve antes).
 * Sin parse / hash distinto / error de parse → ok:false (el llamador bloquea).
 */
export function analyzeJavaFile(source, { parse, expectedHash } = {}) {
  const text = String(source ?? '');
  const hash = sha256Text(text);
  if (!expectedHash || !/^[a-f0-9]{64}$/.test(String(expectedHash))) {
    return { ok: false, hash, status: 'hash-missing', error: 'falta el SHA-256 exacto del archivo analizado' };
  }
  if (expectedHash !== hash) {
    return { ok: false, hash, status: 'hash-mismatch', error: 'el SHA-256 del archivo no coincide con el hash exacto solicitado' };
  }
  if (typeof parse !== 'function') {
    return { ok: false, hash, status: 'parser-missing', error: 'parser Java establecido no disponible' };
  }
  let cst;
  try {
    cst = parse(text);
  } catch (err) {
    return { ok: false, hash, status: 'parse-error', error: String(err.message || err).split('\n')[0] };
  }
  if (!cst || typeof cst !== 'object' || !cst.name) {
    return { ok: false, hash, status: 'ambiguous', error: 'CST vacío o sin forma esperada' };
  }
  attachParents(cst);
  if (!hasAnyLocation(cst)) {
    return { ok: false, hash, status: 'ambiguous', error: 'CST sin location; no se pueden mapear líneas' };
  }

  const lines = text.split(/\n/);
  const ambiguous = { reasons: [] };
  const loops = [];
  collectLoops(cst, text, lines, loops, ambiguous);
  collectIterationLambdas(cst, text, lines, loops, ambiguous);
  const dbCalls = collectDbCalls(cst);

  const byLine = new Map();
  for (const loop of loops) {
    for (let ln = loop.startLine; ln <= loop.endLine; ln += 1) {
      const rec = byLine.get(ln) || { inLoop: false, inIterationLambda: false, ambiguous: false, ancestors: [] };
      rec.ancestors.push(loop);
      if (loop.ambiguous) rec.ambiguous = true;
      else if (loop.kind === 'lambda' || loop.kind === 'method-reference') rec.inIterationLambda = true;
      else rec.inLoop = true;
      byLine.set(ln, rec);
    }
  }
  const dbByLine = new Map();
  for (const call of dbCalls) {
    const list = dbByLine.get(call.line) || [];
    list.push(call);
    dbByLine.set(call.line, list);
  }

  return {
    ok: true,
    hash,
    status: 'ok',
    ambiguities: ambiguous.reasons,
    loops,
    dbCalls,
    dbCallsAt(line) {
      return dbByLine.get(line) || [];
    },
    lineContext(line) {
      return byLine.get(line) || { inLoop: false, inIterationLambda: false, ambiguous: false, ancestors: [] };
    },
  };
}

// ---------------------------------------------------------------- CST utils

function attachParents(node, parent = null) {
  if (!node || typeof node !== 'object') return;
  Object.defineProperty(node, '_parent', { value: parent, enumerable: false, configurable: true });
  if (node.children) {
    for (const value of Object.values(node.children)) {
      for (const child of [].concat(value)) attachParents(child, node);
    }
  }
}

function hasAnyLocation(node) {
  let found = false;
  walk(node, (n) => {
    if (n.location && n.location.startLine != null && n.location.endLine != null) found = true;
  });
  return found;
}

function walk(node, visit) {
  if (!node || typeof node !== 'object' || node.tokenType) return;
  if (node.name) visit(node);
  if (node.children) {
    for (const value of Object.values(node.children)) {
      for (const child of [].concat(value)) walk(child, visit);
    }
  }
}

function childrenOf(node, key) {
  return [].concat(node?.children?.[key] || []).filter(Boolean);
}

/** Tokens del nodo en orden de fuente. Comentarios no forman parte del CST. */
export function tokensOf(node) {
  const out = [];
  (function rec(n) {
    if (!n || typeof n !== 'object') return;
    if (n.tokenType) { out.push(n); return; }
    if (n.children) {
      for (const value of Object.values(n.children)) for (const c of [].concat(value)) rec(c);
    }
  }(node));
  return out.sort((a, b) => a.startOffset - b.startOffset);
}

function codeTokens(node) {
  return tokensOf(node).filter((t) => !NON_CODE_TOKENS.has(t.tokenType.name));
}

function locOf(node) {
  const l = node?.location;
  if (!l || l.startLine == null || l.endLine == null) return null;
  return { startLine: l.startLine, endLine: l.endLine, startColumn: l.startColumn, endColumn: l.endColumn, startOffset: l.startOffset };
}

function sliceSource(text, lines, loc) {
  if (!loc) return '';
  const start = loc.startLine - 1;
  const end = loc.endLine - 1;
  if (start < 0 || end >= lines.length) return '';
  if (start === end) return lines[start].slice((loc.startColumn || 1) - 1, loc.endColumn || lines[start].length);
  const parts = [lines[start].slice((loc.startColumn || 1) - 1)];
  for (let i = start + 1; i < end; i += 1) parts.push(lines[i]);
  parts.push(lines[end].slice(0, loc.endColumn || lines[end].length));
  return parts.join('\n');
}

function findAncestor(node, pred) {
  let cur = node?._parent;
  while (cur) {
    if (pred(cur)) return cur;
    cur = cur._parent;
  }
  return null;
}

// ------------------------------------------------------------- bounds (tokens)

/** ¿La secuencia de tokens de código contiene evidencia de cota? (sin strings ni comentarios) */
export function tokensShowBound(tokens) {
  for (let i = 0; i < tokens.length; i += 1) {
    const t = tokens[i];
    if (t.tokenType.name !== 'Identifier') continue;
    if (BOUND_IDENTIFIERS.has(t.image) || BOUND_CONSTANT.test(t.image) || BOUND_FINDER.test(t.image)) return true;
    if (BOUND_CALLS.has(t.image) && tokens[i - 1]?.tokenType.name === 'Dot' && tokens[i + 1]?.tokenType.name === 'LBrace'
        && tokens[i + 2] && tokens[i + 2].tokenType.name !== 'RBrace') return true;
  }
  return false;
}

/** Condición con una comparación directa contra un literal entero o constante MAX_*. */
export function conditionHasLiteralBound(tokens) {
  const isLimit = (t) => t && (INT_LITERAL_TOKENS.has(t.tokenType.name)
    || (t.tokenType.name === 'Identifier' && BOUND_CONSTANT.test(t.image)));
  const isEnd = (t) => !t || CONDITION_END.has(t.tokenType.name);
  for (let i = 0; i < tokens.length; i += 1) {
    const t = tokens[i];
    if (!RELATIONAL.has(t.tokenType.name)) continue;
    const name = t.tokenType.name;
    // i < 10 / i <= MAX_X  (operando derecho literal y fin de comparación)
    if ((name === 'Less' || name === 'LessEquals') && tokens[i - 1]?.tokenType.name === 'Identifier'
        && isLimit(tokens[i + 1]) && isEnd(tokens[i + 2])) return true;
    // 10 > i
    if ((name === 'Greater' || name === 'GreaterEquals') && isLimit(tokens[i - 1])
        && tokens[i + 1]?.tokenType.name === 'Identifier' && isEnd(tokens[i + 2])) return true;
  }
  return false;
}

function enclosingScope(node) {
  return findAncestor(node, (n) => (
    n.name === 'methodDeclaration' || n.name === 'constructorDeclaration' || n.name === 'lambdaExpression'
    || n.name === 'staticInitializer' || n.name === 'instanceInitializer'
  ));
}

function declaratorName(declarator) {
  const id = childrenOf(declarator, 'variableDeclaratorId')[0];
  const tok = childrenOf(id, 'Identifier')[0];
  return tok?.image || null;
}

/**
 * Evidencia de cota para un identificador local: su inicializador (o los
 * locales de los que depende, hasta MAX_RESOLVE_DEPTH) o el tipo del parámetro.
 */
function identifierHasBound(name, fromNode, beforeOffset, depth = 0, seen = new Set()) {
  if (depth > MAX_RESOLVE_DEPTH || seen.has(name)) return { bound: false, why: 'profundidad' };
  seen.add(name);
  let scope = enclosingScope(fromNode);
  while (scope) {
    // locales declarados antes del uso dentro del alcance
    let decl = null;
    walk(scope, (n) => {
      if (n.name !== 'variableDeclarator') return;
      const loc = locOf(n);
      if (!loc || loc.startOffset == null || loc.startOffset >= beforeOffset) return;
      if (declaratorName(n) === name) decl = n;
    });
    if (decl) {
      const init = childrenOf(decl, 'variableInitializer')[0];
      if (!init) return { bound: false, why: 'sin inicializador' };
      const toks = codeTokens(init);
      if (tokensShowBound(toks)) return { bound: true, why: `inicializador de ${name}` };
      for (const t of toks) {
        if (t.tokenType.name === 'Identifier' && t.image !== name && /^[a-z]/.test(t.image)) {
          const next = toks[toks.indexOf(t) + 1];
          if (next && (next.tokenType.name === 'LBrace' || next.tokenType.name === 'Dot')) continue;
          const sub = identifierHasBound(t.image, decl, beforeOffset, depth + 1, seen);
          if (sub.bound) return sub;
        }
      }
      return { bound: false, why: `inicializador de ${name} sin cota visible` };
    }
    // parámetros formales del método/lambda
    let param = null;
    walk(scope, (n) => {
      if (n.name !== 'variableParaRegularParameter' && n.name !== 'lambdaParameterList' && n.name !== 'formalParameter') return;
      const ids = codeTokens(n).filter((t) => t.tokenType.name === 'Identifier');
      if (ids.length && ids[ids.length - 1].image === name) param = n;
    });
    if (param) {
      return tokensShowBound(codeTokens(param))
        ? { bound: true, why: `tipo del parámetro ${name}` }
        : { bound: false, why: `parámetro ${name}: cota no demostrable intraprocedural` };
    }
    scope = enclosingScope(scope);
  }
  return { bound: false, why: `${name} no resuelto localmente` };
}

function expressionHasBound(exprNode, contextNode) {
  const toks = codeTokens(exprNode);
  if (tokensShowBound(toks)) return { bound: true, why: 'expresión' };
  // iterable = identificador simple (o this.x): resolver su declaración local
  const ids = toks.filter((t) => t.tokenType.name === 'Identifier');
  if (ids.length === 1 && toks.length <= 3) {
    const off = locOf(contextNode)?.startOffset ?? Infinity;
    return identifierHasBound(ids[0].image, contextNode, off);
  }
  return { bound: false, why: 'expresión sin cota visible' };
}

function loopBound(node) {
  if (node.name === 'enhancedForStatement') {
    const expr = childrenOf(node, 'expression')[0];
    return expr ? expressionHasBound(expr, node) : { bound: false, why: 'sin iterable' };
  }
  const cond = childrenOf(node, 'expression')[0];
  if (!cond) return { bound: false, why: 'sin condición' };
  const toks = codeTokens(cond);
  if (conditionHasLiteralBound(toks)) return { bound: true, why: 'condición contra literal/constante' };
  return { bound: false, why: 'condición sin cota literal' };
}

// ------------------------------------------------------------------- loops

function collectLoops(cst, text, lines, loops, ambiguous) {
  walk(cst, (node) => {
    if (!LOOP_NODES.has(node.name)) return;
    const loc = locOf(node);
    if (!loc) { ambiguous.reasons.push(`${node.name} sin location`); return; }
    const body = childrenOf(node, 'statement')[0] || node;
    const workCalls = methodCallsIn(body);
    const bound = loopBound(node);
    loops.push({
      kind: node.name,
      startLine: loc.startLine,
      endLine: loc.endLine,
      source: sliceSource(text, lines, loc),
      hasBound: bound.bound,
      boundEvidence: bound.why,
      workCalls,
      hasPerItemWork: workCalls.some((c) => !TRIVIAL_CALL.test(c.name)),
    });
  });
}

function collectIterationLambdas(cst, text, lines, loops, ambiguous) {
  walk(cst, (node) => {
    const isRef = node.name === 'methodReferenceSuffix';
    if (node.name !== 'lambdaExpression' && !isRef) return;
    const loc = locOf(node);
    if (!loc) { ambiguous.reasons.push(`${node.name} sin location`); return; }
    const kind = isRef ? 'method-reference' : 'lambda';
    const workCalls = isRef ? methodRefCalls(node) : methodCallsIn(childrenOf(node, 'lambdaBody')[0] || node);
    const hasPerItemWork = workCalls.some((c) => !TRIVIAL_CALL.test(c.name));
    const invocation = enclosingInvocation(node);
    if (!invocation) {
      // Lambda fuera de una invocación (asignada, retornada, new X(...)): no se sabe si itera.
      if (!hasPerItemWork) return;
      loops.push({
        kind, startLine: loc.startLine, endLine: loc.endLine, source: sliceSource(text, lines, loc),
        hasBound: false, boundEvidence: 'invocación no identificable', workCalls, hasPerItemWork,
        iterationMethod: null, ambiguous: true,
      });
      ambiguous.reasons.push(`${kind}@${loc.startLine}: no se pudo nombrar la invocación que lo recibe`);
      return;
    }
    if (!ITERATION_METHODS.has(invocation.name)) return;
    const bound = chainBound(invocation);
    loops.push({
      kind, startLine: loc.startLine, endLine: loc.endLine, source: sliceSource(text, lines, loc),
      hasBound: bound.bound, boundEvidence: bound.why, workCalls, hasPerItemWork,
      iterationMethod: invocation.name,
    });
  });
}

/** Invocación (methodInvocationSuffix) que recibe el lambda/ref como argumento. */
function enclosingInvocation(node) {
  // El lambda debe ser argumento directo: el primer argumentList ancestro y su sufijo.
  const argList = findAncestor(node, (n) => n.name === 'argumentList' || n.name === 'lambdaBody' || n.name === 'block');
  let suffix;
  if (node.name === 'methodReferenceSuffix') {
    suffix = argList?.name === 'argumentList' ? argList._parent : null;
  } else {
    suffix = argList?.name === 'argumentList' ? argList._parent : null;
  }
  if (!suffix || suffix.name !== 'methodInvocationSuffix') return null;
  const info = invocationInfo(suffix);
  return info?.name ? info : null;
}

/** Nombre, token del nombre y receptor de un methodInvocationSuffix. */
function invocationInfo(suffix) {
  const primary = suffix._parent?.name === 'primarySuffix' ? suffix._parent._parent : suffix._parent;
  if (!primary || primary.name !== 'primary') return null;
  const suffixes = childrenOf(primary, 'primarySuffix');
  const idx = suffixes.findIndex((s) => s === suffix._parent || childrenOf(s, 'methodInvocationSuffix').includes(suffix));
  if (idx === -1) return null;
  const prefix = childrenOf(primary, 'primaryPrefix')[0];
  let nameTok;
  let receiverToks;
  if (idx >= 1) {
    const prevIds = childrenOf(suffixes[idx - 1], 'Identifier');
    nameTok = prevIds[prevIds.length - 1];
    receiverToks = [...codeTokens(prefix), ...suffixes.slice(0, idx - 1).flatMap((s) => codeTokens(s))];
  } else {
    const ids = codeTokens(prefix).filter((t) => t.tokenType.name === 'Identifier');
    nameTok = ids[ids.length - 1];
    receiverToks = ids.slice(0, -1);
  }
  if (!nameTok) return null;
  return { name: nameTok.image, nameTok, receiverToks, primary, suffix, index: idx };
}

function chainBound(invocation) {
  // Collectors.x(...) dentro de collect(...): la cota es la del stream envolvente.
  if (COLLECTOR_METHODS.has(invocation.name)) {
    const outerArgs = findAncestor(invocation.primary, (n) => n.name === 'argumentList' || n.name === 'block');
    const outerSuffix = outerArgs?.name === 'argumentList' ? outerArgs._parent : null;
    if (outerSuffix?.name === 'methodInvocationSuffix') {
      const outer = invocationInfo(outerSuffix);
      if (outer) return chainBound(outer);
    }
    return { bound: false, why: 'collector sin stream envolvente identificable' };
  }
  const toks = invocation.receiverToks;
  if (tokensShowBound(toks)) return { bound: true, why: 'cadena del stream/receptor' };
  const ids = toks.filter((t) => t.tokenType.name === 'Identifier');
  if (ids.length >= 1 && /^[a-z]/.test(ids[0].image) && ids[0].image !== 'this') {
    const off = invocation.nameTok.startOffset;
    const res = identifierHasBound(ids[0].image, invocation.primary, off);
    if (res.bound) return res;
    return { bound: false, why: res.why };
  }
  return { bound: false, why: 'receptor sin cota visible' };
}

function methodCallsIn(root) {
  const calls = [];
  walk(root, (n) => {
    if (n.name === 'methodInvocationSuffix') {
      const info = invocationInfo(n);
      if (info) calls.push({ name: info.name, startLine: info.nameTok.startLine });
    } else if (n.name === 'methodReferenceSuffix') {
      calls.push(...methodRefCalls(n));
    }
  });
  return calls;
}

function methodRefCalls(refNode) {
  const ids = childrenOf(refNode, 'Identifier');
  const tok = ids[0];
  if (tok) return [{ name: tok.image, startLine: tok.startLine }];
  if (childrenOf(refNode, 'New').length) return [{ name: 'new', startLine: locOf(refNode)?.startLine }];
  return [];
}

function collectDbCalls(cst) {
  const calls = [];
  walk(cst, (n) => {
    if (n.name === 'methodInvocationSuffix') {
      const info = invocationInfo(n);
      if (!info) return;
      const receiver = info.receiverToks.filter((t) => t.tokenType.name === 'Identifier');
      const last = receiver[receiver.length - 1];
      if (DB_METHOD.test(info.name) || (last && DB_RECEIVER.test(last.image))) {
        calls.push({ name: info.name, receiver: last?.image || null, line: info.nameTok.startLine });
      }
    } else if (n.name === 'methodReferenceSuffix') {
      const primary = n._parent?._parent;
      const name = childrenOf(n, 'Identifier')[0];
      if (!name || primary?.name !== 'primary') return;
      const ids = codeTokens(childrenOf(primary, 'primaryPrefix')[0]).filter((t) => t.tokenType.name === 'Identifier');
      const last = ids[ids.length - 1];
      if (DB_METHOD.test(name.image) || (last && DB_RECEIVER.test(last.image))) {
        calls.push({ name: name.image, receiver: last?.image || null, line: name.startLine });
      }
    }
  });
  return calls;
}

export { ITERATION_METHODS, COLLECTOR_METHODS, TRIVIAL_CALL, DB_METHOD, DB_RECEIVER };
