# Auditoría estática — CATÁLOGO / PRODUCTOS (READ-ONLY)

Veredicto: el gate principal `GET /api/productos` está alineado con la skill de marketplace; hay **inconsistencias** en queries derivadas (feed, sitemap, destacados, recomendaciones, detalle por ID) y **4–5 UIs de alta** que no convergen.

---

## 1. Flujo crear / editar producto

### Backend (único write-path HTTP)

| Paso | Dónde |
|------|--------|
| REST | `ProductoController` → `ProductoWriteHandler` → create/update handlers |
| Alta | `POST /api/productos` + opcional `?empresaId=` + `X-Idempotency-Key` |
| Destino tenant | `EmpresaDestinoAlta.resolver`: sesión propia, o ADMIN IT con `empresaId` obligatorio |

```119:134:C:\Cursor-test-hot\Hot-click-dev\Hot_click_outlet\src\main\java\com\hotclick\controller\ProductoController.java
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR')")
    public ResponseEntity<ResponseDTO> crearProducto(
            @RequestBody @Valid ProductoRequestDTO dto,
            @RequestHeader(value = "X-Idempotency-Key", required = false) String idempotencyKey,
            @RequestParam(required = false) Long empresaId) {
        return writeHandler.crearProducto(dto, idempotencyKey, empresaId);
    }
```

```41:72:C:\Cursor-test-hot\Hot-click-dev\Hot_click_outlet\src\main\java\com\hotclick\controller\producto\ProductoCreateHandler.java
    public ResponseEntity<ResponseDTO> crearProducto(...) {
        // idempotency → empresaDestinoAlta.resolver → límite plan
        // moderación texto → productoService.crearProducto
        // productoApprovalService.aplicarReglasPublicacion
    }
```

**Persistencia alta** (`ProductoWriteOperations.crearProducto`): exige categoría; bodega del DTO o primera de la empresa; SKU auto `HC-…`; `estado=ACTIVO`; mapea DTO (incl. `visibleCatalogo`, variantes, marca).

**Publicación marketplace al crear** (no hay aprobación producto-a-producto):

```48:58:C:\Cursor-test-hot\Hot-click-dev\Hot_click_outlet\src\main\java\com\hotclick\service\producto\ProductoApprovalService.java
        boolean empresaPublicada = empresa != null
            && "ACTIVO".equals(empresa.getEstadoEmpresa())
            && Boolean.TRUE.equals(empresa.getVisibilidadPublica());
        if (empresa != null && !productoAccessGuard.isAdminIT() && !empresaPublicada) {
            producto.setVisibleCatalogo(false);
            // ... "se publicará cuando tu negocio sea aprobado"
        }
```

**Aprobar empresa** (tres escrituras atómicas):

```36:49:C:\Cursor-test-hot\Hot-click-dev\Hot_click_outlet\src\main\java\com\hotclick\service\EmpresaAprobacionService.java
        e.setEstadoEmpresa("ACTIVO");
        e.setVisibilidadPublica(true);
        productoRepository.publicarProductosDeEmpresa(empresaId);
        // + evict cache productos-publicos
```

**Edición**: `PUT /{id}` → `ProductoAccessGuard.getAccessibleProducto` + moderación + `actualizarProducto`. Sanitizer solo quita SEO/`destacado` a no-ADMIN; **no** quita `visibleCatalogo` (`ProductoRequestSanitizer` L9–22).

**Toggle público**: `PATCH /{id}/visibilidad-catalogo` (ADMIN|EMPRENDEDOR) con `CompanyScope`.

### Frontends de alta/edición

