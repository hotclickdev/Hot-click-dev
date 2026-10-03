# Auditoría Figma ↔ producción: experiencia de VISITANTE

- **Figma:** `TmxYFj2nauu10WZnZ0t6yt`, página `4:2` "Home de compra · prototipo". Es la única página del archivo: 12 secciones y 102 nodos de primer nivel (100 frames + notas + 1 símbolo).
- **Producción:** https://hotclick.lat en el commit `dc65ebb3`, bundle `index-CNXtLwD-.js`. Capturado el 2-oct-2026 entre 20:30 y 21:40 (hora de Costa Rica).
- **Alcance (cambio de alcance del 2-oct):** solo el **visitante**, es decir, alguien sin credenciales que no puede modificar ni agregar nada.
  - **Fuera de alcance:** los roles Emprendedor, administrador, Pyme y Negocio Plus, con sus paneles, flujos y rutas de código propias. Esto incluye `/admin/*`, `/emprendedor/*`, `/pyme/*`, `/negocio-plus/*`, POS y el registro de negocio.
  - **Componentes compartidos:** cuando uno se usa también desde esos roles, se marca como ⚠️ **COMPARTIDO** y el cambio que se propone queda limitado al visitante.
- **Evidencia (en el box):**
  - `/workspace/figma-audit/sbs/*.png`: comparaciones lado a lado (Figma a la izquierda, prod a la derecha).
  - `/workspace/figma-audit/figma/frames/`: los 100 frames recortados.
  - `/workspace/figma-audit/prod/`: capturas de producción y `log.jsonl` (estado HTTP, h1/h2 y errores de cada ruta).
- **Método de captura:** solo lectura. Se abortó todo request a `/api` que no fuera GET y se bloqueó la analítica. El carrito se sembró en localStorage con productos reales (284, 271×2, 280).
  - Los datos de prod son el mismo catálogo de muestra de Figma: Casa Luna 506, Taller Ceiba, Bruma Café; 27 productos.
  - Por eso las diferencias de **contenido** (fotos, conteos, productos destacados) se separan de las diferencias de **diseño**.

## Conteo de pantallas

| | Cantidad |
|---|---|
| Nodos de primer nivel en la página 4:2 | 102 (100 frames) |
| Frames de alcance visitante | **72** |
| Frames de referencia (00 Sistema de diseño) | 2 |
| Frames fuera de alcance | 26: 9 de cuenta con sesión, 2 estados con sesión, 1 de vendedor (despachar), 7 correos, 1 nota de correos y 6 notas |
| Frames visitante comparados lado a lado con prod | **37** |
| Frames visitante no comparados visualmente | 35. Necesitan una interacción, un estado o datos que prod no tiene (variantes, agotado, pasos 2 y 3, tokens QR, artículos de blog). Se revisaron por código o quedan para la Fase 2 |
| Rutas de visitante capturadas en prod | 49 rutas en móvil (390×844) y 25 en escritorio (1440×900), más una pasada "primera visita" |

---

## 1. Resumen de Figma, sección por sección (alcance visitante)

- **Tokens.** La sección 00 (`5:22`) define:
  - **Neutros:** n/0 #FFF, n/50 #F8F9FB, n/100 #F1F3F6, n/200 #E4E7EC, n/500 #6E7682, n/600 #4D5560, n/900 #14171C.
  - **Rojo:** red/500 #E73B33 (CTA).
  - **Azules:** blue/50 #EFF4FE, blue/100 #DEE9FC, blue/600 #1747A8 (links y acciones secundarias), blue/900 #152B5E.
  - **Estados:** success #178A50 y success-bg #E9F7F0, más warning.
- **Tipografía:** Sora para títulos y precios, Public Sans para texto, IBM Plex Mono solo en notas.
- **Componentes:** Chip `5:44`, ProductCard `5:23`, CategoryTile `5:39`, Consulta rotativa `23:820` y el aviso "compra en varios emprendimientos" `40:1350`.

