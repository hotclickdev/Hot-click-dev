# SRV · Servicios HOT, encargo, cotización, informativas y blog

Rama `feat/figma/srv`, puesta al día con `feat/figma/base` en `f57da0ae` (ya incluye CHK y ACC) por fast-forward. Archivo Figma `TmxYFj2nauu10WZnZ0t6yt`. Este documento lo mantiene SRV; `INVENTORY.md` y `PROGRESS.md` resumen su estado.

Todos los veredictos son **agent verified**: los verificó el propio agente con la API simulada y fotos de color, sin QA independiente y sin backend real.

## Cómo se verificó

- Capturas con Playwright (Chrome, fuentes reales Sora, Public Sans e IBM Plex Mono, móvil 390 y escritorio 1440) con la API simulada y los datos de Figma (`tests/helpers/accFixtures.ts` para la sesión). Los scripts y las capturas viven fuera del repo, en `%TEMP%\srv-qa`.
- Posiciones medidas en la app contra la metadata de cada frame (`get_metadata`) y comparación visual con `get_design_context` y la captura del frame. Tolerancia aceptada: ±2 px en x e y (el `line-height: normal` de Figma redondea a enteros; el navegador no).
- Cada pantalla se capturó, se comparó, se corrigió y se volvió a capturar. Correcciones de la segunda pasada: fondo azul de la cotización (una regla global pinta `header` y `footer`), alto de la barra del artículo, línea de vigencia sobrante en garantía, salto de línea de los títulos del blog y la tipografía de los títulos (una regla global pinta `h1`..`h4` en Sora; Figma usa Public Sans en "Estado", el nombre del encargo y "Compartir este artículo").
- No hay frames de tablet. Solo existen frames móviles: en escritorio las pantallas son una columna centrada con el header de SHELL; no está respaldado por Figma.

## Pantallas

| Frame | Pantalla | Ruta | Veredicto | Móvil | Escritorio |
| --- | --- | --- | --- | --- | --- |
| `28:1429` | Servicios HOT · inicio | `/servicios` | **PASS** | medido (±2 px) | sin frame |
| `28:1486` | Te lo conseguimos · formulario | `/servicios?vista=busqueda` | **PARTIAL** | medido (±1 px) | sin frame |
| `28:1531` | Solicitud de garantía | `/servicios?vista=garantia` | **PARTIAL** | medido (±1 px hasta "Contanos qué pasó") | sin frame |
| `28:1594` | Encargo · seguimiento público | `/encargo/:token` | **PARTIAL** | medido (±2 px arriba; el resto depende de datos) | sin frame |
| `28:1660` | Página informativa · plantilla (Envíos) | `/envios` | **PARTIAL** | medido (±1 px) | sin frame |
| `55:2332` | Cotización pública | `/cotizacion/:token` | **PARTIAL** | medido (0 px en el encabezado y el cliente) | sin frame |
| `54:2126` | Blog · listado | `/blog` | **PARTIAL** | medido (barra e intro 0 px; resto relativo a la tarjeta) | sin frame |
| `54:2219` | Blog · artículo | `/blog/:slug` | **PARTIAL** | medido (0 a 6 px; la diferencia es la etiqueta de diseño omitida) | sin frame |

Resultado: **1 PASS, 7 PARTIAL, 0 BLOCKED** (de 8 frames). Las partes que dependen del backend o de decisiones se detallan abajo.

Estados y vistas sin frame propio que también se migraron o revisaron, ninguna cuenta como PASS: formulario enviado y con error, garantía sin sesión, vacía y enviada, "Digitalizá tu inventario", "Contanos tu experiencia", encargo rechazado, pagado y no encontrado, cotización no encontrada, blog vacío y artículo no encontrado.

## Diferencias que quedan, por pantalla

