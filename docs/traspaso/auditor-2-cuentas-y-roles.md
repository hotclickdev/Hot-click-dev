# Traspaso — Auditor 2 Cuentas y Roles (HotClick)

## Rol
Auditor de solo lectura de cuentas, login, Clerk, roles, equipos y permisos entre tenants. No escribe código, no crea ramas ni PRs. Reporta solo a Grok Bot.

## En qué quedé
- Fase 1 terminada sobre master `aa907776`.
- Informe: `/workspace/hotclick-reportes/auditoria/fase1-cuentas-roles.md`
- Resultado: 3 ALTO, 4 MEDIO, 2 BAJO + 6 MEJORAS.
- No existe un informe previo "parte2" de cuentas en el box.

## Ramas y PRs
Ninguno (este bot no crea ramas).

## Pendientes
1. Confirmar en el registro de auditoría de login de prod si el 401 es `user_not_found` o `wrong_password` (sin acceso desde este bot). Hipótesis: el hash es bcrypt plano y el problema es la normalización del correo.
2. A1 (ALTO, C1): el login no normaliza el correo (`AuthCredentialLoginHandler.java:62`), mientras que el registro lo guarda en minúsculas y sin espacios (`AuthRegistrationService.java:56`).
3. A2 (ALTO, C5): los roles de equipo no se aplican; todo miembro recibe EMPRENDEDOR (`RolMembresia.java:20-21`). EDITOR/LECTOR podrían cambiar métodos de cobro y editar productos o pedidos (deducido del código, sin probar).
4. A3 (ALTO, C5): falta un rol de cajero asignable (`EquipoController.java:25`) y una matriz de pruebas rol×endpoint. Relacionado: Auditor 4 vio que el cajero recibe hasta 500 clientes con sus datos completos; hay que limitarlos cuando exista el rol.

## Próximos pasos
- Bot Dev: normalizar el correo en el login (trim + lowercase) y añadir una prueba.
- Bot Dev: mapear los roles de membresía a permisos reales, crear el rol CAJERO y limitar los datos de clientes del POS.
- QA: matriz de pruebas rol×endpoint entre tenants.
- Reproducir A2 en staging.

## Decisiones de Andrés conocidas
- Plan de lanzamiento Fase 1 aprobado el 25-oct a la 1:35 (hora CR).
- Prod es solo lectura.
- Las correcciones las hacen los bots Dev después de que Andrés aprueba la lista.
- Sin deploys; merges a master con CI verde + APTO sobre el hash exacto.

## Evidencia
- `docs/traspaso/evidencia/auditor-2-cuentas-y-roles/fase1-cuentas-roles.md` (copia del informe).

## Correcciones al README

Revisado sobre la rama docs/traspaso-cuenta-nueva en el commit c69dcc3 (la punta actual; el pedido citaba b9f241d8). Solo lectura.

### (a) Errores o datos viejos
- Fila del Auditor 2 (línea 132): el enlace a la nota funciona; el archivo y la carpeta de evidencia ya están en la rama.
- La fila dice "informe en hotclick-reportes/auditoria/": esa ruta es del box viejo, no del repo. Indicar que la evidencia va en `docs/traspaso/evidencia/auditor-2-cuentas-y-roles/fase1-cuentas-roles.md`.
- Estado del área 2 (línea 207): "Correcciones mergeadas, falta el QA". No lo verifiqué: no se indica qué PRs ni cuáles de A1, A2 y A3 cubren. Sumar los números de PR y el hash de master auditado (aa907776).

### (b) Lo que le falta al reemplazo
- Los 3 ALTO a re-verificar en el QA: A1 (el login no normaliza el correo: `AuthCredentialLoginHandler.java:62` frente a `AuthRegistrationService.java:56`), A2 (todo miembro de equipo recibe EMPRENDEDOR, `RolMembresia.java:20-21`), A3 (no existe el rol cajero, `EquipoController.java:25`; falta la matriz de pruebas rol × endpoint para C5).
- Pendiente abierto: confirmar en el registro de auditoría de login de prod si el 401 de la cuenta de prueba cliente es `user_not_found` o `wrong_password`. Requiere acceso de lectura a esos logs o a la base, que el auditor no tenía.
- Trampa: el clon compartido del box puede tener cambios locales de otros bots; auditar siempre en un clon limpio aparte.
- Trampa: `/workspace/hotclick-reportes/prod-cuentas-prueba/03-cuentas-prueba.sql` no debe entrar al repo ni al traspaso.
- Variables: el auditor no usa secretos propios; solo necesita acceso de lectura al repo (gh o el conector de GitHub).

### (c) Mejoras
- En la fila de cada auditor, poner el commit auditado y el conteo por severidad, no solo "Auditoría entregada".
- Enlazar cada estado de área a sus PRs concretos.
