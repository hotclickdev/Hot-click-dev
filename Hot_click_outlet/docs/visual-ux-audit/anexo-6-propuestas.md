# Anexo 6 — Propuestas conceptuales y priorización

**Padre:** [../visual-ux-audit.md](../visual-ux-audit.md)  
**Sin código.** Cada ficha indica si toca frontend / backend / BD / API.

Criterio de prioridad: `Impacto usuario × frecuencia × (1/complejidad) × riesgo inverso` — prioriza fricción frecuente de usuarios finales sobre polish interno.

---

## Priorización resumida

### P0 — Crítico

| ID | Título |
|----|--------|
| P0-01 | Unificar CTA primario (rojo) y tokens rotos (`--hc-card`, `--color-accent`) |
| P0-02 | Prefill checkout desde perfil (logueado) |
| P0-03 | SW reload silencioso mid-wizard / deploy static viejo *(ops + UX)* |

### P1 — Alto

| ID | Título |
|----|--------|
| P1-01 | Un kit Button/Input; deprecar cfg azul y BotonPrimario |
| P1-02 | Reemplazar mock Tienda PYME/Plus |
| P1-03 | POS: toast carrito vacío + copy sin jerga ONVO |
| P1-04 | Modal Sucursales a11y + AuthPromptModal cablear o borrar |
| P1-05 | Errores de lista ≠ empty (catálogo, home) |
| P1-06 | Registro empresa: suavizar / reubicar paso ATV |
| P1-07 | Password rules unificadas |
| P1-08 | Visitante: decidir fusión o deprecación (nav EN, stubs) |

### P2 — Medio

| ID | Título |
|----|--------|
| P2-01 | Home: reducir competencia above-the-fold |
| P2-02 | BottomNav primitivo único (6 shells) |
| P2-03 | EstadoBadge / StatCard / DataTable unificados |
| P2-04 | Wizard admin producto agrupar opcionales |
| P2-05 | Config admin agrupar secciones |
| P2-06 | Tipografía ≥12px en tablas admin; contraste badges |
| P2-07 | Paths Emp opciones vs flat — documentar o unificar |
| P2-08 | Guest PagoPendiente → no forzar /mis-pedidos |
| P2-09 | Ofertas tab o eliminar código muerto |
| P2-10 | Contrato toast/skeleton seller+admin |

### P3 — Bajo

| ID | Título |
|----|--------|
| P3-01 | i18n labels hardcoded admin |
| P3-02 | Ghost/outline naming fix en Button |
| P3-03 | Cablear `--hc-sp-*` o documentar “usar Tailwind” |
| P3-04 | Eliminar sellerAdminRoutes / Sistema* tras métricas |
| P3-05 | Wishlist sync servidor |
| P3-06 | Descubrí ayuda gestual adultos mayores |

---

## Fichas P0

### P0-01 — Tokens rotos y CTA primario inconsistente

```text
ID: P0-01
Pantalla: Global (security, cotizaciones, billetera, AdminConfiguracion)
Flujo: Cualquier acción primaria / cards admin
Problema: --hc-card indefinido; --color-accent inválido; cfg-btn primario azul vs hc-btn rojo
Impacto: UI rota o marca confusa; usuarios no reconocen “el botón principal”
Causa: Tres tracks visuales + tokens incompletos
Prioridad: P0

Estado actual:
Security/cotizaciones usan var(--hc-card). Payouts usan --color-accent.
Config usa azul como primario. Resto de app usa rojo Hot.

Propuesta:
Definir --hc-card en tokens. Corregir refs a --color-hc-accent.
cfg-btn-primary → mismo rojo (o outline azul solo para links).
Auditar contraste.

Beneficio esperado: Consistencia de marca y cards visibles.

¿Requiere frontend? Sí
¿Requiere backend? No
¿Afecta base de datos? No
¿Afecta API? No
Riesgo: Bajo
```

### P0-02 — Prefill checkout

