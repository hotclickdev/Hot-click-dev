# Seguridad: cierres de sprint (copia)

Fuente: `/workspace/seguridad/CIERRE_SPRINTS_3_A_6.md` y `/workspace/seguridad/sprint1..6/CIERRE_SPRINT*.md` (16-oct-2026). Algunos ítems ya se cerraron después: H1 S1-56 (en #151), PAG-6 (en #156). PIPE-1/BK-* siguen esperando al dueño.

---

## Cierre Sprints 3→6 · Seguridad (pasada continua, 16/10/2026 CR)

## Críticos / altos nuevos (esta pasada)
Ningún crítico nuevo explotable hoy. Altos (latentes o preexistentes) con plan+dueño:
1. **WH-1 (S3-48 / S4-49)** · Webhook ONVO marca pagos/planes sin GET de verificación ni check de monto/`empresaId`. Desarrollador.
2. **LOG-1 (S3-50 / S4-47)** · Cédula del comprobante SINPE en logs. Desarrollador (quitar ya).
3. Arrastre S1/S2 sin cerrar: **PIPE-1/BK-*** (backup.yml + dumps en claro + passphrase en el servidor), **PAG-6**, **H1 tienda propia**, **SEG-A**, **PAG-9**.

## Estado resumido
- Sprint 3: 0 hechas · 1 casi (S3-51) · 4 bloqueadas por features ONVO.
- Sprint 4: 1 hecha (S4-51 análisis) · 4 bloqueadas.
- Sprint 5: 1 hecha borrador (S5-49) · 1 casi (S5-48) · 3 bloqueadas.
- Sprint 6: 1 hecha borrador (S6-48) · 1 plantilla (S6-44) · 3 bloqueadas por go-live.

## Pedidos DevOps
- Deshabilitar `backup.yml` + borrar secretos SUPABASE_* (OK HOT_CLICK).
- Backups locales con gpg de llave pública; sin dumps en claro.
- Confirmar hosts ONVO / videos FB / variables booleanas ONVO (sin mostrar valores).
- Tras S6-10: borrar TILOPAY_* del servidor.

## Pedidos Desarrollador
- S3-18: GET previo + rate limit + tope de body + idempotencia fuerte.
- Quitar log de cédula; filtro logback de secretos/onboardingUrl.
- Fail-closed del mock ONVO; PlanPagoConfirmado único camino.
- CSP acotada + regla gitleaks ONVO (S2-56).
- `@Immutable` en AuditoriaAdmin + eventos de comisión.
- Unificar enumeración correo/cédula (S1-18).
- H1 topes en tienda propia.

## Límites de esta pasada
Sin Java en el box → no se levantó backend local. Sin staging ONVO → pruebas de webhook/manipulación quedan documentadas. Sin commits/PR/deploy. Clon descartable eliminado.

---

## Cierre Sprint 1 · Seguridad (16/10/2026, CR)
| Historia | Estado |
|---|---|
| S1-56 Revisión fix/reverificacion-1610 | HECHA en código y gates · Veredicto: ESPERA por H1 (ALTO, preexistente) · runtime local pendiente (sin JDK en el box) |
| S1-57 SEG-F/PAG-4 en prod | BLOQUEADA por S1-10 (deploy) |
| S1-58 Enumeración de cédula | BLOQUEADA por S1-18 (fix inexistente); FALLA en prod (QA-COM-007), MEDIO |
| S1-59 PAG-6 ONVO mock | HECHA (revisión): simula pero no alcanzable hoy; fix P0 abierto con dueño · falta confirmación de DevOps |
| S1-60 PAG-9 SINPE en S3 | HECHA (plan + historia) · verificación pendiente del deploy |
| S1-61 Google API key | BLOQUEADA por S1-02 (no rotada) |

## Altos abiertos (con plan y dueño)
- S1-56 H1 tienda propia sin topes (Desarrollador). - PAG-6 latente (Desarrollador, antes de ONVO). - SEG-A llave sin rotar (DevOps). - PAG-9 comprobantes públicos (Desarrollador + DevOps).

## Pendientes para el siguiente sprint
- S1-56: correr los 6 casos en instancia local (puerto ≠ 8080, perfil dev, base descartable) tras fix H1. Bloquea: JDK 21 en el box + fix H1.
- S1-57: plan de prueba QA-TEST en prod listo. Bloquea: S1-10 (deploy) y credenciales QA-TEST.
- S1-58: fix y REG-ENUM-01 listos. Bloquea: S1-18 (sin rama).
- S1-59: confirmación de variables (DevOps) y fix fail-closed (Desarrollador).
- S1-60: GET anónimo a URL QA-TEST → 403. Bloquea: deploy del fix + bucket privado.
- S1-61: plan de verificación listo. Bloquea: S1-02 (rotación).

---

## Cierre Sprint 2 · Seguridad (16/10/2026, CR)
| Historia | Estado |
|---|---|
| S2-52 Modelo de amenazas ONVO | Casi terminada · bloqueada por S2-09 (no existe el doc de arquitectura) |
| S2-53 Alcance PCI | Hecha (SAQ A estimado) · confirmar 5 puntos con ONVO · hallazgo PCI-1 medio |
| S2-54 Pipeline | Casi terminada · bloqueada por S2-60 · PIPE-1 ALTO |
| S2-55 Backups cifrados | Casi terminada · bloqueada por S2-62 · BK-1/2/3 ALTOS |
| S2-56 Regla gitleaks ONVO | Hecha y probada · falta que el Desarrollador la agregue al repo |
| S2-57 SEG-O en vivo | Pendiente de credenciales QA-TEST + OK de HOT_CLICK (matriz lista) |
| S2-58 Claim Clerk | Backend hecho (falla cerrado) · pendiente de la plantilla (HOT_CLICK) y de la prueba en vivo |
| S2-59 CSP acotada | Análisis y cambio hechos · pendiente de implementación y staging |

## Altos abiertos (plan y dueño)
- PIPE-1/BK-3: backup.yml publica un dump sin cifrar en un repo PÚBLICO (hoy falla; no hay artifacts vivos). Deshabilitar y borrar los secretos SUPABASE_* → DevOps con OK de HOT_CLICK.
- BK-1: la passphrase vive en el mismo servidor → gpg con llave pública, privada en manos de HOT_CLICK → DevOps.
- BK-2: los dumps locales están en claro → DevOps.

## Pendientes para el siguiente sprint
- S2-52: validar contra S2-09 y asignar cada control a historias. Bloquea: S2-09.
- S2-53: respuestas de ONVO (iframe, AOC, dominios, firma del webhook). Bloquea: ONVO.
- S2-54: revisar el workflow de deploy nuevo. Bloquea: S2-60.
- S2-55: verificar cifrado con llave pública, sin dumps en claro y restauración de prueba. Bloquea: S2-62 (con alcance local).
- S2-56: PR con la regla y prueba con una llave falsa en el PR. Bloquea: Desarrollador.
- S2-57: ejecutar la matriz. Bloquea: credenciales QA-TEST y OK.
- S2-58: plantilla en Clerk y prueba con una cuenta sin verificar. Bloquea: HOT_CLICK y la cuenta QA.
- S2-59: implementación y prueba en staging. Bloquea: Desarrollador, staging y Java en el box.
- Arrastre del Sprint 1: S1-56 H1, PAG-6 fail-closed, S1-58, S1-60 y S1-61.

---

## Cierre Sprint 3 · Seguridad (16/10/2026, CR)

| Historia | Estado |
|---|---|
| S3-47 Registrar ONVO + % | Bloqueada por S3-07/S3-09 · AUD-1 medio · casos listos |
| S3-48 Webhook | Bloqueada por S3-18 · WH-1 alto latente · WH-2/3/4 medios |
| S3-49 Monto/onBehalfOf | Bloqueada por S3-16 · controles y casos listos |
| S3-50 Logs sin onboardingUrl/llaves | Bloqueada por S3-07 · LOG-1 alto (cédula en logs SINPE) |
| S3-51 CSP ONVO | Casi terminada · falta confirmación de hosts ONVO + staging |

## Altos abiertos (plan y dueño)
- WH-1: webhook marca CAPTURADO sin GET a ONVO ni check de monto/empresaId → Desarrollador (S3-18).
- LOG-1: cédula del comprobante SINPE en logs → Desarrollador (quitar ya; el flujo desaparece con ONVO).

## Pendientes para el siguiente sprint
- S3-47: implementar + pruebas de rol/auditoría. Bloquea: S3-07, S3-09.
- S3-48: GET previo al marcar pagado, rate limit, tope de tamaño, clave de idempotencia. Bloquea: S3-18 + staging.
- S3-49: prueba de manipulación en staging. Bloquea: S3-16.
- S3-50: búsqueda en logs de staging + filtro logback. Bloquea: S3-07 + staging.
- S3-51: hosts exactos de ONVO + prueba staging. Bloquea: respuesta de ONVO (S2-53) + staging + Java en el box.
- Arrastre S1/S2: H1 tienda propia, PAG-6, PIPE-1/BK-*, gitleaks ONVO, CSP comodín, SEG-A.

---

## Cierre Sprint 4 · Seguridad (16/10/2026, CR)

| Historia | Estado |
|---|---|
| S4-47 Cédula del pagador | Bloqueada por S4-06 · controles PRODHAB listos · LOG-1 arrastre |
| S4-48 Panel de ventas tenant | Bloqueada por S4-15 · controles y casos listos |
| S4-49 Planes sin atajos | Bloqueada por S4-11 · PLAN-1 alto latente (PAG-6 + webhook billing sin GET) |
| S4-50 Tarifa semanal | Bloqueada por S4-09 · controles listos |
| S4-51 Enumeración correo checkout | Hecha (análisis) · ENUM-C medio · fix unificado con S1-18 |

## Altos
- PLAN-1 / PAG-6 latente + webhook de billing sin re-consulta → Desarrollador (S4-11 / S3-18).

## Pendientes para el siguiente sprint
- S4-47..S4-50: implementación de dependencias + pruebas en staging. Bloquean: S4-06, S4-15, S4-11, S4-09.
- S4-51: unificar mensajes (S1-18) y añadir REG-ENUM-02. Bloquea: S1-18.

---

## Cierre Sprint 5 · Seguridad (16/10/2026, CR)

| Historia | Estado |
|---|---|
| S5-45 Facturación | Bloqueada por S5-14/S5-15 · controles listos |
| S5-46 Reembolsos | Bloqueada por S5-08 · controles listos |
| S5-47 CSV conciliación | Bloqueada por S5-12 · controles listos |
| S5-48 Auditoría comisión/reembolsos | Casi terminada · AUD-IMM + AUD-1 · faltan eventos |
| S5-49 Cookies/proveedores | Hecha (borrador) · pendiente OK de HOT_CLICK |

## Pendientes para el siguiente sprint
- S5-45..S5-47: implementación de dependencias + pruebas 403/archivos privados. Bloquean: S5-14/15, S5-08, S5-12.
- S5-48: `@Immutable` + eventos de comisión/reembolso. Bloquea: Desarrollador.
- S5-49: confirmación de HOT_CLICK.

---

## Cierre Sprint 6 · Seguridad (16/10/2026, CR)

| Historia | Estado |
|---|---|
| S6-44 Auditoría final | Plantilla lista · se ejecuta post go-live |
| S6-45 Llaves live | Bloqueada por S6-02 · procedimiento listo (sin valores) |
| S6-46 Revocar Tilopay | Bloqueada por S6-10 · lista de variables lista |
| S6-47 Post-salida | Bloqueada por S6-01 · plan de monitoreo listo |
| S6-48 Incidentes | Hecha (borrador) · pendiente confirmación de HOT_CLICK |

## Pendientes para el siguiente ciclo (post Sprint 6 / go-live)
- Ejecutar S6-44 cuando cierren los altos de arrastre.
- S6-45/46: tras S6-02 y S6-10 + OK de HOT_CLICK.
- S6-47: 7 informes diarios tras S6-01.
- S6-48: HOT_CLICK confirma roles y plazos legales.
