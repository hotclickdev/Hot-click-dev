# ACC · Cuenta, acceso, pedidos, favoritos y solicitudes

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
| `30:1224` | Favoritos | `/wishlist` | **PARTIAL** | comparado | sin frame |
| `30:1327` | Mis opiniones | `/perfil?vista=opiniones` | **PARTIAL** | medido (±8 px) | sin frame |
| `30:1400` | Datos y seguridad | `/perfil?vista=seguridad` | **PARTIAL** | medido | sin frame |
| `44:1551` / `44:1580` / `44:1614` | Recuperar contraseña (3 pasos) | `/recuperar-contrasena` | **PASS** | comparado | sin frame |
| `44:1660` | Verificación en dos pasos | `/login` (paso 2FA) | **PARTIAL** | medido (±6 px) | sin frame |
| `44:1701` | Seguimiento sin cuenta | `/seguimiento/:token` | **PASS** | comparado | sin frame |
| `45:1799` | Favoritos vacío | `/wishlist` | **PASS** | comparado | sin frame |
| `45:1848` | Sin pedidos | `/mis-pedidos` | **PASS** | comparado | sin frame |
| `45:1896` | Sin solicitudes | `/servicios?vista=solicitudes` | **PASS** | comparado | sin frame |

Resultado: 10 PASS y 8 PARTIAL. Ninguna pantalla quedó BLOCKED por completo; las partes que sí lo están se detallan abajo.

## Diferencias que quedan, por pantalla

- **Ingresar `28:1143`:** Figma solo dibuja el correo. El paso de contraseña (que el inicio de sesión necesita) aparece al pulsar "Continuar" y **no tiene frame** (REQUIRES_DESIGN_REFERENCE). "Continuar con Google" solo existe si hay Clerk (`VITE_CLERK_PUBLISHABLE_KEY`); sin Clerk no se muestra ni el separador "o con tu correo". Se verificó con un reemplazo temporal que, con el botón, el frame coincide (±2 px). El enlace "Creá una" a `/registro` se agregó al paso 2 porque el backend no permite saber si un correo existe.
- **Detalle de pedido `29:1434`:** Figma muestra un rango ("llega entre el 27 y 29") y el backend entrega una sola fecha estimada (`fechaEntregaEstimada`). El texto es "llega el 29 de set.". La vigencia de la garantía de 40 días se conserva en el atributo del botón (apagado si no aplica).
- **Mis solicitudes `29:1535`:** falta la pestaña "Encargos": el backend no ofrece un listado de encargos del comprador (BLOCKED). "Garantías" lleva a la vista de garantías ya existente. La línea verde "₡24.500 · responder antes del 30 set." muestra la respuesta escrita de HotClick: no hay precio ni vigencia en `SolicitudServicio`.
- **Solicitud cotizada `29:1594`:** BLOCKED por datos: precio cotizado, entrega "3 a 5 días", vigencia, botón "Comprar por ₡X" (requiere flujo de compra de cotización) e historial con fechas intermedias. Se muestra lo que sí existe: lo que pidió (foto, descripción, presupuesto), la respuesta de HotClick, WhatsApp e historial con "Solicitud recibida" y el estado actual.
- **Favoritos `30:1224`:** el corazón de la `ProductCard` no se rellena de rojo cuando el producto es favorito (la tarjeta solo cambia el color de un ícono de contorno). Es de CAT. La tienda ("Bruma Café") solo aparece en favoritos guardados desde ahora: los guardados antes no la tenían.
- **Mis opiniones `30:1327`:** Figma dice "Contá tu experiencia (opcional)", pero el backend exige comentario: se pide y "Publicar" espera calificación y comentario. En móvil el texto de la caja mide 16 px (regla de `index.css` de SHELL) y la tarjeta queda 3 px más alta. Las opiniones publicadas no traen la foto del producto (`mis-testimonios` no manda imagen): se ve un recuadro neutro.
- **Datos y seguridad `30:1400`:** se omitió "Direcciones guardadas": Figma la marca "NUEVO · a confirmar" y no existe en backend. Las filas de nombre, correo y teléfono son de solo lectura (sin chevron): Figma no dibuja pantallas de edición. "Actualizada hace 3 meses" no tiene dato: la fila dice "Cambiar contraseña". El interruptor de dos pasos solo lo puede cambiar el administrador (regla previa): al comprador se le muestra el estado.
- **Verificación `44:1660`:** no se agregó "Confiar en este dispositivo": no hay soporte en el backend (BLOCKED). La fila "Usar otra app autenticadora" se reemplazó por "Usar un código de recuperación", que sí existe; la de correo aparece solo si el usuario tiene ese método. El correo se enmascara como en Figma.
- **Mi cuenta:** en el feed el texto de la solicitud usa lo que el usuario escribió (en Figma es corto). La etiqueta "NUEVO · por programar" no se renderiza. "Llega entre el 28 y 30" también es una sola fecha.

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
- `store/wishlistStore.ts` y `types/carrito.ts`: `ItemWishlist.empresaNombre` (opcional) para mostrar la tienda.
- `components/auth/SocialLoginButtons.tsx`: `variante="figma"` (solo el botón de Google), misma lógica de Clerk.
- `pages/ServiciosHotPage.tsx` (SRV): el componente existente pasa a `ServiciosHotVistas` y el nuevo `default` decide: `?vista=solicitudes` abre Mis solicitudes (ACC); `?vista=busqueda|garantia|testimonio` abre esa vista directo. Sin parámetros se comporta igual.
- No se tocó `AppRoutes`, SHELL, `index.css` ni los tokens. Se evitaron rutas nuevas con parámetros de consulta (`?vista=`, `?pedido=`, `?solicitud=`).

