#!/usr/bin/env python3
"""Falla si las pruebas PostgreSQL de fix2 (pagos ONVO) no corrieron completas y en verde en ESTE job.

Uso: fix2-pg-surefire.py <directorio surefire-reports> <marca-de-inicio>

Por cada suite requerida exige:
- XML TEST-<suite>.xml presente, no vacío y parseable;
- identidad: testsuite name == clase esperada;
- reporte fresco: escrito después de la marca que el job toca antes de Maven (no reportes viejos);
- EXACTAMENTE los casos esperados (por nombre; sin faltantes, extras ni repetidos) y tests == cantidad esperada;
- skipped = 0, failures = 0, errors = 0 y ningún testcase con skipped/failure/error/rerunFailure/flakyFailure.
No imprime URLs ni contraseñas: solo conteos y nombres de caso.
"""
import os
import sys
import xml.etree.ElementTree as ET

SUITES = {
    "com.hotclick.migration.PagoConciliacionFlywayPostgresTest": (
        "vacioSinteticoV236MigraV237V238",
        "validateYSegundoMigrateSinReaplicar",
        "incrementalV237LuegoV238",
        "columnasNullableIndicesYSinBackfill",
    ),
    "com.hotclick.integration.PagoOnvoCancelacionLocksPostgresTest": (
        "motorPostgresYEsquemaAislado",
        "compradorIntencionAntesDeRedFallidaYCapturaReal",
        "compradorTimeoutDeIntencionSinRed",
        "compradorRollbackConservaIntencionYCapturaSinLocks",
        "compradorCobroSinCapturarConservaReembolso",
        "panelTelegramSinLocksDuranteRedYCapturaReal",
        "panelEsperaPagoBloqueadoSinTomarPedidoNiRed",
        "guardadoObsoletoNoPisaIntencionNiIntent",
        "skipLockedSaltaFilasRetenidasSinEsperar",
        "dosInstanciasConcurrentesReclamanDisjuntoConLease",
        "backoffPersisteYSeRecuperaTrasReinicio",
        "fairnessBacklogCincoMilHistoricosYRecientes",
    ),
}
PROBLEMAS = ("skipped", "failure", "error", "rerunFailure", "flakyFailure")


def _entero(suite, clave):
    try:
        return int(suite.attrib.get(clave, "0"))
    except ValueError:
        return -1


def _nombre(caso):
    n = caso.attrib.get("name", "")
    return n[:-2] if n.endswith("()") else n


def revisar_suite(directorio, marca, suite_esperada, requeridos):
    """Devuelve una lista de motivos de falla (vacía si la suite pasa)."""
    ruta = os.path.join(directorio, f"TEST-{suite_esperada}.xml")
    if not os.path.isfile(ruta):
        return [f"{suite_esperada}: no hay reporte Surefire (no se ejecutó)"]
    if os.path.getsize(ruta) == 0:
        return [f"{suite_esperada}: reporte vacío"]
    if os.path.getmtime(ruta) < os.path.getmtime(marca):
        return [f"{suite_esperada}: reporte obsoleto (anterior a la marca de inicio de este job)"]
    try:
        raiz = ET.parse(ruta).getroot()
    except ET.ParseError as ex:
        return [f"{suite_esperada}: reporte ilegible ({ex.__class__.__name__})"]
    suite = raiz if raiz.tag == "testsuite" else raiz.find("testsuite")
    if suite is None:
        return [f"{suite_esperada}: el XML no trae testsuite"]
    nombre = suite.attrib.get("name", "")
    if nombre != suite_esperada:
        return [f"suite inesperada: {nombre or '-'} (se esperaba {suite_esperada})"]
    tests = _entero(suite, "tests")
    skipped = _entero(suite, "skipped")
    failures = _entero(suite, "failures")
    errors = _entero(suite, "errors")
    casos = suite.findall("testcase")
    nombres = [_nombre(c) for c in casos]
    malos = [_nombre(c) for c in casos if any(c.find(t) is not None for t in PROBLEMAS)]
    faltan = [n for n in requeridos if n not in nombres]
    extras = sorted({n for n in nombres if n not in requeridos})
    repetidos = sorted({n for n in nombres if nombres.count(n) > 1})
    print(f"{suite_esperada} tests={tests} skipped={skipped} failures={failures} errors={errors} "
          f"casos={','.join(nombres) or '-'}")
    motivos = []
    if tests < 1 or len(casos) < 1 or tests != len(casos):
        motivos.append(f"{suite_esperada}: sin tests o conteo inconsistente (tests={tests}, casos={len(casos)})")
    if tests != len(requeridos) or faltan or extras or repetidos:
        motivos.append(
            f"{suite_esperada}: se esperaban exactamente {len(requeridos)} casos; tests={tests} "
            f"faltan={','.join(faltan) or '-'} extras={','.join(extras) or '-'} repetidos={','.join(repetidos) or '-'}")
    if skipped != 0 or failures != 0 or errors != 0 or malos:
        motivos.append(
            f"{suite_esperada}: tiene que ejecutarse completa y pasar; skipped={skipped} failures={failures} "
            f"errors={errors} con_problema={','.join(malos) or '-'}")
    return motivos


def main(directorio, marca):
    if not os.path.isfile(marca):
        print("GATE FIX2-PG FAIL: falta la marca de inicio del job", file=sys.stderr)
        return 1
    motivos = []
    for suite, requeridos in SUITES.items():
        motivos.extend(revisar_suite(directorio, marca, suite, requeridos))
    total = sum(len(r) for r in SUITES.values())
    if motivos:
        for m in motivos:
            print(f"GATE FIX2-PG FAIL: {m}", file=sys.stderr)
        return 1
    print(f"GATE FIX2-PG PASS: {len(SUITES)} suites, {total} casos exactos, 0 skipped/failures/errors")
    return 0


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("uso: fix2-pg-surefire.py <surefire-reports> <marca-de-inicio>", file=sys.stderr)
        sys.exit(2)
    sys.exit(main(sys.argv[1], sys.argv[2]))
