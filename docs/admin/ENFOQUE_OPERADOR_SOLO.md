# Enfoque de ahora: un operador, control de vendedores

Fecha: 5 de octubre de 2026. Rama: `dashboard-administrador`.

Hoy HotClick lo opera una persona. Esa persona es el administrador de la aplicación. El trabajo es mirar a un vendedor, entender qué hizo, y poder actuar. No es armar un departamento de soporte, finanzas y confianza.

La lista larga de 312 acciones sigue en [PROPUESTA_ADMINISTRADOR.md](./PROPUESTA_ADMINISTRADOR.md). Este archivo es el filtro de la ficha. El corte que sigue, con sanciones, CRM, pedidos por WhatsApp, factura y la quincena, está en [CORTE_CONSOLA_OPERADOR.md](./CORTE_CONSOLA_OPERADOR.md).

## Qué se pide

Desde la ficha de un vendedor:

1. Ver la historia de lo que cambió. Si le cambió el nombre a la tienda, aparece el movimiento con la hora. Al abrirlo se ve qué era antes y qué quedó.
2. Ver el inventario: qué productos tiene y cuánto stock.
3. Ver cuántas visitas tuvo cada producto.
4. Ver si le entró un pedido, a qué hora, abrirlo, y gestionarlo. No alcanza con leerlo.
5. Ver la membresía: cuál plan, si es de pago, y cuándo tiene que pagar.
6. A nivel de toda la plataforma: qué productos se están moviendo.

La ficha tiene que seguir sirviendo si más adelante entra otra persona. El evento guarda el id del negocio. No hace falta, ahora, repartir permisos entre varios operadores.

## Qué ya se puede hacer

La ficha en `/plataforma/negocios` abre la tienda. Ahí se ve el nombre, el estado, el plan, cuántos productos, cuántos pedidos y el total vendido. Se puede cambiar el plan, ocultar el catálogo, activar, suspender o inactivar, y entrar como ese negocio.

| Lo que pediste | Hoy | Dónde está |
|----------------|-----|------------|
| Historia de un cambio, con hora, y el detalle al hacer clic | No | La auditoría existe, pero no anota lo que el vendedor cambia en su tienda. El inicio muestra 8 líneas sueltas, sin abrir el evento ni filtrar por negocio. |
| Inventario: productos y stock | A medias | La ficha lista nombre, categoría, precio y stock. No se abre el producto. No se ve la bodega ni el movimiento de unidades. |
| Visitas de cada producto | No | El embudo cuenta sesiones de toda la plataforma (visita, vio algún producto, carrito, pago). No guarda qué producto ni de qué tienda. |
| Pedido, hora, verlo y gestionarlo | A medias | El API trae los últimos 15, con fecha. La ficha no muestra la hora, no abre las líneas y no deja cambiar el estado. Entrar como el negocio sí lleva al panel donde el vendedor gestiona pedidos. |
| Membresía, si paga, cuándo cobra | A medias | La ficha muestra el nombre del plan y deja cambiarlo. En Dinero se ve nombre, monto y estado. El vencimiento y los cobros fallidos ya vienen en el API y la pantalla no los usa. |
| Qué productos se mueven | No en la consola | Las ventas están en los pedidos, así que unidades e ingresos se pueden calcular. Las visitas, no. El ranking de productos del vendedor vive en una pantalla que el operador no abre. |

## La historia, en concreto

`AuditoriaAdminRegistroService` tiene dos modos. `registrarSiAdmin` escribe solo si quien actúa es el administrador de la plataforma. `registrar` escribe siempre, y hoy se usa en pocas cosas: cambio de estado de un pedido y confirmación manual de un pago.

Cambiar el nombre comercial de la tienda no pasa por ahí. Tampoco un cambio de precio hecho por el vendedor. Por eso un clic en “a las 3:14 cambió el nombre” hoy no tiene de dónde salir.

Lo que sí queda anotado cuando lo hace el administrador: impersonar, invitar o quitar equipo, editar un producto entrando como admin, y el cambio de estado del pedido. Esas filas viven 90 días y después se borran.

