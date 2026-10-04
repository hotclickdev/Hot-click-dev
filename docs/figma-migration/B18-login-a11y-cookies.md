# B18 — Login, accesibilidad y cookies

Fecha: 2-oct-2026. Investigación. Sin cambios de login, 2FA, fuente, cookies ni páginas legales.

## Estado Git

| | |
| --- | --- |
| Branch | `feat/figma/base` |
| HEAD al comenzar | `264abca4` |
| Master | `b355fd20` |
| PASS / PARTIAL | 37 / 53 |

Frames: `28:1143`, `51:2229`, `52:2389`, `45:1946`, `45:2166`. Docs: `ACC.md`, `SYS.md`, `INVENTORY.md`, `QA_GLOBAL.md`, `fuenteAccesibilidad.ts`, `B8-decisiones-Figma.md` (D11, D19).

## Login

### Paso de correo

`28:1143` dibuja «Ingresá o creá tu cuenta». El código ya usa `login.bienvenidaTitulo` con ese texto. SHELL midió la barra «Tu cuenta» a 390.

### Clasificación del título

RESUELTO

La fila de `/login` sigue PARTIAL por lo que sigue.

### Paso de contraseña

Aparece al pulsar Continuar. `ACC.md` dice que no tiene frame.

### Clasificación

FIGMA PENDIENTE

No se diseña ese paso en esta fase.

### Google

`28:1143` incluye «Continuar con Google». `SocialLoginButtons` lo muestra solo si hay `VITE_CLERK_PUBLISHABLE_KEY`. Con la clave, ACC lo midió a ±2 px. Sin la clave no hay botón ni separador. No hay un frame del estado sin Google.

### Clasificación

NO APLICA como cambio local de UI. El control existe y depende de la clave de Clerk. No se inventa un botón de Google sin ese proveedor.

### Escritorio

No hay frame. Se usa el header mínimo y la misma columna.

### Clasificación

FIGMA PENDIENTE

### 2FA: «Confiar en este dispositivo»

El inventario lo marca bloqueado: no hay soporte en backend.

### Clasificación

BACKEND

### Elegir método y código por correo

No tienen frame propio. El paso medido es el de la app autenticadora, con «Usar un código de recuperación» en lugar de «Usar otra app autenticadora».

### Clasificación

FIGMA PENDIENTE

## Accesibilidad A−

`51:2229` mide la hoja en y=490, alto 354. `52:2389` marca el chip A. A− y A+ se dibujan. El frame no dice un `font-size` menor que 16 px.

`fuenteAlElegirMenor` devuelve el tamaño actual. A+ aplica 18 px (`fs-lg`). A queda en 16 px. B3 dejó ese comportamiento.

No se asume que A− deba reducir la fuente solo porque el chip existe.

### Clasificación

FIGMA PENDIENTE

Falta el tamaño. Sin ese número no hay un cambio que verificar.

## Cookies

`45:1946` es móvil y está en PASS desde B4: tarjeta en x12, y560, 366×205. `45:2166` (hoja) está en PASS.

No hay frame de escritorio. El aviso de escritorio queda en `left` 24 y `bottom` 24. `SYS.md` lo deja fuera del PASS móvil.

### Clasificación

Móvil: RESUELTO. Escritorio: FIGMA PENDIENTE.

No se mueve el desktop.

## Páginas sin frame

`QA_GLOBAL.md` e `INVENTORY.md`: Devoluciones, Información, Contacto, Términos, Privacidad, Nosotros y Ayuda no tienen frame. No son OLD_DESIGN por ausencia de referencia. Siguen sin migrar.

`/envios` sí tiene `28:1660`. No entra en esta lista.

### Clasificación

FIGMA PENDIENTE

No se inventan esas pantallas.

## Decisión

Ningún punto de B18 queda IMPLEMENTABLE. El título de login y las cookies móviles ya coinciden con sus frames. El resto espera frame, un tamaño de A−, Clerk o backend.

## Siguiente bloque

No queda en B8–B18 un punto que cumpla las diez condiciones de IMPLEMENTABLE. El siguiente trabajo de producto es responder las decisiones humanas ya escritas (D07, D13, D14, D16, D17 y las de B10 y B11). No hay un B19 de código definido por esta fase.
