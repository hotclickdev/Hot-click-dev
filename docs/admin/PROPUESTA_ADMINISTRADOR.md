# Propuesta: qué tiene que poder hacer el administrador

Fecha de la auditoría: 5 de octubre de 2026. Rama: `dashboard-administrador`.

Esto es una propuesta de producto, armada contra el código y los documentos que ya están en el repo. No es asesoría legal ni tributaria. Régimen, factura electrónica y retracto hay que confirmarlos con un contador y un abogado costarricense antes de prometerlos en el panel.

La lista no está inflada a mil filas. Cada fila es una acción que alguien hace, o una obligación que el panel tiene que cubrir. Son 312 acciones. Si más adelante hace falta el desglose de pantalla (cada campo, cada botón), se parte desde estos IDs.

El corte que se está construyendo ahora no es esta lista entera. Es un solo operador de HotClick vigilando vendedores: historial, inventario, pedidos que se pueden tocar, membresía y qué productos se mueven. Ese filtro está en [ENFOQUE_OPERADOR_SOLO.md](./ENFOQUE_OPERADOR_SOLO.md). El resto queda guardado para cuando haya equipo.

## Cómo leer la lista

| Prioridad | Significado |
|-----------|-------------|
| P0 | Sin esto el negocio no puede publicar, vender o cobrar. |
| P1 | El día a día: stock, pedidos, caja, clientes, entrega. Si falta, el dueño se va a Excel o a WhatsApp. |
| P2 | La plata del vendedor: comisión, saldo, retiro, conciliación. |
| P3 | Costa Rica: consumidor, datos personales, Hacienda. |
| P4 | Crecer dentro del plan que ya se vende (PYME y Negocio Plus). |
| P5 | El operador de HotClick. No es el dueño de la tienda. |
| P6 | Después. Existe en algún lado del código o es un trámite que el producto no debe absorber todavía. |

| Hoy | Significado |
|-----|-------------|
| Listo | La persona llega a la pantalla y la acción termina. |
| Parcial | El backend o una pantalla vieja lo hacen, pero el flujo que la persona usa hoy no lo muestra, o la acción queda a medias. |
| Falta | No está. |

**Quién** es quien debe poder hacerlo en este modelo, no quien lo hace por accidente en el código.

## El modelo al que hay que pegar el panel

HotClick es dos negocios en uno, en Costa Rica, en colones enteros.

1. **SaaS para el negocio.** El cliente es la tienda. Planes en la base (brief de landings y migraciones V105 / V115):

   | Plan | Mensualidad | Comisión por venta | Tope que el panel tiene que respetar |
   |------|-------------|--------------------|----------------------------------------|
   | Emprendedor | ₡0 | 8% (mínimo ₡400) | 50 productos, 2 usuarios, 1 bodega, 1 caja. Sin contacto directo al comprador. |
   | PYME | ₡9.900 | 4% | 500 productos, 5 usuarios, 2 bodegas, 2 cajas. Compras, gift cards, contacto directo, IA con cupo. |
   | Negocio Plus | ₡24.900 | 4% | Sin tope de productos, usuarios, bodegas ni cajas. Sucursales, pedidos por local, CRM. |

   Hay textos de marketing y seeders viejos con otra comisión (9%, mínimo ₡600 o ₡700). El panel tiene que leer el plan de la base, no un número escrito en la landing.

2. **Marketplace.** El cliente es la persona que compra en `hotclick.lat` o en `/tienda/:slug`. Paga con tarjeta (Stripe / Tilopay), SINPE o, en caja, efectivo y QR (ONVO). La entrega en la GAM puede ir por recolección de HotClick; afuera, por Correos de Costa Rica o por el propio vendedor. El carrito puede traer productos de varias tiendas: cada dueño ve solo lo suyo.

El dueño entra por `/emprendedor`, `/pyme` o `/negocio-plus`. La caja vive en `/caja` o en el prefijo del plan. El operador de HotClick entra por `/plataforma` con rol `ADMIN`.

### Dos administradores, y no se mezclan

**Dueño del negocio.** Publica, cuida el stock, empaca, cobra en el local, atiende a sus clientes y cumple con su propio régimen ante Hacienda. En Emprendedor el comprador no ve su WhatsApp ni su teléfono: el contacto pasa por HotClick. En PYME y Plus el contacto directo sí se muestra.

**Operador de HotClick.** Aprueba tiendas, ofertas, testimonios y cuentas de cobro. Confirma comprobantes SINPE. Liquida al vendedor ya descontada la comisión. Fija la tarifa de recolección. Modera lo reportado. Factura lo que HotClick cobra (mensualidad y comisión). No opera el inventario de una tienda como si fuera suyo.

Esa separación ya está decidida en el código (`AdminRoleSwitch` saca al vendedor de `/admin` y al `ADMIN` de las rutas de tienda). La propuesta la respeta.

### Decisión que ordena todo el capítulo fiscal

Hoy, al pagarse una compra del marketplace, el tiquete electrónico sale a nombre de la empresa plataforma (`TiqueteCompraListener`). Al mismo tiempo la billetera trata al vendedor como quien vendió y a HotClick como quien cobra comisión.

Eso son dos modelos distintos:

- **HotClick es quien vende al público.** El comprobante al comprador lo emite HotClick. El vendedor es proveedor. Su administrador no emite factura electrónica de esa venta. HotClick le liquida y le entrega un comprobante de esa liquidación. HotClick declara el IVA de la venta.
- **El vendedor es quien vende al público.** El comprobante lo emite el vendedor (factura o tiquete, según pida cédula y según su régimen). HotClick es intermediario: le factura al vendedor la mensualidad y la comisión, y no factura la venta del producto.

Hasta cerrar esa decisión, el panel del dueño no debe prometer “factura electrónica de tus ventas” ni esconder el tema. En la lista, las filas P3 de emisión al comprador quedan marcadas **según modelo**. La fila P0-D01 es cerrar el modelo por escrito.