| Sección | Frames de visitante | Qué dice Figma |
|---|---|---|
| 01 Inicio | 7:2, 12:346, 8:163, 8:230, 9:171, 12:610 | Home con buscador "Buscá o describí lo que necesitás" (con ícono de cámara) y chips de categoría. h1 "¿Qué estás buscando hoy?" con consultas rotativas del asistente. Después: Destacados, Explorá por categoría, Seguí donde lo dejaste, Nuevos, banda de confianza y footer azul "Vendé en HotClick". También muestra los estados de búsqueda activa y de respuesta del asistente. Barra inferior: Inicio, Buscar, Categorías, Pedido, Cuenta |
| 02 Buscar | 26:722, 26:887, 27:804, 27:882, 27:939, 30:1824, 43:1454, 43:1530 | Resultados con el término dentro del campo, "N productos para 'x'", chips (categoría, precio, Filtros), tarjeta del asistente y "Búsquedas relacionadas". Hoja de filtros. Sin resultados con asistente, "Te lo conseguimos" y sugerencias. Búsqueda por foto, Descubrí (swipe), catálogo de escritorio con filtros laterales, Categorías y Categoría (Hogar) |
| 03 Producto y tiendas | 28:839, 29:2072, 44:1775, 44:1849, 44:1917, 55:2167, 55:2191, 29:922, 29:2308, 29:1159 | Ficha con galería 1/4, fila de tienda "CL Casa Luna 506 ›", precio con IVA y stock, bloque de envío y pago, cantidad junto a "Agregar", preguntas al asistente, opiniones y "También te puede gustar". Variantes de la ficha: con variantes, personalizada (formulario dentro de la ficha), agotada, galería y foto ampliada. Perfil de negocio con portada, botones WhatsApp e Instagram, "Sobre nosotros", productos con chips y "Cómo comprarle". Directorio de emprendimientos |
| 04 Comprar | 28:989, 30:2268, 28:1083, 29:1248, 29:1344, 30:2385, 29:1932, 29:1999, 29:2036, 45:1607, 45:1640, 55:2220, 55:2284 (+ símbolo 40:1350) | Carrito agrupado por paquete y tienda con el aviso de varios emprendimientos, cupón y resumen de envío por paquete. Checkout en 3 pasos (Datos, Entrega, Pago) en móvil y en una sola página en escritorio. Pago exitoso y pago fallido, recuperar carrito, hoja "Agregado", SINPE pendiente y gift card válida o inválida |
| 05 Cuenta (entrada) | 28:1143, 44:1551, 44:1580, 44:1614, 44:1660, 44:1701 | "Ingresá o creá tu cuenta" en un solo paso: correo primero, Google y "Solo quiero comprar". Recuperar contraseña en 3 pasos, 2FA y seguimiento sin cuenta |
| 06 Servicios | 28:1429, 28:1486, 28:1531, 28:1594, 28:1660, 55:2332 | Servicios HOT (inicio, Te lo conseguimos, garantía), encargo público, **plantilla de página informativa (Envíos)** y cotización pública |
| 07 Mapa | 34:1355 | Mapa de flujos. Se usa para revisar los flujos A→C |
| 08 QR | 29:1650, 29:1741, 29:1781, 29:1830, 29:1888, 29:1913 | Lo que ve el cliente al escanear un QR de mesa (menú, pedido enviado) o un QR de pago en caja (método, SINPE en curso, pagado, vencido) |
| 09 Funciones existentes | 51:1820, 51:2000, 51:2163, 51:2196, 51:2229, 51:2262, 51:2468 | Carrito con notas, gift card, WhatsApp, "guardar para después" y asistente. Envío internacional, cupón de bienvenida, "¿Aún pensando?", idioma y accesibilidad, FAB de WhatsApp, tienda con su color |
| 10 Estados | 45:1692, 45:1799, 45:1946, 45:2166, 45:2198, 45:2264, 55:2658 | Carrito vacío, favoritos vacío, aviso de cookies, hoja de preferencias, 404, sin conexión, instalar la app |
| 11 Contenido y SEO | 54:2126, 54:2219 | Listado de blog y artículo |

---

## 2. Lo que en prod NO coincide con Figma (solo visitante)

### 2.A Bloqueantes: hacen que prod "no refleje Figma" sin importar el diseño

