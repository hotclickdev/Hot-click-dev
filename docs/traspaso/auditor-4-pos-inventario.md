# Traspaso · Auditor 4 (POS e inventario)

- **Rol:** auditoría de solo lectura sobre POS e inventario.
- **Estado:** Fase 1 entregada.
- **Asignaciones:**
  - ALTO 2, ALTO 3 y MEDIO 4 → Dev Pagos (PR ONVO del POS).
  - ALTO 1 y MEDIO 5 → Dev Pagos 2.
  - El resto queda para después del lanzamiento.
- **Decisiones conocidas:** el SINPE del POS pasa por ONVO; el precio de oferta se calcula en una sola función del servidor.
- **Evidencia:** [evidencia/auditor-4-pos-inventario/fase1-pos-inventario.md](evidencia/auditor-4-pos-inventario/fase1-pos-inventario.md)

Nota escrita por HotClick CI/CD en nombre del Auditor 4 (sin permiso de push).

## Correcciones al README

Fuente: `docs/traspaso/README.md` en `docs/traspaso-cuenta-nueva` (b9f241d8). Revisé la fila del Auditor 4 (línea 134), su sección (línea 431), la lista "PARA EL BOT DE LA CUENTA NUEVA" y la nota `docs/traspaso/auditor-4-pos-inventario.md`.

### (a) Errores o datos viejos
1. **Línea 134:** dice "informe en hotclick-reportes/auditoria/". Esa ruta está en el disco del box de la cuenta vieja, así que la cuenta nueva no la va a ver. Hay que apuntar a `docs/traspaso/evidencia/auditor-4-pos-inventario/fase1-pos-inventario.md`, la ruta que ya usa la nota.
2. **Línea 431, prompt del Auditor 4:** el id fijo de Grok Bot (`a3d72a57-…`) es de la cuenta vieja. Hay que reemplazarlo por el id del Grok Bot nuevo al recrear el bot. Lo mismo vale para todos los prompts que lo traen.
3. **Línea 209 frente a la nota:** la tabla marca el área 4 como "✅ re-QA sobre master 2c051030 sin fallos", pero la nota solo dice "Fase 1 entregada" y lista asignaciones como pendientes. Yo audité master aa907776 y no verifiqué el re-QA ni el estado de los arreglos. Hay que dejar las dos piezas coherentes e indicar qué PR cerró cada hallazgo, o si alguno sigue abierto.
4. **Paso 6 (quitar Tilopay):** mi ALTO 3 es la confirmación del QR del POS amarrada a Tilopay (`PosQrVentaService.java:258-266`, en aa907776). Si sigue sin migrar, quitar Tilopay rompe el QR del POS. Primero hay que confirmar que el QR ya confirma por ONVO.

### (b) Lo que le falta a mi reemplazo
- **Base de la auditoría:** commit aa907776, con 9 CORRECCIONES (3 ALTO, 4 MEDIO y 2 BAJO) y 10 MEJORAS.
- **Pendientes de post-lanzamiento:** cajero con hasta 500 clientes con datos completos (MEDIO, depende del rol de cajero de A3 del Auditor 2), ajuste de inventario por Telegram que puede dejar el stock negativo, sobreventa solo en el log (relacionada con M-08 del Auditor 3) y venta asociable a un cliente de otro negocio.
- **Cruce con el Auditor 1:** la migración del QR a ONVO no debe heredar los hallazgos C2, C6 y C9 de pagos.
- **Comandos de solo lectura:** `gh api repos/hotclickdev/Hot-click-dev/contents/<ruta>?ref=<sha> -H "Accept: application/vnd.github.raw"` y `gh pr list -R hotclickdev/Hot-click-dev`.
- **Accesos:** basta con GitHub de lectura. No necesita llaves de prod ni de ONVO.
- **Trampas:** las reproducciones salen del código y no se probaron en staging. Tampoco se verificó si Telegram filtra los negativos antes del ajuste.

### (c) Mejoras
- Agregar a la nota una tabla de hallazgo, PR que lo corrige y estado, para que el reemplazo no tenga que re-auditar.
- Pedirle al reemplazo que re-audite solo los ALTO sobre el master actual antes de dar el área por cerrada.