## Qué hay hoy, en corto

El dueño ya puede, de punta a punta: crear el negocio, publicar productos, ver pedidos y marcarlos enviados o entregados, cotizar encargos, pedir recolección, ver reportes simples, cargar la cuenta de cobro, vincular Telegram, cambiar de plan y cobrar en caja.

Lo que el dueño necesita y **no le aparece** en ese panel, aunque a veces el código ya existe en páginas `Admin*` que nadie monta: billetera y retiros, lista de clientes, guía de Correos con aviso al comprador, promociones, cupones, compras a proveedores, gift cards, garantías, copilot de verdad (Consultas está con una conversación fija), configuración del certificado de Hacienda, y permisos reales del equipo (el JWT del invitado sigue siendo de dueño).

El operador en `/plataforma` ya aprueba o rechaza negocios, ofertas, testimonios y cuentas de cobro; confirma SINPE; aprueba o rechaza liquidaciones; suspende tiendas; impersona; atiende tickets; bloquea IPs y cuentas. Le falta actuar sobre recolecciones y servicios, la cola de productos, el detalle de pagos y webhooks, y editar reglas sin salir a pantallas viejas.

## La lista

Orden: de P0 a P6. Dentro de cada prioridad, por el trabajo del día.

### P0 — Publicar, vender y cobrar

#### Identidad del negocio

| ID | Acción | Quién | Hoy |
|----|--------|-------|-----|
| D01 | Dejar por escrito si el comprobante al comprador lo emite HotClick o el vendedor. Todo P3 de facturas cuelga de esto. | Dueño + HotClick, una sola decisión | Falta |
| D02 | Crear la cuenta del dueño. | Dueño | Listo |
| D03 | Crear el negocio con nombre comercial. | Dueño | Listo |
| D04 | Indicar cédula física o jurídica y consultar si Hacienda reconoce al contribuyente. | Dueño | Listo |
| D05 | Elegir plan y ver precio, comisión y topes de ese plan, leídos de la base. | Dueño | Parcial |
| D06 | Pagar la mensualidad con ONVO cuando el plan no es gratis. | Dueño | Listo |
| D07 | Cargar logo, descripción y datos públicos de la tienda. | Dueño | Listo |
| D08 | Registrar SINPE o IBAN donde quiere recibir las liquidaciones. | Dueño | Listo |
| D09 | Ver si esa cuenta está en revisión, aprobada o rechazada, y el motivo. | Dueño | Parcial |
| D10 | Entrar al panel de su plan y a la caja. | Dueño | Listo |
| D11 | Ver la tienda como la ve un comprador. | Dueño | Parcial |
| D12 | Cambiar de negocio activo si tiene más de uno. | Dueño | Listo |
| D13 | Cerrar sesión y recuperar la cuenta si pierde la contraseña. | Dueño | Listo |

#### Catálogo mínimo

| ID | Acción | Quién | Hoy |
|----|--------|-------|-----|
| D14 | Crear un producto con nombre, precio en colones enteros, foto y stock. | Dueño | Listo |
| D15 | Editar precio, texto, fotos y stock. | Dueño | Listo |
| D16 | Pausar un producto para que deje de ofrecerse. | Dueño | Listo |
| D17 | Eliminar un producto que ya no vende. | Dueño | Listo |
| D18 | Frenar el alta al llegar al tope del plan (50, 500 o sin tope). | Sistema | Listo |
| D19 | Mostrar al comprador el precio final en colones y el costo de envío antes de pagar. | Sistema | Listo |
| D20 | Impedir comprar cuando el stock llega a cero. | Sistema | Listo |
| D21 | Descontar el stock al confirmar la venta, en web y en caja. | Sistema | Listo |
| D22 | Ubicar el producto en la bodega del negocio. | Dueño | Listo |

#### Pedido y caja mínimos

| ID | Acción | Quién | Hoy |
|----|--------|-------|-----|
| D23 | Ver los pedidos de su tienda, con estado. | Dueño | Listo |
| D24 | Abrir el pedido: líneas, totales, entrega y si el pago ya está confirmado. | Dueño | Parcial |
| D25 | Marcar enviado. | Dueño | Listo |
| D26 | Marcar entregado. | Dueño | Listo |
| D27 | Cobrar la compra online con tarjeta. | Comprador, visible para el dueño | Listo |
| D28 | Cobrar la compra online con SINPE y comprobante. | Comprador | Listo |
| D29 | Confirmar o rechazar ese comprobante SINPE antes de que se empque. | Operador HotClick | Listo |
| D30 | Abrir turno y cobrar en mostrador. | Dueño o cajero | Listo |
| D31 | Cobrar en caja con efectivo, SINPE y tarjeta o QR. | Dueño o cajero | Listo |
| D32 | Cerrar el turno y cuadrar la caja. | Dueño o cajero | Listo |
| D33 | Ver las ventas de esa caja. | Dueño o cajero | Listo |
| D34 | Ver solo los pedidos y el stock de su tienda, nunca los de otra. | Sistema | Listo |

### P1 — Operar el día sin otro sistema

#### Inventario

| ID | Acción | Quién | Hoy |
|----|--------|-------|-----|
| D35 | Ver stock actual por producto. | Dueño | Listo |
| D36 | Ver stock por bodega. | Dueño | Parcial |
| D37 | Ajustar stock con motivo: conteo, merma, daño, corrección. El número no se edita a ciegas. | Dueño | Falta |
| D38 | Ver el historial de movimientos de un producto. | Dueño | Falta |
| D39 | Avisar cuando el stock baja de un mínimo que el dueño define. | Dueño | Parcial |
| D40 | Reservar stock mientras el SINPE está pendiente, y soltarlo si se rechaza. | Sistema | Falta |
| D41 | Hacer un conteo físico y registrar la diferencia. | Dueño | Falta |
| D42 | Mover unidades de una bodega a otra, dentro del tope del plan. | Dueño | Falta |
| D43 | Cargar el catálogo por archivo, con vista previa y errores por fila. | Dueño | Parcial |
| D44 | Manejar variantes (talla, color) con stock propio. | Dueño | Parcial |
| D45 | Guardar SKU o código de barras y buscarlo en la caja. | Dueño o cajero | Parcial |
| D46 | Guardar el costo, aparte del precio de venta. | Dueño | Parcial |
| D47 | Tener un producto solo de caja, oculto en el marketplace. | Dueño | Falta |
| D48 | Asignar stock a una sucursal. | Dueño Plus | Parcial |
| D49 | Ver qué se vendió hoy y cuánto quedó. | Dueño | Parcial |
| D50 | Recibir aviso de que alguien quiere un producto agotado. | Dueño | Parcial |

