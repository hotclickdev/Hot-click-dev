#!/usr/bin/env python3
"""Falla si PlanesActivosSnapshotPostgresTest no corrió de verdad contra PostgreSQL en ESTE job.

Uso: planes-snapshot-pg-surefire.py <TEST-....xml> <marca-de-inicio>

Exige:
- XML presente, parseable y no vacío;
- identidad de la suite: testsuite name == clase esperada (no sirve el reporte de otra clase);
- reporte fresco: el XML se escribió después de la marca que el job toca antes de correr Maven (no reportes viejos);
- EXACTAMENTE los casos esperados (5, por nombre, sin faltantes, extras ni repetidos) y tests == 5;
- skipped = 0, failures = 0, errors = 0, y ningún testcase con <skipped>, <failure> o <error>.
No imprime URLs ni contraseñas: solo conteos y nombres de caso.
"""
import os
import sys
import xml.etree.ElementTree as ET

SUITE = "com.hotclick.service.suscripcion.PlanesActivosSnapshotPostgresTest"
REQUERIDOS = (
    "tenantSnapshot",
    "billingSnapshot",
    "desdeTransaccionExternaReadCommitted",
    "controlReadCommittedFalla",
    "sinSetDeSesion",
)


def _falla(motivo: str) -> int:
    print(f"GATE PLANES-PG FAIL: {motivo}", file=sys.stderr)
    return 1


def _entero(suite, clave: str) -> int:
    try:
        return int(suite.attrib.get(clave, "0"))
    except ValueError:
        return -1


def main(ruta: str, marca: str) -> int:
    if not os.path.isfile(marca):
        return _falla("falta la marca de inicio del job; no se puede probar que el reporte sea de esta corrida")
    if not os.path.isfile(ruta):
        return _falla("no hay reporte Surefire (el test no se ejecutó)")
    if os.path.getsize(ruta) == 0:
        return _falla("reporte Surefire vacío")
    if os.path.getmtime(ruta) < os.path.getmtime(marca):
        return _falla("reporte obsoleto: es anterior a la marca de inicio de este job")
    try:
        raiz = ET.parse(ruta).getroot()
    except ET.ParseError as ex:
        return _falla(f"reporte ilegible ({ex.__class__.__name__})")
    suite = raiz if raiz.tag == "testsuite" else raiz.find("testsuite")
    if suite is None:
        return _falla("el XML no trae testsuite")
    nombre = suite.attrib.get("name", "")
    if nombre != SUITE:
        return _falla(f"suite inesperada: {nombre or '-'} (se esperaba {SUITE})")
    tests = _entero(suite, "tests")
    skipped = _entero(suite, "skipped")
    failures = _entero(suite, "failures")
    errors = _entero(suite, "errors")
    casos = suite.findall("testcase")
    nombres = [c.attrib.get("name", "") for c in casos]
    malos = [
        c.attrib.get("name", "")
        for c in casos
        if any(c.find(t) is not None for t in ("skipped", "failure", "error", "rerunFailure", "flakyFailure"))
    ]
    faltan = [n for n in REQUERIDOS if n not in nombres]
    extras = sorted({n for n in nombres if n not in REQUERIDOS})
    repetidos = sorted({n for n in nombres if nombres.count(n) > 1})
    print(
        f"{SUITE} tests={tests} skipped={skipped} failures={failures} errors={errors} "
        f"casos={','.join(nombres) or '-'}"
    )
    if tests < 1 or len(casos) < 1 or tests != len(casos):
        return _falla(f"sin tests ejecutados o conteo inconsistente (tests={tests}, casos={len(casos)})")
    if tests != len(REQUERIDOS) or faltan or extras or repetidos:
        return _falla(
            f"se esperaban exactamente {len(REQUERIDOS)} casos ({','.join(REQUERIDOS)}); tests={tests} "
            f"faltan={','.join(faltan) or '-'} extras={','.join(extras) or '-'} repetidos={','.join(repetidos) or '-'}"
        )
    if skipped != 0 or failures != 0 or errors != 0 or malos:
        return _falla(
            "el test de PostgreSQL tiene que ejecutarse completo y pasar. "
            f"skipped={skipped} failures={failures} errors={errors} "
            f"con_problema={','.join(malos) or '-'}"
        )
    print("GATE PLANES-PG PASS")
    return 0


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("uso: planes-snapshot-pg-surefire.py <TEST-....xml> <marca-de-inicio>", file=sys.stderr)
        sys.exit(2)
    sys.exit(main(sys.argv[1], sys.argv[2]))
