# Plan — App celular captura SIN Google Play

## Problema
Digitalizar inventario en Android con escáner (cámara + pistola HID) **sin publicar en Play Store**.

## Rutas posibles

| Ruta | Play Store? | Cámara | Costo | Veredicto |
|------|-------------|--------|-------|-----------|
| **PWA (Chrome “Instalar app” / Añadir a inicio)** | No | Sí (getUserMedia + BarcodeDetector/ZXing) | Bajo | **ELEGIDA** |
| Capacitor/Cordova APK sideload | No (APK manual) | Nativa | Medio + firmas | Solo si PWA falla en campo |
| TWA / Play | Sí | — | Alto | Fuera de alcance |
| App nativa Kotlin | Sí o sideload | — | Muy alto | No |

## Por qué PWA es la correcta aquí
- Ya existe `vite-plugin-pwa` + SW + íconos.
- Captura ya es web: HID + cámara + IndexedDB offline.
- HTTPS en `hotclick.lat` cumple requisito de instalación.
- ADMIN instala desde Chrome → ícono “Captura HotClick” sin tienda.
- iOS: “Compartir → Agregar a pantalla de inicio” (sin prompt nativo).

## Huecos actuales (código)
1. `BarcodeCameraScan`: si no hay `BarcodeDetector`, el loop **no decodifica** (fallback vacío).
2. Manifest `start_url: /` — no hay shortcut a captura.
3. Sin UI “Instalar app” en `/admin/inventario/captura`.
4. ~~SW no declara `NetworkOnly` explícito para `/api/inventario/**`~~ → **P5 hecho** (`vite.config.ts` Workbox).
5. Sin detección `display-mode: standalone` para UI modo app.

## Alcance a implementar (ciclo)
| ID | Trabajo |
|----|---------|
| P1 | Fallback ZXing/`BarcodeDetector` en cámara (Android real) |
| P2 | Manifest `shortcuts` → captura `?modo=captura` + nombre “Captura HC” |
| P3 | Banner Instalar PWA en captura (beforeinstallprompt + tips iOS/Android) |
| P4 | `isStandalone` + UI captura full-bleed cuando instalada |
| P5 | ✅ Workbox: NetworkOnly `/api/inventario/**` |
| P6 | Tests: normalizar, helper installability, smoke scanner module |
| P7 | Doc ops: cómo instalar en tablet Android sin Play |

## Fuera de alcance
- Capacitor APK, push nativo, Play Store listing.
- Cambiar `start_url` global de la tienda a captura (rompería clientes).

## Veredicto 4 agentes (2026-09-17)

**PROCEED (PWA-only).** Capacitor = Plan B si campo falla. Crítico: implementar fallback ZXing (hoy cámara sin `BarcodeDetector` no decodifica). NetworkOnly `/api/inventario/**`. Shortcuts + banner instalar en captura.
