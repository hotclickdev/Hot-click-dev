# Traspaso: HotClick QA Reauditoría

Actualizado: 2-nov-2026, 22:55 CR. Sin secretos: solo se indica dónde están.

## 1. Rol y descripción (para recrearme en otra cuenta)
QA de apoyo de HotClick (Spring Boot + React/Vite, repo `hotclickdev/Hot-click-dev`).
- Confirma el cierre de hallazgos de las áreas **3 (marketplace)**, **6 (chatbots/asistente)** y **10 (infra)** sobre el hash exacto de `master` o de staging.
- Corre tests dirigidos y casos negativos; guarda la evidencia en `/workspace/qa/`.
- Habla en español de Costa Rica.
- Solo se comunica con el **Mentor** (`e221623d-00c2-4fcd-9bed-fbd2758bc67d`) y **HotClick QA** (`489bafd3-4b3a-4bbe-b5e4-9a90f1acf9d0`). Nunca le escribe a Andrés.
- **PROHIBIDO:** deploy, gasto, cuentas nuevas, servidores, borrar datos de producción, llave live de ONVO, mostrar secretos. ONVO solo en modo test.
- Usa los skills `hot-click-dev-workflow` y `hot-click-diseno-figma`.

## 2. Reglas que sigo
- Staging en solo lectura, salvo lo que pida explícitamente HotClick QA.
- Sin POST de checkout ni PUT sin autorización del usuario.
- Tokens en archivos con permisos 600, tapados en los logs y borrados al vencer.
- Verificar el hash de staging por el jar del proceso en `:8081`, porque `/api/health` no lo expone.
- Reglas de git del skill `hot-click-dev-workflow` (sin stash, add por ruta, sin force, nunca a master sin CI verde y APTO).
- No hice cambios de código: no hay rama de feature ni PR propio.

## 3. Lo hecho
1. **Reauditoría sobre master `adf051748536431a40c3a35c31e68c812cb56a63` (merge #459)** — CERRADOS:
   - Área 3: MED-1 #456 (12/12); MED-2 #457/#458/#459 (41/41).
   - Área 6: MEDIO-2 #450 (44/44 + regresión #434/#442 37/37).
   - Área 10: INF-08 #451, Dependabot #453, zod #454 (4.6.7), follow-redirects #452 (1.16.2); eng-gates 43/43.
   - Evidencia: `/workspace/qa/reaud/` (`resumen.md`, `area3-marketplace.md`, `area6-asistente.md`, `area10-infra.md`, logs) y `/workspace/qa/reauditoria-adf051748536431a40c3a35c31e68c812cb56a63.md`. Clon de lectura: `/workspace/qa/repo-adf0517`.
2. **Staging `2a889235`:** #444 negativos públicos OK. Evidencia en `/workspace/qa/reaud/staging-2a889235/` (`PR444.md`, `PR447.md`, `run-ro.sh`, `plan.md`). El 403 no-admin de #444 se corrió el 31-oct 22:42 CR, atribuido a staging `85563002` según comentario de CI/CD en #461 (`raw/444-noadmin.log`).
3. **Staging `ca9bb6da` (2-nov 08:15 CR):** #444 admin 200, no-admin 403, público 200 sin `montoMaximo`. Evidencia: `/workspace/qa/reaud/staging-ca9bb6da/raw/ro-ca9bb6da.log`.

## 4. Pendiente
- [PENDIENTE] #444: 400 por montos inválidos (requiere PUT autorizado por el usuario).
- [PENDIENTE] #447: detalle de pedido con provincia/cantón/zona y 403/404 entre negocios (pyme-cafe id 2, plus-ferreteria id 3, tienda-b id 4). No hay pedidos en staging; se espera la semilla 04 de pedidos de CI/CD.
- [PENDIENTE] #447: 400 por cantón de otra provincia (requiere POST de checkout, no autorizado por el usuario).
- [PENDIENTE] Confirmar V211/V213 en la base (salida de Flyway de CI/CD en #461).
- Limitaciones: tests locales con H2; osv-scanner marca 16 vulnerabilidades en el front (2 altas de xlsx con excepción hasta 31-dic-2026).

## 5. Rutas
- Evidencia: `/workspace/qa/reaud/` y subcarpetas `staging-<hash>/`.
- Tokens (secretos, no copiar): `/workspace/qa/paso0/tok/TOK_ADMIN_FILE` y `TOK_USER_FILE`, los entrega HotClick QA; vencen y se borran.
- Clon de este traspaso: `/workspace/qa/traspaso/repo`.

## 6. Próximos pasos exactos
1. Esperar aviso de HotClick QA: semilla 04 cargada + tokens frescos.
2. Confirmar el hash de staging por el jar del proceso en `:8081`.
3. Correr `GET /api/pedidos/{id}` con token admin, dueño del negocio y otro negocio; correr `run-ro.sh`.
4. Guardar en `/workspace/qa/reaud/staging-<hash>/`.
5. Reportar por área a HotClick QA y al Mentor.
6. Borrar los tokens al vencer.
