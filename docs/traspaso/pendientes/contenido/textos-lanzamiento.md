# Textos de lanzamiento: copy final de los textos PROV

Fuente: textos marcados `PROV` en `/workspace/diseno/registro-empresa/`, `/workspace/diseno/checkout/` y `/workspace/diseno/bodega/` (archivos HTML generados en `src/`; no se editaron). Cuando un mismo texto se repite en varias pantallas, va en una sola fila con todas sus ubicaciones. «Clave» indica una clave que ya existe en `textos-planes-final.md`; «nueva:» es una clave propuesta.

Reglas aplicadas: voseo de Costa Rica; las tiendas Emprendedor no muestran contacto directo; no se prometen funciones que no existen; el efectivo queda en redacción neutral hasta que se decida; montos faltantes como [MONTO].

## 1. registro-empresa (7 textos)

| Archivo:línea | Texto PROV | Texto final | Clave |
|---|---|---|---|
| b1.html:18, b1.html:30, b2.html:18, b2.html:30, b2.html:54 | Mínimo 8 caracteres. | Mínimo 8 caracteres. | nueva: `registro.password.ayuda` |
| b1.html:23, b1.html:35, b2.html:23, b2.html:35, b2.html:47, b2.html:59 | Al crear tu cuenta aceptás los Términos y la Política de Privacidad. | Al crear tu cuenta aceptás los {{terminos}} y la {{privacidad}}. | nueva: `registro.legal.aceptacion` (enlaces: Términos y condiciones, Política de privacidad) |
| b1.html:29, b2.html:29 | Ese correo ya tiene una cuenta en HotClick. | Ese correo ya tiene una cuenta en HotClick. | nueva: `registro.correo.existe` |
| b1.html:29, b2.html:29 | Si es tuyo, ingresá y creá tu negocio desde tu cuenta. | Si es tuyo, iniciá sesión y creá tu negocio desde ahí. | nueva: `registro.correo.existeAyuda` |
| b2.html:37 | Revisá 3 campos para crear tu cuenta. | Revisá {{count}} campo para crear tu cuenta. / Revisá {{count}} campos para crear tu cuenta. | nueva: `registro.error.resumen` (singular/plural; el «3» era de ejemplo) |
| b2.html:40 | Escribí tu nombre completo. | Escribí tu nombre completo. | nueva: `registro.nombre.error` |
| b2.html:42 | Usá al menos 8 caracteres. | La contraseña necesita al menos 8 caracteres. | nueva: `registro.password.error` |

Nota (16/10): se **elimina** el campo cédula del registro de **negocio**. No quedan etiqueta, ayuda ni mensaje de error de cédula en ese formulario. El registro de **comprador** mantiene la cédula con su mensaje genérico. La cédula del pagador en checkout ONVO y el KYC de ONVO no cambian.

## 2. checkout (11 textos)

| Archivo:línea | Texto PROV | Texto final | Clave |
|---|---|---|---|
| l1.html:60, l2.html:57, l4.html:56 | Podés comprar sin cuenta. ¿Ya tenés una? Ingresá y seguís acá mismo. | Podés comprar sin cuenta. ¿Ya tenés una? Iniciá sesión y seguís desde aquí. | nueva: `checkout.invitado.ayuda` |
| l1.html:68 | El pago se hace en Tilopay. | Pagás con ONVO a nombre de {tienda}, de forma segura. | nueva: `checkout.pago.onvo` (antes `checkout.pago.tilopay`; corregido 16/10/2026) |
| l2.html:65, l4.html:65, l4.html:75 | Te vamos a llevar a Tilopay para pagar de forma segura. | Te vamos a llevar a ONVO para que pagués de forma segura a nombre de {tienda}. | nueva: `checkout.pago.redireccion` |
| l3.html:72 | 3 distritos en Escazú · la lista se filtra mientras escribís. | {{count}} distrito en {{canton}} / {{count}} distritos en {{canton}} · La lista se filtra mientras escribís. | nueva: `checkout.direccion.distritosFiltro` |
| l4.html:57 | Revisá el correo: parece que falta algo después de la @. | Revisá el correo: parece que falta algo después de la @. | nueva: `checkout.correo.errorDominio` |
| l4.html:57 | El número tiene que tener 8 dígitos. | Ingresá un número válido (8 dígitos) | `checkout.phoneInvalid` (= `bodega.telefono.errorInvalido`) |
| l4.html:58 | Comprás como correo@ejemplo.com. Tus datos ya están completos. | Comprás como {{correo}}. Tus datos ya están completos. | nueva: `checkout.sesion.resumen` |
| l4.html:69 | (pantalla de redirección) No cierres esta ventana. Al terminar volvés solo a HotClick. | No cerrés esta ventana. Cuando terminés, volvés solo a HotClick. | nueva: `checkout.pago.noCerrar` |
| l4.html:71 | ¡Listo! Tu pago se aprobó. Pedido #[PENDIENTE]. Te mandamos la confirmación a correo@ejemplo.com. | ¡Listo! Tu pago se aprobó. Pedido #{{numero}}. Te mandamos la confirmación a {{correo}}. | nueva: `checkout.exito.texto` |
| l4.html:72 | ¿Qué sigue? La tienda prepara tu pedido y te avisamos cuando salga. | ¿Qué sigue? La tienda prepara tu pedido. Podés ver cómo va en «Mis pedidos». | nueva: `checkout.exito.siguiente` (ver nota 2) |
| l4.html:72 | El pago no se completó. No te cobramos nada. Tu carrito y tus datos siguen acá. | El pago no se completó y no se hizo ningún cobro. Tu carrito y tus datos siguen aquí. | nueva: `checkout.error.pagoFallido` (ver nota 3) |