| # | Ruta | Problema | Figma | Prod | Causa (verificada en código) |
|---|---|---|---|---|---|
| A1 | `/privacidad`, `/terminos`, `/cookies`, `/envios`, `/devoluciones`, `/acuerdo-vendedores`, `/encargo/:token`, `/cotizacion/:token`, `/sin-conexion`, toda ruta inexistente (404) | En la **entrada directa** (link compartido, Google, recarga, visitante nuevo) el servidor responde **HTTP 401** sin cuerpo y Chrome muestra "This page isn't working · HTTP ERROR 401" | 28:1660, 28:1594, 55:2332, 45:2264, 45:2198 | Pantalla de error del navegador. Solo se ven bien si se llega navegando dentro de la SPA | `SecurityAuthorizationRules.java` (l. 241-267): el `permitAll` de rutas SPA no incluye esas rutas, y cae en `.anyRequest().authenticated()`. `SpaController` sí las mapea. Así, el 404 de Figma (45:2198) nunca se ve en una entrada directa. Verificado con `curl -H 'Accept: text/html'`. ⚠️ **COMPARTIDO** (backend): agregar **solo** rutas públicas de visitante al `permitAll` y un fallback SPA para rutas desconocidas que no sean `/api` ni `/admin`. No se tocan los matchers de roles |
| A2 | Todas | Los visitantes que ya entraron antes siguen con el **bundle viejo** del service worker | — | Banner "Hay una versión nueva de HotClick · Actualizar". Si lo cierran, queda el diseño anterior | `vite.config` usa VitePWA con `registerType:'prompt'`, `skipWaiting:false` y precache de js/css/html. ⚠️ **COMPARTIDO** (POS y admin necesitan el modo prompt para no recargar a mitad de una caja). Propuesta: aplicar la actualización automáticamente **solo** cuando la ruta actual es de visitante y no hay sesión (`updateSW(true)` en `onNeedRefresh`). Prompt se mantiene para roles |
| A3 | `/productos?search=sofa` | La búsqueda **distingue tildes**: "sofa" no encuentra "Sofá" y muestra "No encontramos 'sofa'" | 26:722 (resultados) | Sin resultados | `catalogoFiltros.ts` → `filtrarCatalogo` usa `toLowerCase().includes()` sin `normalize('NFD')`. Arreglo exclusivo del catálogo público |
| A4 | `/emprendimientos` | El directorio aparece **vacío** ("Próximamente… Emprender en HotClick") aunque hay 3 tiendas públicas | 29:1159 (lista de 3 negocios con 3 fotos de producto cada uno) | Estado vacío | `EmprendimientosPage` lee `/convenios/publicos` (convenios), no las tiendas públicas (empresas con tienda). Se necesita una fuente de datos de tiendas públicas, solo GET |

### 2.B Diferencias de diseño en pantallas que ya siguen Figma

