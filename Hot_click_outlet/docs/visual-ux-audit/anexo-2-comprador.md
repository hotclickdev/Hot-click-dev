# Anexo 2 — Comprador, visitante, tienda pública, auth

**Alcance:** READ-ONLY. Marketplace `MainLayout`, `/visitante/*`, `/tienda/:slug/*`, auth/onboarding.  
**Padre:** [../visual-ux-audit.md](../visual-ux-audit.md)

---

## 1. Mapa de superficies comprador

| Superficie | Prefijo | Shell | SEO | Rol |
|------------|---------|-------|-----|-----|
| Marketplace producción | `/`, `/productos`, `/carrito`, `/checkout`… | `MainLayout` | Indexable | Canónico |
| Visitante Figma | `/visitante/*` | `VisitanteShell` `max-w-md` | `noindex` | Paralelo / experimental |
| Tienda tenant | `/tienda/:slug/*` | `TiendaLayout` | Por slug | Pedido aislado del marketplace |

**Hecho:** Tres formas de “comprar” con chrome, pagos y envíos distintos.

---

## 2. Flujo canónico marketplace (paso a paso)

```text
Home (/)
 → Catálogo (/productos)  [0 campos requeridos]
 → Detalle (/productos/:id)  [1 decisión: comprar / carrito; talla/qty opc.]
 → Carrito (/carrito)  [1 decisión: pagar o WhatsApp]
 → Checkout (/checkout)  [página única + sub-estados post-pago]
 → /pago/exito | cancelado | tilopay/respuesta
 → Mis pedidos (/mis-pedidos)  [requiere auth]
```

Stepper UI: 3 macros (`cart` → `checkout` → `confirm`) en `CheckoutStepper.tsx` — **no** es un wizard multi-página dentro de checkout.

---

## 3. Home (`HomePage.tsx`)

### Estado actual (secciones en orden)

JobsHero (pilares Comprar/Vender/Emprende) → HeroRotator → TrustStrip → Destacados → Descubrí banner → CategoryBrowse → RecentlyViewed → Convenios → Marcas → Shipping → HowItWorks → Testimonials → ServiciosHot → HomeCta → SobreHotClick.

### Problema

- **Hecho:** ≥15 bloques verticales; CTA primario “Comprar” → `/productos` es claro en pilares, pero compite con chat del hero, Descubrí, categorías, destacados y segundo bloque de pilares en `HomeCta`.
- **Impacto:** Adultos mayores y usuarios poco técnicos reciben demasiada competencia visual antes de llegar al catálogo.
- **Posible simplificación:** Priorizar 1 hero + 1 grid destacados + 1 CTA catálogo above-the-fold; mover HowItWorks / Sobre / testimonials abajo o a `/informacion`.

### Estados

| Loading | Empty | Error |
|---------|-------|-------|
| Parcial (skeleton hero) | Secciones se ocultan | Solo toast — sin UI de página |

---

## 4. Catálogo (`ProductsPage` + `catalogo/*`)

### Decisiones del usuario (opcionales)

Search, sort (`default`, `para_vos`, `featured`, `price_asc/desc`, `name`), categoría, marcas, stock, condición, talla, precio min/max, paginación, quick-view.

### Problemas

1. **Vista `ofertas`:** cableada en `ProductsPage` / `OfertasView`, pero `CatalogViewTabs` solo expone tab “Emprendimientos” — **camino muerto en UI**.
2. **Doble paginación:** server page + client `CatalogGridPagination` cuando `flatGrid` — comportamiento difícil de predecir.
3. **Error:** toast + lista vacía (parece “no hay productos” en vez de fallo).

### Estados

Loading `Spinner` OK; empty con clear-filters OK; empty “para vos” sin gustos → CTA `/descubri` OK; error débil.

---

## 5. Detalle de producto

Acciones: Comprar ahora (→ carrito + `/checkout`), Agregar al carrito (toast), qty, talla, sticky bar, encargo/cotizable.

**Prefill auth en encargo:** sí (`useProductDetail` prellena nombre/email).  
**Prefill auth en checkout estándar:** no — inconsistencia.

Estados: loading spinner, not-found con link, out-of-stock disabled — OK.

---

## 6. Carrito

CTAs: pagar (→ checkout **sin auth**), WhatsApp, seguir comprando. Empty state OK.

