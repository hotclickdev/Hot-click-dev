# Guía paso a paso para Claude Code — renovación visual/UX HotClick

**Cómo usar este archivo:** abrí un chat nuevo en Claude Code (o Cursor) por cada fase. Copiá el bloque `PROMPT` completo. Cuando termine y hayas probado, pedile commit si querés, cerrá el chat, y pasá a la siguiente fase.

**Docs de contexto (no los reescribas):**

| Archivo | Para qué |
|---------|----------|
| [visual-ux-audit.md](../visual-ux-audit.md) | Resumen + **§20 NO CAMBIAR** + plan fases |
| [anexo-1-sistema-visual.md](./anexo-1-sistema-visual.md) | Tokens, botones, inputs |
| [anexo-2-comprador.md](./anexo-2-comprador.md) | Compra, auth, visitante, tienda |
| [anexo-3-vendedor.md](./anexo-3-vendedor.md) | Seller Emp/PYME/Plus |
| [anexo-4-admin-pos.md](./anexo-4-admin-pos.md) | Admin IT + POS |
| [anexo-5-estados-formularios.md](./anexo-5-estados-formularios.md) | Estados y forms |
| [anexo-6-propuestas.md](./anexo-6-propuestas.md) | Fichas P0–P3 |

---

## Reglas globales (pegá esto al inicio de CADA prompt)

```text
REGLAS GLOBALES (obligatorias):
1. Implementá SOLO los IDs de esta fase. Nada más.
2. Leé las fichas en anexo-6 y el anexo de zona indicado.
3. NO CAMBIAR (ver visual-ux-audit.md §20):
   - PlanPathGate / prefijos /emprendedor|/pyme|/negocio-plus
   - Motor Tilopay / SINPE / efectivo + upload comprobante
   - Redirect /{plan}/pos → /admin/pos
   - FormularioPorPasos + motion tokens + anti-doble-submit
   - Guest checkout (seguir permitiendo comprar sin login)
   - Captura inventario PWA offline
   - Consentimiento legal en checkout
4. Si una ficha dice “requiere backend/API/BD” y no es MVP frontend:
   implementá solo el MVP frontend O preguntá antes de tocar API/BD.
5. Sin commits hasta que yo lo pida.
6. Al terminar: lista de archivos tocados + cómo probar manualmente + pendientes.
7. Frontend en Hot_click_outlet/frontend. Si tocás UI que se sirve en prod,
   recordá que hace falta pnpm build antes de docker (no lo corras salvo que yo lo pida).
```

---

## Checklist de avance (marcá vos)

- [ ] Fase 0 — Ops SW / deploy (P0-03)
- [ ] Fase 1 — Tokens + Button (P0-01, P1-01)
- [ ] Fase 2 — Compra (P0-02, P1-05, P1-07, P2-08)
- [ ] Fase 3 — Seller truth (P1-02, P1-04)
- [ ] Fase 4 — POS (P1-03)
- [ ] Fase 5 — Onboarding (P1-06) + decisión Visitante (P1-08)
- [ ] Fase 6 — Home + BottomNav (P2-01, P2-02)
- [ ] Fase 7 — Admin DS (P2-03, P2-04, P2-05, P2-06)
- [ ] Fase 8 — Deuda (P2-07, P2-09, P2-10, P3 selectos)
- [ ] Fase 9 — QA / verificación

---

## FASE 0 — Ops (P0-03)

**Objetivo:** que un deploy no borre un wizard a mitad ni sirva JS viejo.

**Probar:**
1. En build PWA, al haber SW nuevo, debe aparecer prompt (no reload silencioso mid-form).
2. Documentar o añadir gate CI / nota en README: `pnpm build` obligatorio antes de `docker build`.

### PROMPT — Fase 0

```text
[Pegá REGLAS GLOBALES]

Contexto:
- Hot_click_outlet/docs/visual-ux-audit.md
- Hot_click_outlet/docs/visual-ux-audit/anexo-6-propuestas.md (ficha P0-03)
- Buscá ServiceWorkerRefresh, vite PWA config, Dockerfile del app

Tarea SOLO P0-03:
1. Evitar reload silencioso del Service Worker mientras el usuario está en un wizard/form crítico (seller FormularioPorPasos o checkout). Preferí prompt visible “Hay una actualización — actualizar” o defer reload.
2. Asegurar que el flujo de deploy documentado o CI no olvide pnpm build del frontend (la imagen Docker no compila FE). Si hay workflow GitHub, agregá el gate; si no, documentá en un comentario/README corto bajo docs/ o el sitio que ya usen para deploy — preguntame si no está claro dónde.

NO tocar lógica de pagos ni rutas.
Al final: archivos + cómo probar.
```

---