| Ruta | Elemento | Figma | Prod |
|---|---|---|---|
| `/` (m y d) | "Seguí donde lo dejaste" | Siempre presente en el frame | Solo aparece con historial de navegación. Correcto como lógica; el estado sin historial no está en Figma |
| `/` | Footer legal | — | Línea extra "Preferencias de cookies · Idioma y accesibilidad". Está en 51:2229 y 45:2166, así que es aceptable. Revisar el texto contra Figma |
| `/` y todas | FAB de WhatsApp | Solo en 51:2262 (Home) | Aparece en todas las pantallas de visitante, incluidas ficha, carrito, login, 404 y blog. Propuesta: limitarlo a las pantallas donde Figma lo muestra |
| Todas (MainLayout) | Banner "¡Bienvenido de vuelta! Tenés N productos en el pedido · Ver pedido" (`ReturnVisitorBanner`) | No existe en ningún frame | Se muestra sobre Servicios, Nosotros, Contacto e Información. Se propone **derivarlo de Figma**: usar la tarjeta 29:2036 "Recuperar carrito" con estilo de aviso blue/50, o quitarlo |
| `/productos/:id` (m y d) | Fila de tienda | "CL Casa Luna 506 ›" (avatar y link a la tienda) | Chips "Luna 506 · Nuevo" (marca y condición), sin link a la tienda |
| `/productos/:id` | Galería | Indicador 1/4 con puntos y miniaturas a la izquierda en escritorio | Una sola imagen, sin miniaturas (el producto 284 tiene 1 foto: es contenido) |
| `/productos/:id` | "Video del producto" | No existe | Recuadro negro grande con YouTube debajo de "También te puede gustar" (`ProductVideo.tsx`, el producto 284 tiene `videoUrl`). **Derivado de Figma:** integrarlo como un ítem más de la galería 55:2167 (miniatura con ▶) y abrirlo en la vista 55:2191 |
| `/productos/290` (personalizado) | Flujo | 44:1849: formulario de personalización dentro de la ficha y CTA "Agregar pedido personalizado · ₡11.000" | "Desde ₡11.000" y "Solicitar encargo" con formulario de nombre, correo y teléfono (modo encargo/cotización). Alinear con 44:1849 cuando el precio es fijo y dejar el modo encargo como **derivado de Figma** (cotización 55:2332) |
| `/tienda/:slug` (m y d) | Encabezado | Portada de color, botones WhatsApp e Instagram, "Emite factura", "Sobre nosotros" y chips de categoría | Faltan "Sobre nosotros", los botones sociales y las insignias (depende de datos de la tienda). En móvil aparece además una **barra flotante de tienda** (Catálogo, Pedido, Inicio) sobre el contenido, que no está en Figma |
| `/carrito` | Estructura | 28:989 / 30:2268 | Coincide: paquetes por tienda, aviso 40:1350, cupón, resumen. Los extras "Pedir por WhatsApp", gift card, "¿Lo terminás después?" y asistente están en 51:1820 (aceptados) |
| `/checkout` | Paso 1 y escritorio | 28:1083 / 30:2385 | Coincide |
| `/productos?search=sala` | Chips | Hogar, Hasta ₡35.000, Filtros | "Solo con stock" y Filtros. Revisar la regla de los chips sugeridos |
| `/productos?cat=119` (Hogar) | Categoría sin productos | 43:1530 muestra 5 productos | "No se encontraron productos · Limpiar filtros" (la categoría 119 está vacía en prod: es contenido). El estado vacío de categoría no existe en Figma → **derivado de Figma** de 27:804 |
| `/categorias` | Chip del asistente | "No sé qué buscar, ayudame" bajo el buscador | No aparece |
| `/login` | Google | "Continuar con Google" y separador | No aparece, porque `clerkEnabled` es falso en el build actual (sin `VITE_CLERK_*`). Es una decisión de configuración, no de diseño |
| `/blog` | Listado | 54:2126 (destacado, filtros y lista) | "Próximamente" porque hay 0 posts publicados (contenido). Estado vacío → **derivado de Figma** de 45:1799 |
| `/pago/exito` sin parámetros | Estado | 29:1932 | Muestra "No pudimos procesar el pago" (no encuentra el pedido). La UI sigue a 29:1999, pero suma un bloque de chat "Soporte de pago" que no está en Figma |
| Primera visita | Cupón de bienvenida | 51:2163 "13% de descuento" | Mismo diseño de hoja, pero dice "15% de descuento" (es configuración del cupón). El aviso de cookies coincide con 45:1946. "¿Aún pensando?" (51:2196) no se pudo disparar en la captura |
| `/servicios` | Inicio | 28:1429 | Coincide. Prod tiene encima el banner de visitante recurrente (ver arriba) |

### 2.C Pantallas de visitante con **diseño viejo** (sin referencias a Figma en el código)

