# Traspaso: bots de IA de HotClick (estado al 28-nov-2026)

Este documento es para otro agente o modelo de IA que retome el trabajo. Asume que no tenés ningún contexto previo.
El repo es público: acá no van IPs, llaves, tokens, teléfonos ni datos de clientes.

## 1. Qué es esto

HotClick (tienda en línea de Costa Rica, Spring Boot 3.5 / Java 21 + React 19) suma un módulo de **bots de IA** para
WhatsApp, Instagram y Messenger, más un asesor en la web. Son **tres bots que comparten un motor**:

1. **Bot del negocio.** El vendedor conecta sus redes. Con clientes vende: busca productos, arma el carrito y manda un
   enlace de compra (checkout invitado + ONVO), y confirma en el chat si se pagó. Con el personal del negocio responde
   sobre inventario y finanzas (con PIN y vinculación). Se puede pausar o pasar a una persona desde la bandeja.
2. **Bot de HotClick.** Atiende las redes de HotClick: vende productos de todas las tiendas y capta vendedores (leads).
3. **Asesor web.** Asesor de compra dentro de la tienda.

Historias AG-01 a AG-41 (issues #600 a #640 en GitHub, label `agente-ia`). **Todo el código está hecho.** Lo que falta
depende del dueño: Meta, decisiones, revisión legal y el OK para master.

## 2. Reglas del dueño (obligatorias)

- **Nada a master sin su OK.** Sin rebase, sin force push y sin `git stash` a secas.
- El CI se revisa en el **PR #645** ("NO MERGEAR"), que apunta de `feat/agente-ia-integracion` a master. El CI solo corre
  en PRs contra master, por eso existe ese PR.
- Meta (App Review, plantillas, número): **todavía no**.
- La voz debe usar una opción gratis.
- Las decisiones se le explican en lenguaje simple, con opciones A y B.
- No tocar la VM de Oracle (`hotclick-vnic`) para pruebas de los bots: las pruebas van en la PC del dueño.
- Lo legal va en `reportes-privados/agente-ia/`, que está fuera de git, en el checkout principal.

## 3. Dónde está el código

| Qué | Dónde |
| --- | --- |
| Rama de integración | `feat/agente-ia-integracion`, último commit `0fc7b9628` (CI de #645: 25 pass, 3 skip esperados) |
| Worktree local | `Hot-click-dev-agente/`, junto al checkout principal `Hot-click-dev/` |
| Backend | `Hot_click_outlet/src/main/java/com/hotclick/agente/` |
| Pruebas | `Hot_click_outlet/src/test/java/com/hotclick/agente/` (incluye `redteam/`) |
| Frontend | `Hot_click_outlet/frontend/src/features/botVentas/`, `/pyme/bandeja`, `/pyme/bot`, `/plataforma/bot` |
| Migraciones | `V244` a `V260` (sin V251 ni V256) en `src/main/resources/db/migration/` |
| Docs técnicos | `docs/agente-ia/` (plantillas de Meta, prueba de carga k6, Whisper autohospedado) |
| Seguridad | `docs/security/amenazas-activas.md` (filas `agente-*`) |

Paquetes de `com.hotclick.agente`, según su función:

| Función | Paquetes |
| --- | --- |
| Entrada y salida | `webhook` (firma de Meta, deduplicación), `canal` (cuentas de canal, envío), `conexion` (Graph y alta guiada de Meta), `onboarding` |
| Motor | `motor` (bucle de herramientas con Claude, presupuesto y tope de iteraciones), `conversacion`, `idioma` (ES/EN/PT) |
| Venta | `ventas`, `catalogo`, `enlace` (enlace de compra), `pago`, `seguimiento`, `comprobante` |
| Otros bots | `hotclick` y `lead` (bot de HotClick), `asesor` (web), `interno` (personal con PIN) |
| Operación | `bandeja` (pasar a humano), `panel` (configuración), `cupo` (cupos y STOP), `campana` (campañas y catálogo de Meta), `metricas` (encuesta) |
| Voz | `voz` (notas de voz: descarga segura y transcripción) |

## 4. Cómo trabajar (lo que funcionó)

- **Una rama por tarea**, cortada de la integración:
  `git worktree add -b feat/agente-wa-<tema> ../Hot-click-dev-<tema> origin/feat/agente-ia-integracion`.
  Después: `git merge --no-ff` a la integración, push, y revisar con `gh pr checks 645`.
- **No uses `isolation: "worktree"` en subagentes.** Falla porque `.git/logs/HEAD` del repo principal es un enlace duro.
  No toques ese archivo. Creá los worktrees a mano con el comando de arriba.
- Si `static/` choca al unir ramas, quedate con el de HEAD y regeneralo con `pnpm build` en un commit aparte.
- **Maven en la PC:** solo pruebas puntuales, porque las corridas grandes se quedan sin memoria.
  `MAVEN_OPTS=-Xmx1200m ../maven/bin/mvn -q test -Dtest=<Clase>` desde `Hot_click_outlet/`. Para todo lo demás, el CI.
- Como mucho 3 agentes a la vez. Maven Central a veces da 429 en el CI: se permite 1 rerun.
- El commit-gate marca como secreto las constantes `TOKEN = "..."` de 12 o más caracteres en los tests.
- Problemas preexistentes que no hay que perseguir:
  - `pnpm lint` local da unos 200 errores ajenos a los bots.
  - 3 tests de vitest fallan en Windows por las barras de ruta.
  - `gate-scale.mjs` falla en Windows con ENAMETOOLONG.

## 5. Qué se hizo en la última sesión (26 al 28-nov-2026)

Fueron 8 tareas, todas unidas en `0fc7b9628`:

| Tarea | Resultado |
| --- | --- |
| Adaptador de voz | `voz/TranscriptorOpenAiCompatible.java`. Se activa con `AGENTE_VOZ_PROVEEDOR=openai-compatible`. Sirve para Groq (whisper-large-v3-turbo) o para un Whisper propio. Exige https (http solo para localhost), usa `verbose_json` y rechaza audios más largos que `AGENTE_VOZ_MAX_SEGUNDOS`. **Apagado por defecto.** |
| Idiomas | `idioma/IdiomaConversacion` detecta el idioma de cada conversación. `TextosFijos` tiene textos ES/EN/PT de voz, encuesta, ofertas, botones y catálogo. **EN y PT son borrador.** |
| SonarCloud | Unos 63 code smells corregidos. Quedan unos 100 a propósito, porque cambiarlos obliga a tocar la lógica. |
| Prueba de carga k6 (PC) | Unas 980 req/s, p95 de 34 a 59 ms, 0 % de errores, deduplicación OK. No incluyó pgvector ni el motor de IA. Detalle en `docs/agente-ia/prueba-de-carga-webhook-meta.md`. |
| Whisper local (PC, GPU) | faster-whisper transcribió bien en unos 0,3 s. Guía para la VM en `docs/agente-ia/voz-whisper-autohospedado.md`, sin probar en la VM. Prueba E2E manual: `TranscriptorOpenAiCompatibleE2ETest`, que se salta si no existe `AGENTE_VOZ_E2E_URL`. |
| Aviso legal de voz | Borrador en `reportes-privados/agente-ia/AG-13-aviso-voz.md`, fuera de git. |
| Decisiones explicadas fácil | Documento en Claude Docs (ver la sección 8). |
| Paquete para master | Documento en Claude Docs. Recomienda un solo PR. **Ojo: su análisis de migraciones ya quedó viejo; ver la sección 6.** |

## 6. Riesgos y hallazgos abiertos (leer antes de tocar nada)

1. **Choque de migraciones con master (nuevo, 28-nov).** `origin/master` ya tiene `V244__base_fiscal.sql` (PR #672).
   La integración también usa V244 (`V244__canal_evento_procesado.sql`), así que antes de unir hay que renumerar las
   migraciones de los bots: V244 a V260 pasan a V245 en adelante, o a una numeración libre. Hacelo en una rama, sin
   reescribir historia, y revisá referencias en tests y docs. El documento "paquete para master" decía que no había
   choque; eso ya no es cierto.
2. **Clave de Groq.** Con `AGENTE_VOZ_API_KEY` puesta, los audios de los clientes se mandan a Groq (EE. UU.) sin pedir
   consentimiento. **No configurarla en producción** hasta que un abogado revise el aviso de voz y exista el
   consentimiento en el flujo.
3. **El aviso de privacidad del primer mensaje (AG-15) NO está implementado,** aunque se daba por hecho. Hay que
   implementarlo cuando el abogado apruebe el texto.
4. **V246** dice "Aditiva" en su comentario, pero hace `DROP NOT NULL` y amplía un `CHECK`. No destruye datos, pero el
   dueño tiene que aprobarla.
5. **Whisper en la VM.** El adaptador solo acepta http para localhost. Si Whisper corre en otro contenedor, hay que
   decidir la red (por ejemplo, el mismo host con un puerto local, o TLS).
6. Repetir la prueba de carga en un servidor de pruebas con pgvector y el motor de IA.
7. Los textos EN/PT necesitan revisión del dueño.
8. El contenido de #642 (plantillas) ya entró a la integración por #657. Hay que cerrarlo o actualizarlo cuando se
   arme el PR a master.

## 7. Pendientes del dueño (no los puede hacer un modelo)

- Marcar las decisiones del documento "explicadas fácil": V246, cupos y paquetes extra, productos sin tienda (Ley 7472),
  CSP del SDK de Facebook, comprobante al comprador, reactivar después de un STOP, topes y cobro de campañas, H-11
  (si el rol LECTOR ve el contacto del lead) y los textos EN/PT.
- Meta: app, App Review, número de WhatsApp y aprobación de plantillas.
- Revisión legal: aviso de voz y aviso del primer mensaje (AG-15).
- Elegir el proveedor de voz: Groq gratis o Whisper propio en la VM.
- Dar el OK para el PR a master.

## 8. Documentos relacionados

Están en Claude Docs. Un modelo sin acceso a claude.ai puede pedírselos al dueño.

| Documento | Enlace |
| --- | --- |
| Estado completo (ramas, PRs, variables, riesgos, "Dónde quedamos") | https://claude.ai/artifact/HVHdB35kmfcMznTXMX5sZr |
| Decisiones explicadas fácil | https://claude.ai/artifact/1L5CU1jCQXChhf6bxuTdXo |
| Paquete para unir a master | https://claude.ai/artifact/TeudrCJrH49oXZY3D59FsU |
| Guía de pendientes del dueño | https://claude.ai/artifact/G2Az4etuGL8xLHhG5QJdrt |
| Propuesta original (decisiones aprobadas) | https://claude.ai/artifact/JFDTAHd1eqtMQij3KqRMqy |

En el repo:

- `docs/agente-ia/`
- `docs/security/amenazas-activas.md`
- `docs/AGENTES_OLA*.md` (historia de cada ola de agentes)

## 9. Variables de entorno de los bots

Todas están en `Hot_click_outlet/.env.example` (sin valores) y en `application.properties`.

| Grupo | Variables |
| --- | --- |
| Meta | `META_APP_ID`, `META_APP_SECRET`, `META_WEBHOOK_VERIFY_TOKEN`, `META_GRAPH_VERSION`, `META_EMBEDDED_SIGNUP_CONFIG_ID`, `META_LOGIN_CONFIG_ID`, `META_AD_ACCOUNT_ID`, `META_CAPI_ACCESS_TOKEN` |
| Modelos | `AGENTE_MODELO_VENTAS` / `HOTCLICK` / `ASESOR_WEB` (Haiku 5.5 por defecto), `AGENTE_MODELO_INTERNO` (Sonnet 5.5) |
| Motor y tono | `AGENTE_EFFORT_*`, `AGENTE_MOTOR_*`, `AGENTE_TONO_*` |
| Personal | `AGENTE_INTERNO_PEPPER` (PIN del personal) |
| Campañas | `AGENTE_CAMPANA_*` (topes y costo) |
| Voz | `AGENTE_VOZ_PROVEEDOR` (vacía = apagada), `AGENTE_VOZ_BASE_URL`, `AGENTE_VOZ_API_KEY`, `AGENTE_VOZ_MODELO`, `AGENTE_VOZ_MAX_BYTES`, `AGENTE_VOZ_MAX_SEGUNDOS`, `AGENTE_VOZ_TIMEOUT_SEGUNDOS`, `AGENTE_VOZ_COSTO_USD_POR_MINUTO` |

## 10. Siguiente paso sugerido

1. Renumerar las migraciones de los bots para que no choquen con la V244 de master (hallazgo 1). Unir a la
   integración y revisar el CI de #645.
2. Actualizar el documento "paquete para master" con la numeración nueva.
3. Cuando el dueño marque las decisiones y el abogado apruebe los textos: implementar el aviso AG-15 y el
   consentimiento de voz, y recién después habilitar la clave de voz.
4. Si el dueño lo pide: armar el PR único a master. No unirlo sin su OK.

Instalaciones locales que se pueden borrar:

- k6: `winget uninstall GrafanaLabs.k6`.
- Las carpetas `.k6-local` y `.whisper-local` de los worktrees `Hot-click-dev-k6` y `Hot-click-dev-whisper-local`.
- El modelo `faster-whisper-small` en la caché de Hugging Face.
