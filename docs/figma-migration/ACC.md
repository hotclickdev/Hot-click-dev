# ACC · Cuenta, acceso, pedidos, favoritos y solicitudes

> **Estado al cierre (P21, 2-oct-2026):** las decisiones pendientes, los huecos de backend, los tests que ya fallaban y cómo verificar están en `CIERRE_MIGRACION.md`. Los estados de las pantallas están en `INVENTORY.md`. Este documento conserva el detalle del módulo.

Rama `feat/figma/acc`, puesta al día con `feat/figma/base` en `27f87000` (ya incluye CHK, `cf657e9c`). Archivo Figma `TmxYFj2nauu10WZnZ0t6yt`. Este documento lo mantiene ACC; `INVENTORY.md` y `PROGRESS.md` resumen su estado.

Todos los veredictos son **agent verified**: los verificó el propio agente con la API simulada y fotos de color, sin QA independiente y sin backend real.

## Cómo se verificó

- Capturas de la app con sesión de prueba (`tests/helpers/accFixtures.ts`, con los datos de Figma: María Rojas, pedidos 1042/1038/1021) comparadas contra `get_design_context` y `get_screenshot` de cada frame.
- Medidas reales contra las de Figma con `tests/acc-medidas.spec.ts` (solo corre con `ACC_MEDIDAS=1`). Capturas con `tests/acc-capturas.spec.ts` (solo con `ACC_SHOTS=<carpeta>`).
- En escritorio el header es el compacto de SHELL (`30:1480`); su desplazamiento de unos 4 px respecto de Figma es de SHELL, no de ACC.
- Cada pantalla se capturó, se comparó, se corrigió y se volvió a capturar. Los ajustes de la segunda pasada están en la columna "Diferencias corregidas".

## Pantallas

| Frame | Pantalla | Ruta | Veredicto | Móvil | Escritorio |
| --- | --- | --- | --- | --- | --- |
| `28:1143` | Ingresar | `/login` | **PARTIAL** | medido | sin frame |
| `28:1196` | Mi cuenta · móvil | `/perfil` | **PASS** | medido (0 px de diferencia en los bloques) | ver `30:1479` |
| `30:1479` | Mi cuenta · escritorio | `/perfil` | **PASS** | n/a | comparado con la captura de Figma |
| `28:1310` | Mis pedidos | `/mis-pedidos` | **PASS** | medido (±2 px) | sin frame |
| `29:1434` | Detalle de pedido | `/mis-pedidos?pedido=<numero>` | **PARTIAL** | medido (±2 px) | sin frame |
| `29:1535` | Mis solicitudes | `/servicios?vista=solicitudes` | **PARTIAL** | medido (±2 px) | sin frame |
| `29:1594` | Solicitud cotizada | `/servicios?vista=solicitudes&solicitud=<id>` | **PARTIAL** (partes BLOCKED) | comparado | sin frame |
| `30:1224` | Favoritos | `/wishlist` | **PASS** (reverificado 1-oct-2026) | comparado | sin frame |
| `30:1327` | Mis opiniones | `/perfil?vista=opiniones` | **PARTIAL** | medido (±8 px) | sin frame |
| `30:1400` | Datos y seguridad | `/perfil?vista=seguridad` | **PARTIAL** | medido | sin frame |
| `44:1551` / `44:1580` / `44:1614` | Recuperar contraseña (3 pasos) | `/recuperar-contrasena` | **PASS** | comparado | sin frame |
| `44:1660` | Verificación en dos pasos | `/login` (paso 2FA) | **PARTIAL** | medido (±6 px) | sin frame |
| `44:1701` | Seguimiento sin cuenta | `/seguimiento/:token` | **PASS** | comparado | sin frame |
| `45:1799` | Favoritos vacío | `/wishlist` | **PASS** | comparado | sin frame |
| `45:1848` | Sin pedidos | `/mis-pedidos` | **PASS** | comparado | sin frame |
| `45:1896` | Sin solicitudes | `/servicios?vista=solicitudes` | **PASS** | comparado | sin frame |

