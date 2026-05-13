# HOTCLICK — Extensión Chrome para Facebook Marketplace

## Instalación (una sola vez)

1. Abre Chrome y ve a `chrome://extensions`
2. Activa **Modo desarrollador** (switch arriba a la derecha)
3. Clic en **Cargar descomprimida**
4. Selecciona esta carpeta: `chrome-extension/`
5. La extensión aparece con el ícono "HC" en la barra

## Configuración (primera vez)

1. Clic en el ícono HC en la barra de Chrome
2. Clic en el engranaje ⚙️
3. Rellena los 2 campos:

   | Campo | Valor |
   |-------|-------|
   | URL de la API | `https://hot-click-backend.onrender.com` (o `http://localhost:8080` en dev) |
   | Token JWT | Copia el token desde el panel admin |

4. Para copiar el JWT: abre el admin → F12 → Consola → escribe: `localStorage.getItem('auth-store')` → copia el valor de `token`

5. Clic **Guardar**

## Uso diario

### Opción A — Desde el popup

1. Clic en el ícono HC
2. Elige una publicación con estado **LISTO**
3. Clic **Llenar en Marketplace** → se abre/foca la pestaña de FB
4. La extensión rellena título, precio y descripción automáticamente
5. Revisa los campos, agrega fotos y clic **Publicar** en Facebook

### Opción B — Desde el botón flotante en Facebook

1. Abre manualmente `facebook.com/marketplace/create/item`
2. Verás el botón azul **Llenar formulario** flotando abajo a la derecha
3. Primero selecciona el producto en el popup (paso 2 de Opción A)
4. Clic en el botón flotante

## Actualizar el token

El JWT dura 24 horas. Si la extensión da error 401, vuelve a copiar el token desde el admin.

## Notas

- La extensión **no** publica automáticamente en Facebook (respeta las políticas de FB)
- Solo rellena el formulario; tú haces clic final en "Publicar"
- El botón "Copiar" copia el texto completo para pegarlo manualmente si prefieres
