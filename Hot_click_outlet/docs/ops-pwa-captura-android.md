# Ops — PWA captura inventario (Android sin Play Store)

Guía operativa para instalar y validar la app web de captura en tablet/celular Android en producción (`https://hotclick.lat`).

Relacionado: [plan-pwa-captura-sin-play.md](./plan-pwa-captura-sin-play.md).

## Instalación en tablet Android (sin Play Store)

1. Abrir **Chrome** (no navegador embebido de otras apps).
2. Ir a `https://hotclick.lat/admin/inventario/captura?modo=captura` e iniciar sesión como **ADMIN**.
3. Si aparece el banner **Instalar app**, tocar **Instalar app**.
4. Si no hay prompt nativo: menú ⋮ → **Instalar app** / **Añadir a pantalla de inicio**.
5. Abrir la app desde el ícono en la pantalla de inicio (modo standalone, sin barra del navegador).
6. Atajo opcional: mantener presionado el ícono → shortcut **Captura inventario** (manifest shortcut).

## Checklist — verificar en producción

Marcar cada ítem tras deploy o cambio en PWA / captura. Todos requieren validación en **prod** (`hotclick.lat`), no solo en dev local.

| # | Ítem | Tag | Cómo verificar en prod |
|---|------|-----|------------------------|
| 1 | **HTTPS** | `verify-in-prod` | URL con candado; sin mixed content en DevTools → Security. `getUserMedia` y `beforeinstallprompt` fallan sin HTTPS. |
| 2 | **Manifest** | `verify-in-prod` | DevTools → Application → Manifest: nombre, íconos 192/512, `display: standalone`, shortcuts **Captura inventario** y **Paquetes inventario**. |
| 3 | **Service Worker (SW)** | `verify-in-prod` | Application → Service Workers: SW activo en scope `/`; tras deploy nuevo, banner de actualización visible (registerType `prompt`). |
| 4 | **Instalable (PWA)** | `verify-in-prod` | Chrome Android: menú ⋮ muestra **Instalar app** o banner en `/admin/inventario/captura`; app abre en standalone (`display-mode: standalone`). |
| 5 | **Permiso de cámara** | `verify-in-prod` | En captura, botón cámara → Chrome pide permiso; video en vivo y escaneo de código de barras funcional (BarcodeDetector o fallback). |
| 6 | **Inventario → NetworkOnly** | `verify-in-prod` | Application → Cache Storage: requests a `/api/inventario/**` **no** quedan en caché (handler Workbox `NetworkOnly` en SW generado). Lookup barcode siempre en red. |

### Orden sugerido en campo

1. HTTPS → 2. Manifest → 3. SW → 4. Instalable → 5. Cámara → 6. NetworkOnly inventario.

Si algún ítem falla, no usar la tablet en captura de campo hasta corregir y re-validar el checklist completo.