Resultado: 11 PASS y 7 PARTIAL. Ninguna pantalla quedó BLOCKED por completo; las partes que sí lo están se detallan abajo.

## Diferencias que quedan, por pantalla

- **Ingresar `28:1143`:** Figma solo dibuja el correo. El paso de contraseña (que el inicio de sesión necesita) aparece al pulsar "Continuar" y **no tiene frame** (REQUIRES_DESIGN_REFERENCE). "Continuar con Google" solo existe si hay Clerk (`VITE_CLERK_PUBLISHABLE_KEY`); sin Clerk no se muestra ni el separador "o con tu correo". Se verificó con un reemplazo temporal que, con el botón, el frame coincide (±2 px). El enlace "Creá una" a `/registro` se agregó al paso 2 porque el backend no permite saber si un correo existe.
- **Detalle de pedido `29:1434`:** Figma muestra un rango ("llega entre el 27 y 29") y el backend entrega una sola fecha estimada (`fechaEntregaEstimada`). El texto es "llega el 29 de set.". La vigencia de la garantía de 40 días se conserva en el atributo del botón (apagado si no aplica).
- **Mis solicitudes `29:1535`:** falta la pestaña "Encargos": el backend no ofrece un listado de encargos del comprador (BLOCKED). "Garantías" lleva a la vista de garantías ya existente. La línea verde "₡24.500 · responder antes del 30 set." muestra la respuesta escrita de HotClick: no hay precio ni vigencia en `SolicitudServicio`.
- **Solicitud cotizada `29:1594`:** BLOCKED por datos: precio cotizado, entrega "3 a 5 días", vigencia, botón "Comprar por ₡X" (requiere flujo de compra de cotización) e historial con fechas intermedias. Se muestra lo que sí existe: lo que pidió (foto, descripción, presupuesto), la respuesta de HotClick, WhatsApp e historial con "Solicitud recibida" y el estado actual.
- **Favoritos `30:1224`:** resuelto en la reverificación del 1-oct-2026 (ver abajo): el corazón de la `ProductCard` se rellena de rojo. La tienda ("Bruma Café") solo aparece en favoritos guardados desde ahora: los guardados antes no la tenían (dato, no diseño).
- **Mis opiniones `30:1327`:** Figma dice "Contá tu experiencia (opcional)", pero el backend exige comentario: se pide y "Publicar" espera calificación y comentario. En móvil el texto de la caja mide 16 px (regla de `index.css` de SHELL) y la tarjeta queda 3 px más alta. Las opiniones publicadas no traen la foto del producto (`mis-testimonios` no manda imagen): se ve un recuadro neutro.
- **Datos y seguridad `30:1400`:** se omitió "Direcciones guardadas": Figma la marca "NUEVO · a confirmar" y no existe en backend. Las filas de nombre, correo y teléfono son de solo lectura (sin chevron): Figma no dibuja pantallas de edición. "Actualizada hace 3 meses" no tiene dato: la fila dice "Cambiar contraseña". El interruptor de dos pasos solo lo puede cambiar el administrador (regla previa): al comprador se le muestra el estado.
- **Verificación `44:1660`:** no se agregó "Confiar en este dispositivo": no hay soporte en el backend (BLOCKED). La fila "Usar otra app autenticadora" se reemplazó por "Usar un código de recuperación", que sí existe; la de correo aparece solo si el usuario tiene ese método. El correo se enmascara como en Figma.
- **Mi cuenta:** en el feed el texto de la solicitud usa lo que el usuario escribió (en Figma es corto). La etiqueta "NUEVO · por programar" no se renderiza. "Llega entre el 28 y 30" también es una sola fecha.

## Reverificación contra Figma (1-oct-2026)

Se recapturaron las 8 pantallas PARTIAL con `tests/acc-capturas.spec.ts` y se compararon contra el frame (captura lado a lado y diferencia de píxeles). Las diferencias que quedan en esas pantallas son de datos de ejemplo, backend, SYS (botones flotantes) o decisiones ya documentadas. Se encontraron y corrigieron diferencias visuales reales:

