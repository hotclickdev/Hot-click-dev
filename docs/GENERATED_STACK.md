# Stack generado (DOC1)

<!-- generated-by: scripts/eng-gates/stack-docs.mjs -->
<!-- fingerprint: eyJqYXZhVmVyc2lvbiI6IjIxIiwic3ByaW5nQm9vdCI6IjMuNS4xNiIsInJlYWN0IjoiMTkuMi41Iiwidml0ZSI6IjguMC4xNiIsImZseXdheUNvdW50IjoxNjcsImZseXdheU1heCI6MTgxLCJmbHl3YXlMYXRlc3QiOiJWMTgxX19lbXByZXNhX3RpZW5kYV9wYXVzYWRhLnNxbCIsImNvbnRyb2xsZXJzIjoxMjUsInNlcnZpY2VzIjoyMTAsInJlcG9zaXRvcmllcyI6MTAwLCJlbnRpdGllcyI6MTAyfQ -->

> Autogenerado el **2026-10-19** desde `pom.xml`, Flyway, `frontend/package.json` y conteos de Java.
> No editar a mano. Corré `scripts/generate-stack-docs.sh`. **No incluye secretos.**

## Runtime (fuente: repo, no marketing)

| Hecho | Valor | Fuente |
| --- | --- | --- |
| Java | **21** | `Hot_click_outlet/pom.xml` `java.version` |
| Spring Boot | **3.5.16** | `spring-boot-starter-parent` |
| React | **19.2.5** | `frontend/package.json` |
| Vite | **8.0.16** | `frontend/package.json` |
| Node (engines) | >=22.13.0 | `frontend/package.json` |
| Package manager | pnpm@11.1.2 | `frontend/package.json` |
| Flyway archivos | **167** (`V1`–`V181`) | `src/main/resources/db/migration/` |
| Última migración | `V181__empresa_tienda_pausada.sql` | mismo dir |
| Controllers | 125 | `*Controller.java` |
| Services | 210 | `*Service.java` |
| Repositories | 100 | `*Repository.java` |
| Entidades `model/` | 102 | `com/hotclick/model` |

## Controllers más grandes (líneas)

| Archivo | Líneas |
| --- | --- |
| `src/main/java/com/hotclick/controller/PedidoController.java` | 324 |
| `src/main/java/com/hotclick/controller/BodegaController.java` | 322 |
| `src/main/java/com/hotclick/controller/SpaController.java` | 246 |
| `src/main/java/com/hotclick/controller/AdminResetController.java` | 232 |
| `src/main/java/com/hotclick/controller/ProductoFeedController.java` | 229 |
| `src/main/java/com/hotclick/controller/SuscripcionController.java` | 228 |
| `src/main/java/com/hotclick/controller/AuthController.java` | 212 |
| `src/main/java/com/hotclick/controller/AdminAsignarController.java` | 194 |

## Services más grandes (líneas)

| Archivo | Líneas |
| --- | --- |
| `src/main/java/com/hotclick/service/inventario/InventarioPaqueteService.java` | 532 |
| `src/main/java/com/hotclick/service/EncargoService.java` | 465 |
| `src/main/java/com/hotclick/service/analytics/AdsMetricasService.java` | 407 |
| `src/main/java/com/hotclick/service/consola/TiendaRapidaService.java` | 389 |
| `src/main/java/com/hotclick/service/suscripcion/SuscripcionOnvoChangeService.java` | 349 |
| `src/main/java/com/hotclick/service/pos/PosQrSessionService.java` | 339 |
| `src/main/java/com/hotclick/rag/service/VectorSearchService.java` | 335 |
| `src/main/java/com/hotclick/service/pos/PosQrVentaService.java` | 325 |

## Docs que suelen quedar viejos

Si README o ESTADO_ACTUAL dicen **Java 24** o **Flyway V1–V56**, están desfasados. El número canónico es esta tabla.

Claims seguros que el generador puede parchear: versión de Java (pom), rango Flyway (archivos `V*__`), React (package.json). Nunca escribe API keys ni `.env`.
