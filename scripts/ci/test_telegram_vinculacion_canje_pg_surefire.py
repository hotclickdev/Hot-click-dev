"""Autotest del gate telegram-vinculacion-canje-pg-surefire.py (sin PostgreSQL: solo XML sintéticos)."""
import importlib.util
import os
import tempfile
import time
import unittest

_RUTA = os.path.join(os.path.dirname(__file__), "telegram-vinculacion-canje-pg-surefire.py")
_spec = importlib.util.spec_from_file_location("telegram_canje_gate", _RUTA)
gate = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(gate)

TODOS = ["revocacionPrevia", "revocacionConcurrenteConElCanje", "dosCanjesSimultaneos", "codigoVencido"]
SUITE = "com.hotclick.integration.TelegramVinculacionCanjeConcurrentePostgresTest"


def _xml(casos, skipped=0, failures=0, errors=0, tests=None, hijo_en=None):
    filas = []
    for c in casos:
        hijo = f"<{hijo_en[1]}/>" if hijo_en and hijo_en[0] == c else ""
        filas.append(f'<testcase name="{c}" classname="{SUITE}">{hijo}</testcase>')
    n = len(casos) if tests is None else tests
    return (f'<?xml version="1.0"?><testsuite name="{SUITE}" tests="{n}" skipped="{skipped}" '
            f'failures="{failures}" errors="{errors}">{"".join(filas)}</testsuite>')


class GateTelegramCanjePg(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.mkdtemp()
        self.marca = os.path.join(self.dir, "marca")
        self.xml = os.path.join(self.dir, f"TEST-{SUITE}.xml")
        with open(self.marca, "w"):
            pass
        antes = time.time() - 60
        os.utime(self.marca, (antes, antes))

    def escribir(self, contenido, viejo=False):
        with open(self.xml, "w") as f:
            f.write(contenido)
        if viejo:
            t = time.time() - 3600
            os.utime(self.xml, (t, t))

    def test_pasa_exacto(self):
        self.escribir(_xml(TODOS))
        self.assertEqual(gate.main(self.xml, self.marca), 0)

    def test_falla_si_falta_el_xml(self):
        self.assertEqual(gate.main(self.xml, self.marca), 1)

    def test_falla_si_falta_la_marca(self):
        self.escribir(_xml(TODOS))
        self.assertEqual(gate.main(self.xml, os.path.join(self.dir, "no-existe")), 1)

    def test_falla_si_xml_viejo(self):
        self.escribir(_xml(TODOS), viejo=True)
        self.assertEqual(gate.main(self.xml, self.marca), 1)

    def test_falla_si_skipped(self):
        self.escribir(_xml(TODOS, skipped=1, hijo_en=("dosCanjesSimultaneos", "skipped")))
        self.assertEqual(gate.main(self.xml, self.marca), 1)

    def test_falla_si_failures_o_errors(self):
        self.escribir(_xml(TODOS, failures=1))
        self.assertEqual(gate.main(self.xml, self.marca), 1)
        self.escribir(_xml(TODOS, errors=1))
        self.assertEqual(gate.main(self.xml, self.marca), 1)

    def test_falla_si_cuenta_distinta(self):
        self.escribir(_xml(TODOS + ["otro"]))
        self.assertEqual(gate.main(self.xml, self.marca), 1)
        self.escribir(_xml([]))
        self.assertEqual(gate.main(self.xml, self.marca), 1)

    def test_falla_si_falta_un_caso(self):
        self.escribir(_xml(TODOS[:-1]))
        self.assertEqual(gate.main(self.xml, self.marca), 1)

    def test_falla_si_el_caso_no_es_el_esperado(self):
        self.escribir(_xml(["otroCaso"]))
        self.assertEqual(gate.main(self.xml, self.marca), 1)

    def test_falla_con_xml_ilegible(self):
        self.escribir("<testsuite")
        self.assertEqual(gate.main(self.xml, self.marca), 1)


if __name__ == "__main__":
    unittest.main()
