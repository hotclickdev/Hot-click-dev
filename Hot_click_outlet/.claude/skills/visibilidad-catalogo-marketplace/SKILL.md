---
name: visibilidad-catalogo-marketplace
description: |
  Regla de visibilidad del catálogo público marketplace: los productos de
  TODOS los emprendedores aprobados deben aparecer en /productos — ocultarlos
  es un incumplimiento legal con clientes que pagan. Usar al tocar queries del
  catálogo público, flags de visibilidad (visible_catalogo, visibilidad_publica,
  estado_empresa) o flujos de aprobación de empresas/productos. Frases gatillo:
  "no aparecen los productos", "desaparecieron del catálogo", "solo se ven
  productos de HOTCLICK", "aprobar empresa", "visible_catalogo",
  "visibilidad_publica", "catálogo público", "marketplace".
---

# Visibilidad del catálogo marketplace

## El principio

HotClick es un marketplace: los emprendedores PAGAN para que sus productos
aparezcan en el catálogo público (`/productos`). Un cambio que oculte
productos de una empresa aprobada no es un bug cosmético — es incumplir el
contrato con el cliente y un problema legal. Regla dura: **nunca agregar una
condición que oculte productos de empresas aprobadas sin decisión explícita
del dueño del proyecto**.

## El gate del catálogo público (condiciones exactas)

Un producto aparece en `GET /api/productos` solo si cumple TODAS
(`ProductoRepository.findByEstadoAndEmpresaAprobada` y sus variantes de
destacados/carrusel/marca/categoría/búsqueda/ofertas). Las queries usan
`INNER JOIN` a empresa — sin bypass por `fk_id_empresa IS NULL`:

1. `producto.fk_id_estado = 1` (activo)
2. `producto.visible_catalogo = TRUE`
3. `producto.vendido = FALSE` (solo la query principal)
4. `producto.fk_id_empresa` NOT NULL (INNER JOIN)
5. `empresa.estado_empresa = 'ACTIVO'`
6. `empresa.visibilidad_publica = TRUE`

HOTCLICK no opera tienda propia: empresa 1 (seed) queda `INACTIVO` /
`visibilidad_publica=false` y sus productos / huérfanos con
`visible_catalogo=false` (migración V120). El storefront
`/api/tienda/{slug}` exige 5 y 6 en `SlugTenantInterceptor`.

**No confundir** con Marca/Categoría globales (`fk_id_empresa IS NULL` ahí
sigue siendo taxonomía de plataforma, no catálogo de productos).

## Invariantes del flujo de aprobación

- Aprobar una empresa = `estado_empresa='ACTIVO'` **Y** `visibilidad_publica=true`
  **Y** publicar sus productos activos (`visible_catalogo=true`), las tres
  cosas en una transacción: `EmpresaAprobacionService.aprobarYPublicar()`.
  Cualquier ruta nueva que active empresas DEBE pasar por ese service — hoy
  lo usan `SolicitudAprobacionController.aprobar()` y
  `EmpresaController.cambiarEstado("ACTIVO")`.
- Producto nuevo de empresa ya aprobada nace con `visible_catalogo=true`.
  NO existe aprobación producto por producto desde 2026-07; el único gate
  automático es la moderación de texto (`TextModerationService`).
- `visible_catalogo=false` en producto de emprendedor significa "empresa aún
  no aprobada", NO "borrador" — no existe flag de borrador.
- Suspender una empresa se hace SOLO por `estado_empresa` (reversible), sin
  tocar `visibilidad_publica` ni el `visible_catalogo` de sus productos.

## Checklist obligatorio al tocar el catálogo o flags de visibilidad

- [ ] Correr el test de regresión:
      `.\maven\bin\mvn -f Hot_click_outlet\pom.xml test -Dtest=CatalogoMarketplaceTest`
- [ ] Contar productos por empresa ANTES y DESPUÉS del cambio: el conteo por
      empresa aprobada no puede bajar.
      `curl -s "https://hotclick.lat/api/productos?size=100" | jq '[.data.content[].empresaId] | group_by(.) | map({empresa: .[0], n: length})'`
- [ ] Si se agrega una condición nueva al WHERE de una query pública:
      confirmación explícita del dueño + actualizar esta skill y el test.
- [ ] Verificar que `/api/tienda/{slug}` de un emprendedor aprobado sigue
      respondiendo (mismo gate).
- [ ] Recordar los caches: Caffeine `productos-publicos` (60s, se registra en
      `CacheConfig` como bean propio — activo TAMBIÉN en tests aunque el perfil
      diga `spring.cache.type=none`) y `Cache-Control: max-age=60` HTTP.
      En producción esperar ~2 min antes de dar por buena una verificación.

## El incidente que originó esta regla (2026-07-12)

`SolicitudAprobacionController.aprobar()` seteaba `estado_empresa='ACTIVO'`
pero nunca `visibilidad_publica=true` (el registro la fuerza a false). Toda
empresa aprobada quedaba invisible y `/productos` solo mostraba los productos
de HOTCLICK (empresa 1). Se detectó en producción como problema legal con los
emprendedores pagantes. Fix: `EmpresaAprobacionService` + migración `V100` +
el test `CatalogoMarketplaceTest`. Si un cambio tuyo hace fallar ese test,
NO lo "arregles" tocando el test: estás repitiendo este incidente.

## Sin tienda propia de plataforma (2026-09)

Decisión de producto: el marketplace no vende como HOTCLICK. El admin es
operador de plataforma. No reintroducir `OR p.fk_id_empresa IS NULL` en
queries públicas de productos ni reactivar empresa 1 en el listado de tiendas
sin decisión explícita del dueño.
