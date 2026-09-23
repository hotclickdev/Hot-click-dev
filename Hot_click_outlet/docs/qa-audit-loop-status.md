# Audit loop post-PWA — VERDE

Fecha: 2026-09-17

## Hallazgos corregidos
| Severidad | Fix |
|-----------|-----|
| CRITICAL | `asignar` con lock pesimista `findByIdWithLineasForUpdate` |
| HIGH | `actualizarLinea` catch unique → 400 |
| HIGH | `lookup` usa `normalizeBarcode` (mismo pipeline que writes) |
| CRITICAL | intentos cola solo en ERROR (no doble) |
| CRITICAL | SINCRONIZANDO reintentable tras crash |
| CRITICAL | cámara: one-shot + liberar stream al error + effect estable |
| HIGH | `onScan` respeta `busy`; badge cola tras enqueue |
| HIGH | modo captura sin header/banners mobile |
| HIGH | Continuar captura `?paqueteId=` + link en lista |

## Gate
- Maven InventarioPaqueteServiceTest + BarcodeNormalizer + Security + PlatformStaff → PASS
- Vitest 27 PASS
- tsc PASS

## Diferido (no bloquea)
- Capacitor APK
- crear_oferta / auto-CONFLICTO
- Ventana residual crash entre POST y marca HC_POST_OK (mitigado; idempotency key server = next)
- Refresh líneas UI tras sync en background (parcial: badge sí)

## Follow-up post-notificaciones agentes
Los audits stale (rutas sin SuperAdminGuard, DataSeeder SUPPORT, cámara sin ZXing, etc.) ya fueron corregidos en ciclos previos. Wake lock: generation counter anti-orphan en cleanup.
