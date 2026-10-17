# Contenido / Producto y Soporte: pendientes (copia)

Fuente: `/workspace/contenido/sprint1..6/README.md` (sección «Pendientes para el siguiente sprint» y «Decisiones nuevas para el dueño»), copiado el 17-oct-2026. Los textos completos siguen en la máquina compartida de los agentes (`/workspace/contenido/`). Se copian también `S2-multinegocio.md` y `textos-lanzamiento.md` en `contenido/`.

## Sprint 1
### Pendientes para el siguiente sprint
| Historia | Qué falta | Qué la bloquea |
|---|---|---|
| S1-70 Correo de bienvenida piloto | Completar nombres de tiendas, horario y canal de soporte en la plantilla | Decisión del dueño (S1-09 tiendas piloto, horario/canal) |
| S1-73 Videos (WhatsApp y CRM) | Editar las capturas según la especificación y renderizar; confirmar que los datos de `recorrido.mp4` (0:04–0:08) son de demo | Una persona o Diseño (edición) |
| S1-69 Legales | Revisión contra el texto oficial del Reglamento 7472 y validar régimen simplificado vs. retención de IVA | Contador / persona; aprobación escrita del dueño |
| S1-75 Telegram en menú escritorio | Agregar Telegram al menú lateral de Emprendedor y verificar en la web | Desarrollador (código) y QA Negocios |
| S1-76 Etiquetas «Ejemplo» en /emprende | Implementar y probar a 390 y 1440 | Desarrollador y QA Compradores; deploy con OK del dueño |
| S1-72 / S1-74 | Plazo de aprobación y si se puede cobrar en efectivo en el POS antes de aprobar (S1-04) | Decisión del dueño |

## Sprint 2
### Pendientes para el siguiente sprint
| Historia | Qué falta | Qué la bloquea |
|---|---|---|
| S2-69 FAQ ONVO | Confirmar mínimo de liquidación ₡20.000 y cambio de frecuencia | ONVO |
| S2-70 Productos prohibidos | Cruzar con la lista real de categorías | S2-15 (Desarrollador) |
| S2-71 Acuerdo v2 | Elegir opción de factura; validar ajuste semanal del ₡700, retención 0,777 %, comisión en reembolsos | Contador, ONVO, decisión del dueño |
| S2-72 Privacidad | Plazos de retención, proveedor de IA, inscripción PRODHAB, plazo de 4 años | Decisión del dueño, abogado |
| S2-73 Llamada ONVO | Acta y registro de respuestas | Fecha de la llamada (S1-03), una persona |
| S2-74 Tabla de decisiones | #26–#29 marcadas (16/10); actualizar el viernes 23/10 con el resto | Decisiones del dueño |
| S2-75 Tilopay en capturas | Revisar capturas de planes y pago a tamaño completo y taparlas | Una persona |
| S2-multinegocio | Confirmar #41 (plan inicial), #43 (frecuencia/US$3), #44 (borrar/transferir); maquetas; Dev tras OK (nombre único normalizado, cupo atómico, Crear otro → 403 sin negocio) | Dueño (#41 #43 #44); Diseño; Desarrollador |
| S2-multinegocio · duplicados | Duplicados existentes: reporte solo lectura para admin; dueño decide qué hacer | Dueño; Desarrollador |