## FASE 1 — Tokens + botón primario (P0-01, P1-01)

**Objetivo:** CTA primario siempre rojo Hot; tokens rotos arreglados; empezar un solo Button.

**Probar:**
1. Admin Configuración: botón Guardar es rojo (no azul).
2. Security / cotizaciones: cards con fondo visible (`--hc-card`).
3. Billetera / PayoutModal: color accent válido.
4. Marketplace y seller: primario sigue rojo.

### PROMPT — Fase 1

```text
[Pegá REGLAS GLOBALES]

Contexto:
- anexo-1-sistema-visual.md
- anexo-6 fichas P0-01 y P1-01
- hotclick-tokens.css, index.css, Button.tsx, AdminConfiguracion cfg-btn, securityUi, PayoutModal, AdminBilletera

Tarea SOLO P0-01 + P1-01 (MVP de unificación):
1. Definir --hc-card en tokens (surface + border coherente Brand Book).
2. Corregir usos de var(--color-accent) → token válido (--color-hc-accent o --hc-accent).
3. cfg-btn-primary: mismo rojo primario que .hc-btn-primary (azul solo para links/secundarios si hace falta).
4. Empezar unificación: documentar Button como canónico; migrar al menos cfg SaveButton / botones config a Button o clases .hc-btn-*. No hace falta migrar TODO el repo Boton del prototipo en esta fase — migrá config + los sitios con tokens rotos. Dejá BotonPrimario deprecated sin romper seller.

NO rediseñar pantallas enteras. NO cambiar copy de negocio.
Al final: archivos + cómo probar.
```

---

## FASE 2 — Compra (P0-02, P1-05, P1-07, P2-08) ★ más impacto usuario

**Objetivo:** checkout menos tedioso; errores claros; password coherente; guest no choca con login.

**Probar:**
1. Login → producto → checkout: teléfono/nombre/email prellenados si existen en auth.
2. Cortar red en /productos: UI “Error + Reintentar”, no grilla vacía como si no hubiera stock.
3. Registro y forgot-password: misma longitud mínima de password.
4. Flujo guest hasta PagoPendiente: no empuja a /mis-pedidos sin sesión (WA / home / registro).

### PROMPT — Fase 2

```text
[Pegá REGLAS GLOBALES]

Contexto:
- anexo-2-comprador.md
- anexo-5-estados-formularios.md
- anexo-6 fichas P0-02, P1-05, P1-07, P2-08
- useCheckoutForm.ts, authStore, useCatalogoFetch / HomePage fetches, RegisterFormStep, useRegisterFlow, ForgotPasswordModal, PagoPendiente.tsx
- Compará con prefill de encargo en useProductDetail (ya prellena auth)

Tarea SOLO esos IDs:
1. P0-02 MVP frontend: prefill checkout desde authStore (userEmail, userName, y teléfono si existe en el store o user object). Dirección: si no hay address book en API, prefill desde último pedido del usuario SOLO si ya hay endpoint fácil; si no, dejá dirección vacía pero NO pidas email otra vez al logueado. No inventes BD.
2. P1-05: en catálogo (y home destacados si aplica), distinguir error de empty: flag error + mensaje + botón Reintentar. No setear products=[] haciéndole creer al usuario que no hay productos.
3. P1-07: una constante compartida de min password alineada a lo que valide el backend (verificá el API o el check más estricto). UI + client checks iguales.
4. P2-08: PagoPendiente para guest: no linkear solo a /mis-pedidos; ofrecer continuar comprando / WhatsApp / registro.

NO cambiar Tilopay SDK ni flujo SINPE de comprobante.
Al final: archivos + cómo probar.
```

---

## FASE 3 — Seller truth (P1-02, P1-04)

**Objetivo:** el vendedor ve su tienda de verdad; modales usables con teclado.

**Probar:**
1. Login PYME o Negocio Plus → tab Tienda: productos reales o link a `/tienda/:slug`, **no** “Tienda QA2”.
2. Sucursales (Plus): Escape cierra modal; focus trap; aria-modal.
3. AuthPromptModal: o se abre en un caso real de guest, o se elimina el código muerto (elegí una y documentá).

### PROMPT — Fase 3

