# Stack generado (DOC1)

<!-- generated-by: scripts/eng-gates/stack-docs.mjs -->
<!-- fingerprint: eyJqYXZhVmVyc2lvbiI6IjIxIiwic3ByaW5nQm9vdCI6IjMuNS4xNiIsInJlYWN0IjoiMTkuMi41Iiwidml0ZSI6IjguMS42IiwiZmx5d2F5Q291bnQiOjIxOCwiZmx5d2F5TWF4IjoyMzgsImZseXdheUxhdGVzdCI6IlYyMzhfX3BhZ29fY2FuY2VsYWNpb25feV9jb25jaWxpYWNpb25fb252by5zcWwiLCJjb250cm9sbGVycyI6MTMyLCJzZXJ2aWNlcyI6MjMxLCJyZXBvc2l0b3JpZXMiOjEwOSwiZW50aXRpZXMiOjExMX0 -->

> Autogenerado el **2026-11-16** desde `pom.xml`, Flyway, `frontend/package.json` y conteos de Java.
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
| Flyway archivos | **218** (`V1`–`V238`) | `src/main/resources/db/migration/` |
| Última migración | `V238__pago_cancelacion_y_conciliacion_onvo.sql` | mismo dir |
| Controllers | 132 | `*Controller.java` |
| Services | 231 | `*Service.java` |
| Repositories | 109 | `*Repository.java` |
| Entidades `model/` | 111 | `com/hotclick/model` |

## Controllers más grandes (líneas)

| Archivo | Líneas |
| --- | --- |
| `src/main/java/com/hotclick/controller/SuscripcionController.java` | 408 |
| `src/main/java/com/hotclick/controller/PedidoController.java` | 350 |
| `src/main/java/com/hotclick/controller/BodegaController.java` | 322 |
| `src/main/java/com/hotclick/controller/OnvoWebhookController.java` | 248 |
| `src/main/java/com/hotclick/controller/SpaController.java` | 248 |
| `src/main/java/com/hotclick/rag/controller/ShoppingAssistantController.java` | 241 |
| `src/main/java/com/hotclick/controller/AdminResetController.java` | 240 |
| `src/main/java/com/hotclick/controller/AdminAsignarController.java` | 232 |

## Services más grandes (líneas)

| Archivo | Líneas |
| --- | --- |
| `src/main/java/com/hotclick/service/suscripcion/SuscripcionOnvoChangeService.java` | 1454 |
| `src/main/java/com/hotclick/service/OnvoService.java` | 781 |
| `src/main/java/com/hotclick/service/reembolso/ReembolsoOnvoService.java` | 739 |
| `src/main/java/com/hotclick/service/inventario/InventarioPaqueteService.java` | 539 |
| `src/main/java/com/hotclick/service/payment/AvisoReembolsoPendienteService.java` | 522 |
| `src/main/java/com/hotclick/service/EncargoService.java` | 466 |
| `src/main/java/com/hotclick/service/payment/OnvoPendientesReconsultaService.java` | 458 |
| `src/main/java/com/hotclick/service/PedidoService.java` | 440 |

## Docs que suelen quedar viejos

Si README o ESTADO_ACTUAL dicen **Java 24** o **Flyway V1–V56**, están desfasados. El número canónico es esta tabla.

Claims seguros que el generador puede parchear: versión de Java (pom), rango Flyway (archivos `V*__`), React (package.json). Nunca escribe API keys ni `.env`.
