# Auditoría visual, UX y de flujos — HotClick

**Fecha:** 2026-09-22  
**Alcance:** READ-ONLY. Cero cambios de código, rutas, BD o dependencias.  
**Código analizado:** `Hot_click_outlet/frontend` (+ mapas backend/API ya documentados en `docs/audit/modulos/`).  
**Profundidad:** Máxima en comprador, vendedor, tienda pública y auth. Completa pero sintética en consola IT `/admin` y POS.

### Anexos

| Anexo | Contenido |
|-------|-----------|
| [anexo-1-sistema-visual.md](./visual-ux-audit/anexo-1-sistema-visual.md) | Tokens, botones, inputs, cards, badges, tablas, modales, toasts |
| [anexo-2-comprador.md](./visual-ux-audit/anexo-2-comprador.md) | Marketplace, visitante, tienda, auth, checkout paso a paso |
| [anexo-3-vendedor.md](./visual-ux-audit/anexo-3-vendedor.md) | Emprendedor / PYME / Plus, wizards, forks |
| [anexo-4-admin-pos.md](./visual-ux-audit/anexo-4-admin-pos.md) | Consola IT y POS |
| [anexo-5-estados-formularios.md](./visual-ux-audit/anexo-5-estados-formularios.md) | Matrices de estados y formularios |
| [anexo-6-propuestas.md](./visual-ux-audit/anexo-6-propuestas.md) | Fichas P0–P3 con formato completo |
| [GUIA-CLAUDE-CODE.md](./visual-ux-audit/GUIA-CLAUDE-CODE.md) | **Prompts listos** fase por fase para pegar en Claude Code |

Este documento será la entrada para **Claude Code** en la fase de implementación. Las propuestas son conceptuales; no incluyen código. Para implementar: abrí [GUIA-CLAUDE-CODE.md](./visual-ux-audit/GUIA-CLAUDE-CODE.md) y copiá un `PROMPT` por chat.

---

## 1. Resumen ejecutivo

HotClick es un marketplace multi-tenant (Costa Rica) con **siete shells de UI** y del orden de **230 rutas**. El producto real que usan personas de distintas edades es:

1. **Marketplace comprador** (`MainLayout`) — compra con Tilopay / SINPE / efectivo.  
2. **Panel vendedor Figma** (`/emprendedor` \| `/pyme` \| `/negocio-plus`) — catálogo, pedidos, cobros, plan.  
3. **Tienda por slug** — checkout simplificado del emprendedor.  
4. **POS** — caja en `/admin/pos`.

La consola **SuperAdmin/IT** es densa y visualmente divergente; se audita por patrones, no pantalla a pantalla.

### Hallazgo central

> La aplicación no tiene un sistema de diseño único en React. Tokens CSS existen y están bien documentados, pero conviven **tres tracks visuales** (storefront rojo, seller Figma `rounded-[14px]`, config/sistema con CTA azul y tema crema). Eso, más **árboles duplicados** (marketplace vs `/visitante`, Figma vs `Sistema*` vs `Admin*`, tienda mock vs `/tienda/:slug`), multiplica pasos mentales sin añadir valor de negocio.

### Top 5 fricciones para “cualquier edad”

1. **Checkout logueado pide de nuevo teléfono y dirección** que la app ya podría conocer (el encargo sí prellena).  
2. **Demasiados looks de botón/primario** — el usuario no reconoce “la acción principal”.  
3. **Home y catálogo densos**; errores de red se disfrazan de “no hay productos”.  
4. **Onboarding vendedor** abre con jerga “Tributación Directa (ATV)” y un callejón si responde No.  
5. **Tab Tienda en PYME/Plus** muestra mock “QA2”, no la tienda real.

### Fortalezas a conservar

Gates de plan/auth, motor de pago, kit motion + `FormularioPorPasos` seller, empty states conversacionales en listas Figma, guest checkout, tokens de marca en CSS, bottom nav seller ya en 11px + safe-area.

---

## 2. Arquitectura general encontrada

### Stack frontend

React 19, React Router 7, Zustand, TanStack Query, Tailwind v4 (`@theme` en CSS), Framer Motion, Vite PWA, i18n, Clerk opcional.

### Relación pantalla → datos (patrón)