#### Pedidos online

| ID | Acción | Quién | Hoy |
|----|--------|-------|-----|
| D51 | Filtrar pedidos por estado, fecha y canal (web, caja, encargo). | Dueño | Parcial |
| D52 | Buscar un pedido por número o por nombre. | Dueño | Parcial |
| D53 | Ver una comanda para empacar, con lo que va y lo que no. | Dueño | Falta |
| D54 | Poner guía de Correos de Costa Rica y que el comprador reciba el aviso con el rastreo. | Dueño | Parcial |
| D55 | Pedir recolección de HotClick en la GAM. | Dueño | Listo |
| D56 | Ver la tarifa de esa recolección antes de confirmarla. | Dueño | Parcial |
| D57 | Cancelar un pedido que todavía no salió y devolver el stock. | Dueño | Parcial |
| D58 | Anotar una nota interna que el comprador no ve. | Dueño | Falta |
| D59 | Cargar un pedido que llegó por WhatsApp o por teléfono, con link de pago. | Dueño | Parcial |
| D60 | Marcar una línea sin stock y seguir con el resto. | Dueño | Falta |
| D61 | Ver únicamente su parte cuando el carrito traía varias tiendas. | Dueño | Listo |
| D62 | Guardar provincia, cantón y distrito de Costa Rica en la entrega. | Sistema | Listo |
| D63 | Mostrar un plazo de entrega estimado antes de la compra. | Sistema | Parcial |
| D64 | En Emprendedor, ocultar teléfono, correo, redes y WhatsApp del vendedor. El contacto llega a HotClick. | Sistema | Listo |
| D65 | En PYME y Plus, mostrar el contacto directo porque el plan lo permite. | Sistema | Listo |
| D66 | Reenviar al comprador el aviso del estado. | Dueño | Parcial |
| D67 | Ver pedidos atrasados: pagados y todavía sin marcar enviados. | Dueño | Falta |

#### Encargos

| ID | Acción | Quién | Hoy |
|----|--------|-------|-----|
| D68 | Recibir una solicitud de encargo. | Dueño | Listo |
| D69 | Cotizar precio y plazo. | Dueño | Listo |
| D70 | Aprobar o rechazar el encargo. | Dueño | Listo |
| D71 | Enviar el link de pago de esa cotización. | Dueño | Listo |
| D72 | Pasar el encargo pagado a pedido y descontar insumos o stock. | Dueño | Parcial |

#### Clientes, lo mínimo para operar

El CRM completo (puntos, campañas, WhatsApp desde la ficha) es P4 y solo Plus. Aquí está lo que cualquier dueño necesita para no perder la venta.

| ID | Acción | Quién | Hoy |
|----|--------|-------|-----|
| D73 | Ver las personas que le compraron, con nombre y última compra. | Dueño | Parcial |
| D74 | Abrir un cliente y ver sus pedidos en esta tienda. | Dueño | Parcial |
| D75 | Buscar un cliente por nombre o teléfono. | Dueño | Parcial |
| D76 | Crear un cliente en la caja o al cargar un pedido manual. | Dueño o cajero | Parcial |
| D77 | Anotar una nota del cliente (talla, preferencia), visible solo para la tienda. | Dueño | Falta |
| D78 | Impedir ver clientes de otra tienda. | Sistema | Listo |
| D79 | Exportar clientes dejando registro de quién exportó y cuándo. | Dueño | Falta |

#### Caja del día

| ID | Acción | Quién | Hoy |
|----|--------|-------|-----|
| D80 | Aplicar un descuento en la venta de mostrador, con motivo. | Dueño o cajero | Listo |
| D81 | Identificar al cliente en la venta de caja. | Cajero | Listo |
| D82 | Cobrar una venta con dos medios (efectivo + SINPE). | Cajero | Parcial |
| D83 | Anular o devolver una venta de caja del mismo turno y devolver stock. | Dueño | Parcial |
| D84 | Ver efectivo esperado contra efectivo contado. | Dueño | Listo |
| D85 | Abrir una segunda caja solo si el plan la incluye. | Dueño | Parcial |
| D86 | Dejar al cajero en la caja, sin permiso de borrar productos ni ver la billetera. | Dueño | Parcial |
| D87 | Vender sin internet y sincronizar la cola al volver la red. | Cajero | Parcial |
| D88 | Cobro con QR: el cliente escanea y paga. | Cajero | Listo |
| D89 | Imprimir o compartir el comprobante simple de la caja. | Cajero | Parcial |

#### Precios y promociones

| ID | Acción | Quién | Hoy |
|----|--------|-------|-----|
| D90 | Poner un precio de oferta con inicio y fin. | Dueño | Parcial |
| D91 | Ver si HotClick todavía no aprueba esa oferta. | Dueño | Falta |
| D92 | Crear un cupón de su tienda, con tope de usos y vigencia. | Dueño | Falta |
| D93 | Avisar si el precio queda por debajo del costo. | Sistema | Falta |
| D94 | Quitar la oferta y volver al precio normal al vencer. | Sistema | Parcial |
| D95 | El comprador ve un solo precio, el de la oferta, no dos cifras que no cuadran. | Sistema | Parcial |

### P2 — La plata del vendedor