- **Inicio `28:1429` (PASS):** las filas miden 1 a 2 px menos que Figma (redondeo del `line-height`). El botón del asistente y el de WhatsApp flotan sobre la pantalla y no están en Figma (SYS, ya listado). El aviso "Tenés N solicitudes en curso" aparece solo con sesión y con solicitudes abiertas (Figma muestra un caso con 1; con más dice "N solicitudes").
- **Formulario `28:1486`:** "Presupuesto aproximado" es un campo de texto; Figma dibuja un selector con rangos y chevron. El backend guarda texto libre y no hay lista de rangos aprobada: REQUIERE_DECISION. En móvil los campos miden 14 px como Figma (P06, 2-oct-2026: la regla de 16 px de SHELL ya no los alcanza bajo `.hc-figma-ui`). La barra "1 · Foto, 2 · Detalle, 3 · Contacto" se activa por avance: foto, descripción y, al enviar, contacto. El teléfono es un campo simple ("8888 8888") que agrega +506 si no se escribe país; el selector de país de `PhoneField` se quitó para coincidir con Figma (quien necesita otro país escribe `+` y su prefijo). El estado enviado no tiene frame.
- **Garantía `28:1531`:** BLOCKED por backend: "Fotos de la falla (opcional)" no se dibuja, porque `SolicitudGarantia` solo guarda descripción, producto y pedido. El motivo tampoco tiene campo: viaja como prefijo `[Motivo: Se dañó]` en la descripción. Por eso el pie queda unos 94 px más arriba que en Figma. Las garantías vencidas se listan atenuadas y no se pueden elegir; la vigencia ("28 días restantes") quedó solo en el `title` de la fila, porque Figma no la dibuja.
- **Encargo `28:1594`:** el backend no entrega: nombre de la tienda (`Casa Luna 506`), fecha y hora de la cotización, tiempo de producción ("3 a 5 días hábiles"), empresa de envío ("Correos de Costa Rica") ni costo de envío. No se inventaron: la línea de tiempo muestra solo recibida (con fecha), cotización (con precio), pago, producción y "Listo para entregar"; el total tiene Producto y Total, sin Envío. El pago del encargo es siempre retiro en tienda (`RETIRO_EN_TIENDA`, comportamiento previo). "Escribirle a la tienda" abre el WhatsApp de HotClick porque el encargo no expone el teléfono del vendedor.
- **Envíos `28:1660`:** el índice tiene Tarifas y Preguntas; los chips "Tiempos" y "Retiro" no se dibujaron porque el frame no tiene esas secciones. Figma pone "Envío rápido GAM · 24 h hábiles" y "Envío normal GAM · 1 a 3 días"; el contenido existente dice "30 min – 2 horas" y "2–4 días hábiles" y es el que usa el checkout. Se conservó el contenido existente: REQUIERE_DECISION del negocio. Las preguntas "¿Cómo sigo mi paquete?" y "¿Qué pasa si no estoy en casa?" no traen respuesta en Figma y no se agregaron; se mantienen las cuatro preguntas existentes y se suma "¿Puedo retirar en la tienda?" con la respuesta de Figma. La nota "Plantilla reutilizable" es una anotación de diseño y no se renderiza.
- **Cotización `55:2332`:** BLOCKED por backend: "Aceptar cotización" no se dibuja, porque no existe el endpoint (la etiqueta "NUEVO · por programar" y la nota que la acompaña tampoco se renderizan). "Consultar por WhatsApp" sí funciona. El renglón "20 unidades × ₡11.000 · 10% desc." envuelve a dos líneas; Figma lo recorta (el texto mide 187 px en una columna de 183), por eso la tarjeta de líneas mide unos 11 px más.
- **Blog listado `54:2126`:** BLOCKED por backend: los chips de temas ("Guías de compra", "Emprendedores", "Envíos") necesitan una categoría en `EntradaBlog` que no existe; el buscador de la barra no se implementó (no hay búsqueda de entradas). Por eso el artículo destacado empieza unos 70 px más arriba. Las filas muestran solo la fecha como Figma; el destacado suma "N min de lectura" calculado del contenido (se omite si el listado no trae el contenido). La barra inferior no marca "Inicio" en `/blog` (SHELL decide por ruta).
- **Blog artículo `54:2219`:** BLOCKED por backend: la categoría de las migas ("Guías de compra"), "Productos de este artículo" (marcado "NUEVO · por programar") y el autor propio ("NUEVO · autor") no existen. Las migas son "Inicio / Blog"; el autor es "Por HotClick". Compartir funciona (WhatsApp, Facebook, copiar enlace y la hoja del sistema en el ícono de la barra).

