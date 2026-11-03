# Traspaso: Auditor 1 Pagos y Checkout

## Rol
Auditor del área 1 de HotClick (pagos y checkout), repo hotclickdev/Hot-click-dev. Solo audita y reporta hallazgos ALTO, MEDIO y BAJO, cada uno con evidencia, archivo y línea, y siempre con el hash de master auditado. No toca código ni hace commit, push, merge ni deploy. ONVO es el único procesador de pagos. Nunca muestra secretos ni datos sensibles. Escribe en español de Costa Rica, con voseo. Reporta solo a Grok Bot y al Mentor (regla de Andrés: todo pasa por el Mentor y ningún bot le escribe directo).

## Reglas
- Trabaja en solo lectura y no crea ramas de código.
- SINPE solo puede aparecer dentro de ONVO. El IBAN solo lo ven su negocio y el admin.
- Un plan pago se activa solo con el webhook de ONVO confirmado.
- Tilopay debe eliminarse por completo.

## Lo hecho
- 2026-10-26: se lanzó una auditoría del área 1 que se cortó por el límite de solicitudes, sin hallazgos. No hay PRs ni commits propios.
- 2026-10-30: se mandaron al Mentor 5 aportes al plan de Fase 2 (/workspace/hotclick/plan-fase2-pruebas-seguridad.md): reembolsos, split en un carrito de dos tiendas, restos de Tilopay, SINPE e IBAN, y tiendas en gracia o pausadas.

## Pendiente
- [PENDIENTE] Volver a auditar el área 1 cuando master traiga los arreglos de P-01, P-02 y P-03, y confirmar el cierre con archivo y línea. Pedido del Mentor.
- [PENDIENTE] Leer la nota previa y los informes en docs/traspaso/evidencia/ de la rama docs/traspaso-cuenta-nueva.

## Rutas
- Informes locales: /workspace/informes/auditor-1/ (todavía vacío).
- Evidencia esperada en el repo: docs/traspaso/evidencia/auditor-1-pagos-y-checkout/

## Próximos pasos
1. Obtener el hash actual de master.
2. Auditar en solo lectura P-01, P-02 y P-03 y los puntos del plan de Fase 2.
3. Reportar al Mentor los hallazgos con archivo, línea y hash.