HotClick cobra comisión sobre la venta y, en PYME y Plus, la mensualidad. El envío tiene su propia cuenta. El dueño tiene que poder explicar cada colón sin abrir la base de datos.

| ID | Acción | Quién | Hoy |
|----|--------|-------|-----|
| D96 | Ver el saldo pendiente de liquidar. | Dueño | Parcial |
| D97 | Ver, por venta, bruto, comisión de HotClick, comisión de pasarela y neto. | Dueño | Parcial |
| D98 | Ver qué parte del envío se queda HotClick y qué parte es del negocio. | Dueño | Parcial |
| D99 | Pedir un retiro al SINPE o IBAN ya aprobado. | Dueño | Parcial |
| D100 | Ver retiros pendientes, pagados y rechazados, con fecha y motivo. | Dueño | Parcial |
| D101 | Abrir una venta y llegar al movimiento de billetera que le corresponde. | Dueño | Falta |
| D102 | Exportar los movimientos de un mes. | Dueño | Parcial |
| D103 | Ver la mensualidad cobrada, la próxima fecha y el plan vigente. | Dueño | Parcial |
| D104 | Descargar el comprobante de la mensualidad. | Dueño | Falta |
| D105 | Recibir el comprobante de HotClick por la comisión del periodo. | Dueño | Falta |
| D106 | Ver un SINPE rechazado y no despachar ese pedido. | Dueño | Parcial |
| D107 | Ver un contracargo de tarjeta y el monto retenido. | Dueño | Falta |
| D108 | Gift card: venderla, cobrar con ella y ver el saldo vivo. Solo PYME y Plus. | Dueño | Parcial |
| D109 | El mínimo de comisión de Emprendedor (₡400) se ve en la venta chica, no solo en el contrato. | Dueño | Falta |
| D110 | Conciliar el cierre de caja del día contra las ventas registradas. | Dueño | Parcial |
| D111 | Separar ventas de web y ventas de caja en el mismo reporte de dinero. | Dueño | Parcial |

### P3 — Costa Rica: ley e impuestos

Aviso de nuevo: esto orienta el panel. No reemplaza al contador ni al abogado.

#### Decisión y régimen

| ID | Acción | Quién | Hoy |
|----|--------|-------|-----|
| D112 | Guardar el régimen del negocio: simplificado o tradicional. | Dueño | Parcial |
| D113 | Guardar el código de actividad económica. | Dueño | Parcial |
| D114 | Si el régimen es simplificado, el panel no le exige factura electrónica por cada venta. | Sistema | Falta |
| D115 | Si el régimen es tradicional, el panel no le deja operar el mes sin certificado y sin actividad. | Sistema | Falta |
| D116 | Cada producto tiene CABYS de 13 dígitos. | Dueño | Parcial |
| D117 | Cada producto tiene tarifa de IVA (13% general, tarifas reducidas o exento). | Dueño | Parcial |
| D118 | El precio de vitrina ya incluye IVA. El comprobante desglosa subtotal, IVA y total, en colones enteros, redondeando igual en toda la cadena. | Sistema | Parcial |
| D119 | Validar cédula por tipo: 9 dígitos física, 10 jurídica, guardada como texto. | Sistema | Parcial |

#### Si el vendedor es quien le vende al público (modelo 2)

| ID | Acción | Quién | Hoy |
|----|--------|-------|-----|
| D120 | Subir el certificado .p12 y la clave de Hacienda, cifrados. | Dueño, régimen tradicional | Parcial |
| D121 | Probar la conexión con Hacienda antes de la primera venta del día. | Dueño | Falta |
| D122 | Emitir factura electrónica (tipo 01) cuando el comprador pide factura y da cédula, nombre y correo. | Dueño | Parcial |
| D123 | Emitir tiquete electrónico (tipo 04) cuando no pide factura. | Dueño | Parcial |
| D124 | El comprador marca “quiero factura” en el checkout y en la caja. | Comprador | Parcial |
| D125 | Consecutivo que no se repite ni se reutiliza si la emisión falla. El hueco queda anulado. | Sistema | Listo |
| D126 | Ver si Hacienda aceptó, rechazó o sigue procesando. | Dueño | Parcial |
| D127 | Corregir y reintentar un rechazo sin saltarse el consecutivo. | Dueño | Parcial |
| D128 | Emitir nota de crédito al aceptar un retracto o una devolución. | Dueño | Falta |
| D129 | Emitir nota de débito cuando corresponda un cargo adicional. | Dueño | Falta |
| D130 | Seguir vendiendo si Hacienda no responde, y enviar la cola al volver. | Sistema | Parcial |
| D131 | Enviar el comprobante al correo del receptor. | Sistema | Parcial |
| D132 | En régimen simplificado, registrar las compras del periodo para el tributo sobre compras. | Dueño | Falta |
| D133 | Recordar el cierre trimestral de ese registro de compras. | Sistema | Falta |
| D134 | Esas compras del vendedor son de su empresa, no las de HotClick. | Sistema | Falta |

El backend de factura (XML 4.4, clave de 50 dígitos, consecutivo, CABYS, IVA) ya existe y el flag `facturacion_electronica` nace apagado. El D-105 que hay hoy es de la empresa plataforma, sin pantalla.

#### Si HotClick es quien le vende al público (modelo 1)

| ID | Acción | Quién | Hoy |
|----|--------|-------|-----|
| D135 | HotClick emite el tiquete o la factura al comprador. | Operador, automático | Parcial |
| D136 | El dueño ve el número de ese comprobante en su pedido, sin poder reemitirlo a su nombre. | Dueño | Falta |
| D137 | HotClick le entrega al vendedor un comprobante de liquidación por el neto del periodo. | Operador | Falta |
| D138 | El dueño descarga ese comprobante para su contador. | Dueño | Falta |

#### Lo que el contador pide, sin declarar por él

El panel exporta. No presenta el D-104 ni el D-101 ante Hacienda.