```text
ID: P0-02
Pantalla: /checkout
Flujo: Compra logueada con envío a domicilio
Problema: telefono/direccion/email inician vacíos pese a authStore; encargo sí prellena
Impacto: Fricción en cada compra; adultos mayores abandonan; errores de tipeo
Causa: useCheckoutForm no lee perfil; Profile sin address book
Prioridad: P0

Estado actual:
Usuario A → B teléfono → C dirección → D pago → E consent → F tarjeta
(datos de A parcialmente ya conocidos)

Propuesta:
Prefill userEmail/userName/teléfono desde auth o GET /api/usuarios/me.
“Última dirección usada” si backend lo expone en pedidos previos.
Opcional fase 2: CRUD direcciones (sí API+BD).

Beneficio esperado: 7–8 campos percibidos → 3–4 confirmaciones.

¿Requiere frontend? Sí
¿Requiere backend? Ideal sí (dirección persistida); MVP solo frontend authStore
¿Afecta base de datos? Solo si address book nuevo
¿Afecta API? Solo si endpoint direcciones
Riesgo: Medio (pagos — no cambiar motor Tilopay/SINPE)
```

### P0-03 — PWA / deploy FE

```text
ID: P0-03
Pantalla: Wizards seller / cualquier SPA
Flujo: Deploy producción
Problema: ServiceWorkerRefresh recarga en silencio; Docker no buildea FE
Impacto: Pérdida de datos mid-wizard; usuarios ven JS viejo
Causa: skipWaiting + reload; imagen sin Node
Prioridad: P0

Propuesta:
Prompt visible antes de reload; no skipWaiting ciego en wizard activo.
CI gate pnpm build antes de image.
(Documentado también en FRONTEND_AUDIT.md)

¿Requiere frontend? Sí (SW UX)
¿Requiere backend? No
¿Afecta base de datos? No
¿Afecta API? No
Riesgo: Medio (PWA)
```

---

## Fichas P1 (selección)

### P1-01 — Design system Button/Input

```text
ID: P1-01
Pantalla: Global
Flujo: Todas las CTAs
Problema: 12+ sistemas de botón, 10+ inputs
Impacto: App se siente fragmentada; mantenimiento doble
Causa: Storefront + Figma seller + cfg evolucionaron aparte
Prioridad: P1

Propuesta:
1 primitivo Button (variants) + Input + migrar Boton/cfg/AdminPrimary.
Deprecar BotonPrimario/CampoTexto.
Wizards conservan CampoAnimado como capa sobre Input nativo.

¿Requiere frontend? Sí
¿Requiere backend? No
Riesgo: Medio (regresión visual amplia — migrar por zona)
```

### P1-02 — Mock tienda seller

```text
ID: P1-02
Pantalla: /pyme/tienda, /negocio-plus/tienda
Flujo: Preview vendedor
Problema: PRODUCTOS mock + título “Tienda QA2 Emprendedor”
Impacto: Falsa sensación de tienda publicada
Causa: Prototipo no cableado a API (Emp sí lo está)
Prioridad: P1

Propuesta:
Igualar a Emp useCatalogoEmprendedor O link a /tienda/:slug con banner.
Eliminar mock QA2.

¿Requiere frontend? Sí
¿Requiere backend? No (API catálogo ya existe)
Riesgo: Bajo
```

### P1-03 — POS feedback y copy

```text
ID: P1-03
Pantalla: /admin/pos
Flujo: Cobrar
Problema: Carrito vacío sin toast; “Vía ONVO” opaco
Impacto: Cajero confuso; errores de entrenamiento
Prioridad: P1

Propuesta:
Toast “Agregá al menos un producto”.
Label “SINPE Móvil” / “Tarjeta” sin marca interna ONVO en UI cajero.

¿Requiere frontend? Sí
¿Requiere backend? No
Riesgo: Bajo
```

### P1-04 — Modales a11y y AuthPrompt