Montos del botón (`Intentar de nuevo · ₡[PENDIENTE]`, l4.html:75): usar `Intentar de nuevo · ₡[MONTO]`; el monto sale del pedido, no del copy.

## 3. bodega (6 textos)

| Archivo:línea | Texto PROV | Texto final | Clave |
|---|---|---|---|
| b1.html:82 | Teléfono: usamos el del negocio (+506 XXXX XXXX). Cambiar | Para coordinar retiros y envíos de esta bodega. | `bodega.telefono.ayuda` (ver nota 4) |
| b3.html:80 | No tenemos permiso para ver tu ubicación. Buscá la dirección o mové el mapa hasta tu bodega. También podés habilitarlo en la configuración del navegador. | **No tenemos permiso para ver tu ubicación.** Buscá la dirección o mové el mapa hasta tu bodega. También podés dar el permiso en la configuración del navegador. | nueva: `bodega.ubicacion.sinPermiso` (título + texto) |
| b3.html:81 | No pudimos cargar el mapa. Cargá la ubicación a mano; podés poner el pin después. | No pudimos cargar el mapa. Escribí la dirección a mano; el pin lo podés poner después. | nueva: `bodega.mapa.errorCarga` |
| b3.html:86 | Ese punto queda fuera de Costa Rica. Por ahora las bodegas tienen que estar en el país. Mové el pin. | **Ese punto queda fuera de Costa Rica.** Las bodegas tienen que estar en el país. Mové el pin. | nueva: `bodega.mapa.fueraPais` (se quita «Por ahora» para no insinuar otros países) |
| b3.html:92 | Poné un nombre para reconocerla. | Ponele un nombre para reconocerla. | nueva: `bodega.nombre.error` |
| b3.html:95 | Bodega guardada. Ya podés asignarle productos. | **Bodega guardada.** Ya podés asignarle productos. | nueva: `bodega.guardada` |

## Notas

1. Ningún texto PROV menciona efectivo, envío gratis, caja sin conexión, invitaciones por correo ni primer mes gratis.
2. «Te avisamos cuando salga» promete un aviso de despacho al comprador. No está confirmado que ese aviso exista, así que el texto final remite a «Mis pedidos». Si el Desarrollador confirma que el correo de despacho existe, se puede volver a «Te avisamos por correo cuando salga».
3. «No te cobramos nada»: con tarjeta puede quedar una retención temporal según el banco. Por eso el texto dice «no se hizo ningún cobro».
4. Bodega, teléfono: el PROV dice que se usa el teléfono del negocio, pero las claves existentes piden un teléfono propio de la bodega y obligatorio (`bodega.telefono.errorObligatorio`). Se reutiliza la clave existente. Además, en tiendas Emprendedor ese teléfono es solo de uso interno y nunca se muestra al comprador.

## Datos que faltan para publicar los legales

Archivos en `/workspace/contenido/legal-final/`.

**terminos-y-condiciones.md**
- {{NOMBRE}} (titular, línea 4)
- Costos de envío: [PENDIENTE]; plazos de envío: [PENDIENTE] (sección 8)
- Teléfono / WhatsApp de atención: [PENDIENTE]; horario de atención: [PENDIENTE] (contacto)

**privacidad.md**
- {{NOMBRE}} (responsable, línea 4)
- Nombre del proveedor de inteligencia artificial: [PENDIENTE] (sección 5)
- Plazos específicos de conservación de datos: [PENDIENTE]

**devoluciones-y-garantias.md**
- Plazo de respuesta a reclamos: [PENDIENTE]
- Plazo de reintegro tras el retracto: [PENDIENTE]; costo del envío de devolución: [PENDIENTE]
- Plazo de garantía ofrecido en la Plataforma: [PENDIENTE]
- Plazo de reembolso: [PENDIENTE]

**acuerdo-vendedores.md**
- {{NOMBRE}} (línea 4)
- Mensualidad: Pyme ₡12.900 y Negocio Plus ₡28.900 por mes
- Comisión por venta de cada plan y comisión mínima: [PENDIENTE]
- Límites por plan (productos, usuarios, bodegas, funciones): [PENDIENTE]
- Comisión cuando se reembolsa una venta: [PENDIENTE]
- Calendario, plazos y cargos de acreditación al vendedor: [PENDIENTE]
- Días de preaviso para cambios del acuerdo: [PENDIENTE]

**cookies.md**
- {{NOMBRE}} (línea 7)
- Nombre, proveedor, finalidad y duración de cada cookie: [PENDIENTE] (el Desarrollador la puede sacar del código)

**Por verificar antes de publicar (sin revisión de abogado):**
- Plazo del derecho de retracto (Ley 7472 y su reglamento, comercio electrónico).
- Garantía mínima legal.
- Plazo para responder solicitudes de derechos sobre datos personales (Ley 8968 y su reglamento).
- Si la base de datos de clientes debe inscribirse ante la PRODHAB.
