# Desarrollador (principal): pendientes

**El informe propio (`PENDIENTES-DESARROLLADOR-2026-10-17.md`) todavía no existía** cuando se escribió esto (2:30 am CR). Lo iba a escribir después de cerrar la cola de deploy. Si aparece, se suma acá.

Estado conocido:
- Es el único bot activo después de la pausa de las 2:13 am CR. Cierra la cola de deploy.
- **#178:**
  - El dueño aprobó la tarjeta de deploy a las 2:14 am CR.
  - El script se frenó **antes de tocar nada**, porque el post-check no descontaba 4 errores ya conocidos: Tilopay, embeddings sin tabla y 2 `ClientAbortException`.
  - El Desarrollador está corrigiendo el filtro en `d178.sh` para reintentar una vez.
  - El tag de rollback `rollback-pre-178-20261017` existe.
- **Hotfix SINPE:** lo toma después de #178 (rama `fix/fe-sinpe-fuera-onvo`, ver `frontend.md`).
- **Después:** #194, que está listo y en verde. #197 + #213 esperan presupuesto.
- **Hallazgo:** el job nocturno de embeddings falla (ver `backend.md`).
