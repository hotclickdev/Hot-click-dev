# Stack generado (DOC1)

<!-- generated-by: scripts/eng-gates/stack-docs.mjs -->
<!-- fingerprint: eyJqYXZhVmVyc2lvbiI6IjIxIiwic3ByaW5nQm9vdCI6IjMuNS4xNiIsInJlYWN0IjoiMTkuMi41Iiwidml0ZSI6IjguMS42IiwiZmx5d2F5Q291bnQiOjIxNSwiZmx5d2F5TWF4IjoyMzUsImZseXdheUxhdGVzdCI6IlYyMzVfX3FhX2FsdGFfcHltZV90ZXN0LnNxbCIsImNvbnRyb2xsZXJzIjoxMzIsInNlcnZpY2VzIjoyMzAsInJlcG9zaXRvcmllcyI6MTA5LCJlbnRpdGllcyI6MTExfQ -->

> Autogenerado el **2026-11-09** desde `pom.xml`, Flyway, `frontend/package.json` y conteos de Java.
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
| Flyway archivos | **215** (`V1`–`V235`) | `src/main/resources/db/migration/` |
| Última migración | `V235__qa_alta_pyme_test.sql` | mismo dir |
| Controllers | 132 | `*Controller.java` |
| Services | 230 | `*Service.java` |
| Repositories | 109 | `*Repository.java` |
| Entidades `model/` | 111 | `com/hotclick/model` |

## Controllers más grandes (líneas)

| Archivo | Líneas |
| --- | --- |
| `src/main/java/com/hotclick/controller/SuscripcionController.java` | 380 |
| `src/main/java/com/hotclick/controller/PedidoController.java` | 327 |
| `src/main/java/com/hotclick/controller/BodegaController.java` | 322 |
| `src/main/java/com/hotclick/controller/SpaController.java` | 248 |
| `src/main/java/com/hotclick/rag/controller/ShoppingAssistantController.java` | 241 |
| `src/main/java/com/hotclick/controller/AdminResetController.java` | 240 |
| `src/main/java/com/hotclick/controller/OnvoWebhookController.java` | 238 |
| `src/main/java/com/hotclick/controller/ProductoFeedController.java` | 230 |

## Services más grandes (líneas)

| Archivo | Líneas |
| --- | --- |
| `src/main/java/com/hotclick/service/suscripcion/SuscripcionOnvoChangeService.java` | 1296 |
| `src/main/java/com/hotclick/service/OnvoService.java` | 756 |
| `src/main/java/com/hotclick/service/inventario/InventarioPaqueteService.java` | 539 |
| `src/main/java/com/hotclick/service/payment/AvisoReembolsoPendienteService.java` | 522 |
| `src/main/java/com/hotclick/service/EncargoService.java` | 466 |
| `src/main/java/com/hotclick/service/reembolso/ReembolsoOnvoService.java` | 421 |
| `src/main/java/com/hotclick/service/analytics/AdsMetricasService.java` | 407 |
| `src/main/java/com/hotclick/service/consola/TiendaRapidaService.java` | 393 |

## Docs que suelen quedar viejos

Si README o ESTADO_ACTUAL dicen **Java 24** o **Flyway V1–V56**, están desfasados. El número canónico es esta tabla.

Claims seguros que el generador puede parchear: versión de Java (pom), rango Flyway (archivos `V*__`), React (package.json). Nunca escribe API keys ni `.env`.