```text
Página / Shell
  → store (authStore, cartStore, uiStore, wishlistStore, tenant…)
  → services/*.ts (Axios api.ts + JWT refresh)
  → /api/* Spring Boot
  → JPA / PostgreSQL (Flyway; ddl-auto=none)
```

### Roles (hecho)

| Rol | Destino típico post-login |
|-----|---------------------------|
| Anónimo / USUARIO_FINAL | Marketplace |
| EMPRENDEDOR / PROPIETARIO / EDITOR / LECTOR | Prefijo plan Figma |
| CAJERO / GERENTE / SUPERVISOR | POS (+ panel limitado) |
| ADMIN | Consola IT `/admin` |

Evidencia de rutas: `docs/audit/modulos/00-inventario-rutas.md`, `AppRoutes.tsx`.

### Integraciones que afectan UX

Tilopay, SINPE + comprobante, Stripe/webhooks (legado/parcial), SendGrid emails, S3 media, Clerk SSO, PostHog, Sentry, Anthropic copilot, Telegram, ONVO (mencionado en POS), PWA captura inventario.

---

## 3. Mapa de navegación

```text
APLICACIÓN HotClick
│
├── Área pública (MainLayout)
│   ├── / Home
│   ├── /productos · /productos/:id · /descubri
│   ├── /carrito · /checkout · /pago/*
│   ├── /wishlist · /perfil* · /mis-pedidos*
│   ├── /blog · /servicios · /emprende · /emprendimientos
│   ├── Legales (privacidad, términos, envíos, …)
│   └── /cotizacion/:token · /encargo/:token · /recuperar-carrito/:token
│
├── Auth / onboarding
│   ├── /login · /registro · (Clerk SSO)
│   ├── /registro-empresa · /registrar-negocio*
│   ├── /mode-select · /seleccionar-negocio
│   └── /sso-callback · /sso-complete
│
├── Visitante paralelo (noindex)
│   └── /visitante/* (shop, discover, carrito, checkout→CheckoutPage, cuenta…)
│
├── Vendedor
│   ├── /emprendedor/* (opciones/* anidado)
│   ├── /pyme/* (+ equipo)
│   └── /negocio-plus/* (+ sucursales)
│
├── Tienda tenant
│   └── /tienda/:slug (home, producto, carrito, checkout, éxito)
│
├── Administración plataforma
│   └── /admin/* (IT, empresas, pagos, security, CMS, …)
│       └── escapes vendedor: config, billing, copilot, ayuda, mi-empresa
│
├── POS
│   ├── /admin/pos · /caja · /historial
│   └── /pos/pago/:token (QR cliente)
│
└── Legacy
    └── /prototipo/* → redirect a prefijos vivos
```

\* = `ProtectedRoute` o equivalente.

Menús: Navbar + BottomNav marketplace; 5-tab bottom navs en seller/visitante/tienda/admin móvil; sidebars AdminLayout / Seller / Emp.

Flujos con modal: AuthPrompt (muerto), QuickView, ConfirmModal, muchos admin modals, Sucursales modal, chat AI, AccessibilityPanel (oculto en admin/checkout).

---

## 4. Mapa de flujos principales

### Compra marketplace

```text
Home → Productos → Detalle → Carrito → Checkout → (Tilopay|SINPE|Efectivo) → Pago resultado → Mis pedidos*
```

### Compra tienda slug

```text
/tienda/:slug → producto → carrito tienda → checkout (SINPE|Efectivo|Transferencia) → éxito
```

### Alta vendedor

```text
/registro?intencion=vender | /registro-empresa
  → Tributación → Empresa → Cuenta → login panel
  → (o) /registrar-negocio si ya hay sesión
  → mode-select / seleccionar-negocio
```

### Día a día vendedor

```text
/{plan} menú → productos (wizard 5) | pedidos | reportes | opciones/cobro|bodegas|plan
             → POS vía /admin/pos
             → tienda preview (Emp real / PYME mock) vs /tienda/:slug
```

### POS

```text
Apertura → Venta → Cobro → [QR] → Recibo
```

### Login

```text
Credenciales → 2FA/WebAuthn? → empresa? → modo? → destino
```

Diagramas detallados y conteo de clics: anexos 2–4.

---

## 5. Auditoría visual

### Consistencia