## Sprint 3
### Pendientes para el siguiente sprint
| Historia | Qué falta | Qué la bloquea |
|---|---|---|
| S3-57 Guía onboarding ONVO | Lista exacta de KYC, duración del link y cómo pedir uno nuevo | ONVO |
| S3-59 Guion soporte onboarding | Cómo cambiar el IBAN y contacto de ONVO para suspensiones | ONVO |
| S3-60 Textos checkout tarjeta | Confirmar si el cobro de cada tienda puede fallar por separado | Desarrollador |
| S3-58 / S3-59 | Nombre exacto de la sección de pagos en el panel | Desarrollador |
| S3-61 Pago rechazado | (#26 resuelta) Textos alineados; falta tiempos de respuesta y OK | Decisión del dueño (tiempos); OK escrito |
| S3-59 | (#27 resuelta) Regla IBAN/ocultar aplicada; falta contacto ONVO y proceso de cambio de IBAN | ONVO |
| S3-60 | Alternativa SINPE en checkout (#26) agregada; confirmar fallo parcial por tienda | Desarrollador |
| Inventario app (asistente / POS / checkout) | Strings que aún muestran «número SINPE» o «SINPE al %s» | Desarrollador (propuestas en asistente.md) |
| Todas | Horario, canal y tiempos de respuesta de soporte; aprobación escrita | Decisión del dueño |

## Sprint 4
### Pendientes para el siguiente sprint
| Historia | Qué falta | Qué lo bloquea |
|---|---|---|
| S4-57 | Plazo de espera SINPE: docs ONVO no publican fijo → **[PENDIENTE: plazo según ONVO]** (https://docs.onvopay.com/payments/sinpe-mobile) | ONVO (confirmar plazo); OK escrito |
| S4-58 | Confirmar mecánica del ajuste semanal y descuento de US$3 | ONVO |
| S4-59 | Si la mensualidad se pausa o se acumula en pausa | Dueño (#37 restante); Desarrollador (implementar pausa); OK escrito |
| S4-60 | Zonas y tarifa exacta fuera del GAM; monto mínimo y cargo de contra entrega [PENDIENTE]; alinear checkout | Dueño; OK escrito para publicar |
| S4-57–61 | Aprobación escrita para publicar | Dueño |
| S1-70 Correo tiendas piloto | Rellenar plantilla | Dueño: elegir tiendas (S1-09), horario y canal de soporte |
| S1-73 Videos | Editar capturas (tapar WhatsApp, difuminar CRM) y renderizar | Una persona / Diseño |
| S2-73 Llamada ONVO | Acta de la llamada | Que ocurra la llamada con ONVO (dueño) |
| S2-75 Capturas «Tilopay» | Revisar capturas de planes y pagos a tamaño completo | Una persona |
| S3-57/59 KYC ONVO | Lista KYC exacta, vigencia y regeneración del enlace, cambio de IBAN, contacto para suspendidos | ONVO |

### Decisiones nuevas para el dueño
28. Plazo que tiene el comprador para hacer el SINPE antes de cancelar el pedido.
29. ~~Envíos: ¿el costo lo fija HotClick o la tienda? ¿Existe pago contra entrega y con qué cargo/zonas?~~ **Resuelta en lo principal (12/10 + 16/10):** HotClick fija los costos; se cobra por pedido y por negocio. Rápido ₡5.000 (8:00–19:00). Envío normal: ₡4.000 GAM; ₡5.000–₡10.000 fuera. Punto de retiro ₡2.000. Contra entrega: paga al recibir; opcional por negocio; si alguna tienda del carrito no la acepta, se oculta para todo el pedido (solo SINPE/tarjeta en ONVO). **Sigue pendiente:** zonas fuera del GAM; monto mínimo y cargo de contra entrega [PENDIENTE].
30. ~~Al vencer los 7 días de gracia: ¿el plan baja a Emprendedor o se pausa la tienda?~~ **Resuelta:** se pausa la tienda (no baja de plan).
37. ~~Tienda en pausa: ¿productos AGOTADO u ocultos?~~ **Parcial (16/10):** productos como **AGOTADO** (no ocultos); se ocultan redes y el botón de compartir. **Sigue pendiente:** ¿la mensualidad se pausa o se acumula?

## Sprint 5
### Pendientes para el siguiente sprint
| Historia | Qué falta | Qué lo bloquea |
|---|---|---|
| S5-55 | Aplicar los cambios a legal-final; plazos de reembolso; opción de factura | Contador (S5-01); abogado; ONVO; decisiones #31–#34 |
| S5-56 | Quién asume contracargos, comisión en reembolsos, envío de devolución | Decisiones #31–#33 |
| S5-57 | Elegir variante; cédula y CABYS | S5-04 (#34); contador |
| S5-58 | Códigos CABYS y tarifas | Reunión con el contador (S5-01); categorías reales (S2-15) |
| S5-59 | Plazo de acreditación | ONVO |
| S5-60 | Variante, revisión y firmas | S5-04; abogado; contador; tiendas piloto (S1-09); HOT_CLICK recoge firmas |
| S5-55–60 | Aprobación escrita para publicar | Dueño |
| S4-57 | Plazo SINPE: docs ONVO sin plazo fijo → [PENDIENTE: plazo según ONVO]; textos sin número fuera de ONVO | ONVO (confirmar plazo); OK |
| S4-58 | Mecánica del ajuste semanal y descuento de US$3 | ONVO |
| S4-59 | Funciones que se pierden; a qué plan baja | Decisión #30; Desarrollador |
| S4-60 | Costos de envío y contra entrega | Decisión #29 |
| S4-57–61 | Aprobación escrita para publicar | Dueño |
| S1-70 Correo piloto | Rellenar plantilla | Dueño: tiendas (S1-09), horario y canal de soporte |
| S1-73 Videos | Editar capturas y renderizar | Una persona / Diseño |
| S2-73 Llamada ONVO | Acta | Que ocurra la llamada (dueño) |
| S2-75 Capturas «Tilopay» | Revisión a tamaño completo | Una persona |
| S3-57/59 KYC ONVO | Lista KYC, vigencia del enlace, cambio de IBAN, contacto para suspendidos | ONVO |

### Decisiones nuevas para el dueño
31. En un reembolso total, ¿se le devuelve la comisión de HotClick al negocio? ¿Y el plazo que publicamos: 7 días para *solicitarlo* + lo que tarde ONVO en acreditar?
32. En un retracto o devolución, ¿quién paga el envío de vuelta (comprador, negocio o HotClick)?
33. Contracargos: ¿quién asume el monto si se pierde, y se retiene una reserva de las liquidaciones (cuánto y por cuántos días)?
34. Circuito de factura (S5-04): variante A (el negocio factura a HotClick, ¿por el neto o por la comisión?) o variante B (cada negocio declara lo suyo). Se decide con el contador.

## Sprint 6
### Pendientes para el siguiente sprint
| Historia | Qué falta | Qué lo bloquea |
|---|---|---|
| S6-55 | Horario y canal de soporte | Dueño |
| S6-56 | Publicar | S5-55; OK escrito de HOT_CLICK; Desarrollador + QA |
| S6-57 | Plazo SINPE y de acreditación | Documentación de ONVO |
| S6-58 | Grabar y tapar datos | Bugs del informe QA (S6-07); Diseño / una persona |
| S6-59 | Aplicar y capturas | S6-10 rebase; Diseño; QA |
| S4-59 | Implementar pausa; si mensualidad se pausa o acumula; aprobación | Desarrollador; dueño (#37 restante) |
| S4-60 / envíos | Zonas fuera del GAM; monto mínimo y cargo de contra entrega [PENDIENTE] | Dueño (#36 restante) |
| S4-57 | Plazo SINPE | Documentación de ONVO (ya no decisión #28) |
| S4-58 | Ajuste semanal y US$3 | ONVO |
| S4-57–61, S5, S6 | Aprobación escrita para publicar | Dueño |
| S5-55 | Aplicar cambios legales | Contador; abogado; ONVO; #31–#34 |
| S5-56 | Contracargos, comisión en reembolsos, envío de vuelta | #31–#33 |
| S5-57 | Variante; cédula y CABYS | #34; contador |
| S5-58 | Códigos CABYS | Contador; categorías (S2-15) |
| S5-59 | Plazo de acreditación | ONVO |
| S5-60 | Variante, revisión, firmas | #34; abogado; contador; S1-09 |
| S1-70 | Rellenar plantilla | Tiendas piloto (S1-09), horario soporte |
| S1-73 | Editar videos | Diseño / una persona |
| S2-73 | Acta ONVO | Llamada |
| S2-75 | Revisar capturas | Una persona |
| S3-57/59 | KYC, vigencia, cambio IBAN, suspendidos | ONVO |

### Decisiones nuevas para el dueño
35. Destacados: monto, duración y cuántos lugares hay.
36. Envíos: ¿siguen Rápido ₡5.000 y punto de retiro ₡2.000 junto con el envío normal (GAM ₡4.000 / fuera ₡5.000–₡10.000)? Definir zonas fuera del GAM; monto mínimo y cargo de contra entrega [PENDIENTE] (reglas de contra entrega ya definidas el 16/10).
37. ~~Tienda en pausa: ¿productos AGOTADO u ocultos?~~ **Parcial:** productos como **AGOTADO** (no ocultos); se ocultan redes y compartir. **Sigue pendiente:** ¿la mensualidad se pausa o se acumula?
38. Canal y horario de soporte para la guía de lanzamiento.
