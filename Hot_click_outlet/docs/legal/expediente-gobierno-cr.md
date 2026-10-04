# Expediente de gobierno — HotClick

Orientación para tramitar en Costa Rica. No es un dictamen de abogado y no sustituye la ventanilla. Este documento no se presentó ante ninguna institución.

Los datos de razón social, cédula, domicilio y cantón siguen pendientes. Cuando Andres los confirme, se completan aquí y en `frontend/src/legal/identidadComerciante.ts`. El sitio ya muestra teléfono, correo y dominio, y deja explícito que el resto se publica al confirmarlo.

| Dato | Valor |
|---|---|
| Nombre comercial | HotClick |
| Sitio | https://hotclick.lat |
| Correo | hotclick.cr@gmail.com |
| Teléfono / WhatsApp | +506 8666-7888 |
| Razón social o nombre del titular | Pendiente |
| Cédula física o jurídica | Pendiente |
| Domicilio y cantón | Pendiente |
| Hacienda, patente, PRODHAB | Pendiente de confirmar si ya existen |

## Orden de los trámites

1. Definir si opera como persona física o como sociedad. Si es sociedad, la personería para PRODHAB tiene que tener menos de un mes de emitida.
2. Inscribir la actividad en Hacienda (TRIBU-CR). Vender en línea no exime de estar inscrito.
3. Si hay patrono o trabajador independiente, inscribirse en la CCSS y tener la póliza de riesgos del trabajo del INS. Varias municipalidades las piden para la patente.
4. Patente municipal del cantón del domicilio, aunque la tienda no tenga local abierto al público. El hecho que la genera es la actividad lucrativa.
5. Inscribir ante la PRODHAB la base de clientes. El trámite de inscripción que publica la Agencia es presencial.
6. Con la cédula y el domicilio reales, completar `identidadComerciante.ts` y volver a publicar las políticas.

El registro PYME en el MEIC es opcional (beneficios, no es permiso para vender). La marca en el Registro de la Propiedad Industrial es recomendable y tampoco es requisito para cobrar.

## Hacienda (TRIBU-CR)

- Alta en el Registro Único Tributario con la actividad de comercio al por menor por internet y, si aplica, intermediación de marketplace. El código exacto se elige en TRIBU-CR; no se adivina aquí.
- Régimen tradicional: factura electrónica versión 4.4, con emisor, receptor, CABYS, IVA y consecutivo. Régimen simplificado: no exige factura electrónica por cada venta y tributa por compras. El salto de régimen no debe rehacer el modelo de documentos.
- Los pedidos se conservan cinco años por obligación fiscal. Por eso una solicitud de supresión de cuenta no borra el comprobante: se desvincula el contacto y se conserva el registro contable.
- Precios al público en colones, con IVA y envío visibles antes de pagar. Eso ya es regla de la Ley 7472, no solo de Hacienda.

## Patente municipal, CCSS e INS

La patente es del cantón donde está el domicilio de la actividad, también si el negocio es virtual. Los requisitos cambian por municipalidad. Lo habitual es:

- Formulario de licencia y, en varios cantones, declaración jurada de actividad virtual.
- Uso de suelo.
- Constancia de inscripción en Hacienda.
- Personería o cédula, y contrato o autorización del inmueble.
- Estar al día con la CCSS y póliza de riesgos del trabajo del INS cuando la municipalidad lo pide.
- Permiso sanitario del Ministerio de Salud si la actividad lo exige. Ropa y tecnología de outlet normalmente no son alimentos; igual hay que preguntarlo en el cantón.

Sin cantón confirmado no se puede indicar la ventanilla ni el monto.

## PRODHAB — inscripción de la base

Fuente: trámites publicados por la Agencia (Ley 8968, arts. 21, 33 y 34; Reglamento, arts. 44 a 57). La base de clientes de una tienda que distribuye datos para vender y entregar entra en el registro. No inscribir una base que debe estarlo es falta gravísima. El canon de regulación es de USD 200 al año. El canon extra por comercialización de ficheros aplica si se venden los datos; HotClick declara que no vende datos, así que ese canon no corresponde mientras eso siga siendo cierto.

Cualquier cambio relevante de la inscripción se comunica a la PRODHAB en cinco días hábiles.

Llevar impreso, en persona:

1. Formulario de inscripción del sitio de la PRODHAB, según persona física o jurídica.
2. Solicitud del propietario, con firma autenticada o confrontada. Si es sociedad, personería con menos de un mes.
3. Designación del responsable de la base ante la Agencia y ante terceros, con medio y lugar de contacto, más carta de aceptación del cargo.
4. Identificación de los encargados y carta de aceptación de cada uno que corresponda.
5. Nombre de la base y ubicación. Propuesta: «Clientes y pedidos HotClick», alojada en el servidor de la aplicación (PostgreSQL en el entorno de producción).
6. Finalidades y tipos de datos (borrador abajo).
7. Cómo se obtiene el consentimiento.
8. Descripción de las medidas de seguridad.
9. Destinatarios de transferencias.
10. Protocolo de actuación para los derechos de las personas.
11. Contratos de venta de ficheros: ninguno. Estimación pecuniaria: no aplica.
12. Correo para notificaciones: hotclick.cr@gmail.com, y la dirección exacta cuando exista.