| Elemento | Hallazgo |
|----------|----------|
| Botones | 12+ sistemas; primario rojo vs azul cfg |
| Inputs | 10+; SmartField checkout ≠ Input ≠ Campo ≠ cfg-input |
| Cards | Sin primitivo; KPI triplicado; `--hc-card` roto |
| Badges | 15+; `EstadoBadge` forkeado por dominio |
| Tablas | Sin DataTable; `min-w-[900px]` recurrente |
| Modales | `Modal` bueno; AuthPrompt y muchos custom bypass |
| Tipografía | Sora/Public Sans tokens; mono JetBrains en config |
| Radios | Tokens 6/10/16/24 vs hardcode 14px seller |
| Iconos | Mix SVG inline; bottom navs distintos |
| Headers | MainLayout ≠ Figma CabeceraAtras ≠ Admin topbar |

### Jerarquía

- Home: demasiados CTAs compitiendo (pilares ×2, hero, Descubrí, categorías).  
- Checkout: una página larga; acción “Pagar” existe pero secciones no están jerarquizadas como “Entrega / Pago / Confirmar”.  
- Admin IT: sidebar densa; jerga (observabilidad, multipaís, ONVO).  
- Seller Figma: mejor jerarquía mobile-first; menú tiles claros.

### Problemas visuales concretos

Tokens indefinidos; texto &lt;11px en admin/security/checkout scraps; Badge storefront con estética dark en contexto light; overlay modal hardcodeado; theme crema Sistema vs blanco SuperAdmin vs Figma.

Detalle: [anexo-1](./visual-ux-audit/anexo-1-sistema-visual.md).

---

## 6. Auditoría UX (edades y claridad)

| Audiencia | Fricciones |
|-----------|------------|
| Jóvenes / nativos digitales | Descubrí OK; Visitante EN labels raro; app “grande” pero usable |
| Adultos | Checkout largo; Mode-select abstracto (“Sistema vs POS”) |
| Adultos mayores | Texto chico admin; swipe Descubrí sin ayuda; home saturado; reescribir dirección |
| Poca experiencia tech | ATV en registro empresa; ONVO en POS; empty vs error; tres tiendas mentales |
| Acostumbrados a apps modernas | Esperan prefill, address book, un design system, bottom nav coherente |

Oportunidades: lenguaje claro (“SINPE Móvil” no “ONVO”), labels descriptivos, ayuda gestual, feedback error≠empty, acción primaria siempre el mismo color/forma.

---

## 7. Auditoría de procedimientos

Resumen de reducciones posibles (evidencia en anexos):

| Flujo | Actual | Posible | Notas |
|-------|--------|---------|-------|
| Checkout logueado domicilio+tarjeta | ~7–8 campos/decisiones | ~3–4 | Prefill (P0-02) |
| Checkout guest | ~6–7 + tarjeta | similar; unificar emails | |
| Producto seller nuevo | 5 UI | 4 | Fusionar tipo o estado |
| Producto admin | 7–8 | 4–5 | Agrupar opcionales |
| Registro empresa | 3 + callejón ATV | 2 + checkbox | P1-06 |
| POS efectivo | 3 | 3 | OK; solo feedback vacío |
| POS digital | 4 | 3–4 | Clarificar QR vs Cobrar |
| Login multi-modo | árbol largo | OK seguridad; copy modos | |

No inventar pasos: conteos basados en formularios y steppers del código.

---

## 8. Problemas de navegación

1. **Siete shells** + remap `/admin` → Figma = hops invisibles.  
2. **Asimetría** Emp `opciones/*` vs PYME plano.  
3. **Aliases** legacy admin (tiendas, moderacion, herramientas).  
4. **`/emprende` vs `/emprendimientos` vs `/emprendedor`** — naming confuso.  
5. **Visitante** reachable vía `/prototipo` redirect — segundo marketplace.  
6. **Tab Tienda seller** ≠ `/tienda/:slug`.  
7. **Permission deny** = Navigate a `/admin` sin mensaje.  
8. **AuthPromptModal** nunca abre — camino de diseño abandonado.

---

## 9. Problemas de accesibilidad

