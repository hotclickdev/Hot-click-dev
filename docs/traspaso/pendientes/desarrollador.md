# Desarrollador (principal): pendientes (copia)

Fuente: `/workspace/ramas/PENDIENTES-DESARROLLADOR-2026-10-17.md` (2:25 am CR), copiado tal cual.

> **Corrección verificada en GitHub a las 2:30 am CR:** el informe dice que el hotfix SINPE no empezó, pero ya hay **dos PRs abiertos y no draft** para lo mismo: **#215** (`fix/fe-sinpe-fuera-onvo`, `86ab126db`, creado a las 2:19 am CR: 15 checks verdes y 1 pendiente) y **#216** (`fix/sinpe-fuera-onvo`, `4634fc9a5`, creado a las 2:24 am CR: 1 check en rojo y 2 pendientes). Son duplicados: hay que quedarse con uno (el plan dice `fix/sinpe-fuera-onvo`) y cerrar el otro. Ninguno se desplegó, y salen después de #178.


## Prod
- Corre `d5f995d7e` (#159), sano: health 200, RestartCount 0, Postgres healthy.
- Master está en `08b5291ca` (#178 mergeado, sin desplegar).

## #178
- Sin desplegar. Las dos aprobaciones del dueño (2:14 y 2:16 am CR) se gastaron porque el post-check previo de `d178.sh` frenó antes del backup. No cambió nada en el servidor.
- 1.ª corrida: el conteo de excepciones no descontaba los errores conocidos (Tilopay, embeddings sin tabla de pgvector, 2 ClientAbortException).
- 2.ª corrida: con ese filtro corregido, igual frenó por 2 `HttpMessageNotWritableException`, probablemente del mismo corte de conexión de las 10:07 pm CR (sin confirmar).
- Ahora: confirmar esas 2 con una lectura de logs y correr solo el post-check aparte. Recién ahí se pide una tarjeta nueva al dueño para un único deploy con la DoD completa.
- El tag de rollback `rollback-pre-178-20261017` está solo en GitHub. Todavía no hay imagen ni backup pr178 en el servidor.

## Hotfix de SINPE
- Frontend lo dejó en `fix/fe-sinpe-fuera-onvo`, solo local y sin cambios (lo cortó el presupuesto). Lo tomo yo en `fix/sinpe-fuera-onvo` después de #178. Todavía no empezó.
- Alcance: sin número ni titular en la pantalla sin token de ONVO, con el texto «Pago SINPE disponible pronto dentro de la pasarela segura»; ocultar «Generar QR de pago» de la caja (QA-NEG-056); `rg` en src, i18n y static/. No se toca DataSeeder.
- Backend revisa si alguna API devuelve el número o el titular. Si hay fix, va en el mismo deploy.

## Qué falta de la cola
1. #178
2. Hotfix de SINPE (más el fix de API de Backend, si hay)
3. #194 (en draft)
4. #197 + #213 juntos: esperan a que Frontend tenga presupuesto y a la validación de frecuencia de Backend. Antes del deploy, un SELECT con 0 negocios con frecuencia NULL.
5. Fuera de esta tanda: #209, #176, #206, #203, #207, #208, #211, #210, #212, #183, #171, #179–#181, #182, #157 y Nombre único. Sin entrar a la cola: #155, #160 y #152 (Tilopay, cuando ONVO funcione).
- Anotados sin tocar: el bloqueo de la caja en el backend para negocios no aprobados (QA-NEG-056) y las comisiones del DataSeeder (hoy 6 %; lo decidido es 9 % Emprendedor, 7 % Pyme y Negocio Plus, ₡700 mínimo).
- Job nocturno de embeddings: falla porque prod no tiene pgvector. Que salte con un WARN va en el próximo PR de Backend; cambiar la imagen de la DB lo decide el dueño.

## Ramas y commits locales sin subir (en /workspace/hc)
- `ci/staging` (8f36e9adc) y `ci/workflows-hardening` (8d608d241), de DevOps CI/CD: no están en origin. Esperan el permiso `workflow` del token de gh.
- `pr194` (7dcd8b0fa) y `pr197` (2e194cb80): son copias locales de esos PRs para revisarlos, no trabajo nuevo.
- Las demás ramas locales (`feat/s2-multinegocio`, `feat/staging-backend`, `fix/aud1-auditoria-inmutable`, `fix/pci1-ultimos4`, `hotfix/pedido-origen`) están iguales en origin.
- `fix/fe-sinpe-fuera-onvo` está en el worktree de Frontend, sin cambios.
- `d178.sh` (en la PC del dueño): solo se tocó el filtro de excepciones del post-check.