| Ruta | Archivo(s) | Qué se ve hoy (diseño viejo) |
|---|---|---|
| `/nosotros` | `pages/NosotrosPage.tsx` (215 l.) | Título grande centrado "Sobre nosotros", tarjeta del fundador con foto, degradado |
| `/contacto` | `pages/ContactoPage.tsx` + `pages/contacto/*` | "Contáctanos" con formulario e íconos en mosaicos de colores |
| `/informacion` | `pages/InformacionPage.tsx` + `pages/informacion/*` (Hero, HowToBuy, Conditions, Warranty, Shipping, Reserve, Faq, Cta) | Píldora "Información", título enorme "Todo lo que necesitás saber", tarjetas por sección |
| `/privacidad`, `/terminos`, `/cookies`, `/acuerdo-vendedores` | `PrivacidadPage`, `TerminosPage`, `CookiesPage`, `AcuerdoVendedoresPage` | Encabezado completo del marketplace (categorías), título degradado, índice "Contenido · Sección 1…" en tarjetas |
| `/devoluciones` | `DevolucionesPage` + `pages/devoluciones/*` | Parecido a la plantilla, pero con su propio Hero, Badges y CTA |
| `/registro` | `pages/RegisterPage.tsx` + `pages/auth/RegisterFormStep.tsx` | Pestañas "Quiero comprar / Quiero vender", "Crear cuenta en HotClick" en dos colores y un formulario largo con nombre, apellidos, identificación y contraseña. Figma unifica la entrada en 28:1143 (correo primero) |
| `/tienda/:slug/producto/:id` | `pages/tienda/TiendaProductoPage.tsx` | Banner navy "Tienda de Casa Luna 506 en HotClick", ficha antigua (precio rojo grande, "Comprar ahora" / "Agregar al pedido") y barra inferior de tienda |
| `/tienda/:slug/carrito` | `TiendaCarritoPage.tsx` | "Este pedido está vacío" con caja 3D. Carrito separado del marketplace |
| `/tienda/:slug/checkout`, `/tienda/:slug/checkout/exito` | `TiendaCheckoutPage.tsx`, `TiendaCheckoutDireccion.tsx`, `TiendaSuccessPage.tsx` | Checkout propio de la tienda, diseño antiguo |
| Shell de tienda | `TiendaLayout.tsx`, `TiendaBottomNav.tsx`, `tiendaBottomNavItems.ts`, `TiendaFooter.tsx` | Barra inferior Catálogo / Pedido / Inicio y footer "— tienda en HotClick" |

---

## 3. Lo que Figma tiene y prod no

| Figma | Qué es | Estado en prod |
|---|---|---|
| 29:1159 con datos | Directorio con negocios | Vacío (A4) |
| 45:2198 en entrada directa | 404 | 401 del servidor (A1). El componente `NotFoundPage` existe y sigue Figma |
| 45:2264 en entrada directa | Sin conexión | 401 (A1). Funciona solo como fallback dentro de la SPA |
| 28:1594 / 55:2332 en entrada directa | Encargo y cotización públicos (llegan por WhatsApp o correo) | 401 (A1). Es justo el caso más común: un link abierto desde fuera |
| 28:839, fila de tienda | Link a la tienda desde la ficha | Falta |
| 28:1143, Google | Login social | Apagado por configuración |
| 43:1454, chip del asistente | "No sé qué buscar, ayudame" | Falta |
| 44:1775 / 44:1917 | Ficha con variantes y ficha agotada | No se pudo verificar: no hay productos con variantes ni agotados en prod. Revisar por código y con datos de prueba en la Fase 2 |
| 29:1248, 29:1344, 45:1640, 55:2220, 55:2284 | Pasos 2 y 3 del checkout móvil, SINPE pendiente y gift card | No capturados (requieren interacción o escritura). Se revisan en la Fase 2 con API mockeada |
| 26:887, 8:163, 8:230, 12:346, 12:610 | Hoja de filtros, búsqueda activa, respuesta del asistente, estados de scroll | Requieren interacción. El INVENTORY previo (API mockeada) los daba PASS o PARTIAL |
| 29:1650 a 29:1913 | Pantallas QR del cliente | No capturadas (necesitan tokens reales). ⚠️ **COMPARTIDO** con POS: solo se tocaría la vista del cliente (`POSPagoPage`, `SelfCheckoutPage`) |

---

## 4. Pantallas de visitante en prod que NO están en Figma, con solución