| Tema | Hecho | Impacto |
|------|-------|---------|
| ARIA dialog/expanded/live | ~25 archivos de ~1400 | Mayoría de modales/acordeones sin semántica |
| Modal Sucursales | dialog incompleto | Teclado / SR |
| Focus | `:focus-visible` global OK en index.css | No todos los custom overlays lo usan |
| Contraste | Tokens OK; Badge dark-biased; texto muted + 8–10px | Lectura difícil |
| Touch targets | Seller min-h-11 OK; admin tablas densas NO | Móvil admin |
| AccessibilityPanel | Útil (tema, fuente, daltonismo, reduce motion) | Oculto en admin/checkout/tienda |
| Labels | Wizards OK; tablas admin filtros placeholder-only | Forms admin |
| Comprensión | Jerga ATV/ONVO/observabilidad | A11y cognitiva |

---

## 10. Problemas responsive / mobile-first

| Superficie | ¿Mobile-first real? | Notas |
|------------|---------------------|-------|
| Seller Figma | Sí | `max-w-md`, sticky CTA, safe-area |
| Visitante | Sí layout | Pero nav EN y stubs |
| Marketplace | Adaptativo | Bottom nav distinta semántica; home largo en móvil |
| Checkout | Una columna larga | Teclado móvil + muchos campos = scroll agotador |
| Tienda slug | Sí | Checkout corto mejor en móvil |
| Admin / tablas | Desktop-first | Scroll horizontal; no es herramienta de bolsillo |
| POS | Pensado tablet/caja | OK |

No hay bottom nav unificada; seis implementaciones. Seller ya corrigió labels a 11px (auditoría vieja citaba 8px).

---

## 11. Problemas de formularios

Ver [anexo-5](./visual-ux-audit/anexo-5-estados-formularios.md).

Destacados: prefill ausente checkout; password rules; SmartField vs Input; registro denso; wizard admin largo; placeholders como pseudo-labels en admin; SINPE pide email/tel duplicables vs guest.

---

## 12. Procesos / pantallas duplicados

| Duplicado | Caminos | ¿Ambos necesarios? |
|-----------|---------|-------------------|
| Comprar | MainLayout vs Visitante vs Tienda slug | Tienda sí (tenant). Visitante **evaluar** |
| Catálogo vendedor | Figma vs Sistema* vs AdminProducts | Figma canónico dueño; Admin IT sí; Sistema* casi muerto |
| Checkout | Marketplace (Tilopay…) vs Tienda (offline) | Sí distintos; UI debería compartir DS |
| Preview tienda | `/{plan}/tienda` vs `/tienda/:slug` | Uno real; mock sobra |
| Product wizard | Figma 5 vs Admin 8 vs Sistema form | Roles distintos; unificar look |
| Bottom nav | 6 componentes | Combinar primitivo |
| Estado badges | 5+ archivos | Combinar |
| Auth guest prompt | Modal muerto vs link “Iniciar sesión” en checkout | Uno basta |

---

## 13. Procesos que pueden simplificarse

- Checkout logueado (prefill).  
- Home above-the-fold.  
- Registro empresa paso 0.  
- Wizard admin producto opcionales.  
- Config mega-nav.  
- Login EMPRENDEDOR siempre mode-select (respetar preferencia como otros roles).  
- Guest emails duplicados en SINPE.

---

## 14. Procesos que podrían combinarse

- Soft forks Emp/Seller listas → ya casi combinados; terminar Reportes + Tienda.  
- Button tracks → un componente.  
- EstadoBadge dominio → un mapa.  
- BottomNavs → un primitivo.  
- Confirmaciones inline → ConfirmModal.  
- Visitante shop skin → marketplace mobile (decisión producto).

---

## 15. Procesos a evaluar para eliminación

| Ítem | Cumple hoy | Riesgo si se elimina |
|------|------------|----------------------|
| `/visitante` | Prototipo Figma comprador; parte API real | Bookmarks `/prototipo`; QA visual |
| Mock Tienda PYME | Nada útil (engañoso) | **Bajo** — eliminar/reemplazar |
| `AuthPromptModal` sin trigger | Cero | **Bajo** |
| `sellerAdminRoutes.tsx` | Cero (muerto) | **Ninguno** |
| Páginas `Sistema*` catálogo/ventas | Casi inalcanzables | **Medio** — confirmar analytics |
| Vista `OfertasView` sin tab | Código huérfano UI | **Bajo** |
| BotonPrimario / CampoTexto deprecated | Call sites residuales | Bajo tras migrar |
| Aliases admin largos | Deep links viejos | Medio — mantener redirects baratos |

**No eliminar** sin validar: guest checkout, SINPE+comprobante, PlanPathGate, POS FSM, Tilopay, captura inventario, legal consents.

