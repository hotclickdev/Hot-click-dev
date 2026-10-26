# Traspaso — HotClick QA Emprendedor (QA 1)

## Rol
Tester funcional QA 1, cuenta **Emprendedor**. El plan está en `/workspace/hotclick-reportes/plan-qa-funcional-2026-10-23.md`, sección QA 1. No toca código, no hace commit de código, ni merge, ni deploy, ni cambios en AWS.

## En qué quedó (26/10/2026)
- Pruebas funcionales en prod (hotclick.lat) con la cuenta Emprendedor: la parte 1 está hecha. La parte 2 (métodos de cobro, pedidos y POS) quedó en pausa por presupuesto, por orden de Grok Bot.
- Área 2 (Cuentas y Roles): la revisión de código sobre master d552ab88 está hecha. Faltan los casos HTTP contra el staging local (backend :8081, front :3000), que cortó el límite de uso antes de dar resultados.

## Ramas y PRs
No tiene ninguno, porque el rol es solo de QA y no toca código. El único commit es esta nota y su evidencia, en `docs/traspaso-cuenta-nueva`.

## Hallazgos en prod
- **OK:** "Tu Plan" marca el plan actual con "TU PLAN ACTUAL". El reporte anterior no se reproduce.
- **Media:** la categoría "Mascotas" aparece duplicada, y hay además 5 pares de categorías casi duplicadas.
- **Media:** el error de precio sigue en pantalla después de corregir el precio a 1000.
- **Alta/Media (lo decide negocio):** los productos se publican sin revisión, incluso los personalizados.
- **No reproduce:** el asistente de 3 pasos con el nombre del negocio vacío.

## Hallazgos de la revisión de código, área 2 (master d552ab88, falta confirmarlos por HTTP)
- **MEDIO:** EDITOR y LECTOR reciben 200 en estos GET:
  - `/api/billing/suscripcion`
  - `/api/billing/facturas`
  - `/api/billing/tilopay/pendiente`
  - `/api/billing/plan-pendiente`
  - `/api/billing/preferencias`

  Además, GET `/api/metodos-cobro` no tiene ningún chequeo de rol.
- **BAJO:** POST `/api/billing/tilopay/confirmar/{orderNumber}` no exige que sea el dueño.
- **OK en el código:**
  - El login da un mensaje genérico.
  - El correo se normaliza (trim y minúsculas).
  - Los cambios de billing son solo del dueño.
  - LECTOR no puede editar productos y EDITOR sí.

## Productos creados en prod que hay que limpiar
- 663 "PRUEBA QA1 Llavero"
- 664 "PRUEBA QA1 Imán"
- 665 "PRUEBA QA1 Taza grabada"

**No borrar** el 661 ni el 662: son de Andrés.

## Incidente
Las contraseñas de las cuentas de prueba de prod se filtraron en la salida de una shell, porque falló el comando que debía enmascararlas. Se reportó como crítico y se recomendó rotarlas. Esta nota no incluye ningún valor.

## Pendientes y próximos pasos
1. Correr los casos HTTP del área 2 contra el staging local: login, normalización de correo, y EDITOR y LECTOR, uno a la vez porque el plan Emprendedor permite 2 usuarios. Ver `reporte-qa1-roles-2026-10-26.md`.
2. Cuando QA Compra compre el 663, gestionar ese pedido desde el negocio.
3. Probar métodos de cobro con datos ficticios marcados PRUEBA y una venta POS sin dinero.
4. Volver a probar QA1-002 y QA1-004 cuando aterrice el #260.

## Decisiones de Andrés que conozco
- Cero dinero real y ningún cambio de plan. No usar la tarjeta 4242.
- Solo correos `qa1+` y cédulas sintéticas.
- Pedidos de prueba solo contra los negocios "Prueba Andrés", con un comprobante SINPE ficticio marcado PRUEBA.
- Prohibido `pkill -n`: se paran solo los procesos propios, por PID. No tocar los procesos `hotclick-staging-*`.
- Sin deploy, sin servidores nuevos y sin cuentas nuevas.
- ONVO solo en modo test.

## Evidencia
- Resumen en el repo: `docs/traspaso/evidencia/hotclick-qa-emprendedor/` (reportes y bugs QA1-00x en .md).
- Completa en la box: `/workspace/qa-funcional/qa1/`, con las capturas de prod en `evidencia/prod/`. Las credenciales no se suben.
