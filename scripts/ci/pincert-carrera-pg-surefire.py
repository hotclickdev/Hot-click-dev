#!/usr/bin/env python3
"""Gate fail-on-skip del test de carrera del PIN del .p12 (PR 584) en PostgreSQL real.

Lee el XML de Surefire de PinCertReservaConcurrentePostgresTest. Exige: el XML existe y es fresco (posterior a la
marca de inicio, si se pasa), tests == 1, skipped == 0, failures == 0, errors == 0 y el caso esperado presente.
No imprime URLs ni contraseñas.
"""
import os
import sys
import xml.etree.ElementTree as ET

CASO = "veintePedidosSimultaneos_maximoCincoPinesProbados"


def main(ruta: str, marca: str | None) -> int:
    if not os.path.isfile(ruta):
        print("GATE PINCERT-PG FAIL: no hay reporte (el test no corrio)", file=sys.stderr)
        return 1
    if marca and os.path.isfile(marca) and os.path.getmtime(ruta) < os.path.getmtime(marca):
        print("GATE PINCERT-PG FAIL: reporte viejo (anterior a la marca de inicio)", file=sys.stderr)
        return 1
    try:
        raiz = ET.parse(ruta).getroot()
    except (OSError, ET.ParseError) as ex:
        print(f"GATE PINCERT-PG FAIL: reporte ilegible ({ex.__class__.__name__})", file=sys.stderr)
        return 1
    suite = raiz if raiz.tag == "testsuite" else raiz.find("testsuite")
    if suite is None:
        print("GATE PINCERT-PG FAIL: el XML no trae testsuite", file=sys.stderr)
        return 1
    tests = int(suite.attrib.get("tests", "0"))
    skipped = int(suite.attrib.get("skipped", "0"))
    failures = int(suite.attrib.get("failures", "0"))
    errors = int(suite.attrib.get("errors", "0"))
    casos = [c.attrib.get("name", "") for c in suite.findall("testcase")]
    omitidos = [c.attrib.get("name", "") for c in suite.findall("testcase") if c.find("skipped") is not None]
    print(f"PinCertReservaConcurrentePostgresTest tests={tests} skipped={skipped} failures={failures} errors={errors} casos={','.join(casos)}")
    if tests != 1 or skipped != 0 or failures != 0 or errors != 0 or CASO not in casos or omitidos:
        print("GATE PINCERT-PG FAIL: el test de carrera tiene que ejecutarse (1 caso) y pasar", file=sys.stderr)
        return 1
    print("GATE PINCERT-PG PASS")
    return 0


if __name__ == "__main__":
    if len(sys.argv) not in (2, 3):
        print("uso: pincert-carrera-pg-surefire.py <TEST-....xml> [marca-de-inicio]", file=sys.stderr)
        sys.exit(2)
    sys.exit(main(sys.argv[1], sys.argv[2] if len(sys.argv) == 3 else None))
