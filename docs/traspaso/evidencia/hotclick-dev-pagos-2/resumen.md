# Evidencia resumida — HotClick Dev Pagos 2

| PR / rama | Hash | Diff sha (comando) | Suite | Seguridad |
|---|---|---|---|---|
| #325 hacienda-alto | `1c99fba65` | `35f04a02` (`git diff --binary a22501f7b4..1c99fba65`) | Local no terminó (OOM); CI Tests Java completo | APTO; skip-scale-gate puesto por CI/CD |
| #336 bodega-default-front | `ba638f5e3` → `f6e655e6a` | `ad0d942d` sobre `ba638f5e3` | vitest + tsc | APTO sobre `ba638f5e3`; falta sobre `f6e655e6a` |
| #343 lock-expiracion | `75f93a252` | `324c8250` (`git diff a22501f7b4d2..HEAD`) | 2700 tests, 0 fallos | APTO pedido; SCALE1 falso positivo |
| feat/iva-regimen | `d9043b570` | — | pendiente tras actualizar con master | pendiente |

Lecciones: siempre indicar base y comando del diff al pedir APTO (hubo un desfase por usar merge-base `949eaa41`). gitleaks marcaba el tipo `X509Certificate` como clave; se resolvió con allowlist acotada `^X509Certificate$`.