| Pantalla | Diferencia | Corrección |
| --- | --- | --- |
| Favoritos `30:1224` | El corazón de favorito era de contorno. Figma usa el mismo trazo con relleno `#E73B33` (SVG de `30:1233`) | `components/comprador/ProductCard.tsx` (CAT, evidencia nueva de Figma): `assets/figma/comprador/favorito-activo.svg` cuando `esFavorito`. Alcanza a todas las tarjetas |
| Mis opiniones `30:1327` | El campo "Contá tu experiencia" salía blanco con borde del tema: la regla global de `index.css` fuerza el fondo de todo `textarea` con `!important`. Figma: fondo `n/50`, borde `n/200` | Clase `hc-input-libre` en el textarea; la regla global ahora excluye `textarea.hc-input-libre` (cambio mínimo en `index.css`, de SHELL) |
| Verificación `44:1660` | La casilla activa tenía borde de 1 px y gris (la regla global pisaba el azul); Figma: 2 px `blue/600`. La tarjeta "¿No tenés la app a mano?" tenía 6 px extra sobre el título (filas +5 px) | `hc-input-libre` y `focus:border-2` en `TwoFaCodeInputs` y `CodigoSeisCasillas`; se quitó `pt-[6px]` de `TarjetaOtroMetodo`. Filas a ±1 px |
| Ingresar `28:1143` | La fila de la marca medía 34 y Figma 36: título y beneficios 2 px más arriba | Contenedor `h-9` alrededor de `MarcaComprador`. Títulos y beneficios a 0 px |
| Todas las pantallas con íconos de Mi cuenta | Los íconos (`iconosCuenta.tsx`) tenían trazo de 1,8 unidades en un viewBox de 24 (1,35 px a 18 px de tamaño); Figma dibuja cada ícono a su tamaño con trazo fijo de 2 px | `Trazo` convierte `ancho` (ahora en px, 2 por defecto) a unidades del viewBox. El camión se redibujó con la geometría de Figma (`28:1259`) |

Siguen PARTIAL por causas que no son visuales: login (paso de contraseña sin frame y Google solo con Clerk), detalle de pedido (rango de entrega, backend), solicitudes (pestaña Encargos, backend), cotizada (precio y vigencia, backend), opiniones (comentario exigido por backend y foto del producto), datos y seguridad (direcciones guardadas, filas de solo lectura sin chevron) y verificación ("Confiar en este dispositivo").

Los botones flotantes (isotipo y WhatsApp) tapan parte del contenido en 390 px en detalle de pedido y opiniones: es de SYS (decisión pendiente) y no se tocó.

## P08 · implementación de AUTH (2-oct-2026)

Sin acceso directo a Figma. Referencias `28:1143` (ingresar), `44:1551`, `44:1580` y `44:1614` (recuperar contraseña) y `44:1660` (verificación), con lo que registra este documento.

- **Remedido** con Playwright a 390 y a 1440 (`acc-cuenta.spec.ts`, describe «Login y recuperar: responsive y tokens (P08)»): sin desborde horizontal ni errores de consola.
  - `/login` 390: título en y=125, campo de correo de 15 px, «Continuar» 358x42 en y=454. 1440: columna de 420 px (x=510), título en y=186.
  - `/recuperar-contrasena` 1440: correo de 15 px y casillas de 22 px, como declaran los componentes.
