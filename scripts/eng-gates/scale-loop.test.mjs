import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parse } from 'java-parser';
import { parseUnifiedDiff } from './lib.mjs';
import { evaluateScale, scanScaleDiff } from './scale.mjs';
import { analyzeJavaFile, sha256Text } from './java-loop-map.mjs';

const SERVICE = 'Hot_click_outlet/src/main/java/com/hotclick/service/FooService.java';

function addedDiff(path, source) {
  const lines = source.replace(/\n$/, '').split('\n');
  const text = [
    '--- /dev/null',
    `+++ b/${path}`,
    `@@ -0,0 +1,${lines.length} @@`,
    ...lines.map((line) => `+${line}`),
  ].join('\n');
  return { files: parseUnifiedDiff(text), source, hash: sha256Text(source) };
}

function scan(path, source, parseFn = parse) {
  const { files, hash } = addedDiff(path, source);
  return scanScaleDiff(files, { parse: parseFn, fileTexts: { [path]: { text: source, hash } } });
}

const WRAP = (body) => `package com.hotclick.service;
class FooService {
${body}
}
`;

function lineOf(source, needle) {
  const idx = source.split('\n').findIndex((l) => l.includes(needle));
  assert.notEqual(idx, -1, `no está ${needle}`);
  return idx + 1;
}

const byRule = (findings, rule) => findings.filter((f) => f.rule === rule);

function readHead(rel) {
  return readFileSync(new URL(`../../${rel}`, import.meta.url), 'utf8');
}

describe('SCALE1 loop mapper — positivos (java-parser, archivo completo)', () => {
  it('for sin llaves, anidado, while, do, forEach y method reference con DB', () => {
    const source = WRAP(`
  void noBrace(List<Item> items) {
    for (Item i : items) repo.save(i);
  }
  void nested(List<Pedido> ps) {
    for (Pedido p : ps) {
      for (Item i : p.getItems()) {
        repo.findById(i.getId());
      }
    }
  }
  void whileLoop(Iterator<Item> it) {
    while (it.hasNext()) {
      itemRepository.delete(it.next());
    }
  }
  void doLoop(Deque<Item> q) {
    do {
      itemRepository.save(q.poll());
    } while (!q.isEmpty());
  }
  void lambda(List<Item> items) {
    items.forEach(i -> repo.save(i));
  }
  void mref(List<Item> items) {
    items.forEach(repo::save);
  }
`);
    const findings = scan(SERVICE, source);
    const n1 = byRule(findings, 'p1-nplus1').map((f) => f.line);
    for (const needle of ['for (Item i : items) repo.save(i)', 'repo.findById(i.getId())', 'itemRepository.delete', 'itemRepository.save(q.poll())', 'items.forEach(i -> repo.save(i))', 'items.forEach(repo::save)']) {
      assert.ok(n1.includes(lineOf(source, needle)), `falta p1-nplus1 en ${needle}`);
    }
    const loops = byRule(findings, 'p1-unbounded-loop-work').map((f) => f.line);
    for (const needle of ['for (Item i : items)', 'while (it.hasNext())', 'do {']) {
      assert.ok(loops.includes(lineOf(source, needle)), `falta p1-unbounded-loop-work en ${needle}`);
    }
    assert.equal(evaluateScale({ findings, skip: false }).ok, false);
  });

  it('colecciones/streams/callbacks: Collectors groupingBy/mapping/toMap, removeIf, replaceAll, forEachRemaining, Map.forEach multilínea', () => {
    const source = WRAP(`
  void colecciones(List<Item> items, Map<Long, Item> m, Iterator<Item> it) {
    Map<Long, List<Item>> g = items.stream().collect(Collectors.groupingBy(
        i -> catRepository.findById(i.getCat()).get().getId()));
    Map<Long, List<String>> mp = items.stream().collect(Collectors.groupingBy(Item::getCat,
        Collectors.mapping(i -> nombreRepository.findNombre(i), Collectors.toList())));
    Map<Long, Long> tm = items.stream().collect(Collectors.toMap(Item::getId,
        i -> stockRepository.countByItem(i)));
    items.removeIf(i -> pedidoRepository.existsByItem(i));
    items.replaceAll(i -> itemRepository.save(i));
    it.forEachRemaining(i -> auditoria.registrar(i));
    m.forEach((k, v) -> {
      v.setK(k);
      itemRepository.saveAndFlush(v);
    });
  }
`);
    const findings = scan(SERVICE, source);
    const n1 = byRule(findings, 'p1-nplus1').map((f) => f.line);
    for (const needle of ['catRepository.findById', 'nombreRepository.findNombre', 'stockRepository.countByItem', 'pedidoRepository.existsByItem', 'itemRepository.save(i)', 'itemRepository.saveAndFlush(v)']) {
      assert.ok(n1.includes(lineOf(source, needle)), `falta p1-nplus1 en ${needle}`);
    }
    const loopTitles = byRule(findings, 'p1-unbounded-loop-work').map((f) => f.title).join('\n');
    for (const m of ['groupingBy', 'mapping', 'toMap', 'removeIf', 'replaceAll', 'forEachRemaining', 'forEach']) {
      assert.match(loopTitles, new RegExp(`lambda:${m}\\b`), `falta iteración ${m}`);
    }
  });

  it('cota en comentario, String, text block o char NO silencia (tokens de código, no regex del texto)', () => {
    const source = WRAP(`
  void comentarios(List<Item> items) {
    // .limit(10) PageRequest.of(0, 50) Pageable MAX_LISTA
    /* for (int i = 0; i < 10; i++) */
    for (Item i : items) { // PageRequest
      log.info("PageRequest.of(0, 10) .limit(5) MAX_ITEMS");
      String tb = """
          Pageable .subList(0, 10) i < 10
          """;
      char c = '{';
      itemRepository.save(i);
    }
  }
`);
    const findings = scan(SERVICE, source);
    assert.ok(byRule(findings, 'p1-unbounded-loop-work').some((f) => f.line === lineOf(source, 'for (Item i : items)')));
    const n1 = byRule(findings, 'p1-nplus1').find((f) => f.line === lineOf(source, 'itemRepository.save(i)'));
    assert.ok(n1, 'falta N+1');
    assert.match(n1.title, /sin cota demostrable/);
  });

  it('condiciones no literales (size()+1, size()) no cuentan como cota', () => {
    const source = WRAP(`
  void m(List<Item> items) {
    for (int i = 0; i < items.size() + 1; i++) { itemRepository.save(items.get(i)); }
    int j = 0;
    while (j < items.size()) { itemRepository.delete(items.get(j++)); }
  }
`);
    const findings = scan(SERVICE, source);
    const lines = byRule(findings, 'p1-unbounded-loop-work').map((f) => f.line);
    assert.ok(lines.includes(lineOf(source, 'for (int i = 0')));
    assert.ok(lines.includes(lineOf(source, 'while (j <')));
  });
});

