# Traspaso: HotClick QA 2

Fecha: 26-oct-2026 (hora Costa Rica, UTC-6). Autorizado por Andrés vía Grok Bot (26-oct 14:35 CR).

## Rol
Segundo QA de HotClick: suite y casos negativos, ONVO en sandbox (solo llaves de prueba), QA funcional del plan PYME (área 2: cuentas y roles). No escribe código de producto, no hace merge ni deploy.

## En qué quedé
- Roles PYME sobre master `f9f0e506` (staging local, backend :8081): terminado el 26-oct 12:48 CR. Reporte: `evidencia/hotclick-qa-2/roles-pyme-master.md`.
- Cancelación de suscripción ONVO en sandbox: OK en master `f93bd51e` (después del #256). Log: `evidencia/hotclick-qa-2/logs/onvo-sub-sandbox-master-f93bd51e.log`. Quedaron 0 suscripciones activas en sandbox.
- QA funcional PYME fase 1 en staging: parcial (registro de empresa bloqueado por el 500 de QA1-004). Reporte: `evidencia/hotclick-qa-2/reporte-fase1-parcial.md`.

## Ramas y PRs
No tengo commits propios sin subir ni PRs abiertos míos. Había tres ramas locales con cambios sin commitear sobre una base vieja (`eb7564c24`, 273 commits atrás de master). Las subí como WIP, sin PR, porque la base está atrasada y no están verificadas sobre master:
- `wip/qa2-xss-hardening`: endurecimiento XSS en el front (usePayment, EncargoPublicPage y otros). WIP.
- `wip/qa2-xss-opcionales`: variante con los opcionales del mismo endurecimiento. WIP.
- `wip/qa2-flaky-aviso-reposicion`: arreglo del test inestable AvisoReposicionCorreoTest. WIP.
Antes de usarlas hay que comparar con master: parte de esto pudo haber entrado ya por otros PRs.

Los demás worktrees de `/workspace/qa2-wt/` (tgt-*, qa-fix*, wallet-fix-full, walog, perfil-estricto, registro-planes, fe-registro, pos-sinpe, roles-master) eran copias de verificación de PRs de otros bots (sus ramas ya están en origin, por ejemplo fix/wa-mensaje-log-retencion, fix/wallet-*, fix/perfil-*, fix/registro-planes). No se subieron para no duplicarlas.

## Bugs abiertos que encontré
- **QA2-014 y QA2-015** (chatbot): ALTO.
- **QA2-007**: ALTO.
- Medios y bajos: en `/workspace/hotclick-reportes/bugs-pendientes-media-baja-2026-10-23.md` (box de la cuenta vieja).
- Roles PYME en `f9f0e506`:
  - El EDITOR puede LEER billing (suscripción, facturas, preferencias), métodos de cobro, payouts y `/api/admin/pagos`: **MEDIO, posible ALTO**. Las escrituras sí dan 403. Causa probable: los miembros llevan el rol EMPRENDEDOR y esos GET no pasan por PropietarioGuard (mismo patrón que QA3-012).
  - `GET /api/facturas` como EDITOR da 500 en vez de 403: BAJO.
  - Login con espacios alrededor del correo da 400 "correo inválido" (las mayúsculas sí funcionan): BAJO.
- Prueba en producción del 24-oct: la tienda pública `/prueba-andres-pyme` da 404.

## Pendientes
- Limpiar en producción lo creado en la prueba del 24-oct: productos 666 y 667, la bodega "PRUEBA Bodega 2", el invitado `andres.prueba+qa3editor@example.com` y la posible cuenta huérfana `qa2+prod-equipo@example.com`. Necesita OK de Andrés.
- Caso LECTOR de roles PYME: no cubierto (no había cuenta y no se crean cuentas).
- Crear o editar métodos de cobro como EDITOR: no concluyente (400 por validación antes de la autorización).
- Cancelar suscripción y portal de billing como EDITOR: no probado, para no poner en riesgo la suscripción.

## Próximos pasos
1. Repetir roles PYME sobre el master actual, con una cuenta LECTOR creada por quien esté autorizado.
2. Revisar el arreglo de las lecturas de billing para el EDITOR (PropietarioGuard en los GET) y revalidar.
3. Comparar las ramas `wip/qa2-*` con master y decidir si se cierran o se rehacen sobre master.

## Decisiones de Andrés que conozco
- ONVO es fail-closed.
- Las migraciones Flyway son solo aditivas.
- El cobro de planes pagos está postergado (409 `COBRO_PLAN_NO_DISPONIBLE`).
- Merge a master solo con CI verde y APTO sobre el hash exacto.
- Nada de deploy sin OK.
- Las decisiones de SINPE del POS siguen pendientes.

## Evidencia
`docs/traspaso/evidencia/hotclick-qa-2/`: reportes `.md` y logs cortos (ONVO sandbox, tests dirigidos de XSS, cobertura, aviso de reposición y POS SINPE). Sin capturas, secretos, teléfonos, SINPE ni cédulas; solo nombres de variables.