### Finalidades y datos

Datos: nombre, cédula (física, jurídica o DIMEX), correo, teléfono, dirección de entrega, mensajes del chat, comprobante SINPE cuando el cliente lo sube, y datos técnicos de sesión.

Finalidades: crear la cuenta, cobrar, facturar, entregar, gestionar devoluciones, soporte y, solo con consentimiento del banner, medición y publicidad.

### Consentimiento en el producto

- Registro de comprador y de negocio: checkbox de términos y privacidad.
- Checkout: checkbox obligatorio antes de pagar, con enlaces a privacidad, cookies y devoluciones.
- Cada aceptación queda en `hot_click_consentimiento_log_tb`.
- Analítica y Meta no arrancan sin el consentimiento del banner.

### Encargados que hay que declarar

Tilopay, Stripe y ONVO (tarjeta); SINPE Móvil (verificación del comprobante); SendGrid (correo); Clerk (login social); Correos de Costa Rica (entrega); Amazon Web Services (archivos); Anthropic (chat); Sentry (errores); Google Analytics 4, PostHog, Microsoft Clarity y Meta (medición y anuncios, con consentimiento).

En compras del marketplace, el vendedor recibe nombre, teléfono y dirección para entregar. Eso ya está en la política de privacidad y en el acuerdo de vendedores: no puede usar esos datos para publicidad propia sin un consentimiento aparte.

### Medidas de seguridad (texto para el formulario)

Transmisión cifrada con HTTPS/TLS. Contraseñas con hash, nunca en texto plano. Tokens de sesión con vencimiento y rotación. Acceso de administración limitado a personal autorizado. La plataforma no almacena el número completo de la tarjeta ni el CVV: el cobro con tarjeta ocurre en la pasarela. Ante una brecha, se avisa a la PRODHAB y a las personas afectadas.

### Protocolo de derechos (acceso, rectificación, supresión)

1. La persona escribe a hotclick.cr@gmail.com, o por WhatsApp al +506 8666-7888, e indica nombre, correo de la cuenta y qué pide: acceso, corrección o supresión.
2. HotClick responde en un plazo máximo de diez días hábiles.
3. Acceso: se exportan los datos de la cuenta y de los pedidos asociados.
4. Rectificación: se corrigen los datos de contacto que la persona señale.
5. Supresión: se cierra la cuenta y se eliminan o anonimizan los datos de contacto en un plazo máximo de treinta días hábiles. Los pedidos y comprobantes se conservan cinco años, desvinculados del contacto, por obligación ante Hacienda.
6. Si la persona no está conforme, puede reclamar ante la PRODHAB.

### Borrador de carta del responsable

Se completa con el nombre y la cédula de quien acepta el cargo. No firmar en blanco.

> Yo, [nombre], cédula [número], acepto el cargo de persona responsable de la base de datos «Clientes y pedidos HotClick» ante la Agencia de Protección de Datos de los Habitantes y ante las personas titulares. El medio de contacto es hotclick.cr@gmail.com y el teléfono +506 8666-7888. Me comprometo a atender las solicitudes de acceso, rectificación y supresión, a mantener actualizada la inscripción y a comunicar a la Agencia los cambios relevantes dentro de los cinco días hábiles.

## Lo que el sitio ya cubre y lo que falta fuera del código

Cubierto en la rama `legal/cumplimiento-cr`:

- Políticas de privacidad, cookies, términos y devoluciones, con fecha 4 de octubre de 2026.
- Aviso de cookies con tres opciones (rechazar opcionales, configurar, aceptar todas), panel por categoría y enlace «Configurar cookies» en el pie.
- Declaración de mayoría de edad (18 años) en el registro de comprador y de negocio. No se pide fecha de nacimiento.
- El chat indica que es un asistente de inteligencia artificial.
- Lista interna de multas: `docs/legal/checklist-multas-y-cumplimiento.md`.
- Retracto de 8 días hábiles desde la confirmación del pago, por el mismo medio, con reembolso al mismo medio. La garantía comercial de 40 días por defectos se mantiene y no sustituye al retracto.
- Medios de pago descritos como SINPE Móvil y tarjeta (Tilopay, Stripe u ONVO), sin guardar el número de tarjeta.
- Canal de reclamo en la plataforma. La cláusula del marketplace ya no dice que HotClick queda exenta de toda responsabilidad.
- Privacidad y cookies visibles también en el pie de la tienda en el teléfono.

Falta fuera del código, y lo hace Andres en la ventanilla:

- Confirmar persona física o jurídica, cédula, domicilio y cantón.
- Hacienda, patente, CCSS/INS y la inscripción presencial en la PRODHAB.
- Después de eso, llenar `identidadComerciante.ts` (`razonSocial`, `cedula`, `domicilio`, `canton`) para que el sitio deje de decir que esos datos están por confirmar.