---

## 16. Problemas técnicos que afectan UX

```text
Checkout pide datos otra vez
↓
Causa: useCheckoutForm estado local vacío; Profile sin address book; API pedidos podría devolver última dirección pero FE no la usa
↓
Impacto: fricción compra repetida
↓
Posible: prefill FE; luego GET direcciones (API+BD)
```

```text
Error catálogo = empty
↓
Causa: catch → setProducts([]) + toast
↓
Impacto: “no hay stock” falso
↓
Posible: flag error + UI Reintentar (solo FE)
```

```text
Dueño salta Figma ↔ AdminLayout (POS/config)
↓
Causa: vendedorSeQuedaEnAdmin + tres themes
↓
Impacto: sensación de dos productos
↓
Posible: mismo Button/Input/theme tokens; no fusionar POS en Figma aún
```

```text
Wizard perdido tras deploy
↓
Causa: SW skipWaiting + reload silencioso; Docker sin pnpm build
↓
Impacto: datos perdidos / UI vieja
↓
Posible: prompt SW + CI build gate
```

```text
Permission denied silencioso
↓
Causa: Guards Navigate replace sin mensaje
↓
Impacto: “la app me botó”
↓
Posible: toast o página 403 explicativa (FE)
```

```text
PgBouncer / multi-tenant constraints
↓
Causa: backend (documentado CLAUDE.md)
↓
Impacto UX indirecto: no hay “sesión mágica” RLS; todo pasa por asserts
↓
No cambiar en rediseño visual
```

---

## 17. Dependencias frontend / backend

| Mejora UX | FE | API | BD | Notas |
|-----------|----|-----|----|-------|
| Prefill nombre/email/tel checkout | Sí | Quizá tel en perfil | No MVP | |
| Address book | Sí | Sí | Sí | Nueva entidad |
| Unificar DS visual | Sí | No | No | |
| Mock→API tienda seller | Sí | Ya existe | No | |
| Mensaje 403 UI | Sí | Opcional body | No | |
| Password policy única | Sí | Verificar regla server | No | |
| Wishlist sync | Sí | Sí | Sí | P3 |
| Suavizar gate ATV | Sí | Flag posible | Posible | Legal |
| SW prompt | Sí | No | No | Ops |
| Ofertas tab | Sí | Endpoint ofertas ya | No | |

---

## 18. Priorización P0 / P1 / P2 / P3

Ver fichas completas en [anexo-6](./visual-ux-audit/anexo-6-propuestas.md).

| Pri | IDs | Por qué |
|-----|-----|---------|
| **P0** | P0-01 tokens/CTA, P0-02 prefill checkout, P0-03 SW/deploy | Rompen uso diario o confianza visual básica |
| **P1** | P1-01…P1-08 | Fricción alta en compra, caja, onboarding, consistencia |
| **P2** | P2-01…P2-10 | Consistencia, admin usabilidad, home, paths |
| **P3** | P3-01…P3-06 | Polish, dead code, nice-to-have |

---

## 19. Propuestas conceptuales

Las 3 P0 + 8 P1 + 10 P2 están fichadas en el anexo 6 con el formato:

`ID / Pantalla / Flujo / Problema / Impacto / Causa / Prioridad / Estado actual / Propuesta / Beneficio / FE|BE|BD|API / Riesgo`.

Implementación: Claude Code debe leer el anexo de la zona que toque, no reescribir la app entera.

---

## 20. NO CAMBIAR

| Elemento | Por qué conservar |
|----------|-------------------|
| PlanPathGate + prefijos plan | Deep-links, Playwright, billing |
| Redirect `/{plan}/pos` → `/admin/pos` | Un solo POS real |
| Motor pago Tilopay / SINPE / efectivo + comprobante | Core revenue; rediseñar UI alrededor, no el FSM |
| Guest checkout sin login forzado | Conversión |
| `FormularioPorPasos` + motion tokens + anti-doble-submit | Ya resuelve wizards bien |
| `PantallaExitoWizard` / `EstadoVacioConversacional` | Claridad seller |
| `hotclick-tokens.css` como fuente de color/tipo | Brand Book; arreglar huecos, no reiniciar marca |
| Guards IT / SuperAdmin / CompanyScope backend | Seguridad multi-tenant |
| Consentimiento datos en checkout | Legal CR |
| Captura inventario PWA offline | Ops crítico; otro track de docs |
| Separación tienda slug vs carrito marketplace | Regla de negocio aislamiento |
| Bottom nav seller 11px + safe-area | Ya corregido; no bajar a 8px |

