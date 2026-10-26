# Traspaso · HotClick QA POS

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