## Reverificación contra Figma (1-oct-2026)

Se recapturaron las 8 pantallas con `tests/srv-capturas.spec.ts` (solo corre con `SRV_SHOTS=<carpeta>`) y se compararon lado a lado con los frames. No apareció ninguna diferencia visual nueva que corregir en SRV: todo lo que difiere es de datos de ejemplo, backend o decisión ya documentada (formulario con campos vacíos y sin "Presupuesto" en selector, garantía sin fotos de la falla, encargo sin tienda ni envío, cotización sin "Aceptar", blog sin chips ni buscador, artículo sin productos ni autor, Envíos con el contenido del checkout). Los íconos de `iconosCuenta` que SRV reutiliza (escudo, bandeja, lupa) heredan la corrección de ACC: trazo fijo de 2 px como en Figma.

Todas las pantallas conservan su veredicto (1 PASS y 7 PARTIAL).

## Funcionalidad preservada

- **Servicios HOT:** las mismas cinco vistas (inicio, búsqueda, garantía, reseña, digitalización), la entrada directa `?vista=busqueda|garantia|testimonio`, `?vista=solicitudes` hacia la pantalla de ACC, subida de fotos (máx. 3, 5 MB) con vista previa, Turnstile, el prefijo `[Digitalización de inventario]`, JSON-LD y SEO. La lista "Mis solicitudes" de la pestaña antigua ahora es la de ACC (`MisSolicitudesVista`), a la que lleva el aviso del inicio y el botón del formulario enviado.
- **Garantía:** el mismo `POST /garantias/solicitudes` con `productoId`, `pedidoId` y `descripcion`; el enlace de WhatsApp de HotClick; el refresco de `mis-garantias` al reportar.
- **Reseña:** `TestimonioCard` sin cambios (estrellas, fotos, envío); se reestilizó solo el contenedor y los estados.
- **Encargo:** el mismo `porToken` y `checkout` (Stripe, retiro en tienda), notas, fotos de referencia, mensaje de la tienda, rechazo, vencimiento y los siete días para pagar.
- **Cotización:** todos los datos que ya se mostraban (cliente completo, líneas con código y descripción, descuento, IVA, observaciones y términos) y sus estados.
- **Envíos:** tarifas, preguntas con enlaces (Mis Pedidos, Correos, correo de soporte, Devoluciones), atajo de envío internacional por WhatsApp, "Rastrear mi pedido", "Pedir envío rápido" y el enlace a Contacto.
- **Blog:** el mismo listado y artículo, HTML del editor saneado con DOMPurify, SEO y JSON-LD.
- **Ayuda:** usa `PaginaInformativa`; hereda la barra interna y el título.

## Defectos previos encontrados y corregidos