- **Regresión corregida:** a 390, `/recuperar-contrasena` medía el correo en 16 px y las seis casillas en 16 px (los componentes piden 15 y 22). La pantalla no usa `MainLayout`, así que no estaba bajo `.hc-figma-ui` y la regla de 16 px de SHELL (`index.css`, excluye la superficie del comprador) la alcanzaba. La raíz de `RecuperarContrasenaPage` lleva ahora `hc-figma-ui`; queda igual que en escritorio. Mismo costo que asumió SHELL: en iOS esos campos hacen zoom al enfocar.
- **Tokens:** `LoginFormStep` (`placeholder:text-hc-n-400`, separadores `bg-hc-n-400`), `recuperarUi` (`placeholder:text-hc-n-400`), `PasoCodigo` («Reenviar en», `text-hc-n-400`) y `PasoNueva` (requisito sin cumplir, `text-hc-n-400`) en vez de `var(--hc-n-400)`; mismo color, que el spec compara con el token.
- **Sin tocar:** `useLoginFlow`, 2FA, WebAuthn, Turnstile, `SocialLoginButtons` y los servicios de auth. El modal de modo de administrador (sin frame) conserva `style={{ var() }}`; los `shadow-[inset_…var(--hc-blue-600)]` y `color-mix(…var(--hc-danger)…)` no tienen alias.
- **Sin cambio, siguen PARTIAL:** `28:1143` (paso de contraseña y escritorio sin frame, Google solo con Clerk) y `44:1660` («Confiar en este dispositivo», backend; elegir método y código por correo sin frame). Las tres de recuperar siguen PASS.

## Funcionalidad preservada

- **Login:** `useLoginFlow` no se tocó: mismas llamadas, 2FA por app y por correo, códigos de recuperación, WebAuthn, bloqueo y reenvío de verificación, Turnstile, recuperación del carrito y selector de modo de administrador.
- **Mi cuenta:** cargar pedidos, 2FA, solicitudes y productos por opinar; cerrar sesión; cambiar contraseña; activar/desactivar 2FA (administrador); `AdminWebAuthnSetup`; tarjeta "Tu negocio" del emprendedor; testimonio general de la tienda (sin frame, se conserva como tarjeta al final de Mis opiniones).
- **Pedidos:** paginación, agrupación de un pago con varios paquetes, guía y rastreo de Correos (solo https, si no el rastreo oficial), WhatsApp, garantía de 40 días, notificaciones de estado del paquete (enlace "Ver N novedades", fuera de Figma) y "Retiro en tienda".
- **Solicitudes:** misma consulta y refresco; el formulario "Te lo conseguimos", la garantía y el testimonio de Servicios HOT no se tocaron.
- **Favoritos:** el mismo store y los mismos productos; ahora con la `ProductCard` del catálogo.
- **CHK:** sin cambios. Se conserva "Vaciar pedido", WhatsApp en escritorio, guardar por correo, garantía, imprimir y el contexto `CARRITO:items:total`. La suite e2e de CHK pasa junto con la de ACC.

## Defectos previos encontrados y corregidos

1. `ProfilePage` llamaba a `extraerLista` esperando `{ data: [...] }`, pero el interceptor de `api.ts` ya desenvuelve la respuesta: la lista llegaba como arreglo y siempre salía vacía. Solicitudes y productos por opinar nunca aparecían en Mi cuenta.
2. Cerrar sesión desde `/perfil` terminaba en `/login?redirect=/perfil` porque la sesión se limpiaba antes de salir de la ruta protegida. Ahora se limpia al salir.
3. `CodigoSeisCasillas` (recuperar contraseña) perdía dígitos si se tecleaba muy rápido: leía el valor del render anterior.
4. El seguimiento sin cuenta usaba el header global con buscador; Figma `44:1701` usa la barra de marca sin barra inferior.

## Excepciones de ownership (todas aditivas y mínimas)

- `components/comprador/estados/EstadoVacio.tsx` (SYS): props opcionales `tono` (neutro, azul, rojo) y `espaciado="cuenta"`. El uso de SYS no cambia.
- `components/comprador/ProductCard.tsx` (CAT): corazón relleno en favoritos (reverificación del 1-oct-2026, Figma `30:1224`).
- `index.css` (SHELL): `hc-input-libre` también exime a `textarea`.
- `store/wishlistStore.ts` y `types/carrito.ts`: `ItemWishlist.empresaNombre` (opcional) para mostrar la tienda.
- `components/auth/SocialLoginButtons.tsx`: `variante="figma"` (solo el botón de Google), misma lógica de Clerk.
- `pages/ServiciosHotPage.tsx` (SRV): el componente existente pasa a `ServiciosHotVistas` y el nuevo `default` decide: `?vista=solicitudes` abre Mis solicitudes (ACC); `?vista=busqueda|garantia|testimonio` abre esa vista directo. Sin parámetros se comporta igual.
- No se tocó `AppRoutes`, SHELL, `index.css` ni los tokens. Se evitaron rutas nuevas con parámetros de consulta (`?vista=`, `?pedido=`, `?solicitud=`).