describe('SCALE1 loop mapper — origen del hallazgo (loop nuevo vs heredado)', () => {
  it('loop preexistente con una llamada nueva por ítem se rotula heredado + trabajo nuevo; loop agregado se rotula nuevo', () => {
    const path = SERVICE;
    const source = WRAP(`
  int liberar(List<Long> ids) {
    int n = 0;
    for (Long id : ids) {
      if (!permite(id)) continue;
      n++;
    }
    for (Long id : ids) { auditoria.registrar(id); }
    return n;
  }
`);
    const lines = source.replace(/\n$/, '').split('\n');
    const added = new Set([lineOf(source, 'if (!permite(id))'), lineOf(source, 'for (Long id : ids) { auditoria')]);
    const diff = [
      `--- a/${path}`, `+++ b/${path}`, `@@ -1,${lines.length - added.size} +1,${lines.length} @@`,
      ...lines.map((l, i) => `${added.has(i + 1) ? '+' : ' '}${l}`),
    ].join('\n');
    const findings = scanScaleDiff(parseUnifiedDiff(diff), { parse, fileTexts: { [path]: { text: source, hash: sha256Text(source) } } });
    const loops = byRule(findings, 'p1-unbounded-loop-work');
    const heredado = loops.find((f) => f.line === lineOf(source, 'for (Long id : ids) {'));
    assert.ok(heredado);
    assert.match(heredado.title, /loop preexistente; trabajo por ítem nuevo: permite/);
    const nuevo = loops.find((f) => f.line === lineOf(source, 'for (Long id : ids) { auditoria'));
    assert.match(nuevo.title, /loop nuevo/);
  });
});

