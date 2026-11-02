# Stack generado (DOC1)

<!-- generated-by: scripts/eng-gates/stack-docs.mjs -->
<!-- fingerprint: eyJqYXZhVmVyc2lvbiI6IjIxIiwic3ByaW5nQm9vdCI6IjMuNS4xNiIsInJlYWN0IjoiMTkuMi41Iiwidml0ZSI6IjguMS42IiwiZmx5d2F5Q291bnQiOjIwMiwiZmx5d2F5TWF4IjoyMjIsImZseXdheUxhdGVzdCI6IlYyMjJfX3RpcG9zX290cF9yZWdpc3Ryb19yZXNldF9lbl90YWJsYV9qcGEuc3FsIiwiY29udHJvbGxlcnMiOjEzMCwic2VydmljZXMiOjIyNywicmVwb3NpdG9yaWVzIjoxMDcsImVudGl0aWVzIjoxMDl9 -->

> Autogenerado el **2026-11-02** desde `pom.xml`, Flyway, `frontend/package.json` y conteos de Java.
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
| Flyway archivos | **202** (`V1`–`V222`) | `src/main/resources/db/migration/` |
| Última migración | `V222__tipos_otp_registro_reset_en_tabla_jpa.sql` | mismo dir |
| Controllers | 130 | `*Controller.java` |
| Services | 227 | `*Service.java` |
| Repositories | 107 | `*Repository.java` |
| Entidades `model/` | 109 | `com/hotclick/model` |

## Controllers más grandes (líneas)

| Archivo | Líneas |
| --- | --- |
| `src/main/java/com/hotclick/controller/PedidoController.java` | 324 |
| `src/main/java/com/hotclick/controller/BodegaController.java` | 322 |
| `src/main/java/com/hotclick/controller/SuscripcionController.java` | 311 |
| `src/main/java/com/hotclick/controller/SpaController.java` | 247 |
| `src/main/java/com/hotclick/controller/AdminResetController.java` | 240 |
| `src/main/java/com/hotclick/controller/ProductoFeedController.java` | 230 |
| `src/main/java/com/hotclick/controller/PosQrController.java` | 228 |
| `src/main/java/com/hotclick/controller/AdminAsignarController.java` | 220 |

## Services más grandes (líneas)

| Archivo | Líneas |
| --- | --- |
| `src/main/java/com/hotclick/service/suscripcion/SuscripcionOnvoChangeService.java` | 758 |
| `src/main/java/com/hotclick/service/OnvoService.java` | 605 |
| `src/main/java/com/hotclick/service/inventario/InventarioPaqueteService.java` | 539 |
| `src/main/java/com/hotclick/service/payment/AvisoReembolsoPendienteService.java` | 522 |
| `src/main/java/com/hotclick/service/EncargoService.java` | 466 |
| `src/main/java/com/hotclick/service/analytics/AdsMetricasService.java` | 407 |
| `src/main/java/com/hotclick/service/consola/TiendaRapidaService.java` | 393 |
| `src/main/java/com/hotclick/service/ResetPlataformaKeepQaService.java` | 366 |

## Docs que suelen quedar viejos

Si README o ESTADO_ACTUAL dicen **Java 24** o **Flyway V1–V56**, están desfasados. El número canónico es esta tabla.

Claims seguros que el generador puede parchear: versión de Java (pom), rango Flyway (archivos `V*__`), React (package.json). Nunca escribe API keys ni `.env`.