| Ruta | Solución propuesta | Marca |
|---|---|---|
| `/nosotros`, `/contacto`, `/informacion` | Rehacer con la **plantilla informativa 28:1660**: barra con atrás y título, chips de secciones, bloques con ícono blue/50, preguntas en acordeón y CTA del asistente. El formulario de contacto usa los inputs de 28:1486 | **derivado de Figma** |
| `/privacidad`, `/terminos`, `/cookies`, `/acuerdo-vendedores`, `/devoluciones` | Una plantilla legal única derivada de 28:1660: título Sora, índice como chips desplazables, secciones en tarjetas n/0 con borde n/200, sin degradados. `/acuerdo-vendedores` es contenido para vendedores, pero lo lee un visitante: solo cambia el estilo, no el texto | **derivado de Figma** |
| `/registro` (comprador) | Redirigir al flujo de 28:1143 ("Ingresá o creá tu cuenta", correo primero). Si el correo no existe, mostrar el paso "creá tu cuenta" con los mismos inputs: nombre y contraseña, con verificación por código (patrón 44:1580). La pestaña "Quiero vender" sigue enviando a `/registro-empresa` **sin tocarlo** ⚠️ | **derivado de Figma** |
| `/tienda/:slug/producto/:id` | Renderizar la **ficha 28:839 / 29:2072** (los mismos componentes de `/productos/:id`) dentro del shell de tienda | **derivado de Figma** |
| `/tienda/:slug/carrito`, `/checkout`, `/checkout/exito` | Rehacer con 28:989, 28:1083 y 29:1932, con un solo paquete y el color de la tienda (51:2468). Quitar la barra flotante de tienda y usar el encabezado de 29:922 más la barra de compra de la ficha. ⚠️ **COMPARTIDO**: la tienda propia es una función de plan del emprendedor (Negocio Plus). El cambio es solo de presentación al visitante; no se tocan la configuración de la tienda ni sus datos. **Requiere confirmación** | **derivado de Figma** |
| Banner de visitante recurrente | Tarjeta compacta derivada de 29:2036 o quitar | **derivado de Figma** |
| Video de producto | Ítem de galería 55:2167 / 55:2191 | **derivado de Figma** |
| Estados vacíos de categoría y de blog | Variantes de 27:804 y 45:1799 | **derivado de Figma** |
| `/visitante/*`, `/prototipo/*` | `/visitante/*` ya redirige. `/prototipo/*` es el prototipo viejo, público y con `permitAll`: **eliminar la ruta** (o dejarla detrás de un flag de desarrollo) | — |
| `/emprende`, `/para-pymes`, `/negocio-plus-plan`, `/registro-empresa`, `/registrar-negocio` | Son embudos de adquisición de los roles Emprendedor, Pyme y Negocio Plus. **Fuera de alcance por instrucción.** Se listan solo porque un visitante los ve; no se proponen cambios | fuera de alcance |

**Flujos A→C sin B** (revisados contra el mapa 34:1355):
- **Ficha personalizada → encargo enviado:** falta la confirmación de "encargo enviado". Se deriva de 29:1932 (check y resumen) → **derivado de Figma**.
- **Carrito → "Lo terminás después" → recuperar:** falta la confirmación inline de "Te lo mandamos". Se deriva del aviso success de 45:1607 → **derivado de Figma**.
- **Login con correo inexistente → crear cuenta:** falta la pantalla B (ver `/registro` arriba) → **derivado de Figma**.

---

## 5. Plan de cambios por bloques (Fase 2, no iniciada)

Reglas para todos los bloques:
- Ninguno toca `pages/admin/**`, `emprendedor/**`, `pyme/**`, `negocio-plus/**`, POS, `RegistroEmpresa*` ni `RegistrarNegocio*`.
- Los cambios en componentes compartidos quedan detrás de una condición de "superficie de visitante".

**Bloque 0: Entrega (backend y PWA). Prioridad máxima, porque sin esto nada de Figma llega**
1. ⚠️ COMPARTIDO: en `SecurityAuthorizationRules.java`, agregar al `permitAll` las rutas `/privacidad`, `/terminos`, `/cookies`, `/envios`, `/devoluciones`, `/acuerdo-vendedores`, `/encargo/*`, `/cotizacion/*` y `/sin-conexion`. Agregar también un fallback SPA para GET con `Accept: text/html` que no empiece con `/api`, `/admin` ni `/actuator`, que sirva `index.html` (la SPA pinta el 404 de Figma). Agregar un test por ruta.
2. ⚠️ COMPARTIDO: en `main.tsx`, si `onNeedRefresh` se dispara sin sesión y en una ruta de visitante, llamar a `updateSW(true)`. Con sesión o en `/admin`, `/pos` y paneles se mantiene el banner actual.