Para la historia que se quiere, cada cambio del vendedor tiene que dejar: negocio, qué cosa (tienda, producto, pedido), hora de Costa Rica, quién, valor anterior y valor nuevo. Al hacer clic se lee eso. No hace falta un sistema de auditoría distinto por cada pantalla.

## Visitas y “qué se mueve”

Son dos preguntas distintas.

**Se vende.** Sale de las líneas de pedido: unidades e ingresos, por producto y por tienda, en 7 y 30 días. El dato ya está. Falta la consulta y la pantalla.

**Lo miran.** El embudo no sirve para esto. Una sesión guarda un solo paso y no guarda el id del producto. Contar “vieron un producto” en el inicio es el total de la plataforma, no la ficha de un vendedor. Para visitas por producto hay que registrar una vista con id de producto e id de tienda. Hasta entonces la consola no debe mostrar un cero que parezca real.

En el inicio, al lado del embudo, el ranking útil de ahora es: productos con más unidades, productos con más ingresos, tiendas con más ventas. El embudo se queda como contexto de la plataforma y se rotula como sesiones, no como visitas de un producto.

## Pedidos: leer no alcanza

En la ficha, un pedido se abre y se ve: hora, líneas, comprador, medio de pago, estado, guía. Desde ahí se puede marcar enviado o entregado, poner la guía y, si el pago es SINPE, saltar al comprobante de esa venta.

El endpoint `PUT /api/pedidos/{id}/estado` ya deja hacerlo a un administrador y deja el cambio en auditoría. La consola no lo llama. “Ver como el negocio” es un atajo: cambia la sesión y se entra al panel del vendedor. Sirve para un caso raro. El día a día tiene que resolverse en la ficha, sin salir de la cuenta de administrador.

La ficha hoy corta en 15 pedidos. Para operar alcanza una lista con fecha, y el resto al pedir más. No hace falta el historial completo en la primera pantalla.

## Membresía

En la misma ficha, un bloque de cobro:

- Plan: Emprendedor (₡0, 8%), PYME (₡9.900, 4%) o Negocio Plus (₡24.900, 4%).
- Estado del cobro: al día, por vencer, cobro fallido, sin suscripción.
- Fecha en que vence o en que toca el siguiente cobro (`fechaVencPlan` ya sale en el listado de billing).
- Cuántos cobros fallaron.

Eso ya está en `AdminBillingMapper.filaLista` y en el detalle de suscripción. Dinero muestra tres columnas y esconde el resto. El bloque va en la ficha del vendedor. La lista de Dinero puede seguir existiendo para ver quién está por vencer, sin abrir tienda por tienda.

Cambiar el plan a mano se queda. Es la herramienta del operador cuando el cobro no refleja el acuerdo.

## Qué se construye, en orden

1. **Ficha con historia.** Anotar nombre de tienda, precio, stock, alta y pausa de producto, con antes y después. Lista en la ficha, clic abre el evento.
2. **Pedido abierto y accionable.** Hora, líneas, estado, guía. Botones para avanzar el pedido.
3. **Membresía en la ficha.** Plan, si es de pago, vencimiento, cobros fallidos. Los datos ya están.
4. **Qué se vende.** En la ficha, unidades vendidas de cada producto en 30 días. En el inicio, ranking de productos y de tiendas por unidades e ingresos.
5. **Visitas por producto.** Evento nuevo. Va después del ranking de ventas, porque sin el evento no hay número honesto.

Cada paso se puede usar solo. El 3 no espera al 1.

## Qué queda fuera de este corte

Sigue en la lista larga, para cuando haya más gente o el contador cierre el modelo fiscal:

- Roles de soporte, finanzas y confianza.
- Factura electrónica del vendedor y declaraciones D-104, D-101, D-151.
- Retracto, CRM, compras a proveedores, sucursales, gift cards, copilot del vendedor.
- API de Correos, multi-país, planilla.
- Permisos finos del equipo del vendedor.

Suspender una tienda, aprobar un SINPE y pagar una liquidación ya están en la consola. No se rehacen. Desde el pedido de la ficha se llega al SINPE de esa venta, nada más.