describe('SCALE1 loop mapper — cotas estructurales', () => {
  it('limit() en la cadena, literal en la condición, PageRequest en el inicializador y parámetro Page<> son cota; la llamada DB por ítem sigue reportándose', () => {
    const source = WRAP(`
  void cotas(List<Item> items, Page<Item> pagina) {
    items.stream().limit(20).forEach(i -> itemRepository.save(i));
    for (int k = 0; k < 10; k++) { itemRepository.findById((long) k); }
    for (int k = 0; MAX_REINTENTOS >= k; k++) { log.debug("x"); }
    List<Pago> reclamados = tx.execute(s -> pagoRepository.reclamar(PageRequest.of(0, lote)));
    List<Pago> pagos = reclamados == null ? List.of() : reclamados;
    for (Pago p : pagos) { pagoRepository.agendar(p.getId()); }
    for (Item i : pagina) { itemRepository.save(i); }
    for (Item i : itemRepository.findTop50ByEstado("A")) { auditoria.registrar(i); }
  }
`);
    const findings = scan(SERVICE, source);
    assert.equal(byRule(findings, 'p1-unbounded-loop-work').length, 0,
      byRule(findings, 'p1-unbounded-loop-work').map((f) => `${f.line} ${f.title}`).join('\n'));
    const n1 = byRule(findings, 'p1-nplus1');
    for (const needle of ['items.stream().limit(20)', 'itemRepository.findById((long) k)', 'pagoRepository.agendar', 'for (Item i : pagina)']) {
      const f = n1.find((x) => x.line === lineOf(source, needle));
      assert.ok(f, `falta N+1 acotado en ${needle}`);
      assert.match(f.title, /cota visible/);
      assert.match(f.title, /DB\/red por ítem es real/);
    }
  });

  it('parámetro List<> sin tipo paginado: cota no demostrable intraprocedural (no se afirma "sin cota")', () => {
    const source = WRAP(`
  private void reclamar(List<Pago> destino, List<Pago> filas) {
    for (Pago p : filas) {
      pagoRepository.agendarConciliacion(p.getId());
    }
  }
`);
    const findings = scan(SERVICE, source);
    const f = byRule(findings, 'p1-unbounded-loop-work')[0];
    assert.ok(f);
    assert.match(f.title, /sin cota demostrable localmente/);
    assert.match(f.title, /intraprocedural/);
  });
});

describe('SCALE1 loop mapper — negativos (ubicación)', () => {
  it('saves en el método anterior al loop, strings/comentarios/text blocks y ifPresent no son N+1', () => {
    const source = WRAP(`
  void registrar() {
    pagoRepository.save(pago);
    webhookEventRepository.save(evento);
  }
  void cancelarPedidosPendientes(List<Pedido> ps) {
    for (Pedido p : ps) {
      p.setEstadoPedido("C");
      stock.liberarReservas(p);
    }
  }
  void strings() {
    String s = "for (x) { repo.save(x); }";
    String tb = """
        items.forEach(i -> repo.save(i));
        """;
    /* for (x : xs) { repo.save(x); } */
    // for (Item i : items) repo.save(i);
    char brace = '}';
    repo.save(x);
  }
  void optional() {
    repo.findByMerchantToken(id).ifPresent(p -> repo.save(p));
  }
`);
    const findings = scan(SERVICE, source);
    const n1 = byRule(findings, 'p1-nplus1');
    assert.equal(n1.length, 0, n1.map((f) => `${f.line} ${f.snippet}`).join('\n'));
    const real = byRule(findings, 'p1-unbounded-loop-work');
    assert.deepEqual(real.map((f) => f.line), [lineOf(source, 'for (Pedido p : ps)')]);
    assert.equal(byRule(findings, 'p1-java-parser').length, 0);
  });

  it('loop sin trabajo no trivial (getters) no se reporta', () => {
    const source = WRAP(`
  int total(List<Item> items) {
    int t = 0;
    for (Item i : items) { t += i.getCantidad(); }
    return items.stream().map(Item::getId).toList().size() + t;
  }
`);
    assert.equal(scan(SERVICE, source).length, 0);
  });
});

