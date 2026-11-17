#!/usr/bin/env python3
"""Gate fail-on-skip del test de concurrencia de invitaciones de equipo (PR 583) en PostgreSQL real.

Lee el XML de Surefire de InvitacionEquipoConcurrentePostgresTest. Exige: el XML existe y es MAS NUEVO que la marca de
inicio, tests == numero exacto de @Test de la clase (1), el caso esperado presente, y skipped == failures == errors == 0.
No imprime URLs ni contraseñas.
"""
import os
import sys
import xml.etree.ElementTree as ET

CASOS = ("dosAceptacionesSimultaneas",)  # un @Test por caso; si se agrega uno a la clase, se agrega aqui


def main(ruta: str, marca: str) -> int:
    if not os.path.isfile(ruta):
        print("GATE INVITACION-PG FAIL: no hay reporte (el test no corrio)", file=sys.stderr)
        return 1
    if not os.path.isfile(marca):
        print("GATE INVITACION-PG FAIL: falta la marca de inicio", file=sys.stderr)
        return 1
    if os.path.getmtime(ruta) <= os.path.getmtime(marca):
        print("GATE INVITACION-PG FAIL: reporte no mas nuevo que la marca de inicio", file=sys.stderr)
        return 1
    try:
        raiz = ET.parse(ruta).getroot()
    except (OSError, ET.ParseError) as ex:
        print(f"GATE INVITACION-PG FAIL: reporte ilegible ({ex.__class__.__name__})", file=sys.stderr)
        return 1
    suite = raiz if raiz.tag == "testsuite" else raiz.find("testsuite")
    if suite is None:
        print("GATE INVITACION-PG FAIL: el XML no trae testsuite", file=sys.stderr)
        return 1
    try:
        tests = int(suite.attrib.get("tests", "0"))
        skipped = int(suite.attrib.get("skipped", "0"))
        failures = int(suite.attrib.get("failures", "0"))
        errors = int(suite.attrib.get("errors", "0"))
    except ValueError:
        print("GATE INVITACION-PG FAIL: conteos ilegibles", file=sys.stderr)
        return 1
    casos = [c.attrib.get("name", "").split("(")[0] for c in suite.findall("testcase")]
    omitidos = [c.attrib.get("name", "") for c in suite.findall("testcase") if c.find("skipped") is not None]
    print(f"InvitacionEquipoConcurrentePostgresTest tests={tests} skipped={skipped} failures={failures} "
          f"errors={errors} casos={','.join(casos)}")
    if tests != len(CASOS) or sorted(casos) != sorted(CASOS) or skipped or failures or errors or omitidos:
        print("GATE INVITACION-PG FAIL: el test de concurrencia tiene que ejecutarse (todos los casos) y pasar",
              file=sys.stderr)
        return 1
    print("GATE INVITACION-PG PASS")
    return 0


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("uso: invitacion-concurrente-pg-surefire.py <TEST-....xml> <marca-de-inicio>", file=sys.stderr)
        sys.exit(2)
    sys.exit(main(sys.argv[1], sys.argv[2]))
