# QA3 – Producción hotclick.lat – Negocio Plus – 2026-10-24 (CR)
Autorización: Andrés vía Grok Bot 02:29 CR. Alcance recortado (02:30): 2 productos PRUEBA, panel básico, invitación editor. Cuenta andres.prueba+negocioplus@example.com, empresa 73 "Prueba Andrés Negocio Plus". Sin cobro, sin cambio de plan, sin POS.
Evidencia: prod/evidencia-prod-http.log (tokens/contraseñas redactados).

| Caso | Paso | Esperado | Real | Evidencia |
|---|---|---|---|---|
| P1 Login | POST /api/auth/login | 200 | 200, empresaId 73, permisos completos | log 02:30 |
| P2 Plan (/planes) | GET /api/billing/planes | NEGOCIO_PLUS ilimitado, 7% | id 10: ₡28 900/US$19.99, comisión 7% (mín ₡700), usuarios/productos/bodegas/cajas -1, CRM, IA, gift cards, sin API | planes.json |
| P3 Plan en cuenta | GET /api/billing/suscripcion y /api/admin/ai/uso | NEGOCIO_PLUS | suscripcion: SIN_SUSCRIPCION/"FREE"; ai/uso: plan NEGOCIO_PLUS, límite -1 → inconsistente | log 02:30–02:31 |
| P4 Productos | POST /api/productos ×2 (cat 101, bodega 74, stock 5) | 200 | 200: ids 668 (₡500) y 669 (₡700) | log 02:31 |
| P5 Panel | GET /api/admin/dashboard | refleja productos/equipo | totalProductos 2 OK; totalUsuarios 1 con 2 miembros | log 02:31 |
| P6 Invitación | POST /api/empresa/equipo (EDITOR) | 200 y nombre correcto | 200, id 138 EDITOR; nombre guardado "PRUEBA" y apellido "QA3 Editor" (enviado "QA3 Editor Prueba") | log 02:31 |
No probado (recorte): comisión en venta real, reportes avanzados, IA, POS.

## Bugs
Ninguno crítico/alto.
- QA3-P01 Media – Suscripción muestra FREE/SIN_SUSCRIPCION con plan NEGOCIO_PLUS asignado (ai/uso sí dice NEGOCIO_PLUS). Puede deberse a que el plan se asignó directo en BD; verificar qué ve el front en /planes y facturación.
- QA3-P02 Baja – Invitación: el nombre completo se divide al revés (nombre="PRUEBA", apellido="QA3 Editor").
- QA3-P03 Baja – Dashboard totalUsuarios=1 aunque el equipo tiene 2 miembros.
