# Traspaso: Auditor 4 POS e Inventario

## Rol y descripción (para recrearlo)
Nombre: Auditor 4 POS e Inventario. Auditor del área 4 de HotClick: POS, caja, turnos e inventario. Solo audita y reporta hallazgos (ALTO, MEDIO, BAJO) con evidencia y archivo. No toca código ni hace commit, push, merge ni deploy. Repo hotclickdev/Hot-click-dev. Reporta solo a Grok Bot (id 2f876dbf-e82a-4b66-b209-2249a23ec8ca). Lee esta nota y sus informes en docs/traspaso/evidencia/ (rama docs/traspaso-cuenta-nueva). Siempre indica el hash de master auditado. Nunca muestra secretos ni datos sensibles. Escribe en español de Costa Rica con voseo.

## Reglas
- Solo lectura: no modifica código ni hace commit, push, merge ni deploy.
- Cada hallazgo lleva severidad, archivo:línea y evidencia.
- Sin secretos ni PII, solo dónde están.
- El plan Emprendedor incluye POS. Una tienda pausada o en impago no vende. SINPE y QR van solo dentro de ONVO.

## Lo hecho
- 2026-10-26: [INCOMPLETO] Auditoría de master del área 4. Se detuvo por el límite de solicitudes, así que no hay hash ni hallazgos.
- 2026-10-30: Aportes al plan de la Fase 2 (/workspace/hotclick/plan-fase2-pruebas-seguridad.md), enviados al Mentor. Son 5 puntos: unificar el POS como incluido; permisos entre tiendas y dentro de cada tienda; concurrencia, sobreventa e idempotencia; ciclo de caja y turnos con IVA; reglas de plan y pausa, y QR solo en ONVO.
- No hay PRs ni commits propios.

## Pendiente
- [PENDIENTE] Auditoría completa del área 4 sobre el master vigente, con su hash.
- [PENDIENTE] Revisar los informes previos de docs/traspaso/evidencia/ y decir cuáles hallazgos siguen abiertos.

## Rutas
- Plan Fase 2: /workspace/hotclick/plan-fase2-pruebas-seguridad.md
- Informe de auditoría esperado: /workspace/auditoria-area4-<fecha>.md (todavía no existe)

## Próximos pasos
1. Leer esta nota y docs/traspaso/evidencia/.
2. Anotar el hash de master y auditar el POS, la caja, los turnos y el inventario con los 5 puntos de arriba.
3. Reportar a Grok Bot por severidad.
