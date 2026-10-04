# Traspaso — Rediseño del comprador HotClick (2026-09-28)

Este documento es para que **otra sesión de Claude Code** retome exactamente donde
quedó esta. El usuario va a correr `/clean` en esta sesión (borra el contexto de
conversación, NO borra archivos en disco). Todo lo que hay que saber está acá y
en la memoria persistente (`~/.claude/projects/C--Users-pmdan/memory/`).

## Quién es el usuario y cómo trabajar con él

- Dueño/operador de **HotClick** (hotclick.lat), marketplace de emprendedores en
  Costa Rica. Repo: `C:\Users\pmdan\Hot-click-dev`.
- Escribe en español informal y rápido, con errores de tipeo. Responder en
  español claro, sin jerga, con ejemplos en colones cuando sea plata.
- Le gusta: diseñar TODO el flujo en Figma primero (con datos reales del
  catálogo), acelerar con varios agentes en paralelo + un agente supervisor,
  y que se distinga claramente qué existe en el código de qué es
  "NUEVO · por programar" (nunca inventar funciones).
- **Regla dura: nunca hacer push ni deploy sin su autorización explícita de esa
  sesión.** El 2026-09-27 dio autorización total ("integrar, testear local,
  GitHub Actions, y deploy solo si todo pasa, con backup y rollback"), pero
  esa autorización es de esa sesión — pedila de nuevo si hace falta desplegar.
- Ver memoria: `feedback_forma_de_trabajo.md` y `user_hotclick.md`.

## El proyecto

- Backend: Spring Boot 3.4.4 / Java 21, en `Hot_click_outlet/`.
- Frontend: React + Vite, en `Hot_click_outlet/frontend/`.
- Maven local: usar `../maven/bin/mvn` desde `Hot_click_outlet/` (no hay `mvn`
  global instalado).
- Producción: Lightsail (`18.119.201.126`), no EC2/RDS (migrado 24 sep 2026).
  Ver `CLAUDE.md` del repo para el procedimiento de deploy.
- Figma del rediseño: `fileKey TmxYFj2nauu10WZnZ0t6yt`, archivo "Sin título",
  página **"Home de compra · prototipo"** (id `4:2`). Tiene ~76+ pantallas en
  11 secciones (00 Sistema de diseño, 01 Inicio, 02 Buscar y explorar,
  03 Producto y tiendas, 04 Comprar, 05 Cuenta, 06 Servicios y ayuda,
  07 Mapa del flujo, 08 QR y correos, 09 Funciones existentes [aprobada por el
  usuario, no tocar su contenido], 10 Estados del sistema, 11 Contenido y SEO).

## Qué se hizo en esta sesión (orden cronológico resumido)

1. **Auditoría del Home actual** (antes de rediseñar) → informe publicado como
   Artifact. Encontró que el Home no estaba orientado a comprar.
2. **Arreglos urgentes** (ya en producción, verificado contra `hotclick.lat`):
   - La API pública exponía `precioCompra`, margen, proveedor y datos internos
     de bodega de cada emprendedor. Se agregó un `BeanSerializerModifier`
     (`CamposInternosSerializerModifier` + `VisibilidadCamposInternos`) que
     los oculta salvo al dueño del producto o ADMIN.
   - Categorías "Sin nombre" en el Home → arreglado.
   - Chat público con límite de 300 msj/día GLOBAL → cambiado a límite por
     visitante (IP) + tope de costo por empresa, con degradación sin cortar.
   - Popup de cupón agresivo a los 8s → cambiado a la 3ª página de la visita.
   - Commit original `6d4645dd` (local) — **ya está integrado en
     `origin/master`** junto con otros cambios que subió el usuario desde otra
     sesión/Cursor. Verificar con `git log --oneline -S "CamposInternosSerializerModifier" origin/master`.
3. **Prototipo completo en Figma** del flujo del comprador (visitante), hecho
   con agentes fork en paralelo + un agente supervisor por ronda. Cubre: Home,
   búsqueda con asistente IA integrado, búsqueda por foto, filtros, ficha de
   producto (variantes, personalización, agotado), perfil público de tienda
   (con nota SEO: JSON-LD LocalBusiness, título/meta, OG image), directorio de
   emprendimientos, carrito, checkout en 3 pasos, pago exitoso/fallido,
   recuperar carrito, Mi cuenta completa, Servicios HOT, QR de mesa/pago,
   7 correos transaccionales rediseñados, estados vacíos/error/cookies,
   idioma y accesibilidad, blog, galería con zoom, tarjeta de regalo,
   cotización pública, instalar la app.
4. **Decisión de negocio clave (confirmada por el usuario):** cuando el
   carrito tiene productos de varios vendedores/emprendimientos, se usa el
   modelo **"un pago a HotClick, un paquete/envío por vendedor"** (Opción 1,
   como Etsy/Mercado Libre) — NO se intenta cobrar un solo envío combinado.
   HotClick cobra todo y liquida después a cada vendedor su parte. El diseño
   en Figma y el backend implementado ya siguen este modelo.
   - El aviso al comprador cuando hay 2+ emprendimientos en el carrito dice:
     el envío es individual por negocio, se recomienda envío a domicilio
     (retirar en varios locales implica distancias), y "tu compra ayuda a N
     emprendedores a crecer — estamos trabajando para reducir el costo de
     envío en compras de varios emprendimientos" (promesa a futuro, no
     implementada aún).
   - La encomienda (bus/transporte) NO tiene tarifa fija: el monto lo cobra la
     empresa de transporte y varía según destino; en checkout se muestra
     "Varía" en vez de un ₡ fijo.
