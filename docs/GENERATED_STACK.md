# Stack generado (DOC1)

<!-- generated-by: scripts/eng-gates/stack-docs.mjs -->
<!-- fingerprint: eyJqYXZhVmVyc2lvbiI6IjIxIiwic3ByaW5nQm9vdCI6IjMuNC40IiwicmVhY3QiOiIxOS4yLjUiLCJ2aXRlIjoiOC4wLjEwIiwiZmx5d2F5Q291bnQiOjEzMCwiZmx5d2F5TWF4IjoxMzIsImZseXdheUxhdGVzdCI6IlYxMzJfX2NhdGVnb3JpYXNfZW1wcmVuZGltaWVudG9zLnNxbCIsImNvbnRyb2xsZXJzIjoxMDQsInNlcnZpY2VzIjoxNjAsInJlcG9zaXRvcmllcyI6ODMsImVudGl0aWVzIjo4Nn0 -->

> Autogenerado el **2026-09-21** desde `pom.xml`, Flyway, `frontend/package.json` y conteos de Java.
> No editar a mano. Corré `scripts/generate-stack-docs.sh`. **No incluye secretos.**

## Runtime (fuente: repo, no marketing)

| Hecho | Valor | Fuente |
| --- | --- | --- |
| Java | **21** | `Hot_click_outlet/pom.xml` `java.version` |
| Spring Boot | **3.4.4** | `spring-boot-starter-parent` |
| React | **19.2.5** | `frontend/package.json` |
| Vite | **8.0.10** | `frontend/package.json` |
| Node (engines) | >=22.13.0 | `frontend/package.json` |
| Package manager | pnpm@11.1.2 | `frontend/package.json` |
| Flyway archivos | **130** (`V1`–`V132`) | `src/main/resources/db/migration/` |
| Última migración | `V132__categorias_emprendimientos.sql` | mismo dir |
| Controllers | 104 | `*Controller.java` |
| Services | 160 | `*Service.java` |
| Repositories | 83 | `*Repository.java` |
| Entidades `model/` | 86 | `com/hotclick/model` |

## Controllers más grandes (líneas)

| Archivo | Líneas |
| --- | --- |
| `src/main/java/com/hotclick/controller/PedidoController.java` | 216 |
| `src/main/java/com/hotclick/controller/ProductoFeedController.java` | 206 |
| `src/main/java/com/hotclick/controller/AuthController.java` | 201 |
| `src/main/java/com/hotclick/controller/PosQrController.java` | 195 |
| `src/main/java/com/hotclick/controller/BodegaController.java` | 187 |
| `src/main/java/com/hotclick/controller/SpaController.java` | 184 |
| `src/main/java/com/hotclick/controller/ProductoController.java` | 183 |
| `src/main/java/com/hotclick/controller/TestimonioController.java` | 183 |

## Services más grandes (líneas)

| Archivo | Líneas |
| --- | --- |
| `src/main/java/com/hotclick/service/EncargoService.java` | 464 |
| `src/main/java/com/hotclick/service/pos/PosQrVentaService.java` | 360 |
| `src/main/java/com/hotclick/service/suscripcion/SuscripcionOnvoChangeService.java` | 326 |
| `src/main/java/com/hotclick/rag/service/VectorSearchService.java` | 319 |
| `src/main/java/com/hotclick/service/ResetPlataformaKeepQaService.java` | 287 |
| `src/main/java/com/hotclick/service/OnvoService.java` | 280 |
| `src/main/java/com/hotclick/service/EmprendedorRegistroService.java` | 258 |
| `src/main/java/com/hotclick/service/MetodoCobroCambioService.java` | 251 |

## Docs que suelen quedar viejos

Si README o ESTADO_ACTUAL dicen **Java 24** o **Flyway V1–V56**, están desfasados. El número canónico es esta tabla.

Claims seguros que el generador puede parchear: versión de Java (pom), rango Flyway (archivos `V*__`), React (package.json). Nunca escribe API keys ni `.env`.
