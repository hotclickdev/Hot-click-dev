# Inventario de migración Figma → frontend

Fuente única de coordinación. Archivo Figma `TmxYFj2nauu10WZnZ0t6yt`, página "Home de compra · prototipo" (`4:2`).
Última actualización: 2026-09-30 (Fase 2: integración de PR #93, SHELL y Home movidos a sus ramas).

## Resumen

| Estado | Cantidad |
| --- | --- |
| PASS | 10 |
| PARTIAL | 11 |
| OLD_DESIGN | 4 |
| MISSING | 0 |
| BLOCKED | 0 |
| UNKNOWN | 65 |
| **Total pantallas** | **90** |

PASS solo se marca cuando hay implementación completa, comparación visual **y** medidas en píxeles, responsive, estados, tests, typecheck y build. **Los PASS de CAT y PROD son el veredicto de cada agente, medido con API simulada y fotos de color; aún no tienen QA independiente** (SHELL sí lo tuvo). Falta verificarlos con datos reales.

No hay frames de tablet. Desktop existe solo para: Home (9:171), Catálogo, Ficha, Perfil del negocio, Carrito, Checkout y Mi cuenta. El resto es móvil 390.

## Infraestructura compartida

| Elemento | Rama | Estado |
| --- | --- | --- |
| Base: master + fase 2 (PR #93) | `feat/figma/base` | Integrada. Frontend: tsc limpio, 354 tests. Backend: ver PROGRESS.md |
| SHELL: `MainLayout` con variantes `raiz`, `interna`, `marca`, `propia` y tres headers desktop | `feat/figma/shell` | Integrado en `feat/figma/base` (merge `b3159c1e`). Medido contra Figma (alturas 111, 79, 71, 160, 51, 53, 67) y con QA independiente |
| Home | `feat/figma/home` | Base integrada (merge `98ec9abc`), cuerpo remedido y corregido (`6d0de288`). tsc limpio, 358 tests, build OK. Los tres frames siguen en PARTIAL por diferencias fuera de HOME (ver filas) |
| CAT C0: `comprador/ProductCard` 167x280 y `formatPrice` con punto de miles | `feat/figma/cat` | Hecho y medido (commits `a2996613`, `579f01a7`, `9881860a`), integrado en `feat/figma/base` (merge `9f11c9a7`). Ver `CAT_C0.md`. C1 a C5 sin empezar |
| CAT C1 a C5 y pantallas de buscar y explorar | `feat/figma/cat` | Hecho (18 commits), integrado en `feat/figma/base` (merge `1cd7721a`). Catálogo con columnas fijas de 167; tarjeta antigua, quick view, Ofertas HOT y Emprendimientos eliminados. Ver `CAT_C1_C5.md` |
| PROD: ficha de producto | `feat/figma/prod` | Hecho (4 commits), integrado en `feat/figma/base` (merge `a44632a6`). Ficha rediseñada; 5 pantallas PARTIAL por diferencias deliberadas. Ver `PROD.md` |

## Cómo leer la evidencia

- **V**: comparado visualmente contra Figma en una auditoría (captura de la app vs captura del frame).
- **C**: inferido por código y rutas; no comparado visualmente.
- **H**: dato tomado de los HANDOFF_*.md del repo; no verificado.
- **M**: medido en píxeles contra Figma con Playwright, fuentes reales cargadas y API simulada (sin backend real).
- **B**: la pantalla ya está en `feat/figma/base` (recuperada del PR #93); solo falta compararla contra Figma.

**UNKNOWN no significa correcto**: significa que aún no se comparó. Cada agente debe convertir sus UNKNOWN en PASS, PARTIAL u OLD_DESIGN antes de implementar. Muchas necesitan fixtures (carrito con productos, sesión iniciada, pedido con paquetes).

## Pantallas

| Sección | Pantalla | Frame Figma | Ruta | Estado | Evidencia | Desktop | Mobile | Agente |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 01 Inicio | Home · móvil 390 | `7:2` | / | PARTIAL | M. Remedido en píxeles con fuentes reales y API simulada: header, hero, secciones, Seguí, categorías, asistente y confianza coinciden con Figma (±1 px); corregido en `6d0de288`. El ProductCard (C0) y el formato de precio `₡6.200` ya coinciden con Figma. Pendiente fuera de HOME: FAB y botón de WhatsApp flotantes no están en Figma (SYS). No verificado: fotos reales, badge "Quedan N", badge del carrito | no | sí | HOME |
| 01 Inicio | Home móvil · al scrollear | `12:346` | / | PARTIAL | M. Header sticky en y=0, alto 160 y sombra `0 4px 12px rgba(20,23,28,.1)` idénticos a Figma; barra inferior y=777 alto 67. Mismas pendientes externas que `7:2` | no | sí | HOME |
| 01 Inicio | Home · desktop 1440 | `9:171` | / | PARTIAL | M. Remedido: hero 572, título 420x84, chips 33, secciones en y=683/933/1128, confianza 208, altura total 1857, igual a Figma (con el ProductCard de C0; antes 1855). Fuente de verdad del Home desktop (decisión del usuario). Mismas pendientes externas que `7:2`. Copy resuelto por el usuario: "Solo aparece si ya visitaste productos" es anotación de diseño y se mantiene "Lo último que miraste". Abierto: orden de categorías (Figma fija uno, la app respeta el de la API) | sí | no | HOME |
| 01 Inicio | Búsqueda activa · móvil | `8:163` | (overlay) SearchPanel | PASS | M (CAT). Campo 330x42 en (44,12), asistente y=70, filas de 64, pie 57. Sugerencias dependen de datos (hoy salen de nombres de producto). Sin QA independiente | no | sí | CAT |
| 01 Inicio | Asistente · respuesta · móvil | `8:230` | (overlay) chat asistente | PARTIAL | M (CAT). Hoja inferior, burbuja, productos en fila con Agregar. Falta la fila "Entendí:" (el backend no manda los filtros interpretados) | no | sí | CAT |
| 02 Buscar y explorar | Resultados de búsqueda · móvil | `26:722` | /productos?search= | PASS | M (CAT). Encabezado 116, buscador 326x46, tarjetas 167x280 desde y=158, asistente 358x73. Sin QA independiente | no | sí | CAT |
| 02 Buscar y explorar | Filtros · hoja · móvil | `26:887` | /productos (hoja) | PASS | M (CAT). Hoja propia (HojaFiltros): cajas de precio 50, secciones 135, pie 82, rango con dos tiradores. Estado con tiendas marcadas verificado solo en código | no | sí | CAT |
| 02 Buscar y explorar | Sin resultados · móvil | `27:804` | /productos?search= | PASS | M (CAT). Ícono 64, título y=167, botones y=351 y 540, "Mientras tanto" y=632 | no | sí | CAT |
| 02 Buscar y explorar | Búsqueda por foto · móvil | `27:882` | /buscar/foto | PARTIAL | M (CAT). Barra interna, ícono, tienda y rótulo "Misma categoría". Falta la etiqueta "NUEVO · por programar" (tomada por anotación de diseño); tienda y categoría dependen del backend | no | sí | CAT |
| 02 Buscar y explorar | Descubrí · móvil | `27:939` | /descubri | PASS | M (CAT). Cartas y botones en las posiciones de Figma. Agrega "Deshacer la última" (decisión del usuario pendiente). Swipe táctil no verificado | no | sí | CAT |
| 02 Buscar y explorar | Catálogo · desktop | `30:1824` | /productos | PASS | M (CAT). Título (120,135), filtros 260 en (120,255), tarjetas de 167 desde (412,255) con paso 183, relacionadas y=636. Columnas fijas de 167 (decisión con evidencia, ver CAT_C1_C5.md) | sí | no | CAT |
| 02 Buscar y explorar | Categorías · móvil | `43:1454` | /categorias | PASS | M (CAT). Barra propia con buscador, chip del asistente, tiles 167 | no | sí | CAT |
| 02 Buscar y explorar | Categoría abierta · Hogar · móvil | `43:1530` | /productos?cat= | PASS | M (CAT). Título (48,12), buscador 358x42, chips y=104, tarjetas y=189. Sin chip "Con stock" (decisión del usuario pendiente) | no | sí | CAT |
| 03 Producto y tiendas | Ficha de producto · móvil | `28:839` | /productos/:id | PARTIAL | M (PROD). Alto de página 1522 igual a Figma (antes 1955); título 442, precio 480, entrega y pago 610, barra fija y=761. Quita "Comprar ahora", confianza y garantía (decisión del usuario pendiente). Ver PROD.md | no | sí | PROD |
| 03 Producto y tiendas | Perfil del negocio · móvil | `29:922` | /tienda/:slug | UNKNOWN | H (M hizo SEO y "Sobre nosotros"); sin comparar | no | sí | STORE |
| 03 Producto y tiendas | Directorio de emprendimientos · móvil | `29:1159` | /emprendimientos | OLD_DESIGN | H+C. 0 tokens nuevos; el directorio real necesita endpoint nuevo | no | sí | STORE |
| 03 Producto y tiendas | Ficha de producto · desktop | `29:2072` | /productos/:id | PARTIAL | M (PROD). Foto 560x560 en x=204, título/precio y=210/264, acciones 394, entrega y pago 462, opiniones 781. Anchos de Sora ±2 px. Ver PROD.md | sí | no | PROD |
| 03 Producto y tiendas | Perfil del negocio · desktop | `29:2308` | /tienda/:slug | UNKNOWN | C | sí | no | STORE |
| 03 Producto y tiendas | Ficha con variantes · móvil | `44:1775` | /productos/:id | PARTIAL | M (PROD). Título 376, swatches 34 px, talla 597, chips 623. Se conserva el stepper que Figma omite (decisión pendiente) | no | sí | PROD |
| 03 Producto y tiendas | Ficha producto personalizado · móvil | `44:1849` | /productos/:id | PARTIAL | M (PROD). Etiqueta, título y vendedor idénticos; panel 27 px más arriba porque no se muestra "Elaboración" (falta dato). Sin stepper | no | sí | PROD |
| 03 Producto y tiendas | Ficha agotada · móvil | `44:1917` | /productos/:id (ProductAgotado) | PARTIAL | M (PROD). Etiqueta 376; chip y carrusel 14 px más arriba porque no se pinta "NUEVO · por programar". Foto atenuada al 35 % contra el rectángulo blanco opaco de Figma (decisión pendiente) | no | sí | PROD |
| 03 Producto y tiendas | Galería a pantalla completa · móvil | `55:2167` | /productos/:id (overlay) | PASS | M (PROD). Cerrar 40 en (16,10), visor 390x520, pista 560, miniaturas 64, contador "1 / 4 · 2×". Solo existe frame móvil | no | sí | PROD |
| 03 Producto y tiendas | Galería · foto ampliada · móvil | `55:2191` | /productos/:id (overlay) | PASS | M (PROD). Foto ampliada verificada con la galería a pantalla completa. Solo existe frame móvil | no | sí | PROD |
| 04 Comprar | 1 · Carrito · móvil | `28:989` | /carrito | UNKNOWN | C. Captura con carrito vacío; requiere fixture | no | sí | CHK |
| 04 Comprar | 2 · Checkout · Datos · móvil | `28:1083` | /checkout | UNKNOWN | C. Requiere fixture | no | sí | CHK |
| 04 Comprar | 3 · Checkout · Entrega · móvil | `29:1248` | /checkout | UNKNOWN | C. Requiere fixture | no | sí | CHK |
| 04 Comprar | 4 · Checkout · Pago · móvil | `29:1344` | /checkout | UNKNOWN | C. Requiere fixture | no | sí | CHK |
| 04 Comprar | 5 · Pago exitoso · móvil | `29:1932` | /pago/exito | UNKNOWN | V parcial: sin pedido muestra un error, no el éxito; requiere fixture | no | sí | CHK |
| 04 Comprar | 6 · Pago fallido · móvil | `29:1999` | /pago/cancelado | UNKNOWN | V parcial: requiere fixture | no | sí | CHK |
| 04 Comprar | 7 · Recuperar carrito · móvil | `29:2036` | /recuperar-carrito/:token | UNKNOWN | C | no | sí | CHK |
| 04 Comprar | 8 · Carrito · desktop | `30:2268` | /carrito | UNKNOWN | C. Requiere fixture | sí | no | CHK |
| 04 Comprar | 9 · Checkout · desktop | `30:2385` | /checkout | UNKNOWN | C. Requiere fixture | sí | no | CHK |
| 04 Comprar | Vendedor · despachar paquete · móvil | `37:1780` | /emprendedor/* (pedidos) | UNKNOWN | H (N dejó el frontend incompleto) | no | sí | CHK |
| 04 Comprar | Agregado a tu pedido · hoja · móvil | `45:1607` | (hoja) useAgregarAlPedido | UNKNOWN | C | no | sí | CHK |
| 04 Comprar | Pago pendiente de verificación · SINPE | `45:1640` | /checkout (estado) | UNKNOWN | C | no | sí | CHK |
| 04 Comprar | Pago · tarjeta de regalo válida | `55:2220` | /checkout (estado) | UNKNOWN | C. Existe CheckoutPaidGiftCard | no | sí | CHK |
| 04 Comprar | Pago · tarjeta de regalo inválida | `55:2284` | /checkout (estado) | UNKNOWN | B. Recuperada en feat/figma/base (merge del PR #93); falta comparar contra Figma | no | sí | CHK |
| 05 Cuenta | Ingresar · móvil | `28:1143` | /login | OLD_DESIGN | V. Figma: "Ingresá o creá tu cuenta" con correo y Google; código: "Bienvenido de vuelta" con contraseña | no | sí | ACC |
| 05 Cuenta | Mi cuenta · móvil | `28:1196` | /perfil | UNKNOWN | C. Requiere sesión | no | sí | ACC |
| 05 Cuenta | Mis pedidos · móvil | `28:1310` | /mis-pedidos | UNKNOWN | C. Requiere sesión | no | sí | ACC |
| 05 Cuenta | Detalle de pedido · móvil | `29:1434` | (sin ruta clara) | UNKNOWN | C. No encontré ruta de detalle; verificar | no | sí | ACC |
| 05 Cuenta | Mis solicitudes · móvil | `29:1535` | /servicios (vista) | UNKNOWN | C | no | sí | ACC |
| 05 Cuenta | Solicitud cotizada · móvil | `29:1594` | /servicios (vista) | UNKNOWN | C | no | sí | ACC |
| 05 Cuenta | Favoritos · móvil | `30:1224` | /wishlist | UNKNOWN | C | no | sí | ACC |
| 05 Cuenta | Mis opiniones · móvil | `30:1327` | /perfil (OpinionesSection) | UNKNOWN | C | no | sí | ACC |
| 05 Cuenta | Datos y seguridad · móvil | `30:1400` | /perfil (ProfileSecurityCard) | UNKNOWN | C | no | sí | ACC |
| 05 Cuenta | Mi cuenta · desktop | `30:1479` | /perfil | UNKNOWN | C | sí | no | ACC |
| 05 Cuenta | Recuperar contraseña · 1 correo | `44:1551` | /recuperar-contrasena | UNKNOWN | B. Recuperada en feat/figma/base (merge del PR #93); falta comparar contra Figma. Antes de la fase 2 la ruta caía en 404 | no | sí | ACC |
| 05 Cuenta | Recuperar contraseña · 2 código | `44:1580` | /recuperar-contrasena | UNKNOWN | B. Recuperada en feat/figma/base (merge del PR #93); falta comparar contra Figma | no | sí | ACC |
| 05 Cuenta | Recuperar contraseña · 3 nueva | `44:1614` | /recuperar-contrasena | UNKNOWN | B. Recuperada en feat/figma/base (merge del PR #93); falta comparar contra Figma | no | sí | ACC |
| 05 Cuenta | Verificación en dos pasos · móvil | `44:1660` | /login (TwoFa*) | UNKNOWN | C | no | sí | ACC |
| 05 Cuenta | Seguimiento de pedido sin cuenta | `44:1701` | /seguimiento/:token | UNKNOWN | B. Recuperada en feat/figma/base (merge del PR #93); falta comparar contra Figma | no | sí | ACC |
| 06 Servicios y ayuda | Servicios HOT · inicio · móvil | `28:1429` | /servicios | OLD_DESIGN | V. Figma: lista de 4 opciones; código: tarjetas grandes con foto | no | sí | SRV |
| 06 Servicios y ayuda | Te lo conseguimos · formulario | `28:1486` | /servicios (vista) | UNKNOWN | C | no | sí | SRV |
| 06 Servicios y ayuda | Solicitud de garantía · móvil | `28:1531` | /servicios (vista) | UNKNOWN | C | no | sí | SRV |
| 06 Servicios y ayuda | Encargo · seguimiento público | `28:1594` | /encargo/:token | UNKNOWN | C | no | sí | SRV |
| 06 Servicios y ayuda | Página informativa · plantilla (Envíos) | `28:1660` | /envios, /devoluciones, /informacion | OLD_DESIGN | H+C. Decisión previa: no se reescribieron; existe PaginaInformativa | no | sí | SRV |
| 06 Servicios y ayuda | Cotización pública · móvil | `55:2332` | /cotizacion/:token | UNKNOWN | C | no | sí | SRV |
| 08 QR y correos | QR de mesa · menú | `29:1650` | (ruta por confirmar) | UNKNOWN | C. No encontré la ruta | no | sí | QR |
| 08 QR y correos | QR de mesa · pedido enviado | `29:1741` | (ruta por confirmar) | UNKNOWN | C | no | sí | QR |
| 08 QR y correos | QR de pago en caja · elegir método | `29:1781` | /pos/pago/:token | UNKNOWN | H (sin cambios por P) | no | sí | QR |
| 08 QR y correos | QR de pago · SINPE en curso | `29:1830` | /pos/pago/:token | UNKNOWN | C | no | sí | QR |
| 08 QR y correos | QR de pago · pagado | `29:1888` | /pos/pago/:token | UNKNOWN | C | no | sí | QR |
| 08 QR y correos | QR de pago · vencido | `29:1913` | /pos/pago/:token | UNKNOWN | C | no | sí | QR |
| 08 QR y correos | Correo · Confirmación de pedido | `30:1599` | backend EmailLayoutHelper | UNKNOWN | H (P). Backend, no se ve en navegador | no | n/a | QR |
| 08 QR y correos | Correo · Guía asignada | `30:1643` | backend | UNKNOWN | H (P) | no | n/a | QR |
| 08 QR y correos | Correo · Seguimiento de estado | `30:1669` | backend | UNKNOWN | H (P) | no | n/a | QR |
| 08 QR y correos | Correo · Pago fallido | `30:1708` | backend | UNKNOWN | H (P) | no | n/a | QR |
| 08 QR y correos | Correo · Recuperación de carrito | `30:1733` | backend | UNKNOWN | H (P) | no | n/a | QR |
| 08 QR y correos | Correo · Cupón de bienvenida | `30:1768` | backend | UNKNOWN | H (P) | no | n/a | QR |
| 08 QR y correos | Correo · Código de verificación | `30:1793` | backend | UNKNOWN | H (P) | no | n/a | QR |
| 09 Funciones existentes | A · Carrito · notas, gift card, WhatsApp, guardar y asistente | `51:1820` | /carrito | UNKNOWN | C. Requiere fixture | no | sí | CHK |
| 09 Funciones existentes | B · Checkout · Entrega · envío internacional | `51:2000` | /checkout | UNKNOWN | C. Requiere fixture | no | sí | CHK |
| 09 Funciones existentes | C · Cupón de bienvenida · hoja | `51:2163` | PromoWelcomePopup | UNKNOWN | C | no | sí | SYS |
| 09 Funciones existentes | D · ¿Aún pensando? · salida · hoja | `51:2196` | ExitIntentModal | UNKNOWN | C | no | sí | SYS |
| 09 Funciones existentes | E · Idioma y accesibilidad · hoja | `51:2229` | AccessibilityPanel / LanguageSelector | UNKNOWN | C | no | sí | SYS |
| 09 Funciones existentes | F · Botón flotante de WhatsApp · Home | `51:2262` | WhatsAppFab | UNKNOWN | C. En Home hoy aparece un botón flotante con el isotipo, no el de WhatsApp | no | sí | SYS |
| 09 Funciones existentes | G · Tienda con su color · perfil del negocio | `51:2468` | /tienda/:slug | UNKNOWN | C | no | sí | STORE |
| 10 Estados del sistema | Carrito vacío · móvil | `45:1692` | /carrito | UNKNOWN | V parcial: existe estado vacío con "Explorar productos"; sin comparar contra el frame | no | sí | CHK |
| 10 Estados del sistema | Favoritos vacío · móvil | `45:1799` | /wishlist | UNKNOWN | H (O) | no | sí | ACC |
| 10 Estados del sistema | Sin pedidos · móvil | `45:1848` | /mis-pedidos | UNKNOWN | H (O) | no | sí | ACC |
| 10 Estados del sistema | Sin solicitudes · móvil | `45:1896` | /servicios (vista) | UNKNOWN | H (O) | no | sí | ACC |
| 10 Estados del sistema | Aviso de cookies · sobre el Home | `45:1946` | CookieBanner | UNKNOWN | C | no | sí | SYS |
| 10 Estados del sistema | Preferencias de cookies · hoja | `45:2166` | CookiesPage / hoja | UNKNOWN | C | no | sí | SYS |
| 10 Estados del sistema | Página no encontrada · móvil | `45:2198` | * (NotFoundPage) | PARTIAL | V. Contenido correcto; falta shell mínimo (sin buscador/chips/banner) y sobran chevrons | no | sí | SYS |
| 10 Estados del sistema | Sin conexión · móvil | `45:2264` | OfflineBanner | UNKNOWN | C | no | sí | SYS |
| 10 Estados del sistema | Fallo del servidor · móvil | `45:2322` | (error boundary) | UNKNOWN | B. Recuperada en feat/figma/base (merge del PR #93); falta comparar contra Figma | no | sí | SYS |
| 10 Estados del sistema | Instalar la app · tarjeta · móvil | `55:2658` | (PWA) | UNKNOWN | B. Recuperada en feat/figma/base (merge del PR #93); falta comparar contra Figma | no | sí | SYS |
| 11 Contenido y SEO | Blog · listado · móvil | `54:2126` | /blog | UNKNOWN | C. Sin tokens nuevos | no | sí | SRV |
| 11 Contenido y SEO | Blog · artículo · móvil | `54:2219` | /blog/:slug | UNKNOWN | C | no | sí | SRV |

## Pantallas por agente

| Agente | Pantallas |
| --- | --- |
| HOME | 3 |
| CAT | 10 |
| PROD | 7 |
| STORE | 4 |
| CHK | 17 |
| ACC | 18 |
| SRV | 8 |
| QR | 13 |
| SYS | 10 |

## Referencias y notas (no cuentan como pantallas)

| Sección | Elemento | Frame | Nota |
| --- | --- | --- | --- |
| 00 Sistema de diseño | Assets (fotos reales del catálogo) | 4:3 | Referencia, no es pantalla |
| 00 Sistema de diseño | Componentes | 5:22 | Referencia: Chip, ProductCard, CategoryTile ya en components/comprador |
| 00 Sistema de diseño | Aviso · compra en varios emprendimientos (componente) | 40:1350 | Componente AvisoVariosEmprendimientos ya existe |
| 07 Mapa del flujo | Mapa | 34:1355 | Referencia del flujo |
| Notas | Notas de diseño (rotativa, SEO perfil, correos, funciones por aprobar, SEO blog) | 23:846, 29:1148, 30:1816, 51:2584, 54:2302 | Anotaciones, no pantallas |
| 01 Inicio | Home desktop · al scrollear | 12:610 | Ya no es objetivo (decisión 2026-09-30): contradice a 9:171 en el campo rotativo del asistente. Se usa 9:171 |

## Anotaciones de diseño que NO deben llegar a la interfaz

Figma usa la etiqueta **"NUEVO · por programar"** y textos en mono como "Se muestra con 2 o más emprendimientos en el carrito" para marcar qué funciones aún no existen. Son notas para el equipo, no copy para el comprador. Ningún agente debe renderizarlas. Defecto ya detectado: `FormularioAvisoReposicion.tsx` (fase 2) muestra `product.restockNuevo` a los usuarios; lo corrige PROD.