```text
[Pegá REGLAS GLOBALES]

Contexto:
- anexo-3-vendedor.md
- anexo-6 P1-02, P1-04
- prototipo/compartido/TiendaPublicaPage.tsx (mock), TiendaPublicaPage emprendedor (API), AccesoTiendaPublica, SucursalesPage ModalSucursal, AuthPromptModal, uiStore authPromptOpen

Tarea SOLO P1-02 + P1-04:
1. Reemplazar mock PRODUCTOS / “Tienda QA2 Emprendedor” en TiendaPublicaPage compartida: mismo approach que Emp (catálogo API) O deep-link a /tienda/${slug} con banner “Así te ven los clientes”. Eliminar datos mock de QA.
2. Modal Sucursales: reusar components/ui/Modal (Escape, focus trap, aria-modal) o completar a11y equivalente.
3. AuthPromptModal: buscar si debe abrirse en algún flujo guest; si no hay producto claro, eliminar modal + estado muerto O cablear UN disparador útil (ej. intentar checkout features que lo necesiten). No dejes código a medias. Preguntame si dudás entre cablear vs borrar.

NO tocar PlanPathGate ni wizards de producto.
Al final: archivos + cómo probar.
```

---

## FASE 4 — POS (P1-03)

**Objetivo:** cajero entiende qué pasa si cobra vacío; sin jerga ONVO.

**Probar:**
1. /admin/pos → Cobrar sin productos → toast claro.
2. Métodos de pago: labels “SINPE Móvil” / “Tarjeta” sin “ONVO” en UI del cajero.

### PROMPT — Fase 4

```text
[Pegá REGLAS GLOBALES]

Contexto:
- anexo-4-admin-pos.md
- anexo-6 P1-03
- AdminPOSSteps, useAdminPOS, posHelpers (label ONVO)

Tarea SOLO P1-03:
1. Si carrito vacío y pulsan Cobrar: toast (o feedback visible), no no-op silencioso.
2. Quitar jerga “ONVO” de labels visibles al cajero; mantener integración interna si el código la necesita por detrás.

NO rehacer el FSM apertura→venta→cobro→qr→recibo.
Al final: archivos + cómo probar.
```

---

## FASE 5 — Onboarding (P1-06) + Visitante (P1-08)

**Objetivo:** menos abandono al registrar empresa; una sola decisión clara sobre `/visitante`.

**Importante:** P1-06 puede tener implicancia legal/negocio. Si el gate ATV es requisito duro de producto, Claude debe **preguntarte** antes de permitir “No” sin fricción.

**Probar P1-06:**
1. /registro-empresa: no empieza con muro de jerga; “no inscrito” no es solo WhatsApp callejón (salvo que vos confirmes que debe bloquear).

**Probar P1-08 (después de que vos elijas A o B):**
- A) Deprecar: `/visitante` y `/prototipo/visitante` redirigen al marketplace.
- B) Skin mobile: nav en español i18n; shipping no hardcode contradictorio.

### PROMPT — Fase 5a (solo P1-06)

```text
[Pegá REGLAS GLOBALES]

Contexto: anexo-2, anexo-6 P1-06, RegistroEmpresaPage, StepTributacion

ANTES de codear: preguntame en 3 líneas:
“¿El requisito ATV/Tributación debe BLOQUEAR el registro si responde No, o puede continuar con aviso?”
Según mi respuesta implementá:
- Si puede continuar: mover inscripción a checkbox en paso empresa; quitar callejón WA como único camino.
- Si debe bloquear: mejorar copy en lenguaje simple (sin jerga ATV primero) y mantener bloqueo pero más humano.

SOLO P1-06 en este chat.
```

### PROMPT — Fase 5b (solo P1-08 — después de decidir)

```text
[Pegá REGLAS GLOBALES]

Mi decisión de producto para /visitante es: [A deprecar + redirect | B convertir en skin mobile del marketplace]

Contexto: anexo-2 sección visitante, anexo-6 P1-08, VisitanteRoutes, VisitanteBottomNav, VisitanteCarritoPage COSTO_ENVIO

Implementá SOLO esa decisión.
Si A: redirects limpios, no borrar archivos en el mismo PR si es riesgoso — redirect basta.
Si B: labels ES i18n; no dejar shipping hardcode que mienta vs checkout real (usar checkout real o aclarar copy).

Al final: archivos + cómo probar.
```

---

## FASE 6 — Home + BottomNav (P2-01, P2-02)

**Objetivo:** first viewport más claro; un primitivo de bottom nav.

**Probar:**
1. Home móvil: less clutter above-the-fold; CTA Comprar obvio.
2. Seller/marketplace/tienda siguen navegando; safe-area intacta; labels ≥11px.

### PROMPT — Fase 6

```text
[Pegá REGLAS GLOBALES]

Contexto: anexo-2 home, anexo-3 bottom nav, anexo-6 P2-01 P2-02, HomePage.tsx, bottom navs (Seller, Emp, Visitante, Main, Tienda, Admin)

Tarea SOLO P2-01 + P2-02:
1. Home: reducir competencia visual above-the-fold (priorizar hero + destacados + CTA catálogo). No borres secciones enteras de negocio sin moverlas más abajo o a rutas existentes (/informacion, etc.). Cambios de jerarquía/orden/ocultar below fold — no reinventar marca.
2. Extraer primitivo BottomNav reutilizable (items, active, safe-area, min touch). Migrar al menos SellerBottomNav + EmprendedorBottomNav; idealmente MainLayout también. No cambiar las rutas de los items.

Al final: archivos + cómo probar.
```

