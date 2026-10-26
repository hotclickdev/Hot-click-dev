# Stack generado (DOC1)

<!-- generated-by: scripts/eng-gates/stack-docs.mjs -->
<!-- fingerprint: eyJqYXZhVmVyc2lvbiI6IjIxIiwic3ByaW5nQm9vdCI6IjMuNS4xNiIsInJlYWN0IjoiMTkuMi41Iiwidml0ZSI6IjguMS42IiwiZmx5d2F5Q291bnQiOjE3NywiZmx5d2F5TWF4IjoxOTUsImZseXdheUxhdGVzdCI6IlYxOTVfX3BhZ29fcGxhem9faW50ZXJub19zaW5wZS5zcWwiLCJjb250cm9sbGVycyI6MTI3LCJzZXJ2aWNlcyI6MjEzLCJyZXBvc2l0b3JpZXMiOjEwNCwiZW50aXRpZXMiOjEwNn0 -->

> Autogenerado el **2026-10-26** desde `pom.xml`, Flyway, `frontend/package.json` y conteos de Java.
> No editar a mano. Corré `scripts/generate-stack-docs.sh`. **No incluye secretos.**

## Runtime (fuente: repo, no marketing)

| Hecho | Valor | Fuente |
| --- | --- | --- |
| Java | **21** | `Hot_click_outlet/pom.xml` `java.version` |
| Spring Boot | **3.5.16** | `spring-boot-starter-parent` |
| React | **19.2.5** | `frontend/package.json` |
| Vite | **8.1.6** | `frontend/package.json` |
| Node (engines) | >=22.13.0 | `frontend/package.json` |
| Package manager | pnpm@11.1.2 | `frontend/package.json` |
| Flyway archivos | **177** (`V1`–`V195`) | `src/main/resources/db/migration/` |
| Última migración | `V195__pago_plazo_interno_sinpe.sql` | mismo dir |
| Controllers | 127 | `*Controller.java` |
| Services | 213 | `*Service.java` |
| Repositories | 104 | `*Repository.java` |
| Entidades `model/` | 106 | `com/hotclick/model` |

## Controllers más grandes (líneas)

| Archivo | Líneas |
| --- | --- |
| `src/main/java/com/hotclick/controller/PedidoController.java` | 324 |
| `src/main/java/com/hotclick/controller/BodegaController.java` | 322 |
| `src/main/java/com/hotclick/controller/SuscripcionController.java` | 270 |
| `src/main/java/com/hotclick/controller/SpaController.java` | 246 |
| `src/main/java/com/hotclick/controller/AdminResetController.java` | 232 |
| `src/main/java/com/hotclick/controller/ProductoFeedController.java` | 229 |
| `src/main/java/com/hotclick/controller/PosQrController.java` | 227 |
| `src/main/java/com/hotclick/controller/AuthController.java` | 212 |

## Services más grandes (líneas)

| Archivo | Líneas |
| --- | --- |
| `src/main/java/com/hotclick/service/OnvoService.java` | 605 |
| `src/main/java/com/hotclick/service/inventario/InventarioPaqueteService.java` | 532 |
| `src/main/java/com/hotclick/service/EncargoService.java` | 465 |
| `src/main/java/com/hotclick/service/analytics/AdsMetricasService.java` | 407 |
| `src/main/java/com/hotclick/service/consola/TiendaRapidaService.java` | 389 |
| `src/main/java/com/hotclick/service/suscripcion/SuscripcionOnvoChangeService.java` | 387 |
| `src/main/java/com/hotclick/service/pos/PosQrSessionService.java` | 349 |
| `src/main/java/com/hotclick/service/pos/PosQrVentaService.java` | 345 |

## Docs que suelen quedar viejos

Si README o ESTADO_ACTUAL dicen **Java 24** o **Flyway V1–V56**, están desfasados. El número canónico es esta tabla.

Claims seguros que el generador puede parchear: versión de Java (pom), rango Flyway (archivos `V*__`), React (package.json). Nunca escribe API keys ni `.env`.
