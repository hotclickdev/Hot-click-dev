#!/usr/bin/env python3
"""Falla si OnvoAltaMarketplacePostgresTest no corrió de verdad.

Lee el XML de Surefire. Exige el ocultamiento de REQUIERE_MEMBRESIA y el
índice único del ledger, con tests > 0, skipped = 0, failures = 0 y errors = 0.
No imprime URLs ni contraseñas: solo conteos y nombres de caso.
"""
import sys
import xml.etree.ElementTree as ET

REQUERIDOS = (
    "ocultaRequiereMembresia",
    "replayFacturaNoDuplicaCobroOk",
)


def main(ruta: str) -> int:
    try:
        raiz = ET.parse(ruta).getroot()
    except (OSError, ET.ParseError) as ex:
        print(f"GATE ONVO-PG FAIL: no hay reporte usable ({ex.__class__.__name__})", file=sys.stderr)
        return 1
    suite = raiz if raiz.tag == "testsuite" else raiz.find("testsuite")
    if suite is None:
        print("GATE ONVO-PG FAIL: el XML no trae testsuite", file=sys.stderr)
        return 1
    tests = int(suite.attrib.get("tests", "0"))
    skipped = int(suite.attrib.get("skipped", "0"))
    failures = int(suite.attrib.get("failures", "0"))
    errors = int(suite.attrib.get("errors", "0"))
    nombres = [c.attrib.get("name", "") for c in suite.findall("testcase")]
    omitidos = [c.attrib.get("name", "") for c in suite.findall("testcase") if c.find("skipped") is not None]
    print(
        "OnvoAltaMarketplacePostgresTest "
        f"tests={tests} skipped={skipped} failures={failures} errors={errors} "
        f"casos={','.join(nombres)}"
    )
    faltan = [n for n in REQUERIDOS if n not in nombres]
    if tests < 1 or skipped != 0 or failures != 0 or errors != 0 or faltan or omitidos:
        print(
            "GATE ONVO-PG FAIL: el test de PostgreSQL tiene que ejecutarse y pasar. "
            f"tests={tests} skipped={skipped} failures={failures} errors={errors} "
            f"faltan={','.join(faltan) or '-'} omitidos={','.join(omitidos) or '-'}",
            file=sys.stderr,
        )
        return 1
    print("GATE ONVO-PG PASS")
    return 0


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("uso: onvo-alta-pg-surefire.py <TEST-....xml>", file=sys.stderr)
        sys.exit(2)
    sys.exit(main(sys.argv[1]))