---

## FASE 7 — Admin design system (P2-03 … P2-06)

**Objetivo:** admin menos caótico (tablas, badges, tipografía, config, wizard largo).

**Probar:**
1. Una tabla admin (productos o usuarios) legible en desktop; texto ≥12px.
2. Config: secciones agrupadas, no 11 items planos.
3. AdminNuevoProducto: menos pasos percibidos (opcionales agrupados).

### PROMPT — Fase 7

```text
[Pegá REGLAS GLOBALES]

Contexto: anexo-1, anexo-4, anexo-6 P2-03 P2-04 P2-05 P2-06
AdminNuevoProducto wizardHelpers, AdminConfiguracion nav, EstadoBadge* varios, StatCard*, ProductosTable

Tarea SOLO P2-03..P2-06 (MVP pragmatico):
1. P2-03: un EstadoBadge o helper de colores de estado reutilizado en al menos 2 dominios; un StatCard compartido si es barato. DataTable completo puede ser stub/parcial — al menos tipografía y padding consistente en 1–2 tablas.
2. P2-04: agrupar pasos opcionales del wizard AdminNuevoProducto (menos clicks en el stepper).
3. P2-05: AdminConfiguracion nav en 3 grupos (Cuenta / Tienda / Avanzado) sin romper deep links ?seccion=
4. P2-06: min 12px en tablas admin densas tocadas; Badge storefront contraste si lo tocás.

NO reescribir billing, payouts, security center entero.
Al final: archivos + cómo probar.
```

---

## FASE 8 — Deuda (P2-07, P2-09, P2-10 + P3 opcionales)

**Objetivo:** limpieza sin drama.

### PROMPT — Fase 8

```text
[Pegá REGLAS GLOBALES]

Contexto: anexo-3 paths, anexo-2 ofertas, anexo-5 contrato estados, anexo-6 P2-07 P2-09 P2-10 y P3-01 P3-02 P3-04 si da tiempo

Tarea:
1. P2-07: NO unificar paths Emp opciones vs flat en este PR salvo que sea trivial. Preferí documentar el contrato en un comentario corto en planPaths.ts o docs — unificar rutas es riesgoso para Playwright. Si unificás, actualizá tests.
2. P2-09: o añadir tab Ofertas en CatalogViewTabs, o eliminar/desconectar OfertasView muerto. Elegí lo más barato y seguro.
3. P2-10: aplicar ListadoFeedback (o skeleton+error) a Reportes seller y/o Encargos si aún usan texto ad hoc.
4. Opcional P3: fix ghost/outline naming en Button; i18n “Encargos”; no borrar Sistema* sin métricas — solo sellerAdminRoutes muerto si confirmás 0 imports.

Al final: archivos + cómo probar.
```

---

## FASE 9 — QA (verificación, no features)

### PROMPT — Fase 9

```text
No implementes features nuevas.
Según lo ya mergeado de las fases 0–8, generá:
1. Checklist de prueba manual (móvil + desktop) para: login, checkout logueado prefill, catálogo error, tienda seller, POS cobro vacío, registro empresa.
2. Lista de regresiones a mirar (pagos, PlanPathGate, POS).
3. Si existen tests Vitest/Playwright tocados por los cambios, corré los del área y reportá resultados.
No hagas commit. No abras scope nuevo.
```

---

## Cómo pedirle el commit (cuando vos quieras)

```text
Hacé commit de los cambios de esta fase solamente.
Mensaje: estilo del repo, 1–2 frases enfocadas en el porqué.
No uses --no-verify. No pushees. No incluyas .env ni static enorme si no corresponde.
```

---

## Orden recomendado si tenés poco tiempo

Si solo podés hacer **3 chats**:

1. **Fase 2** (compra) — lo que más siente el usuario  
2. **Fase 1** (tokens/botón) — marca coherente  
3. **Fase 3** (tienda seller real) — confianza del vendedor  

Fase 0 (SW) hacela antes de un deploy grande a producción.

---

## Anti-patrones (no le digas esto a Claude)

- “Implementá toda la auditoría visual-ux-audit.md”  
- “Rediseñá la app con un look moderno”  
- “Unificá todos los botones del monorepo en un PR”  
- “Eliminá Sistema* y /visitante ya” (sin decisión / métricas)

---

*Guía generada para acompañar la auditoría 2026-09-22. Actualizá los checkboxes arriba a medida que cierres fases.*
