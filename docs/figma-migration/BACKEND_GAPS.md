# Huecos de backend (P11, 2-oct-2026)

Lista consolidada de los huecos de backend reportados en P01 a P10. Regla de P11: solo se usa lo que ya existe (entidades, columnas, servicios y endpoints). Si el dato existe y solo faltaba exponerlo o cablearlo, se implementó con tests. Lo que pide columnas o tablas nuevas, reglas de negocio nuevas o endpoints públicos nuevos no se implementó: queda abajo con el campo exacto, la pantalla y un contrato propuesto. No se mockea nada dentro de la app.

Estados:
- **IMPLEMENTADO:** cerrado en P11, con el commit.
- **DATO_EXISTE:** el backend ya entrega el dato (o lo tiene en la entidad); falta cablearlo en una pantalla cuya ubicación no está medida sin Figma.
- **REQUIERE_BACKEND:** hace falta columna, tabla o endpoint nuevo.
- **REQUIERE_DECISION:** hace falta una regla de negocio, de diseño o de seguridad que nadie aprobó.

## Implementado en P11

| # | Hueco | Pantalla / nodo | Commit | Qué se hizo |
| --- | --- | --- | --- | --- |
| 1 | Stock y tienda del carrito recuperado | `29:2036` `/recuperar-carrito/:token`; correo `30:1733` | `4b7a71c6` | `GET /api/cart/abandoned/recover/{token}` devuelve en cada item `stock` (`stockActual - stockReservado`, mínimo 0, solo productos activos) y `empresaNombre` (solo emprendimiento visible y distinto de la tienda principal: misma regla que el badge del catálogo, `ProductoCatalogQueries.poblarBadgeEmpresa`). Los dos campos son `READ_ONLY`: el cliente no los puede guardar. El correo arma "Tienda · N unidades · Quedan N" (Quedan N solo con stock de 1 a 5, el tope de `STOCK_ESCASO_MAX`); el detalle comparte `EmailLayoutHelper.detalleUnidades` con el correo de confirmación (salida de confirmación igual). **Bug corregido:** `RecuperarCarritoPage` leía `data.data.items`, pero `api` ya desenvuelve el `ResponseDTO`; con el backend real la página mostraba siempre "Pedido no disponible". |
| 2 | Foto del producto en Mis opiniones | `30:1327` `/perfil?vista=opiniones` | `818764ce` | `GET /api/testimonios/mis-testimonios` agrega `productoImagenUrl` (`Producto.imagenPrincipalUrl`, la misma que ya manda `productos-para-resenar`). Endpoint autenticado y del propio usuario. `CuentaOpiniones` la muestra en la miniatura. |
| 3 | Tienda y categoría en la búsqueda por foto | `27:882` `/buscar/foto` | `88101cf3` | `POST /api/public/shopping-assistant/search-by-image` agrega `categoria` (ya estaba en `ProductoContexto`) y `empresaNombre` (`ProductoCatalogQueries.tiendasVisibles`, misma regla pública del catálogo). El frontend ya los leía. |

## Pendientes

