# Plan de ejecución Scrum — lunes 19-oct-2026

*Hora de Costa Rica. Repo `hotclickdev/Hot-click-dev`. Base: `docs/traspaso/plan-scrum.md` (434 historias, 6 sprints, 19-oct a 27-nov) y el estado real de GitHub al 19-oct-2026.*

> **Qué es este documento.** El plan Scrum ya existe y no se reescribe. Esto es su **puesta en marcha para hoy**: quién (de los 21 agentes) hace cada historia, qué se cierra primero, qué decisiones tuyas lo destraban y cómo se coordina. Cada agente tiene su prompt en `docs/scrum/prompts/`. La asignación completa de las 434 historias está en `docs/scrum/asignacion-historias.csv`.

> **Repo público.** Aquí no hay secretos, IPs, cédulas, IBAN, números SINPE ni teléfonos. Los informes de seguridad, legal, finanzas y auditoría se escriben en `reportes-privados/` (ignorado por git) y aquí solo se referencian por ID.

---

## 1. Estado real del repo hoy

El plan se escribió el 16-oct y los bots ya adelantaron trabajo el 16 y 17-oct. Por eso el **primer paso de cada agente es verificar el estado de sus historias** antes de construir nada (Paso 0 de cada prompt).

| Tema | Estado en GitHub (19-oct) |
|---|---|
| #178 destacar negocio | Mergeado a `master`. **Si está en producción hay que verificarlo en el servidor** (el traspaso decía sin desplegar; el deploy se frenó por 2 `HttpMessageNotWritableException`). |
| #194 número de pedido por tienda (V182) | Abierto, no es borrador, listo y en verde según el traspaso. |
| #197 estado ONVO + frecuencia de liquidación (V183) | Abierto, no es borrador. Va junto con #213 (borrador). |
| #209 admin ONVO | Borrador. El traspaso lo daba con Tests Java en rojo. Depende de #197. |
| #203, #206, #207, #208 | Abiertos, no borrador. Candidatos a merge cuando los checks estén en verde. |
| SINPE fuera de ONVO | #215 abierto (front). #216 **cerrado sin mergear** (el plan decía quedarse con #216). Desde el traspaso aparecieron #218 a #225 y #228, #229 (candado de pruebas del QR del POS, backend, 410 en la confirmación manual del cajero, POS solo efectivo, ventas manuales solo presencial, textos de privacidad y devoluciones solo ONVO). #220 abierto; el resto en borrador. *Solo se leyeron los títulos.* |
| Issues nuevos | #227 (la heurística del gate `scale` no detecta `saveAllAndFlush`) y #230 (visibilidad de catálogo tras cancelar una venta, hallazgo de #226). |
| #214 traspaso y #217 flujo CI/CD de los agentes | Mergeados. #217 agrega la skill `flujo-ci-cd` (ramas, fases, máximo 3 ciclos, merge solo con tu OK). |
| Borradores sin cola | #152, #153, #155, #157, #158, #160, #162–#176, #179–#193, #195, #198, #201, #202, #204, #205, #210–#213. |

## 2. Objetivo del Sprint 1 reencuadrado (19 a 23-oct)

