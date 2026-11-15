"""Autotest del gate fix2-pg-surefire.py (sin PostgreSQL: solo XML sintéticos)."""
import importlib.util
import os
import tempfile
import time
import unittest

_RUTA = os.path.join(os.path.dirname(__file__), "fix2-pg-surefire.py")
_spec = importlib.util.spec_from_file_location("fix2_gate", _RUTA)
gate = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(gate)


def _xml(suite, casos, skipped=0, failures=0, errors=0, tests=None, marca_caso=None):
    filas = []
    for c in casos:
        hijo = f"<{marca_caso[1]}/>" if marca_caso and marca_caso[0] == c else ""
        filas.append(f'<testcase name="{c}" classname="{suite}">{hijo}</testcase>')
    n = len(casos) if tests is None else tests
    return (f'<?xml version="1.0"?><testsuite name="{suite}" tests="{n}" skipped="{skipped}" '
            f'failures="{failures}" errors="{errors}">{"".join(filas)}</testsuite>')


class GateFix2Pg(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.mkdtemp()
        self.marca = os.path.join(self.dir, "marca")
        with open(self.marca, "w"):
            pass
        antes = time.time() - 60
        os.utime(self.marca, (antes, antes))

    def escribir(self, suite, contenido, viejo=False):
        ruta = os.path.join(self.dir, f"TEST-{suite}.xml")
        with open(ruta, "w") as f:
            f.write(contenido)
        if viejo:
            t = time.time() - 3600
            os.utime(ruta, (t, t))

    def todo_verde(self, excepto=None):
        for suite, casos in gate.SUITES.items():
            if suite != excepto:
                self.escribir(suite, _xml(suite, casos))

    def test_pasa_con_todos_exactos(self):
        self.todo_verde()
        self.assertEqual(gate.main(self.dir, self.marca), 0)

    def test_acepta_nombre_con_parentesis(self):
        for suite, casos in gate.SUITES.items():
            self.escribir(suite, _xml(suite, [c + "()" for c in casos]))
        self.assertEqual(gate.main(self.dir, self.marca), 0)

    def test_falla_sin_marca(self):
        self.todo_verde()
        os.remove(self.marca)
        self.assertEqual(gate.main(self.dir, self.marca), 1)

    def test_falla_si_falta_una_suite(self):
        primera = next(iter(gate.SUITES))
        self.todo_verde(excepto=primera)
        self.assertEqual(gate.main(self.dir, self.marca), 1)

    def test_falla_reporte_viejo(self):
        self.todo_verde()
        suite, casos = next(iter(gate.SUITES.items()))
        self.escribir(suite, _xml(suite, casos), viejo=True)
        self.assertEqual(gate.main(self.dir, self.marca), 1)

    def test_falla_skipped_de_suite_completa(self):
        self.todo_verde()
        suite, casos = list(gate.SUITES.items())[1]
        self.escribir(suite, _xml(suite, casos, skipped=len(casos)))
        self.assertEqual(gate.main(self.dir, self.marca), 1)

    def test_falla_testcase_skipped_aunque_contador_cero(self):
        self.todo_verde()
        suite, casos = list(gate.SUITES.items())[1]
        self.escribir(suite, _xml(suite, casos, marca_caso=(casos[0], "skipped")))
        self.assertEqual(gate.main(self.dir, self.marca), 1)

    def test_falla_flaky(self):
        self.todo_verde()
        suite, casos = list(gate.SUITES.items())[1]
        self.escribir(suite, _xml(suite, casos, marca_caso=(casos[2], "flakyFailure")))
        self.assertEqual(gate.main(self.dir, self.marca), 1)

    def test_falla_caso_faltante(self):
        self.todo_verde()
        suite, casos = list(gate.SUITES.items())[1]
        self.escribir(suite, _xml(suite, casos[:-1]))
        self.assertEqual(gate.main(self.dir, self.marca), 1)

    def test_falla_extra_o_repetido(self):
        self.todo_verde()
        suite, casos = list(gate.SUITES.items())[1]
        self.escribir(suite, _xml(suite, list(casos) + ["inventado"]))
        self.assertEqual(gate.main(self.dir, self.marca), 1)
        self.escribir(suite, _xml(suite, list(casos[:-1]) + [casos[0]]))
        self.assertEqual(gate.main(self.dir, self.marca), 1)

    def test_falla_suite_con_otro_nombre(self):
        self.todo_verde()
        suite, casos = list(gate.SUITES.items())[0]
        self.escribir(suite, _xml("com.hotclick.Otra", casos))
        self.assertEqual(gate.main(self.dir, self.marca), 1)

    def test_falla_conteo_inconsistente_y_cero(self):
        self.todo_verde()
        suite, casos = list(gate.SUITES.items())[0]
        self.escribir(suite, _xml(suite, casos, tests=len(casos) + 1))
        self.assertEqual(gate.main(self.dir, self.marca), 1)
        self.escribir(suite, _xml(suite, [], tests=0))
        self.assertEqual(gate.main(self.dir, self.marca), 1)

    def test_falla_xml_vacio_o_ilegible(self):
        self.todo_verde()
        suite = list(gate.SUITES)[0]
        self.escribir(suite, "")
        self.assertEqual(gate.main(self.dir, self.marca), 1)
        self.escribir(suite, "<testsuite")
        self.assertEqual(gate.main(self.dir, self.marca), 1)


if __name__ == "__main__":
    unittest.main()