1. `ServiciosHotPage` leía las garantías y los productos por opinar con `extraerLista` esperando `{ data: [...] }`, pero el interceptor de `api.ts` ya desenvuelve la respuesta (el mismo defecto que ACC corrigió en `ProfilePage`): las listas llegaban como arreglo y siempre salían vacías. Corregido.
2. `BlogPage` y `BlogPostPage` leían las entradas con la misma forma y el interceptor las desenvuelve: por lectura del código, el listado salía vacío y el artículo no se mostraba (en Servicios HOT el mismo defecto se reprodujo con la API simulada). Corregido en `pages/blog/blogHelpers.ts` (acepta ambas formas, con test).
3. El artículo del blog usaba la clase `prose-hotclick`, que no tiene CSS en ningún archivo: el HTML del editor se veía sin estilos. Ahora el cuerpo define su tipografía (párrafos de 15/23, subtítulos en Sora).
4. `formatMonto` de `cotizacionService` agrupa miles con un espacio duro (`₡198 000`); Figma y el resto del sitio usan punto. La cotización pública usa `montoCotizacion` (`pages/cotizacion/cotizacionHelpers.ts`); `cotizacionService` no se tocó.

## Código eliminado

`EnviosHero`, `EnviosServiceCards`, `EnviosUrgentBanner`, `EnviosFaq`, `EnviosCta`, `EnviosPageStyles`, `enviosIcons` y `enviosData.tsx` (las tarifas pasaron a `enviosData.ts`); `BotonVolver`, `EstadoBadge`, `Field`, `GarantiaCard`, `ListaSolicitudes`, `ServiceCardImage` y `VistaBusqueda` de Servicios HOT; `inputStyle`, `ESTADO_STYLES`, `CARD_IMAGES` y `TabBusqueda` de `serviciosHelpers.ts`. Ya no tenían consumidores; la pestaña "Mis solicitudes" de la búsqueda la reemplaza la pantalla de ACC.

## Pendiente sin referencia Figma

- **`/devoluciones` y `/informacion`** (fila `28:1660` del inventario): Figma dibuja solo Envíos y dice que la plantilla sirve también para Devoluciones, Contacto, Términos y Privacidad, pero no hay un frame de cada una. `PaginaInformativa` + `BloqueInformativo` + `PreguntaFrecuente` ya están listos. Mientras no haya frames se conservan con el diseño anterior: **OLD_DESIGN / REQUIRES_DESIGN_REFERENCE**. Mismo caso para Contacto, Términos, Privacidad y Nosotros.
- **Escritorio** de todas las pantallas SRV: sin frame; columna centrada de 560 a 720 px.

## Dependencias hacia otros módulos

- **SHELL (`index.css`):** (1) ~~los inputs móviles fuerzan 16 px~~ resuelto: formulario y garantía miden 14 px como Figma (P06); (2) una regla pinta con `bg-surface` toda etiqueta `header`, `aside` y `footer` con `!important`: SRV usa `div` donde Figma pide fondo propio (encabezado azul de la cotización); (3) `h1`..`h4` heredan un `line-height` y `text-wrap: balance`: SRV los fija por componente; (4) `BarraInferior` no marca "Inicio" en `/blog` (Figma `54:2191`); (5) los alias `--color-hc-success-bg`, `--color-hc-n-400` y `--color-hc-red-50` ya existen y Servicios HOT los usa (P06); siguen sin alias `danger-bg` y `text-secondary`.
- **SYS:** el botón con isotipo y el de WhatsApp flotantes tapan el botón de envío del formulario, de la garantía y el total del encargo (no están en Figma).
- **ACC:** `acc-cuenta.spec.ts` esperaba el título anterior de Servicios HOT; se cambió la expectativa a "¿En qué te ayudamos?" (ver "Excepciones de ownership").
- **Backend:** categoría de entradas del blog, productos por artículo, autor; aceptar cotización; fotos y motivo de garantía; nombre de la tienda, fechas, tiempo y envío del encargo; teléfono del vendedor; rangos de presupuesto.

## Excepciones de ownership