## Componentes eliminados (sin uso tras la migración)

`ProfileHeader` (queda `EmpresaCard`), `ProfileOrdersCard`, `ProfileSecurityCard`, `OpinionesSection`, `ResenaForm`, `TestimonioForm`, `PedidoActivoCard`, `ActividadReciente`, `ImagenPicker`, `EnvioOpinionOk`, `actividadRecienteHelpers` (y su prueba), `OrderCard`, `PedidoGrupoCard`, `NotificacionesTab`, `GarantiaBar`, `PedidoTimeline`, `IconoEstadoPedido`, y los helpers de `perfilHelpers` que solo ellos usaban. Se conserva `servicios/ListaSolicitudes` (aún la usa la pestaña de Servicios HOT, de SRV).

## Dependencias pendientes

- **SHELL:** `ReturnVisitorBanner` aparece sobre Mi cuenta y sus subpantallas y no está en Figma; `BarraInferior` decide la pestaña solo por ruta, así que `/servicios?vista=solicitudes` no marca "Cuenta" (Figma `29:1535` sí); la regla global que fuerza 16 px en inputs móviles; falta el alias de Tailwind `--color-hc-n-400` (se usa `var(--hc-n-400)`); falta la variante de fondo blanco de `MainLayout` para los estados vacíos (se usa un contenedor blanco).
- **SYS / diseño:** la fila "Idioma y accesibilidad" de Mi cuenta (SYS la pidió a ACC): ningún frame de Figma la dibuja, así que **no se inventó**. Hasta que exista el frame, el botón flotante de accesibilidad sigue visible.
- **CAT:** corazón relleno en `ProductCard` para favoritos. `autoQuery` del asistente global (ya documentado, decisión 28): no lo toca ACC.
- **Backend:** precio, vigencia y entrega de las cotizaciones de búsqueda; listado de encargos del comprador; "Confiar en este dispositivo" para 2FA; direcciones guardadas; fecha del último cambio de contraseña; imagen del producto en `mis-testimonios`; rango de entrega en pedidos; edición de nombre y teléfono desde Mi cuenta (existe `PUT /usuarios/{id}`, falta el diseño).
- **Diseño (REQUIRES_DESIGN_REFERENCE):** escritorio de login, pedidos, detalle, favoritos, solicitudes y verificación; el paso de contraseña del login; la lista de garantías de Mis solicitudes.

## Verificación final

- `tsc --noEmit`: limpio.
- `vitest run`: 92 archivos, 437 tests en verde (nuevos: `cuentaHelpers`, `pedidoVistaHelpers`, `solicitudesHelpers`, `correoEnmascarado`).
- eslint sobre los archivos tocados y nuevos: limpio.
- `vite build` (a una carpeta temporal): correcto.
- e2e Playwright contra Vite: `acc-cuenta` (23), `mis-pedidos`, `wishlist-cta` y `wishlist-placeholder` (actualizados al diseño nuevo) y la suite de CHK (`cart-cta`, `checkout-cta`, `pdp-agregar-hoja`, `chk-restauraciones`, `pago-loading`, `visitante-compra`): 57 pruebas, todas verdes.
- **Errores previos, no introducidos por ACC:** `bottom-nav.spec.ts` (3 pruebas del diseño anterior de la barra inferior, de SHELL) ya fallaba en `base`; lo mismo `asistente-checkout` y `envio-rapido` (CHK/CAT). `mis-pedidos`, `wishlist-cta` y `wishlist-placeholder` también fallaban en `base` y se actualizaron aquí porque son de ACC.