| UI | Ruta | Quién | API |
|----|------|-------|-----|
| **Wizard admin legacy** | `/admin/nuevo-producto` | No “sistema”; `RedirectSiSistema` manda sistema a form nuevo | `AdminNuevoProducto` + draft local + AI + idempotency |
| **Form sistema (admin/seller interno)** | `/admin/productos/nuevo`, `…/:id/editar` | `esUsuarioSistema`; **nuevo** redirige al Figma seller | `SistemaProductoForm` / `useSistemaProductoForm` |
| **Figma vendedor (compartido)** | `{plan}/productos/nuevo/catalogo\|personalizado`, `…/:id/editar` | PYME / Negocio Plus | `ProductoFormPage` → `catalogoVendedorApi` |
| **Figma emprendedor** | `/emprendedor/productos/nuevo/…` | Emprendedor | `AgregarProductoPage` (mismo wizard compartido, sin editar en la misma página) |
| **Carga masiva** | `/admin/productos/carga-masiva` | No sistema | `productService.create` por draft |
| **Import AI/URL/PDF/CSV** | `/admin/productos/importar` | No sistema | `ImportController` |

Figma publica con `visibleCatalogo: estado !== 'Pausado'`:

```107:134:C:\Cursor-test-hot\Hot-click-dev\Hot_click_outlet\frontend\src\prototipo\compartido\catalogoVendedorApi.ts
export function cuerpoProductoVendedor(datos: DatosProductoVendedor) {
  return {
    ...denormalizeProduct({ ... }),
    visibleCatalogo: datos.estado !== 'Pausado',
    tags: datos.categoria || null,
  }
}
```

`SistemaProductoFormRoute` fuerza sellers a Figma en **crear**; edición sigue en `SistemaProductoForm` (`routeGuards.tsx` L109–117).

---

## 2. Catálogo público — queries y filtros

### Gate canónico (skill)

`findByEstadoAndEmpresaAprobada` — INNER JOIN empresa, **sin** `fk_id_empresa IS NULL`:

```55:70:C:\Cursor-test-hot\Hot-click-dev\Hot_click_outlet\src\main\java\com\hotclick\repository\ProductoRepository.java
        "WHERE p.fk_id_estado = :estado "
        "AND p.visible_catalogo = TRUE "
        "AND p.vendido = FALSE "
        "AND e.estado_empresa = 'ACTIVO' AND e.visibilidad_publica = TRUE "
```

Usado por `ProductoCatalogQueries.listarTodosActivos` (cache Caffeine `productos-publicos`, 60s) vía `GET /api/productos` cuando **no** hay `empresaId` en JWT (`ProductoCatalogHandler` L40–48). Con JWT de negocio → lista **propia** sin gate marketplace.

Test de regresión: `CatalogoMarketplaceTest` (`src/test/.../integration/CatalogoMarketplaceTest.java`).

### Variantes de listado (gate parcial)

| Query | Empresa ACTIVO+vis.pública | `visible_catalogo` | `vendido=false` |
|-------|---------------------------|--------------------|-----------------|
| Principal | sí | sí | sí |
| Destacados / carrusel | sí | **no** | **no** |
| Por marca / categoría / nombre público | sí | **no** | **no** (marca exige stock>0) |
| Ofertas (`findByEnOfertaTrueAndVisibleCatalogoTrue`) | sí (JPQL con empresa) | sí | no explícito |
| Feed GMC `findParaFeed` | **no** | sí | no |
| Sitemap `findActivosVisibles` | **no** | sí | no |
| Recomendaciones | **no** (solo estado+stock) | **no** | **no** |
| Tienda `/api/tienda/{slug}` | interceptor exige ACTIVO+vis.pública | sí + stock | sí |

### Frontend `/productos`

- Fetch: **una página** `productService.getAll` → filtros **client-side** (`useCatalogoFetch` + `useCatalogoDerived` / `filtrarCatalogo`).
- Categorías: `/categorias/publicas`; marcas: `/marcas/publicas`.
- Tabs: all / ofertas / emprendimientos; URL sync; “para vos” pide size 100.
- Variantes en grilla: `colapsarGruposVariante` muestra 1 card por `grupoVarianteId` (`catalogoHelpers.tsx` L5–16).

Detalle: `GET /productos/{id}` **permitAll**; guard solo aplica si el caller tiene empresa en JWT (`assertCanAccessProductoDetalle` L56–61) → anónimo puede abrir producto oculto/no aprobado por ID.

Variantes swatch: `GET /{id}/variantes` filtra hermanos `estado=1` + `visibleCatalogo=true` (sin gate empresa).