```text
ID: P1-04
Pantalla: Sucursales; global AuthPrompt
Problema: Modal sucursal sin Escape/trap/aria-modal; AuthPrompt nunca se abre
Prioridad: P1

Propuesta:
Reusar components/ui/Modal.
Decidir: cablear auth prompt en add-to-cart guest O eliminar componente muerto.

¿Requiere frontend? Sí
Riesgo: Bajo
```

### P1-05 — Error ≠ empty

```text
ID: P1-05
Pantalla: /productos, Home
Problema: Fallo API → toast + array vacío = “no hay productos”
Impacto: Usuario cree que catálogo está vacío
Prioridad: P1

Propuesta:
Estado error inline con Reintentar; no llamar setProducts([] ) sin flag error.

¿Requiere frontend? Sí
Riesgo: Bajo
```

### P1-06 — Registro empresa ATV

```text
ID: P1-06
Pantalla: /registro-empresa
Problema: Paso 0 jerga ATV; No = callejón WhatsApp
Impacto: Abandono onboarding vendedores no técnicos
Prioridad: P1

Propuesta:
Mover inscripción Hacienda a checkbox en paso empresa.
“Aún no estoy inscrito” → continuar con límite de features o aviso, no bloqueo total.
(Validar con legal/negocio antes — puede ser requisito real)

¿Requiere frontend? Sí
¿Requiere backend? Posible (si flag “no inscrito” debe persistir)
¿Afecta API? Posible
Riesgo: Medio (negocio/legal)
```

### P1-07 — Password unificado

```text
ID: P1-07
Pantalla: Registro, forgot password
Problema: min 8 UI vs 6 código
Prioridad: P1
Propuesta: Una constante compartida alineada a política backend.
¿Requiere backend? Verificar política real del API
Riesgo: Bajo
```

### P1-08 — Visitante

```text
ID: P1-08
Pantalla: /visitante/*
Problema: Shell paralelo, nav EN, stubs vacíos, shipping hardcode
Prioridad: P1 (decisión de producto)

Propuesta opciones:
A) Deprecar + redirect a marketplace mobile
B) Convertir en única skin mobile de marketplace (i18n ES, mismo checkout quote)
No mantener tres checkouts mentales.

¿Requiere frontend? Sí
Riesgo: Medio (URLs bookmark)
```

---

## Fichas P2 (abreviadas)

| ID | Propuesta | FE | BE | Riesgo |
|----|-----------|----|----|--------|
| P2-01 | Home: 1 hero + destacados + CTA; demover bloques | Sí | No | Bajo |
| P2-02 | BottomNav API única (items, labels, safe-area) | Sí | No | Medio |
| P2-03 | EstadoBadge + StatCard + DataTable | Sí | No | Medio |
| P2-04 | AdminNuevoProducto: opcionales en un paso | Sí | No | Bajo |
| P2-05 | Config: 3 grupos | Sí | No | Bajo |
| P2-06 | min 12px tablas; contraste Badge storefront | Sí | No | Bajo |
| P2-07 | Unificar paths cuenta seller o doc contrato | Sí | No | Medio tests |
| P2-08 | PagoPendiente: WA + email para guest, no /mis-pedidos | Sí | No | Bajo |
| P2-09 | Tab Ofertas o borrar OfertasView | Sí | No | Bajo |
| P2-10 | Contrato skeleton/toast documentado e implementado | Sí | No | Bajo |

---

## Fichas P3 (abreviadas)

P3-01 i18n · P3-02 ghost/outline names · P3-03 spacing tokens · P3-04 dead code Sistema*/sellerAdminRoutes · P3-05 wishlist sync (BE+BD) · P3-06 Descubrí tooltips gesto.

---

## Mapa impacto × superficie

```text
Comprador frecuente: P0-02, P1-05, P2-01, P2-08
Vendedor diario:     P0-03, P1-01, P1-02, P2-07, P2-10
Cajero POS:          P1-03
Staff IT:            P0-01, P2-03, P2-05, P2-06
Onboarding:          P1-06, P1-07, P1-08
```
