# Traspaso · HotClick QA POS

## Rol y descripción para recrearte
- **Nombre:** HotClick QA POS
- **Título:** HotClick QA POS
- **Descripción:** "QA 6 de HotClick: caja, turnos, inventario, pago POS y QR (área 4, ya ✅). Todo desde la app; sin números SINPE ni teléfonos reales en reportes. Repo hotclickdev/Hot-click-dev. Reportás solo a Grok Bot (id 2f876dbf-e82a-4b66-b209-2249a23ec8ca); nunca hablás con Andrés ni con humanos. Leé tu nota docs/traspaso/hotclick-qa-pos.md (rama docs/traspaso-cuenta-nueva). No tocás código ni hacés deploy; nunca digas que algo pasa sin evidencia. Español de Costa Rica con voseo. Reporte: Tarea | Estado | Hecho | Evidencia | Archivos | Riesgos | Bloqueos | Siguiente paso."

## Reglas que seguís
- No tocás código ni hacés deploy.
- Nada se da por bueno sin evidencia.
- Sin secretos, números SINPE ni teléfonos reales (solo decí dónde están los secretos).
- La coordinación de QA pasa por el Mentor (regla reportada por HotClick QA).
- No usés cloud agents de Cursor.
- En local solo tests dirigidos; las suites completas las corre CI.
- Suites completas o app local: `flock /workspace/hotclick/.suite-completa.lock`, una a la vez; detené tus procesos por PID.
- Sin rebase, sin force push y sin tocar master.

## Lo que hiciste
- No tenés PRs ni commits propios registrados (esta nota es el primero).
- 30 de octubre: mandaste al Mentor una nota de traspaso en texto.
- 30 de octubre: propusiste 5 cambios al plan de la fase 2 (/workspace/hotclick/plan-fase2-pruebas-seguridad.md):
  1. Que el POS quede incluido de forma consistente en todo el plan.
  2. Flujos del cajero en la matriz: abrir y cerrar caja y turno con arqueo; venta en efectivo, con tarjeta en ONVO test y con QR; anulación y devolución; stock en 0 y en otra bodega; una cuenta de cajero sembrada y la lista de lo que tiene prohibido.
  3. IDOR en caja, turno, inventario y QR por tienda y rol; montos del POS y del QR calculados en el servidor con idempotencia.
  4. Inventario negativo y anulaciones a P1, más la concurrencia de la última unidad.
  5. Que una anulación o devolución genere nota de crédito y devuelva el stock.
- 31 de octubre: le respondiste a HotClick Preparación Fase 2 que no tenés registro de cómo se asigna un cajero.

## Evidencia
- Esta sesión no tiene evidencia propia registrada; el ✅ del área 4 viene del perfil.
- La nota anterior (abajo, escrita por HotClick CI/CD) sí cita evidencia: docs/traspaso/evidencia/hotclick-qa-pos/reporte.md y /workspace/hotclick-reportes/qa6-evidencia/area4-2c051030/ (master 2c051030, #341). Verificá que existan antes de apoyarte en ellas.

## [PENDIENTE]
- [PENDIENTE] Re-verificar el área 4 desde la app.
- [PENDIENTE] Definir cómo se asigna el CAJERO: EquipoController solo ofrece EDITOR, LECTOR y ADMIN, y V135 desactivó el rol global CAJERO (según Preparación Fase 2). Bloquea las pruebas del cajero en la fase 2.
- [PENDIENTE] Correr la parte POS de la fase 2 cuando arranque.
- [PENDIENTE] Los pendientes de la nota anterior (QR vencido, QA6-R4-03, QA6-R4-04, rotar contraseña de la cuenta PYME).

## Próximos pasos exactos
1. Leé /workspace/hotclick/plan-fase2-pruebas-seguridad.md.
2. Confirmá el mecanismo del cajero con HotClick Dev Pagos 2 o con el Auditor 4 (POS e Inventario).
3. Pedí la cuenta de cajero sembrada en staging.
4. Ejecutá la matriz del POS con evidencia (rutas y capturas sin PII).

---

## Nota anterior (HotClick CI/CD en nombre de QA POS)
- **Rol:** QA del área 4 (POS).
- **Estado:** área 4 quedó en **OK**.
- **Evidencia:** [evidencia/hotclick-qa-pos/reporte.md](evidencia/hotclick-qa-pos/reporte.md) (de qa6-evidencia/area4-2c051030; el run.log no se subió).

Nota escrita por HotClick CI/CD en nombre de QA POS (sin permiso de push).

## Correcciones al README

### (a) Errores o datos viejos
- Fila de HotClick QA POS: "Área 4 ✅" es correcto, pero conviene aclarar que se cerró sobre master 2c051030 (#341: kardex 200 y caja inexistente 404). Evidencia local: /workspace/hotclick-reportes/qa6-evidencia/area4-2c051030/.
- La nota hotclick-qa-pos.md no se subió: este bot no tiene permiso para hacer commit ni push y no recibió el OK directo de Andrés. Si el enlace de la fila da 404, esa es la causa.

### (b) Lo que le falta a mi reemplazo
- Pendiente: probar el QR SINPE vencido de verdad (vence a los 30 min) o con reloj controlado; solo se probó el QR cancelado, que da 409.
- Pendientes BAJOS abiertos: QA6-R4-03 (ruta Tilopay del QR da 401 sin sesión) y QA6-R4-04 (POST /api/webhooks/tilopay acepta sin secret en el perfil de simulación; verificar que TILOPAY_WEBHOOK_SECRET o equivalente esté puesto en prod o retirar la ruta). Están en bugs-pendientes-media-baja-2026-10-23.md.
- Cuenta de prueba: PYME "QA PYME Prueba" (empresa 3). Credenciales en /workspace/qa-funcional/credenciales/qa2-pyme.txt (nunca imprimir). Hay que rotar su contraseña, porque quedó visible una vez en la salida de un comando del box.
- Comandos: backend propio en un worktree, en un puerto libre (por ejemplo :8082), con una DB local copiada; `unset ONVO_*` antes de arrancar; Maven en /workspace/qa1-verif/maven/bin y JDK 21 en /workspace/tools/jdk21; suite completa con `flock /workspace/.mvn-suite.lock`.
- Trampas:
  - No tocar los procesos hotclick-staging-backend ni hotclick-staging-front, ni usar pkill: matar solo por PID.
  - No borrar frontend/node_modules del worktree staging-43188186 ni /workspace/tools/node22.
  - El box se queda sin inodos: borrar los worktrees y target propios al terminar.
  - El correo de venta falla con 401 de SendGrid en local (no hay SENDGRID_API_KEY); es del entorno, no un bug.

### (c) Mejoras
- Agregar al README una línea por área con el hash de master en el que quedó APTO.
- Mover los pendientes BAJOS de cada QA a la fila del resumen para que no se pierdan.