---

## 3. Carga masiva / import

### A) Carga masiva UI (`AdminCargaMasiva`)

1. Fotos → drafts → wizard categoría/precios.  
2. Por ítem: upload imagen → `POST /productos?empresaId=` → galería.  
3. Payload fuerza `visibleCatalogo: true` (`publicarDraftCarga.ts` L36–46).  
4. Límites UI por rol; ADMIN IT elige empresa destino.  
5. Pasa por `ProductoCreateHandler` → sí aplica `ProductoApprovalService`.

### B) Import estructurado (`ImportController` `/api/admin/importar`)

| Endpoint | Rol | Función |
|----------|-----|---------|
| `POST /url`, `/pdf`, `/csv` | ADMIN\|EMPRENDEDOR | Extrae DTOs |
| `POST /confirmar` | idem | Máx 100; `EmpresaDestinoAlta`; límite plan; `visibleCatalogo=true`; reubica imagen S3 |

**Bypass**: `confirmar` llama `productoService.crearProducto` **directo** — no pasa por `ProductoCreateHandler` ni `aplicarReglasPublicacion` (`ImportController` L135). El listado público sigue bloqueado por empresa no ACTIVO, pero feed/sitemap/detalle por ID sí pueden filtrar solo por `visible_catalogo`.

### C) Bulk JSON `POST /api/productos/bulk`

Hasta 200; `ProductoBulkOperationsService.importar` — tampoco llama `aplicarReglasPublicacion`. Security: `POST /api/productos/**` → ADMIN|EMPRENDEDOR.

### D) Bulk marcas/categorías

- `POST /api/marcas/bulk`, `POST /api/categorias/bulk` — categorías con `@PreAuthorize`; marcas sin `@PreAuthorize` (caen en `authenticated()`).

---

## 4. Duplicación de UIs de producto

| Superficie | Propósito | Solape |
|------------|-----------|--------|
| `AdminNuevoProducto` | Wizard largo (SEO multi-idioma, AI, draft) | Legacy; sistema redirigido |
| `SistemaProductoForm` | Form corto sistema; editar | Crear redirige a Figma |
| `ProductoFormPage` (PYME/Plus) | Wizard Figma pasos | Misma API create/update |
| `AgregarProductoPage` (Emprendedor) | Casi clone de `ProductoFormPage` | Duplicación de UI |
| `AdminCargaMasiva` vs `AdminImportar` | Fotos vs URL/PDF/CSV | Dos pipelines de alta masiva |
| `AdminProducts` vs `SistemaProductos` vs prototipo `ProductosPage` | Listados admin / sistema / Figma | Tres listados |
| `ProductDetailPage` (público) vs prototipo `ProductoDetallePage` / `DetalleProductoPage` | Detalle | Varios |

Rutas (`AppRoutes.tsx` L228–241): sistema no ve carga-masiva/import/nuevo-producto legacy.

---

## 5. Riesgos visibilidad multi-tenant

Ordenados por severidad:

1. **Detalle / feed / sitemap sin gate empresa**  
   - Detalle público por ID (`SecurityAuthorizationRules` L70 + guard L56–61).  
   - `findParaFeed` / `findActivosVisibles` (ProductoRepository L172–181): solo `estado` + `visibleCatalogo`.  
   - Import/bulk pueden dejar `visible_catalogo=true` en empresa pendiente → aparecen en GMC/sitemap sin estar en `/productos`.

2. **Queries “públicas” incompletas vs skill**  
   Destacados, carrusel, marca, categoría, búsqueda por nombre: empresa OK, faltan `visible_catalogo` y/o `vendido` (Repository L100–149). Pueden filtrar productos pausados o vendidos de empresas aprobadas.

3. **Recomendaciones cross-tenant sin filtro marketplace** (`ProductoCatalogQueries` L40–64) — productos de empresas no aprobadas / no visibles.

4. **`GET /api/productos` autenticado con `empresaId`** lista todo activo del tenant (incl. `visible_catalogo=false`) — correcto para admin; no usar ese JWT en storefront.