- `tests/acc-cuenta.spec.ts`: una línea (la expectativa del título de `/servicios` sin parámetro). Es un spec de ACC que prueba una pantalla de SRV.
- Reutilización sin editar: `comprador/Chip` (HOME), `estados/EstadoVacio` (SYS), `MainLayout` variante `interna` (SHELL), íconos de `perfil/cuenta/iconosCuenta` y `MisSolicitudesVista` (ACC), `urlWhatsApp` de `carrito/cartHelpers` (CHK).
- i18n solo en `serviciosPage.form` (es, en y pt). El resto de los textos nuevos están en español como el código que reemplazan; `blog`, `ayudaPage`, `informacion` y `contacto` no se tocaron.
- No se tocaron `AppRoutes.tsx`, `index.css`, `MainLayout`, `static/` ni `package.json`. `ROUTES_REQUESTED.md` no cambia.

## P06 · implementación de SERVICIOS (2-oct-2026)

Sin acceso directo a Figma. Referencias `28:1429` (inicio), `28:1486` (formulario) y `28:1531` (garantía), con lo que registra este documento.

- **Remedido** con Playwright a 390 y a 1440 (`servicios-responsive.spec.ts`), con sesión y API simulada: sin desborde horizontal ni errores de consola.
  - 390: título del inicio en y=71 (22 px), cuatro opciones de 74 a 81 px de alto desde y=180, aviso «Tenés 2 solicitudes en curso» en y=531. Formulario y garantía: campos de 14 px a 358 px de ancho.
  - 1440: columna centrada de 560 px (x=440), sin frame. En formulario y garantía el botón de envío mide 528 px (x=456) y el `h1` de la barra interna no se muestra; no hay frame de escritorio que diga otra cosa.
- **Tokens:** `ServiciosInicio` (`bg-hc-success-bg`, `bg-hc-red-50`), `FormularioBusqueda` (`bg-hc-success-bg`, `border-hc-n-400`, `text-hc-danger`) y `VistaGarantia` (`text-hc-danger`) en vez de `var()` sueltos o `bg-hc-green-50`; mismo color calculado, que el spec compara con el token.
- `tests/helpers/medidasFigma.ts` reúne `sinDesborde`, `tamanosDeCampos` y `colorDeToken`; `checkout-responsive.spec.ts` los importa en vez de repetirlos.
- **Sin cambio, siguen PARTIAL:**
  - `28:1486`: «Presupuesto aproximado» como selector con rangos (REQUIERE_DECISION, sin lista aprobada) y estado enviado sin frame.
  - `28:1531`: «Fotos de la falla» y campo de motivo (backend: `SolicitudGarantia` solo guarda descripción, producto y pedido).
- `danger-bg` sigue con `var()` en el aviso de error de formulario y garantía. `TestimonioCard` y `StarPicker` («Contanos tu experiencia», sin frame) conservan `style={{ var() }}` y colores sueltos.

## Pruebas

- `tsc --noEmit` limpio. Vitest: 96 archivos y 469 tests en verde (la base tenía 92 y 437): nuevos `serviciosHelpers.test.ts`, `encargoHelpers.test.ts`, `blogHelpers.test.ts` y `cotizacionHelpers.test.ts`.
- eslint sin hallazgos en los 29 archivos modificados o nuevos. `vite build` OK en carpeta temporal; `static/` intacto.
- E2E (`tests/srv-servicios.spec.ts`, 16 casos): inicio con y sin sesión, formulario (validación, envío, teléfono con prefijo, invitado), garantía (elegir, motivo, error, envío, sin sesión), encargo (aprobado, rechazado, no encontrado), cotización, Envíos (índice y preguntas) y blog (listado, artículo, no encontrado). Se actualizaron `blog.spec.ts`, `envio-internacional.spec.ts` y `envio-rapido.spec.ts` al diseño nuevo de `/envios`.
- **Fallos previos, fuera de SRV, sin tocar:** `ui-sin-emoji.spec.ts` (16 casos: leen archivos de admin ya borrados o buscan elementos del header anterior), `envio-rapido` y `envio-internacional` en el Home (3 casos). Los mismos 19 fallan en `base` `f57da0ae`; SRV no agrega ninguno.
