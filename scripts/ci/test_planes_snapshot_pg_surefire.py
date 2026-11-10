#!/usr/bin/env python3
"""Tests del gate planes-snapshot-pg-surefire.py (python3 -m unittest scripts/ci/test_planes_snapshot_pg_surefire.py)."""
import importlib.util
import io
import os
import tempfile
import time
import unittest
from contextlib import redirect_stderr, redirect_stdout
from pathlib import Path

_RUTA = Path(__file__).with_name("planes-snapshot-pg-surefire.py")
_spec = importlib.util.spec_from_file_location("gate_planes_pg", _RUTA)
gate = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(gate)

SUITE = gate.SUITE


def xml(casos, suite=SUITE, tests=None, skipped=None, failures=0, errors=0):
    cuerpo = "".join(
        f'<testcase name="{n}" classname="Postgres: snapshot">{extra}</testcase>' for n, extra in casos
    )
    tests = len(casos) if tests is None else tests
    skipped = sum(1 for _, e in casos if "<skipped" in e) if skipped is None else skipped
    return (
        '<?xml version="1.0" encoding="UTF-8"?>'
        f'<testsuite name="{suite}" tests="{tests}" skipped="{skipped}" failures="{failures}" errors="{errors}">'
        f"{cuerpo}</testsuite>"
    )


OK = [(n, "") for n in gate.REQUERIDOS]


class GatePlanesPg(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        self.marca = os.path.join(self.dir.name, "inicio")
        self.ruta = os.path.join(self.dir.name, f"TEST-{SUITE}.xml")
        Path(self.marca).touch()
        antes = time.time() - 60
        os.utime(self.marca, (antes, antes))

    def tearDown(self):
        self.dir.cleanup()

    def correr(self, contenido=None, ruta=None, marca=None):
        if contenido is not None:
            Path(self.ruta).write_text(contenido, encoding="utf-8")
        out, err = io.StringIO(), io.StringIO()
        with redirect_stdout(out), redirect_stderr(err):
            rc = gate.main(ruta or self.ruta, marca or self.marca)
        return rc, out.getvalue() + err.getvalue()

    def test_valido_pasa(self):
        rc, salida = self.correr(xml(OK))
        self.assertEqual(rc, 0, salida)
        self.assertIn("PASS", salida)

    def test_xml_ausente_falla(self):
        rc, salida = self.correr()
        self.assertEqual(rc, 1)
        self.assertIn("no hay reporte", salida)

    def test_xml_vacio_falla(self):
        rc, salida = self.correr("")
        self.assertEqual(rc, 1)
        self.assertIn("vacío", salida)

    def test_xml_ilegible_falla(self):
        rc, _ = self.correr("<testsuite")
        self.assertEqual(rc, 1)

    def test_todo_skipped_falla(self):
        rc, salida = self.correr(xml([(n, "<skipped/>") for n in gate.REQUERIDOS]))
        self.assertEqual(rc, 1)
        self.assertIn("skipped=5", salida)

    def test_skipped_en_caso_aunque_el_conteo_diga_cero_falla(self):
        casos = OK[:-1] + [(gate.REQUERIDOS[-1], "<skipped/>")]
        rc, salida = self.correr(xml(casos, skipped=0))
        self.assertEqual(rc, 1)
        self.assertIn(gate.REQUERIDOS[-1], salida)

    def test_fallo_falla(self):
        casos = [(gate.REQUERIDOS[0], '<failure message="x"/>')] + OK[1:]
        rc, _ = self.correr(xml(casos, failures=1))
        self.assertEqual(rc, 1)

    def test_error_falla(self):
        casos = [(gate.REQUERIDOS[0], '<error message="x"/>')] + OK[1:]
        rc, _ = self.correr(xml(casos, errors=1))
        self.assertEqual(rc, 1)

    def test_cero_tests_falla(self):
        rc, salida = self.correr(xml([]))
        self.assertEqual(rc, 1)
        self.assertIn("sin tests", salida)

    def test_otra_suite_falla(self):
        rc, salida = self.correr(xml(OK, suite="com.hotclick.integration.OnvoAltaMarketplacePostgresTest"))
        self.assertEqual(rc, 1)
        self.assertIn("suite inesperada", salida)

    def test_falta_caso_obligatorio_falla(self):
        rc, salida = self.correr(xml(OK[1:]))
        self.assertEqual(rc, 1)
        self.assertIn(gate.REQUERIDOS[0], salida)

    def test_reporte_obsoleto_falla(self):
        Path(self.ruta).write_text(xml(OK), encoding="utf-8")
        viejo = time.time() - 3600
        os.utime(self.ruta, (viejo, viejo))
        rc, salida = self.correr()
        self.assertEqual(rc, 1)
        self.assertIn("obsoleto", salida)

    def test_sin_marca_falla(self):
        rc, salida = self.correr(xml(OK), marca=os.path.join(self.dir.name, "no-existe"))
        self.assertEqual(rc, 1)
        self.assertIn("marca", salida)

    def test_conteo_inconsistente_falla(self):
        rc, _ = self.correr(xml(OK, tests=9))
        self.assertEqual(rc, 1)


if __name__ == "__main__":
    unittest.main()