| ID | Acción | Quién | Hoy |
|----|--------|-------|-----|
| D139 | Reporte del periodo: ventas, costo, ganancia, IVA cobrado o estimado. | Dueño | Parcial |
| D140 | Esos números respetan el filtro de fechas que el dueño eligió. | Sistema | Parcial |
| D141 | CSV del periodo para el contador. | Dueño | Parcial |
| D142 | Conservar pedidos y comprobantes cinco años aunque la persona cierre la cuenta. | Sistema | Listo |
| D143 | Al cerrar la cuenta, anonimizar el contacto y dejar el historial fiscal. | Sistema | Listo |
| D144 | Paquete mensual: ventas, comisiones pagadas a HotClick, retiros, notas de crédito. | Dueño | Falta |
| D145 | Si el negocio retiene (alquiler o servicios profesionales), exportar la base de esa retención. No es el día a día del emprendedor. | Dueño | Falta |

#### Consumidor, Ley 7472

| ID | Acción | Quién | Hoy |
|----|--------|-------|-----|
| D146 | Mostrar devoluciones y garantía antes de pagar, en el checkout. | Sistema | Listo |
| D147 | El texto no puede ser más duro que la ley: el retracto en venta a distancia ronda los 8 días hábiles, con excepciones (perecedero, personalizado, higiene). | Sistema | Parcial |
| D148 | Registrar una solicitud de retracto con el pedido y la fecha. | Comprador, la ve el dueño | Falta |
| D149 | Aceptar, rechazar con motivo, o pedir más datos. | Dueño | Falta |
| D150 | Si se acepta, devolver el dinero por el mismo medio y reponer el stock si el producto vuelve. | Dueño + HotClick en el pago | Falta |
| D151 | Registrar una garantía por defecto, con fotos. | Comprador | Parcial |
| D152 | Atender esa garantía: reparar, cambiar o devolver, con estados. | Dueño | Parcial |
| D153 | Definir los días de garantía del producto. Si no se define, aplica el mínimo legal. | Dueño | Parcial |
| D154 | Tratar foto y descripción como promesa: si el producto no coincide, el reclamo procede. | Dueño + operador si lo reportan | Parcial |
| D155 | Publicar quién vende: en contacto directo, nombre y cédula del negocio; en Emprendedor, el canal es HotClick. | Sistema | Parcial |
| D156 | Guardar plazo de entrega estimado y cumplirlo o avisar el atraso. | Dueño | Falta |
| D157 | Responder el reclamo en el panel antes de que escale a la Comisión Nacional del Consumidor. | Dueño, y HotClick si el contacto es de Emprendedor | Parcial |

#### Datos personales, Ley 8968

El dueño es responsable de los datos de sus clientes. HotClick tiene que aislar tiendas y decirlo en los términos.

| ID | Acción | Quién | Hoy |
|----|--------|-------|-----|
| D158 | Al registrarse, la persona acepta un texto que dice qué datos se piden y para qué. | Sistema | Listo |
| D159 | Guardar qué versión aceptó, y la fecha. La versión guardada tiene que ser la del texto publicado. | Sistema | Parcial |
| D160 | Pedir de nuevo la aceptación cuando el texto cambia. | Sistema | Falta |
| D161 | El comprador exporta sus datos. | Comprador | Listo |
| D162 | El comprador pide corrección. Hay un canal, aunque la corrección de perfil la haga él mismo. | Comprador + soporte | Parcial |
| D163 | El comprador cierra la cuenta. Se anonimiza el contacto. | Comprador | Listo |
| D164 | El dueño no descarga toda la base de clientes sin que quede auditoría. | Sistema | Falta |
| D165 | Retención: auditoría de admin 90 días, carritos abandonados 30 días, chats y cola fiscal con plazo definido. | Sistema | Listo |
| D166 | El chat de la tienda y el copilot cuentan como datos personales. | Sistema | Parcial |
| D167 | No usar datos de producción para probar. Queda como regla de operación, no como un botón. | Equipo HotClick | Listo |
| D168 | Decir en los términos que cada tienda responde por sus clientes y HotClick no los mezcla. | HotClick | Parcial |
| D169 | Inscripción ante la PRODHAB, si el abogado la confirma como pendiente. | HotClick | Falta |

#### Otros deberes del país que el panel solo recuerda

| ID | Acción | Quién | Hoy |
|----|--------|-------|-----|
| D170 | Recordar que un local físico necesita patente municipal. El sistema no la tramita. | Dueño | Falta |
| D171 | Recordar CCSS e INS si hay personas empleadas. El sistema no lleva planilla. | Dueño | Falta |
| D172 | Identidad legal de HotClick en el sitio: razón social, cédula y domicilio. Hoy el expediente está incompleto. | HotClick | Parcial |
| D173 | Términos y privacidad enlazados en el pie y aceptados en el registro y en el checkout. | Sistema | Listo |
| D174 | Precios y liquidaciones siempre en colones, formato de Costa Rica, sin decimales. | Sistema | Listo |
| D175 | Envíos: el comprador ve el costo y el plazo antes de pagar. | Sistema | Parcial |

### P4 — Crecer dentro del plan que ya se vende

#### Equipo, desde PYME

| ID | Acción | Quién | Hoy |
|----|--------|-------|-----|
| D176 | Invitar personas hasta el tope del plan (2, 5 o sin tope). | Dueño | Listo |
| D177 | Asignar editor: publica y atiende pedidos, no toca plan ni retiros. | Dueño | Parcial |
| D178 | Asignar lector: ve, no cambia. | Dueño | Parcial |
| D179 | Asignar cajero: solo caja. | Dueño | Parcial |
| D180 | Esos permisos tienen que cumplirse en el servidor, no solo esconder el menú. | Sistema | Parcial |
| D181 | Quitar a alguien y cortar su acceso al momento. | Dueño | Listo |
| D182 | Ver quién hizo un cambio de precio, stock o retiro. | Dueño | Parcial |
| D183 | El dueño no puede quitarse el último propietario. | Sistema | Parcial |

