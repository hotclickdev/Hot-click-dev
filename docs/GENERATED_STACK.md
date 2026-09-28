# Stack generado (DOC1)

<!-- generated-by: scripts/eng-gates/stack-docs.mjs -->
<!-- fingerprint: eyJqYXZhVmVyc2lvbiI6IjIxIiwic3ByaW5nQm9vdCI6IjMuNS4xNiIsInJlYWN0IjoiMTkuMi41Iiwidml0ZSI6IjguMC4xNiIsImZseXdheUNvdW50IjoxMzksImZseXdheU1heCI6MTQxLCJmbHl3YXlMYXRlc3QiOiJWMTQxX19jb21pc2lvbl9lbXByZW5kZWRvcl85cGN0LnNxbCIsImNvbnRyb2xsZXJzIjoxMDgsInNlcnZpY2VzIjoxNzEsInJlcG9zaXRvcmllcyI6ODgsImVudGl0aWVzIjo5MX0 -->

> Autogenerado el **2026-09-28** desde `pom.xml`, Flyway, `frontend/package.json` y conteos de Java.
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
| Flyway archivos | **139** (`V1`–`V141`) | `src/main/resources/db/migration/` |
| Última migración | `V141__comision_emprendedor_9pct.sql` | mismo dir |
| Controllers | 108 | `*Controller.java` |
| Services | 171 | `*Service.java` |
| Repositories | 88 | `*Repository.java` |
| Entidades `model/` | 91 | `com/hotclick/model` |

## Controllers más grandes (líneas)

| Archivo | Líneas |
| --- | --- |
| `src/main/java/com/hotclick/controller/PedidoController.java` | 269 |
| `src/main/java/com/hotclick/controller/AuthController.java` | 210 |
| `src/main/java/com/hotclick/controller/ProductoFeedController.java` | 206 |
| `src/main/java/com/hotclick/controller/PosQrController.java` | 195 |
| `src/main/java/com/hotclick/controller/BodegaController.java` | 187 |
| `src/main/java/com/hotclick/controller/SpaController.java` | 187 |
| `src/main/java/com/hotclick/controller/CategoriaController.java` | 186 |
| `src/main/java/com/hotclick/controller/ProductoController.java` | 183 |

## Services más grandes (líneas)

| Archivo | Líneas |
| --- | --- |
| `src/main/java/com/hotclick/service/inventario/InventarioPaqueteService.java` | 532 |
| `src/main/java/com/hotclick/service/EncargoService.java` | 464 |
| `src/main/java/com/hotclick/service/analytics/AdsMetricasService.java` | 406 |
| `src/main/java/com/hotclick/service/pos/PosQrVentaService.java` | 360 |
| `src/main/java/com/hotclick/service/suscripcion/SuscripcionOnvoChangeService.java` | 326 |
| `src/main/java/com/hotclick/rag/service/VectorSearchService.java` | 320 |
| `src/main/java/com/hotclick/service/ResetPlataformaKeepQaService.java` | 293 |
| `src/main/java/com/hotclick/service/OnvoService.java` | 280 |

## Docs que suelen quedar viejos

Si README o ESTADO_ACTUAL dicen **Java 24** o **Flyway V1–V56**, están desfasados. El número canónico es esta tabla.

Claims seguros que el generador puede parchear: versión de Java (pom), rango Flyway (archivos `V*__`), React (package.json). Nunca escribe API keys ni `.env`.