**Bloque 1: Búsqueda y directorio**
1. `catalogoFiltros.ts`: búsqueda sin tildes (`normalize('NFD').replace(/\p{Diacritic}/gu,'')`) en nombre, marca y tienda.
2. Chips sugeridos según 26:722 (categoría inferida, rango de precio, Filtros).
3. `EmprendimientosPage`: pasar de `convenioService.getPublicos()` a un GET de tiendas públicas. Si no existe, crear `GET /api/public/tiendas` de solo lectura con nombre, slug, ubicación, conteo y 3 imágenes.
4. Chip "No sé qué buscar, ayudame" en `/categorias`.

**Bloque 2: Ficha de producto**
1. Fila de tienda 28:839 (avatar con iniciales y link a `/tienda/:slug`) en lugar del chip de marca.
2. Video dentro de la galería (55:2167 / 55:2191) → **derivado de Figma**. Eliminar la sección suelta `ProductVideo` de la ficha de visitante.
3. Ficha personalizada con precio fijo según 44:1849. El modo encargo queda como **derivado de Figma**.
4. Verificar las variantes (44:1775) y el estado agotado (44:1917) con datos mock.

**Bloque 3: Páginas informativas y legales (plantilla 28:1660)**
1. Crear `components/info/PaginaInformativa.tsx`, exclusivo de visitante. Puede crecer desde lo que ya hace `EnviosPage`.
2. Migrar Nosotros, Contacto, Información, Privacidad, Términos, Cookies, Acuerdo y Devoluciones → **derivado de Figma**.

**Bloque 4: Entrada de cuenta**
1. `/registro` (comprador) pasa al flujo de 28:1143 con el paso "crear cuenta" **derivado de Figma**. "Quiero vender" se conserva como link a `/registro-empresa`, sin cambios ⚠️.
2. Habilitar Google según 28:1143 solo si se decide configurar Clerk (decisión del usuario).

**Bloque 5: Tienda pública (`/tienda/:slug/*`)**, requiere confirmación ⚠️ COMPARTIDO con la función de plan
1. Encabezado según 29:922 / 29:2308 / 51:2468: "Sobre nosotros", WhatsApp, Instagram e insignias cuando haya datos.
2. Producto, carrito, checkout y éxito con los componentes de 28:839, 28:989, 28:1083 y 29:1932, en un paquete único y con el color de la tienda → **derivado de Figma**.

**Bloque 6: Elementos globales del visitante**
1. Limitar el FAB de WhatsApp a las pantallas de 51:2262.
2. `ReturnVisitorBanner` según 29:2036, o quitarlo → **derivado de Figma**.
3. Estados vacíos de categoría y blog → **derivado de Figma**.
4. Pago exitoso o fallido: decidir si se queda el bloque "Soporte de pago" (no está en Figma).

**Bloque 7: Verificación**
1. Volver a capturar con este mismo pipeline (49 rutas en m y d) y comparar lado a lado.
2. Correr `curl -H 'Accept: text/html'` sobre todas las rutas públicas y esperar 200 (o el 404 de la SPA).
3. Correr los tests existentes de contraste y tokens.

### Qué se DESTRUYE del diseño viejo (solo superficies de visitante)