#### PYME: compras, regalos, contacto, IA

| ID | Acción | Quién | Hoy |
|----|--------|-------|-----|
| D184 | Registrar un proveedor con cédula y condición de IVA. | Dueño PYME o Plus | Parcial |
| D185 | Hacer una orden de compra. | Dueño | Parcial |
| D186 | Recibir la mercadería y meterla al stock al costo de esa compra. | Dueño | Parcial |
| D187 | Adjuntar el XML de la compra del proveedor. | Dueño | Falta |
| D188 | Emitir y cobrar gift cards. | Dueño | Parcial |
| D189 | Ver el contacto directo publicado en la ficha (WhatsApp, redes, teléfono, web). | Dueño | Listo |
| D190 | Usar el copilot con los datos de su tienda, con cupo de créditos. | Dueño | Parcial |
| D191 | Pedir una descripción o una respuesta de cliente y publicarla solo si el dueño la acepta. | Dueño | Parcial |
| D192 | Ver reportes de verdad por hoy, semana y mes. | Dueño | Parcial |
| D193 | Ver productos por vencerse en stock o por quedarse sin rotación. | Dueño | Parcial |
| D194 | Blog o novedades de la tienda, si se mantiene el módulo. | Dueño | Parcial |

#### Negocio Plus: sucursales y clientes

| ID | Acción | Quién | Hoy |
|----|--------|-------|-----|
| D195 | Crear, renombrar y pausar sucursales. | Dueño Plus | Listo |
| D196 | Ver pedidos por sucursal. | Dueño Plus | Parcial |
| D197 | Ver stock por sucursal. | Dueño Plus | Parcial |
| D198 | Trasladar stock entre sucursales. | Dueño Plus | Falta |
| D199 | Ficha de cliente con historial de compras. | Dueño Plus | Parcial |
| D200 | Escribirle por WhatsApp desde esa ficha, con el número del plan que sí tiene contacto directo. | Dueño Plus | Parcial |
| D201 | Puntos o beneficio de recompra, con regla visible. | Dueño Plus | Parcial |
| D202 | Comparar ventas entre sucursales. | Dueño Plus | Falta |
| D203 | Créditos de IA sin tope de plan. | Dueño Plus | Parcial |
| D204 | Operar sin tope de productos, usuarios, bodegas ni cajas. | Dueño Plus | Listo |

#### Emprendedor: el plan gratis tiene que sentirse honesto

| ID | Acción | Quién | Hoy |
|----|--------|-------|-----|
| D205 | Al llegar a 50 productos, explicar el tope y el camino a PYME. | Dueño | Parcial |
| D206 | No mostrar compras, CRM, gift cards ni contacto directo como si ya los tuviera. | Sistema | Parcial |
| D207 | Mostrar en cada venta el 8% y el mínimo de ₡400. | Dueño | Falta |
| D208 | Si el cupo de negocios gratis se llena, el alta deja de prometer ₡0 y ofrece PYME. | Sistema | Parcial |
| D209 | Caja disponible también en este plan, alineado en base, copia y pantalla. Hoy la base dice que no y la caja sí abre. | Sistema | Parcial |

### P5 — Operador de HotClick

Esto no se construye dentro del panel del dueño. Vive en `/plataforma`.

#### Tiendas

| ID | Acción | Quién | Hoy |
|----|--------|-------|-----|
| D210 | Buscar una tienda por nombre, cédula o dueño. | Operador | Listo |
| D211 | Ver ficha: plan, estado, productos, pedidos, equipo. | Operador | Listo |
| D212 | Activar, suspender o inactivar la tienda, con motivo. | Operador | Listo |
| D213 | Cambiar el plan. | Operador | Listo |
| D214 | Prender o apagar la visibilidad en el marketplace. | Operador | Listo |
| D215 | Entrar como la tienda para soporte, dejando rastro. | Operador | Listo |
| D216 | Invitar o quitar gente del equipo desde la ficha, cuando soporte tiene que destrabar. | Operador | Falta |
| D217 | Ver tiendas sin ubicación. | Operador | Falta |

#### Revisión

| ID | Acción | Quién | Hoy |
|----|--------|-------|-----|
| D218 | Aprobar o rechazar un negocio nuevo. | Operador | Listo |
| D219 | Aprobar o rechazar una oferta. | Operador | Listo |
| D220 | Aprobar o rechazar una cuenta de cobro. | Operador | Listo |
| D221 | Aprobar o rechazar un testimonio. | Operador | Listo |
| D222 | Aprobar o rechazar un producto en cola. | Operador | Falta |
| D223 | Resolver un reporte de producto. Poder pausarlo, no solo marcarlo resuelto. | Operador | Parcial |
| D224 | Ver el conteo de pendientes en el menú. | Operador | Listo |

#### Dinero de la plataforma

| ID | Acción | Quién | Hoy |
|----|--------|-------|-----|
| D225 | Ver comprobantes SINPE pendientes. | Operador | Listo |
| D226 | Aprobar o rechazar un comprobante, con motivo. | Operador | Listo |
| D227 | Ver liquidaciones pedidas por las tiendas. | Operador | Listo |
| D228 | Aprobar o rechazar una liquidación y registrar el pago. | Operador | Listo |
| D229 | Ver suscripciones: al día, morosas, canceladas. | Operador | Parcial |
| D230 | Abrir el detalle de cobro de una tienda. | Operador | Falta |
| D231 | Ver pagos, KPIs y webhooks fallidos. | Operador | Falta |
| D232 | Ver y cambiar la comisión de pasarela. | Operador | Parcial |
| D233 | Emitir el comprobante de HotClick por mensualidad. | Operador | Falta |
| D234 | Emitir el comprobante de HotClick por comisión del periodo. | Operador | Falta |
| D235 | Cuadrar el día: cobrado a compradores, comisión, neto por liquidar, SINPE todavía en revisión. | Operador | Falta |

