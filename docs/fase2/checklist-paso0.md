# Checklist paso 0 · Fase 2 (staging del master final con cuentas QA)
**Estado del plan:** aprobado por Andrés el 30-oct-2026 a las 5:50 PM CR, incluido el deploy a staging del master final; POS incluido; respaldos a la Fase 3. **Fuente: el Mentor.**
Sin deploy a prod, sin gasto, sin cuentas ni servidores nuevos.

## Antes de pedir el OK
- [x] Plan aprobado (según el Mentor, 30-oct 5:50 PM CR).
- [x] Área 2 ✅ en `23f8c156`.
- [ ] Área 3: MED de precio de oferta en self-checkout corregido.
- [ ] Área 6: MEDIO-2 corregido.
- [ ] Área 8: re-auditoría (#382) cerrada.
- [ ] Hash del master final fijado (hoy `adf05174`, leído solo lectura) y CI en verde sobre ese hash.
- [ ] Revisar `PLANES_MONEDA` y `*_PRECIO_MENSUAL_USD` (#388, A5).
- [ ] Flyway aditivo y sin huecos de numeración (V197/V198 vs V200).
- [ ] Respaldos: pasan a Fase 3 (decisión Andrés 5:55 PM CR), no bloquean.

## Aislamiento de staging (A10)
- [ ] BD de staging distinta a prod, con nombre que contenga "staging".
- [ ] Llaves JWT, webhook y BD distintas a prod (no se muestran en el chat).
- [ ] ONVO solo con llave **test**: C1 la toma de las variables `ONVO_TEST_*` (no se lee ni se imprime); se verifica que no haya llave live en el entorno.
- [ ] Webhooks de ONVO y Telegram apuntan a staging, con secretos propios.
- [ ] Emisión automática de facturas apagada; Hacienda en sandbox.
- [ ] Sin datos reales ni números SINPE/teléfonos reales.
- [ ] Actuator/Swagger y CORS revisados.

## Con el OK de Andrés
- [ ] Deploy del hash final a staging (lo hace CI/CD).
- [ ] Ejecutar `semilla/01-cuentas-qa.sql` y luego `semilla/02-tiendas-productos.sql` con las guardias.
- [ ] Re-QA en staging de #444 y #447.
- [ ] Las tiendas de **gracia** e **impago** se siembran el mismo día en que se prueban (sus fechas son relativas a hoy y el proceso nocturno las mueve).
- [ ] Proceso nocturno de renovaciones: `@Scheduled(cron = "0 0 3 * * *")` = 3:00 AM, en `BillingRenewalScheduler.java:33` (916e61f0); corre `expirarPastDueVencidos` (:41). No fija zona: usa la del servidor (3:00 AM CR solo si el JVM corre en America/Costa_Rica; si corre en UTC, sería 9:00 PM CR). El cierre de trials Emprendedor va aparte a las 3:30 AM CR (`TrialEmprendedorScheduler.java:25`). Sembrar y probar gracia/impago después de esa hora y antes de la siguiente corrida.
- [ ] Cada QA fija su clave por recuperación y la guarda en el vault.
- [ ] Llenar la columna `hash` de la matriz con el hash desplegado.
- [ ] Prueba de humo: login de cada cuenta QA y una compra ONVO test.
- [ ] Arrancar orden: 1 invitado/cliente → 2 Emprendedor → 3 Pyme → 4 Negocio Plus → 5 admin → 6 cruzados → 7 Telegram → 8 re-QA → 9 C2–C6 (C1 usa `ONVO_TEST_*`).