## Componentes eliminados (sin uso tras la migración)

`ProfileHeader` (queda `EmpresaCard`), `ProfileOrdersCard`, `ProfileSecurityCard`, `OpinionesSection`, `ResenaForm`, `TestimonioForm`, `PedidoActivoCard`, `ActividadReciente`, `ImagenPicker`, `EnvioOpinionOk`, `actividadRecienteHelpers` (y su prueba), `OrderCard`, `PedidoGrupoCard`, `NotificacionesTab`, `GarantiaBar`, `PedidoTimeline`, `IconoEstadoPedido`, y los helpers de `perfilHelpers` que solo ellos usaban. Se conserva `servicios/ListaSolicitudes` (aún la usa la pestaña de Servicios HOT, de SRV).

## Dependencias pendientes

- **SHELL:** `ReturnVisitorBanner` aparece sobre Mi cuenta y sus subpantallas y no está en Figma; `BarraInferior` decide la pestaña solo por ruta, así que `/servicios?vista=solicitudes` no marca "Cuenta" (Figma `29:1535` sí); la regla global que fuerza 16 px en inputs móviles; falta el alias de Tailwind `--color-hc-n-400` (se usa `var(--hc-n-400)`); falta la variante de fondo blanco de `MainLayout` para los estados vacíos (se usa un contenedor blanco).
- **SYS / diseño:** la fila "Idioma y accesibilidad" de Mi cuenta (SYS la pidió a ACC): ningún frame de Figma la dibuja, así que **no se inventó**. Hasta que exista el frame, el botón flotante de accesibilidad sigue visible.
- **CAT:** `autoQuery` del asistente global (ya documentado, decisión 28): no lo toca ACC.
- **Backend:** precio, vigencia y entrega de las cotizaciones de búsqueda; listado de encargos del comprador; "Confiar en este dispositivo" para 2FA; direcciones guardadas; fecha del último cambio de contraseña; imagen del producto en `mis-testimonios`; rango de entrega en pedidos; edición de nombre y teléfono desde Mi cuenta (existe `PUT /usuarios/{id}`, falta el diseño).
- **Diseño (REQUIRES_DESIGN_REFERENCE):** escritorio de login, pedidos, detalle, favoritos, solicitudes y verificación; el paso de contraseña del login; la lista de garantías de Mis solicitudes.

## Verificación final

- `tsc --noEmit`: limpio.
- `vitest run`: 92 archivos, 437 tests en verde (nuevos: `cuentaHelpers`, `pedidoVistaHelpers`, `solicitudesHelpers`, `correoEnmascarado`).
- eslint sobre los archivos tocados y nuevos: limpio.
- `vite build` (a una carpeta temporal): correcto.
- e2e Playwright contra Vite: `acc-cuenta` (23), `mis-pedidos`, `wishlist-cta` y `wishlist-placeholder` (actualizados al diseño nuevo) y la suite de CHK (`cart-cta`, `checkout-cta`, `pdp-agregar-hoja`, `chk-restauraciones`, `pago-loading`, `visitante-compra`): 57 pruebas, todas verdes.
- **Errores previos, no introducidos por ACC:** `bottom-nav.spec.ts` (3 pruebas del diseño anterior de la barra inferior, de SHELL) ya fallaba en `base`; lo mismo `asistente-checkout` y `envio-rapido` (CHK/CAT). `mis-pedidos`, `wishlist-cta` y `wishlist-placeholder` también fallaban en `base` y se actualizaron aquí porque son de ACC.
