# PLAN DE LANZAMIENTO HOTCLICK: LISTO PARA PRIMEROS CLIENTES
Aprobado por Andrés 25-oct 1:35 CR ("listo creo ya puede iniciar"; vía Mentor).

OBJETIVO: lista cuando se cumplen y se demuestran con evidencia (prueba automática, captura o log) los 6 criterios. Lo que no aporte a ninguno queda para post-lanzamiento.
- C1 FLUJOS: registro/login con 2FA, bodega y producto publicado, compra invitado y usuario con envío y retiro, tarjeta y SINPE vía ONVO, webhook confirma, descuento de stock, pedido en panel y despacho.
- C2 LOS ERRORES NO VUELVEN: cada bug arreglado trae prueba que lo reproduce; CI bloquea el merge si falla.
- C3 SIN COBROS DE PRUEBA EN PROD: no arranca sin onvo_live_ y exige mode live en cada cobro.
- C4 DATOS PRIVADOS: comprobantes privados con enlace firmado y front mostrándolos; logs sin PII; sin secretos en código.
- C5 ROLES: pruebas automáticas de permisos (dueño, admin, EDITOR, cajero, comprador).
- C6 DETECTAR Y VOLVER ATRÁS: monitoreo y alertas de fallos de pago/webhook ONVO, backup diario, vuelta atrás probada en staging.

FASE 1 ENCONTRAR (solo lectura): Auditor 2 Cuentas y Roles, Auditor 3 Marketplace, Auditor 10 Infraestructura, Auditor 4 POS sobre master actual (Chatbots, Hacienda y Telegram pausados); TEST Usuario consumidor usa la app como comprador desde el celular; lectura de logs de prod en Lightsail (500 más frecuentes); casos raros en staging (pago rechazado, webhook duplicado, dos compras del último producto, sesión vencida en checkout). Hallazgos en /workspace/hotclick-reportes/auditoria/ con severidad ALTO/MEDIO/BAJO y criterio afectado.
FASE 2 CORREGIR: ALTO y lo que impida un criterio van a Dev Pagos o Dev Marketplace en PRs chicos que no se pisen, cada uno con prueba. Pendientes: front de comprobantes con enlace firmado y PR SINPE con número de ONVO (Dev Pagos). MEDIO y BAJO a /workspace/hotclick-reportes/post-lanzamiento.md.
FASE 3 BLINDAR: Playwright e2e de C1 y C5 en CI; monitoreo, alertas, backup y vuelta atrás; staging igual a prod; Dependabot y escaneo de secretos; carga 50-100 usuarios; botón reportar problema; interruptores; onboarding y ayuda; borradores legales (texto final lo aprueba Andrés).
FASE 4 VERIFICAR: QA Flujos en staging con ONVO de prueba arma tabla de los 6 criterios PASA/FALLA con evidencia. Si falla, vuelve a Fase 2. Se repite antes de cada deploy.
FASE 5 LANZAR (solo con Andrés): llave live ONVO, script S3, deploy con punto de retorno, compra real de monto bajo, piloto 3-5 negocios (Grok Bot prepara checklist y formulario; Andrés decide a quién).

REGLAS: nada terminado sin evidencia. Máx 2-3 PRs abiertos por bot, ningún frente nuevo fuera del plan. Merges a master con CI verde y APTO de Seguridad aprobados (1:26). NO aprobado: deploy, script S3, gastos, cuentas nuevas, borrar datos, texto legal, piloto. Mantener estado-lanzamiento.md y avisar en cada hito.