5. **Implementación en 6 agentes en paralelo**, cada uno en su propio
   `git worktree` (aislados de `master`), retomados varias veces por cortes
   del límite de uso de la cuenta. **Nada se subió a `master` ni se pusheó.**

## Estado exacto de cada rama/worktree (verificar con `git worktree list`)

| Agente | Worktree / rama | Último commit | Estado |
|---|---|---|---|
| K — Home y layout | `.claude/worktrees/agent-a43e1a7dd9726d92f` / `worktree-agent-a43e1a7dd9726d92f` | `f9aa72e4` | **Completo.** MainLayout nuevo (header fijo + buscador híbrido, barra inferior, footer con banner vendedor), HomePage rediseñado, borró componentes viejos del Home (HeroRotator, ConveniosMarquee, HomeMarcas, TestimonialsCarousel, etc.), Navbar/Footer/BottomNav viejos eliminados. tsc limpio, 270 tests vitest OK. **Riesgo:** cambia el aspecto de TODAS las páginas que usan MainLayout; falta probar visualmente (nunca se corrió `pnpm build` ni se levantó en navegador). |
| L — Buscar y explorar | `.claude/worktrees/agent-a788de4a20d0e0b15` / `worktree-agent-a788de4a20d0e0b15` | `b1b822f1` | **Completo.** SearchPanel a pantalla completa en móvil con "Preguntale al asistente", `/buscar/foto`, `/categorias`, catálogo con chips "Entendí" y filtros compartidos, estado sin resultados. tsc limpio, 284 tests OK. 10 avisos ESLint preexistentes (no son de este agente, confirmado con `git show` sobre el commit base). |
| N — Checkout multivendedor | `.claude/worktrees/agent-n-multivendedor` / `feat/checkout-multivendedor` | `d5b750a2` | **Backend completo y probado (992 tests, 0 fallos).** `CheckoutPaquetesPlanner`, `CheckoutGrupoFactory`, `PedidoGrupoService` nuevos: agrupan el carrito por bodega/vendedor, crean un subpedido por vendedor bajo un mismo `grupoPago` y un único `Pago`. Confirmación/fallo/expiración/comprobante SINPE actúan sobre todo el grupo. Encomienda a costo 0 (se cobra aparte). Gift card pública sin sesión. Migración `V142` (columna `grupo_pago`). `PaymentCheckoutResponse.paquetes` es aditivo, retrocompatible (carrito de 1 vendedor = 1 pedido, como antes). **Frontend INCOMPLETO:** se cortó a mitad de conectar `CheckoutForm.tsx` con `ShippingSection` para mostrar el envío agrupado por paquete. Falta: UI del carrito/checkout agrupada por paquete y la pantalla del vendedor para cargar su guía (ya diseñadas en Figma, nodos en sección 04). |
| M — Producto y tiendas | `.claude/worktrees/agent-ab89ab36afacc3bd5` / `worktree-agent-ab89ab36afacc3bd5` | `319f0ca6` | **Parcial.** Hecho: perfil público de tienda (`StorefrontInfoMapper` extendido con descripción, categoría, antigüedad, sello condicional de factura electrónica, Instagram, zona de envío, punto de retiro condicional), `TiendaSobreNosotros.tsx` nuevo, SEO real (title/description/OG + JSON-LD LocalBusiness vía `generateLocalBusinessJsonLd`), `@JsonIgnore` en campos sensibles de `Empresa` (usuarioHacienda, claveHaciendaEnc, certP12Path, pinCertEnc, stripeCustomerId). **Falta:** galería a pantalla completa con zoom, selector de variantes, ficha agotada con "Avisame cuando vuelva" (NUEVO: necesita entidad + migración + endpoint), restyle de `/emprendimientos`. **⚠️ VER "Problema pendiente crítico" abajo.** |
| O — Cuenta y estados | `.claude/worktrees/agent-a616fba9d8501b74e` / `worktree-agent-a616fba9d8501b74e` | `f4a60e21` | **Parcial, muy incompleto todavía.** Hecho: encomienda "Varía" en `/envios`, primitivos `EstadoVacio`/`ListaAccesos` en `components/comprador/estados/`, restyle de 404/wishlist vacía/pedidos vacíos. En curso cuando se detuvo: "render por paquete" en `pedidoHelpers.ts`/`OrderCard.tsx` (dijo haber corregido un enlace roto que él mismo había introducido — **revisar con cuidado antes de confiar en este commit**). **Falta (grande):** "Mi cuenta" con resumen/feed de actividad, detalle de pedido por paquete, Servicios HOT/garantía/encargo, páginas informativas con plantilla nueva, restyle de login/registro/2FA/recuperar contraseña (NO tocar la lógica de `useLoginFlow` ni los servicios de auth, solo visual), estado vacío de "Mis solicitudes". |
| P — Correos y QR | `.claude/worktrees/agent-a8de2ad06fbba06a6` / `feat/correos-transaccionales-figma` | `74174af4` | **Completo.** `EmailLayoutHelper.java` nuevo (tablas + estilos inline, fiel a Figma), los 12 builders de correo heredan el esqueleto sin cambiar su firma. `esc()` ahora escapa comillas también. `OtpService` corregido (tenía HTML sin escapar el nombre del usuario — vulnerabilidad de inyección menor, ya arreglada). Tests nuevos agregados. Pantallas QR (`SelfCheckoutPage`/`POSPagoPage`) no necesitaron cambios, ya usaban el número SINPE real del backend. 495 tests de `service` OK. |