#### Campo

| ID | Acción | Quién | Hoy |
|----|--------|-------|-----|
| D236 | Ver recolecciones pedidas. | Operador | Listo |
| D237 | Poner tarifa, aceptar, rechazar o cancelar una recolección. | Operador | Parcial |
| D238 | Ver servicios de campo y cambiarles el estado. | Operador | Parcial |
| D239 | Atender tickets de soporte: asignar y resolver. | Operador | Listo |

#### Acceso, reglas e IA

| ID | Acción | Quién | Hoy |
|----|--------|-------|-----|
| D240 | Ver alertas de seguridad y cerrarlas. | Operador | Listo |
| D241 | Bloquear y desbloquear una IP. | Operador | Listo |
| D242 | Bloquear y desbloquear una cuenta. | Operador | Listo |
| D243 | Ver sesiones y eventos. | Operador | Parcial |
| D244 | Exportar eventos cuando hay un incidente. | Operador | Falta |
| D245 | Dar de alta operadores con permiso distinto: soporte, finanzas, confianza. Hoy la consola solo abre con `ADMIN`. | Operador | Falta |
| D246 | Ver los planes y la comisión vigente. | Operador | Listo |
| D247 | Editar un flag global con registro de quién lo cambió. | Operador | Parcial |
| D248 | Apagar el chat público de una tienda. | Operador | Listo |
| D249 | Ver costo y uso de IA por tienda. | Operador | Listo |
| D250 | Ver el embudo de 7 y 30 días y bajar al detalle. | Operador | Parcial |
| D251 | Registrar compras D-105 de HotClick como empresa, con pantalla. | Operador | Parcial |

### P6 — Después, a propósito

No entran al próximo corte. Varias ya tienen código suelto.

| ID | Acción | Quién | Hoy |
|----|--------|-------|-----|
| D252 | Presentar el D-104 mensual dentro del sistema. | Fuera | Falta |
| D253 | Presentar el D-101 anual dentro del sistema. | Fuera | Falta |
| D254 | Presentar el D-151 dentro del sistema. | Fuera | Falta |
| D255 | Generar la guía con la API de Correos de Costa Rica. Hoy la guía se escribe a mano. | Después | Falta |
| D256 | Facturación electrónica de otro país. | Después | Falta |
| D257 | Planilla, CCSS e INS. | Fuera | Falta |
| D258 | Trámite de patente municipal. | Fuera | Falta |
| D259 | Contabilidad de partida doble. | Después | Falta |
| D260 | API pública para que el negocio conecte otro sistema. El flag existe y está apagado en los tres planes. | Después | Falta |
| D261 | Mesas y QR de restaurante. Hay endpoints; no es el marketplace. | Después | Parcial |
| D262 | Plugins de terceros. | Después | Parcial |
| D263 | Multi-país de verdad (impuesto, dirección, envío). Hoy el checkout es Costa Rica. | Después | Parcial |
| D264 | Campañas de correo y carrito abandonado operadas por el dueño. | Después | Parcial |
| D265 | Publicidad pagada dentro del marketplace, con métricas para el dueño. | Después | Parcial |
| D266 | Pronóstico de compra con IA. | Después | Parcial |
| D267 | Programa de afiliados. | Fuera | Falta |
| D268 | Facturación a crédito y cuentas por cobrar entre empresas. | Después | Falta |
| D269 | Lotes, vencimientos y pesables de supermercado. | Después | Falta |
| D270 | Integración contable (archivo para el software del contador, más allá del CSV). | Después | Falta |

## Lo que el comprador hace y el administrador tiene que ver

No son pantallas del dueño. Si fallan, el dueño no puede cumplir P0.

| ID | Acción | Quién | Hoy |
|----|--------|-------|-----|
| D271 | Comprar sin cuenta. | Comprador | Listo |
| D272 | Comprar con cuenta. | Comprador | Listo |
| D273 | Armar un carrito de varias tiendas y pagar una vez. | Comprador | Listo |
| D274 | Subir el comprobante SINPE. | Comprador | Listo |
| D275 | Seguir el pedido y la guía. | Comprador | Parcial |
| D276 | Pedir factura con cédula. | Comprador | Parcial |
| D277 | Pedir retracto o garantía desde el pedido. | Comprador | Parcial |
| D278 | Aceptar términos en el checkout, con versión guardada. | Comprador | Parcial |
| D279 | Hablar con HotClick cuando el vendedor es Emprendedor. | Comprador | Listo |
| D280 | Hablar con la tienda cuando el plan tiene contacto directo. | Comprador | Listo |
| D281 | Reportar un producto que no coincide con la publicación. | Comprador | Parcial |
| D282 | Recibir el correo de confirmación, de guía y de estado. | Comprador | Listo |

## Seguimiento: el hilo que ata pedido, plata y reclamo

El dueño pidió seguimiento. En este modelo es una sola línea de tiempo por venta, no tres pantallas sueltas.

| ID | Acción | Quién | Hoy |
|----|--------|-------|-----|
| D283 | Ver en el pedido: creado, pagado, confirmado, empacado, recolectado o con guía, entregado. | Dueño | Parcial |
| D284 | Ver en la misma línea el movimiento de dinero: bruto, comisión, neto, liquidado o todavía pendiente. | Dueño | Falta |
| D285 | Ver en la misma línea el reclamo, si existe, y si frenó la liquidación. | Dueño | Falta |
| D286 | El comprador ve la parte pública de esa línea (pago, envío, entrega), sin notas internas ni comisión. | Comprador | Parcial |
| D287 | Un pedido pagado que nadie toca en X horas aparece en el inicio del dueño. | Dueño | Falta |
| D288 | Un SINPE pendiente de más de X horas aparece en la consola de HotClick. | Operador | Parcial |
| D289 | Una liquidación pedida y no pagada aparece en la consola. | Operador | Parcial |
| D290 | El inicio del dueño muestra tres números: por empacar, por cobrar, stock bajo. Nada más en la primera pantalla. | Dueño | Parcial |