| # | Hueco | Pantalla / nodo | Estado | Dato hoy | Campo o contrato propuesto |
| --- | --- | --- | --- | --- | --- |
| 4 | "Sale de <provincia>" por paquete | `28:989` `/carrito` | DATO_EXISTE | La API pública de productos ya serializa `bodega` completo, con `provincia` y `canton` (`DetallePedidoComprador` ya usa `bodega.provincia`). | Normalizar `bodegaProvincia` en `productService` y pintar la línea donde la pone `28:989` (posición sin medir). No necesita backend. |
| 5 | Envío normal GAM por origen | `29:1248` `/checkout` | REQUIERE_DECISION | Provincia y cantón de la bodega existen; la lista de cantones GAM existe en `ubicacionesCR.ts`. Hoy se decide por el destino. | Decidir origen o destino (B15). Si es origen: misma regla en `CheckoutPaquetesPlanner` y en las tarifas del backend. |
| 6 | **Seguridad:** la bodega completa sale en la API pública de productos | `/productos`, `/productos/:id` | REQUIERE_DECISION | `Producto.bodega` no tiene `@JsonIgnore`: salen `direccionExacta`, `telefono`, `correoContacto`, `encargadoNombre`, `latitud`, `longitud`, horarios y capacidad. | DTO público de bodega: `id`, `nombreBodega`, `provincia`, `canton`, `permiteRetiroCliente`; dirección, horario y teléfono solo si `permiteRetiroCliente`. No se tocó: el retiro en tienda usa la dirección y el teléfono. |
| 7 | `tokenSeguimiento` para "Ver mi pedido" del invitado | `29:1932` `/pago/exito` | REQUIERE_DECISION | `Pedido.tokenSeguimiento` existe. `GET /api/payments/status/{numeroPedido}` es público por número de pedido: agregarlo ahí lo expondría. | Devolverlo solo a quien creó el pago: en `PaymentCheckoutResponse` (como `cancelToken`) o en un estado que exija `cancelToken`. Uno por pedido del `grupoPago`. |
| 8 | "Paquete N de M", forma de entrega y "Tu pago por este paquete" en el despacho | `37:1780` `/emprendedor/pedidos/:id` | N de M y forma de entrega: DATO_EXISTE; pago: REQUIERE_DECISION | `Pedido.grupoPago` (hermanos), `Pedido.metodoEnvio`; comisión en `Empresa.montoFijoComisionCrc` y `SplitPago`. | Exponer N de M y `metodoEnvio` en el detalle del vendedor; decidir qué monto es "Tu pago" (total menos qué comisión). |
| 9 | "Paquete N de M" y "Otros paquetes" en el correo de guía | `30:1643` | DATO_EXISTE | `Pedido.grupoPago` y `PedidoGrupoService` (pedidos hermanos). | El builder recibe los hermanos del grupo ordenados por id; falta el maquetado medido de `30:1643`. |
| 10 | Dirección de entrega en el pedido ("Enviamos a") | `30:1599` correo de confirmación | REQUIERE_BACKEND | La dirección viaja dentro de `Pedido.notas` (texto libre). `metodoEnvio` sí existe. | Columnas `direccion_provincia`, `direccion_canton`, `direccion_senas` en el pedido, llenadas desde el checkout. "Envío normal GAM" depende también del punto 5. |
| 11 | Vencimiento del cupón ("30 días") | correo de cupón (QR, B17) | REQUIERE_DECISION + REQUIERE_BACKEND | `Cupon` no tiene fecha de vencimiento. | Política aprobada y `Cupon.fechaVencimiento` con validación al canjear. |
| 12 | Número de cobro y nombre de caja | `29:1781` `/pos/pago/:token` | REQUIERE_DECISION + REQUIERE_BACKEND | `PosQrSesion` tiene `id` y `pedidoId`; el formato "Cobro #P-3391" no está definido. `TurnoCaja` no tiene nombre de caja. | `GET /api/pos/qr/pago/{token}` con `numeroCobro` y `cajaNombre`, y la columna de nombre de caja. |
| 13 | El cliente elige el método en el QR | `29:1781` | REQUIERE_DECISION | El cajero fija `metodoPago` al crear la sesión. | Regla de producto (B16). |
| 14 | Comprobante o correo del pagador en el QR | QR (B16) | REQUIERE_BACKEND | No se guarda correo del pagador. | Campo de correo opcional en la sesión y envío del comprobante. |
| 15 | Directorio de tiendas públicas | `29:1159` `/emprendimientos` | REQUIERE_BACKEND | `Empresa` tiene `slug`, `logoUrl`, `descripcion`, `categoriaNegocio`, `visibilidadPublica`; solo existen `/api/tienda/{slug}` y `/api/convenios/publicos` (nombre, logo, descripción, sitio). | `GET /api/tiendas/publicas?categoria=`: `[{slug, nombre, logoUrl, descripcion, categoria, ciudad, totalProductos, fotos[3]}]`, solo `visibilidadPublica`, ciudad desde el cantón de la bodega, sin datos de contacto personal. |
| 16 | Días del retiro en tienda | STORE | REQUIERE_BACKEND | `Bodega` tiene `horarioApertura` y `horarioCierre`, no días. | Columna de días de atención en `Bodega`. |
| 17 | "Elaboración" del producto personalizado | `44:1849` | REQUIERE_BACKEND | No hay campo de tiempo de elaboración (`instruccionesPersonalizacion` es otra cosa). | `Producto.tiempoElaboracion` (texto o días). |
| 18 | Guía de tallas | PROD | REQUIERE_BACKEND | Solo `Producto.talla`. | Tabla de medidas por producto o por categoría. |
| 19 | Fotos y motivo de la garantía | `28:1531` | REQUIERE_BACKEND | `SolicitudGarantia`: descripción, producto y pedido; el motivo viaja como prefijo en la descripción. | Columnas `motivo` y `fotosUrls`. |
| 20 | Precio, vigencia y entrega de las cotizaciones de búsqueda | ACC, servicios | REQUIERE_BACKEND | `SolicitudServicio` guarda `presupuesto` y `notasAdmin` (texto). | Campos `precioCotizado`, `vigenteHasta`, `entrega`. |
| 21 | Aceptar cotización | `55:2332` | REQUIERE_BACKEND + REQUIERE_DECISION | No hay endpoint. | `POST /api/cotizaciones/{id}/aceptar` y la regla de qué pasa después. |
| 22 | Listado de encargos del comprador | ACC | REQUIERE_BACKEND | Solo `GET /api/public/encargos/{token}` (uno por token) y el listado del vendedor. | `GET /api/encargos/mis-encargos` autenticado, por usuario. |
| 23 | Encargo: tienda, fecha de cotización, tiempo de producción y envío | `28:1594` `/encargo/:token` | Tienda: DATO_EXISTE; resto: REQUIERE_BACKEND | `EncargoPersonalizado.empresa` existe (no sale en la respuesta por token). No hay fecha de cotización, tiempo de producción ni envío. | Agregar `empresaNombre` a la respuesta por token y ubicarlo según `28:1594`; columnas `fechaCotizacion`, `tiempoProduccion`, `envio`. |
| 24 | Teléfono del vendedor ("Escribirle a la tienda") | `28:1594` | REQUIERE_DECISION | `Empresa.numeroWhatsapp` existe y la vitrina pública ya lo expone; hoy el enlace va al WhatsApp de HotClick. | Decidir si el encargo contacta al vendedor o a HotClick. |
| 25 | Rangos de presupuesto | `28:1486` | REQUIERE_DECISION | Texto libre. | Lista de rangos aprobada. |
| 26 | Blog: categoría, productos por artículo y autor | `54:2126`, `54:2219` | REQUIERE_BACKEND | `BlogEntrada` sin categoría, autor ni productos. | Columnas `categoria`, `autor` y relación con productos; búsqueda de entradas. |
| 27 | "Confiar en este dispositivo" en 2FA | ACC | REQUIERE_DECISION | No existe. | Decisión de seguridad (duración, revocación) antes de cualquier campo. |
| 28 | Fecha del último cambio de contraseña | ACC | REQUIERE_BACKEND | No hay columna (`sesionesInvalidadasEn` no equivale). | `Usuario.contrasenaCambiadaEn`. |
| 29 | Direcciones guardadas | ACC | REQUIERE_BACKEND | No hay tabla. | Tabla de direcciones por usuario y endpoints de la cuenta. |
| 30 | Rango de entrega en pedidos | ACC detalle de pedido | REQUIERE_DECISION | `Pedido.fechaEntregaEstimada` (una fecha). | Regla del rango (o columnas desde/hasta). |
| 31 | Edición de nombre y teléfono en Mi cuenta | ACC | REQUIERE_DECISION (diseño) | Existe `PUT /usuarios/{id}`. | Falta el diseño; no es backend. |
| 32 | Fila "Entendí:" del asistente | `8:230` | REQUIERE_BACKEND | La respuesta del chat no trae los filtros interpretados. | `filtrosInterpretados: [{tipo, valor, etiqueta}]` en la respuesta del asistente. |
| 33 | "Misma categoría" en la búsqueda por foto | `27:882` | REQUIERE_DECISION | Desde P11 llega la categoría del catálogo, pero se compara con la etiqueta de Google Vision (otro vocabulario). | Mapeo de etiquetas de Vision a categorías del catálogo. |
| 34 | Fotos reales, "Quedan N" y badge del carrito en Home | `7:2`, `12:346`, `9:171` | Datos | `imagenPrincipalUrl` y `stock` ya salen en la API; dependen de los datos cargados. | Ninguno de backend. |

## Notas

- Lo implementado se verificó con tests unitarios de backend, una prueba de integración del carrito abandonado (11 casos) y Playwright con la forma real de las respuestas. No se probó contra una base con datos reales.
- `RecuperarCarritoPage` sigue fijando `stock: 99` al restaurar los productos en el carrito; ahora llega el stock real, pero cambiarlo afecta los límites del carrito y queda para P12.
