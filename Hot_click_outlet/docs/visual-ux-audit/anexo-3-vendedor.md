# Anexo 3 — Vendedor (Emprendedor / PYME / Negocio Plus)

**Alcance:** `/emprendedor/*`, `/pyme/*`, `/negocio-plus/*`.  
**Padre:** [../visual-ux-audit.md](../visual-ux-audit.md)  
**Auditoría previa relacionada:** `docs/frontend-audit/FRONTEND_AUDIT.md` (sep 2026) — verificada y actualizada aquí.

---

## 1. Arquitectura de shells

```text
Login vendedor
 → PlanPathGate
    → /emprendedor + EmprendedorShell   (plan default)
    → /pyme + SellerShell               (plan PYME) + Equipo
    → /negocio-plus + SellerShell       (plan Plus) + Sucursales
```

POS siempre `/admin/pos` (redirect desde `/{plan}/pos`). Escapes en `/admin`: config, billing, copilot, mi-empresa, ayuda.

---

## 2. Asimetría de rutas (misma job, URLs distintas)

| Job | Emprendedor | PYME / Plus |
|-----|-------------|-------------|
| Negocio | `/emprendedor/opciones/negocio` | `/pyme/negocio` |
| Plan | `…/opciones/plan` | `/pyme/plan` |
| Bodegas | `…/opciones/bodegas` | `/pyme/bodegas` |
| Perfil / cobro / ayuda | bajo `opciones/*` | paths planos |

Emp redirige paths planos → anidados (`EmprendedorRoutes`). Helper `rutaCuentaSeller` en `planPaths.ts`.

**Problema:** Docs, soporte y deep-links deben explicar dos convenciones. Usuario que cambia de plan (Emprendedor→PYME) ve URLs distintas para lo mismo.

**Clasificación:** **Simplificar** — unificar a paths planos (Emp ya tiene redirects) o documentar como contrato estable y no tocar (riesgo Playwright).

---

## 3. Bottom nav

Ambos: 5 tabs (Productos, Tienda, Menú, Reportes, Opciones), `text-[11px]`, `pb-[env(safe-area-inset-bottom)]`, `min-h-11`.

**Nota:** Auditoría seller anterior reportaba `text-[8px]` — **código actual ya usa 11px**. Conservar; no regresar a 8px.

Seis bottom navs en toda la app (Emp, Seller, Visitante, Admin, Tienda, Main) — misma UX, código distinto → **Combinar** primitivo `BottomNav` parametrizable (P2).

---

## 4. Creación de producto — procedimiento

### Estado actual

```text
1. Elegir tipo (catálogo | personalizado)     ← página separada, progreso 0/5
2. Foto (opcional)
3. Nombre y categoría
4a. Precios  OR  4b. Forma de cobro (personalizado)
5. Descripción y stock (o detalles cliente)
→ PantallaExitoWizard
```

Edit añade paso `estado` (Publicado/Pausado) → **5 pasos** en wizard.

Lógica compartida: `productoVendedorPasos` + `useFormProductoVendedor` + `PasosProductoVendedor`.  
Chrome distinto: Emp `AgregarProductoPage`/`EditarProductoPage` vs Seller `ProductoFormPage`.

```text
Actual: 5 pasos UI (tipo + 4)
Posible: 4 (tipo como toggle en paso 1; o combinar detalle+estado en edit)
```

Comparar con **AdminNuevoProducto**: 7–8 pasos (fotos, nombre, desc, precios, clasificación, detalles, contenido, seo) — **dos wizards de producto** según rol. Vendedor Sistema es redirigido al form Sistema, no al wizard admin largo.

---

## 5. Otros wizards seller

| Wizard | Pasos | Evaluación |
|--------|-------|------------|
| Plan change | 2–3 | OK |
| Invitar equipo (PYME) | 4 | OK |
| Datos negocio | 3 | OK |
| Método cobro | 3 | OK |
| Nueva bodega | 3 | OK |
| Perfil | 3 | OK |
| Sucursal (Plus) | 3 | OK; modal a11y incompleto (Escape/trap/aria-modal) |

Ninguno >5 pasos de formulario. Fortalezas: `FormularioPorPasos`, anti-doble-submit, `PantallaExitoWizard`, `EstadoVacioConversacional`.

---

## 6. Forks de páginas