## Control que evita el fraude y el error

| ID | Acción | Quién | Hoy |
|----|--------|-------|-----|
| D291 | Dos personas no pisan el mismo stock a la vez. Si choca, se reintenta. | Sistema | Listo |
| D292 | Un retiro no sale a una cuenta que todavía no está aprobada. | Sistema | Parcial |
| D293 | Un pedido no se marca enviado si el pago no está confirmado. | Sistema | Falta |
| D294 | La impersonación queda en auditoría. | Sistema | Parcial |
| D295 | Cambios de plan, precio y estado de tienda quedan en auditoría. | Sistema | Parcial |
| D296 | El operador de finanzas no aprueba su propia liquidación si es la misma persona que la pidió. En la práctica el que pide es el dueño; la regla es: quien aprueba el SINPE no es el vendedor. | Sistema | Listo |
| D297 | Límites del plan se aplican en el servidor. | Sistema | Listo |
| D298 | El chat de IA pasa por la lista de contenido prohibido antes de llamar al modelo. | Sistema | Listo |
| D299 | Sesión con JWT y refresh. El panel no se queda abierto para siempre. | Sistema | Listo |
| D300 | Segunda verificación para el dueño que mueve retiros. | Dueño | Parcial |

## Huecos de copia y de menú que confunden al administrador

Estos no son features nuevas. Son mentiras chicas que hay que alinear antes de construir encima.

| ID | Acción | Quién | Hoy |
|----|--------|-------|-----|
| D301 | Landing, base y panel muestran la misma comisión y los mismos topes. | Sistema | Parcial |
| D302 | El menú del dueño solo ofrece rutas que existen en su plan. | Sistema | Parcial |
| D303 | Consultas con Hot llama al copilot real, o no se muestra. | Sistema | Parcial |
| D304 | “Seguir tienda” no lleva a una página de próximamente. | Sistema | Parcial |
| D305 | Reportes: el filtro de periodo cambia los números. | Sistema | Parcial |
| D306 | La base y la caja coinciden en si Emprendedor tiene POS. | Sistema | Parcial |
| D307 | Trial y planes viejos (`PRO`, `FREE`) no degradan a un plan que ya no existe. | Sistema | Parcial |
| D308 | La versión de términos guardada coincide con la publicada. | Sistema | Parcial |
| D309 | Staff de soporte, finanzas y confianza entra a `/plataforma` con su permiso, no solo el rol `ADMIN`. | Operador | Falta |
| D310 | Pantallas `Admin*` que nadie monta se cablean al panel del plan o se retiran, para no mantener dos productos. | Sistema | Parcial |
| D311 | El dueño ve el estado de su cuenta de cobro sin escribirle a soporte. | Dueño | Parcial |
| D312 | Un pedido manual, una guía y una garantía se hacen en el mismo panel donde ya ve los pedidos. | Dueño | Parcial |

## Conteos

| Prioridad | Filas | Listo | Parcial | Falta |
|-----------|------:|------:|--------:|------:|
| P0 | 34 | 29 | 4 | 1 |
| P1 | 61 | 15 | 31 | 15 |
| P2 | 16 | 0 | 11 | 5 |
| P3 | 64 | 11 | 31 | 22 |
| P4 | 34 | 5 | 25 | 4 |
| P5 | 42 | 23 | 9 | 10 |
| P6 | 19 | 0 | 6 | 13 |
| Transversal (D271–D312) | 42 | 12 | 25 | 5 |
| **Total** | **312** | **95** | **142** | **75** |

P3 está contado entero, incluidos los dos modelos fiscales. Al cerrar D01, una de las dos familias (D120–D134 o D135–D138) pasa a “no aplica” y baja el faltante real.

## Por dónde aplicarlo después

Orden sugerido. Cada corte se puede ver en el panel, no solo en el código.

1. **Cerrar D01** con contador: quién emite el comprobante al comprador. Sin eso, no se construye factura del dueño.
2. **Una sola línea de tiempo de la venta** (D24, D283, D284, D293): pagado o no, empacado o no, plata pendiente o no. Es el seguimiento que hoy está partido.
3. **Cablear lo que ya existe** al panel del plan y borrar el camino muerto: billetera y retiros (D96–D102), clientes (D73–D76), guía y aviso (D54), garantías (D151–D152), promociones (D90), copilot real o quitar el mock (D190, D303), filtros de reportes (D140, D305).
4. **Permisos de verdad** para cajero, editor y lector (D86, D177–D180). Hoy invitar gente no alcanza.
5. **Costa Rica en el panel del dueño**, ya con D01 cerrado: régimen, CABYS, IVA, y solo el flujo que corresponda. Export del contador (D139–D144) antes que presentar declaraciones.
6. **Retracto** (D148–D150). La política ya está publicada; el pedido no tiene cómo cumplirla.
7. **Consola**: cola de productos (D222), recolecciones con acciones (D237), cuadre del día (D235), comprobante de comisión y de mensualidad (D233–D234).

Lo que no entra en esos siete cortes está en P4 fino (sucursales ya empezadas, CRM Plus) o en P6.

## Fuentes de la auditoría

- Panel del dueño: rutas de `/emprendedor`, `/pyme`, `/negocio-plus` y caja. Páginas `Admin*` bajo `frontend/src/pages/admin/` en su mayoría no están montadas para ese flujo.
- Consola: `frontend/src/pages/plataforma/`.
- Planes: `Plan.java`, migraciones de planes, `docs/ideas/landings-negocios.md`.
- Fiscal: `FacturaController`, `XmlFacturaBuilder`, `ConsecutivoFiscalService`, `CompraD105Controller`, flag en `V32__feature_flags.sql`.
- Privacidad y consumidor: páginas de privacidad y devoluciones, `CuentaTitularService`, `ConsentimientoLog`, `SolicitudGarantiaController`.
- Contacto por plan: `ContactoPublicoPolicy`.