**Meta:** cerrar la cola de deploy (#178 verificado, SINPE fuera de ONVO, #194, #197+#213, #209), completar los P0 que quedan del Sprint 1 y llegar al **go/no-go de la beta piloto (S1-09)** el viernes 23-oct, con regresión en verde (S1-31) y el correo a ONVO enviado (S1-03).

Los Sprints 2 a 6 quedan como están en el plan. Nadie arranca historias de un sprint posterior sin que el Líder lo apruebe.

| Sprint | Fechas | Meta |
|---|---|---|
| S1 | 19 a 23-oct | Beta piloto estable, sin pago en línea (reencuadrado arriba) |
| S2 | 26 a 30-oct | Cimientos: CI/CD, staging, backups, legal, ONVO Sprint 0 |
| S3 | 2 a 6-nov | ONVO: alta de negocios y pago con tarjeta en sandbox |
| S4 | 9 a 13-nov | SINPE dentro de ONVO, mínimo ₡700, planes pagos, liquidaciones, POS, envíos |
| S5 | 16 a 20-nov | Reembolsos, conciliación, facturación manual, legales |
| S6 | 23 a 27-nov | Endurecer, salir en vivo con la tienda piloto, preparar salida de Tilopay |

## 3. Cola de merge y deploy (orden obligatorio)

Cada merge necesita checks en verde, veredicto APTO donde corresponda y **tu OK explícito para ese PR** (skill `flujo-ci-cd`). Cada deploy lleva la DoD completa del traspaso §1: disco, backup cifrado verificado, tag de rollback, deploy a Lightsail, smoke de 10 minutos, aviso a ti.

| # | Paso | Responsable | Condición |
|---|---|---|---|
| 1 | Verificar qué corre en producción y confirmar las 2 `HttpMessageNotWritableException`; si #178 no está desplegado, correr el post-check aparte | sec-infra + bug-triage | Tarjeta de aprobación nueva tuya para un único deploy |
| 2 | SINPE fuera de ONVO: front (#215) + backend (#219, #220, #221, #225) + candado de pruebas (#218) + textos (#228, #229) | dev-frontend, dev-backend, sec-appsec, leg-costa-rica | Después de #178. Decisión D1 (#215 vs #216) y D3 (historial SINPE) |
| 3 | #194 número de pedido por tienda, luego su front #204 | dev-backend, dev-frontend | Rebuild de `static/` solo después del deploy anterior |
| 4 | #197 + #213 en un solo build con rollback conjunto | dev-backend, dev-frontend | SELECT de solo lectura: 0 negocios con frecuencia NULL |
| 5 | #209 admin ONVO (arreglar el test rojo) | dev-integraciones, dev-backend | Depende de #197 desplegado |
| 6 | #203, #206, #207, #208 y luego #176, #211 | dev-backend | #211 espera tu decisión del cargo de contra entrega |
| 7 | Rebuild de `static/` para los PRs del front, uno por vez | dev-frontend | #168, #170–#172, #174, #179–#181 |

En cada deploy: grep de IBAN `CR[0-9]{20}` en logs y respuestas = 0, sin cédulas en logs, `index.html` con `no-cache`, y `/api/productos/{id}/recomendaciones` en el smoke.

## 4. Equipo y asignación

21 agentes del plugin `hotclick-equipo` más tú. Los 12 roles del plan se asignan así: Desarrollador → `dev-backend`, `dev-frontend`, `dev-integraciones` (y `bug-fix`/`bug-perf` en 4 historias); Diseño/UX → `dis-ui`, `dis-ux`; QA Compradores y QA Negocios → `qa-exploratorio`; QA Automatización y QA (calidad) → `qa-e2e`; Seguridad → `sec-appsec`, `sec-pentest-privacidad` (más `sec-infra` y `leg-internacional` en 7 historias); DevOps y Seguridad → `sec-infra`; Producto Contenido y Soporte → `dis-marca-seo` (más `leg-*` en los textos legales); Finanzas → `fin-*`; Consultor → el Líder con `auditoria-360`. `qa-api` y `bug-triage` no tienen historias del plan: trabajan a demanda por la matriz de enrutamiento.

| Agente | Rol | Foco | Historias | Puntos | S1 (hist./pts.) |
|---|---|---|---:|---:|---:|
| `dev-backend` | Desarrollo | Spring Boot, servicios, Flyway, multi-tenant | 36 | 101 | 7 / 16 |
| `dev-frontend` | Desarrollo | React/TS, UI, i18n, PWA, `static/` | 19 | 49 | 7 / 15 |
| `dev-integraciones` | Desarrollo | ONVO, SINPE (solo dentro de ONVO), Hacienda, correos, Telegram, IA | 28 | 84 | 1 / 3 |
| `bug-fix` | DevBugs | Causa raíz y fix con test | 2 | 5 | 0 / 0 |
| `bug-perf` | DevBugs | Rendimiento y estabilidad | 2 | 10 | 0 / 0 |
| `bug-triage` | DevBugs | Clasificar issues y errores (carril a demanda) | 0 | 0 | 0 / 0 |
| `qa-e2e` | QA | Playwright, regresión, smoke, veredicto | 61 | 125 | 11 / 25 |
| `qa-exploratorio` | QA | Pruebas manuales como comprador y como negocio, accesibilidad, móvil | 64 | 105 | 14 / 30 |
| `qa-api` | QA | Contratos, autorización, tenants (carril a demanda, ver decisión D2) | 0 | 0 | 0 / 0 |
| `sec-appsec` | Seguridad | Revisión de código y veredicto APTO | 20 | 38 | 4 / 8 |
| `sec-infra` | Seguridad | Deploy, backups, CI/CD, secretos, servidor | 43 | 81 | 8 / 14 |
| `sec-pentest-privacidad` | Seguridad | DAST en staging, privacidad Ley 8968 | 7 | 10 | 1 / 1 |
| `dis-ui` | Diseño | Sistema de diseño y Manual de marca | 20 | 35 | 3 / 5 |
| `dis-ux` | Diseño | Flujos, conversión, microcopy | 13 | 28 | 3 / 8 |
| `dis-marca-seo` | Diseño / Contenido | Contenido, soporte, SEO, videos, correos | 29 | 42 | 7 / 11 |
| `fin-pagos-conciliacion` | Finanzas | Comisiones, liquidaciones, conciliación | 14 | 26 | 4 / 7 |
| `fin-fiscal-hacienda` | Finanzas | IVA y comprobantes | 4 | 6 | 0 / 0 |
| `fin-negocio-finops` | Finanzas | Márgenes y costos | 6 | 10 | 1 / 2 |
| `leg-costa-rica` | Legal | Textos legales, Ley 8968 y 7472 | 5 | 10 | 1 / 2 |
| `leg-internacional` | Legal | PCI DSS, cookies, GDPR | 1 | 2 | 0 / 0 |
| `leg-contratos-pi-ia` | Legal | Acuerdos, contratos, licencias | 2 | 5 | 0 / 0 |
| Líder | Orquesta y consolida | Consultor del plan: revisión independiente de solo lectura | 18 | 27 | 3 / 5 |
| Tú (HOT_CLICK) | Dueño | Decisiones, OKs y credenciales | 40 | 45 | 9 / 10 |

La asignación es una **propuesta inicial** por contenido de cada historia. El Líder la ajusta en el Sprint Planning si un agente queda sobrecargado (hoy `qa-exploratorio` y `qa-e2e` concentran más de 60 historias cada uno en los 6 sprints).

## 5. Sprint 1: tablero por agente

Las historias de HOT_CLICK están en la sección 7. Estado inicial de todas: **por verificar** (Paso 0).

### `dev-backend`

| ID | Prio | Pts | Historia | Depende de | PR relacionado |
|---|---|---:|---|---|---|
| S1-10 | P0 | 3 | Preparar el deploy de fix/reverificacion-1610 | S1-01 (OK y ventana para desplegar fix/reverificacion-1610) | #150 y #151 (mergeados el 16-oct) |
| S1-11 | P1 | 2 | POS incluido en Emprendedor (V174, 1 caja) | S1-10 (Preparar el deploy de fix/reverificacion-1610) |  |
| S1-13 | P1 | 3 | Guardar la categoría elegida en el registro | S1-05 (Lista de categorías reales y OK de limpieza) |  |
| S1-18 | P1 | 2 | Mensaje genérico para cédulas ya registradas | Ninguna | #162 (borrador) |
| S1-19 | P0 | 3 | Botón «Aprobar» y ninguna tienda pública antes de aprobar | Ninguna |  |
| S1-23 | P2 | 1 | El contador de cupos no baja si el registro falla (NP-16) | Ninguna |  |
| S1-24 | P2 | 2 | Consultas de limpieza de solo lectura | S1-05 (Lista de categorías reales y OK de limpieza) |  |

### `dev-frontend`

| ID | Prio | Pts | Historia | Depende de | PR relacionado |
|---|---|---:|---|---|---|
| S1-12 | P2 | 1 | Quitar el preconnect de Clerk de desarrollo | Ninguna |  |
| S1-15 | P1 | 3 | Fichas «a cotizar» con botón de cotización y personalización | Ninguna |  |
| S1-16 | P2 | 1 | «Comprar ahora» no deja el producto en el carrito | Ninguna | #164 (borrador) |
| S1-17 | P2 | 3 | Dirección con menos clics | Ninguna | #165 (borrador) |
| S1-20 | P2 | 2 | Enlace completo de mi tienda con botón de copiar | Ninguna | #166 (borrador) |
| S1-21 | P2 | 3 | Panel sin tarjetas vacías ni botones mudos | Ninguna |  |
| S1-22 | P1 | 2 | Sin datos demo en Notificaciones y Asistente Hot (NP-7, NP-8) | Ninguna | #167 (borrador) |

### `dev-integraciones`

| ID | Prio | Pts | Historia | Depende de | PR relacionado |
|---|---|---:|---|---|---|
| S1-14 | P0 | 3 | Correo de verificación que llega y se puede reenviar (NP-3) | S1-67 (Entregabilidad del correo de no-reply@hotclick.lat) |  |

### `qa-e2e`

| ID | Prio | Pts | Historia | Depende de | PR relacionado |
|---|---|---:|---|---|---|
| S1-31 | P0 | 5 | Regresión completa después del deploy | S1-10 (Preparar el deploy de fix/reverificacion-1610) |  |
| S1-32 | P1 | 2 | Confirmar los 7 detalles del checkout | S1-10 (Preparar el deploy de fix/reverificacion-1610) |  |
| S1-33 | P1 | 1 | Aclarar NP-7 y NP-8 | Ninguna |  |
| S1-34 | P1 | 2 | Volver a probar el login con Google | S1-10 (Preparar el deploy de fix/reverificacion-1610) |  |
| S1-35 | P1 | 1 | Correo de prueba legible para cuentas QA-TEST | Ninguna |  |
| S1-36 | P1 | 2 | Telegram de punta a punta con una persona real | S1-10 (Preparar el deploy de fix/reverificacion-1610) |  |
| S1-51 | P1 | 2 | Inventario de pruebas de navegador | Ninguna |  |
| S1-52 | P0 | 3 | Guion web de regresión del checkout | Ninguna |  |
| S1-53 | P1 | 3 | Guion web de registro de negocios | Ninguna |  |
| S1-54 | P1 | 2 | Guion web del POS | Ninguna |  |
| S1-55 | P0 | 2 | Smoke de 10 minutos después de cada deploy | Ninguna |  |

### `qa-exploratorio`

| ID | Prio | Pts | Historia | Depende de | PR relacionado |
|---|---|---:|---|---|---|
| S1-37 | P0 | 3 | Comprar como invitado desde el marketplace sin cédula | S1-10 (Preparar el deploy de fix/reverificacion-1610) |  |
| S1-38 | P1 | 2 | Compra con cuenta que autocompleta mis datos | S1-10 (Preparar el deploy de fix/reverificacion-1610) |  |
| S1-39 | P1 | 2 | Envío igual en tienda y marketplace | S1-10 (Preparar el deploy de fix/reverificacion-1610) |  |
| S1-40 | P1 | 2 | Contra entrega en envío normal | S1-10 (Preparar el deploy de fix/reverificacion-1610) |  |
| S1-41 | P1 | 2 | Doble clic en «Pagar» crea un solo pedido | S1-10 (Preparar el deploy de fix/reverificacion-1610) |  |
| S1-42 | P1 | 1 | Productos «a cotizar» no se venden a ₡1 | Ninguna |  |
| S1-43 | P1 | 2 | Re-probar los ítems del comprador que siguen abiertos | S1-10 (Preparar el deploy de fix/reverificacion-1610) |  |
| S1-44 | P0 | 3 | Registro de los 3 planes con precios correctos | S1-10 (Preparar el deploy de fix/reverificacion-1610) |  |
| S1-45 | P1 | 2 | Aviso «Completar pago» y reenvío del código | S1-10 (Preparar el deploy de fix/reverificacion-1610) |  |
| S1-46 | P1 | 3 | POS: historial, cotizables y Emprendedor | S1-11 (POS incluido en Emprendedor (V174, 1 caja)) |  |
| S1-47 | P1 | 2 | Detalle del pedido con datos del invitado y acciones | S1-10 (Preparar el deploy de fix/reverificacion-1610) |  |
| S1-48 | P0 | 2 | Tienda pendiente no es pública hasta «Aprobar» | S1-19 (Botón «Aprobar» y ninguna tienda pública antes de apr |  |
| S1-49 | P1 | 2 | Límites del plan Emprendedor en la web | S1-10 (Preparar el deploy de fix/reverificacion-1610) |  |
| S1-50 | P1 | 2 | Re-probar los ítems del vendedor que siguen abiertos | S1-10 (Preparar el deploy de fix/reverificacion-1610) |  |

### `sec-appsec`

| ID | Prio | Pts | Historia | Depende de | PR relacionado |
|---|---|---:|---|---|---|
| S1-56 | P1 | 2 | Revisión de seguridad del PR antes del deploy | Ninguna |  |
| S1-57 | P1 | 2 | Confirmar SEG-F y PAG-4 en producción | S1-10 (Preparar el deploy de fix/reverificacion-1610) |  |
| S1-59 | P1 | 2 | Código ONVO viejo no simula cobros (PAG-6) | Ninguna | #156 (mergeado) |
| S1-60 | P1 | 2 | Comprobantes SINPE viejos sin acceso público (PAG-9) | Ninguna | #160 (borrador) |

### `sec-infra`

| ID | Prio | Pts | Historia | Depende de | PR relacionado |
|---|---|---:|---|---|---|
| S1-61 | P0 | 1 | Verificar la rotación de la Google API key | S1-02 (Rotar la Google API key expuesta (SEG-A)) |  |
| S1-62 | P1 | 2 | Publicar la app solo en 127.0.0.1:8080 (#123) | S1-06 (Ventana para cerrar el puerto 8080 (#123)) |  |
| S1-63 | P0 | 2 | Backup cifrado manual antes del deploy | Ninguna |  |
| S1-64 | P0 | 3 | Deploy de fix/reverificacion-1610 con aprobación | S1-10 (Preparar el deploy de fix/reverificacion-1610); S1-63 |  |
| S1-65 | P1 | 2 | Logs que no llenan el disco (QA-CONC-6) | Ninguna |  |
| S1-66 | P0 | 1 | Cargar la Google API key nueva como secreto | S1-02 (Rotar la Google API key expuesta (SEG-A)) |  |
| S1-67 | P0 | 2 | Entregabilidad del correo de no-reply@hotclick.lat | Ninguna |  |
| S1-68 | P1 | 1 | Llaves de Turnstile cargadas y apagadas | Ninguna |  |

### `sec-pentest-privacidad`

| ID | Prio | Pts | Historia | Depende de | PR relacionado |
|---|---|---:|---|---|---|
| S1-58 | P1 | 1 | Validar el arreglo de enumeración de cédulas | S1-18 (Mensaje genérico para cédulas ya registradas) |  |

### `dis-ui`

| ID | Prio | Pts | Historia | Depende de | PR relacionado |
|---|---|---:|---|---|---|
| S1-25 | P1 | 2 | Ficha del negocio en el admin: Aprobar, Activar y Destacar | Ninguna |  |
| S1-28 | P1 | 2 | Carrusel de inicio probado con dispositivos reales | Ninguna |  |
| S1-30 | P2 | 1 | Bocetos sin «[PENDIENTE]» (DIS-1) | Ninguna |  |

### `dis-ux`

| ID | Prio | Pts | Historia | Depende de | PR relacionado |
|---|---|---:|---|---|---|
| S1-26 | P1 | 3 | Registro con campos obligatorios a la vista | Ninguna |  |
| S1-27 | P2 | 2 | Guías que se muestran una sola vez | Ninguna |  |
| S1-29 | P1 | 3 | Checkout con pago y envío claros | Ninguna |  |

### `dis-marca-seo`

| ID | Prio | Pts | Historia | Depende de | PR relacionado |
|---|---|---:|---|---|---|
| S1-70 | P1 | 2 | Correo de bienvenida para tiendas piloto | S1-09 (Go/no-go de la beta piloto y tiendas elegidas) |  |
| S1-71 | P1 | 1 | Documentos que todavía dicen «solo Tilopay» | Ninguna |  |
| S1-72 | P1 | 2 | Lista «qué falta para aprobar tu negocio» | Ninguna |  |
| S1-73 | P0 | 2 | Videos sin WhatsApp ni datos del CRM (MKT-2) | Ninguna |  |
| S1-74 | P1 | 2 | Guion de soporte para la beta piloto | Ninguna |  |
| S1-75 | P2 | 1 | Ayuda de Telegram con la ruta correcta | Ninguna |  |
| S1-76 | P1 | 1 | Montos de ejemplo con rótulo «Ejemplo» (LAN-6) | Ninguna |  |

### `fin-pagos-conciliacion`

| ID | Prio | Pts | Historia | Depende de | PR relacionado |
|---|---|---:|---|---|---|
| S1-77 | P1 | 2 | Verificar que #147 hizo lo pedido (FIN-3) | Ninguna |  |
| S1-78 | P1 | 3 | Escenarios del mínimo de ₡700 | Ninguna |  |
| S1-80 | P2 | 1 | Valor de hotclick.comision.gateway.pct | Ninguna |  |
| S1-81 | P0 | 1 | Precios del front contra el backend | S1-10 (Preparar el deploy de fix/reverificacion-1610) |  |

### `fin-negocio-finops`

| ID | Prio | Pts | Historia | Depende de | PR relacionado |
|---|---|---:|---|---|---|
| S1-79 | P1 | 2 | Margen por venta con tarifas publicadas de ONVO | Ninguna |  |

### `leg-costa-rica`

| ID | Prio | Pts | Historia | Depende de | PR relacionado |
|---|---|---:|---|---|---|
| S1-69 | P0 | 2 | Textos LEG-1 a LEG-3 para aprobar | Ninguna |  |

### `Líder`

| ID | Prio | Pts | Historia | Depende de | PR relacionado |
|---|---|---:|---|---|---|
| S1-82 | P1 | 2 | Cruce de la rama desplegada contra la auditoría | S1-10 (Preparar el deploy de fix/reverificacion-1610) |  |
| S1-83 | P1 | 2 | Revisión del plan de deploy | Ninguna |  |
| S1-84 | P2 | 1 | Revisión de las consultas de limpieza | S1-24 (Consultas de limpieza de solo lectura) |  |

## 6. Cómo se trabaja hoy (bloques)

1. **Bloque 1, Paso 0 en paralelo y solo lectura.** Los 21 agentes verifican sus historias contra `master`, los PRs y los issues, y devuelven al Líder una tabla Hecha / En PR / Pendiente / Bloqueada. Nadie cambia código todavía.
2. **Bloque 2, construcción.** `dev-*`, `bug-*` y `fin-*`/`leg-*`/`dis-*` trabajan sus historias P0 y P1 del Sprint 1 y de la cola, una rama por tarea.
3. **Bloque 3, revisión.** `qa-*` y `sec-*` revisan en paralelo lo que quedó en PR. Seguridad es obligatoria si toca auth, pagos, datos de compradores, planes o permisos.
4. **Bloque 4, decisión y deploy.** El Líder te presenta qué está listo para merge y tú das el OK PR por PR. Los deploys se hacen en la ventana de bajo tráfico que elijas, con la DoD completa.
5. **Cierre del día.** Daily del Líder: ayer, hoy, bloqueos, y tablero actualizado.

Reglas del equipo: máximo 3 ciclos de corrección por tarea y después se frena y se reporta; una rama por tarea (`fix/*` o `feat/*`, nunca `hotfix/*`); `static/` en un commit aparte; nada de `git add -A`, force push, rebase ni `--no-verify`; los agentes no ejecutan `git commit`, `git push`, `gh pr merge` ni deploy sin tu autorización.

## 7. Tu lista como dueño (HOT_CLICK)

Decisiones y acciones que destraban el plan. Las de Sprint 1 son las que más bloquean.

| ID | Prio | Pts | Qué tienes que hacer | Destraba |
|---|---|---:|---|---|
| S1-01 | P0 | 1 | OK y ventana para desplegar fix/reverificacion-1610 | — |
| S1-02 | P0 | 1 | Rotar la Google API key expuesta (SEG-A) | — |
| S1-03 | P0 | 2 | Correo a ONVO y apertura de la cuenta primaria | — |
| S1-04 | P1 | 1 | Decidir si un negocio sin aprobar cobra en efectivo en el POS (NP-13a) | — |
| S1-05 | P1 | 1 | Lista de categorías reales y OK de limpieza | — |
| S1-06 | P1 | 1 | Ventana para cerrar el puerto 8080 (#123) | — |
| S1-07 | P1 | 1 | Aclarar qué es «la tienda» para la facturación | — |
| S1-08 | P1 | 1 | Agendar la reunión con el contador | — |
| S1-09 | P0 | 1 | Go/no-go de la beta piloto y tiendas elegidas | S1-31 (Regresión completa después del deploy) |

Decisiones nuevas que salieron al cruzar el repo con el plan:

- **D1.** Hotfix SINPE: hoy está abierto #215 y cerrado #216, al revés de lo que decía el traspaso. ¿Seguimos con #215 como definitivo?
- **D2.** El plan dice que QA solo prueba desde la web, pero existe el agente `qa-api`. ¿`qa-api` queda como apoyo a demanda contra staging o local (recomendado) o se desactiva?
- **D3.** Número SINPE en el historial público: opciones A a D de `docs/traspaso/pendientes/sinpe-historial.md` (el informe recomienda hotfix + B).
- **D4.** Reglas de merge distintas: el traspaso §2 decía que los bots podían mergear y desplegar sin pedir OK, y la skill `flujo-ci-cd` (#217, más nueva) exige tu OK para cada merge. Este plan aplica la más nueva.
- **D5.** Los documentos del plan citan rutas de `/workspace/informes/`. Aquí se usan `docs/scrum/` para lo público y `reportes-privados/` para lo sensible.
- **D6.** `pgvector` en producción, limpieza de datos QA-TEST y rotación del token de Telegram siguen esperando tu decisión (traspaso §8).

## 8. Riesgos principales

- **ONVO:** si no entrega la cuenta y las llaves de sandbox a tiempo, las historias de ONVO se corren una semana (S2-01 depende de S1-03).
- **Presupuesto:** los bots se pausaron el 17-oct por presupuesto. Conviene correr primero el Paso 0 (solo lectura, barato) y luego priorizar por P0.
- **Cola de `static/`:** el build del front es versionado y se pisa. Un rebuild por deploy.
- **Sobrecarga de QA:** dos agentes concentran 125 de 434 historias.
- **Estado desconocido de producción:** hasta verificar el commit desplegado, no se asume que #178 esté en vivo.

## 9. Archivos de este paquete

- `docs/scrum/PLAN-EJECUCION-2026-10-19.md`: este documento.
- `docs/scrum/asignacion-historias.csv`: las 434 historias con agente, sprint, prioridad, puntos y dependencias.
- `docs/scrum/prompts/`: un prompt por agente, el del Líder y `README.md` con el uso en Git Bash.