5. **Toggle `visibleCatalogo` por EMPRENDEDOR** — “pausar” es intencional; no confundir con borrador (skill: false = no aprobado o pausado). Suspender empresa debe ser solo `estado_empresa`, sin tocar flags de producto.

6. **Oferta categoría** (`ProductoWriteHandler.aplicarOfertaCategoria`): sin `@PreAuthorize` en método; auth genérica; admin sin `empresaId` itera **toda** la categoría (`findByCategoriaId`).

7. **Marcas mutables con solo `authenticated()`** — `MarcaController` sin roles; aislamiento vía `CompanyScope` en update/delete, no en create más allá de `empresaId` de sesión.

8. **Taxonomía global** — categorías/marcas `fk_id_empresa IS NULL` = plataforma (skill); no mezclar con catálogo de productos.

9. **Cache 60s** — tras aprobar, evict en `EmpresaAprobacionService`; sin evict, demora ~1–2 min en prod.

10. **Variantes** — hermanos solo por `visibleCatalogo`; producto base no aprobado podría listar variantes visibles de otra empresa si compartieran `grupoVarianteId` (riesgo de datos mal cargados).

---

## 6. Escenarios

| ID | Escenario | Resultado esperado |
|----|-----------|-------------------|
| E1 | Empresa `PENDIENTE`, producto nuevo (wizard/Figma) | `visible_catalogo=false`; ausente de `GET /api/productos` |
| E2 | Admin aprueba vía `aprobarYPublicar` | `ACTIVO` + `visibilidad_publica=true` + productos activos publicados; aparecen tras cache |
| E3 | Empresa ACTIVO+pública, producto nuevo | Nace visible (default/`true`); en catálogo |
| E4 | EMPRENDEDOR pausa (`PATCH visibilidad` o estado Pausado Figma) | Sale del listado principal; feed/sitemap pueden seguir si solo miran `visible_catalogo` tras republish |
| E5 | Empresa `SUSPENDIDO` | Productos no en catálogo (JOIN); flags producto intactos |
| E6 | Import confirmar 50 ítems empresa pendiente | Creados con `visible=true` **sin** ApprovalService; no en listado hasta E2; **sí** riesgo feed/sitemap |
| E7 | ADMIN IT alta sin `empresaId` | 400 “Elegí la empresa…” |
| E8 | Dos colores mismo `grupoVarianteId` | 1 card en grilla; swatches en detalle |
| E9 | `GET /productos/{id}` de producto no visible | **Hoy** puede devolver 200 anónimo |
| E10 | Destacado=true, `visible_catalogo=false`, empresa OK | Puede salir en `/destacados` (query incompleta) |
| E11 | Seller “sistema” abre `/admin/productos/nuevo` | Redirect a `{plan}/productos/nuevo` Figma |
| E12 | Oferta de no-ADMIN | Solicitud `OFERTA` pendiente (no publicación inmediata) |
| E13 | Regresión legal | `CatalogoMarketplaceTest` T-MKT-001/002 |

---

## Variantes, marcas, categorías (resumen)

- **Variantes**: campos `grupo_variante_id` + `color_variante` (+ `talla`); no tabla hija; API swatches + colapso en grilla.  
- **Marcas**: públicas cacheadas; 1 marca/negocio no-ADMIN (`MarcaService` L54–56); logo S3 + moderación.  
- **Categorías**: públicas globales vs propias+globales autenticadas; bulk; soft-delete `estado=0`; alcance ADMIN global / EMPRENDEDOR tenant (`CategoriaController.asignarAlcance` L165–176).

---

## Mapa de controladores auditados

| Controller | Rol |
|------------|-----|
| `ProductoController` | Fachada REST catálogo + write |
| `CategoriaController` | CRUD + publicas + bulk |
| `MarcaController` | CRUD + publicas + logo + bulk |
| `ImportController` | Extracción + confirmar (bypass approval path) |
| `ProductoFeedController` | GMC XML + sitemap (gate incompleto) |

Skill aplicada: `visibilidad-catalogo-marketplace` (condiciones 1–6, `aprobarYPublicar`, incidente 2026-07-12, sin tienda propia plataforma).