## ⚠️ Problema pendiente crítico — investigar primero

El agente M reportó que el test `SkuPorEmpresaIT` (2 casos:
`numeracionPorEmpresaNoGlobal`, `catalogoPublicoOcultaSku`) falla, y dijo que
ya fallaba en `master` antes de su trabajo, sin relación con su tarea. **Se
verificó corriendo el test directo sobre `master` limpio
(`../maven/bin/mvn test -Dtest=SkuPorEmpresaIT` desde `Hot_click_outlet/`) y
es cierto que falla ahí también.**

Causa raíz encontrada: el commit de arreglos urgentes `6d4645dd`
(`CamposInternosSerializerModifier`) oculta `numeroLocal` como si fuera un
campo interno sensible, pero `SkuPorEmpresaIT` espera verlo en la respuesta
del detalle de producto (`$.data.numeroLocal`). Es una **regresión real
introducida por los arreglos urgentes**, no un problema de ningún agente del
rediseño.

**Antes de integrar nada, hay que decidir:**
- Si `numeroLocal` debe ser público (el test tiene razón) → sacarlo de la
  lista `PRODUCTO_INTERNOS` en `CamposInternosSerializerModifier.java`.
- Si `numeroLocal` debe seguir oculto (el filtro tiene razón) → actualizar el
  test para que no lo espere.
- Repasar `PRODUCTO_INTERNOS` completo por si hay otro campo mal clasificado.

Confirmar además si esta regresión ya llegó a `origin/master` (el usuario
subió cambios desde otra sesión que incluían el commit `6d4645dd`) — si es
así, el test rojo puede estar rompiendo CI en GitHub Actions ahora mismo.

## Plan que quedó a mitad, tal como se lo describí al usuario

1. Terminar la implementación (retomar N, O, M en lo que falta; considerar si
   conviene relanzar M/O completos con un agente fresco en vez de seguir
   parchando, dado lo fragmentado del progreso).
2. Revisión de un agente supervisor sobre el código de cada rama (homogeneidad
   de estilos, nada roto), y revisión personal mía de la parte de pagos (N)
   antes de integrar — es la más delicada.
3. Integrar todo en una rama única (ej. `feat/rediseno-comprador`), un solo
   `pnpm build` al final (nunca regenerarlo por rama suelta).
4. Pruebas locales completas: `tsc`, vitest, `../maven/bin/mvn test` completo,
   eslint.
5. Abrir un PR para disparar TODOS los GitHub Actions relevantes: `ci.yml`,
   `security.yml` (gitleaks), `deps-vuln.yml`, `sonarcloud.yml`, los gates
   E1-E18 (Flyway, tenant, sensitive paths, SPA/pnpm build, i18n, authz), y
   `playwright-area.yml`.
6. Deploy SOLO si todo pasa, y SOLO con autorización explícita del usuario en
   esa sesión: backup de la base en Lightsail antes, merge a `master`, deploy,
   verificación de salud + smoke test contra `hotclick.lat` (catálogo,
   checkout, confirmar que la API sigue sin exponer campos internos), rollback
   inmediato si algo falla.
7. Reportar al usuario qué se subió, resultado de cada prueba, y qué quedó
   pendiente y por qué.

**El usuario dio autorización total para este plan (incluido el deploy si todo
pasa) el 2026-09-27**, pero pedila de nuevo en la sesión nueva antes de
desplegar — la autorización es por sesión.

## Cómo retomar

1. Leer este archivo completo y la memoria (`user_hotclick.md`,
   `feedback_forma_de_trabajo.md`).
2. Correr `git worktree list` para confirmar que las 6 ramas siguen ahí.
3. Resolver primero el problema de `SkuPorEmpresaIT` (ver arriba).
4. Decidir con el usuario si conviene relanzar agentes frescos para M y O
   (llevan varios cortes por límite de uso y quedaron con alcance disperso)
   o seguir pidiéndoles continuar sus ramas actuales.
5. Seguir el plan de integración de la sección anterior.

## Nada se subió sin permiso

`master` local está limpio (`git status` sin cambios), no hay push pendiente,
no se tocó `Hot_click_outlet/src/main/resources/static/` desde ningún
worktree, y no se desplegó nada a Lightsail en esta sesión.
