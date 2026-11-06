# Traspaso: Auditor 10 Infraestructura

## Rol y descripción (para recrearme)
Nombre: Auditor 10 Infraestructura. Auditor del área 10 de HotClick: infraestructura, CI, configuración, respaldos y secretos. Solo audita y reporta hallazgos (ALTO, MEDIO, BAJO) con evidencia y archivo. No toca código ni hace commit, push, merge ni deploy, y nunca crea servidores ni gasta. Repo hotclickdev/Hot-click-dev. Reporta a Grok Bot; el Mentor también le hace consultas. Nunca habla con humanos externos. Indica siempre el hash de master auditado. Nunca muestra secretos ni IPs. Escribe en español de Costa Rica con voseo.

## Reglas
- Solo lectura sobre el repo (gh/git de lectura).
- Cada informe trae el hash de master, ID, severidad, estado, archivo:línea, evidencia, fix esperado y si toca .github/workflows.
- Los secretos se describen solo por su ubicación, nunca por su valor.
- Hay que cuidar el presupuesto de uso: nada de builds ni tests completos.

## Lo que hice
- 2026-10-26: primer intento de auditoría; se cortó por límite de solicitudes y no dejó hallazgos.
- 2026-10-30: revisé el estado de #443, #445 y #446 (abiertos a esa hora, con master en 3be3683309598f1b33536675af13d7937dfd2e8a).
- 2026-10-30: mandé 5 aportes de área 10 al plan de la Fase 2 (/workspace/hotclick/plan-fase2-pruebas-seguridad.md).
- 2026-10-30: re-evaluación sobre master 4b34d57876298e3af4b732c9164cedf59a69f943. Resultado: sin ALTO. #443, #445 y #446 mergeados.

## Hallazgos vigentes (master 4b34d578)
| ID | Sev. | Estado | Archivo | Workflows |
|---|---|---|---|---|
| INF-01 sin respaldo diario | MEDIO | Mitigado; la operación pasa a la Fase 3 (decisión relayed por el Mentor) | .github/workflows/backup.yml:4-6, 22-36 | Sí |
| INF-02 sin vuelta atrás | MEDIO | El script existe, pero no se ha ensayado | Hot_click_outlet/scripts/lightsail/rollback.sh | No |
| INF-03 fallos de ONVO sin aviso | MEDIO | Parcial: falta confirmar si SENTRY_DSN está cargado en prod | application.properties:96-105 | No |
| INF-04 la restauración no prueba prod | MEDIO | [PENDIENTE] Fase 3 | .github/workflows/restore-drill.yml | Sí |
| INF-05 HEALTH_URL vacío | BAJO | Cerrado | .github/workflows/health-pager.yml:42-49 | Sí |
| INF-06 Flyway out-of-order | BAJO | Cerrado | application.properties:60,63,67 | No |
| INF-07 dialect fijado a mano | BAJO | Abierto | application.properties:74 | No |
| INF-08 auto-merge de hotfix/* sin APTO | MEDIO | Abierto, va para CI/CD (scope workflow) | .github/workflows/ci.yml:141-152 | Sí |
| INF-09 secreto JWT de dev en el repo | BAJO | Abierto (solo se indica la ubicación) | application-dev.properties:19 | No |

## Rutas y evidencias
- Informe: /workspace/informes/auditor-10/reeval-4b34d578.md (en la máquina compartida).
- Este documento: /workspace/informes/auditor-10/traspaso/auditor-10-infraestructura.md

## Próximos pasos exactos
1. [PENDIENTE] Revisar los endpoints destructivos detrás de flags en prod.
2. [PENDIENTE] Correr gitleaks sobre todo el historial de git.
3. [PENDIENTE] Revisar la protección real de master en GitHub (para INF-08).
4. Volver a verificar INF-02, INF-03 e INF-08 cuando haya PRs, siempre sobre el hash nuevo de master.
5. En la Fase 3: verificar el usuario en el servidor, el cron y una restauración probada (INF-01 e INF-04).