| Tipo | Elemento |
|---|---|
| Componentes y archivos | `pages/informacion/InformacionHero.tsx`, `HowToBuySection.tsx`, `ConditionsSection.tsx`, `WarrantySection.tsx`, `ShippingOptions.tsx`, `ReservePolicy.tsx`, `FaqSection.tsx`, `InformacionCta.tsx` y `informacionIcons.tsx` (los textos se pasan a la plantilla); `pages/devoluciones/DevolucionesHero.tsx`, `DevolucionesBadges.tsx` y `DevolucionesCta.tsx`; las secciones visuales de `NosotrosPage.tsx` (hero con degradado y tarjeta del fundador); `pages/contacto/ContactoCanales.tsx` (mosaicos de colores) y la piel de `ContactoFormulario.tsx`; el layout propio de las 4 páginas legales (título degradado e índice en tarjetas) |
| Registro | Las pestañas "Quiero comprar / Quiero vender" y el hero bicolor de `RegisterPage.tsx`, y el formulario largo de `RegisterFormStep.tsx`, **solo en el camino comprador** ⚠️ |
| Tienda | `TiendaBottomNav.tsx`, `tiendaBottomNavItems.ts`, la piel actual de `TiendaProductoPage.tsx`, `TiendaCarritoPage.tsx`, `TiendaCheckoutPage.tsx`, `TiendaCheckoutDireccion.tsx` y `TiendaSuccessPage.tsx`, y el banner navy "Tienda de … en HotClick" (sujeto a la confirmación del Bloque 5) |
| Secciones | La sección suelta "Video del producto" en la ficha; el banner `ReturnVisitorBanner` en su forma actual; el FAB de WhatsApp fuera de las pantallas de 51:2262 |
| Rutas | `/prototipo/*` (prototipo viejo público): eliminar la ruta, sus matchers en `SecurityAuthorizationRules` y `SpaController`, y la carpeta `src/prototipo/visitante/*` si nada más la importa. Verificar con `grep` antes |
| Estilos | Clases de degradado y hero de las páginas anteriores. No se toca `index.css` global ni los tokens `hc-*`, que son los de Figma |
| **No** se destruye | Nada bajo `/admin`, `/emprendedor`, `/pyme`, `/negocio-plus`, POS, `/emprende`, `/para-pymes`, `/negocio-plus-plan`, `/registro-empresa` ni `/registrar-negocio` |

---

## Método reutilizable

1. **Inventario de Figma en 2 llamadas.** Primero `get_metadata` sin nodo, para obtener las páginas. Después `get_metadata` de la página, que se **guarda a disco** y se parsea con Python/ElementTree. Hay que cortar el texto después de `</canvas>`. De ahí sale `frames.json` con sección, id, nombre y tamaño.
2. **Imágenes baratas.** Una llamada a `get_screenshot` por **sección**, con `maxDimension` igual al lado mayor (escala 1:1, 40 px de margen). Luego se recorta cada frame en local con las coordenadas del XML. Fueron 12 llamadas en lugar de 100.
3. **No usar `get_design_context` para auditar.** Pesa entre 70 y 80 KB por frame y a veces vuelve inline. Para auditar alcanzan los nombres del metadata (que traen el copy), el recorte y los tokens (`get_variable_defs` de la hoja de componentes). Design context se pide solo en la implementación.
4. **Frames a rutas.** Se reutilizó el inventario previo (`INVENTORY.md`) y se confirmó con el `h1` capturado. Los nombres de frame en Figma ya dicen la pantalla.
5. **Captura de prod con Playwright en el box**, usando el Chrome del sistema:
   - Viewports 390×844 (isMobile) y 1440×900, captura fullPage, **4 páginas en paralelo**. En serie tomaba unos 10 s por ruta.
   - Solo lectura: abortar todo lo que no sea GET a `/api` y la analítica.
   - Sembrar localStorage para el carrito y para apagar overlays. El carrito debe imitar la forma que produce `productService`, con `bodegaId` incluido; si no, el agrupado sale mal.
   - Hacer una pasada "primera visita" sin semillas.
   - Registrar status, h1/h2 y errores en `log.jsonl`.
6. **Errores propios que costaron tiempo.**
   - Parsear `name=path` con `split('=')` cortó los query strings (`?search=x`) y dio un falso "búsqueda rota". Usar `indexOf('=')`.
   - Las páginas con contenedores sticky se duplican en fullPage. Confirmar siempre con capturas de viewport y scroll.
7. **Entrada directa vs. navegación SPA.** Hacer siempre `curl -s -o /dev/null -w '%{http_code}' -H 'Accept: text/html'` sobre todas las rutas públicas. El navegador con service worker esconde los 401/404 del servidor. Así aparecieron 10 rutas rotas.
8. **Comparación.** `sbs.py` arma Figma a la izquierda y prod a la derecha con la misma escala (opción `CROP` para recortar prod), y `grid.py` junta entre 3 y 6 pares en una sola imagen para revisarlos en una llamada. Clasificar cada diferencia como **diseño**, **contenido/datos**, **configuración** o **entrega** antes de proponer cambios.
9. **Alcance por rol.** Antes de proponer nada, `grep` del componente en las rutas de roles. Si aparece, marcarlo ⚠️ COMPARTIDO y limitar el cambio a la superficie de visitante.