---

## 21. Plan recomendado de implementación por fases

Para Claude Code / equipo, **después** de aprobar esta auditoría:

| Fase | Objetivo | IDs | No incluye |
|------|----------|-----|------------|
| **0. Ops** | SW prompt + CI `pnpm build` | P0-03 | Features |
| **1. Tokens + Button/Input** | Reparar tokens; un Button; migrar cfg | P0-01, P1-01 | Rediseño marca |
| **2. Compra** | Prefill checkout; error≠empty; guest pendiente; password | P0-02, P1-05, P1-07, P2-08 | Address book BD (fase 2b) |
| **3. Seller truth** | Tienda API/link real; modal a11y; AuthPrompt decide | P1-02, P1-04 | Nuevos módulos CRM |
| **4. Onboarding** | ATV suave; Visitante decisión producto | P1-06, P1-08 | |
| **5. POS polish** | Toast vacío; copy | P1-03 | Rehacer FSM |
| **6. Home + nav** | Jerarquía home; BottomNav primitivo | P2-01, P2-02 | |
| **7. Admin DS** | DataTable, badges, tipografía, config groups, wizard pasos | P2-03…P2-06, P2-04 | Reescribir billing |
| **8. Deuda** | Paths doc, ofertas, dead code, i18n | P2-07, P2-09, P3-* | |
| **9. QA** | Playwright flujos compra+seller; a11y smoke; reduced-motion | — | |

Orden de valor: **0 → 1 → 2 → 3 → 5 → 4 → 6 → 7 → 8 → 9**.

---

## Mapa final de la aplicación (síntesis)

```text
APLICACIÓN
├── Pública comprador (canónico SEO)
├── Auth / onboarding
├── Visitante (paralelo — decidir destino)
├── Vendedor Figma (3 planes)
├── Tienda tenant /tienda/:slug
├── POS caja
├── Admin IT / SuperAdmin
└── Legacy redirects /prototipo, aliases /admin
```

Flujos core a optimizar primero: **compra marketplace**, **alta vendedor**, **caja POS**, **verdad de tienda publicada**.

---

## Áreas no verificadas

| Área | Por qué no se verificó en profundidad |
|------|---------------------------------------|
| Comportamiento runtime en dispositivo real | Auditoría estática de código; no E2E Playwright ejecutado en esta fase |
| Contraste WCAG numérico por pantalla | Sin mediciones automatizadas axe/lighthouse aquí |
| Copy i18n completa (`es.json` vs `en`) | Muestreo; no glosario completo |
| Cada una de las ~90 rutas admin IT | Cobertura por patrón (anexo 4), no ficha individual |
| Flujos email SendGrid pixel-perfect | Solo disparadores referenciados |
| Copilot / AI chat calidad de respuesta | Fuera de UX visual; guardrails en otros docs |
| Captura inventario PWA Android campo | Docs dedicados en `docs/qa-inventario-*` / `ops-pwa-*` |
| Backend OpenAPI contrato campo a campo | Se usaron inventarios existentes `00-inventario-endpoints.md` |
| Pagos Stripe legacy vs Tilopay en prod | FE muestra Tilopay como card path; no se auditó configuración prod |
| Multi-empresa edge cases impersonación | Banner existe; no se recorrieron todos los estados |

Si Claude Code implementa, debe **re-verificar en navegador** cada P0/P1 antes de marcar done.

---

## Criterio de éxito de la renovación (para la siguiente fase)

La app será “mucho más fácil” cuando:

1. Un usuario logueado confirma envío en lugar de reescribirlo.  
2. El botón primario se ve igual en marketplace, seller y config.  
3. Un error de red no se confunde con catálogo vacío.  
4. El vendedor ve su tienda real desde el tab Tienda.  
5. Un cajero entiende SINPE sin conocer “ONVO”.  
6. Un emprendedor nuevo no choca con jerga ATV como primer muro.  
7. No existen tres marketplaces mentales (Main / Visitante / mock).

---

*Fin del documento principal. Evidencia detallada y fichas en anexos 1–6. Sin modificaciones al código fuente en esta entrega.*
