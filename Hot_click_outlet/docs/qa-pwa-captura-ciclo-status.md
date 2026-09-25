# Ciclo PWA captura sin Play Store — VERDE

## Ruta elegida (4 agentes)
**PWA primero** vía Chrome “Instalar app” / Añadir a inicio. Capacitor APK = Plan B solo si falla en campo.

## Entregado
| ID | Estado |
|----|--------|
| P1 Escáner BarcodeDetector + ZXing lazy | DONE |
| P2 Shortcuts Captura + Paquetes | DONE |
| P3 Banner instalar (ADMIN) | DONE |
| P4 Standalone = modo captura | DONE |
| P5 NetworkOnly `/api/inventario/**` | DONE |
| P6 Tests pwaDisplay + preferNativeDetector | DONE |
| P7 Ops `docs/ops-pwa-captura-android.md` | DONE |

## Gate
- `tsc` PASS
- Vitest inventario/PWA PASS (26+)
- `vite build` PASS (PWA generateSW)
- ZXing dynamic import (no hincha chunk nativo)

## Cómo usar (tablet ADMIN)
1. Chrome → login ADMIN → `/admin/inventario/captura?modo=captura`
2. Banner **Instalar app** o menú ⋮ → Instalar aplicación
3. Cámara o pistola Bluetooth HID
4. Detalle: `docs/ops-pwa-captura-android.md`