**Problemas:**

- Modal email carrito abandonado (guest) — un paso más opcional.
- Cross-sell: error solo `console` — sin feedback.
- Sin loading (store local) — OK.

---

## 7. Checkout — auditoría de procedimiento

### Estado actual (usuario autenticado, envío a domicilio, tarjeta)

```text
1. Elegir método de envío (radio; hay default)
2. Escribir teléfono de contacto
3. Escribir dirección (≥10 chars)
4. Elegir método de pago (default TILOPAY)
5. (Opcional) cupón / gift card / notas
6. Marcar consentimiento datos
7. Pulsar Pagar
8. Completar campos tarjeta Tilopay (SDK)
→ Redirect / confirmación
```

**Actual: ~7–8 decisiones / campos obligatorios en una sola página larga.**

### Guest añade

Email + teléfono guest (+ campos SINPE si aplica).

### SINPE añade

Nombre completo, cédula, luego subida de comprobante en pantalla post-orden.

### Problema detectado (crítico UX)

**Hecho:** `useCheckoutForm` inicializa `telefono`, `direccion`, `guestEmail`, `guestPhone` en `''`. `authStore` ya tiene `userEmail`, `userName`. Checkout **no lee** el perfil.

**Impacto:** Cada compra el usuario logueado reescribe teléfono y dirección. El flujo de encargo sí prellena — el usuario aprende un comportamiento inconsistente.

**Posible simplificación:**

```text
Actual (logueado): 7–8 pasos de datos
Posible: 3–4 (confirmar envío prellenado → pago → consent → pagar)
```

Requiere: frontend leer perfil; idealmente backend endpoint de direcciones guardadas (hoy Profile no tiene address book).

### Métodos de pago

| ID | Label | Post-flujo |
|----|-------|------------|
| TILOPAY | Visa / Mastercard | Embedded card o redirect externo |
| SINPE | SINPE Móvil | Instrucciones + upload comprobante |
| EFECTIVO | Contra entrega | Mismo branch UI que SINPE sin upload; deshabilitado si Express |

### AuthPromptModal

Implementado (guest checkout / login / registro / WA) pero **`setAuthPromptOpen(true)` no existe en el repo** — código muerto desde el lado del disparador.

### Posible simplificación checkout (conceptual)

- Prefill perfil + “usar última dirección”.
- Colapsar SINPE nombre/cédula si ya están en perfil.
- Separar visualmente “Entrega” / “Pago” / “Confirmar” sin forzar 3 páginas (acordeones o sticky secciones).
- Unificar guest email: no pedir `sinpeEmail` si ya hay `guestEmail`.

---

## 8. Post-pago

| Pantalla | Feedback | Riesgo |
|----------|----------|--------|
| `PagoExito` | Print, mis pedidos o seguir, WA guest, registro guest | OK |
| `PagoCancelado` | Reintentar / cambiar método / carrito | OK |
| `PagoError` | Retry | OK |
| `PagoPendiente` | Link a `/mis-pedidos` | **Guest puede chocar con ProtectedRoute → login** |
| Polling | hasta 60× cada 3s | Timeout → pendiente |

---

## 9. Mis pedidos / Wishlist / Profile / Descubrí

### Mis pedidos

Auth required. Loading / empty / toast error / pagination — OK. Decisiones: 0 obligatorias.

### Wishlist

Store local. Empty CTA productos; out-of-stock disabled; feedback “añadido” — OK. Sin sync servidor.

### Profile

Header + pedidos recientes + seguridad (password; 2FA solo admin) + WebAuthn solo ADMIN + opiniones. **No** es centro de cuenta completo (sin direcciones ni métodos de pago) — Visitante sí enlaza stubs vacíos de direcciones/métodos.

### Descubrí

```text
load API → mazo swipe → (3 likes Ó 8 swipes Ó deck vacío) → revelación → resultados
```

Estados loading/error/retry OK. Buena UX lúdica; puede confundir a adultos mayores (gesto swipe no etiquetado como único camino).

---

## 10. `/visitante/*` — superficie paralela