| Par | Estado | Acción |
|-----|--------|--------|
| ProductosPage emp / compartido | Soft fork → `ProductosListaVista` | Thin wrappers OK; no fusionar chrome a ciegas |
| Pedidos / Bodegas / Planes | Soft fork → vistas compartidas | OK |
| TiendaPublicaPage | **Hard fork** | Emp = API real; PYME/Plus = **mock “Tienda QA2 Emprendedor”** |
| ReportesPage | Fork real | Unificar UI |
| Encargos | Soft → `EncargosPanel` | OK |

### Falso preview tienda (P1)

**Hecho:** Tab Tienda en PYME/Plus muestra productos mock y título QA2. La tienda real es `/tienda/:slug` vía `AccesoTiendaPublica`.

**Impacto:** El vendedor cree que está viendo su tienda; los cambios de catálogo no se reflejan ahí.

**Propuesta:** Reemplazar mock por preview API (como Emp) o deep-link a `/tienda/:slug` con banner “así te ven los clientes”.

---

## 7. Estados (muestra)

| Página | Loading | Error | Empty |
|--------|---------|-------|-------|
| Productos / Pedidos / Bodegas | `ListadoFeedback` skeleton | `role="alert"` | `EstadoVacioConversacional` |
| Reportes | texto “Cargando…” | texto danger | débil |
| Tienda Emp | texto | danger | conversacional |
| Tienda Seller | — (mock sync) | — | solo filtro vacío |
| Encargos | Spinner | toast acciones | texto filtro |
| Cobro | texto | toast | conversacional |

**Problema:** Contrato F5 (`ListadoFeedback`) no aplicado a reportes/encargos/mock tienda.

---

## 8. Design kit seller

| Mantener | Deprecar / unificar |
|----------|---------------------|
| `FormularioPorPasos`, motion tokens, `Campo`/`CampoAnimado` | `BotonPrimario`, `CampoTexto` emp |
| `PantallaExitoWizard`, `EstadoVacioConversacional` | Doble `EntradaPagina` en Ayuda emp |
| `Boton` compartido (hasta migrar a `Button`) | Pelea Tailwind+Framer en EquipoPage CTAs |
| Toast Brand Book | Modal Sucursales sin a11y completo |

---

## 9. Flujos duplicados vendedor

```text
A) Shell Figma → Productos / Pedidos / Reportes (canónico post-login)
B) /admin + Sistema* pages (casi inalcanzable por remap AdminRoleSwitch)
C) /admin Admin* IT (staff)
```

`sellerAdminRoutes.tsx` — puente **no cableado** (código muerto).

```text
A) /{plan}/tienda mock o preview
B) /tienda/:slug real
```

```text
A) Wizard producto Figma (4–5)
B) AdminNuevoProducto (7–8) para staff/hotclick
C) SistemaProductoForm (warm theme)
```

---

## 10. Módulos ausentes en seller routes

Inventario dedicado, CRM clientes, marketing — no están en prefijos Figma. POS redirige a admin. Gift cards / forecast vía PlanGate en admin.

**No inventar módulos en esta auditoría** — solo anotar huecos vs expectativa de “app completa de negocio”.

---

## 11. Clasificación

| Ítem | Clasificación | Riesgo si se elimina |
|------|---------------|----------------------|
| Shells Figma + PlanPathGate | **Mantener** | Rompe producto vendedor |
| Paths Emp `opciones/*` | **Simplificar** o documentar | Deep-links / tests |
| Mock Tienda PYME/Plus | **Reemplazar** | Bajo (mock falso) |
| Soft forks lista | **Mantener** wrappers | — |
| Reportes fork | **Combinar** | Bajo |
| BotonPrimario / CampoTexto | **Evaluar eliminación** | Tras migrar call sites |
| sellerAdminRoutes | **Evaluar eliminación** | Ninguno (muerto) |
| Sistema* páginas | **Evaluar eliminación** tras confirmar 0 tráfico | Medio (rollback remap) |
| FormularioPorPasos kit | **NO CAMBIAR** lógica | Alto |
| Redirect POS → admin | **NO CAMBIAR** | Alto (caja) |
| Modal Sucursales a11y | **Simplificar** (completar patrón Modal) | Bajo |
| Equipo solo PYME / Sucursales solo Plus | **Mantener** (plan) | — |