describe('SCALE1 loop mapper — fail-closed', () => {
  it('lambda con trabajo fuera de una invocación identificable bloquea como ambigüedad', () => {
    const source = WRAP(`
  void m(Item x) {
    Runnable r = () -> itemRepository.save(x);
    r.run();
  }
`);
    const findings = scan(SERVICE, source);
    assert.ok(byRule(findings, 'p1-java-parser').some((f) => /Ambigüedad/.test(f.title)));
    assert.equal(evaluateScale({ findings, skip: false }).ok, false);
  });

  it('parse error, fuente ausente, parser ausente, hash ausente/distinto y ruta distinta bloquean, sin skip', () => {
    const broken = 'class X { void m() { for ( }';
    const parseFail = scan(SERVICE, broken);
    assert.ok(parseFail.some((f) => f.rule === 'p1-java-parser' && /parse-error/.test(f.title)));
    assert.equal(evaluateScale({ findings: parseFail, skip: false }).ok, false);

    const good = WRAP('  void m() { repo.save(x); }\n');
    const { files, hash } = addedDiff(SERVICE, good);
    const cases = {
      'missing-source': { parse },
      'parser-missing': { parse: undefined, fileTexts: { [SERVICE]: { text: good, hash } } },
      'hash-missing': { parse, fileTexts: { [SERVICE]: { text: good } } },
      'hash-mismatch': { parse, fileTexts: { [SERVICE]: { text: good, hash: '0'.repeat(64) } } },
      // texto entregado bajo otra ruta: para la ruta del diff falta la fuente
      'missing-source ': { parse, fileTexts: { 'Hot_click_outlet/src/main/java/Otra.java': { text: good, hash } } },
    };
    for (const [status, opts] of Object.entries(cases)) {
      const findings = scanScaleDiff(files, opts);
      assert.ok(findings.some((f) => f.rule === 'p1-java-parser' && f.title.includes(`(${status.trim()})`)), status);
      assert.equal(evaluateScale({ findings, skip: false }).ok, false, status);
    }
  });

  it('el análisis devuelve el SHA-256 exacto del archivo', () => {
    const source = WRAP('  void m() {}\n');
    const ast = analyzeJavaFile(source, { parse, expectedHash: sha256Text(source) });
    assert.equal(ast.status, 'ok');
    assert.equal(ast.hash, sha256Text(source));
  });
});

describe('SCALE1 clasificación sobre archivos reales del HEAD (hash exacto)', () => {
  function analyzeHead(rel) {
    const source = readHead(rel);
    const ast = analyzeJavaFile(source, { parse, expectedHash: sha256Text(source) });
    assert.equal(ast.status, 'ok', `${rel}: ${ast.error}`);
    const loopAt = (line) => ast.loops.find((l) => l.startLine === line && !l.kind.startsWith('lambda'));
    return { source, ast, loopAt };
  }

  it('OnvoCapturaService: saves 172/176 fuera del loop (FP de ubicación corregido); loop nuevo 185 sin cota', () => {
    const rel = 'Hot_click_outlet/src/main/java/com/hotclick/payment/OnvoCapturaService.java';
    const { source, ast, loopAt } = analyzeHead(rel);
    assert.equal(ast.lineContext(172).inLoop, false);
    assert.equal(ast.lineContext(176).inLoop, false);
    assert.ok(ast.dbCallsAt(172).some((c) => c.name === 'save'));
    const loop = loopAt(185);
    assert.ok(loop, 'falta el loop de cancelarPedidosPendientes');
    assert.equal(loop.hasBound, false);
    assert.ok(loop.workCalls.some((c) => c.name === 'liberarReservas'));
    const findings = scan(rel, source);
    assert.equal(findings.filter((f) => f.rule === 'p1-nplus1' && (f.line === 172 || f.line === 176)).length, 0);
    assert.ok(findings.some((f) => f.rule === 'p1-unbounded-loop-work' && f.line === 185));
  });

  it('OnvoPendientesReconsultaService: 134/200 con cota PageRequest/cuota; 273 cota no demostrable intraprocedural', () => {
    const { loopAt } = analyzeHead('Hot_click_outlet/src/main/java/com/hotclick/service/payment/OnvoPendientesReconsultaService.java');
    assert.equal(loopAt(134).hasBound, true);
    assert.equal(loopAt(200).hasBound, true);
    assert.equal(loopAt(273).hasBound, false);
    assert.match(loopAt(273).boundEvidence, /intraprocedural/);
  });

  it('PaymentExpirationCleanupService: 67 sin LIMIT (heredado) y relectura 79 dentro del loop', () => {
    const { ast, loopAt } = analyzeHead('Hot_click_outlet/src/main/java/com/hotclick/service/payment/PaymentExpirationCleanupService.java');
    assert.equal(loopAt(67).hasBound, false);
    assert.equal(ast.lineContext(79).inLoop, true);
    assert.ok(ast.dbCallsAt(79).some((c) => c.name === 'findById'));
  });

  it('ReservaSospechosaLiberador: loop 50 heredado; consulta por ítem nueva (onvoPermiteLiberar); cota no demostrable localmente', () => {
    const { loopAt } = analyzeHead('Hot_click_outlet/src/main/java/com/hotclick/service/payment/ReservaSospechosaLiberador.java');
    const loop = loopAt(50);
    assert.equal(loop.hasBound, false);
    assert.match(loop.boundEvidence, /sin cota visible/);
    assert.equal(loop.hasPerItemWork, true);
    assert.ok(loop.workCalls.some((c) => c.name === 'onvoPermiteLiberar'));
  });
});