| Aspecto | Visitante | Marketplace |
|---------|-----------|-------------|
| Shop / PDP / pedidos | API real | API real |
| Checkout | Reusa `CheckoutPage` | Idem |
| Carrito envío | Hardcode ₡2500 | Cotización real en checkout |
| Bottom nav labels | **English** (Home/Shop/Discover/Cart/Account) | **Español i18n** |
| Direcciones / métodos pago | Empty stubs | No existen en Profile |
| Asesor IA | Script local, no LLM | Chat real marketplace |
| SEO | noindex | index |

**Clasificación:** `Evaluar eliminación` o `Reemplazar` como skin mobile del marketplace — mantener duplica mantenimiento y confunde si alguien llega por URL legacy `/prototipo` → `/visitante`.

---

## 11. `/tienda/:slug` — checkout tenant

### Campos

nombre, correo, teléfono, envío DOMICILIO|RETIRO, dirección si domicilio, pago, notas.

### Pagos (distintos al marketplace)

SINPE_MOVIL | EFECTIVO | TRANSFERENCIA — **sin Tilopay**.

**Problema:** Un cliente que compra en marketplace y en tienda de un emprendedor aprende dos checkouts distintos (métodos, costos, chrome). Justificado por aislamiento de pedido (“No se mezcla con el marketplace”) pero la **forma** podría compartir componentes visuales.

---

## 12. Auth y onboarding

### Login (`useLoginFlow`)

```text
login
 → WebAuthn? / 2FA picker|email-otp|totp?
 → requiresEmpresaSelection? → /seleccionar-negocio
 → USUARIO_FINAL → home/from (+ modal carrito abandonado)
 → 1 modo → path directo
 → EMPRENDEDOR siempre mode-select si multi-modo
 → preferencia localStorage (no EMPRENDEDOR)
 → /mode-select
```

**Fortaleza:** Recuperación password, 2FA, Turnstile, Clerk opcional.  
**Fricción:** Árbol largo; EMPRENDEDOR siempre ve selector aunque tenga preferencia.

### Registro comprador

Campos: nombre, apellidos, correo, teléfono, identificación, password, términos → verify código email.

**Problema:** UI `minLength={8}` vs validación cliente `< 6` vs forgot-password min 6 — reglas inconsistentes.

### Registro empresa (vendedor) — 3 pasos

```text
0 Tributación (Sí/No ATV) → No = callejón WhatsApp
1 Tu empresa (nombre*, correo, tel)
2 Tu cuenta (admin, correo*, password*, tel, términos, Turnstile)
```

**Problema:** Jerga “Tributación Directa (ATV)” como paso 0 antes de cualquier dato — alto riesgo de abandono para no técnicos. “No” no es soft-skip.

### Registrar negocio (usuario ya logueado)

Formulario único (no wizard) + Hacienda.

### Mode select / seleccionar negocio

Selectores, no wizards — OK. Complejidad cognitiva: “¿qué es Sistema vs POS vs Ver tienda?” para dueños nuevos.

---

## 13. Bottom nav marketplace vs visitante vs tienda

| Shell | Items | Idioma |
|-------|-------|--------|
| MainLayout | Servicios / Emprender / Productos / Pedido / Cuenta | ES i18n |
| Visitante | Home / Shop / Discover / Cart / Account | EN hardcoded |
| Tienda | Catálogo / Pedido / HotClick | ES |

**Problema:** Misma metáfora (5 tabs) con semántica e idioma distintos — usuarios que cruzan superficies se desorientan.

---

## 14. Clasificación rápida (comprador)

| Ítem | Clasificación |
|------|---------------|
| Checkout guest + Tilopay + SINPE + efectivo | **Mantener** (core negocio) |
| Prefill checkout desde perfil | **Simplificar** (falta hoy) |
| AuthPromptModal sin trigger | **Evaluar eliminación** o cablear |
| `/visitante` paralelo | **Evaluar eliminación** / fusionar skin |
| Vista ofertas sin tab | **Reparar o eliminar** código |
| Home 15 secciones | **Simplificar** jerarquía |
| Wishlist local | **Mantener**; sync = opcional P3 |
| Descubrí swipe | **Mantener**; añadir ayuda gestual |
| Tienda checkout simple | **Mantener** lógica; **Combinar** UI con design system |
| Reglas password inconsistentes | **Simplificar** a una regla |
| Registro empresa paso ATV | **Reubicar** / suavizar copy |
