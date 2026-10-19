# Plan Scrum de HotClick (hotclick.lat)
*Viernes 16-oct-2026, hora de Costa Rica (UTC-6). Repo `hotclickdev/Hot-click-dev` (Spring Boot + React/Vite + Postgres en AWS Lightsail).*

> **Esto es solo un plan.** No se tocó código, no se hizo push, no se desplegó nada y no se le escribió a nadie. **La implementación arranca solo cuando HOT_CLICK pruebe este plan y diga «okey».**

## 1. Resumen general
- **6 sprints de 1 semana**, del lunes 19-oct al viernes 27-nov-2026. **434 historias** y **844 puntos** en total.
- Cada historia tiene ID único (`S{sprint}-{nn}`), título, formato «Como <rol> quiero <x> para <y>», responsable, prioridad, puntos, dependencias y al menos 7 criterios de aceptación comprobables (Dado/cuando/entonces o checklist).
- Cada historia trae primero sus criterios propios y después los criterios fijos de su rol (forma de trabajo que se comprueba igual en todas).
- **Ruta:** S1 beta piloto estable sin pago en línea → S2 cimientos (CI/CD, staging, backups, legal, ONVO Sprint 0) → S3 alta de negocios en ONVO y tarjeta en sandbox → S4 SINPE Móvil, mínimo de ₡700, planes pagos, liquidaciones, POS y envíos → S5 reembolsos, conciliación, facturación manual y legales → S6 salida en vivo con la tienda piloto y preparación para quitar Tilopay.
- **Riesgo principal:** todo lo de ONVO depende de que ONVO apruebe la cuenta y entregue las llaves de sandbox. Si no llegan a tiempo, las historias de ONVO se corren una semana y el resto sigue.

**Palabras que se usan (explicadas una vez):** PR = paquete de cambios que se revisa antes de unirlo; merge = unirlo; deploy = subirlo al sitio real; staging = copia del sitio para probar; sandbox = ambiente de pruebas de ONVO con plata ficticia; webhook = aviso automático de ONVO al servidor; polling = consultar cada cierto tiempo porque ONVO no avisa solo; P0 = bloquea abrir al público, P1 = antes de crecer o de lanzar pagos, P2 = mejora importante que puede esperar.

## 2. Reglas que no se negocian
- **Todo deploy a producción necesita la aprobación manual de HOT_CLICK** (environment `production` en GitHub), con `pg_dump` verificado y etiqueta de vuelta atrás antes.
- **Los bots de QA solo prueban desde la web**, como cualquier persona: sin código, sin base de datos, sin servidor y sin llamar a la API directamente. Los guiones de QA Automatización solo manejan el navegador; meterlos al CI lo hace el Desarrollador.
- **Sin WhatsApp API. Sin Meta Pixel.**
- **No se inventan montos.** Solo se usan los dados por HOT_CLICK o publicados en las fuentes (9 %, 7 %, ₡700, ₡12.900, ₡28.900, US$3 por liquidación, IVA 13 %, envío normal GAM ₡4.000, y las tarifas publicadas de ONVO marcadas «a confirmar»). Todo lo demás dice **«monto a definir por HOT_CLICK»**.
- **Tilopay se quita en un PR aparte** (`chore/quitar-tilopay`) que se despliega solo cuando ONVO ya funciona en producción, estable, y con tu OK.
- **Facturación:** solo el admin de HotClick factura, solo compras hechas en la tienda, a nombre de HotClick; Emprendedor, Pyme y Negocio Plus no tienen ningún permiso de facturación; no se factura a los clientes de los negocios por ahora; primero manual y el automático después, detrás de un interruptor. **No se emite ninguna factura real sin las respuestas de tu contador.**
- **Ninguna tienda es pública antes de que el admin la apruebe** con el botón «Aprobar». **Aprobar no crea nada en ONVO**: eso lo hace solo el botón «Registrar negocio en ONVO».
- Las llaves y secretos se entregan solo por solicitud de secreto, nunca por chat.

## 3. Roles
| Rol | Qué hace |
|---|---|
| HOT_CLICK (dueño) | El dueño. Decide, aprueba y entrega credenciales. Aprueba a mano cada deploy a producción y dice «okey» para arrancar. |
| Desarrollador | Escribe el código en ramas y PRs con pruebas. No despliega sin la aprobación de HOT_CLICK. |
| Diseño / UX (Figma) | Bocetos en Figma a 390 y 1440 px, accesibilidad y textos de pantalla con Producto. |
| QA (calidad) | Coordina la calidad: regresiones, planes de prueba y veredicto «listo/no listo». Solo desde la web. |
| QA Compradores | Prueba como comprador (invitado y con cuenta): búsqueda, carrito, checkout, pagos, reembolsos. Solo desde la web. |
| QA Negocios | Prueba como negocio (Emprendedor, Pyme, Negocio Plus y personal): registro, productos, POS, pedidos, cobros. Solo desde la web. |
| QA Automatización y Regresión | Guiones de navegador que repiten los flujos como un usuario (sin API ni base de datos), corrida nocturna y smoke después de cada deploy. |
| Seguridad | Revisa código y diseño, modelo de amenazas, permisos, datos personales y pagos. Sin ataques en producción. |
| DevOps y Seguridad | Pipeline, staging, backups cifrados en Google Drive, vuelta atrás, monitoreo, secretos y servidor (Lightsail). |
| Producto Contenido y Soporte | Textos, legales con el abogado, FAQ, guiones de soporte, correos y videos. Español de Costa Rica con voseo. |
| Finanzas | Montos, márgenes, conciliación, mínimo de ₡700, liquidaciones, IVA y reportes, siempre con montos reales. |
| Consultor | Revisión independiente de solo lectura: cruza auditorías, ramas y planes y señala huecos. |

## 4. Definición de Terminado (DoD)
- Todos los criterios de aceptación de la historia se cumplen y hay evidencia (capturas, informe o enlace al PR).
- Código: rama y PR propios, pruebas (mvn, vitest y navegador) en verde, gates de seguridad (gitleaks, osv-scanner, gate-tenant) en verde, revisión de Seguridad si toca pagos, permisos o datos personales.
- Nada llega a producción sin la **aprobación manual de HOT_CLICK**, `pg_dump` verificado, etiqueta de vuelta atrás y smoke de 10 minutos.
- QA lo probó **solo desde la web** a 390 y 1440 px, con cuentas QA-TEST y sin pagos reales salvo OK escrito de HOT_CLICK.
- Sin secretos ni datos personales en el repo, en los logs ni en el chat.
- Sin montos inventados («monto a definir por HOT_CLICK» donde falte), sin «[PENDIENTE]» visible en producción, sin WhatsApp API y sin Meta Pixel.
- Textos en español de Costa Rica, con voseo, claros y aprobados por HOT_CLICK si se publican.
- La decisión o el resultado queda anotado en el documento que corresponde (decisiones, informes de QA, Seguridad, Finanzas o infra).

## 5. Resumen de sprints
| Sprint | Fechas (1 semana) | Nombre | Historias | Puntos | P0 | Mín. criterios por historia |
|---|---|---|---:|---:|---:|---:|
| S1 | lunes 19-oct al viernes 23-oct-2026 | Beta piloto estable, sin pago en línea | 84 | 162 | 21 | 7 |
| S2 | lunes 26-oct al viernes 30-oct-2026 | Cimientos: CI/CD, staging, backups, legal y ONVO Sprint 0 | 82 | 176 | 8 | 7 |
| S3 | lunes 2-nov al viernes 6-nov-2026 | ONVO: alta de negocios desde el admin y pago con tarjeta en sandbox | 67 | 137 | 11 | 7 |
| S4 | lunes 9-nov al viernes 13-nov-2026 | SINPE Móvil, mínimo de ₡700, planes pagos, liquidaciones, POS y envíos | 68 | 133 | 7 | 7 |
| S5 | lunes 16-nov al viernes 20-nov-2026 | Reembolsos, conciliación, facturación electrónica manual y legales | 67 | 124 | 15 | 7 |
| S6 | lunes 23-nov al viernes 27-nov-2026 | Endurecer, salir en vivo con la tienda piloto y preparar la salida de Tilopay | 66 | 112 | 15 | 7 |

**Historias por rol y sprint**

| Rol | S1 | S2 | S3 | S4 | S5 | S6 | Total |
|---|---:|---:|---:|---:|---:|---:|---:|
| HOT_CLICK (dueño) | 9 | 8 | 5 | 5 | 7 | 6 | 40 |
| Desarrollador | 15 | 16 | 16 | 16 | 12 | 12 | 87 |
| Diseño / UX (Figma) | 6 | 7 | 5 | 5 | 5 | 5 | 33 |
| QA (calidad) | 6 | 5 | 5 | 5 | 5 | 5 | 31 |
| QA Compradores | 7 | 5 | 5 | 5 | 5 | 5 | 32 |
| QA Negocios | 7 | 5 | 5 | 5 | 5 | 5 | 32 |
| QA Automatización y Regresión | 5 | 5 | 5 | 5 | 5 | 5 | 30 |
| Seguridad | 6 | 8 | 5 | 5 | 5 | 5 | 34 |
| DevOps y Seguridad | 7 | 9 | 5 | 5 | 5 | 6 | 37 |
| Producto Contenido y Soporte | 8 | 7 | 5 | 5 | 6 | 5 | 36 |
| Finanzas | 5 | 4 | 3 | 4 | 4 | 4 | 24 |
| Consultor | 3 | 3 | 3 | 3 | 3 | 3 | 18 |

## 6. Decisiones de HOT_CLICK que destraban el plan
- OK y ventana para desplegar `fix/reverificacion-1610` (S1).
- Rotar la Google API key y ventana para cerrar el puerto 8080 (#123) (S1).
- Correo a ONVO, cuenta primaria, KYC, llaves de sandbox y luego llaves live (S1, S2, S6).
- Categorías reales, OK de limpieza de datos de prueba, tiendas piloto y go/no-go (S1).
- POS: negocio sin aprobar cobra en efectivo o no; POS QR con SINPE (S1, S4).
- Quién paga la tarifa de ONVO, cómo se cobra la mensualidad, contracargos, espera del SINPE, Checkout hospedado (S2).
- Mínimo de ₡700: confirmar con ONVO el ajuste semanal o usar el plan B (S4).
- Qué es «la tienda» para facturar, reunión con el contador, «IVA 13 % no-Tribu», actividades 4719.9 y 4741.0 (S1, S5).
- Legales LEG-1 a LEG-14 y PRODHAB con el abogado (S1, S2, S5).
- OK de go-live con ONVO y fecha para desplegar la salida de Tilopay (S6).

---

## Sprint 1: Beta piloto estable, sin pago en línea
- **Duración:** 1 semana (lunes 19-oct al viernes 23-oct-2026).
- **Objetivo:** Dejar producción estable para 3 a 5 tiendas piloto invitadas, sin pago en línea: desplegar fix/reverificacion-1610 con tu OK, cerrar los 7 detalles del checkout, mostrar precios reales, aprobar negocios con el botón «Aprobar», incluir el POS en Emprendedor, limpiar datos de prueba, rotar la Google API key y arrancar el trámite con ONVO.
- **Entregable de cierre:** Go/no-go de la beta piloto firmado por HOT_CLICK, regresión completa en verde y correo a ONVO enviado.
- **Historias:** 84 · **Puntos:** 162

| Rol | Historias | Puntos |
|---|---:|---:|
| HOT_CLICK (dueño) | 9 | 10 |
| Desarrollador | 15 | 34 |
| Diseño / UX (Figma) | 6 | 13 |
| QA (calidad) | 6 | 13 |
| QA Compradores | 7 | 14 |
| QA Negocios | 7 | 16 |
| QA Automatización y Regresión | 5 | 12 |
| Seguridad | 6 | 10 |
| DevOps y Seguridad | 7 | 13 |
| Producto Contenido y Soporte | 8 | 13 |
| Finanzas | 5 | 9 |
| Consultor | 3 | 5 |

### Sprint 1 · HOT_CLICK (dueño)

#### S1-01 · OK y ventana para desplegar fix/reverificacion-1610
- **Historia:** Como dueño de HotClick quiero dar el OK y elegir la ventana horaria para desplegar la rama fix/reverificacion-1610 para que los arreglos del checkout, POS y precios lleguen a producción sin sorpresas.
- **Responsable:** HOT_CLICK (dueño)
- **Prioridad:** P0 · **Puntos:** 1
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Dado el resumen del PR (qué cambia y cómo se vuelve atrás), cuando HOT_CLICK lo lee, entonces responde «okey» o pide cambios por escrito.
  2. Checklist: la ventana elegida (día y hora de Costa Rica) queda anotada y es de bajo tráfico.
  3. Dado el OK, cuando DevOps prepara el deploy, entonces la aprobación manual de HOT_CLICK queda registrada en GitHub (environment production).
  4. Checklist: la decisión o entrega queda anotada con fecha y opción elegida en /workspace/informes/decisiones-hotclick.md.
  5. Dado que HOT_CLICK decide, cuando Grok Bot lo registra, entonces avisa al equipo qué historias quedan destrabadas.
  6. Checklist: credenciales y llaves se entregan solo por un canal seguro (solicitud de secreto), nunca por chat.
  7. Dado que la decisión no llega antes del cierre del sprint, cuando se hace la revisión, entonces las historias que dependen de ella pasan al sprint siguiente sin construirse a medias.

#### S1-02 · Rotar la Google API key expuesta (SEG-A)
- **Historia:** Como dueño de HotClick quiero rotar en Google Cloud la API key que quedó en el historial del repo público para que nadie pueda usar una llave filtrada a mi nombre.
- **Responsable:** HOT_CLICK (dueño)
- **Prioridad:** P0 · **Puntos:** 1
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Dado el acceso a Google Cloud, cuando HOT_CLICK crea la llave nueva, entonces la vieja queda revocada el mismo día.
  2. Checklist: la llave nueva tiene restricciones de dominio (hotclick.lat) y de API.
  3. Dado la llave nueva, cuando se entrega a DevOps, entonces va por solicitud de secreto y nunca por chat.
  4. Checklist: la decisión o entrega queda anotada con fecha y opción elegida en /workspace/informes/decisiones-hotclick.md.
  5. Dado que HOT_CLICK decide, cuando Grok Bot lo registra, entonces avisa al equipo qué historias quedan destrabadas.
  6. Checklist: credenciales y llaves se entregan solo por un canal seguro (solicitud de secreto), nunca por chat.
  7. Dado que la decisión no llega antes del cierre del sprint, cuando se hace la revisión, entonces las historias que dependen de ella pasan al sprint siguiente sin construirse a medias.

#### S1-03 · Correo a ONVO y apertura de la cuenta primaria
- **Historia:** Como dueño de HotClick quiero enviar el correo a ONVO (borrador de informe-1610 §4.1), pedir una llamada y abrir la cuenta primaria con KYC para tener Marketplace y la tarifa semanal habilitados lo antes posible.
- **Responsable:** HOT_CLICK (dueño)
- **Prioridad:** P0 · **Puntos:** 2
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: correo enviado con las preguntas abiertas (frecuencia de liquidación por cuenta, pausar por API, comisión sobre bruto o neto, eventos de reembolso, ajuste semanal del mínimo de ₡700).
  2. Checklist: KYC iniciado y cuenta bancaria en colones registrada para la liquidación de HotClick.
  3. Dado cualquier respuesta de ONVO, cuando llega, entonces se archiva en /workspace/pagos/onvo-respuestas.md.
  4. Checklist: la decisión o entrega queda anotada con fecha y opción elegida en /workspace/informes/decisiones-hotclick.md.
  5. Dado que HOT_CLICK decide, cuando Grok Bot lo registra, entonces avisa al equipo qué historias quedan destrabadas.
  6. Checklist: credenciales y llaves se entregan solo por un canal seguro (solicitud de secreto), nunca por chat.
  7. Dado que la decisión no llega antes del cierre del sprint, cuando se hace la revisión, entonces las historias que dependen de ella pasan al sprint siguiente sin construirse a medias.

#### S1-04 · Decidir si un negocio sin aprobar cobra en efectivo en el POS (NP-13a)
- **Historia:** Como dueño de HotClick quiero decidir si un negocio todavía sin aprobar puede registrar ventas en efectivo en el POS para que la regla sea clara para Desarrollo, QA y Soporte.
- **Responsable:** HOT_CLICK (dueño)
- **Prioridad:** P1 · **Puntos:** 1
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: se elige una opción: (a) permitir efectivo con aviso «tu tienda aún no está aprobada» o (b) bloquear el POS hasta aprobar.
  2. Checklist: también se decide si el POS QR con SINPE al número del negocio se muestra o se esconde hasta ONVO.
  3. Dado la decisión, cuando se registra, entonces el Desarrollador tiene una historia para aplicarla en este sprint o el siguiente.
  4. Checklist: la decisión o entrega queda anotada con fecha y opción elegida en /workspace/informes/decisiones-hotclick.md.
  5. Dado que HOT_CLICK decide, cuando Grok Bot lo registra, entonces avisa al equipo qué historias quedan destrabadas.
  6. Checklist: credenciales y llaves se entregan solo por un canal seguro (solicitud de secreto), nunca por chat.
  7. Dado que la decisión no llega antes del cierre del sprint, cuando se hace la revisión, entonces las historias que dependen de ella pasan al sprint siguiente sin construirse a medias.

#### S1-05 · Lista de categorías reales y OK de limpieza
- **Historia:** Como dueño de HotClick quiero pasar la lista de categorías reales de productos y de negocio y dar el OK para borrar datos de prueba para que el catálogo deje de mostrar «Tecnología» para todo y productos falsos.
- **Responsable:** HOT_CLICK (dueño)
- **Prioridad:** P1 · **Puntos:** 1
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: lista de categorías entregada (incluye las que faltan, como muebles) y aprobada.
  2. Checklist: OK escrito para borrar los productos de prueba de bruma-cafe (LAN-3) y los pedidos QA-TEST del 16-oct.
  3. Checklist: revisada la visibilidad en el marketplace de la tienda QA-TEST Escritorios (producto 583).
  4. Checklist: la decisión o entrega queda anotada con fecha y opción elegida en /workspace/informes/decisiones-hotclick.md.
  5. Dado que HOT_CLICK decide, cuando Grok Bot lo registra, entonces avisa al equipo qué historias quedan destrabadas.
  6. Checklist: credenciales y llaves se entregan solo por un canal seguro (solicitud de secreto), nunca por chat.
  7. Dado que la decisión no llega antes del cierre del sprint, cuando se hace la revisión, entonces las historias que dependen de ella pasan al sprint siguiente sin construirse a medias.

#### S1-06 · Ventana para cerrar el puerto 8080 (#123)
- **Historia:** Como dueño de HotClick quiero elegir cuándo se puede reiniciar el servidor para publicar la app solo en 127.0.0.1:8080 para cerrar la exposición sin cortar ventas.
- **Responsable:** HOT_CLICK (dueño)
- **Prioridad:** P1 · **Puntos:** 1
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: fecha y hora elegidas, y si va en el mismo deploy de la rama o en otro.
  2. Dado la ventana, cuando DevOps avisa la duración estimada del corte, entonces HOT_CLICK la acepta.
  3. Checklist: queda definido a quién avisar (tiendas piloto) si hay un corte.
  4. Checklist: la decisión o entrega queda anotada con fecha y opción elegida en /workspace/informes/decisiones-hotclick.md.
  5. Dado que HOT_CLICK decide, cuando Grok Bot lo registra, entonces avisa al equipo qué historias quedan destrabadas.
  6. Checklist: credenciales y llaves se entregan solo por un canal seguro (solicitud de secreto), nunca por chat.
  7. Dado que la decisión no llega antes del cierre del sprint, cuando se hace la revisión, entonces las historias que dependen de ella pasan al sprint siguiente sin construirse a medias.

#### S1-07 · Aclarar qué es «la tienda» para la facturación
- **Historia:** Como dueño de HotClick quiero elegir si «la tienda» es (a) el marketplace hotclick.lat, (b) solo los productos de plataforma o (c) otra cosa para que el admin sepa qué compras se pueden facturar a nombre de HotClick.
- **Responsable:** HOT_CLICK (dueño)
- **Prioridad:** P1 · **Puntos:** 1
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: opción elegida y escrita con ejemplos de qué pedidos entran y cuáles no.
  2. Checklist: queda explícito que las tiendas propias (/tienda/<slug>) y el POS de los negocios no se facturan.
  3. Checklist: queda decidido si el comprador pide la factura o no (sin botón hasta confirmarlo).
  4. Checklist: la decisión o entrega queda anotada con fecha y opción elegida en /workspace/informes/decisiones-hotclick.md.
  5. Dado que HOT_CLICK decide, cuando Grok Bot lo registra, entonces avisa al equipo qué historias quedan destrabadas.
  6. Checklist: credenciales y llaves se entregan solo por un canal seguro (solicitud de secreto), nunca por chat.
  7. Dado que la decisión no llega antes del cierre del sprint, cuando se hace la revisión, entonces las historias que dependen de ella pasan al sprint siguiente sin construirse a medias.

#### S1-08 · Agendar la reunión con el contador
- **Historia:** Como dueño de HotClick quiero agendar la reunión con mi contador y llevarle las preguntas de la Parte A.5 para que no se emita ninguna factura real sin validación tributaria.
- **Responsable:** HOT_CLICK (dueño)
- **Prioridad:** P1 · **Puntos:** 1
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: fecha de la reunión anotada (idealmente antes del sprint 5).
  2. Checklist: las 10 preguntas de A.5 impresas o enviadas, incluida «IVA 13 % no-Tribu».
  3. Dado que la reunión se mueve, cuando pasa, entonces las historias de facturación real se corren y se avisa al equipo.
  4. Checklist: la decisión o entrega queda anotada con fecha y opción elegida en /workspace/informes/decisiones-hotclick.md.
  5. Dado que HOT_CLICK decide, cuando Grok Bot lo registra, entonces avisa al equipo qué historias quedan destrabadas.
  6. Checklist: credenciales y llaves se entregan solo por un canal seguro (solicitud de secreto), nunca por chat.
  7. Dado que la decisión no llega antes del cierre del sprint, cuando se hace la revisión, entonces las historias que dependen de ella pasan al sprint siguiente sin construirse a medias.

#### S1-09 · Go/no-go de la beta piloto y tiendas elegidas
- **Historia:** Como dueño de HotClick quiero decidir go/no-go de la beta piloto sin pago en línea y elegir de 3 a 5 tiendas para abrir con poco riesgo y aprender rápido.
- **Responsable:** HOT_CLICK (dueño)
- **Prioridad:** P0 · **Puntos:** 1
- **Dependencias:** S1-31 (Regresión completa después del deploy)
- **Criterios de aceptación:**
  1. Dado el informe de QA de la regresión, cuando HOT_CLICK lo revisa, entonces decide go o no-go por escrito.
  2. Checklist: de 3 a 5 tiendas piloto con nombre, plan y persona de contacto.
  3. Checklist: queda claro que la beta funciona sin pago en línea (efectivo, retiro, contra entrega y coordinación con el vendedor).
  4. Checklist: la decisión o entrega queda anotada con fecha y opción elegida en /workspace/informes/decisiones-hotclick.md.
  5. Dado que HOT_CLICK decide, cuando Grok Bot lo registra, entonces avisa al equipo qué historias quedan destrabadas.
  6. Checklist: credenciales y llaves se entregan solo por un canal seguro (solicitud de secreto), nunca por chat.
  7. Dado que la decisión no llega antes del cierre del sprint, cuando se hace la revisión, entonces las historias que dependen de ella pasan al sprint siguiente sin construirse a medias.

### Sprint 1 · Desarrollador

#### S1-10 · Preparar el deploy de fix/reverificacion-1610
- **Historia:** Como dueño de HotClick quiero dejar la rama lista para producción con static/ reconstruido con las VITE_* de producción para desplegar sin romper el login ni el front.
- **Responsable:** Desarrollador
- **Prioridad:** P0 · **Puntos:** 3
- **Dependencias:** S1-01 (OK y ventana para desplegar fix/reverificacion-1610)
- **Criterios de aceptación:**
  1. Checklist: la rama incluye el hotfix #150 sin conflictos y conserva OrigenPedido.ONLINE del hotfix con el costo de envío de la rama.
  2. Checklist: static/ se reconstruye con las VITE_* publicables de producción en un commit aparte.
  3. Dado el plan de deploy, cuando se revisa, entonces trae pg_dump verificado, etiqueta de vuelta atrás y smoke de 10 minutos.
  4. Checklist: el cambio va en su propia rama y PR, con pruebas automáticas (mvn y vitest) en verde y revisión de Seguridad si toca pagos, permisos o datos personales.
  5. Dado que el PR está aprobado, cuando se quiere subir a producción, entonces solo se despliega con la aprobación manual de HOT_CLICK, con pg_dump y etiqueta de vuelta atrás hechos antes.
  6. Checklist: ningún secreto, llave ni dato personal queda en el código o en los logs, y ningún monto queda escrito en el código (sale del plan o de la configuración).
  7. Dado el cambio en staging, cuando QA lo prueba desde el navegador a 390 y 1440 px, entonces no hay errores 500 ni textos «[PENDIENTE]» en las pantallas tocadas.

#### S1-11 · POS incluido en Emprendedor (V174, 1 caja)
- **Historia:** Como vendedor Emprendedor quiero que el plan Emprendedor tenga el POS con una caja para vender en efectivo en mi local como decidió HOT_CLICK.
- **Responsable:** Desarrollador
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** S1-10 (Preparar el deploy de fix/reverificacion-1610)
- **Criterios de aceptación:**
  1. Checklist: migración V174__emprendedor_incluye_pos.sql pone tiene_pos=true en EMPRENDEDOR y max_cajas sigue en 1; DataSeeder coherente.
  2. Dado un Emprendedor nuevo, cuando entra al panel, entonces ve el POS y la página de planes dice «Sí · 1 caja».
  3. Checklist: la migración se probó en un Postgres limpio (gate E1b) y es idempotente.
  4. Checklist: el cambio va en su propia rama y PR, con pruebas automáticas (mvn y vitest) en verde y revisión de Seguridad si toca pagos, permisos o datos personales.
  5. Dado que el PR está aprobado, cuando se quiere subir a producción, entonces solo se despliega con la aprobación manual de HOT_CLICK, con pg_dump y etiqueta de vuelta atrás hechos antes.
  6. Checklist: ningún secreto, llave ni dato personal queda en el código o en los logs, y ningún monto queda escrito en el código (sale del plan o de la configuración).
  7. Dado el cambio en staging, cuando QA lo prueba desde el navegador a 390 y 1440 px, entonces no hay errores 500 ni textos «[PENDIENTE]» en las pantallas tocadas.

#### S1-12 · Quitar el preconnect de Clerk de desarrollo
- **Historia:** Como dueño de HotClick quiero quitar del index.html el preconnect a hot-spider-31.clerk.accounts.dev para que producción no apunte a un dominio de desarrollo.
- **Responsable:** Desarrollador
- **Prioridad:** P2 · **Puntos:** 1
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: el preconnect se quita o se cambia a https://clerk.hotclick.lat.
  2. Dado el build nuevo, cuando se abre el sitio, entonces el login sigue funcionando (la clave se lee en runtime de /api/public/auth-config).
  3. Checklist: el cambio va en un commit aparte del rebuild de static/.
  4. Checklist: el cambio va en su propia rama y PR, con pruebas automáticas (mvn y vitest) en verde y revisión de Seguridad si toca pagos, permisos o datos personales.
  5. Dado que el PR está aprobado, cuando se quiere subir a producción, entonces solo se despliega con la aprobación manual de HOT_CLICK, con pg_dump y etiqueta de vuelta atrás hechos antes.
  6. Checklist: ningún secreto, llave ni dato personal queda en el código o en los logs, y ningún monto queda escrito en el código (sale del plan o de la configuración).
  7. Dado el cambio en staging, cuando QA lo prueba desde el navegador a 390 y 1440 px, entonces no hay errores 500 ni textos «[PENDIENTE]» en las pantallas tocadas.

#### S1-13 · Guardar la categoría elegida en el registro
- **Historia:** Como vendedor quiero que la categoría que elijo al registrar mi negocio se guarde de verdad para que mis productos no salgan todos en «Tecnología».
- **Responsable:** Desarrollador
- **Prioridad:** P1 · **Puntos:** 3
- **Dependencias:** S1-05 (Lista de categorías reales y OK de limpieza)
- **Criterios de aceptación:**
  1. Dado un registro con categoría «Jardinería y Plantas», cuando termina, entonces el negocio y sus productos nuevos la muestran.
  2. Checklist: las categorías de negocio salen de la lista aprobada por HOT_CLICK, no de la constante Tecnología/Ropa/Hogar.
  3. Checklist: la categoría del negocio se precarga en cada producto nuevo.
  4. Checklist: el cambio va en su propia rama y PR, con pruebas automáticas (mvn y vitest) en verde y revisión de Seguridad si toca pagos, permisos o datos personales.
  5. Dado que el PR está aprobado, cuando se quiere subir a producción, entonces solo se despliega con la aprobación manual de HOT_CLICK, con pg_dump y etiqueta de vuelta atrás hechos antes.
  6. Checklist: ningún secreto, llave ni dato personal queda en el código o en los logs, y ningún monto queda escrito en el código (sale del plan o de la configuración).
  7. Dado el cambio en staging, cuando QA lo prueba desde el navegador a 390 y 1440 px, entonces no hay errores 500 ni textos «[PENDIENTE]» en las pantallas tocadas.

#### S1-14 · Correo de verificación que llega y se puede reenviar (NP-3)
- **Historia:** Como vendedor Pyme o Negocio Plus quiero recibir el código de verificación y poder reenviarlo para activar un plan de pago cuando ya exista la pasarela.
- **Responsable:** Desarrollador
- **Prioridad:** P0 · **Puntos:** 3
- **Dependencias:** S1-67 (Entregabilidad del correo de no-reply@hotclick.lat)
- **Criterios de aceptación:**
  1. Dado un registro nuevo, cuando termina, entonces llega el correo de verificación en menos de 5 minutos (también a direcciones con «+»).
  2. Checklist: el botón «Reenviar» permite 3 envíos cada 5 minutos y avisa cuándo se puede volver a pedir.
  3. Dado un código verificado, cuando el usuario vuelve al panel, entonces el banner «Verificá tu correo» desaparece.
  4. Checklist: el cambio va en su propia rama y PR, con pruebas automáticas (mvn y vitest) en verde y revisión de Seguridad si toca pagos, permisos o datos personales.
  5. Dado que el PR está aprobado, cuando se quiere subir a producción, entonces solo se despliega con la aprobación manual de HOT_CLICK, con pg_dump y etiqueta de vuelta atrás hechos antes.
  6. Checklist: ningún secreto, llave ni dato personal queda en el código o en los logs, y ningún monto queda escrito en el código (sale del plan o de la configuración).
  7. Dado el cambio en staging, cuando QA lo prueba desde el navegador a 390 y 1440 px, entonces no hay errores 500 ni textos «[PENDIENTE]» en las pantallas tocadas.

#### S1-15 · Fichas «a cotizar» con botón de cotización y personalización
- **Historia:** Como comprador quiero ver «Pedir cotización» y un campo de personalización en los productos que lo necesitan para no comprar por error algo a ₡1 ni quedarme sin explicar lo que quiero.
- **Responsable:** Desarrollador
- **Prioridad:** P1 · **Puntos:** 3
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Dado un producto a cotizar, cuando abro la ficha, entonces no veo precio ni «Comprar ahora», sino «Pedir cotización».
  2. Dado un personalizado de rango o precio fijo, cuando lo agrego, entonces puedo escribir la personalización y adjuntar imágenes.
  3. Checklist: el checkout y el POS rechazan productos en modo cotización con un mensaje claro.
  4. Checklist: el cambio va en su propia rama y PR, con pruebas automáticas (mvn y vitest) en verde y revisión de Seguridad si toca pagos, permisos o datos personales.
  5. Dado que el PR está aprobado, cuando se quiere subir a producción, entonces solo se despliega con la aprobación manual de HOT_CLICK, con pg_dump y etiqueta de vuelta atrás hechos antes.
  6. Checklist: ningún secreto, llave ni dato personal queda en el código o en los logs, y ningún monto queda escrito en el código (sale del plan o de la configuración).
  7. Dado el cambio en staging, cuando QA lo prueba desde el navegador a 390 y 1440 px, entonces no hay errores 500 ni textos «[PENDIENTE]» en las pantallas tocadas.

#### S1-16 · «Comprar ahora» no deja el producto en el carrito
- **Historia:** Como comprador quiero que «Comprar ahora» me lleve directo a pagar sin dejar copia en el carrito para no encontrar productos repetidos después.
- **Responsable:** Desarrollador
- **Prioridad:** P2 · **Puntos:** 1
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Dado un carrito vacío, cuando toco «Comprar ahora» y termino la compra, entonces el carrito sigue vacío.
  2. Dado un carrito con otros productos, cuando uso «Comprar ahora», entonces esos productos siguen intactos.
  3. Checklist: prueba de front que cubre los dos casos.
  4. Checklist: el cambio va en su propia rama y PR, con pruebas automáticas (mvn y vitest) en verde y revisión de Seguridad si toca pagos, permisos o datos personales.
  5. Dado que el PR está aprobado, cuando se quiere subir a producción, entonces solo se despliega con la aprobación manual de HOT_CLICK, con pg_dump y etiqueta de vuelta atrás hechos antes.
  6. Checklist: ningún secreto, llave ni dato personal queda en el código o en los logs, y ningún monto queda escrito en el código (sale del plan o de la configuración).
  7. Dado el cambio en staging, cuando QA lo prueba desde el navegador a 390 y 1440 px, entonces no hay errores 500 ni textos «[PENDIENTE]» en las pantallas tocadas.

#### S1-17 · Dirección con menos clics
- **Historia:** Como comprador quiero que el checkout use la dirección guardada en mi cuenta y simplifique provincia, cantón y distrito para comprar en menos pasos.
- **Responsable:** Desarrollador
- **Prioridad:** P2 · **Puntos:** 3
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Dado un comprador con sesión, cuando abre el checkout, entonces se precargan nombre, correo, teléfono y la última dirección.
  2. Checklist: la selección de provincia filtra cantón y distrito automáticamente y recuerda la última elección.
  3. Checklist: el invitado sigue pudiendo escribir la dirección completa sin crear cuenta.
  4. Checklist: el cambio va en su propia rama y PR, con pruebas automáticas (mvn y vitest) en verde y revisión de Seguridad si toca pagos, permisos o datos personales.
  5. Dado que el PR está aprobado, cuando se quiere subir a producción, entonces solo se despliega con la aprobación manual de HOT_CLICK, con pg_dump y etiqueta de vuelta atrás hechos antes.
  6. Checklist: ningún secreto, llave ni dato personal queda en el código o en los logs, y ningún monto queda escrito en el código (sale del plan o de la configuración).
  7. Dado el cambio en staging, cuando QA lo prueba desde el navegador a 390 y 1440 px, entonces no hay errores 500 ni textos «[PENDIENTE]» en las pantallas tocadas.

#### S1-18 · Mensaje genérico para cédulas ya registradas
- **Historia:** Como dueño de HotClick quiero que el registro no diga «La identificación ya está registrada» para que nadie pueda averiguar si una cédula existe en HotClick.
- **Responsable:** Desarrollador
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Dado una cédula ya registrada, cuando alguien intenta registrarse, entonces ve un mensaje genérico y recibe instrucciones por correo.
  2. Checklist: la respuesta tarda lo mismo con cédula nueva o existente.
  3. Checklist: Seguridad aprueba el texto y el comportamiento.
  4. Checklist: el cambio va en su propia rama y PR, con pruebas automáticas (mvn y vitest) en verde y revisión de Seguridad si toca pagos, permisos o datos personales.
  5. Dado que el PR está aprobado, cuando se quiere subir a producción, entonces solo se despliega con la aprobación manual de HOT_CLICK, con pg_dump y etiqueta de vuelta atrás hechos antes.
  6. Checklist: ningún secreto, llave ni dato personal queda en el código o en los logs, y ningún monto queda escrito en el código (sale del plan o de la configuración).
  7. Dado el cambio en staging, cuando QA lo prueba desde el navegador a 390 y 1440 px, entonces no hay errores 500 ni textos «[PENDIENTE]» en las pantallas tocadas.

#### S1-19 · Botón «Aprobar» y ninguna tienda pública antes de aprobar
- **Historia:** Como admin de HotClick quiero aprobar cada negocio desde su ficha con el botón «Aprobar» para que ninguna tienda ni producto sea público antes de mi revisión.
- **Responsable:** Desarrollador
- **Prioridad:** P0 · **Puntos:** 3
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Dado un negocio pendiente, cuando un visitante abre /tienda/<slug>, entonces ve «Esta tienda no está disponible» y sus productos no salen en la portada, el buscador, los destacados, el carrusel ni las recomendaciones.
  2. Dado que el admin toca «Aprobar», cuando se confirma, entonces la tienda queda pública, se registra quién aprobó y cuándo, y el negocio recibe aviso.
  3. Checklist: aprobar NO crea nada en ONVO; si no hay cuenta de cobro aprobada, se muestra el aviso correspondiente.
  4. Checklist: destacados y carrusel públicos filtran visible_catalogo = TRUE (VIS-3b).
  5. Checklist: el cambio va en su propia rama y PR, con pruebas automáticas (mvn y vitest) en verde y revisión de Seguridad si toca pagos, permisos o datos personales.
  6. Dado que el PR está aprobado, cuando se quiere subir a producción, entonces solo se despliega con la aprobación manual de HOT_CLICK, con pg_dump y etiqueta de vuelta atrás hechos antes.
  7. Checklist: ningún secreto, llave ni dato personal queda en el código o en los logs, y ningún monto queda escrito en el código (sale del plan o de la configuración).
  8. Dado el cambio en staging, cuando QA lo prueba desde el navegador a 390 y 1440 px, entonces no hay errores 500 ni textos «[PENDIENTE]» en las pantallas tocadas.

#### S1-20 · Enlace completo de mi tienda con botón de copiar
- **Historia:** Como vendedor quiero ver en mi panel la dirección hotclick.lat/tienda/<slug> con un botón «Copiar» para compartir mi tienda sin armar la URL a mano.
- **Responsable:** Desarrollador
- **Prioridad:** P2 · **Puntos:** 2
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: el panel muestra la URL completa usando el componente CopiarLinkTienda.
  2. Dado que toco «Copiar», cuando pego el texto, entonces abre mi tienda.
  3. Dado que mi tienda está pendiente, cuando veo el enlace, entonces dice que todavía no es pública.
  4. Checklist: el cambio va en su propia rama y PR, con pruebas automáticas (mvn y vitest) en verde y revisión de Seguridad si toca pagos, permisos o datos personales.
  5. Dado que el PR está aprobado, cuando se quiere subir a producción, entonces solo se despliega con la aprobación manual de HOT_CLICK, con pg_dump y etiqueta de vuelta atrás hechos antes.
  6. Checklist: ningún secreto, llave ni dato personal queda en el código o en los logs, y ningún monto queda escrito en el código (sale del plan o de la configuración).
  7. Dado el cambio en staging, cuando QA lo prueba desde el navegador a 390 y 1440 px, entonces no hay errores 500 ni textos «[PENDIENTE]» en las pantallas tocadas.

#### S1-21 · Panel sin tarjetas vacías ni botones mudos
- **Historia:** Como vendedor quiero que las tarjetas del panel muestren números y que «Ya lo vinculé» de Telegram responda para entender mi negocio de un vistazo.
- **Responsable:** Desarrollador
- **Prioridad:** P2 · **Puntos:** 3
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: «Productos subidos» y «Encargos» muestran el conteo real (0 si no hay).
  2. Dado que toco «Ya lo vinculé» sin haber vinculado, cuando responde, entonces dice «Todavía no vemos tu cuenta de Telegram» con el paso siguiente.
  3. Checklist: desaparece el 404 a /api/emprendedor/negocio-rapido/onboarding en cada carga (NP-15).
  4. Checklist: el cambio va en su propia rama y PR, con pruebas automáticas (mvn y vitest) en verde y revisión de Seguridad si toca pagos, permisos o datos personales.
  5. Dado que el PR está aprobado, cuando se quiere subir a producción, entonces solo se despliega con la aprobación manual de HOT_CLICK, con pg_dump y etiqueta de vuelta atrás hechos antes.
  6. Checklist: ningún secreto, llave ni dato personal queda en el código o en los logs, y ningún monto queda escrito en el código (sale del plan o de la configuración).
  7. Dado el cambio en staging, cuando QA lo prueba desde el navegador a 390 y 1440 px, entonces no hay errores 500 ni textos «[PENDIENTE]» en las pantallas tocadas.

#### S1-22 · Sin datos demo en Notificaciones y Asistente Hot (NP-7, NP-8)
- **Historia:** Como vendedor nuevo quiero ver solo mis avisos reales y un Asistente Hot vacío o con mis datos para no creer que me falló un cobro o que vendí algo que no vendí.
- **Responsable:** Desarrollador
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Dado un negocio nuevo, cuando abre Notificaciones, entonces la lista está vacía o solo trae avisos reales suyos.
  2. Dado el Asistente Hot, cuando lo abre, entonces no aparece la conversación prearmada de «₡145.000 vendidos» ni productos ajenos.
  3. Checklist: Datos del negocio no muestra logo-qa2.png ni banner-qa2.jpg.
  4. Checklist: el cambio va en su propia rama y PR, con pruebas automáticas (mvn y vitest) en verde y revisión de Seguridad si toca pagos, permisos o datos personales.
  5. Dado que el PR está aprobado, cuando se quiere subir a producción, entonces solo se despliega con la aprobación manual de HOT_CLICK, con pg_dump y etiqueta de vuelta atrás hechos antes.
  6. Checklist: ningún secreto, llave ni dato personal queda en el código o en los logs, y ningún monto queda escrito en el código (sale del plan o de la configuración).
  7. Dado el cambio en staging, cuando QA lo prueba desde el navegador a 390 y 1440 px, entonces no hay errores 500 ni textos «[PENDIENTE]» en las pantallas tocadas.

#### S1-23 · El contador de cupos no baja si el registro falla (NP-16)
- **Historia:** Como visitante quiero que «Quedan N de 70 cupos» solo baje con registros exitosos para confiar en el número que veo.
- **Responsable:** Desarrollador
- **Prioridad:** P2 · **Puntos:** 1
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Dado un registro que falla por validación, cuando vuelvo a la página, entonces el contador sigue igual.
  2. Dado un registro exitoso, cuando vuelvo, entonces baja en uno.
  3. Checklist: prueba automática del caso de fallo.
  4. Checklist: el cambio va en su propia rama y PR, con pruebas automáticas (mvn y vitest) en verde y revisión de Seguridad si toca pagos, permisos o datos personales.
  5. Dado que el PR está aprobado, cuando se quiere subir a producción, entonces solo se despliega con la aprobación manual de HOT_CLICK, con pg_dump y etiqueta de vuelta atrás hechos antes.
  6. Checklist: ningún secreto, llave ni dato personal queda en el código o en los logs, y ningún monto queda escrito en el código (sale del plan o de la configuración).
  7. Dado el cambio en staging, cuando QA lo prueba desde el navegador a 390 y 1440 px, entonces no hay errores 500 ni textos «[PENDIENTE]» en las pantallas tocadas.

#### S1-24 · Consultas de limpieza de solo lectura
- **Historia:** Como admin de HotClick quiero tener las consultas de solo lectura de negocios QA-TEST y de los negocios viejos que V168 volvió públicos para decidir qué borrar o esconder con datos en mano.
- **Responsable:** Desarrollador
- **Prioridad:** P2 · **Puntos:** 2
- **Dependencias:** S1-05 (Lista de categorías reales y OK de limpieza)
- **Criterios de aceptación:**
  1. Checklist: las consultas solo leen (SELECT) y se guardan en /workspace/limpieza-1610/.
  2. Dado el resultado, cuando se le muestra a HOT_CLICK, entonces él marca qué se borra o se esconde.
  3. Checklist: el borrado real solo se hace con su OK y con pg_dump previo.
  4. Checklist: el cambio va en su propia rama y PR, con pruebas automáticas (mvn y vitest) en verde y revisión de Seguridad si toca pagos, permisos o datos personales.
  5. Dado que el PR está aprobado, cuando se quiere subir a producción, entonces solo se despliega con la aprobación manual de HOT_CLICK, con pg_dump y etiqueta de vuelta atrás hechos antes.
  6. Checklist: ningún secreto, llave ni dato personal queda en el código o en los logs, y ningún monto queda escrito en el código (sale del plan o de la configuración).
  7. Dado el cambio en staging, cuando QA lo prueba desde el navegador a 390 y 1440 px, entonces no hay errores 500 ni textos «[PENDIENTE]» en las pantallas tocadas.

### Sprint 1 · Diseño / UX (Figma)

#### S1-25 · Ficha del negocio en el admin: Aprobar, Activar y Destacar
- **Historia:** Como admin de HotClick quiero un boceto de la ficha del negocio con los botones Aprobar, Activar y Destacar y sus estados para moderar sin dudas.
- **Responsable:** Diseño / UX (Figma)
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: estados Pendiente, Aprobado, Pausado y Rechazado con color y texto.
  2. Checklist: confirmación antes de aprobar y aviso si el negocio no tiene cuenta de cobro.
  3. Checklist: espacio reservado para la sección ONVO del sprint 3.
  4. Checklist: el diseño está en Figma con marcos a 390 y 1440 px y notas de entrega para el Desarrollador.
  5. Checklist: contraste AA, foco visible y una sola llamada a la acción roja por pantalla.
  6. Checklist: los textos no inventan montos; donde falta uno dice «monto a definir por HOT_CLICK».
  7. Dado el boceto terminado, cuando lo revisan Producto y HOT_CLICK, entonces queda aprobado por escrito o con la lista de cambios anotada.

#### S1-26 · Registro con campos obligatorios a la vista
- **Historia:** Como vendedor quiero un registro donde lo obligatorio se ve y los opcionales lo son de verdad para registrarme sin errores con nombres técnicos.
- **Responsable:** Diseño / UX (Figma)
- **Prioridad:** P1 · **Puntos:** 3
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: nada de «telefonoAdmin» ni «telefonoEmpresa» en los mensajes; validación en línea en español.
  2. Checklist: sin +506 precargado en campos opcionales y la casilla de Tributación (ATV) sin marcar.
  3. Checklist: textos correctos por plan (Pyme y Negocio Plus no dicen «para emprendedores»).
  4. Checklist: el diseño está en Figma con marcos a 390 y 1440 px y notas de entrega para el Desarrollador.
  5. Checklist: contraste AA, foco visible y una sola llamada a la acción roja por pantalla.
  6. Checklist: los textos no inventan montos; donde falta uno dice «monto a definir por HOT_CLICK».
  7. Dado el boceto terminado, cuando lo revisan Producto y HOT_CLICK, entonces queda aprobado por escrito o con la lista de cambios anotada.

#### S1-27 · Guías que se muestran una sola vez
- **Historia:** Como vendedor quiero que las guías aparezcan una vez, no tapen botones y tengan «Omitir todas» para trabajar sin que me interrumpan.
- **Responsable:** Diseño / UX (Figma)
- **Prioridad:** P2 · **Puntos:** 2
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: la guía nunca tapa Eliminar, Ayuda ni el botón principal.
  2. Checklist: «Omitir» las apaga en todas las pantallas y se reactivan en Configuración → Guías.
  3. Checklist: la guía no aparece en pantallas de error ni de producto no encontrado.
  4. Checklist: el diseño está en Figma con marcos a 390 y 1440 px y notas de entrega para el Desarrollador.
  5. Checklist: contraste AA, foco visible y una sola llamada a la acción roja por pantalla.
  6. Checklist: los textos no inventan montos; donde falta uno dice «monto a definir por HOT_CLICK».
  7. Dado el boceto terminado, cuando lo revisan Producto y HOT_CLICK, entonces queda aprobado por escrito o con la lista de cambios anotada.

#### S1-28 · Carrusel de inicio probado con dispositivos reales
- **Historia:** Como comprador con lector de pantalla quiero probar el carrusel en teléfonos reales y con lector de pantalla para que cualquier persona pueda usar la portada.
- **Responsable:** Diseño / UX (Figma)
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: probado en un Android y un iPhone reales y con TalkBack o VoiceOver.
  2. Checklist: se puede pausar, se anuncia cada bloque y el foco no se pierde.
  3. Checklist: la lista de ajustes queda para el PR del carrusel, que sigue sin mergear.
  4. Checklist: el diseño está en Figma con marcos a 390 y 1440 px y notas de entrega para el Desarrollador.
  5. Checklist: contraste AA, foco visible y una sola llamada a la acción roja por pantalla.
  6. Checklist: los textos no inventan montos; donde falta uno dice «monto a definir por HOT_CLICK».
  7. Dado el boceto terminado, cuando lo revisan Producto y HOT_CLICK, entonces queda aprobado por escrito o con la lista de cambios anotada.

#### S1-29 · Checkout con pago y envío claros
- **Historia:** Como comprador quiero un boceto del checkout con SINPE Móvil y Tarjeta separados, contra entrega y la línea de envío en el total para saber cuánto pago y cómo.
- **Responsable:** Diseño / UX (Figma)
- **Prioridad:** P1 · **Puntos:** 3
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: envío normal GAM de ₡4.000 visible como línea en el resumen, igual en tienda y marketplace.
  2. Checklist: contra entrega aparece solo cuando todos los paquetes van por envío normal.
  3. Checklist: propuesta para DIS-3 (página de envíos con tarifas o remitir al carrito) lista para que decida HOT_CLICK.
  4. Checklist: el diseño está en Figma con marcos a 390 y 1440 px y notas de entrega para el Desarrollador.
  5. Checklist: contraste AA, foco visible y una sola llamada a la acción roja por pantalla.
  6. Checklist: los textos no inventan montos; donde falta uno dice «monto a definir por HOT_CLICK».
  7. Dado el boceto terminado, cuando lo revisan Producto y HOT_CLICK, entonces queda aprobado por escrito o con la lista de cambios anotada.

#### S1-30 · Bocetos sin «[PENDIENTE]» (DIS-1)
- **Historia:** Como vendedor quiero que los bocetos de checkout y alta de vendedor tengan los montos decididos para que el Desarrollador no copie marcadores.
- **Responsable:** Diseño / UX (Figma)
- **Prioridad:** P2 · **Puntos:** 1
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: Emprendedor 9 %; Pyme ₡12.900/mes + 7 %; Negocio Plus ₡28.900/mes + 7 %; mínimo ₡700.
  2. Checklist: ningún boceto dice «[PENDIENTE]».
  3. Checklist: lo que no esté decidido dice «monto a definir por HOT_CLICK».
  4. Checklist: el diseño está en Figma con marcos a 390 y 1440 px y notas de entrega para el Desarrollador.
  5. Checklist: contraste AA, foco visible y una sola llamada a la acción roja por pantalla.
  6. Checklist: los textos no inventan montos; donde falta uno dice «monto a definir por HOT_CLICK».
  7. Dado el boceto terminado, cuando lo revisan Producto y HOT_CLICK, entonces queda aprobado por escrito o con la lista de cambios anotada.

### Sprint 1 · QA (calidad)

#### S1-31 · Regresión completa después del deploy
- **Historia:** Como equipo quiero correr la lista «Qué debe revisar QA» del PR después del deploy para confirmar que la rama no rompió nada y que cerró lo prometido.
- **Responsable:** QA (calidad)
- **Prioridad:** P0 · **Puntos:** 5
- **Dependencias:** S1-10 (Preparar el deploy de fix/reverificacion-1610)
- **Criterios de aceptación:**
  1. Checklist: cubre checkout, pedidos de tienda propia, precios, POS, visibilidad, notificaciones, registro, guías y paginación.
  2. Dado cada punto de la lista, cuando se prueba, entonces queda OK, FALLA o BLOQUEADO con captura.
  3. Checklist: el informe se entrega a HOT_CLICK para el go/no-go.
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/calidad/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

#### S1-32 · Confirmar los 7 detalles del checkout
- **Historia:** Como equipo quiero confirmar en producción los 7 detalles del checkout reportados después del hotfix para cerrarlos o reabrirlos con evidencia.
- **Responsable:** QA (calidad)
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** S1-10 (Preparar el deploy de fix/reverificacion-1610)
- **Criterios de aceptación:**
  1. Checklist: invitado desde el marketplace sin cédula, producto 583 visible, envío igual, sesión respetada, estado del pago correcto, nombre del vendedor y aviso de versión nueva.
  2. Dado el 583, cuando no aparece, entonces se marca como dato del negocio y se pasa a HOT_CLICK.
  3. Checklist: cada detalle con estado final y captura.
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/calidad/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

#### S1-33 · Aclarar NP-7 y NP-8
- **Historia:** Como equipo quiero aclarar si NP-7 y NP-8 (datos demo) quedaron arreglados o no para quitar la contradicción del PR.
- **Responsable:** QA (calidad)
- **Prioridad:** P1 · **Puntos:** 1
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Dado un negocio nuevo, cuando abre Notificaciones y Asistente Hot, entonces se anota qué ve.
  2. Checklist: el resultado se cruza con lo que dice el PR («hecho» o «no incluido»).
  3. Checklist: si sigue, se abre un bug con prioridad P1.
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/calidad/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

#### S1-34 · Volver a probar el login con Google
- **Historia:** Como comprador quiero volver a probar el inicio de sesión con Google para confirmar que funciona en producción.
- **Responsable:** QA (calidad)
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** S1-10 (Preparar el deploy de fix/reverificacion-1610)
- **Criterios de aceptación:**
  1. Dado una cuenta de Google de prueba, cuando inicio sesión, entonces llego a la página de donde salí (respeta ?redirect=).
  2. Checklist: probado en Chrome de escritorio y en un teléfono.
  3. Checklist: cerrar sesión y volver a entrar funciona.
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/calidad/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

#### S1-35 · Correo de prueba legible para cuentas QA-TEST
- **Historia:** Como equipo quiero tener una casilla de prueba que se pueda leer para los códigos de verificación para terminar registros sin quedar bloqueados.
- **Responsable:** QA (calidad)
- **Prioridad:** P1 · **Puntos:** 1
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: casilla definida con HOT_CLICK y documentada en /workspace/qa/cuentas.md (sin contraseñas en el archivo).
  2. Dado un registro QA-TEST, cuando llega el código, entonces QA lo lee desde la web del correo.
  3. Checklist: alias con «+» probados.
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/calidad/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

#### S1-36 · Telegram de punta a punta con una persona real
- **Historia:** Como vendedor quiero probar la vinculación de Telegram con una persona real y su app para saber si los avisos por Telegram funcionan.
- **Responsable:** QA (calidad)
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** S1-10 (Preparar el deploy de fix/reverificacion-1610)
- **Criterios de aceptación:**
  1. Checklist: se genera el QR o enlace, la persona lo abre antes de 10 minutos y queda vinculada.
  2. Dado un pedido nuevo de prueba, cuando se crea, entonces llega el aviso por Telegram.
  3. Checklist: la persona la designa HOT_CLICK; no se usa WhatsApp API.
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/calidad/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

### Sprint 1 · QA Compradores

#### S1-37 · Comprar como invitado desde el marketplace sin cédula
- **Historia:** Como comprador invitado quiero comprar como invitado desde el marketplace sin que me pidan cédula para terminar la compra como cualquier persona.
- **Responsable:** QA Compradores
- **Prioridad:** P0 · **Puntos:** 3
- **Dependencias:** S1-10 (Preparar el deploy de fix/reverificacion-1610)
- **Criterios de aceptación:**
  1. Dado un producto del marketplace, cuando compro como invitado, entonces se crea el pedido y veo su número.
  2. Checklist: ningún paso pide cédula ni comprobante SINPE.
  3. Checklist: la compra se repite en las tres tiendas QA-TEST.
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/compradores/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

#### S1-38 · Compra con cuenta que autocompleta mis datos
- **Historia:** Como comprador con cuenta quiero que el checkout de la tienda use mi sesión y llene mis datos para no escribir dos veces lo mismo.
- **Responsable:** QA Compradores
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** S1-10 (Preparar el deploy de fix/reverificacion-1610)
- **Criterios de aceptación:**
  1. Dado que inicié sesión, cuando abro el checkout desde una tienda, entonces aparecen mi nombre, correo y teléfono.
  2. Checklist: el pedido aparece en /mis-pedidos con estado claro.
  3. Checklist: el detalle dice «pago pendiente (SINPE Móvil)» y no «pagado» cuando no hay pago.
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/compradores/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

#### S1-39 · Envío igual en tienda y marketplace
- **Historia:** Como comprador quiero ver el mismo costo de envío normal desde la tienda y desde el marketplace para no pagar distinto según por dónde entre.
- **Responsable:** QA Compradores
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** S1-10 (Preparar el deploy de fix/reverificacion-1610)
- **Criterios de aceptación:**
  1. Dado el mismo producto, cuando lo compro desde la tienda y desde el marketplace, entonces el envío normal GAM es ₡4.000 en los dos.
  2. Checklist: el total incluye el envío en la línea «Envío».
  3. Checklist: la estimación del carrito coincide con el total final.
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/compradores/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

#### S1-40 · Contra entrega en envío normal
- **Historia:** Como comprador quiero elegir contra entrega cuando mi pedido va por envío normal para pagar al recibir.
- **Responsable:** QA Compradores
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** S1-10 (Preparar el deploy de fix/reverificacion-1610)
- **Criterios de aceptación:**
  1. Dado un carrito solo con envío normal, cuando llego al pago, entonces veo «Contra entrega».
  2. Dado un carrito con otro tipo de envío, cuando llego al pago, entonces no aparece.
  3. Checklist: el pedido con contra entrega queda creado y visible para el vendedor.
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/compradores/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

#### S1-41 · Doble clic en «Pagar» crea un solo pedido
- **Historia:** Como comprador quiero que un doble clic en «Pagar» no cree dos pedidos para no recibir cobros ni reservas duplicadas.
- **Responsable:** QA Compradores
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** S1-10 (Preparar el deploy de fix/reverificacion-1610)
- **Criterios de aceptación:**
  1. Dado el checkout lleno, cuando hago doble clic rápido en «Pagar», entonces se crea un solo pedido.
  2. Dado que intento comprar más de 3 unidades de un producto como invitado, cuando confirmo, entonces veo un mensaje claro.
  3. Checklist: se revisa /mis-pedidos y el panel del vendedor para confirmar un solo pedido.
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/compradores/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

#### S1-42 · Productos «a cotizar» no se venden a ₡1
- **Historia:** Como comprador quiero que un producto a cotizar no se pueda comprar a ₡1 para pedir cotización como corresponde.
- **Responsable:** QA Compradores
- **Prioridad:** P1 · **Puntos:** 1
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Dado un producto a cotizar, cuando abro la ficha, entonces no hay «Comprar ahora» ni precio de ₡1.
  2. Checklist: el botón «Pedir cotización» abre el formulario y la consulta llega al vendedor.
  3. Checklist: el personalizado de rango tiene campo de personalización.
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/compradores/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

#### S1-43 · Re-probar los ítems del comprador que siguen abiertos
- **Historia:** Como comprador quiero volver a probar después del deploy los ítems del comprador que seguían abiertos para cerrarlos o reabrirlos con evidencia.
- **Responsable:** QA Compradores
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** S1-10 (Preparar el deploy de fix/reverificacion-1610)
- **Criterios de aceptación:**
  1. Checklist: PAG-8 (cancelar un SINPE recién creado), CMP-2 (cupón inválido avisa), CMP-3 (página fuera de rango sin 500), CMP-4 (bodega de otra tienda rechazada), ESC-7 (pedido ajeno con 404 claro), LAN-5 (fotos y video de /emprende) y LAN-10 (enlace inválido con explicación).
  2. Checklist: el buscador y el asistente muestran el nombre de la tienda con su enlace y no «HotClick» como vendedor.
  3. Checklist: cada ítem con estado final OK, FALLA o BLOQUEADO y captura.
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/compradores/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

### Sprint 1 · QA Negocios

#### S1-44 · Registro de los 3 planes con precios correctos
- **Historia:** Como vendedor nuevo quiero registrar negocios Emprendedor, Pyme y Negocio Plus y ver los precios reales para confirmar que nadie ve «[PENDIENTE]» ni precios viejos.
- **Responsable:** QA Negocios
- **Prioridad:** P0 · **Puntos:** 3
- **Dependencias:** S1-10 (Preparar el deploy de fix/reverificacion-1610)
- **Criterios de aceptación:**
  1. Checklist: /vender, /planes, landings y Tu Plan dicen Emprendedor 9 %, Pyme ₡12.900/mes + 7 %, Negocio Plus ₡28.900/mes + 7 % y mínimo ₡700.
  2. Checklist: no aparecen los precios viejos con «+ 4 %» por venta.
  3. Checklist: el pie no dice «sin mensualidad» en planes pagos.
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/negocios/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

#### S1-45 · Aviso «Completar pago» y reenvío del código
- **Historia:** Como vendedor Pyme quiero ver «Elegiste el plan X y falta el pago · Completar pago» y poder reenviar el código para entender por qué sigo en Emprendedor.
- **Responsable:** QA Negocios
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** S1-10 (Preparar el deploy de fix/reverificacion-1610)
- **Criterios de aceptación:**
  1. Dado un registro con plan Pyme, cuando entro al panel, entonces veo el aviso y sigo en Emprendedor hasta que haya pago confirmado.
  2. Checklist: «Reenviar» manda el código y se limita a 3 cada 5 minutos.
  3. Checklist: el aviso se oculta si ya estoy en ese plan.
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/negocios/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

#### S1-46 · POS: historial, cotizables y Emprendedor
- **Historia:** Como vendedor quiero probar el POS después del deploy para vender en caja sin errores.
- **Responsable:** QA Negocios
- **Prioridad:** P1 · **Puntos:** 3
- **Dependencias:** S1-11 (POS incluido en Emprendedor (V174, 1 caja))
- **Criterios de aceptación:**
  1. Checklist: el historial muestra la venta recién hecha, sin 500 y con el monto correcto.
  2. Checklist: un producto a cotizar no se puede vender (ni por QR).
  3. Checklist: un Emprendedor ve el POS con 1 caja (después de V174).
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/negocios/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

#### S1-47 · Detalle del pedido con datos del invitado y acciones
- **Historia:** Como vendedor quiero ver nombre, teléfono, correo y dirección del invitado y poder confirmar el pago o cancelar para gestionar mis pedidos de tienda propia.
- **Responsable:** QA Negocios
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** S1-10 (Preparar el deploy de fix/reverificacion-1610)
- **Criterios de aceptación:**
  1. Dado un pedido de tienda propia, cuando lo abro, entonces veo los datos de entrega del invitado.
  2. Checklist: «Confirmar pago recibido» y «Cancelar pedido» funcionan y cancelar devuelve el stock.
  3. Checklist: el pedido reserva stock al crearse y se cancela solo a las 72 h si nadie lo confirma (se verifica con un pedido viejo).
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/negocios/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

#### S1-48 · Tienda pendiente no es pública hasta «Aprobar»
- **Historia:** Como vendedor quiero comprobar que mi tienda no se ve antes de que el admin la apruebe para que el público solo vea tiendas revisadas.
- **Responsable:** QA Negocios
- **Prioridad:** P0 · **Puntos:** 2
- **Dependencias:** S1-19 (Botón «Aprobar» y ninguna tienda pública antes de aprobar)
- **Criterios de aceptación:**
  1. Dado un negocio recién creado, cuando un visitante busca la tienda o sus productos, entonces no los encuentra.
  2. Dado que el admin toca «Aprobar», cuando recargo, entonces la tienda y los productos publicados aparecen.
  3. Checklist: el vendedor ve en su panel por qué sus productos están pausados y qué falta.
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/negocios/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

#### S1-49 · Límites del plan Emprendedor en la web
- **Historia:** Como vendedor Emprendedor quiero comprobar que el Emprendedor no ve CRM ni sucursales y no puede poner Instagram o TikTok para que cada plan tenga lo que promete.
- **Responsable:** QA Negocios
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** S1-10 (Preparar el deploy de fix/reverificacion-1610)
- **Criterios de aceptación:**
  1. Checklist: CRM y sucursales no aparecen en el menú y, si se entra por el enlace, se ve un mensaje de plan.
  2. Checklist: videos de Instagram o TikTok se rechazan con mensaje claro.
  3. Checklist: la tienda pública Emprendedor no muestra ningún contacto del vendedor.
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/negocios/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

#### S1-50 · Re-probar los ítems del vendedor que siguen abiertos
- **Historia:** Como vendedor quiero volver a probar después del deploy los ítems del vendedor que seguían abiertos para confirmar qué quedó arreglado.
- **Responsable:** QA Negocios
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** S1-10 (Preparar el deploy de fix/reverificacion-1610)
- **Criterios de aceptación:**
  1. Checklist: WhatsApp rechaza texto (como «QA-TEST abc») y acepta 8 dígitos o 506 + 8 dígitos.
  2. Checklist: importar la plantilla CSV da éxito o errores por fila, sin 500 (ESC-9).
  3. Checklist: teléfono opcional vacío no falla, pegar «+506 XXXX-XXXX (número de ejemplo)» funciona y la casilla ATV viene sin marcar.
  4. Checklist: doble clic en Continuar del asistente de Datos no guarda dos veces.
  5. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  6. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/negocios/.
  7. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  8. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

### Sprint 1 · QA Automatización y Regresión

#### S1-51 · Inventario de pruebas de navegador
- **Historia:** Como equipo quiero un inventario de las pruebas de navegador que existen, las que corren en CI y las que faltan para saber qué automatizar primero.
- **Responsable:** QA Automatización y Regresión
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: lista de las 7 que corren en CI, las 12 que existen fuera de CI y las 5 nuevas que faltan.
  2. Checklist: cada una con flujo, prioridad y si sigue vigente.
  3. Checklist: la lista se entrega al Desarrollador para que él las meta al CI.
  4. Checklist: el guion solo maneja el navegador (clics, formularios y lectura de pantalla); no llama a la API, no toca la base de datos ni el servidor y no modifica el código del repo.
  5. Checklist: el guion vive en /workspace/qa/regresion/ y corre a 390 y 1440 px, con captura de cada paso que falle.
  6. Dado tres corridas seguidas sin cambios en el sitio, cuando se comparan, entonces dan el mismo resultado (menos de 1 prueba inestable por corrida).
  7. Checklist: el resultado (verde o rojo, con la lista de fallos) queda en un informe fechado y los fallos se reportan al Desarrollador.

#### S1-52 · Guion web de regresión del checkout
- **Historia:** Como equipo quiero un guion de navegador que compre como invitado y con cuenta, desde tienda y marketplace para detectar en minutos si el checkout se rompe.
- **Responsable:** QA Automatización y Regresión
- **Prioridad:** P0 · **Puntos:** 3
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: cubre invitado, con cuenta, contra entrega y doble clic.
  2. Checklist: se detiene antes de cualquier pago real.
  3. Checklist: corre contra producción solo con cuentas QA-TEST y contra staging cuando exista.
  4. Checklist: el guion solo maneja el navegador (clics, formularios y lectura de pantalla); no llama a la API, no toca la base de datos ni el servidor y no modifica el código del repo.
  5. Checklist: el guion vive en /workspace/qa/regresion/ y corre a 390 y 1440 px, con captura de cada paso que falle.
  6. Dado tres corridas seguidas sin cambios en el sitio, cuando se comparan, entonces dan el mismo resultado (menos de 1 prueba inestable por corrida).
  7. Checklist: el resultado (verde o rojo, con la lista de fallos) queda en un informe fechado y los fallos se reportan al Desarrollador.

#### S1-53 · Guion web de registro de negocios
- **Historia:** Como equipo quiero un guion que registre los tres planes y revise precios y avisos para no volver a publicar «[PENDIENTE]».
- **Responsable:** QA Automatización y Regresión
- **Prioridad:** P1 · **Puntos:** 3
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: revisa precios en /vender, /planes y Tu Plan.
  2. Checklist: revisa el aviso «Completar pago».
  3. Checklist: deja los negocios QA-TEST anotados para limpieza.
  4. Checklist: el guion solo maneja el navegador (clics, formularios y lectura de pantalla); no llama a la API, no toca la base de datos ni el servidor y no modifica el código del repo.
  5. Checklist: el guion vive en /workspace/qa/regresion/ y corre a 390 y 1440 px, con captura de cada paso que falle.
  6. Dado tres corridas seguidas sin cambios en el sitio, cuando se comparan, entonces dan el mismo resultado (menos de 1 prueba inestable por corrida).
  7. Checklist: el resultado (verde o rojo, con la lista de fallos) queda en un informe fechado y los fallos se reportan al Desarrollador.

#### S1-54 · Guion web del POS
- **Historia:** Como equipo quiero un guion que haga una venta en efectivo y revise el historial para detectar el 500 del historial si vuelve.
- **Responsable:** QA Automatización y Regresión
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: venta en efectivo con producto de stock conocido.
  2. Checklist: verifica que el stock baja y que el historial muestra la venta.
  3. Checklist: intenta vender un cotizable y espera el rechazo.
  4. Checklist: el guion solo maneja el navegador (clics, formularios y lectura de pantalla); no llama a la API, no toca la base de datos ni el servidor y no modifica el código del repo.
  5. Checklist: el guion vive en /workspace/qa/regresion/ y corre a 390 y 1440 px, con captura de cada paso que falle.
  6. Dado tres corridas seguidas sin cambios en el sitio, cuando se comparan, entonces dan el mismo resultado (menos de 1 prueba inestable por corrida).
  7. Checklist: el resultado (verde o rojo, con la lista de fallos) queda en un informe fechado y los fallos se reportan al Desarrollador.

#### S1-55 · Smoke de 10 minutos después de cada deploy
- **Historia:** Como equipo quiero un smoke corto que corra apenas termina un deploy para saber si hay que volver atrás.
- **Responsable:** QA Automatización y Regresión
- **Prioridad:** P0 · **Puntos:** 2
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: home, búsqueda, ficha, carrito, checkout hasta antes de pagar, login y panel de vendedor.
  2. Dado un fallo en el smoke, cuando termina, entonces el informe recomienda volver atrás y avisa a DevOps.
  3. Checklist: dura menos de 10 minutos.
  4. Checklist: el guion solo maneja el navegador (clics, formularios y lectura de pantalla); no llama a la API, no toca la base de datos ni el servidor y no modifica el código del repo.
  5. Checklist: el guion vive en /workspace/qa/regresion/ y corre a 390 y 1440 px, con captura de cada paso que falle.
  6. Dado tres corridas seguidas sin cambios en el sitio, cuando se comparan, entonces dan el mismo resultado (menos de 1 prueba inestable por corrida).
  7. Checklist: el resultado (verde o rojo, con la lista de fallos) queda en un informe fechado y los fallos se reportan al Desarrollador.

### Sprint 1 · Seguridad

#### S1-56 · Revisión de seguridad del PR antes del deploy
- **Historia:** Como dueño de HotClick quiero una revisión de seguridad de fix/reverificacion-1610 para desplegar sin abrir huecos.
- **Responsable:** Seguridad
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: gate-tenant, secretos, CSP y permisos por rol revisados.
  2. Checklist: Stripe ya no es pasarela por defecto (si no viene método de pago, se rechaza).
  3. Dado el resultado, cuando hay un alto, entonces el deploy espera.
  4. Checklist: informe corto en /workspace/seguridad/ con cada hallazgo, su gravedad (crítico, alto, medio o bajo) y el arreglo propuesto.
  5. Dado el informe, cuando se cierra la historia, entonces no queda ningún hallazgo crítico ni alto abierto sin plan y sin dueño.
  6. Checklist: no se hacen ataques ni pruebas destructivas en producción; lo que se prueba en vivo se hace con cuentas QA-TEST y con OK de HOT_CLICK.
  7. Checklist: ninguna llave, secreto ni dato personal se copia al informe ni al chat.

#### S1-57 · Confirmar SEG-F y PAG-4 en producción
- **Historia:** Como dueño de HotClick quiero confirmar en producción que el doble pedido y la reserva de todo el stock quedaron cerrados para dormir tranquilo con el checkout de invitado.
- **Responsable:** Seguridad
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** S1-10 (Preparar el deploy de fix/reverificacion-1610)
- **Criterios de aceptación:**
  1. Checklist: topes de 3 unidades por producto y 6 pendientes por IP o correo en 30 minutos verificados con cuentas QA-TEST.
  2. Checklist: idempotencia confirmada con doble envío del mismo pedido.
  3. Checklist: queda anotado que Turnstile sigue pendiente de las llaves.
  4. Checklist: informe corto en /workspace/seguridad/ con cada hallazgo, su gravedad (crítico, alto, medio o bajo) y el arreglo propuesto.
  5. Dado el informe, cuando se cierra la historia, entonces no queda ningún hallazgo crítico ni alto abierto sin plan y sin dueño.
  6. Checklist: no se hacen ataques ni pruebas destructivas en producción; lo que se prueba en vivo se hace con cuentas QA-TEST y con OK de HOT_CLICK.
  7. Checklist: ninguna llave, secreto ni dato personal se copia al informe ni al chat.

#### S1-58 · Validar el arreglo de enumeración de cédulas
- **Historia:** Como dueño de HotClick quiero validar el nuevo mensaje del registro para que no se pueda averiguar si una cédula existe.
- **Responsable:** Seguridad
- **Prioridad:** P1 · **Puntos:** 1
- **Dependencias:** S1-18 (Mensaje genérico para cédulas ya registradas)
- **Criterios de aceptación:**
  1. Checklist: mismo mensaje y tiempo de respuesta con cédula nueva y existente.
  2. Checklist: clasificación con gravedad final.
  3. Checklist: caso agregado a la regresión.
  4. Checklist: informe corto en /workspace/seguridad/ con cada hallazgo, su gravedad (crítico, alto, medio o bajo) y el arreglo propuesto.
  5. Dado el informe, cuando se cierra la historia, entonces no queda ningún hallazgo crítico ni alto abierto sin plan y sin dueño.
  6. Checklist: no se hacen ataques ni pruebas destructivas en producción; lo que se prueba en vivo se hace con cuentas QA-TEST y con OK de HOT_CLICK.
  7. Checklist: ninguna llave, secreto ni dato personal se copia al informe ni al chat.

#### S1-59 · Código ONVO viejo no simula cobros (PAG-6)
- **Historia:** Como dueño de HotClick quiero confirmar que con el secreto vacío el código ONVO viejo no da planes pagos gratis en producción para que nadie tenga un plan pago sin pagar.
- **Responsable:** Seguridad
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: revisión del código de OnvoBillingClient y SuscripcionOnvoChangeService.
  2. Checklist: DevOps confirma el valor de la variable sin mostrarlo.
  3. Checklist: si simula, se abre un arreglo P0 que falla cerrado.
  4. Checklist: informe corto en /workspace/seguridad/ con cada hallazgo, su gravedad (crítico, alto, medio o bajo) y el arreglo propuesto.
  5. Dado el informe, cuando se cierra la historia, entonces no queda ningún hallazgo crítico ni alto abierto sin plan y sin dueño.
  6. Checklist: no se hacen ataques ni pruebas destructivas en producción; lo que se prueba en vivo se hace con cuentas QA-TEST y con OK de HOT_CLICK.
  7. Checklist: ninguna llave, secreto ni dato personal se copia al informe ni al chat.

#### S1-60 · Comprobantes SINPE viejos sin acceso público (PAG-9)
- **Historia:** Como comprador quiero que los comprobantes SINPE viejos no se puedan abrir con solo tener la URL para proteger los datos de los compradores.
- **Responsable:** Seguridad
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: plan para moverlos a almacenamiento privado con URL firmada o acceso de admin.
  2. Checklist: el Desarrollador tiene la historia del arreglo.
  3. Checklist: se verifica que una URL vieja ya no abre sin sesión.
  4. Checklist: informe corto en /workspace/seguridad/ con cada hallazgo, su gravedad (crítico, alto, medio o bajo) y el arreglo propuesto.
  5. Dado el informe, cuando se cierra la historia, entonces no queda ningún hallazgo crítico ni alto abierto sin plan y sin dueño.
  6. Checklist: no se hacen ataques ni pruebas destructivas en producción; lo que se prueba en vivo se hace con cuentas QA-TEST y con OK de HOT_CLICK.
  7. Checklist: ninguna llave, secreto ni dato personal se copia al informe ni al chat.

#### S1-61 · Verificar la rotación de la Google API key
- **Historia:** Como dueño de HotClick quiero verificar que la llave vieja ya no funciona y que la nueva tiene restricciones para cerrar SEG-A.
- **Responsable:** Seguridad
- **Prioridad:** P0 · **Puntos:** 1
- **Dependencias:** S1-02 (Rotar la Google API key expuesta (SEG-A))
- **Criterios de aceptación:**
  1. Checklist: la llave vieja responde como revocada.
  2. Checklist: la nueva solo sirve para hotclick.lat y las APIs necesarias.
  3. Checklist: mapas y ubicación siguen funcionando en el sitio.
  4. Checklist: informe corto en /workspace/seguridad/ con cada hallazgo, su gravedad (crítico, alto, medio o bajo) y el arreglo propuesto.
  5. Dado el informe, cuando se cierra la historia, entonces no queda ningún hallazgo crítico ni alto abierto sin plan y sin dueño.
  6. Checklist: no se hacen ataques ni pruebas destructivas en producción; lo que se prueba en vivo se hace con cuentas QA-TEST y con OK de HOT_CLICK.
  7. Checklist: ninguna llave, secreto ni dato personal se copia al informe ni al chat.

### Sprint 1 · DevOps y Seguridad

#### S1-62 · Publicar la app solo en 127.0.0.1:8080 (#123)
- **Historia:** Como dueño de HotClick quiero cambiar docker-compose.prod.yml a 127.0.0.1:8080:8080 en la ventana aprobada para que el puerto 8080 no quede abierto a internet.
- **Responsable:** DevOps y Seguridad
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** S1-06 (Ventana para cerrar el puerto 8080 (#123))
- **Criterios de aceptación:**
  1. Checklist: nginx apunta a 127.0.0.1:8080 antes del cambio.
  2. Dado el reinicio, cuando termina, entonces el puerto 8080 no responde desde afuera y el sitio sí por 443.
  3. Checklist: el corte real se mide y se reporta.
  4. Checklist: el cambio queda documentado en un runbook en /workspace/infra/ con los pasos para hacerlo y para deshacerlo.
  5. Dado cualquier paso que toque producción, cuando está listo, entonces espera la aprobación manual de HOT_CLICK antes de ejecutarse.
  6. Checklist: los secretos se guardan en los secretos del servidor o de GitHub, nunca en el repo, en el chat ni en los logs.
  7. Dado el cambio aplicado, cuando se revisa el monitoreo, entonces el sitio responde y /api/health está en verde.

#### S1-63 · Backup cifrado manual antes del deploy
- **Historia:** Como dueño de HotClick quiero un pg_dump cifrado y verificado antes de desplegar para poder volver atrás si algo sale mal.
- **Responsable:** DevOps y Seguridad
- **Prioridad:** P0 · **Puntos:** 2
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: el dump se cifra con una clave que no está en el repo.
  2. Checklist: se restaura en una base temporal y se cuentan tablas y filas clave.
  3. Checklist: queda una copia fuera del servidor.
  4. Checklist: el cambio queda documentado en un runbook en /workspace/infra/ con los pasos para hacerlo y para deshacerlo.
  5. Dado cualquier paso que toque producción, cuando está listo, entonces espera la aprobación manual de HOT_CLICK antes de ejecutarse.
  6. Checklist: los secretos se guardan en los secretos del servidor o de GitHub, nunca en el repo, en el chat ni en los logs.
  7. Dado el cambio aplicado, cuando se revisa el monitoreo, entonces el sitio responde y /api/health está en verde.

#### S1-64 · Deploy de fix/reverificacion-1610 con aprobación
- **Historia:** Como dueño de HotClick quiero ejecutar el deploy de la rama en la ventana aprobada para que los arreglos lleguen al sitio.
- **Responsable:** DevOps y Seguridad
- **Prioridad:** P0 · **Puntos:** 3
- **Dependencias:** S1-10 (Preparar el deploy de fix/reverificacion-1610); S1-63 (Backup cifrado manual antes del deploy); S1-56 (Revisión de seguridad del PR antes del deploy)
- **Criterios de aceptación:**
  1. Dado la aprobación manual de HOT_CLICK, cuando se despliega, entonces queda la etiqueta de vuelta atrás.
  2. Checklist: el smoke de 10 minutos corre apenas termina.
  3. Checklist: logs revisados por 30 minutos sin errores nuevos.
  4. Checklist: el cambio queda documentado en un runbook en /workspace/infra/ con los pasos para hacerlo y para deshacerlo.
  5. Dado cualquier paso que toque producción, cuando está listo, entonces espera la aprobación manual de HOT_CLICK antes de ejecutarse.
  6. Checklist: los secretos se guardan en los secretos del servidor o de GitHub, nunca en el repo, en el chat ni en los logs.
  7. Dado el cambio aplicado, cuando se revisa el monitoreo, entonces el sitio responde y /api/health está en verde.

#### S1-65 · Logs que no llenan el disco (QA-CONC-6)
- **Historia:** Como equipo quiero rotación de logs y alerta de disco para que un montón de errores no tumbe el servidor.
- **Responsable:** DevOps y Seguridad
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: logback con stack recortado y rotación en producción.
  2. Checklist: alerta cuando el disco pasa del 80 %.
  3. Checklist: el tamaño por error baja frente a los ~35 KB de antes.
  4. Checklist: el cambio queda documentado en un runbook en /workspace/infra/ con los pasos para hacerlo y para deshacerlo.
  5. Dado cualquier paso que toque producción, cuando está listo, entonces espera la aprobación manual de HOT_CLICK antes de ejecutarse.
  6. Checklist: los secretos se guardan en los secretos del servidor o de GitHub, nunca en el repo, en el chat ni en los logs.
  7. Dado el cambio aplicado, cuando se revisa el monitoreo, entonces el sitio responde y /api/health está en verde.

#### S1-66 · Cargar la Google API key nueva como secreto
- **Historia:** Como equipo quiero cargar la llave nueva en los secretos del servidor para que el sitio use la llave rotada.
- **Responsable:** DevOps y Seguridad
- **Prioridad:** P0 · **Puntos:** 1
- **Dependencias:** S1-02 (Rotar la Google API key expuesta (SEG-A))
- **Criterios de aceptación:**
  1. Checklist: la llave nunca aparece en el chat ni en el repo.
  2. Checklist: reinicio controlado o recarga de configuración con el OK de HOT_CLICK.
  3. Checklist: mapa de la bodega funcionando después del cambio.
  4. Checklist: el cambio queda documentado en un runbook en /workspace/infra/ con los pasos para hacerlo y para deshacerlo.
  5. Dado cualquier paso que toque producción, cuando está listo, entonces espera la aprobación manual de HOT_CLICK antes de ejecutarse.
  6. Checklist: los secretos se guardan en los secretos del servidor o de GitHub, nunca en el repo, en el chat ni en los logs.
  7. Dado el cambio aplicado, cuando se revisa el monitoreo, entonces el sitio responde y /api/health está en verde.

#### S1-67 · Entregabilidad del correo de no-reply@hotclick.lat
- **Historia:** Como vendedor quiero revisar SPF, DKIM, DMARC y los logs de envío del correo de verificación para que los códigos lleguen a la bandeja de entrada.
- **Responsable:** DevOps y Seguridad
- **Prioridad:** P0 · **Puntos:** 2
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: SPF, DKIM y DMARC válidos para el dominio que envía.
  2. Checklist: los logs muestran el envío sin datos personales completos.
  3. Checklist: prueba a Gmail, Outlook y una casilla con «+».
  4. Checklist: el cambio queda documentado en un runbook en /workspace/infra/ con los pasos para hacerlo y para deshacerlo.
  5. Dado cualquier paso que toque producción, cuando está listo, entonces espera la aprobación manual de HOT_CLICK antes de ejecutarse.
  6. Checklist: los secretos se guardan en los secretos del servidor o de GitHub, nunca en el repo, en el chat ni en los logs.
  7. Dado el cambio aplicado, cuando se revisa el monitoreo, entonces el sitio responde y /api/health está en verde.

#### S1-68 · Llaves de Turnstile cargadas y apagadas
- **Historia:** Como equipo quiero cargar las llaves de Turnstile en los secretos con la función apagada para encenderla después de probarla en staging.
- **Responsable:** DevOps y Seguridad
- **Prioridad:** P1 · **Puntos:** 1
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: llaves entregadas por HOT_CLICK por canal seguro.
  2. Checklist: hotclick.checkout.turnstile.habilitado sigue en false hasta la prueba.
  3. Checklist: runbook para encenderla y apagarla.
  4. Checklist: el cambio queda documentado en un runbook en /workspace/infra/ con los pasos para hacerlo y para deshacerlo.
  5. Dado cualquier paso que toque producción, cuando está listo, entonces espera la aprobación manual de HOT_CLICK antes de ejecutarse.
  6. Checklist: los secretos se guardan en los secretos del servidor o de GitHub, nunca en el repo, en el chat ni en los logs.
  7. Dado el cambio aplicado, cuando se revisa el monitoreo, entonces el sitio responde y /api/health está en verde.

### Sprint 1 · Producto Contenido y Soporte

#### S1-69 · Textos LEG-1 a LEG-3 para aprobar
- **Historia:** Como dueño de HotClick quiero los textos para quitar el banner «[REVISIÓN LEGAL]», poner retracto de 8 días hábiles y respuesta a datos personales en 5 días hábiles para publicar páginas legales sin marcadores.
- **Responsable:** Producto Contenido y Soporte
- **Prioridad:** P0 · **Puntos:** 2
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: el retracto se verifica con el texto oficial del Reglamento de la Ley 7472.
  2. Checklist: las 5 páginas legales y el onboarding quedan sin «[REVISIÓN LEGAL]» una vez aprobadas.
  3. Checklist: lo que siga sin decidir queda marcado para el abogado.
  4. Checklist: el texto está en español de Costa Rica, con voseo, claro y sin jerga técnica.
  5. Checklist: no inventa montos; usa solo los decididos por HOT_CLICK o dice «monto a definir por HOT_CLICK».
  6. Dado el texto final, cuando HOT_CLICK lo revisa, entonces se publica solo con su aprobación escrita.
  7. Checklist: no promete WhatsApp API, no usa Meta Pixel y no presenta a Tilopay como pasarela vigente una vez que ONVO esté en uso.

#### S1-70 · Correo de bienvenida para tiendas piloto
- **Historia:** Como vendedor piloto quiero un correo de bienvenida con los pasos de la beta para arrancar sin perderme.
- **Responsable:** Producto Contenido y Soporte
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** S1-09 (Go/no-go de la beta piloto y tiendas elegidas)
- **Criterios de aceptación:**
  1. Checklist: explica que por ahora no hay pago en línea y cómo se cobra (efectivo, retiro, contra entrega, confirmar pago).
  2. Checklist: incluye soporte oficial (pendiente de LEG-6 y LEG-7 si no están).
  3. Checklist: lo envía HOT_CLICK; ningún bot le escribe a las tiendas.
  4. Checklist: el texto está en español de Costa Rica, con voseo, claro y sin jerga técnica.
  5. Checklist: no inventa montos; usa solo los decididos por HOT_CLICK o dice «monto a definir por HOT_CLICK».
  6. Dado el texto final, cuando HOT_CLICK lo revisa, entonces se publica solo con su aprobación escrita.
  7. Checklist: no promete WhatsApp API, no usa Meta Pixel y no presenta a Tilopay como pasarela vigente una vez que ONVO esté en uso.

#### S1-71 · Documentos que todavía dicen «solo Tilopay»
- **Historia:** Como equipo quiero corregir finanzas/planes_pendientes.md y la dependencia 5 de onvo-scrum.md para que nadie trabaje con una regla vieja.
- **Responsable:** Producto Contenido y Soporte
- **Prioridad:** P1 · **Puntos:** 1
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: los dos documentos dicen que la pasarela elegida es ONVO Marketplace.
  2. Checklist: queda la nota de que Tilopay se quita en un PR aparte solo cuando ONVO funcione.
  3. Checklist: cambios fechados.
  4. Checklist: el texto está en español de Costa Rica, con voseo, claro y sin jerga técnica.
  5. Checklist: no inventa montos; usa solo los decididos por HOT_CLICK o dice «monto a definir por HOT_CLICK».
  6. Dado el texto final, cuando HOT_CLICK lo revisa, entonces se publica solo con su aprobación escrita.
  7. Checklist: no promete WhatsApp API, no usa Meta Pixel y no presenta a Tilopay como pasarela vigente una vez que ONVO esté en uso.

#### S1-72 · Lista «qué falta para aprobar tu negocio»
- **Historia:** Como vendedor quiero una lista en el panel con lo que falta para que aprueben mi negocio para saber qué hacer y cuánto tarda.
- **Responsable:** Producto Contenido y Soporte
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: ubicación de despacho, verificar correo y método de cobro, cada uno con su botón.
  2. Checklist: explica por qué los productos están pausados mientras tanto.
  3. Checklist: el plazo de aprobación dice «a definir por HOT_CLICK» si no está decidido.
  4. Checklist: el texto está en español de Costa Rica, con voseo, claro y sin jerga técnica.
  5. Checklist: no inventa montos; usa solo los decididos por HOT_CLICK o dice «monto a definir por HOT_CLICK».
  6. Dado el texto final, cuando HOT_CLICK lo revisa, entonces se publica solo con su aprobación escrita.
  7. Checklist: no promete WhatsApp API, no usa Meta Pixel y no presenta a Tilopay como pasarela vigente una vez que ONVO esté en uso.

#### S1-73 · Videos sin WhatsApp ni datos del CRM (MKT-2)
- **Historia:** Como dueño de HotClick quiero tapar el botón de WhatsApp y difuminar nombres y correos del CRM en los videos para no publicar datos personales.
- **Responsable:** Producto Contenido y Soporte
- **Prioridad:** P0 · **Puntos:** 2
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: revisados los 12 guiones y capturas.
  2. Checklist: ningún nombre, correo o teléfono legible.
  3. Checklist: nada se publica sin OK de HOT_CLICK.
  4. Checklist: el texto está en español de Costa Rica, con voseo, claro y sin jerga técnica.
  5. Checklist: no inventa montos; usa solo los decididos por HOT_CLICK o dice «monto a definir por HOT_CLICK».
  6. Dado el texto final, cuando HOT_CLICK lo revisa, entonces se publica solo con su aprobación escrita.
  7. Checklist: no promete WhatsApp API, no usa Meta Pixel y no presenta a Tilopay como pasarela vigente una vez que ONVO esté en uso.

#### S1-74 · Guion de soporte para la beta piloto
- **Historia:** Como soporte quiero un guion de respuestas para la beta para responder igual a todas las tiendas.
- **Responsable:** Producto Contenido y Soporte
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: cubre pago coordinado, contra entrega, aprobación, POS y verificación de correo.
  2. Checklist: nunca pide datos de tarjeta ni contraseñas.
  3. Checklist: indica cuándo escalar al Desarrollador o a HOT_CLICK.
  4. Checklist: el texto está en español de Costa Rica, con voseo, claro y sin jerga técnica.
  5. Checklist: no inventa montos; usa solo los decididos por HOT_CLICK o dice «monto a definir por HOT_CLICK».
  6. Dado el texto final, cuando HOT_CLICK lo revisa, entonces se publica solo con su aprobación escrita.
  7. Checklist: no promete WhatsApp API, no usa Meta Pixel y no presenta a Tilopay como pasarela vigente una vez que ONVO esté en uso.

#### S1-75 · Ayuda de Telegram con la ruta correcta
- **Historia:** Como vendedor quiero que la Ayuda diga dónde está Telegram de verdad para encontrar la vinculación.
- **Responsable:** Producto Contenido y Soporte
- **Prioridad:** P2 · **Puntos:** 1
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: el texto coincide con el menú real.
  2. Checklist: se propone poner Telegram en el menú lateral.
  3. Checklist: revisado por QA Negocios.
  4. Checklist: el texto está en español de Costa Rica, con voseo, claro y sin jerga técnica.
  5. Checklist: no inventa montos; usa solo los decididos por HOT_CLICK o dice «monto a definir por HOT_CLICK».
  6. Dado el texto final, cuando HOT_CLICK lo revisa, entonces se publica solo con su aprobación escrita.
  7. Checklist: no promete WhatsApp API, no usa Meta Pixel y no presenta a Tilopay como pasarela vigente una vez que ONVO esté en uso.

#### S1-76 · Montos de ejemplo con rótulo «Ejemplo» (LAN-6)
- **Historia:** Como comprador quiero que los montos de ejemplo de /emprende digan «Ejemplo» para no confundir un ejemplo con un precio real.
- **Responsable:** Producto Contenido y Soporte
- **Prioridad:** P1 · **Puntos:** 1
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: cada monto ilustrativo lleva el rótulo «Ejemplo».
  2. Checklist: ningún ejemplo contradice los precios decididos de los planes.
  3. Checklist: revisado por QA Compradores en 390 y 1440 px.
  4. Checklist: el texto está en español de Costa Rica, con voseo, claro y sin jerga técnica.
  5. Checklist: no inventa montos; usa solo los decididos por HOT_CLICK o dice «monto a definir por HOT_CLICK».
  6. Dado el texto final, cuando HOT_CLICK lo revisa, entonces se publica solo con su aprobación escrita.
  7. Checklist: no promete WhatsApp API, no usa Meta Pixel y no presenta a Tilopay como pasarela vigente una vez que ONVO esté en uso.

### Sprint 1 · Finanzas

#### S1-77 · Verificar que #147 hizo lo pedido (FIN-3)
- **Historia:** Como dueño de HotClick quiero verificar plan PRO a Emprendedor, día de cobro 28/13 y 7 días de gracia para confirmar que las reglas de planes están vivas.
- **Responsable:** Finanzas
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: muestra de negocios del plan PRO revisada desde el admin.
  2. Checklist: comisiones fuera de DataSeeder.
  3. Checklist: diferencias reportadas al Desarrollador.
  4. Checklist: usa solo montos dados por HOT_CLICK o publicados en las fuentes; cualquier otro dice «monto a definir por HOT_CLICK».
  5. Checklist: la planilla o el informe queda en /workspace/finanzas/ con fecha y la fuente de cada cifra.
  6. Dado una muestra de casos, cuando se recalculan a mano, entonces el resultado cuadra o la diferencia queda explicada.
  7. Dado el resultado, cuando se le entrega a HOT_CLICK por medio de Grok Bot, entonces queda anotada su respuesta o decisión.

#### S1-78 · Escenarios del mínimo de ₡700
- **Historia:** Como dueño de HotClick quiero escenarios del mínimo de ₡700 cobrado por diferencia con la tarifa semanal o absorbido para decidir con números.
- **Responsable:** Finanzas
- **Prioridad:** P1 · **Puntos:** 3
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: con 9 % el mínimo se alcanza desde ₡7.777,78 y con 7 % desde ₡10.000.
  2. Checklist: fórmula de la diferencia max(0; 700 − % × venta) con ejemplos.
  3. Checklist: plan B (absorber mientras duren los 70 cupos) explicado.
  4. Checklist: usa solo montos dados por HOT_CLICK o publicados en las fuentes; cualquier otro dice «monto a definir por HOT_CLICK».
  5. Checklist: la planilla o el informe queda en /workspace/finanzas/ con fecha y la fuente de cada cifra.
  6. Dado una muestra de casos, cuando se recalculan a mano, entonces el resultado cuadra o la diferencia queda explicada.
  7. Dado el resultado, cuando se le entrega a HOT_CLICK por medio de Grok Bot, entonces queda anotada su respuesta o decisión.

#### S1-79 · Margen por venta con tarifas publicadas de ONVO
- **Historia:** Como dueño de HotClick quiero el margen por venta con las tarifas publicadas de ONVO marcadas «a confirmar» para saber cuánto queda por plan.
- **Responsable:** Finanzas
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: tarjeta 3,9 % + US$0,35, SINPE Móvil 1,5 % y retención de IVA 0,777 % como datos publicados, sin convertir dólares sin tipo de cambio.
  2. Checklist: escenarios con 9 % y 7 %, con y sin mínimo.
  3. Checklist: supuesto de quién paga la tarifa de ONVO marcado como decisión de HOT_CLICK.
  4. Checklist: usa solo montos dados por HOT_CLICK o publicados en las fuentes; cualquier otro dice «monto a definir por HOT_CLICK».
  5. Checklist: la planilla o el informe queda en /workspace/finanzas/ con fecha y la fuente de cada cifra.
  6. Dado una muestra de casos, cuando se recalculan a mano, entonces el resultado cuadra o la diferencia queda explicada.
  7. Dado el resultado, cuando se le entrega a HOT_CLICK por medio de Grok Bot, entonces queda anotada su respuesta o decisión.

#### S1-80 · Valor de hotclick.comision.gateway.pct
- **Historia:** Como dueño de HotClick quiero documentar qué es el 4 o 5 % de reserva de pasarela y unificarlo para no confundir una estimación con un monto decidido.
- **Responsable:** Finanzas
- **Prioridad:** P2 · **Puntos:** 1
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: explica que no cambia lo que paga ni recibe el vendedor.
  2. Checklist: el valor real queda como «a definir por HOT_CLICK».
  3. Checklist: historia para el Desarrollador que unifique el valor por defecto.
  4. Checklist: usa solo montos dados por HOT_CLICK o publicados en las fuentes; cualquier otro dice «monto a definir por HOT_CLICK».
  5. Checklist: la planilla o el informe queda en /workspace/finanzas/ con fecha y la fuente de cada cifra.
  6. Dado una muestra de casos, cuando se recalculan a mano, entonces el resultado cuadra o la diferencia queda explicada.
  7. Dado el resultado, cuando se le entrega a HOT_CLICK por medio de Grok Bot, entonces queda anotada su respuesta o decisión.

#### S1-81 · Precios del front contra el backend
- **Historia:** Como dueño de HotClick quiero comparar los precios que se ven en el sitio con los del backend para que nadie vea un precio distinto al decidido.
- **Responsable:** Finanzas
- **Prioridad:** P0 · **Puntos:** 1
- **Dependencias:** S1-10 (Preparar el deploy de fix/reverificacion-1610)
- **Criterios de aceptación:**
  1. Checklist: tabla por página: /vender, /planes, landings y Tu Plan.
  2. Checklist: cualquier diferencia se reporta con captura.
  3. Checklist: se repite después del deploy.
  4. Checklist: usa solo montos dados por HOT_CLICK o publicados en las fuentes; cualquier otro dice «monto a definir por HOT_CLICK».
  5. Checklist: la planilla o el informe queda en /workspace/finanzas/ con fecha y la fuente de cada cifra.
  6. Dado una muestra de casos, cuando se recalculan a mano, entonces el resultado cuadra o la diferencia queda explicada.
  7. Dado el resultado, cuando se le entrega a HOT_CLICK por medio de Grok Bot, entonces queda anotada su respuesta o decisión.

### Sprint 1 · Consultor

#### S1-82 · Cruce de la rama desplegada contra la auditoría
- **Historia:** Como equipo quiero confirmar que los puntos de la auditoría (POS Emprendedor, #123, preconnect, Stripe, gateway.pct, V168) quedaron cerrados o tienen dueño para no dejar pendientes huérfanos.
- **Responsable:** Consultor
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** S1-10 (Preparar el deploy de fix/reverificacion-1610)
- **Criterios de aceptación:**
  1. Checklist: cada punto con estado ABIERTO o CERRADO y evidencia.
  2. Checklist: se quita del PR la línea del enlace sin /tienda/, que no es bug.
  3. Checklist: lo abierto pasa al backlog con historia.
  4. Checklist: el informe queda en /workspace/consultor/ y cita archivo y línea de cada afirmación sobre el código.
  5. Checklist: trabajo solo de lectura: no cambia código, no hace push, no despliega y no le escribe a nadie.
  6. Dado cada hallazgo, cuando se entrega, entonces trae prioridad (P0, P1 o P2), dueño sugerido y si necesita una decisión de HOT_CLICK.
  7. Dado el informe, cuando lo lee el Desarrollador, entonces puede convertir cada recomendación en una historia sin tener que preguntar más.

#### S1-83 · Revisión del plan de deploy
- **Historia:** Como equipo quiero revisar el plan de deploy y de vuelta atrás antes de ejecutarlo para detectar pasos faltantes.
- **Responsable:** Consultor
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: pg_dump, etiqueta, static/ con VITE_*, smoke y monitoreo presentes.
  2. Checklist: tiempo estimado de vuelta atrás anotado.
  3. Checklist: riesgos con mitigación.
  4. Checklist: el informe queda en /workspace/consultor/ y cita archivo y línea de cada afirmación sobre el código.
  5. Checklist: trabajo solo de lectura: no cambia código, no hace push, no despliega y no le escribe a nadie.
  6. Dado cada hallazgo, cuando se entrega, entonces trae prioridad (P0, P1 o P2), dueño sugerido y si necesita una decisión de HOT_CLICK.
  7. Dado el informe, cuando lo lee el Desarrollador, entonces puede convertir cada recomendación en una historia sin tener que preguntar más.

#### S1-84 · Revisión de las consultas de limpieza
- **Historia:** Como dueño de HotClick quiero revisar que las consultas de limpieza solo lean y apunten a lo correcto para borrar solo lo que corresponde.
- **Responsable:** Consultor
- **Prioridad:** P2 · **Puntos:** 1
- **Dependencias:** S1-24 (Consultas de limpieza de solo lectura)
- **Criterios de aceptación:**
  1. Checklist: ninguna consulta escribe.
  2. Checklist: los filtros por prefijo QA-TEST no atrapan negocios reales.
  3. Checklist: recomendación de qué esconder y qué borrar.
  4. Checklist: el informe queda en /workspace/consultor/ y cita archivo y línea de cada afirmación sobre el código.
  5. Checklist: trabajo solo de lectura: no cambia código, no hace push, no despliega y no le escribe a nadie.
  6. Dado cada hallazgo, cuando se entrega, entonces trae prioridad (P0, P1 o P2), dueño sugerido y si necesita una decisión de HOT_CLICK.
  7. Dado el informe, cuando lo lee el Desarrollador, entonces puede convertir cada recomendación en una historia sin tener que preguntar más.

---

## Sprint 2: Cimientos: CI/CD, staging, backups, legal y ONVO Sprint 0
- **Duración:** 1 semana (lunes 26-oct al viernes 30-oct-2026).
- **Objetivo:** Poner los cimientos para pagar en línea sin riesgo: pipeline con tu aprobación manual, staging con HTTPS, backups cifrados en Google Drive con restauración probada y vuelta atrás ensayada; ONVO Sprint 0 (arquitectura, prueba en sandbox, modelo de datos, amenazas, bocetos y plan de QA); legales P0 encaminados y catálogo con categorías reales, variantes y servicios.
- **Entregable de cierre:** Staging y pipeline funcionando, backup restaurado, prueba de ONVO en sandbox documentada y bocetos ONVO aprobados.
- **Historias:** 82 · **Puntos:** 176

| Rol | Historias | Puntos |
|---|---:|---:|
| HOT_CLICK (dueño) | 8 | 10 |
| Desarrollador | 16 | 50 |
| Diseño / UX (Figma) | 7 | 16 |
| QA (calidad) | 5 | 9 |
| QA Compradores | 5 | 7 |
| QA Negocios | 5 | 6 |
| QA Automatización y Regresión | 5 | 10 |
| Seguridad | 8 | 16 |
| DevOps y Seguridad | 9 | 27 |
| Producto Contenido y Soporte | 7 | 12 |
| Finanzas | 4 | 8 |
| Consultor | 3 | 5 |

### Sprint 2 · HOT_CLICK (dueño)

#### S2-01 · Llaves de sandbox de ONVO y secreto del webhook
- **Historia:** Como dueño de HotClick quiero entregar las llaves onvo_test_ y el secreto del webhook por un canal seguro para que el equipo pueda integrar sin cobros reales.
- **Responsable:** HOT_CLICK (dueño)
- **Prioridad:** P0 · **Puntos:** 1
- **Dependencias:** S1-03 (Correo a ONVO y apertura de la cuenta primaria)
- **Criterios de aceptación:**
  1. Checklist: llaves de la cuenta primaria con Marketplace habilitado en sandbox.
  2. Checklist: entregadas por solicitud de secreto a DevOps.
  3. Dado que ONVO todavía no las da, cuando cierra el sprint, entonces las historias de sandbox pasan al sprint 3 y se avisa.
  4. Checklist: la decisión o entrega queda anotada con fecha y opción elegida en /workspace/informes/decisiones-hotclick.md.
  5. Dado que HOT_CLICK decide, cuando Grok Bot lo registra, entonces avisa al equipo qué historias quedan destrabadas.
  6. Checklist: credenciales y llaves se entregan solo por un canal seguro (solicitud de secreto), nunca por chat.
  7. Dado que la decisión no llega antes del cierre del sprint, cuando se hace la revisión, entonces las historias que dependen de ella pasan al sprint siguiente sin construirse a medias.

#### S2-02 · DNS de staging y acceso a Google Drive
- **Historia:** Como dueño de HotClick quiero crear el DNS de staging.hotclick.lat y dar acceso a una carpeta de Google Drive para backups para tener staging y copias fuera del servidor.
- **Responsable:** HOT_CLICK (dueño)
- **Prioridad:** P1 · **Puntos:** 1
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: registro DNS creado y apuntando a la IP que indique DevOps.
  2. Checklist: carpeta de Drive compartida solo con la cuenta de servicio de backups.
  3. Checklist: acceso anotado sin contraseñas en documentos.
  4. Checklist: la decisión o entrega queda anotada con fecha y opción elegida en /workspace/informes/decisiones-hotclick.md.
  5. Dado que HOT_CLICK decide, cuando Grok Bot lo registra, entonces avisa al equipo qué historias quedan destrabadas.
  6. Checklist: credenciales y llaves se entregan solo por un canal seguro (solicitud de secreto), nunca por chat.
  7. Dado que la decisión no llega antes del cierre del sprint, cuando se hace la revisión, entonces las historias que dependen de ella pasan al sprint siguiente sin construirse a medias.

#### S2-03 · Ser revisor obligatorio de los deploys a producción
- **Historia:** Como dueño de HotClick quiero quedar como revisor obligatorio del environment production en GitHub para que nada llegue a producción sin mi aprobación manual.
- **Responsable:** HOT_CLICK (dueño)
- **Prioridad:** P0 · **Puntos:** 1
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: HOT_CLICK es el único aprobador del environment production.
  2. Dado un deploy pendiente, cuando HOT_CLICK no aprueba, entonces el pipeline no despliega.
  3. Checklist: probado con un deploy de staging que no necesita aprobación y uno de producción que sí.
  4. Checklist: la decisión o entrega queda anotada con fecha y opción elegida en /workspace/informes/decisiones-hotclick.md.
  5. Dado que HOT_CLICK decide, cuando Grok Bot lo registra, entonces avisa al equipo qué historias quedan destrabadas.
  6. Checklist: credenciales y llaves se entregan solo por un canal seguro (solicitud de secreto), nunca por chat.
  7. Dado que la decisión no llega antes del cierre del sprint, cuando se hace la revisión, entonces las historias que dependen de ella pasan al sprint siguiente sin construirse a medias.

#### S2-04 · Decisiones de cobro con ONVO
- **Historia:** Como dueño de HotClick quiero decidir quién paga la tarifa de ONVO, cómo se cobra la mensualidad Pyme y Negocio Plus, quién asume contracargos y cuánto esperar un SINPE para que el Desarrollador construya una sola vez.
- **Responsable:** HOT_CLICK (dueño)
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: tarifa de ONVO: la paga HotClick (tu decisión) y queda pendiente confirmar con ONVO si se puede.
  2. Checklist: mensualidad de ₡12.900 y ₡28.900: cargo aparte o tarifa semanal, con la opción elegida.
  3. Checklist: tiempo de espera de un SINPE antes de liberar stock y quién asume contracargos: opción elegida o «a definir por HOT_CLICK».
  4. Checklist: confirmado el Checkout hospedado (página de pago de ONVO).
  5. Checklist: la decisión o entrega queda anotada con fecha y opción elegida en /workspace/informes/decisiones-hotclick.md.
  6. Dado que HOT_CLICK decide, cuando Grok Bot lo registra, entonces avisa al equipo qué historias quedan destrabadas.
  7. Checklist: credenciales y llaves se entregan solo por un canal seguro (solicitud de secreto), nunca por chat.
  8. Dado que la decisión no llega antes del cierre del sprint, cuando se hace la revisión, entonces las historias que dependen de ella pasan al sprint siguiente sin construirse a medias.

#### S2-05 · PRODHAB y datos legales de HotClick (LEG-4, LEG-5)
- **Historia:** Como dueño de HotClick quiero iniciar con el abogado la inscripción ante PRODHAB y definir razón social, cédula y domicilio para cumplir la ley de datos y lo que piden ONVO y Hacienda.
- **Responsable:** HOT_CLICK (dueño)
- **Prioridad:** P0 · **Puntos:** 2
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: abogado contactado y fecha de presentación anotada.
  2. Checklist: la inscripción incluye la cédula del pagador SINPE y los datos fiscales de facturación.
  3. Checklist: HotClick queda definido como persona física o jurídica.
  4. Checklist: la decisión o entrega queda anotada con fecha y opción elegida en /workspace/informes/decisiones-hotclick.md.
  5. Dado que HOT_CLICK decide, cuando Grok Bot lo registra, entonces avisa al equipo qué historias quedan destrabadas.
  6. Checklist: credenciales y llaves se entregan solo por un canal seguro (solicitud de secreto), nunca por chat.
  7. Dado que la decisión no llega antes del cierre del sprint, cuando se hace la revisión, entonces las historias que dependen de ella pasan al sprint siguiente sin construirse a medias.

#### S2-06 · Preguntar a ONVO cómo se fija la frecuencia de liquidación
- **Historia:** Como dueño de HotClick quiero preguntarle a ONVO si la frecuencia quincenal o mensual la configura ONVO a pedido o la pone el negocio en su panel para que la elección del negocio se respete.
- **Responsable:** HOT_CLICK (dueño)
- **Prioridad:** P1 · **Puntos:** 1
- **Dependencias:** S1-03 (Correo a ONVO y apertura de la cuenta primaria)
- **Criterios de aceptación:**
  1. Checklist: pregunta enviada y respuesta archivada.
  2. Checklist: también se pregunta si el mínimo de ₡20.000 para liquidar aplica a cuentas conectadas y quién paga los US$3.
  3. Checklist: la respuesta se pasa a Producto y Desarrollador.
  4. Checklist: la decisión o entrega queda anotada con fecha y opción elegida en /workspace/informes/decisiones-hotclick.md.
  5. Dado que HOT_CLICK decide, cuando Grok Bot lo registra, entonces avisa al equipo qué historias quedan destrabadas.
  6. Checklist: credenciales y llaves se entregan solo por un canal seguro (solicitud de secreto), nunca por chat.
  7. Dado que la decisión no llega antes del cierre del sprint, cuando se hace la revisión, entonces las historias que dependen de ella pasan al sprint siguiente sin construirse a medias.

#### S2-07 · Token de Telegram rotado para alertas
- **Historia:** Como dueño de HotClick quiero rotar el token del bot de Telegram y entregarlo como secreto para recibir alertas sin riesgo.
- **Responsable:** HOT_CLICK (dueño)
- **Prioridad:** P1 · **Puntos:** 1
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: token viejo revocado.
  2. Checklist: token nuevo entregado por canal seguro.
  3. Checklist: alertas apuntan al bot, no al número personal.
  4. Checklist: la decisión o entrega queda anotada con fecha y opción elegida en /workspace/informes/decisiones-hotclick.md.
  5. Dado que HOT_CLICK decide, cuando Grok Bot lo registra, entonces avisa al equipo qué historias quedan destrabadas.
  6. Checklist: credenciales y llaves se entregan solo por un canal seguro (solicitud de secreto), nunca por chat.
  7. Dado que la decisión no llega antes del cierre del sprint, cuando se hace la revisión, entonces las historias que dependen de ella pasan al sprint siguiente sin construirse a medias.

#### S2-08 · Lista y OK de legales LEG-6 a LEG-11
- **Historia:** Como dueño de HotClick quiero decidir correo y teléfono oficiales, horario de soporte, quién paga el envío de una devolución, garantía y si se devuelve la comisión en un reembolso para terminar los textos legales.
- **Responsable:** HOT_CLICK (dueño)
- **Prioridad:** P1 · **Puntos:** 1
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: cada punto con respuesta o «a definir por HOT_CLICK».
  2. Checklist: un solo correo oficial y un solo horario.
  3. Checklist: la lista de cookies y proveedores la confirma con Seguridad.
  4. Checklist: la decisión o entrega queda anotada con fecha y opción elegida en /workspace/informes/decisiones-hotclick.md.
  5. Dado que HOT_CLICK decide, cuando Grok Bot lo registra, entonces avisa al equipo qué historias quedan destrabadas.
  6. Checklist: credenciales y llaves se entregan solo por un canal seguro (solicitud de secreto), nunca por chat.
  7. Dado que la decisión no llega antes del cierre del sprint, cuando se hace la revisión, entonces las historias que dependen de ella pasan al sprint siguiente sin construirse a medias.

### Sprint 2 · Desarrollador

#### S2-09 · Documento de arquitectura ONVO Marketplace
- **Historia:** Como equipo quiero un documento de arquitectura con OnvoMarketplaceClient, tablas, endpoints y flujos para que todos construyan sobre el mismo diseño.
- **Responsable:** Desarrollador
- **Prioridad:** P1 · **Puntos:** 3
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: diagramas de secuencia de alta del negocio, checkout por tienda, webhook y polling.
  2. Checklist: reutiliza PaymentProvider, OnvoService, OnvoWebhookController y el puerto PlanPagoConfirmado.
  3. Checklist: revisado por Seguridad, QA y Consultor.
  4. Checklist: el cambio va en su propia rama y PR, con pruebas automáticas (mvn y vitest) en verde y revisión de Seguridad si toca pagos, permisos o datos personales.
  5. Dado que el PR está aprobado, cuando se quiere subir a producción, entonces solo se despliega con la aprobación manual de HOT_CLICK, con pg_dump y etiqueta de vuelta atrás hechos antes.
  6. Checklist: ningún secreto, llave ni dato personal queda en el código o en los logs, y ningún monto queda escrito en el código (sale del plan o de la configuración).
  7. Dado el cambio en staging, cuando QA lo prueba desde el navegador a 390 y 1440 px, entonces no hay errores 500 ni textos «[PENDIENTE]» en las pantallas tocadas.

#### S2-10 · Prueba con curl contra el sandbox de ONVO
- **Historia:** Como equipo quiero una prueba con curl que cree una cuenta conectada y una sesión de checkout en sandbox para confirmar que la documentación coincide con la API real.
- **Responsable:** Desarrollador
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** S2-01 (Llaves de sandbox de ONVO y secreto del webhook)
- **Criterios de aceptación:**
  1. Checklist: el script vive en /workspace y no en el repo.
  2. Checklist: respuestas guardadas sin llaves ni onboardingUrl.
  3. Checklist: cualquier diferencia con la doc se anota para ONVO.
  4. Checklist: el cambio va en su propia rama y PR, con pruebas automáticas (mvn y vitest) en verde y revisión de Seguridad si toca pagos, permisos o datos personales.
  5. Dado que el PR está aprobado, cuando se quiere subir a producción, entonces solo se despliega con la aprobación manual de HOT_CLICK, con pg_dump y etiqueta de vuelta atrás hechos antes.
  6. Checklist: ningún secreto, llave ni dato personal queda en el código o en los logs, y ningún monto queda escrito en el código (sale del plan o de la configuración).
  7. Dado el cambio en staging, cuando QA lo prueba desde el navegador a 390 y 1440 px, entonces no hay errores 500 ni textos «[PENDIENTE]» en las pantallas tocadas.

#### S2-11 · Modelo de datos negocio_onvo_cuenta
- **Historia:** Como equipo quiero la migración propuesta de cuentas conectadas, eventos de webhook, cobros y reembolsos para planificar cambios reversibles.
- **Responsable:** Desarrollador
- **Prioridad:** P1 · **Puntos:** 3
- **Dependencias:** S2-09 (Documento de arquitectura ONVO Marketplace)
- **Criterios de aceptación:**
  1. Checklist: campos: id de ONVO, estado, % aplicado, tarifa semanal, frecuencia elegida, cobros_onvo_activos, modo test o live y auditoría.
  2. Checklist: no guarda onboardingUrl, IBAN ni KYC.
  3. Checklist: probada en Postgres limpio y sin aplicar en producción.
  4. Checklist: el cambio va en su propia rama y PR, con pruebas automáticas (mvn y vitest) en verde y revisión de Seguridad si toca pagos, permisos o datos personales.
  5. Dado que el PR está aprobado, cuando se quiere subir a producción, entonces solo se despliega con la aprobación manual de HOT_CLICK, con pg_dump y etiqueta de vuelta atrás hechos antes.
  6. Checklist: ningún secreto, llave ni dato personal queda en el código o en los logs, y ningún monto queda escrito en el código (sale del plan o de la configuración).
  7. Dado el cambio en staging, cuando QA lo prueba desde el navegador a 390 y 1440 px, entonces no hay errores 500 ni textos «[PENDIENTE]» en las pantallas tocadas.

#### S2-12 · Inventario de Tilopay y de ONVO viejo
- **Historia:** Como equipo quiero un inventario de clases, endpoints y propiedades de Tilopay y del ONVO viejo para saber qué se reemplaza y qué se borra.
- **Responsable:** Desarrollador
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: lista con ruta y uso de cada pieza.
  2. Checklist: riesgos de regresión anotados.
  3. Checklist: alineado con el PR chore/quitar-tilopay.
  4. Checklist: el cambio va en su propia rama y PR, con pruebas automáticas (mvn y vitest) en verde y revisión de Seguridad si toca pagos, permisos o datos personales.
  5. Dado que el PR está aprobado, cuando se quiere subir a producción, entonces solo se despliega con la aprobación manual de HOT_CLICK, con pg_dump y etiqueta de vuelta atrás hechos antes.
  6. Checklist: ningún secreto, llave ni dato personal queda en el código o en los logs, y ningún monto queda escrito en el código (sale del plan o de la configuración).
  7. Dado el cambio en staging, cuando QA lo prueba desde el navegador a 390 y 1440 px, entonces no hay errores 500 ni textos «[PENDIENTE]» en las pantallas tocadas.

#### S2-13 · OnvoMarketplaceClient con pruebas simuladas
- **Historia:** Como equipo quiero un cliente de ONVO Marketplace con los 5 endpoints de cuentas conectadas y pruebas con respuestas simuladas para tener la base de la integración.
- **Responsable:** Desarrollador
- **Prioridad:** P1 · **Puntos:** 5
- **Dependencias:** S2-09 (Documento de arquitectura ONVO Marketplace)
- **Criterios de aceptación:**
  1. Checklist: crear, listar, obtener, actualizar % y tarifa semanal, y regenerar enlace.
  2. Checklist: errores parent_configuration_invalid, connected_account_not_found y weekly_fee.*_bank_account_required mapeados.
  3. Checklist: arranque falla si el prefijo de la llave no coincide con el modo (test o live).
  4. Checklist: el cambio va en su propia rama y PR, con pruebas automáticas (mvn y vitest) en verde y revisión de Seguridad si toca pagos, permisos o datos personales.
  5. Dado que el PR está aprobado, cuando se quiere subir a producción, entonces solo se despliega con la aprobación manual de HOT_CLICK, con pg_dump y etiqueta de vuelta atrás hechos antes.
  6. Checklist: ningún secreto, llave ni dato personal queda en el código o en los logs, y ningún monto queda escrito en el código (sale del plan o de la configuración).
  7. Dado el cambio en staging, cuando QA lo prueba desde el navegador a 390 y 1440 px, entonces no hay errores 500 ni textos «[PENDIENTE]» en las pantallas tocadas.

#### S2-14 · Interruptores de pasarela por capacidad y por negocio
- **Historia:** Como equipo quiero interruptores pagos.gateway.checkout, suscripcion y pos con override por negocio para encender ONVO de a poco.
- **Responsable:** Desarrollador
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** S2-09 (Documento de arquitectura ONVO Marketplace)
- **Criterios de aceptación:**
  1. Checklist: valor por defecto apagado para ONVO.
  2. Checklist: si el negocio no tiene cuenta activa, el pago en línea se bloquea y quedan efectivo y contra entrega.
  3. Checklist: el proveedor queda fijado en el pedido al crearlo.
  4. Checklist: el cambio va en su propia rama y PR, con pruebas automáticas (mvn y vitest) en verde y revisión de Seguridad si toca pagos, permisos o datos personales.
  5. Dado que el PR está aprobado, cuando se quiere subir a producción, entonces solo se despliega con la aprobación manual de HOT_CLICK, con pg_dump y etiqueta de vuelta atrás hechos antes.
  6. Checklist: ningún secreto, llave ni dato personal queda en el código o en los logs, y ningún monto queda escrito en el código (sale del plan o de la configuración).
  7. Dado el cambio en staging, cuando QA lo prueba desde el navegador a 390 y 1440 px, entonces no hay errores 500 ni textos «[PENDIENTE]» en las pantallas tocadas.

#### S2-15 · Categorías reales en el catálogo
- **Historia:** Como comprador quiero aplicar la lista de categorías que aprobó HOT_CLICK para encontrar productos donde corresponden.
- **Responsable:** Desarrollador
- **Prioridad:** P1 · **Puntos:** 3
- **Dependencias:** S1-05 (Lista de categorías reales y OK de limpieza)
- **Criterios de aceptación:**
  1. Checklist: migración con la lista exacta de HOT_CLICK.
  2. Checklist: productos y negocios existentes reasignados según una tabla revisada.
  3. Checklist: filtros de tienda y buscador usan las categorías nuevas.
  4. Checklist: el cambio va en su propia rama y PR, con pruebas automáticas (mvn y vitest) en verde y revisión de Seguridad si toca pagos, permisos o datos personales.
  5. Dado que el PR está aprobado, cuando se quiere subir a producción, entonces solo se despliega con la aprobación manual de HOT_CLICK, con pg_dump y etiqueta de vuelta atrás hechos antes.
  6. Checklist: ningún secreto, llave ni dato personal queda en el código o en los logs, y ningún monto queda escrito en el código (sale del plan o de la configuración).
  7. Dado el cambio en staging, cuando QA lo prueba desde el navegador a 390 y 1440 px, entonces no hay errores 500 ni textos «[PENDIENTE]» en las pantallas tocadas.

#### S2-16 · Editor de variantes
- **Historia:** Como vendedor quiero crear variantes (talla, color, medida) con su stock para no meter medidas en la descripción.
- **Responsable:** Desarrollador
- **Prioridad:** P1 · **Puntos:** 5
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: cada variante con precio opcional y stock propio.
  2. Checklist: el comprador elige la variante antes de agregar al carrito.
  3. Checklist: el stock se descuenta de la variante comprada.
  4. Checklist: el cambio va en su propia rama y PR, con pruebas automáticas (mvn y vitest) en verde y revisión de Seguridad si toca pagos, permisos o datos personales.
  5. Dado que el PR está aprobado, cuando se quiere subir a producción, entonces solo se despliega con la aprobación manual de HOT_CLICK, con pg_dump y etiqueta de vuelta atrás hechos antes.
  6. Checklist: ningún secreto, llave ni dato personal queda en el código o en los logs, y ningún monto queda escrito en el código (sale del plan o de la configuración).
  7. Dado el cambio en staging, cuando QA lo prueba desde el navegador a 390 y 1440 px, entonces no hay errores 500 ni textos «[PENDIENTE]» en las pantallas tocadas.

#### S2-17 · Tipo de producto «servicio»
- **Historia:** Como vendedor quiero publicar servicios además de productos para vender lo que hago y no solo lo que fabrico.
- **Responsable:** Desarrollador
- **Prioridad:** P1 · **Puntos:** 3
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: un servicio no tiene stock ni envío.
  2. Checklist: se puede vender con precio fijo o a cotizar.
  3. Checklist: se muestra con etiqueta «Servicio» en la ficha.
  4. Checklist: el cambio va en su propia rama y PR, con pruebas automáticas (mvn y vitest) en verde y revisión de Seguridad si toca pagos, permisos o datos personales.
  5. Dado que el PR está aprobado, cuando se quiere subir a producción, entonces solo se despliega con la aprobación manual de HOT_CLICK, con pg_dump y etiqueta de vuelta atrás hechos antes.
  6. Checklist: ningún secreto, llave ni dato personal queda en el código o en los logs, y ningún monto queda escrito en el código (sale del plan o de la configuración).
  7. Dado el cambio en staging, cuando QA lo prueba desde el navegador a 390 y 1440 px, entonces no hay errores 500 ni textos «[PENDIENTE]» en las pantallas tocadas.

#### S2-18 · Rendimiento de la portada (LAN-7), primera pasada
- **Historia:** Como comprador quiero que la portada cargue rápido en el teléfono para no irme antes de ver productos.
- **Responsable:** Desarrollador
- **Prioridad:** P1 · **Puntos:** 5
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: imágenes con tamaño adecuado y carga diferida.
  2. Checklist: Lighthouse móvil de la portada mejora frente a 37–43 y se anota el nuevo valor.
  3. Checklist: el tiempo de carga baja frente a los 11–13 s medidos.
  4. Checklist: el cambio va en su propia rama y PR, con pruebas automáticas (mvn y vitest) en verde y revisión de Seguridad si toca pagos, permisos o datos personales.
  5. Dado que el PR está aprobado, cuando se quiere subir a producción, entonces solo se despliega con la aprobación manual de HOT_CLICK, con pg_dump y etiqueta de vuelta atrás hechos antes.
  6. Checklist: ningún secreto, llave ni dato personal queda en el código o en los logs, y ningún monto queda escrito en el código (sale del plan o de la configuración).
  7. Dado el cambio en staging, cuando QA lo prueba desde el navegador a 390 y 1440 px, entonces no hay errores 500 ni textos «[PENDIENTE]» en las pantallas tocadas.

#### S2-19 · Dockerfile que corre las pruebas (INF-3)
- **Historia:** Como equipo quiero arreglar las pruebas que no compilan para que la imagen no se salte las pruebas para no subir código roto.
- **Responsable:** Desarrollador
- **Prioridad:** P1 · **Puntos:** 3
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: las pruebas compilan y corren en CI.
  2. Checklist: la imagen se construye solo con pruebas en verde.
  3. Checklist: el tiempo de build queda medido.
  4. Checklist: el cambio va en su propia rama y PR, con pruebas automáticas (mvn y vitest) en verde y revisión de Seguridad si toca pagos, permisos o datos personales.
  5. Dado que el PR está aprobado, cuando se quiere subir a producción, entonces solo se despliega con la aprobación manual de HOT_CLICK, con pg_dump y etiqueta de vuelta atrás hechos antes.
  6. Checklist: ningún secreto, llave ni dato personal queda en el código o en los logs, y ningún monto queda escrito en el código (sale del plan o de la configuración).
  7. Dado el cambio en staging, cuando QA lo prueba desde el navegador a 390 y 1440 px, entonces no hay errores 500 ni textos «[PENDIENTE]» en las pantallas tocadas.

#### S2-20 · Meter al CI las pruebas de navegador faltantes
- **Historia:** Como equipo quiero integrar al CI las 5 pruebas nuevas y las 12 que están fuera para que la regresión corra sola en cada PR.
- **Responsable:** Desarrollador
- **Prioridad:** P1 · **Puntos:** 3
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: la lista sale del inventario de QA Automatización.
  2. Checklist: las pruebas inestables se marcan y se arreglan, no se borran.
  3. Checklist: el CI informa cuántas corrieron y cuántas fallaron.
  4. Checklist: el cambio va en su propia rama y PR, con pruebas automáticas (mvn y vitest) en verde y revisión de Seguridad si toca pagos, permisos o datos personales.
  5. Dado que el PR está aprobado, cuando se quiere subir a producción, entonces solo se despliega con la aprobación manual de HOT_CLICK, con pg_dump y etiqueta de vuelta atrás hechos antes.
  6. Checklist: ningún secreto, llave ni dato personal queda en el código o en los logs, y ningún monto queda escrito en el código (sale del plan o de la configuración).
  7. Dado el cambio en staging, cuando QA lo prueba desde el navegador a 390 y 1440 px, entonces no hay errores 500 ni textos «[PENDIENTE]» en las pantallas tocadas.

#### S2-21 · Turnstile en registro y checkout de invitado (SEG-G)
- **Historia:** Como dueño de HotClick quiero Turnstile en el registro de negocios y en el checkout de invitado para frenar bots.
- **Responsable:** Desarrollador
- **Prioridad:** P1 · **Puntos:** 3
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: se valida en el servidor, no solo en el front.
  2. Checklist: probado en staging antes de encenderlo en producción.
  3. Checklist: interruptor para apagarlo rápido.
  4. Checklist: el cambio va en su propia rama y PR, con pruebas automáticas (mvn y vitest) en verde y revisión de Seguridad si toca pagos, permisos o datos personales.
  5. Dado que el PR está aprobado, cuando se quiere subir a producción, entonces solo se despliega con la aprobación manual de HOT_CLICK, con pg_dump y etiqueta de vuelta atrás hechos antes.
  6. Checklist: ningún secreto, llave ni dato personal queda en el código o en los logs, y ningún monto queda escrito en el código (sale del plan o de la configuración).
  7. Dado el cambio en staging, cuando QA lo prueba desde el navegador a 390 y 1440 px, entonces no hay errores 500 ni textos «[PENDIENTE]» en las pantallas tocadas.

#### S2-22 · Roles de equipo correctos (SEG-D)
- **Historia:** Como dueño de HotClick quiero que un LECTOR o EDITOR no reciba permisos de dueño en el token para que el personal no haga cosas de dueño.
- **Responsable:** Desarrollador
- **Prioridad:** P1 · **Puntos:** 3
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: el token refleja el rol real.
  2. Checklist: pruebas por cada rol en las rutas sensibles.
  3. Checklist: el dueño sigue teniendo todo.
  4. Checklist: el cambio va en su propia rama y PR, con pruebas automáticas (mvn y vitest) en verde y revisión de Seguridad si toca pagos, permisos o datos personales.
  5. Dado que el PR está aprobado, cuando se quiere subir a producción, entonces solo se despliega con la aprobación manual de HOT_CLICK, con pg_dump y etiqueta de vuelta atrás hechos antes.
  6. Checklist: ningún secreto, llave ni dato personal queda en el código o en los logs, y ningún monto queda escrito en el código (sale del plan o de la configuración).
  7. Dado el cambio en staging, cuando QA lo prueba desde el navegador a 390 y 1440 px, entonces no hay errores 500 ni textos «[PENDIENTE]» en las pantallas tocadas.

#### S2-23 · Tope global de gasto de IA (SEG-H)
- **Historia:** Como dueño de HotClick quiero un tope global de llamadas de IA por día para que un registro masivo no dispare el costo.
- **Responsable:** Desarrollador
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: el tope es configurable y su valor lo define HOT_CLICK.
  2. Checklist: al llegar al tope se degrada con un mensaje amable.
  3. Checklist: alerta a Grok Bot al llegar al 80 %.
  4. Checklist: el cambio va en su propia rama y PR, con pruebas automáticas (mvn y vitest) en verde y revisión de Seguridad si toca pagos, permisos o datos personales.
  5. Dado que el PR está aprobado, cuando se quiere subir a producción, entonces solo se despliega con la aprobación manual de HOT_CLICK, con pg_dump y etiqueta de vuelta atrás hechos antes.
  6. Checklist: ningún secreto, llave ni dato personal queda en el código o en los logs, y ningún monto queda escrito en el código (sale del plan o de la configuración).
  7. Dado el cambio en staging, cuando QA lo prueba desde el navegador a 390 y 1440 px, entonces no hay errores 500 ni textos «[PENDIENTE]» en las pantallas tocadas.

#### S2-24 · CRM sin datos compartidos entre negocios (SEG-I)
- **Historia:** Como comprador quiero que el CRM de un negocio no vea datos del cliente que vienen de otro negocio para proteger mis datos como comprador.
- **Responsable:** Desarrollador
- **Prioridad:** P1 · **Puntos:** 3
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: teléfono, correo e historial quedan separados por negocio.
  2. Checklist: pruebas de tenant en las rutas del CRM.
  3. Checklist: sin mensajería por WhatsApp API.
  4. Checklist: el cambio va en su propia rama y PR, con pruebas automáticas (mvn y vitest) en verde y revisión de Seguridad si toca pagos, permisos o datos personales.
  5. Dado que el PR está aprobado, cuando se quiere subir a producción, entonces solo se despliega con la aprobación manual de HOT_CLICK, con pg_dump y etiqueta de vuelta atrás hechos antes.
  6. Checklist: ningún secreto, llave ni dato personal queda en el código o en los logs, y ningún monto queda escrito en el código (sale del plan o de la configuración).
  7. Dado el cambio en staging, cuando QA lo prueba desde el navegador a 390 y 1440 px, entonces no hay errores 500 ni textos «[PENDIENTE]» en las pantallas tocadas.

### Sprint 2 · Diseño / UX (Figma)

#### S2-25 · Boceto de «Activar cobros» con estados
- **Historia:** Como vendedor quiero el boceto de «Activar cobros» con los estados de ONVO para saber en qué paso estoy.
- **Responsable:** Diseño / UX (Figma)
- **Prioridad:** P1 · **Puntos:** 3
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: Sin cuenta, Onboarding pendiente, En revisión, Activa, Pausada y Suspendida.
  2. Checklist: explica que el formulario (KYC e IBAN) es de ONVO y que HotClick no ve esos datos.
  3. Checklist: muestra la frecuencia elegida y los US$3 por liquidación.
  4. Checklist: el diseño está en Figma con marcos a 390 y 1440 px y notas de entrega para el Desarrollador.
  5. Checklist: contraste AA, foco visible y una sola llamada a la acción roja por pantalla.
  6. Checklist: los textos no inventan montos; donde falta uno dice «monto a definir por HOT_CLICK».
  7. Dado el boceto terminado, cuando lo revisan Producto y HOT_CLICK, entonces queda aprobado por escrito o con la lista de cambios anotada.

#### S2-26 · Bocetos del Checkout hospedado
- **Historia:** Como comprador quiero pantallas de salida a ONVO, vuelta, «Confirmando…», éxito y error para que el pago se sienta confiable.
- **Responsable:** Diseño / UX (Figma)
- **Prioridad:** P1 · **Puntos:** 3
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: aviso «Pagás con ONVO a nombre de {tienda}».
  2. Checklist: error con reintento sin perder el carrito.
  3. Checklist: sin códigos internos.
  4. Checklist: el diseño está en Figma con marcos a 390 y 1440 px y notas de entrega para el Desarrollador.
  5. Checklist: contraste AA, foco visible y una sola llamada a la acción roja por pantalla.
  6. Checklist: los textos no inventan montos; donde falta uno dice «monto a definir por HOT_CLICK».
  7. Dado el boceto terminado, cuando lo revisan Producto y HOT_CLICK, entonces queda aprobado por escrito o con la lista de cambios anotada.

#### S2-27 · Boceto del carrito con varias tiendas
- **Historia:** Como comprador con varias tiendas quiero el diseño de «Pago 1 de N», un cobro por tienda para entender cuántos cargos voy a ver.
- **Responsable:** Diseño / UX (Figma)
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: lista de tiendas con su subtotal y estado de pago.
  2. Checklist: aviso «Vas a ver un cargo por cada tienda».
  3. Checklist: qué pasa si un pago sale y otro no.
  4. Checklist: el diseño está en Figma con marcos a 390 y 1440 px y notas de entrega para el Desarrollador.
  5. Checklist: contraste AA, foco visible y una sola llamada a la acción roja por pantalla.
  6. Checklist: los textos no inventan montos; donde falta uno dice «monto a definir por HOT_CLICK».
  7. Dado el boceto terminado, cuando lo revisan Producto y HOT_CLICK, entonces queda aprobado por escrito o con la lista de cambios anotada.

#### S2-28 · Elegir liquidación quincenal o mensual en el registro
- **Historia:** Como vendedor quiero el boceto del campo de frecuencia en el registro y en el resumen del plan para elegir sabiendo lo que cuesta.
- **Responsable:** Diseño / UX (Figma)
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: quincenal = US$3 cada 15 días; mensual = US$3 al mes (ahorra un cargo de US$3 al mes).
  2. Checklist: editable en el perfil con aviso de que el cambio se aplica a mano en ONVO.
  3. Checklist: aparece en el resumen del plan.
  4. Checklist: el diseño está en Figma con marcos a 390 y 1440 px y notas de entrega para el Desarrollador.
  5. Checklist: contraste AA, foco visible y una sola llamada a la acción roja por pantalla.
  6. Checklist: los textos no inventan montos; donde falta uno dice «monto a definir por HOT_CLICK».
  7. Dado el boceto terminado, cuando lo revisan Producto y HOT_CLICK, entonces queda aprobado por escrito o con la lista de cambios anotada.

#### S2-29 · Sección ONVO del admin y lista «Negocios ONVO»
- **Historia:** Como admin de HotClick quiero el boceto de la sección ONVO en la ficha del negocio y la lista de negocios ONVO para administrar los cobros de cada negocio.
- **Responsable:** Diseño / UX (Figma)
- **Prioridad:** P1 · **Puntos:** 3
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: botón «Registrar negocio en ONVO», «Reenviar enlace», campo % editable, tarifa semanal, frecuencia (informativa) y Pausar/Reanudar cobros.
  2. Checklist: aviso «el % no coincide con el plan».
  3. Checklist: lista con filtro por estado y resultado de la conciliación diaria.
  4. Checklist: el diseño está en Figma con marcos a 390 y 1440 px y notas de entrega para el Desarrollador.
  5. Checklist: contraste AA, foco visible y una sola llamada a la acción roja por pantalla.
  6. Checklist: los textos no inventan montos; donde falta uno dice «monto a definir por HOT_CLICK».
  7. Dado el boceto terminado, cuando lo revisan Producto y HOT_CLICK, entonces queda aprobado por escrito o con la lista de cambios anotada.

#### S2-30 · Editor de variantes y servicios
- **Historia:** Como vendedor quiero el diseño del editor de productos en una sola página con variantes y tipo servicio para crear productos con menos clics.
- **Responsable:** Diseño / UX (Figma)
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: foto, nombre, categoría, precio, stock y variantes en una pantalla.
  2. Checklist: botón «Guardar y crear otro».
  3. Checklist: tipo servicio sin stock ni envío.
  4. Checklist: el diseño está en Figma con marcos a 390 y 1440 px y notas de entrega para el Desarrollador.
  5. Checklist: contraste AA, foco visible y una sola llamada a la acción roja por pantalla.
  6. Checklist: los textos no inventan montos; donde falta uno dice «monto a definir por HOT_CLICK».
  7. Dado el boceto terminado, cuando lo revisan Producto y HOT_CLICK, entonces queda aprobado por escrito o con la lista de cambios anotada.

#### S2-31 · Propuesta /vender o /emprende (DIS-2)
- **Historia:** Como dueño de HotClick quiero dos opciones para la ruta de «Vender en HotClick» para decidir una sola puerta de entrada.
- **Responsable:** Diseño / UX (Figma)
- **Prioridad:** P2 · **Puntos:** 1
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: pros y contras de cada ruta.
  2. Checklist: redirección propuesta para la que no quede.
  3. Checklist: decisión anotada por HOT_CLICK.
  4. Checklist: el diseño está en Figma con marcos a 390 y 1440 px y notas de entrega para el Desarrollador.
  5. Checklist: contraste AA, foco visible y una sola llamada a la acción roja por pantalla.
  6. Checklist: los textos no inventan montos; donde falta uno dice «monto a definir por HOT_CLICK».
  7. Dado el boceto terminado, cuando lo revisan Producto y HOT_CLICK, entonces queda aprobado por escrito o con la lista de cambios anotada.

### Sprint 2 · QA (calidad)

#### S2-32 · Plan de pruebas ONVO ligado a historias
- **Historia:** Como equipo quiero una matriz que ligue cada historia ONVO con sus casos de prueba para saber qué valida cada criterio.
- **Responsable:** QA (calidad)
- **Prioridad:** P1 · **Puntos:** 3
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: casos de onboarding, tarjeta, webhooks, SINPE, split, reembolsos y pausa.
  2. Checklist: todos los casos se ejecutan desde la web como usuario.
  3. Checklist: casos que dependen de ONVO marcados como pendientes.
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/calidad/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

#### S2-33 · Datos de prueba de ONVO
- **Historia:** Como equipo quiero preparar tarjetas y números SINPE de prueba y negocios de prueba para pruebas repetibles.
- **Responsable:** QA (calidad)
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: lista en /workspace/qa/onvo-sandbox/datos.md.
  2. Checklist: sin datos reales.
  3. Checklist: negocios QA-TEST de prueba para cada plan.
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/calidad/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

#### S2-34 · Regresión base del checkout antes de ONVO
- **Historia:** Como equipo quiero una regresión del checkout actual antes de tocar pagos para separar bugs viejos de los nuevos.
- **Responsable:** QA (calidad)
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: capturas y resultados guardados con fecha.
  2. Checklist: bugs conocidos listados aparte.
  3. Checklist: repetida en staging cuando exista.
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/calidad/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

#### S2-35 · Staging usable desde el navegador
- **Historia:** Como equipo quiero comprobar que staging.hotclick.lat abre con HTTPS y funciona como producción para probar ahí antes de producción.
- **Responsable:** QA (calidad)
- **Prioridad:** P1 · **Puntos:** 1
- **Dependencias:** S2-61 (Staging en staging.hotclick.lat)
- **Criterios de aceptación:**
  1. Checklist: candado HTTPS válido.
  2. Checklist: registro, catálogo y checkout funcionan con datos de prueba.
  3. Checklist: staging no muestra datos de producción.
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/calidad/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

#### S2-36 · Turnstile en registro y checkout desde la web
- **Historia:** Como comprador quiero probar Turnstile en staging como usuario para que no moleste a personas reales.
- **Responsable:** QA (calidad)
- **Prioridad:** P1 · **Puntos:** 1
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: se completa sin trabas en escritorio y teléfono.
  2. Checklist: sin Turnstile el envío se rechaza con mensaje claro.
  3. Checklist: el tiempo extra se anota.
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/calidad/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

### Sprint 2 · QA Compradores

#### S2-37 · Buscar por categorías reales
- **Historia:** Como comprador quiero buscar y filtrar con las categorías nuevas para encontrar lo que quiero.
- **Responsable:** QA Compradores
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: cada categoría muestra productos que corresponden.
  2. Checklist: el buscador lleva a la tienda correcta.
  3. Checklist: no aparece «Tecnología» en productos que no lo son.
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/compradores/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

#### S2-38 · Comprar una variante
- **Historia:** Como comprador quiero elegir talla o color y comprar para recibir lo que pedí.
- **Responsable:** QA Compradores
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** S2-16 (Editor de variantes)
- **Criterios de aceptación:**
  1. Checklist: no puedo agregar sin elegir variante.
  2. Checklist: el carrito y el pedido dicen la variante.
  3. Checklist: variante sin stock aparece como agotada.
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/compradores/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

#### S2-39 · Pedir un servicio
- **Historia:** Como comprador quiero contratar un servicio o pedir cotización para usar HotClick también para servicios.
- **Responsable:** QA Compradores
- **Prioridad:** P1 · **Puntos:** 1
- **Dependencias:** S2-17 (Tipo de producto «servicio»)
- **Criterios de aceptación:**
  1. Checklist: el servicio no pide envío.
  2. Checklist: la cotización llega al vendedor.
  3. Checklist: la ficha dice «Servicio».
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/compradores/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

#### S2-40 · Páginas legales sin marcadores
- **Historia:** Como comprador quiero leer las páginas legales sin «[REVISIÓN LEGAL]» para confiar en el sitio.
- **Responsable:** QA Compradores
- **Prioridad:** P1 · **Puntos:** 1
- **Dependencias:** S1-69 (Textos LEG-1 a LEG-3 para aprobar)
- **Criterios de aceptación:**
  1. Checklist: las 5 páginas revisadas.
  2. Checklist: retracto de 8 días hábiles visible.
  3. Checklist: sin «[PENDIENTE]».
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/compradores/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

#### S2-41 · Rendimiento percibido de la portada
- **Historia:** Como comprador quiero medir desde el teléfono cuánto tarda la portada para comparar antes y después.
- **Responsable:** QA Compradores
- **Prioridad:** P2 · **Puntos:** 1
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: medición en 4G simulado y wifi.
  2. Checklist: se anota el tiempo hasta ver productos.
  3. Checklist: capturas del antes y después.
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/compradores/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

### Sprint 2 · QA Negocios

#### S2-42 · Crear productos con variantes
- **Historia:** Como vendedor quiero crear un producto con variantes desde el panel para vender tallas y colores.
- **Responsable:** QA Negocios
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** S2-16 (Editor de variantes)
- **Criterios de aceptación:**
  1. Checklist: guardo variantes con stock propio.
  2. Checklist: el POS muestra las variantes.
  3. Checklist: editar una variante no borra las otras.
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/negocios/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

#### S2-43 · Publicar un servicio
- **Historia:** Como vendedor quiero publicar un servicio desde el panel para ofrecer lo que hago.
- **Responsable:** QA Negocios
- **Prioridad:** P1 · **Puntos:** 1
- **Dependencias:** S2-17 (Tipo de producto «servicio»)
- **Criterios de aceptación:**
  1. Checklist: no pide stock ni bodega.
  2. Checklist: precio fijo o a cotizar.
  3. Checklist: se ve en la tienda pública con su etiqueta.
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/negocios/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

#### S2-44 · Categoría del negocio por defecto
- **Historia:** Como vendedor quiero que mis productos nuevos tomen la categoría del negocio para ahorrar clics.
- **Responsable:** QA Negocios
- **Prioridad:** P1 · **Puntos:** 1
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: la categoría viene precargada.
  2. Checklist: puedo cambiarla.
  3. Checklist: se guarda la que elegí.
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/negocios/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

#### S2-45 · Guías una sola vez
- **Historia:** Como vendedor quiero comprobar que las guías no reaparecen después de «Omitir» para trabajar sin interrupciones.
- **Responsable:** QA Negocios
- **Prioridad:** P2 · **Puntos:** 1
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: «Omitir» las apaga en todas las pantallas.
  2. Checklist: no tapan botones.
  3. Checklist: se reactivan desde Configuración.
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/negocios/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

#### S2-46 · Bodega que guarda y avisa la primera vez
- **Historia:** Como vendedor quiero crear una bodega y que se guarde al primer intento o me diga por qué no para no perder datos.
- **Responsable:** QA Negocios
- **Prioridad:** P1 · **Puntos:** 1
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: guarda al primer intento con datos válidos.
  2. Checklist: si falla, muestra el motivo en español.
  3. Checklist: el aviso «Falta la ubicación de despacho» desaparece al crearla.
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/negocios/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

### Sprint 2 · QA Automatización y Regresión

#### S2-47 · Corrida nocturna contra staging
- **Historia:** Como equipo quiero que los guiones de regresión corran cada noche contra staging para enterarnos temprano de una rotura.
- **Responsable:** QA Automatización y Regresión
- **Prioridad:** P1 · **Puntos:** 3
- **Dependencias:** S2-61 (Staging en staging.hotclick.lat); S1-52 (Guion web de regresión del checkout)
- **Criterios de aceptación:**
  1. Checklist: corre checkout, registro y POS.
  2. Checklist: el resultado llega a Grok Bot cada mañana.
  3. Checklist: solo usa staging y cuentas QA-TEST.
  4. Checklist: el guion solo maneja el navegador (clics, formularios y lectura de pantalla); no llama a la API, no toca la base de datos ni el servidor y no modifica el código del repo.
  5. Checklist: el guion vive en /workspace/qa/regresion/ y corre a 390 y 1440 px, con captura de cada paso que falle.
  6. Dado tres corridas seguidas sin cambios en el sitio, cuando se comparan, entonces dan el mismo resultado (menos de 1 prueba inestable por corrida).
  7. Checklist: el resultado (verde o rojo, con la lista de fallos) queda en un informe fechado y los fallos se reportan al Desarrollador.

#### S2-48 · Smoke automático después de cada deploy a staging
- **Historia:** Como equipo quiero que el smoke corra solo después de cada deploy a staging para no revisar a mano cada vez.
- **Responsable:** QA Automatización y Regresión
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** S1-55 (Smoke de 10 minutos después de cada deploy); S2-60 (Pipeline de CI/CD)
- **Criterios de aceptación:**
  1. Checklist: se dispara al terminar el deploy.
  2. Checklist: un fallo frena la promoción a producción.
  3. Checklist: tarda menos de 10 minutos.
  4. Checklist: el guion solo maneja el navegador (clics, formularios y lectura de pantalla); no llama a la API, no toca la base de datos ni el servidor y no modifica el código del repo.
  5. Checklist: el guion vive en /workspace/qa/regresion/ y corre a 390 y 1440 px, con captura de cada paso que falle.
  6. Dado tres corridas seguidas sin cambios en el sitio, cuando se comparan, entonces dan el mismo resultado (menos de 1 prueba inestable por corrida).
  7. Checklist: el resultado (verde o rojo, con la lista de fallos) queda en un informe fechado y los fallos se reportan al Desarrollador.

#### S2-49 · Matriz de regresión priorizada
- **Historia:** Como equipo quiero una matriz de qué flujos se prueban en cada corrida (P0 siempre, P1 cada noche, P2 semanal) para gastar poco y cubrir lo importante.
- **Responsable:** QA Automatización y Regresión
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: cada flujo con prioridad y frecuencia.
  2. Checklist: incluye compradores, negocios, admin y POS.
  3. Checklist: aprobada por QA (calidad).
  4. Checklist: el guion solo maneja el navegador (clics, formularios y lectura de pantalla); no llama a la API, no toca la base de datos ni el servidor y no modifica el código del repo.
  5. Checklist: el guion vive en /workspace/qa/regresion/ y corre a 390 y 1440 px, con captura de cada paso que falle.
  6. Dado tres corridas seguidas sin cambios en el sitio, cuando se comparan, entonces dan el mismo resultado (menos de 1 prueba inestable por corrida).
  7. Checklist: el resultado (verde o rojo, con la lista de fallos) queda en un informe fechado y los fallos se reportan al Desarrollador.

#### S2-50 · Informe de pruebas inestables
- **Historia:** Como equipo quiero un informe semanal de pruebas que fallan a veces para arreglarlas antes de que nadie confíe en la regresión.
- **Responsable:** QA Automatización y Regresión
- **Prioridad:** P2 · **Puntos:** 1
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: lista con frecuencia de fallo.
  2. Checklist: causa probable.
  3. Checklist: dueño asignado.
  4. Checklist: el guion solo maneja el navegador (clics, formularios y lectura de pantalla); no llama a la API, no toca la base de datos ni el servidor y no modifica el código del repo.
  5. Checklist: el guion vive en /workspace/qa/regresion/ y corre a 390 y 1440 px, con captura de cada paso que falle.
  6. Dado tres corridas seguidas sin cambios en el sitio, cuando se comparan, entonces dan el mismo resultado (menos de 1 prueba inestable por corrida).
  7. Checklist: el resultado (verde o rojo, con la lista de fallos) queda en un informe fechado y los fallos se reportan al Desarrollador.

#### S2-51 · Guion web de aprobación de negocios
- **Historia:** Como equipo quiero un guion que cree un negocio, lo busque como visitante y confirme que no aparece hasta «Aprobar» para proteger la regla de aprobación.
- **Responsable:** QA Automatización y Regresión
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** S1-19 (Botón «Aprobar» y ninguna tienda pública antes de aprobar)
- **Criterios de aceptación:**
  1. Checklist: busca la tienda y sus productos antes y después de aprobar.
  2. Checklist: la aprobación la hace una persona con cuenta admin de prueba desde la web.
  3. Checklist: corre en staging.
  4. Checklist: el guion solo maneja el navegador (clics, formularios y lectura de pantalla); no llama a la API, no toca la base de datos ni el servidor y no modifica el código del repo.
  5. Checklist: el guion vive en /workspace/qa/regresion/ y corre a 390 y 1440 px, con captura de cada paso que falle.
  6. Dado tres corridas seguidas sin cambios en el sitio, cuando se comparan, entonces dan el mismo resultado (menos de 1 prueba inestable por corrida).
  7. Checklist: el resultado (verde o rojo, con la lista de fallos) queda en un informe fechado y los fallos se reportan al Desarrollador.

### Sprint 2 · Seguridad

#### S2-52 · Modelo de amenazas del flujo ONVO
- **Historia:** Como dueño de HotClick quiero un modelo de amenazas del alta de negocios, checkout, webhook y polling para anticipar riesgos antes de programar.
- **Responsable:** Seguridad
- **Prioridad:** P1 · **Puntos:** 3
- **Dependencias:** S2-09 (Documento de arquitectura ONVO Marketplace)
- **Criterios de aceptación:**
  1. Checklist: STRIDE por componente.
  2. Checklist: controles asignados a historias.
  3. Checklist: incluye el secreto compartido del webhook (no es firma HMAC).
  4. Checklist: informe corto en /workspace/seguridad/ con cada hallazgo, su gravedad (crítico, alto, medio o bajo) y el arreglo propuesto.
  5. Dado el informe, cuando se cierra la historia, entonces no queda ningún hallazgo crítico ni alto abierto sin plan y sin dueño.
  6. Checklist: no se hacen ataques ni pruebas destructivas en producción; lo que se prueba en vivo se hace con cuentas QA-TEST y con OK de HOT_CLICK.
  7. Checklist: ninguna llave, secreto ni dato personal se copia al informe ni al chat.

#### S2-53 · Alcance PCI con Checkout hospedado
- **Historia:** Como dueño de HotClick quiero confirmar que HotClick no toca datos de tarjeta para saber qué cuestionario PCI aplica.
- **Responsable:** Seguridad
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: conclusión del SAQ estimado.
  2. Checklist: puntos a confirmar con ONVO.
  3. Checklist: CSP mínima para la redirección.
  4. Checklist: informe corto en /workspace/seguridad/ con cada hallazgo, su gravedad (crítico, alto, medio o bajo) y el arreglo propuesto.
  5. Dado el informe, cuando se cierra la historia, entonces no queda ningún hallazgo crítico ni alto abierto sin plan y sin dueño.
  6. Checklist: no se hacen ataques ni pruebas destructivas en producción; lo que se prueba en vivo se hace con cuentas QA-TEST y con OK de HOT_CLICK.
  7. Checklist: ninguna llave, secreto ni dato personal se copia al informe ni al chat.

#### S2-54 · Revisión de seguridad del pipeline
- **Historia:** Como dueño de HotClick quiero revisar permisos y secretos del pipeline para que el CI no sea la puerta de entrada.
- **Responsable:** Seguridad
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** S2-60 (Pipeline de CI/CD)
- **Criterios de aceptación:**
  1. Checklist: permisos mínimos en los workflows.
  2. Checklist: secretos solo en GitHub Secrets y environment production protegido.
  3. Checklist: acciones fijadas por versión.
  4. Checklist: informe corto en /workspace/seguridad/ con cada hallazgo, su gravedad (crítico, alto, medio o bajo) y el arreglo propuesto.
  5. Dado el informe, cuando se cierra la historia, entonces no queda ningún hallazgo crítico ni alto abierto sin plan y sin dueño.
  6. Checklist: no se hacen ataques ni pruebas destructivas en producción; lo que se prueba en vivo se hace con cuentas QA-TEST y con OK de HOT_CLICK.
  7. Checklist: ninguna llave, secreto ni dato personal se copia al informe ni al chat.

#### S2-55 · Revisión de los backups cifrados
- **Historia:** Como dueño de HotClick quiero revisar el cifrado y el destino de los backups para que una copia filtrada no sirva.
- **Responsable:** Seguridad
- **Prioridad:** P0 · **Puntos:** 2
- **Dependencias:** S2-62 (Backups cifrados automáticos a Google Drive)
- **Criterios de aceptación:**
  1. Checklist: clave fuera del repo y del servidor de la base.
  2. Checklist: la carpeta de Drive no es pública.
  3. Checklist: el backup viejo sin cifrar de GitHub Actions queda borrado o desactivado.
  4. Checklist: informe corto en /workspace/seguridad/ con cada hallazgo, su gravedad (crítico, alto, medio o bajo) y el arreglo propuesto.
  5. Dado el informe, cuando se cierra la historia, entonces no queda ningún hallazgo crítico ni alto abierto sin plan y sin dueño.
  6. Checklist: no se hacen ataques ni pruebas destructivas en producción; lo que se prueba en vivo se hace con cuentas QA-TEST y con OK de HOT_CLICK.
  7. Checklist: ninguna llave, secreto ni dato personal se copia al informe ni al chat.

#### S2-56 · Regla de gitleaks para llaves de ONVO
- **Historia:** Como equipo quiero una regla que detecte onvo_test_ y onvo_live_ para que ninguna llave llegue al repo.
- **Responsable:** Seguridad
- **Prioridad:** P1 · **Puntos:** 1
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: regla en el CI.
  2. Checklist: probada con una llave falsa.
  3. Checklist: falla el PR si detecta una.
  4. Checklist: informe corto en /workspace/seguridad/ con cada hallazgo, su gravedad (crítico, alto, medio o bajo) y el arreglo propuesto.
  5. Dado el informe, cuando se cierra la historia, entonces no queda ningún hallazgo crítico ni alto abierto sin plan y sin dueño.
  6. Checklist: no se hacen ataques ni pruebas destructivas en producción; lo que se prueba en vivo se hace con cuentas QA-TEST y con OK de HOT_CLICK.
  7. Checklist: ninguna llave, secreto ni dato personal se copia al informe ni al chat.

#### S2-57 · Pruebas de seguridad en producción con QA-TEST (SEG-O)
- **Historia:** Como dueño de HotClick quiero confirmar en vivo que #141–#149 cierran de verdad para no depender solo de la lectura de código.
- **Responsable:** Seguridad
- **Prioridad:** P1 · **Puntos:** 3
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: solo con cuentas QA-TEST y OK de HOT_CLICK.
  2. Checklist: sin pruebas destructivas.
  3. Checklist: resultados por cada hallazgo original.
  4. Checklist: informe corto en /workspace/seguridad/ con cada hallazgo, su gravedad (crítico, alto, medio o bajo) y el arreglo propuesto.
  5. Dado el informe, cuando se cierra la historia, entonces no queda ningún hallazgo crítico ni alto abierto sin plan y sin dueño.
  6. Checklist: no se hacen ataques ni pruebas destructivas en producción; lo que se prueba en vivo se hace con cuentas QA-TEST y con OK de HOT_CLICK.
  7. Checklist: ninguna llave, secreto ni dato personal se copia al informe ni al chat.

#### S2-58 · Claim de correo verificado en Clerk (SEG-Q)
- **Historia:** Como dueño de HotClick quiero verificar la plantilla de JWT de Clerk con el claim de correo verificado para cerrar la condición del hotfix de P1-01.
- **Responsable:** Seguridad
- **Prioridad:** P1 · **Puntos:** 1
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: plantilla configurada por HOT_CLICK.
  2. Checklist: el backend rechaza tokens sin correo verificado donde corresponde.
  3. Checklist: probado con una cuenta sin verificar.
  4. Checklist: informe corto en /workspace/seguridad/ con cada hallazgo, su gravedad (crítico, alto, medio o bajo) y el arreglo propuesto.
  5. Dado el informe, cuando se cierra la historia, entonces no queda ningún hallazgo crítico ni alto abierto sin plan y sin dueño.
  6. Checklist: no se hacen ataques ni pruebas destructivas en producción; lo que se prueba en vivo se hace con cuentas QA-TEST y con OK de HOT_CLICK.
  7. Checklist: ninguna llave, secreto ni dato personal se copia al informe ni al chat.

#### S2-59 · CSP acotada (QA-PROD-7 / P12-06)
- **Historia:** Como dueño de HotClick quiero acotar la CSP que hoy permite *.amazonaws.com para reducir la superficie de ataque del navegador.
- **Responsable:** Seguridad
- **Prioridad:** P2 · **Puntos:** 2
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: se confirma el host exacto del bucket o de las URL firmadas y se reemplaza el comodín.
  2. Checklist: facebook.com en frame-src se deja solo si sigue haciendo falta para los embeds y nunca para Meta Pixel.
  3. Checklist: fotos, videos y miniaturas siguen cargando en staging.
  4. Checklist: informe corto en /workspace/seguridad/ con cada hallazgo, su gravedad (crítico, alto, medio o bajo) y el arreglo propuesto.
  5. Dado el informe, cuando se cierra la historia, entonces no queda ningún hallazgo crítico ni alto abierto sin plan y sin dueño.
  6. Checklist: no se hacen ataques ni pruebas destructivas en producción; lo que se prueba en vivo se hace con cuentas QA-TEST y con OK de HOT_CLICK.
  7. Checklist: ninguna llave, secreto ni dato personal se copia al informe ni al chat.

### Sprint 2 · DevOps y Seguridad

#### S2-60 · Pipeline de CI/CD
- **Historia:** Como equipo quiero un pipeline que construya, pruebe y despliegue a staging de forma automática para dejar los deploys a mano.
- **Responsable:** DevOps y Seguridad
- **Prioridad:** P0 · **Puntos:** 5
- **Dependencias:** S2-03 (Ser revisor obligatorio de los deploys a producción)
- **Criterios de aceptación:**
  1. Checklist: build, pruebas, gates de seguridad y construcción de imagen en cada PR.
  2. Checklist: deploy automático a staging al mergear.
  3. Checklist: deploy a producción solo con la aprobación manual de HOT_CLICK.
  4. Checklist: el cambio queda documentado en un runbook en /workspace/infra/ con los pasos para hacerlo y para deshacerlo.
  5. Dado cualquier paso que toque producción, cuando está listo, entonces espera la aprobación manual de HOT_CLICK antes de ejecutarse.
  6. Checklist: los secretos se guardan en los secretos del servidor o de GitHub, nunca en el repo, en el chat ni en los logs.
  7. Dado el cambio aplicado, cuando se revisa el monitoreo, entonces el sitio responde y /api/health está en verde.

#### S2-61 · Staging en staging.hotclick.lat
- **Historia:** Como equipo quiero un staging en el mismo Lightsail con su propia base y límites de CPU y memoria para probar como en producción.
- **Responsable:** DevOps y Seguridad
- **Prioridad:** P1 · **Puntos:** 5
- **Dependencias:** S2-02 (DNS de staging y acceso a Google Drive)
- **Criterios de aceptación:**
  1. Checklist: HTTPS válido y URL pública para webhooks de ONVO.
  2. Checklist: base propia sin datos de producción.
  3. Checklist: límites para que no afecte a producción.
  4. Checklist: el cambio queda documentado en un runbook en /workspace/infra/ con los pasos para hacerlo y para deshacerlo.
  5. Dado cualquier paso que toque producción, cuando está listo, entonces espera la aprobación manual de HOT_CLICK antes de ejecutarse.
  6. Checklist: los secretos se guardan en los secretos del servidor o de GitHub, nunca en el repo, en el chat ni en los logs.
  7. Dado el cambio aplicado, cuando se revisa el monitoreo, entonces el sitio responde y /api/health está en verde.

#### S2-62 · Backups cifrados automáticos a Google Drive
- **Historia:** Como dueño de HotClick quiero un backup diario cifrado de Postgres que se guarde en Google Drive para no perder datos.
- **Responsable:** DevOps y Seguridad
- **Prioridad:** P0 · **Puntos:** 5
- **Dependencias:** S2-02 (DNS de staging y acceso a Google Drive)
- **Criterios de aceptación:**
  1. Checklist: dump de la base correcta, cifrado antes de salir del servidor.
  2. Checklist: retención definida (los días los fija HOT_CLICK) y borrado de copias viejas.
  3. Checklist: alerta si un backup falla.
  4. Checklist: el cambio queda documentado en un runbook en /workspace/infra/ con los pasos para hacerlo y para deshacerlo.
  5. Dado cualquier paso que toque producción, cuando está listo, entonces espera la aprobación manual de HOT_CLICK antes de ejecutarse.
  6. Checklist: los secretos se guardan en los secretos del servidor o de GitHub, nunca en el repo, en el chat ni en los logs.
  7. Dado el cambio aplicado, cuando se revisa el monitoreo, entonces el sitio responde y /api/health está en verde.

#### S2-63 · Prueba de restauración
- **Historia:** Como dueño de HotClick quiero restaurar un backup en una base de prueba para saber que los backups sirven.
- **Responsable:** DevOps y Seguridad
- **Prioridad:** P0 · **Puntos:** 3
- **Dependencias:** S2-62 (Backups cifrados automáticos a Google Drive)
- **Criterios de aceptación:**
  1. Checklist: restauración completa en staging o en una base temporal.
  2. Checklist: conteo de filas clave igual al origen.
  3. Checklist: tiempo de restauración medido y anotado.
  4. Checklist: el cambio queda documentado en un runbook en /workspace/infra/ con los pasos para hacerlo y para deshacerlo.
  5. Dado cualquier paso que toque producción, cuando está listo, entonces espera la aprobación manual de HOT_CLICK antes de ejecutarse.
  6. Checklist: los secretos se guardan en los secretos del servidor o de GitHub, nunca en el repo, en el chat ni en los logs.
  7. Dado el cambio aplicado, cuando se revisa el monitoreo, entonces el sitio responde y /api/health está en verde.

#### S2-64 · Vuelta atrás por etiqueta ensayada
- **Historia:** Como dueño de HotClick quiero un procedimiento de vuelta atrás por etiqueta probado en staging para volver a la versión anterior en minutos.
- **Responsable:** DevOps y Seguridad
- **Prioridad:** P0 · **Puntos:** 3
- **Dependencias:** S2-60 (Pipeline de CI/CD)
- **Criterios de aceptación:**
  1. Checklist: pasos escritos para código y base.
  2. Checklist: ensayo en staging con tiempo medido.
  3. Checklist: el pipeline guarda la etiqueta de cada deploy.
  4. Checklist: el cambio queda documentado en un runbook en /workspace/infra/ con los pasos para hacerlo y para deshacerlo.
  5. Dado cualquier paso que toque producción, cuando está listo, entonces espera la aprobación manual de HOT_CLICK antes de ejecutarse.
  6. Checklist: los secretos se guardan en los secretos del servidor o de GitHub, nunca en el repo, en el chat ni en los logs.
  7. Dado el cambio aplicado, cuando se revisa el monitoreo, entonces el sitio responde y /api/health está en verde.

#### S2-65 · Monitor de caídas y alertas
- **Historia:** Como equipo quiero un monitor externo (Uptime Kuma o Gatus) con alertas al bot de Telegram para enterarnos antes que los clientes.
- **Responsable:** DevOps y Seguridad
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: revisa la portada y /api/health cada minuto.
  2. Checklist: alerta a Grok Bot por Telegram, no al dueño directo.
  3. Checklist: CrowdSec evaluado para el servidor.
  4. Checklist: el cambio queda documentado en un runbook en /workspace/infra/ con los pasos para hacerlo y para deshacerlo.
  5. Dado cualquier paso que toque producción, cuando está listo, entonces espera la aprobación manual de HOT_CLICK antes de ejecutarse.
  6. Checklist: los secretos se guardan en los secretos del servidor o de GitHub, nunca en el repo, en el chat ni en los logs.
  7. Dado el cambio aplicado, cuando se revisa el monitoreo, entonces el sitio responde y /api/health está en verde.

#### S2-66 · Alertas de gasto de AWS (INF-12)
- **Historia:** Como dueño de HotClick quiero alertas de gasto en AWS para no quedarme sin créditos de sorpresa.
- **Responsable:** DevOps y Seguridad
- **Prioridad:** P1 · **Puntos:** 1
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: umbrales los fija HOT_CLICK («monto a definir por HOT_CLICK»).
  2. Checklist: alerta llega al correo oficial.
  3. Checklist: probado con un umbral bajo.
  4. Checklist: el cambio queda documentado en un runbook en /workspace/infra/ con los pasos para hacerlo y para deshacerlo.
  5. Dado cualquier paso que toque producción, cuando está listo, entonces espera la aprobación manual de HOT_CLICK antes de ejecutarse.
  6. Checklist: los secretos se guardan en los secretos del servidor o de GitHub, nunca en el repo, en el chat ni en los logs.
  7. Dado el cambio aplicado, cuando se revisa el monitoreo, entonces el sitio responde y /api/health está en verde.

#### S2-67 · Revisiones automáticas (INF-6)
- **Historia:** Como equipo quiero actionlint, zizmor, Hadolint, Trivy, Squawk y CodeQL en el CI para detectar problemas sin revisar a mano.
- **Responsable:** DevOps y Seguridad
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** S2-60 (Pipeline de CI/CD)
- **Criterios de aceptación:**
  1. Checklist: cada herramienta corre en los PR.
  2. Checklist: los hallazgos se reportan sin bloquear al principio, luego bloquean los altos.
  3. Checklist: documentado qué hace cada una.
  4. Checklist: el cambio queda documentado en un runbook en /workspace/infra/ con los pasos para hacerlo y para deshacerlo.
  5. Dado cualquier paso que toque producción, cuando está listo, entonces espera la aprobación manual de HOT_CLICK antes de ejecutarse.
  6. Checklist: los secretos se guardan en los secretos del servidor o de GitHub, nunca en el repo, en el chat ni en los logs.
  7. Dado el cambio aplicado, cuando se revisa el monitoreo, entonces el sitio responde y /api/health está en verde.

#### S2-68 · Llaves de sandbox en staging y CI
- **Historia:** Como equipo quiero cargar ONVO_SECRET_KEY y ONVO_WEBHOOK_SECRET de prueba en staging y en los secretos del CI para integrar sin cobros reales.
- **Responsable:** DevOps y Seguridad
- **Prioridad:** P1 · **Puntos:** 1
- **Dependencias:** S2-01 (Llaves de sandbox de ONVO y secreto del webhook); S2-61 (Staging en staging.hotclick.lat)
- **Criterios de aceptación:**
  1. Checklist: solo llaves onvo_test_.
  2. Checklist: nunca en VITE_* ni en el front.
  3. Checklist: el arranque falla si el modo no coincide con la llave.
  4. Checklist: el cambio queda documentado en un runbook en /workspace/infra/ con los pasos para hacerlo y para deshacerlo.
  5. Dado cualquier paso que toque producción, cuando está listo, entonces espera la aprobación manual de HOT_CLICK antes de ejecutarse.
  6. Checklist: los secretos se guardan en los secretos del servidor o de GitHub, nunca en el repo, en el chat ni en los logs.
  7. Dado el cambio aplicado, cuando se revisa el monitoreo, entonces el sitio responde y /api/health está en verde.

### Sprint 2 · Producto Contenido y Soporte

#### S2-69 · FAQ «¿Qué es ONVO?»
- **Historia:** Como vendedor quiero un borrador de preguntas frecuentes sobre ONVO para entender por qué me piden datos.
- **Responsable:** Producto Contenido y Soporte
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: explica KYC e IBAN en el formulario de ONVO.
  2. Checklist: liquidación quincenal o mensual con US$3 cada una y el mínimo para liquidar de ₡20.000 si ONVO lo confirma.
  3. Checklist: explica el ajuste semanal del mínimo de ₡700 como comisión del vendedor, no como mínimo de compra.
  4. Checklist: el texto está en español de Costa Rica, con voseo, claro y sin jerga técnica.
  5. Checklist: no inventa montos; usa solo los decididos por HOT_CLICK o dice «monto a definir por HOT_CLICK».
  6. Dado el texto final, cuando HOT_CLICK lo revisa, entonces se publica solo con su aprobación escrita.
  7. Checklist: no promete WhatsApp API, no usa Meta Pixel y no presenta a Tilopay como pasarela vigente una vez que ONVO esté en uso.

#### S2-70 · Prohibidos de ONVO en las reglas de publicación
- **Historia:** Como dueño de HotClick quiero llevar la lista de prohibidos de ONVO a las reglas de publicación y moderación para no arriesgar la cuenta primaria.
- **Responsable:** Producto Contenido y Soporte
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: medicamentos y suplementos sin permiso, falsificaciones y demás puntos de los Términos §4.
  2. Checklist: categorías que tocan esos puntos marcadas para revisión.
  3. Checklist: texto para el vendedor al publicar.
  4. Checklist: el texto está en español de Costa Rica, con voseo, claro y sin jerga técnica.
  5. Checklist: no inventa montos; usa solo los decididos por HOT_CLICK o dice «monto a definir por HOT_CLICK».
  6. Dado el texto final, cuando HOT_CLICK lo revisa, entonces se publica solo con su aprobación escrita.
  7. Checklist: no promete WhatsApp API, no usa Meta Pixel y no presenta a Tilopay como pasarela vigente una vez que ONVO esté en uso.

#### S2-71 · Borrador del Acuerdo de vendedores con ONVO
- **Historia:** Como dueño de HotClick quiero un borrador del Acuerdo de vendedores con onboarding, IBAN, retención de 0,777 %, liquidación y US$3 para que cada negocio sepa a qué se compromete.
- **Responsable:** Producto Contenido y Soporte
- **Prioridad:** P1 · **Puntos:** 3
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: incluye la comisión del plan (9 % o 7 %) y el mínimo de ₡700 por diferencia semanal si ONVO lo confirma.
  2. Checklist: incluye la cláusula de factura a HotClick o de responsabilidad del porcentaje como borrador para el contador.
  3. Checklist: marcado para revisión del abogado.
  4. Checklist: el texto está en español de Costa Rica, con voseo, claro y sin jerga técnica.
  5. Checklist: no inventa montos; usa solo los decididos por HOT_CLICK o dice «monto a definir por HOT_CLICK».
  6. Dado el texto final, cuando HOT_CLICK lo revisa, entonces se publica solo con su aprobación escrita.
  7. Checklist: no promete WhatsApp API, no usa Meta Pixel y no presenta a Tilopay como pasarela vigente una vez que ONVO esté en uso.

#### S2-72 · Privacidad con datos fiscales y cédula del pagador
- **Historia:** Como comprador quiero actualizar la Política de Privacidad con la cédula del pagador SINPE y los datos fiscales para saber qué datos se guardan y para qué.
- **Responsable:** Producto Contenido y Soporte
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: finalidad, plazo de conservación (a definir por HOT_CLICK) y derechos.
  2. Checklist: proveedores que tratan datos listados (ONVO, correo, IA).
  3. Checklist: alineado con PRODHAB.
  4. Checklist: el texto está en español de Costa Rica, con voseo, claro y sin jerga técnica.
  5. Checklist: no inventa montos; usa solo los decididos por HOT_CLICK o dice «monto a definir por HOT_CLICK».
  6. Dado el texto final, cuando HOT_CLICK lo revisa, entonces se publica solo con su aprobación escrita.
  7. Checklist: no promete WhatsApp API, no usa Meta Pixel y no presenta a Tilopay como pasarela vigente una vez que ONVO esté en uso.

#### S2-73 · Guion para la llamada con ONVO
- **Historia:** Como dueño de HotClick quiero una agenda con preguntas priorizadas para la llamada con ONVO para salir con respuestas concretas.
- **Responsable:** Producto Contenido y Soporte
- **Prioridad:** P1 · **Puntos:** 1
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: preguntas de frecuencia, mínimo, pausa, reembolsos, contracargos, IVA y tarifas.
  2. Checklist: acta con acuerdos después de la llamada.
  3. Checklist: respuestas archivadas.
  4. Checklist: el texto está en español de Costa Rica, con voseo, claro y sin jerga técnica.
  5. Checklist: no inventa montos; usa solo los decididos por HOT_CLICK o dice «monto a definir por HOT_CLICK».
  6. Dado el texto final, cuando HOT_CLICK lo revisa, entonces se publica solo con su aprobación escrita.
  7. Checklist: no promete WhatsApp API, no usa Meta Pixel y no presenta a Tilopay como pasarela vigente una vez que ONVO esté en uso.

#### S2-74 · Tabla de decisiones del dueño
- **Historia:** Como equipo quiero una tabla con cada decisión pendiente, opciones y fecha para no construir cosas que haya que rehacer.
- **Responsable:** Producto Contenido y Soporte
- **Prioridad:** P1 · **Puntos:** 1
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: todas las preguntas de los informes del 16-oct incluidas.
  2. Checklist: cada una con opciones A y B.
  3. Checklist: se actualiza cada viernes.
  4. Checklist: el texto está en español de Costa Rica, con voseo, claro y sin jerga técnica.
  5. Checklist: no inventa montos; usa solo los decididos por HOT_CLICK o dice «monto a definir por HOT_CLICK».
  6. Dado el texto final, cuando HOT_CLICK lo revisa, entonces se publica solo con su aprobación escrita.
  7. Checklist: no promete WhatsApp API, no usa Meta Pixel y no presenta a Tilopay como pasarela vigente una vez que ONVO esté en uso.

#### S2-75 · Tapar «Tilopay» en capturas (MKT-1)
- **Historia:** Como dueño de HotClick quiero tapar Tilopay en las capturas de planes y videos para no confundir a los vendedores.
- **Responsable:** Producto Contenido y Soporte
- **Prioridad:** P1 · **Puntos:** 1
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: capturas revisadas.
  2. Checklist: textos que dicen Tilopay listados para cambiar cuando ONVO esté vivo.
  3. Checklist: nada se publica sin OK.
  4. Checklist: el texto está en español de Costa Rica, con voseo, claro y sin jerga técnica.
  5. Checklist: no inventa montos; usa solo los decididos por HOT_CLICK o dice «monto a definir por HOT_CLICK».
  6. Dado el texto final, cuando HOT_CLICK lo revisa, entonces se publica solo con su aprobación escrita.
  7. Checklist: no promete WhatsApp API, no usa Meta Pixel y no presenta a Tilopay como pasarela vigente una vez que ONVO esté en uso.

### Sprint 2 · Finanzas

#### S2-76 · Opciones para cobrar la mensualidad
- **Historia:** Como dueño de HotClick quiero comparar cargo aparte (día 28/13) contra tarifa semanal para Pyme ₡12.900 y Negocio Plus ₡28.900 para decidir cómo cobrar.
- **Responsable:** Finanzas
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: no calcula un equivalente semanal hasta que HOT_CLICK decida.
  2. Checklist: riesgos de cada opción.
  3. Checklist: decisión marcada.
  4. Checklist: usa solo montos dados por HOT_CLICK o publicados en las fuentes; cualquier otro dice «monto a definir por HOT_CLICK».
  5. Checklist: la planilla o el informe queda en /workspace/finanzas/ con fecha y la fuente de cada cifra.
  6. Dado una muestra de casos, cuando se recalculan a mano, entonces el resultado cuadra o la diferencia queda explicada.
  7. Dado el resultado, cuando se le entrega a HOT_CLICK por medio de Grok Bot, entonces queda anotada su respuesta o decisión.

#### S2-77 · Costo de liquidación quincenal contra mensual
- **Historia:** Como dueño de HotClick quiero explicar el costo de US$3 por liquidación para cada frecuencia para que el negocio elija informado.
- **Responsable:** Finanzas
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: quincenal = dos cargos de US$3 al mes; mensual = uno.
  2. Checklist: efecto del mínimo de ₡20.000 para liquidar si aplica.
  3. Checklist: texto corto para el registro.
  4. Checklist: usa solo montos dados por HOT_CLICK o publicados en las fuentes; cualquier otro dice «monto a definir por HOT_CLICK».
  5. Checklist: la planilla o el informe queda en /workspace/finanzas/ con fecha y la fuente de cada cifra.
  6. Dado una muestra de casos, cuando se recalculan a mano, entonces el resultado cuadra o la diferencia queda explicada.
  7. Dado el resultado, cuando se le entrega a HOT_CLICK por medio de Grok Bot, entonces queda anotada su respuesta o decisión.

#### S2-78 · Revisión del modelo de datos para conciliar
- **Historia:** Como equipo quiero revisar que el modelo de datos ONVO permita conciliar pedidos, cobros, comisiones y reembolsos para cuadrar los números cada día.
- **Responsable:** Finanzas
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** S2-11 (Modelo de datos negocio_onvo_cuenta)
- **Criterios de aceptación:**
  1. Checklist: campos necesarios para conciliar presentes.
  2. Checklist: diferencias entre comisión de ONVO y comisión esperada visibles.
  3. Checklist: comentarios al Desarrollador.
  4. Checklist: usa solo montos dados por HOT_CLICK o publicados en las fuentes; cualquier otro dice «monto a definir por HOT_CLICK».
  5. Checklist: la planilla o el informe queda en /workspace/finanzas/ con fecha y la fuente de cada cifra.
  6. Dado una muestra de casos, cuando se recalculan a mano, entonces el resultado cuadra o la diferencia queda explicada.
  7. Dado el resultado, cuando se le entrega a HOT_CLICK por medio de Grok Bot, entonces queda anotada su respuesta o decisión.

#### S2-79 · Preguntas para el contador, con IVA 13 % no-Tribu
- **Historia:** Como dueño de HotClick quiero preparar con HOT_CLICK las preguntas para el contador, incluida la confirmación de «IVA 13 % no-Tribu» para llegar a la reunión con todo.
- **Responsable:** Finanzas
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** S1-08 (Agendar la reunión con el contador)
- **Criterios de aceptación:**
  1. Checklist: las 10 preguntas de A.5 con contexto.
  2. Checklist: pregunta explícita: ¿es correcto manejar el IVA del 13 % por fuera de TRIBU-CR en régimen simplificado y cómo encaja con la retención de 0,777 % de ONVO?
  3. Checklist: ejemplos con las actividades 4719.9 y 4741.0.
  4. Checklist: usa solo montos dados por HOT_CLICK o publicados en las fuentes; cualquier otro dice «monto a definir por HOT_CLICK».
  5. Checklist: la planilla o el informe queda en /workspace/finanzas/ con fecha y la fuente de cada cifra.
  6. Dado una muestra de casos, cuando se recalculan a mano, entonces el resultado cuadra o la diferencia queda explicada.
  7. Dado el resultado, cuando se le entrega a HOT_CLICK por medio de Grok Bot, entonces queda anotada su respuesta o decisión.

### Sprint 2 · Consultor

#### S2-80 · Revisión de la arquitectura ONVO contra el código
- **Historia:** Como equipo quiero revisar la arquitectura ONVO contra el código existente para reutilizar y no duplicar.
- **Responsable:** Consultor
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** S2-09 (Documento de arquitectura ONVO Marketplace)
- **Criterios de aceptación:**
  1. Checklist: confirma qué clases se reutilizan (OnvoService, OnvoWebhookController, PlanPagoConfirmado).
  2. Checklist: señala riesgos de convivir con Tilopay.
  3. Checklist: recomendaciones priorizadas.
  4. Checklist: el informe queda en /workspace/consultor/ y cita archivo y línea de cada afirmación sobre el código.
  5. Checklist: trabajo solo de lectura: no cambia código, no hace push, no despliega y no le escribe a nadie.
  6. Dado cada hallazgo, cuando se entrega, entonces trae prioridad (P0, P1 o P2), dueño sugerido y si necesita una decisión de HOT_CLICK.
  7. Dado el informe, cuando lo lee el Desarrollador, entonces puede convertir cada recomendación en una historia sin tener que preguntar más.

#### S2-81 · Revisión del plan de CI/CD
- **Historia:** Como equipo quiero revisar el pipeline propuesto para no dejar huecos de seguridad o de vuelta atrás.
- **Responsable:** Consultor
- **Prioridad:** P1 · **Puntos:** 1
- **Dependencias:** S2-60 (Pipeline de CI/CD)
- **Criterios de aceptación:**
  1. Checklist: aprobación manual de HOT_CLICK presente.
  2. Checklist: etiqueta de vuelta atrás y pg_dump presentes.
  3. Checklist: tiempos razonables.
  4. Checklist: el informe queda en /workspace/consultor/ y cita archivo y línea de cada afirmación sobre el código.
  5. Checklist: trabajo solo de lectura: no cambia código, no hace push, no despliega y no le escribe a nadie.
  6. Dado cada hallazgo, cuando se entrega, entonces trae prioridad (P0, P1 o P2), dueño sugerido y si necesita una decisión de HOT_CLICK.
  7. Dado el informe, cuando lo lee el Desarrollador, entonces puede convertir cada recomendación en una historia sin tener que preguntar más.

#### S2-82 · Cruce de FALTA-100 contra este plan
- **Historia:** Como dueño de HotClick quiero cruzar los 108 ítems de FALTA-100 con las historias de este plan para que nada quede afuera.
- **Responsable:** Consultor
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: cada ítem con historia o motivo.
  2. Checklist: ítems sin historia propuestos como nuevas historias.
  3. Checklist: entregado a Producto.
  4. Checklist: el informe queda en /workspace/consultor/ y cita archivo y línea de cada afirmación sobre el código.
  5. Checklist: trabajo solo de lectura: no cambia código, no hace push, no despliega y no le escribe a nadie.
  6. Dado cada hallazgo, cuando se entrega, entonces trae prioridad (P0, P1 o P2), dueño sugerido y si necesita una decisión de HOT_CLICK.
  7. Dado el informe, cuando lo lee el Desarrollador, entonces puede convertir cada recomendación en una historia sin tener que preguntar más.

---

## Sprint 3: ONVO: alta de negocios desde el admin y pago con tarjeta en sandbox
- **Duración:** 1 semana (lunes 2-nov al viernes 6-nov-2026).
- **Objetivo:** Que el admin registre a cada negocio en ONVO con el botón «Registrar negocio en ONVO», fije su % (9 % o 7 % por defecto), pueda «Pausar cobros» del lado de HotClick y vea que el panel de ONVO solo tiene negocios autorizados; que el negocio elija liquidación quincenal o mensual al registrarse; y que un comprador pague con tarjeta en el Checkout hospedado, confirmado por webhook, con un cobro por tienda. Todo en sandbox y staging.
- **Entregable de cierre:** Un negocio de prueba queda activo en ONVO sandbox y una compra con tarjeta de prueba queda pagada por webhook en staging.
- **Historias:** 67 · **Puntos:** 137

| Rol | Historias | Puntos |
|---|---:|---:|
| HOT_CLICK (dueño) | 5 | 5 |
| Desarrollador | 16 | 52 |
| Diseño / UX (Figma) | 5 | 9 |
| QA (calidad) | 5 | 12 |
| QA Compradores | 5 | 10 |
| QA Negocios | 5 | 7 |
| QA Automatización y Regresión | 5 | 9 |
| Seguridad | 5 | 9 |
| DevOps y Seguridad | 5 | 7 |
| Producto Contenido y Soporte | 5 | 7 |
| Finanzas | 3 | 5 |
| Consultor | 3 | 5 |

### Sprint 3 · HOT_CLICK (dueño)

#### S3-01 · Revisar el PR de alta de negocios en ONVO
- **Historia:** Como dueño de HotClick quiero revisar la demo en staging del alta de negocios en ONVO para dar el visto bueno antes de seguir.
- **Responsable:** HOT_CLICK (dueño)
- **Prioridad:** P1 · **Puntos:** 1
- **Dependencias:** S3-07 (Botón «Registrar negocio en ONVO»)
- **Criterios de aceptación:**
  1. Checklist: demo grabada o en vivo del botón «Registrar negocio en ONVO».
  2. Checklist: comentarios de HOT_CLICK anotados.
  3. Checklist: nada se mergea a producción sin su aprobación manual.
  4. Checklist: la decisión o entrega queda anotada con fecha y opción elegida en /workspace/informes/decisiones-hotclick.md.
  5. Dado que HOT_CLICK decide, cuando Grok Bot lo registra, entonces avisa al equipo qué historias quedan destrabadas.
  6. Checklist: credenciales y llaves se entregan solo por un canal seguro (solicitud de secreto), nunca por chat.
  7. Dado que la decisión no llega antes del cierre del sprint, cuando se hace la revisión, entonces las historias que dependen de ella pasan al sprint siguiente sin construirse a medias.

#### S3-02 · Confirmar el % por defecto por plan
- **Historia:** Como dueño de HotClick quiero confirmar que el % por defecto es 9 % para Emprendedor y 7 % para Pyme y Negocio Plus, editable por negocio para que el admin no tenga que adivinar.
- **Responsable:** HOT_CLICK (dueño)
- **Prioridad:** P1 · **Puntos:** 1
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: confirmado por escrito.
  2. Checklist: queda claro quién puede cambiarlo (solo admin).
  3. Checklist: queda claro si se avisa al negocio cuando cambia.
  4. Checklist: la decisión o entrega queda anotada con fecha y opción elegida en /workspace/informes/decisiones-hotclick.md.
  5. Dado que HOT_CLICK decide, cuando Grok Bot lo registra, entonces avisa al equipo qué historias quedan destrabadas.
  6. Checklist: credenciales y llaves se entregan solo por un canal seguro (solicitud de secreto), nunca por chat.
  7. Dado que la decisión no llega antes del cierre del sprint, cuando se hace la revisión, entonces las historias que dependen de ella pasan al sprint siguiente sin construirse a medias.

#### S3-03 · Responder a ONVO las dudas técnicas pendientes
- **Historia:** Como dueño de HotClick quiero seguir con ONVO las preguntas sin respuesta (pausar por API, eventos de reembolso, comisión sobre bruto o neto) para cerrar los «sin confirmar».
- **Responsable:** HOT_CLICK (dueño)
- **Prioridad:** P1 · **Puntos:** 1
- **Dependencias:** S1-03 (Correo a ONVO y apertura de la cuenta primaria)
- **Criterios de aceptación:**
  1. Checklist: cada pregunta con respuesta o fecha de seguimiento.
  2. Checklist: respuestas archivadas.
  3. Checklist: el equipo recibe el resumen.
  4. Checklist: la decisión o entrega queda anotada con fecha y opción elegida en /workspace/informes/decisiones-hotclick.md.
  5. Dado que HOT_CLICK decide, cuando Grok Bot lo registra, entonces avisa al equipo qué historias quedan destrabadas.
  6. Checklist: credenciales y llaves se entregan solo por un canal seguro (solicitud de secreto), nunca por chat.
  7. Dado que la decisión no llega antes del cierre del sprint, cuando se hace la revisión, entonces las historias que dependen de ella pasan al sprint siguiente sin construirse a medias.

#### S3-04 · Elegir la tienda piloto de ONVO
- **Historia:** Como dueño de HotClick quiero elegir la tienda que va a probar ONVO primero en vivo para tener un piloto concreto.
- **Responsable:** HOT_CLICK (dueño)
- **Prioridad:** P1 · **Puntos:** 1
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: tienda elegida con su plan.
  2. Checklist: la persona de la tienda acepta hacer el KYC de ONVO.
  3. Checklist: fecha tentativa para el sprint 6.
  4. Checklist: la decisión o entrega queda anotada con fecha y opción elegida en /workspace/informes/decisiones-hotclick.md.
  5. Dado que HOT_CLICK decide, cuando Grok Bot lo registra, entonces avisa al equipo qué historias quedan destrabadas.
  6. Checklist: credenciales y llaves se entregan solo por un canal seguro (solicitud de secreto), nunca por chat.
  7. Dado que la decisión no llega antes del cierre del sprint, cuando se hace la revisión, entonces las historias que dependen de ella pasan al sprint siguiente sin construirse a medias.

#### S3-05 · Aprobar los bocetos ONVO
- **Historia:** Como dueño de HotClick quiero aprobar los bocetos de Activar cobros, checkout hospedado, carrito con varias tiendas, frecuencia y sección ONVO del admin para que el Desarrollador construya lo aprobado.
- **Responsable:** HOT_CLICK (dueño)
- **Prioridad:** P1 · **Puntos:** 1
- **Dependencias:** S2-25 (Boceto de «Activar cobros» con estados); S2-26 (Bocetos del Checkout hospedado); S2-27 (Boceto del carrito con varias tiendas); S2-28 (Elegir liquidación quincenal o mensual en el registro); S2-29 (Sección ONVO del admin y lista «Negocios ONVO»)
- **Criterios de aceptación:**
  1. Checklist: cada boceto aprobado o con cambios.
  2. Checklist: textos sin montos inventados.
  3. Checklist: decisión anotada.
  4. Checklist: la decisión o entrega queda anotada con fecha y opción elegida en /workspace/informes/decisiones-hotclick.md.
  5. Dado que HOT_CLICK decide, cuando Grok Bot lo registra, entonces avisa al equipo qué historias quedan destrabadas.
  6. Checklist: credenciales y llaves se entregan solo por un canal seguro (solicitud de secreto), nunca por chat.
  7. Dado que la decisión no llega antes del cierre del sprint, cuando se hace la revisión, entonces las historias que dependen de ella pasan al sprint siguiente sin construirse a medias.

### Sprint 3 · Desarrollador

#### S3-06 · Tabla de cuentas conectadas (migración)
- **Historia:** Como sistema quiero crear la tabla de cuentas conectadas con estado, %, tarifa semanal, frecuencia, cobros_onvo_activos, modo y auditoría para saber qué negocios pueden cobrar en línea.
- **Responsable:** Desarrollador
- **Prioridad:** P1 · **Puntos:** 3
- **Dependencias:** S2-11 (Modelo de datos negocio_onvo_cuenta)
- **Criterios de aceptación:**
  1. Checklist: migración reversible, idempotente y con índice único por negocio, proveedor y modo.
  2. Checklist: probada en Postgres limpio (E1b).
  3. Checklist: no guarda onboardingUrl, IBAN ni KYC.
  4. Checklist: el cambio va en su propia rama y PR, con pruebas automáticas (mvn y vitest) en verde y revisión de Seguridad si toca pagos, permisos o datos personales.
  5. Dado que el PR está aprobado, cuando se quiere subir a producción, entonces solo se despliega con la aprobación manual de HOT_CLICK, con pg_dump y etiqueta de vuelta atrás hechos antes.
  6. Checklist: ningún secreto, llave ni dato personal queda en el código o en los logs, y ningún monto queda escrito en el código (sale del plan o de la configuración).
  7. Dado el cambio en staging, cuando QA lo prueba desde el navegador a 390 y 1440 px, entonces no hay errores 500 ni textos «[PENDIENTE]» en las pantallas tocadas.

#### S3-07 · Botón «Registrar negocio en ONVO»
- **Historia:** Como admin de HotClick quiero un botón en la ficha del negocio que cree su cuenta conectada solo cuando lo toco para que el panel de ONVO tenga solo los negocios que yo autoricé.
- **Responsable:** Desarrollador
- **Prioridad:** P0 · **Puntos:** 5
- **Dependencias:** S3-06 (Tabla de cuentas conectadas (migración)); S2-13 (OnvoMarketplaceClient con pruebas simuladas); S3-05 (Aprobar los bocetos ONVO)
- **Criterios de aceptación:**
  1. Dado un negocio aprobado sin cuenta, cuando el admin toca «Registrar negocio en ONVO», entonces se llama a POST /v1/connected-accounts con businessName y marketplaceAppFee del negocio y se guardan id, estado y fecha.
  2. Checklist: el botón solo aparece si el negocio está aprobado y no tiene cuenta; aprobar NO crea nada en ONVO.
  3. Checklist: la llamada es idempotente: si ya hay id de ONVO, no crea otra cuenta.
  4. Checklist: solo rol ADMIN y queda auditado (quién y cuándo).
  5. Checklist: el cambio va en su propia rama y PR, con pruebas automáticas (mvn y vitest) en verde y revisión de Seguridad si toca pagos, permisos o datos personales.
  6. Dado que el PR está aprobado, cuando se quiere subir a producción, entonces solo se despliega con la aprobación manual de HOT_CLICK, con pg_dump y etiqueta de vuelta atrás hechos antes.
  7. Checklist: ningún secreto, llave ni dato personal queda en el código o en los logs, y ningún monto queda escrito en el código (sale del plan o de la configuración).
  8. Dado el cambio en staging, cuando QA lo prueba desde el navegador a 390 y 1440 px, entonces no hay errores 500 ni textos «[PENDIENTE]» en las pantallas tocadas.

#### S3-08 · Enlace de onboarding por canal privado y «Reenviar enlace»
- **Historia:** Como vendedor quiero recibir el enlace de ONVO por mi correo o mi panel y que el admin pueda reenviarlo para completar KYC e IBAN aunque el enlace venza.
- **Responsable:** Desarrollador
- **Prioridad:** P1 · **Puntos:** 3
- **Dependencias:** S3-07 (Botón «Registrar negocio en ONVO»)
- **Criterios de aceptación:**
  1. Checklist: el onboardingUrl se entrega solo al negocio y nunca se escribe en logs.
  2. Checklist: «Reenviar enlace» llama a POST .../onboarding-link; maneja el 409 onboarding_already_completed.
  3. Checklist: el enlace vence en 7 días y el panel lo dice.
  4. Checklist: el cambio va en su propia rama y PR, con pruebas automáticas (mvn y vitest) en verde y revisión de Seguridad si toca pagos, permisos o datos personales.
  5. Dado que el PR está aprobado, cuando se quiere subir a producción, entonces solo se despliega con la aprobación manual de HOT_CLICK, con pg_dump y etiqueta de vuelta atrás hechos antes.
  6. Checklist: ningún secreto, llave ni dato personal queda en el código o en los logs, y ningún monto queda escrito en el código (sale del plan o de la configuración).
  7. Dado el cambio en staging, cuando QA lo prueba desde el navegador a 390 y 1440 px, entonces no hay errores 500 ni textos «[PENDIENTE]» en las pantallas tocadas.

#### S3-09 · Comisión % por negocio editable desde el admin
- **Historia:** Como admin de HotClick quiero un campo «Comisión ONVO (%)» precargado con el % del plan y editable con hasta 2 decimales para ajustar la comisión de cada negocio.
- **Responsable:** Desarrollador
- **Prioridad:** P0 · **Puntos:** 3
- **Dependencias:** S3-07 (Botón «Registrar negocio en ONVO»)
- **Criterios de aceptación:**
  1. Dado que el admin guarda un %, cuando se confirma, entonces se llama a POST /v1/connected-accounts/{id} con marketplaceAppFee y se audita quién y cuándo.
  2. Checklist: si el negocio cambia de plan, el admin ve «el % no coincide con el plan».
  3. Checklist: el vendedor no puede cambiar su % por ninguna vía.
  4. Checklist: el cambio va en su propia rama y PR, con pruebas automáticas (mvn y vitest) en verde y revisión de Seguridad si toca pagos, permisos o datos personales.
  5. Dado que el PR está aprobado, cuando se quiere subir a producción, entonces solo se despliega con la aprobación manual de HOT_CLICK, con pg_dump y etiqueta de vuelta atrás hechos antes.
  6. Checklist: ningún secreto, llave ni dato personal queda en el código o en los logs, y ningún monto queda escrito en el código (sale del plan o de la configuración).
  7. Dado el cambio en staging, cuando QA lo prueba desde el navegador a 390 y 1440 px, entonces no hay errores 500 ni textos «[PENDIENTE]» en las pantallas tocadas.

#### S3-10 · «Pausar cobros» como bloqueo de HotClick
- **Historia:** Como admin de HotClick quiero un botón «Pausar cobros» y «Reanudar» que bloquee los cobros en línea del negocio del lado de HotClick para detener a un negocio sin depender de ONVO.
- **Responsable:** Desarrollador
- **Prioridad:** P0 · **Puntos:** 3
- **Dependencias:** S3-07 (Botón «Registrar negocio en ONVO»)
- **Criterios de aceptación:**
  1. Dado un negocio pausado, cuando un comprador intenta pagar en línea, entonces HotClick no crea sesión de checkout ni intención con su onBehalfOf y muestra otras opciones (efectivo, contra entrega).
  2. Checklist: la cuenta y su historial siguen en ONVO; en el admin se ve «Pausada».
  3. Checklist: poner el % en 0 no se usa como pausa.
  4. Checklist: pausar y reanudar quedan auditados.
  5. Checklist: el cambio va en su propia rama y PR, con pruebas automáticas (mvn y vitest) en verde y revisión de Seguridad si toca pagos, permisos o datos personales.
  6. Dado que el PR está aprobado, cuando se quiere subir a producción, entonces solo se despliega con la aprobación manual de HOT_CLICK, con pg_dump y etiqueta de vuelta atrás hechos antes.
  7. Checklist: ningún secreto, llave ni dato personal queda en el código o en los logs, y ningún monto queda escrito en el código (sale del plan o de la configuración).
  8. Dado el cambio en staging, cuando QA lo prueba desde el navegador a 390 y 1440 px, entonces no hay errores 500 ni textos «[PENDIENTE]» en las pantallas tocadas.

#### S3-11 · Frecuencia quincenal o mensual en el registro y perfil
- **Historia:** Como vendedor quiero elegir liquidación quincenal o mensual al registrarme y cambiarla en mi perfil para pagar solo los cargos de US$3 que quiero.
- **Responsable:** Desarrollador
- **Prioridad:** P1 · **Puntos:** 3
- **Dependencias:** S3-06 (Tabla de cuentas conectadas (migración)); S3-05 (Aprobar los bocetos ONVO)
- **Criterios de aceptación:**
  1. Checklist: campo obligatorio en el registro, editable en el perfil.
  2. Checklist: el resumen del plan muestra US$3 por liquidación (quincenal: dos al mes; mensual: uno).
  3. Checklist: la elección se guarda y se muestra al admin para configurarla a mano en ONVO (la API no permite fijarla).
  4. Checklist: el cambio va en su propia rama y PR, con pruebas automáticas (mvn y vitest) en verde y revisión de Seguridad si toca pagos, permisos o datos personales.
  5. Dado que el PR está aprobado, cuando se quiere subir a producción, entonces solo se despliega con la aprobación manual de HOT_CLICK, con pg_dump y etiqueta de vuelta atrás hechos antes.
  6. Checklist: ningún secreto, llave ni dato personal queda en el código o en los logs, y ningún monto queda escrito en el código (sale del plan o de la configuración).
  7. Dado el cambio en staging, cuando QA lo prueba desde el navegador a 390 y 1440 px, entonces no hay errores 500 ni textos «[PENDIENTE]» en las pantallas tocadas.

#### S3-12 · Sincronizar estados de cuentas por polling
- **Historia:** Como sistema quiero consultar periódicamente GET /v1/connected-accounts para actualizar estados para bloquear cobros si la tienda no está activa.
- **Responsable:** Desarrollador
- **Prioridad:** P1 · **Puntos:** 3
- **Dependencias:** S2-13 (OnvoMarketplaceClient con pruebas simuladas); S3-06 (Tabla de cuentas conectadas (migración))
- **Criterios de aceptación:**
  1. Checklist: job cada N minutos con paginación startingAfter y ShedLock.
  2. Checklist: refresco extra al abrir la pantalla del negocio.
  3. Checklist: estados pending_onboarding, awaiting_approval, active, inactive, temporally_suspended, permanently_suspended y deleted mapeados.
  4. Checklist: el cambio va en su propia rama y PR, con pruebas automáticas (mvn y vitest) en verde y revisión de Seguridad si toca pagos, permisos o datos personales.
  5. Dado que el PR está aprobado, cuando se quiere subir a producción, entonces solo se despliega con la aprobación manual de HOT_CLICK, con pg_dump y etiqueta de vuelta atrás hechos antes.
  6. Checklist: ningún secreto, llave ni dato personal queda en el código o en los logs, y ningún monto queda escrito en el código (sale del plan o de la configuración).
  7. Dado el cambio en staging, cuando QA lo prueba desde el navegador a 390 y 1440 px, entonces no hay errores 500 ni textos «[PENDIENTE]» en las pantallas tocadas.

#### S3-13 · Conciliación diaria: ONVO solo con negocios autorizados
- **Historia:** Como admin de HotClick quiero una conciliación diaria que compare las cuentas de ONVO con las autorizadas en HotClick para detectar cualquier cuenta sin autorización.
- **Responsable:** Desarrollador
- **Prioridad:** P0 · **Puntos:** 3
- **Dependencias:** S3-12 (Sincronizar estados de cuentas por polling)
- **Criterios de aceptación:**
  1. Dado una cuenta en ONVO que no está en HotClick, cuando corre la conciliación, entonces aparece una alerta en el admin y a Grok Bot.
  2. Checklist: las pausadas aparecen en ONVO y en el admin como «Pausada».
  3. Checklist: resultado visible en la lista «Negocios ONVO».
  4. Checklist: el cambio va en su propia rama y PR, con pruebas automáticas (mvn y vitest) en verde y revisión de Seguridad si toca pagos, permisos o datos personales.
  5. Dado que el PR está aprobado, cuando se quiere subir a producción, entonces solo se despliega con la aprobación manual de HOT_CLICK, con pg_dump y etiqueta de vuelta atrás hechos antes.
  6. Checklist: ningún secreto, llave ni dato personal queda en el código o en los logs, y ningún monto queda escrito en el código (sale del plan o de la configuración).
  7. Dado el cambio en staging, cuando QA lo prueba desde el navegador a 390 y 1440 px, entonces no hay errores 500 ni textos «[PENDIENTE]» en las pantallas tocadas.

#### S3-14 · Lista «Negocios ONVO» en el admin
- **Historia:** Como admin de HotClick quiero una lista de negocios con su estado ONVO, % y frecuencia para dar soporte rápido.
- **Responsable:** Desarrollador
- **Prioridad:** P1 · **Puntos:** 3
- **Dependencias:** S3-12 (Sincronizar estados de cuentas por polling)
- **Criterios de aceptación:**
  1. Checklist: filtro por estado.
  2. Checklist: sin IBAN ni datos de KYC.
  3. Checklist: enlace a la ficha de cada negocio.
  4. Checklist: el cambio va en su propia rama y PR, con pruebas automáticas (mvn y vitest) en verde y revisión de Seguridad si toca pagos, permisos o datos personales.
  5. Dado que el PR está aprobado, cuando se quiere subir a producción, entonces solo se despliega con la aprobación manual de HOT_CLICK, con pg_dump y etiqueta de vuelta atrás hechos antes.
  6. Checklist: ningún secreto, llave ni dato personal queda en el código o en los logs, y ningún monto queda escrito en el código (sale del plan o de la configuración).
  7. Dado el cambio en staging, cuando QA lo prueba desde el navegador a 390 y 1440 px, entonces no hay errores 500 ni textos «[PENDIENTE]» en las pantallas tocadas.

#### S3-15 · Pantalla «Activar cobros» para el negocio
- **Historia:** Como vendedor quiero una pantalla donde veo el estado de mi cuenta ONVO y qué falta para completar mi registro.
- **Responsable:** Desarrollador
- **Prioridad:** P1 · **Puntos:** 3
- **Dependencias:** S3-05 (Aprobar los bocetos ONVO); S3-12 (Sincronizar estados de cuentas por polling)
- **Criterios de aceptación:**
  1. Checklist: implementa el boceto aprobado.
  2. Checklist: solo el dueño del negocio la ve; el personal no.
  3. Checklist: una tienda Emprendedor no expone ningún contacto en la pantalla ni en la API pública.
  4. Checklist: el cambio va en su propia rama y PR, con pruebas automáticas (mvn y vitest) en verde y revisión de Seguridad si toca pagos, permisos o datos personales.
  5. Dado que el PR está aprobado, cuando se quiere subir a producción, entonces solo se despliega con la aprobación manual de HOT_CLICK, con pg_dump y etiqueta de vuelta atrás hechos antes.
  6. Checklist: ningún secreto, llave ni dato personal queda en el código o en los logs, y ningún monto queda escrito en el código (sale del plan o de la configuración).
  7. Dado el cambio en staging, cuando QA lo prueba desde el navegador a 390 y 1440 px, entonces no hay errores 500 ni textos «[PENDIENTE]» en las pantallas tocadas.

#### S3-16 · Checkout hospedado con onBehalfOf
- **Historia:** Como comprador quiero que el servidor cree una sesión de Checkout de ONVO a nombre de la tienda para pagar en una página segura.
- **Responsable:** Desarrollador
- **Prioridad:** P0 · **Puntos:** 5
- **Dependencias:** S3-07 (Botón «Registrar negocio en ONVO»); S2-14 (Interruptores de pasarela por capacidad y por negocio)
- **Criterios de aceptación:**
  1. Checklist: monto calculado en el servidor en unidad menor con un solo helper probado.
  2. Checklist: onBehalfOf sale siempre de la base, nunca del navegador.
  3. Checklist: bloqueado si la cuenta no está activa o está pausada.
  4. Checklist: el cambio va en su propia rama y PR, con pruebas automáticas (mvn y vitest) en verde y revisión de Seguridad si toca pagos, permisos o datos personales.
  5. Dado que el PR está aprobado, cuando se quiere subir a producción, entonces solo se despliega con la aprobación manual de HOT_CLICK, con pg_dump y etiqueta de vuelta atrás hechos antes.
  6. Checklist: ningún secreto, llave ni dato personal queda en el código o en los logs, y ningún monto queda escrito en el código (sale del plan o de la configuración).
  7. Dado el cambio en staging, cuando QA lo prueba desde el navegador a 390 y 1440 px, entonces no hay errores 500 ni textos «[PENDIENTE]» en las pantallas tocadas.

#### S3-17 · Un cobro por tienda en carritos con varias tiendas
- **Historia:** Como comprador quiero que mi carrito con productos de varias tiendas genere un cobro por tienda para pagar a cada tienda lo suyo.
- **Responsable:** Desarrollador
- **Prioridad:** P0 · **Puntos:** 3
- **Dependencias:** S3-16 (Checkout hospedado con onBehalfOf)
- **Criterios de aceptación:**
  1. Checklist: pedido padre con subpedidos por tienda y estado «Pago 1 de N».
  2. Checklist: cada cobro lleva un solo onBehalfOf.
  3. Checklist: si un pago falla, los demás no se pierden y el comprador puede reintentar el que falta.
  4. Checklist: el cambio va en su propia rama y PR, con pruebas automáticas (mvn y vitest) en verde y revisión de Seguridad si toca pagos, permisos o datos personales.
  5. Dado que el PR está aprobado, cuando se quiere subir a producción, entonces solo se despliega con la aprobación manual de HOT_CLICK, con pg_dump y etiqueta de vuelta atrás hechos antes.
  6. Checklist: ningún secreto, llave ni dato personal queda en el código o en los logs, y ningún monto queda escrito en el código (sale del plan o de la configuración).
  7. Dado el cambio en staging, cuando QA lo prueba desde el navegador a 390 y 1440 px, entonces no hay errores 500 ni textos «[PENDIENTE]» en las pantallas tocadas.

#### S3-18 · Webhook de ONVO idempotente
- **Historia:** Como sistema quiero procesar los webhooks de ONVO una sola vez y en orden lógico para no marcar pedidos pagados por error.
- **Responsable:** Desarrollador
- **Prioridad:** P0 · **Puntos:** 5
- **Dependencias:** S3-16 (Checkout hospedado con onBehalfOf)
- **Criterios de aceptación:**
  1. Checklist: X-Webhook-Secret validado en tiempo constante; si no coincide, 401 sin detalle.
  2. Checklist: se guarda el evento crudo, se responde 2xx rápido y se procesa aparte; la misma clave no se procesa dos veces.
  3. Checklist: antes de marcar pagado se confirma con GET /v1/payment-intents/{id}; un failed no pisa un succeeded.
  4. Checklist: el cambio va en su propia rama y PR, con pruebas automáticas (mvn y vitest) en verde y revisión de Seguridad si toca pagos, permisos o datos personales.
  5. Dado que el PR está aprobado, cuando se quiere subir a producción, entonces solo se despliega con la aprobación manual de HOT_CLICK, con pg_dump y etiqueta de vuelta atrás hechos antes.
  6. Checklist: ningún secreto, llave ni dato personal queda en el código o en los logs, y ningún monto queda escrito en el código (sale del plan o de la configuración).
  7. Dado el cambio en staging, cuando QA lo prueba desde el navegador a 390 y 1440 px, entonces no hay errores 500 ni textos «[PENDIENTE]» en las pantallas tocadas.

#### S3-19 · Volver de ONVO y ver el estado real
- **Historia:** Como comprador quiero volver a HotClick después de pagar y ver si salió bien para saber qué pasó con mi compra.
- **Responsable:** Desarrollador
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** S3-18 (Webhook de ONVO idempotente)
- **Criterios de aceptación:**
  1. Checklist: el estado se consulta al servidor; la URL de vuelta no basta para marcar pagado.
  2. Checklist: pantalla «Confirmando…» mientras llega el webhook.
  3. Checklist: correo de confirmación solo tras el webhook.
  4. Checklist: el cambio va en su propia rama y PR, con pruebas automáticas (mvn y vitest) en verde y revisión de Seguridad si toca pagos, permisos o datos personales.
  5. Dado que el PR está aprobado, cuando se quiere subir a producción, entonces solo se despliega con la aprobación manual de HOT_CLICK, con pg_dump y etiqueta de vuelta atrás hechos antes.
  6. Checklist: ningún secreto, llave ni dato personal queda en el código o en los logs, y ningún monto queda escrito en el código (sale del plan o de la configuración).
  7. Dado el cambio en staging, cuando QA lo prueba desde el navegador a 390 y 1440 px, entonces no hay errores 500 ni textos «[PENDIENTE]» en las pantallas tocadas.

#### S3-20 · Reserva de stock durante el pago
- **Historia:** Como vendedor quiero que el stock quede reservado mientras el comprador paga y se libere si falla para no vender de más.
- **Responsable:** Desarrollador
- **Prioridad:** P1 · **Puntos:** 3
- **Dependencias:** S3-16 (Checkout hospedado con onBehalfOf)
- **Criterios de aceptación:**
  1. Checklist: reutiliza la regla anti-bot de reserva.
  2. Checklist: pago fallido o cancelado libera el stock.
  3. Checklist: la sesión de checkout se expira al cancelar.
  4. Checklist: el cambio va en su propia rama y PR, con pruebas automáticas (mvn y vitest) en verde y revisión de Seguridad si toca pagos, permisos o datos personales.
  5. Dado que el PR está aprobado, cuando se quiere subir a producción, entonces solo se despliega con la aprobación manual de HOT_CLICK, con pg_dump y etiqueta de vuelta atrás hechos antes.
  6. Checklist: ningún secreto, llave ni dato personal queda en el código o en los logs, y ningún monto queda escrito en el código (sale del plan o de la configuración).
  7. Dado el cambio en staging, cuando QA lo prueba desde el navegador a 390 y 1440 px, entonces no hay errores 500 ni textos «[PENDIENTE]» en las pantallas tocadas.

#### S3-21 · Reintentos y cola de errores de webhook
- **Historia:** Como sistema quiero reintentos con espera creciente y una cola de errores con alerta para no perder eventos.
- **Responsable:** Desarrollador
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** S3-18 (Webhook de ONVO idempotente)
- **Criterios de aceptación:**
  1. Checklist: máximo de reintentos configurable.
  2. Checklist: alerta en la cola de errores.
  3. Checklist: logs sin PAN, sin onboardingUrl y con cédula enmascarada.
  4. Checklist: el cambio va en su propia rama y PR, con pruebas automáticas (mvn y vitest) en verde y revisión de Seguridad si toca pagos, permisos o datos personales.
  5. Dado que el PR está aprobado, cuando se quiere subir a producción, entonces solo se despliega con la aprobación manual de HOT_CLICK, con pg_dump y etiqueta de vuelta atrás hechos antes.
  6. Checklist: ningún secreto, llave ni dato personal queda en el código o en los logs, y ningún monto queda escrito en el código (sale del plan o de la configuración).
  7. Dado el cambio en staging, cuando QA lo prueba desde el navegador a 390 y 1440 px, entonces no hay errores 500 ni textos «[PENDIENTE]» en las pantallas tocadas.

### Sprint 3 · Diseño / UX (Figma)

#### S3-22 · Ajustes finales de la sección ONVO del admin
- **Historia:** Como admin de HotClick quiero ajustar el diseño de la sección ONVO con lo que salga de la demo para que sea fácil de usar.
- **Responsable:** Diseño / UX (Figma)
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** S3-07 (Botón «Registrar negocio en ONVO»)
- **Criterios de aceptación:**
  1. Checklist: confirmaciones antes de Registrar, cambiar % y Pausar.
  2. Checklist: textos de error claros para cada error de ONVO.
  3. Checklist: estados con color y texto.
  4. Checklist: el diseño está en Figma con marcos a 390 y 1440 px y notas de entrega para el Desarrollador.
  5. Checklist: contraste AA, foco visible y una sola llamada a la acción roja por pantalla.
  6. Checklist: los textos no inventan montos; donde falta uno dice «monto a definir por HOT_CLICK».
  7. Dado el boceto terminado, cuando lo revisan Producto y HOT_CLICK, entonces queda aprobado por escrito o con la lista de cambios anotada.

#### S3-23 · Estados de error y suspensión
- **Historia:** Como vendedor suspendido quiero un estado claro cuando mi cuenta ONVO está en revisión, suspendida o pausada para saber qué hacer.
- **Responsable:** Diseño / UX (Figma)
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: mensaje y botón a soporte de HotClick.
  2. Checklist: sin datos internos de ONVO.
  3. Checklist: diferencia entre «Pausada por HotClick» y «Suspendida por ONVO».
  4. Checklist: el diseño está en Figma con marcos a 390 y 1440 px y notas de entrega para el Desarrollador.
  5. Checklist: contraste AA, foco visible y una sola llamada a la acción roja por pantalla.
  6. Checklist: los textos no inventan montos; donde falta uno dice «monto a definir por HOT_CLICK».
  7. Dado el boceto terminado, cuando lo revisan Producto y HOT_CLICK, entonces queda aprobado por escrito o con la lista de cambios anotada.

#### S3-24 · Pantallas finales de pago con tarjeta
- **Historia:** Como comprador quiero las pantallas finales de salida, éxito, error y «Confirmando…» para entender cada paso.
- **Responsable:** Diseño / UX (Figma)
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: una sola llamada a la acción por pantalla.
  2. Checklist: el carrito queda intacto en error.
  3. Checklist: aviso del nombre de la tienda a la que le pago.
  4. Checklist: el diseño está en Figma con marcos a 390 y 1440 px y notas de entrega para el Desarrollador.
  5. Checklist: contraste AA, foco visible y una sola llamada a la acción roja por pantalla.
  6. Checklist: los textos no inventan montos; donde falta uno dice «monto a definir por HOT_CLICK».
  7. Dado el boceto terminado, cuando lo revisan Producto y HOT_CLICK, entonces queda aprobado por escrito o con la lista de cambios anotada.

#### S3-25 · Pantalla «Pago 1 de N»
- **Historia:** Como comprador quiero el diseño final del pago por tienda para no pensar que me cobraron doble.
- **Responsable:** Diseño / UX (Figma)
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: progreso visible por tienda.
  2. Checklist: qué hacer si una tienda falla.
  3. Checklist: resumen final con todos los cobros.
  4. Checklist: el diseño está en Figma con marcos a 390 y 1440 px y notas de entrega para el Desarrollador.
  5. Checklist: contraste AA, foco visible y una sola llamada a la acción roja por pantalla.
  6. Checklist: los textos no inventan montos; donde falta uno dice «monto a definir por HOT_CLICK».
  7. Dado el boceto terminado, cuando lo revisan Producto y HOT_CLICK, entonces queda aprobado por escrito o con la lista de cambios anotada.

#### S3-26 · Correo de invitación a activar cobros
- **Historia:** Como vendedor quiero el diseño del correo con el enlace de ONVO para reconocerlo como de HotClick.
- **Responsable:** Diseño / UX (Figma)
- **Prioridad:** P2 · **Puntos:** 1
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: marca HotClick y explicación corta.
  2. Checklist: el enlace lleva a la pantalla de HotClick o al formulario de ONVO según el caso.
  3. Checklist: sin montos inventados.
  4. Checklist: el diseño está en Figma con marcos a 390 y 1440 px y notas de entrega para el Desarrollador.
  5. Checklist: contraste AA, foco visible y una sola llamada a la acción roja por pantalla.
  6. Checklist: los textos no inventan montos; donde falta uno dice «monto a definir por HOT_CLICK».
  7. Dado el boceto terminado, cuando lo revisan Producto y HOT_CLICK, entonces queda aprobado por escrito o con la lista de cambios anotada.

### Sprint 3 · QA (calidad)

#### S3-27 · Casos de onboarding O1 a O4 en sandbox
- **Historia:** Como equipo quiero probar desde la web el alta de un negocio hasta que queda activo para confirmar el flujo completo.
- **Responsable:** QA (calidad)
- **Prioridad:** P1 · **Puntos:** 3
- **Dependencias:** S3-07 (Botón «Registrar negocio en ONVO»)
- **Criterios de aceptación:**
  1. Checklist: el admin registra al negocio, el negocio completa ONVO y el estado llega a Activa.
  2. Checklist: enlace vencido y reenviado.
  3. Checklist: privacidad Emprendedor sin contacto visible.
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/calidad/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

#### S3-28 · Casos de pausa y reanudación
- **Historia:** Como equipo quiero probar desde la web que «Pausar cobros» bloquea el pago en línea para confirmar el bloqueo.
- **Responsable:** QA (calidad)
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** S3-10 («Pausar cobros» como bloqueo de HotClick)
- **Criterios de aceptación:**
  1. Checklist: con negocio pausado no aparece pago en línea.
  2. Checklist: al reanudar vuelve.
  3. Checklist: el admin ve «Pausada».
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/calidad/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

#### S3-29 · Casos de tarjeta T1 a T8
- **Historia:** Como equipo quiero probar compras aprobadas, rechazadas y con 3DS con tarjetas de prueba para validar el pago con tarjeta.
- **Responsable:** QA (calidad)
- **Prioridad:** P1 · **Puntos:** 3
- **Dependencias:** S3-16 (Checkout hospedado con onBehalfOf); S3-18 (Webhook de ONVO idempotente)
- **Criterios de aceptación:**
  1. Checklist: evidencia por caso.
  2. Checklist: ningún pedido queda pagado sin webhook.
  3. Checklist: el stock se libera en rechazos.
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/calidad/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

#### S3-30 · Casos de webhook W1 a W6 desde la web
- **Historia:** Como equipo quiero comprobar desde la web que los pedidos cambian de estado solo cuando corresponde para confiar en el estado del pedido.
- **Responsable:** QA (calidad)
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** S3-18 (Webhook de ONVO idempotente)
- **Criterios de aceptación:**
  1. Checklist: se observa el estado en «Mis pedidos» y en el panel del vendedor.
  2. Checklist: QA no envía webhooks ni llama a la API; el Desarrollador provoca los reenvíos en staging.
  3. Checklist: resultados por caso.
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/calidad/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

#### S3-31 · Comisión por plan en sandbox
- **Historia:** Como equipo quiero verificar en la web de staging que el % mostrado al admin coincide con el plan para detectar errores de configuración.
- **Responsable:** QA (calidad)
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** S3-09 (Comisión % por negocio editable desde el admin)
- **Criterios de aceptación:**
  1. Checklist: Emprendedor 9 %, Pyme y Negocio Plus 7 %.
  2. Checklist: cambio de % se ve en el admin.
  3. Checklist: el aviso «el % no coincide con el plan» aparece tras cambiar de plan.
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/calidad/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

### Sprint 3 · QA Compradores

#### S3-32 · Comprar con tarjeta de prueba en staging
- **Historia:** Como comprador quiero comprar con una tarjeta de prueba en el Checkout de ONVO para validar el pago como comprador.
- **Responsable:** QA Compradores
- **Prioridad:** P0 · **Puntos:** 3
- **Dependencias:** S3-16 (Checkout hospedado con onBehalfOf)
- **Criterios de aceptación:**
  1. Checklist: salida a ONVO, pago y vuelta a HotClick con pedido pagado.
  2. Checklist: correo de confirmación recibido.
  3. Checklist: el aviso dice a qué tienda le pago.
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/compradores/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

#### S3-33 · Carrito con dos tiendas: un cobro por tienda
- **Historia:** Como comprador quiero comprar productos de dos tiendas y pagar cada cobro para validar el flujo «Pago 1 de N».
- **Responsable:** QA Compradores
- **Prioridad:** P0 · **Puntos:** 3
- **Dependencias:** S3-17 (Un cobro por tienda en carritos con varias tiendas)
- **Criterios de aceptación:**
  1. Checklist: veo dos cobros separados.
  2. Checklist: si cancelo el segundo, el primero sigue pagado.
  3. Checklist: puedo reintentar el que falta desde «Mis pedidos».
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/compradores/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

#### S3-34 · Pago rechazado y reintento
- **Historia:** Como comprador quiero que un rechazo me deje reintentar sin perder el carrito para no empezar de cero.
- **Responsable:** QA Compradores
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** S3-16 (Checkout hospedado con onBehalfOf)
- **Criterios de aceptación:**
  1. Checklist: mensaje claro sin códigos.
  2. Checklist: el carrito sigue igual.
  3. Checklist: el reintento funciona.
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/compradores/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

#### S3-35 · Tienda pausada sin pago en línea
- **Historia:** Como comprador quiero comprar en una tienda pausada y ver solo opciones disponibles para no quedar a medias.
- **Responsable:** QA Compradores
- **Prioridad:** P1 · **Puntos:** 1
- **Dependencias:** S3-10 («Pausar cobros» como bloqueo de HotClick)
- **Criterios de aceptación:**
  1. Checklist: no aparece pago en línea.
  2. Checklist: efectivo o contra entrega disponibles si aplica.
  3. Checklist: mensaje amable.
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/compradores/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

#### S3-36 · Volver atrás desde ONVO
- **Historia:** Como comprador quiero cancelar en la página de ONVO y volver para seguir comprando.
- **Responsable:** QA Compradores
- **Prioridad:** P1 · **Puntos:** 1
- **Dependencias:** S3-16 (Checkout hospedado con onBehalfOf)
- **Criterios de aceptación:**
  1. Checklist: vuelvo al carrito con todo.
  2. Checklist: el stock se libera.
  3. Checklist: no queda pedido pagado.
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/compradores/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

### Sprint 3 · QA Negocios

#### S3-37 · Elegir frecuencia en el registro
- **Historia:** Como vendedor quiero registrarme eligiendo quincenal o mensual para ver los US$3 antes de decidir.
- **Responsable:** QA Negocios
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** S3-11 (Frecuencia quincenal o mensual en el registro y perfil)
- **Criterios de aceptación:**
  1. Checklist: el campo es obligatorio.
  2. Checklist: el resumen del plan muestra US$3 por liquidación.
  3. Checklist: puedo cambiarla en el perfil.
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/negocios/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

#### S3-38 · Completar «Activar cobros»
- **Historia:** Como vendedor quiero recibir el enlace y completar el formulario de ONVO en sandbox para activar cobros en línea.
- **Responsable:** QA Negocios
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** S3-07 (Botón «Registrar negocio en ONVO»)
- **Criterios de aceptación:**
  1. Checklist: el enlace llega por correo o panel.
  2. Checklist: el estado cambia a En revisión y luego Activa.
  3. Checklist: el personal del negocio no ve la pantalla.
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/negocios/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

#### S3-39 · Ver mis ventas con tarjeta
- **Historia:** Como vendedor quiero ver en mi panel la venta pagada con tarjeta para saber que ya puedo despachar.
- **Responsable:** QA Negocios
- **Prioridad:** P1 · **Puntos:** 1
- **Dependencias:** S3-18 (Webhook de ONVO idempotente)
- **Criterios de aceptación:**
  1. Checklist: estado Pagado.
  2. Checklist: datos de entrega visibles.
  3. Checklist: avance de estados disponible.
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/negocios/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

#### S3-40 · Negocio pausado ve su estado
- **Historia:** Como vendedor quiero ver en mi panel que mis cobros en línea están pausados para saber qué hacer.
- **Responsable:** QA Negocios
- **Prioridad:** P1 · **Puntos:** 1
- **Dependencias:** S3-10 («Pausar cobros» como bloqueo de HotClick)
- **Criterios de aceptación:**
  1. Checklist: mensaje «Pausada por HotClick».
  2. Checklist: botón a soporte.
  3. Checklist: el POS en efectivo sigue según la decisión de HOT_CLICK.
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/negocios/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

#### S3-41 · Emprendedor sin contacto en la tienda con ONVO
- **Historia:** Como vendedor quiero revisar que la tienda Emprendedor no muestre teléfono, correo ni IBAN para cumplir la regla sin contacto.
- **Responsable:** QA Negocios
- **Prioridad:** P2 · **Puntos:** 1
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: revisión de tienda, ficha y checkout.
  2. Checklist: el correo del comprador no trae contacto del vendedor Emprendedor.
  3. Checklist: capturas a 390 y 1440.
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/negocios/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

### Sprint 3 · QA Automatización y Regresión

#### S3-42 · Guion web de compra con tarjeta en staging
- **Historia:** Como equipo quiero un guion que compre con tarjeta de prueba en staging para tener el pago en la regresión.
- **Responsable:** QA Automatización y Regresión
- **Prioridad:** P1 · **Puntos:** 3
- **Dependencias:** S3-16 (Checkout hospedado con onBehalfOf)
- **Criterios de aceptación:**
  1. Checklist: completa el formulario de ONVO sandbox como usuario.
  2. Checklist: verifica el estado del pedido en la web.
  3. Checklist: solo staging.
  4. Checklist: el guion solo maneja el navegador (clics, formularios y lectura de pantalla); no llama a la API, no toca la base de datos ni el servidor y no modifica el código del repo.
  5. Checklist: el guion vive en /workspace/qa/regresion/ y corre a 390 y 1440 px, con captura de cada paso que falle.
  6. Dado tres corridas seguidas sin cambios en el sitio, cuando se comparan, entonces dan el mismo resultado (menos de 1 prueba inestable por corrida).
  7. Checklist: el resultado (verde o rojo, con la lista de fallos) queda en un informe fechado y los fallos se reportan al Desarrollador.

#### S3-43 · Guion web del alta ONVO en el admin
- **Historia:** Como equipo quiero un guion que use la ficha del negocio para registrar en ONVO y pausar para cubrir el admin en la regresión.
- **Responsable:** QA Automatización y Regresión
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** S3-07 (Botón «Registrar negocio en ONVO»); S3-10 («Pausar cobros» como bloqueo de HotClick)
- **Criterios de aceptación:**
  1. Checklist: usa una cuenta admin de prueba en staging.
  2. Checklist: verifica estados en pantalla.
  3. Checklist: no repite el registro (idempotencia vista en pantalla).
  4. Checklist: el guion solo maneja el navegador (clics, formularios y lectura de pantalla); no llama a la API, no toca la base de datos ni el servidor y no modifica el código del repo.
  5. Checklist: el guion vive en /workspace/qa/regresion/ y corre a 390 y 1440 px, con captura de cada paso que falle.
  6. Dado tres corridas seguidas sin cambios en el sitio, cuando se comparan, entonces dan el mismo resultado (menos de 1 prueba inestable por corrida).
  7. Checklist: el resultado (verde o rojo, con la lista de fallos) queda en un informe fechado y los fallos se reportan al Desarrollador.

#### S3-44 · Guion web del carrito con dos tiendas
- **Historia:** Como equipo quiero un guion que pague dos cobros para proteger el flujo multitienda.
- **Responsable:** QA Automatización y Regresión
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** S3-17 (Un cobro por tienda en carritos con varias tiendas)
- **Criterios de aceptación:**
  1. Checklist: verifica «Pago 1 de 2» y «Pago 2 de 2».
  2. Checklist: caso de cancelar el segundo.
  3. Checklist: staging.
  4. Checklist: el guion solo maneja el navegador (clics, formularios y lectura de pantalla); no llama a la API, no toca la base de datos ni el servidor y no modifica el código del repo.
  5. Checklist: el guion vive en /workspace/qa/regresion/ y corre a 390 y 1440 px, con captura de cada paso que falle.
  6. Dado tres corridas seguidas sin cambios en el sitio, cuando se comparan, entonces dan el mismo resultado (menos de 1 prueba inestable por corrida).
  7. Checklist: el resultado (verde o rojo, con la lista de fallos) queda en un informe fechado y los fallos se reportan al Desarrollador.

#### S3-45 · Actualizar la matriz de regresión con ONVO
- **Historia:** Como equipo quiero sumar los flujos ONVO a la matriz para que entren en la corrida nocturna.
- **Responsable:** QA Automatización y Regresión
- **Prioridad:** P2 · **Puntos:** 1
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: prioridad por flujo.
  2. Checklist: frecuencia definida.
  3. Checklist: aprobado por QA (calidad).
  4. Checklist: el guion solo maneja el navegador (clics, formularios y lectura de pantalla); no llama a la API, no toca la base de datos ni el servidor y no modifica el código del repo.
  5. Checklist: el guion vive en /workspace/qa/regresion/ y corre a 390 y 1440 px, con captura de cada paso que falle.
  6. Dado tres corridas seguidas sin cambios en el sitio, cuando se comparan, entonces dan el mismo resultado (menos de 1 prueba inestable por corrida).
  7. Checklist: el resultado (verde o rojo, con la lista de fallos) queda en un informe fechado y los fallos se reportan al Desarrollador.

#### S3-46 · Revisión del smoke con ONVO apagado
- **Historia:** Como equipo quiero confirmar que el smoke de producción sigue verde con ONVO apagado para no romper producción mientras se integra.
- **Responsable:** QA Automatización y Regresión
- **Prioridad:** P1 · **Puntos:** 1
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: smoke en producción sin flujos ONVO.
  2. Checklist: interruptores de ONVO apagados verificados en pantalla.
  3. Checklist: informe.
  4. Checklist: el guion solo maneja el navegador (clics, formularios y lectura de pantalla); no llama a la API, no toca la base de datos ni el servidor y no modifica el código del repo.
  5. Checklist: el guion vive en /workspace/qa/regresion/ y corre a 390 y 1440 px, con captura de cada paso que falle.
  6. Dado tres corridas seguidas sin cambios en el sitio, cuando se comparan, entonces dan el mismo resultado (menos de 1 prueba inestable por corrida).
  7. Checklist: el resultado (verde o rojo, con la lista de fallos) queda en un informe fechado y los fallos se reportan al Desarrollador.

### Sprint 3 · Seguridad

#### S3-47 · Revisión del botón Registrar y del % por negocio
- **Historia:** Como dueño de HotClick quiero revisar que solo ADMIN pueda registrar negocios y cambiar el % para evitar fraude interno.
- **Responsable:** Seguridad
- **Prioridad:** P0 · **Puntos:** 2
- **Dependencias:** S3-07 (Botón «Registrar negocio en ONVO»); S3-09 (Comisión % por negocio editable desde el admin)
- **Criterios de aceptación:**
  1. Checklist: pruebas de autorización por rol.
  2. Checklist: auditoría presente.
  3. Checklist: el vendedor no puede alterar su %.
  4. Checklist: informe corto en /workspace/seguridad/ con cada hallazgo, su gravedad (crítico, alto, medio o bajo) y el arreglo propuesto.
  5. Dado el informe, cuando se cierra la historia, entonces no queda ningún hallazgo crítico ni alto abierto sin plan y sin dueño.
  6. Checklist: no se hacen ataques ni pruebas destructivas en producción; lo que se prueba en vivo se hace con cuentas QA-TEST y con OK de HOT_CLICK.
  7. Checklist: ninguna llave, secreto ni dato personal se copia al informe ni al chat.

#### S3-48 · Revisión del endpoint de webhooks
- **Historia:** Como dueño de HotClick quiero revisar secreto, reenvío y tamaño del webhook para que nadie marque pedidos como pagados falsamente.
- **Responsable:** Seguridad
- **Prioridad:** P0 · **Puntos:** 3
- **Dependencias:** S3-18 (Webhook de ONVO idempotente)
- **Criterios de aceptación:**
  1. Checklist: pruebas con secreto falso y reenvío en staging.
  2. Checklist: rate limit por IP.
  3. Checklist: verificación con GET antes de marcar pagado.
  4. Checklist: informe corto en /workspace/seguridad/ con cada hallazgo, su gravedad (crítico, alto, medio o bajo) y el arreglo propuesto.
  5. Dado el informe, cuando se cierra la historia, entonces no queda ningún hallazgo crítico ni alto abierto sin plan y sin dueño.
  6. Checklist: no se hacen ataques ni pruebas destructivas en producción; lo que se prueba en vivo se hace con cuentas QA-TEST y con OK de HOT_CLICK.
  7. Checklist: ninguna llave, secreto ni dato personal se copia al informe ni al chat.

#### S3-49 · Monto y onBehalfOf no manipulables
- **Historia:** Como dueño de HotClick quiero confirmar que el monto y la tienda no se pueden cambiar desde el navegador para evitar pagos a la tienda equivocada.
- **Responsable:** Seguridad
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** S3-16 (Checkout hospedado con onBehalfOf)
- **Criterios de aceptación:**
  1. Checklist: prueba de manipulación de la solicitud en staging.
  2. Checklist: valores del servidor.
  3. Checklist: metadata con empresaId verificada al recibir el webhook.
  4. Checklist: informe corto en /workspace/seguridad/ con cada hallazgo, su gravedad (crítico, alto, medio o bajo) y el arreglo propuesto.
  5. Dado el informe, cuando se cierra la historia, entonces no queda ningún hallazgo crítico ni alto abierto sin plan y sin dueño.
  6. Checklist: no se hacen ataques ni pruebas destructivas en producción; lo que se prueba en vivo se hace con cuentas QA-TEST y con OK de HOT_CLICK.
  7. Checklist: ninguna llave, secreto ni dato personal se copia al informe ni al chat.

#### S3-50 · onboardingUrl y llaves fuera de los logs
- **Historia:** Como dueño de HotClick quiero revisar que onboardingUrl y llaves nunca queden en logs para evitar fugas.
- **Responsable:** Seguridad
- **Prioridad:** P1 · **Puntos:** 1
- **Dependencias:** S3-07 (Botón «Registrar negocio en ONVO»)
- **Criterios de aceptación:**
  1. Checklist: búsqueda en logs de staging.
  2. Checklist: revisión de código del cliente.
  3. Checklist: resultado en el informe.
  4. Checklist: informe corto en /workspace/seguridad/ con cada hallazgo, su gravedad (crítico, alto, medio o bajo) y el arreglo propuesto.
  5. Dado el informe, cuando se cierra la historia, entonces no queda ningún hallazgo crítico ni alto abierto sin plan y sin dueño.
  6. Checklist: no se hacen ataques ni pruebas destructivas en producción; lo que se prueba en vivo se hace con cuentas QA-TEST y con OK de HOT_CLICK.
  7. Checklist: ninguna llave, secreto ni dato personal se copia al informe ni al chat.

#### S3-51 · CSP compatible con la redirección a ONVO
- **Historia:** Como dueño de HotClick quiero cabeceras y CSP mínimas para ONVO para no abrir huecos.
- **Responsable:** Seguridad
- **Prioridad:** P1 · **Puntos:** 1
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: solo los dominios necesarios de ONVO.
  2. Checklist: sin Meta Pixel ni dominios de terceros innecesarios.
  3. Checklist: probado en staging.
  4. Checklist: informe corto en /workspace/seguridad/ con cada hallazgo, su gravedad (crítico, alto, medio o bajo) y el arreglo propuesto.
  5. Dado el informe, cuando se cierra la historia, entonces no queda ningún hallazgo crítico ni alto abierto sin plan y sin dueño.
  6. Checklist: no se hacen ataques ni pruebas destructivas en producción; lo que se prueba en vivo se hace con cuentas QA-TEST y con OK de HOT_CLICK.
  7. Checklist: ninguna llave, secreto ni dato personal se copia al informe ni al chat.

### Sprint 3 · DevOps y Seguridad

#### S3-52 · Deploy de la rama ONVO solo a staging
- **Historia:** Como equipo quiero que la rama ONVO se despliegue solo a staging para probar sin tocar producción.
- **Responsable:** DevOps y Seguridad
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** S2-60 (Pipeline de CI/CD); S2-61 (Staging en staging.hotclick.lat)
- **Criterios de aceptación:**
  1. Checklist: producción bloqueada para esta rama.
  2. Checklist: interruptores ONVO apagados en producción.
  3. Checklist: staging con llaves de prueba.
  4. Checklist: el cambio queda documentado en un runbook en /workspace/infra/ con los pasos para hacerlo y para deshacerlo.
  5. Dado cualquier paso que toque producción, cuando está listo, entonces espera la aprobación manual de HOT_CLICK antes de ejecutarse.
  6. Checklist: los secretos se guardan en los secretos del servidor o de GitHub, nunca en el repo, en el chat ni en los logs.
  7. Dado el cambio aplicado, cuando se revisa el monitoreo, entonces el sitio responde y /api/health está en verde.

#### S3-53 · Alertas de webhook en staging
- **Historia:** Como equipo quiero alertas por errores 5xx o secreto inválido repetido para enterarnos si falla una notificación.
- **Responsable:** DevOps y Seguridad
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** S3-18 (Webhook de ONVO idempotente)
- **Criterios de aceptación:**
  1. Checklist: alerta a Grok Bot.
  2. Checklist: umbral definido.
  3. Checklist: probado con un error simulado en staging.
  4. Checklist: el cambio queda documentado en un runbook en /workspace/infra/ con los pasos para hacerlo y para deshacerlo.
  5. Dado cualquier paso que toque producción, cuando está listo, entonces espera la aprobación manual de HOT_CLICK antes de ejecutarse.
  6. Checklist: los secretos se guardan en los secretos del servidor o de GitHub, nunca en el repo, en el chat ni en los logs.
  7. Dado el cambio aplicado, cuando se revisa el monitoreo, entonces el sitio responde y /api/health está en verde.

#### S3-54 · Job de polling con bloqueo distribuido
- **Historia:** Como equipo quiero que los jobs de polling corran una sola vez aunque haya dos instancias para no duplicar llamadas a ONVO.
- **Responsable:** DevOps y Seguridad
- **Prioridad:** P1 · **Puntos:** 1
- **Dependencias:** S3-12 (Sincronizar estados de cuentas por polling)
- **Criterios de aceptación:**
  1. Checklist: ShedLock configurado.
  2. Checklist: horario y frecuencia documentados.
  3. Checklist: alerta si el job no corre.
  4. Checklist: el cambio queda documentado en un runbook en /workspace/infra/ con los pasos para hacerlo y para deshacerlo.
  5. Dado cualquier paso que toque producción, cuando está listo, entonces espera la aprobación manual de HOT_CLICK antes de ejecutarse.
  6. Checklist: los secretos se guardan en los secretos del servidor o de GitHub, nunca en el repo, en el chat ni en los logs.
  7. Dado el cambio aplicado, cuando se revisa el monitoreo, entonces el sitio responde y /api/health está en verde.

#### S3-55 · Backup verificado de la semana
- **Historia:** Como dueño de HotClick quiero verificar que los backups diarios corrieron toda la semana para confiar en ellos.
- **Responsable:** DevOps y Seguridad
- **Prioridad:** P1 · **Puntos:** 1
- **Dependencias:** S2-62 (Backups cifrados automáticos a Google Drive)
- **Criterios de aceptación:**
  1. Checklist: 5 de 5 backups presentes en Drive.
  2. Checklist: uno restaurado al azar.
  3. Checklist: informe.
  4. Checklist: el cambio queda documentado en un runbook en /workspace/infra/ con los pasos para hacerlo y para deshacerlo.
  5. Dado cualquier paso que toque producción, cuando está listo, entonces espera la aprobación manual de HOT_CLICK antes de ejecutarse.
  6. Checklist: los secretos se guardan en los secretos del servidor o de GitHub, nunca en el repo, en el chat ni en los logs.
  7. Dado el cambio aplicado, cuando se revisa el monitoreo, entonces el sitio responde y /api/health está en verde.

#### S3-56 · Métricas básicas de staging
- **Historia:** Como equipo quiero ver uso de CPU, memoria y disco de staging para que no afecte a producción.
- **Responsable:** DevOps y Seguridad
- **Prioridad:** P2 · **Puntos:** 1
- **Dependencias:** S2-61 (Staging en staging.hotclick.lat)
- **Criterios de aceptación:**
  1. Checklist: gráfico o reporte diario.
  2. Checklist: alerta si pasa de los límites.
  3. Checklist: documentado.
  4. Checklist: el cambio queda documentado en un runbook en /workspace/infra/ con los pasos para hacerlo y para deshacerlo.
  5. Dado cualquier paso que toque producción, cuando está listo, entonces espera la aprobación manual de HOT_CLICK antes de ejecutarse.
  6. Checklist: los secretos se guardan en los secretos del servidor o de GitHub, nunca en el repo, en el chat ni en los logs.
  7. Dado el cambio aplicado, cuando se revisa el monitoreo, entonces el sitio responde y /api/health está en verde.

### Sprint 3 · Producto Contenido y Soporte

#### S3-57 · Instrucciones para el onboarding de ONVO
- **Historia:** Como vendedor quiero una guía de qué tener a mano para el formulario de ONVO para terminarlo en un intento.
- **Responsable:** Producto Contenido y Soporte
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** S2-69 (FAQ «¿Qué es ONVO?»)
- **Criterios de aceptación:**
  1. Checklist: identificación, IBAN y datos que pide la política KYC de ONVO.
  2. Checklist: aclara que HotClick no ve esos datos.
  3. Checklist: qué hacer si el enlace venció.
  4. Checklist: el texto está en español de Costa Rica, con voseo, claro y sin jerga técnica.
  5. Checklist: no inventa montos; usa solo los decididos por HOT_CLICK o dice «monto a definir por HOT_CLICK».
  6. Dado el texto final, cuando HOT_CLICK lo revisa, entonces se publica solo con su aprobación escrita.
  7. Checklist: no promete WhatsApp API, no usa Meta Pixel y no presenta a Tilopay como pasarela vigente una vez que ONVO esté en uso.

#### S3-58 · Texto del correo de invitación
- **Historia:** Como vendedor quiero el texto del correo que invita a activar cobros para entender qué hacer.
- **Responsable:** Producto Contenido y Soporte
- **Prioridad:** P1 · **Puntos:** 1
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: sin montos inventados.
  2. Checklist: explica quincenal o mensual con US$3.
  3. Checklist: lo dispara el admin desde la plataforma, ningún bot escribe por fuera.
  4. Checklist: el texto está en español de Costa Rica, con voseo, claro y sin jerga técnica.
  5. Checklist: no inventa montos; usa solo los decididos por HOT_CLICK o dice «monto a definir por HOT_CLICK».
  6. Dado el texto final, cuando HOT_CLICK lo revisa, entonces se publica solo con su aprobación escrita.
  7. Checklist: no promete WhatsApp API, no usa Meta Pixel y no presenta a Tilopay como pasarela vigente una vez que ONVO esté en uso.

#### S3-59 · Guion de soporte del onboarding
- **Historia:** Como soporte quiero respuestas para enlace vencido, suspensión, IBAN y pausa para responder igual siempre.
- **Responsable:** Producto Contenido y Soporte
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: nunca pide datos de tarjeta ni del IBAN completo.
  2. Checklist: diferencia pausa de HotClick y suspensión de ONVO.
  3. Checklist: cuándo escalar.
  4. Checklist: el texto está en español de Costa Rica, con voseo, claro y sin jerga técnica.
  5. Checklist: no inventa montos; usa solo los decididos por HOT_CLICK o dice «monto a definir por HOT_CLICK».
  6. Dado el texto final, cuando HOT_CLICK lo revisa, entonces se publica solo con su aprobación escrita.
  7. Checklist: no promete WhatsApp API, no usa Meta Pixel y no presenta a Tilopay como pasarela vigente una vez que ONVO esté en uso.

#### S3-60 · Textos del checkout con tarjeta
- **Historia:** Como comprador quiero textos de pago, error y confirmación para entender el pago sin jerga.
- **Responsable:** Producto Contenido y Soporte
- **Prioridad:** P1 · **Puntos:** 1
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: «Pagás con ONVO a nombre de {tienda}».
  2. Checklist: «Vas a ver un cargo por cada tienda».
  3. Checklist: sin mencionar Tilopay.
  4. Checklist: el texto está en español de Costa Rica, con voseo, claro y sin jerga técnica.
  5. Checklist: no inventa montos; usa solo los decididos por HOT_CLICK o dice «monto a definir por HOT_CLICK».
  6. Dado el texto final, cuando HOT_CLICK lo revisa, entonces se publica solo con su aprobación escrita.
  7. Checklist: no promete WhatsApp API, no usa Meta Pixel y no presenta a Tilopay como pasarela vigente una vez que ONVO esté en uso.

#### S3-61 · Guía de pago rechazado
- **Historia:** Como soporte quiero una guía para responder a compradores con pago rechazado para resolver rápido.
- **Responsable:** Producto Contenido y Soporte
- **Prioridad:** P2 · **Puntos:** 1
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: pasos de reintento.
  2. Checklist: nunca pedir tarjeta por chat.
  3. Checklist: cuándo escalar a la tienda o a HotClick.
  4. Checklist: el texto está en español de Costa Rica, con voseo, claro y sin jerga técnica.
  5. Checklist: no inventa montos; usa solo los decididos por HOT_CLICK o dice «monto a definir por HOT_CLICK».
  6. Dado el texto final, cuando HOT_CLICK lo revisa, entonces se publica solo con su aprobación escrita.
  7. Checklist: no promete WhatsApp API, no usa Meta Pixel y no presenta a Tilopay como pasarela vigente una vez que ONVO esté en uso.

### Sprint 3 · Finanzas

#### S3-62 · Verificar el % en las cuentas de prueba
- **Historia:** Como dueño de HotClick quiero revisar que el % configurado en cada cuenta de prueba sea el correcto para cobrar bien desde el inicio.
- **Responsable:** Finanzas
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** S3-09 (Comisión % por negocio editable desde el admin)
- **Criterios de aceptación:**
  1. Checklist: muestra de cuentas en el admin de staging.
  2. Checklist: 9 % y 7 % según plan o el % editado.
  3. Checklist: diferencias reportadas.
  4. Checklist: usa solo montos dados por HOT_CLICK o publicados en las fuentes; cualquier otro dice «monto a definir por HOT_CLICK».
  5. Checklist: la planilla o el informe queda en /workspace/finanzas/ con fecha y la fuente de cada cifra.
  6. Dado una muestra de casos, cuando se recalculan a mano, entonces el resultado cuadra o la diferencia queda explicada.
  7. Dado el resultado, cuando se le entrega a HOT_CLICK por medio de Grok Bot, entonces queda anotada su respuesta o decisión.

#### S3-63 · Split en compras de prueba
- **Historia:** Como dueño de HotClick quiero verificar bruto, comisión y neto de cada compra de prueba para confirmar que el split coincide con el plan.
- **Responsable:** Finanzas
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** S3-18 (Webhook de ONVO idempotente)
- **Criterios de aceptación:**
  1. Checklist: tabla de compras de prueba.
  2. Checklist: sin tomar el ejemplo de la documentación como tarifa real.
  3. Checklist: anota si la comisión se calcula sobre bruto o neto.
  4. Checklist: usa solo montos dados por HOT_CLICK o publicados en las fuentes; cualquier otro dice «monto a definir por HOT_CLICK».
  5. Checklist: la planilla o el informe queda en /workspace/finanzas/ con fecha y la fuente de cada cifra.
  6. Dado una muestra de casos, cuando se recalculan a mano, entonces el resultado cuadra o la diferencia queda explicada.
  7. Dado el resultado, cuando se le entrega a HOT_CLICK por medio de Grok Bot, entonces queda anotada su respuesta o decisión.

#### S3-64 · Registro de frecuencias para configurar a mano
- **Historia:** Como admin de HotClick quiero una lista semanal de negocios con su frecuencia elegida para configurarla en ONVO sin olvidos.
- **Responsable:** Finanzas
- **Prioridad:** P2 · **Puntos:** 1
- **Dependencias:** S3-11 (Frecuencia quincenal o mensual en el registro y perfil)
- **Criterios de aceptación:**
  1. Checklist: lista sale del admin.
  2. Checklist: marca cuáles ya se configuraron.
  3. Checklist: alerta si alguno lleva más de una semana sin configurar.
  4. Checklist: usa solo montos dados por HOT_CLICK o publicados en las fuentes; cualquier otro dice «monto a definir por HOT_CLICK».
  5. Checklist: la planilla o el informe queda en /workspace/finanzas/ con fecha y la fuente de cada cifra.
  6. Dado una muestra de casos, cuando se recalculan a mano, entonces el resultado cuadra o la diferencia queda explicada.
  7. Dado el resultado, cuando se le entrega a HOT_CLICK por medio de Grok Bot, entonces queda anotada su respuesta o decisión.

### Sprint 3 · Consultor

#### S3-65 · Revisión del código de alta ONVO
- **Historia:** Como equipo quiero revisar el PR de cuentas conectadas para detectar riesgos antes de seguir.
- **Responsable:** Consultor
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** S3-07 (Botón «Registrar negocio en ONVO»)
- **Criterios de aceptación:**
  1. Checklist: idempotencia del botón.
  2. Checklist: manejo de errores de ONVO.
  3. Checklist: tenant y auditoría.
  4. Checklist: el informe queda en /workspace/consultor/ y cita archivo y línea de cada afirmación sobre el código.
  5. Checklist: trabajo solo de lectura: no cambia código, no hace push, no despliega y no le escribe a nadie.
  6. Dado cada hallazgo, cuando se entrega, entonces trae prioridad (P0, P1 o P2), dueño sugerido y si necesita una decisión de HOT_CLICK.
  7. Dado el informe, cuando lo lee el Desarrollador, entonces puede convertir cada recomendación en una historia sin tener que preguntar más.

#### S3-66 · Revisión del webhook y la máquina de estados
- **Historia:** Como equipo quiero revisar idempotencia y orden de eventos para que un evento viejo no pise uno nuevo.
- **Responsable:** Consultor
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** S3-18 (Webhook de ONVO idempotente)
- **Criterios de aceptación:**
  1. Checklist: estados monótonos.
  2. Checklist: verificación con GET.
  3. Checklist: casos de prueba suficientes.
  4. Checklist: el informe queda en /workspace/consultor/ y cita archivo y línea de cada afirmación sobre el código.
  5. Checklist: trabajo solo de lectura: no cambia código, no hace push, no despliega y no le escribe a nadie.
  6. Dado cada hallazgo, cuando se entrega, entonces trae prioridad (P0, P1 o P2), dueño sugerido y si necesita una decisión de HOT_CLICK.
  7. Dado el informe, cuando lo lee el Desarrollador, entonces puede convertir cada recomendación en una historia sin tener que preguntar más.

#### S3-67 · Riesgos del modelo multitienda
- **Historia:** Como dueño de HotClick quiero un análisis de riesgos del cobro por tienda para prever pagos parciales y reembolsos cruzados.
- **Responsable:** Consultor
- **Prioridad:** P2 · **Puntos:** 1
- **Dependencias:** S3-17 (Un cobro por tienda en carritos con varias tiendas)
- **Criterios de aceptación:**
  1. Checklist: casos de pago parcial.
  2. Checklist: reembolsos por subpedido.
  3. Checklist: recomendaciones.
  4. Checklist: el informe queda en /workspace/consultor/ y cita archivo y línea de cada afirmación sobre el código.
  5. Checklist: trabajo solo de lectura: no cambia código, no hace push, no despliega y no le escribe a nadie.
  6. Dado cada hallazgo, cuando se entrega, entonces trae prioridad (P0, P1 o P2), dueño sugerido y si necesita una decisión de HOT_CLICK.
  7. Dado el informe, cuando lo lee el Desarrollador, entonces puede convertir cada recomendación en una historia sin tener que preguntar más.

---

## Sprint 4: SINPE Móvil, mínimo de ₡700, planes pagos, liquidaciones, POS y envíos
- **Duración:** 1 semana (lunes 9-nov al viernes 13-nov-2026).
- **Objetivo:** Completar el cobro: SINPE Móvil en el Checkout de ONVO, mínimo de ₡700 cobrado como diferencia con la tarifa semanal (si ONVO lo confirma; si no, plan B), planes Pyme y Negocio Plus que se activan solo con el pago confirmado, polling de liquidaciones con la frecuencia elegida, panel de ventas con bruto, comisión y neto, tienda propia conectada a la pasarela, POS según tu decisión y opciones de envío claras.
- **Entregable de cierre:** Compra por SINPE Móvil y plan pago activado en sandbox, cálculo semanal del mínimo validado por Finanzas y POS y envíos en verde.
- **Historias:** 68 · **Puntos:** 133

| Rol | Historias | Puntos |
|---|---:|---:|
| HOT_CLICK (dueño) | 5 | 5 |
| Desarrollador | 16 | 46 |
| Diseño / UX (Figma) | 5 | 10 |
| QA (calidad) | 5 | 11 |
| QA Compradores | 5 | 9 |
| QA Negocios | 5 | 9 |
| QA Automatización y Regresión | 5 | 9 |
| Seguridad | 5 | 8 |
| DevOps y Seguridad | 5 | 7 |
| Producto Contenido y Soporte | 5 | 7 |
| Finanzas | 4 | 8 |
| Consultor | 3 | 4 |

### Sprint 4 · HOT_CLICK (dueño)

#### S4-01 · Confirmar con ONVO el ajuste semanal del mínimo
- **Historia:** Como dueño de HotClick quiero confirmar con ONVO que la tarifa semanal se puede cambiar cada semana para cobrar la diferencia hasta ₡700 para saber si va el plan A o el plan B.
- **Responsable:** HOT_CLICK (dueño)
- **Prioridad:** P0 · **Puntos:** 1
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: respuesta de ONVO archivada (cuándo aplica el cambio de monto en la semana).
  2. Checklist: si ONVO dice que no, HOT_CLICK confirma el plan B: absorber la diferencia mientras duren los 70 cupos.
  3. Checklist: el equipo recibe la decisión antes del miércoles.
  4. Checklist: la decisión o entrega queda anotada con fecha y opción elegida en /workspace/informes/decisiones-hotclick.md.
  5. Dado que HOT_CLICK decide, cuando Grok Bot lo registra, entonces avisa al equipo qué historias quedan destrabadas.
  6. Checklist: credenciales y llaves se entregan solo por un canal seguro (solicitud de secreto), nunca por chat.
  7. Dado que la decisión no llega antes del cierre del sprint, cuando se hace la revisión, entonces las historias que dependen de ella pasan al sprint siguiente sin construirse a medias.

#### S4-02 · Decidir el POS QR con SINPE
- **Historia:** Como dueño de HotClick quiero decidir si el POS QR cobra por SINPE Móvil vía ONVO, al número del negocio o se esconde para que la caja funcione igual para todos.
- **Responsable:** HOT_CLICK (dueño)
- **Prioridad:** P1 · **Puntos:** 1
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: opción elegida.
  2. Checklist: queda claro si el POS QR con tarjeta usa ONVO.
  3. Checklist: decisión anotada.
  4. Checklist: la decisión o entrega queda anotada con fecha y opción elegida en /workspace/informes/decisiones-hotclick.md.
  5. Dado que HOT_CLICK decide, cuando Grok Bot lo registra, entonces avisa al equipo qué historias quedan destrabadas.
  6. Checklist: credenciales y llaves se entregan solo por un canal seguro (solicitud de secreto), nunca por chat.
  7. Dado que la decisión no llega antes del cierre del sprint, cuando se hace la revisión, entonces las historias que dependen de ella pasan al sprint siguiente sin construirse a medias.

#### S4-03 · Decidir el tiempo de espera de un SINPE
- **Historia:** Como dueño de HotClick quiero fijar cuánto se espera un SINPE pendiente antes de liberar el stock para que el vendedor no pierda ventas ni stock.
- **Responsable:** HOT_CLICK (dueño)
- **Prioridad:** P1 · **Puntos:** 1
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: tiempo elegido o «a definir por HOT_CLICK».
  2. Checklist: se muestra al comprador.
  3. Checklist: se aplica igual en tienda y marketplace.
  4. Checklist: la decisión o entrega queda anotada con fecha y opción elegida en /workspace/informes/decisiones-hotclick.md.
  5. Dado que HOT_CLICK decide, cuando Grok Bot lo registra, entonces avisa al equipo qué historias quedan destrabadas.
  6. Checklist: credenciales y llaves se entregan solo por un canal seguro (solicitud de secreto), nunca por chat.
  7. Dado que la decisión no llega antes del cierre del sprint, cuando se hace la revisión, entonces las historias que dependen de ella pasan al sprint siguiente sin construirse a medias.

#### S4-04 · Confirmar las tarifas de envío y la página de envíos (DIS-3)
- **Historia:** Como dueño de HotClick quiero confirmar las tarifas de envío vigentes y si la página de envíos las publica para que el comprador sepa cuánto paga.
- **Responsable:** HOT_CLICK (dueño)
- **Prioridad:** P1 · **Puntos:** 1
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: envío normal GAM ₡4.000 confirmado; el resto «monto a definir por HOT_CLICK» si no está decidido.
  2. Checklist: decisión sobre la página de envíos.
  3. Checklist: contra entrega: efectivo al entregar o solo al retirar (PAG-7).
  4. Checklist: la decisión o entrega queda anotada con fecha y opción elegida en /workspace/informes/decisiones-hotclick.md.
  5. Dado que HOT_CLICK decide, cuando Grok Bot lo registra, entonces avisa al equipo qué historias quedan destrabadas.
  6. Checklist: credenciales y llaves se entregan solo por un canal seguro (solicitud de secreto), nunca por chat.
  7. Dado que la decisión no llega antes del cierre del sprint, cuando se hace la revisión, entonces las historias que dependen de ella pasan al sprint siguiente sin construirse a medias.

#### S4-05 · Revisar la demo de SINPE Móvil y planes pagos
- **Historia:** Como dueño de HotClick quiero ver en staging la compra por SINPE Móvil y la activación de un plan pago para aprobar antes de seguir.
- **Responsable:** HOT_CLICK (dueño)
- **Prioridad:** P1 · **Puntos:** 1
- **Dependencias:** S4-06 (Pagar con SINPE Móvil en el Checkout de ONVO); S4-11 (Planes pagos que se activan solo con el pago confirmado)
- **Criterios de aceptación:**
  1. Checklist: demo vista.
  2. Checklist: comentarios anotados.
  3. Checklist: ningún deploy a producción sin su aprobación manual.
  4. Checklist: la decisión o entrega queda anotada con fecha y opción elegida en /workspace/informes/decisiones-hotclick.md.
  5. Dado que HOT_CLICK decide, cuando Grok Bot lo registra, entonces avisa al equipo qué historias quedan destrabadas.
  6. Checklist: credenciales y llaves se entregan solo por un canal seguro (solicitud de secreto), nunca por chat.
  7. Dado que la decisión no llega antes del cierre del sprint, cuando se hace la revisión, entonces las historias que dependen de ella pasan al sprint siguiente sin construirse a medias.

### Sprint 4 · Desarrollador

#### S4-06 · Pagar con SINPE Móvil en el Checkout de ONVO
- **Historia:** Como comprador quiero pagar por SINPE Móvil en la página de ONVO para usar mi método preferido.
- **Responsable:** Desarrollador
- **Prioridad:** P0 · **Puntos:** 3
- **Dependencias:** S3-16 (Checkout hospedado con onBehalfOf); S3-18 (Webhook de ONVO idempotente)
- **Criterios de aceptación:**
  1. Checklist: moneda CRC y las instrucciones las muestra ONVO.
  2. Checklist: el pedido queda «Pago pendiente» con stock reservado mientras llega la transferencia (payment-intent.deferred).
  3. Checklist: se da por pagado solo con payment-intent.succeeded verificado con GET; mobile-transfer.received queda solo como log.
  4. Checklist: el cambio va en su propia rama y PR, con pruebas automáticas (mvn y vitest) en verde y revisión de Seguridad si toca pagos, permisos o datos personales.
  5. Dado que el PR está aprobado, cuando se quiere subir a producción, entonces solo se despliega con la aprobación manual de HOT_CLICK, con pg_dump y etiqueta de vuelta atrás hechos antes.
  6. Checklist: ningún secreto, llave ni dato personal queda en el código o en los logs, y ningún monto queda escrito en el código (sale del plan o de la configuración).
  7. Dado el cambio en staging, cuando QA lo prueba desde el navegador a 390 y 1440 px, entonces no hay errores 500 ni textos «[PENDIENTE]» en las pantallas tocadas.

#### S4-07 · Cédula del pagador SINPE
- **Historia:** Como comprador quiero ingresar la cédula del pagador cuando ONVO la pide para que ONVO reconozca mi SINPE.
- **Responsable:** Desarrollador
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** S4-06 (Pagar con SINPE Móvil en el Checkout de ONVO)
- **Criterios de aceptación:**
  1. Checklist: formato validado en el servidor.
  2. Checklist: cédula enmascarada en logs y con plazo de conservación definido.
  3. Checklist: aviso de para qué se usa.
  4. Checklist: el cambio va en su propia rama y PR, con pruebas automáticas (mvn y vitest) en verde y revisión de Seguridad si toca pagos, permisos o datos personales.
  5. Dado que el PR está aprobado, cuando se quiere subir a producción, entonces solo se despliega con la aprobación manual de HOT_CLICK, con pg_dump y etiqueta de vuelta atrás hechos antes.
  6. Checklist: ningún secreto, llave ni dato personal queda en el código o en los logs, y ningún monto queda escrito en el código (sale del plan o de la configuración).
  7. Dado el cambio en staging, cuando QA lo prueba desde el navegador a 390 y 1440 px, entonces no hay errores 500 ni textos «[PENDIENTE]» en las pantallas tocadas.

#### S4-08 · Liberar stock de SINPE vencido
- **Historia:** Como comprador quiero que un SINPE que nunca llega libere el stock en el plazo decidido para que otros puedan comprar.
- **Responsable:** Desarrollador
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** S4-06 (Pagar con SINPE Móvil en el Checkout de ONVO); S4-03 (Decidir el tiempo de espera de un SINPE)
- **Criterios de aceptación:**
  1. Checklist: plazo configurable con el valor de HOT_CLICK.
  2. Checklist: correo al comprador avisando la cancelación.
  3. Checklist: el vendedor ve el pedido cancelado.
  4. Checklist: el cambio va en su propia rama y PR, con pruebas automáticas (mvn y vitest) en verde y revisión de Seguridad si toca pagos, permisos o datos personales.
  5. Dado que el PR está aprobado, cuando se quiere subir a producción, entonces solo se despliega con la aprobación manual de HOT_CLICK, con pg_dump y etiqueta de vuelta atrás hechos antes.
  6. Checklist: ningún secreto, llave ni dato personal queda en el código o en los logs, y ningún monto queda escrito en el código (sale del plan o de la configuración).
  7. Dado el cambio en staging, cuando QA lo prueba desde el navegador a 390 y 1440 px, entonces no hay errores 500 ni textos «[PENDIENTE]» en las pantallas tocadas.

#### S4-09 · Mínimo de ₡700 por diferencia semanal
- **Historia:** Como dueño de HotClick quiero calcular cada semana la diferencia entre ₡700 y la comisión de cada venta y cobrarla con la tarifa semanal del negocio para que las ventas chicas no den pérdida.
- **Responsable:** Desarrollador
- **Prioridad:** P0 · **Puntos:** 5
- **Dependencias:** S4-01 (Confirmar con ONVO el ajuste semanal del mínimo); S3-18 (Webhook de ONVO idempotente)
- **Criterios de aceptación:**
  1. Dado una venta de un negocio, cuando se confirma el pago, entonces se registra la diferencia max(0; 700 − % × venta).
  2. Checklist: antes del corte semanal de ONVO se actualiza marketplaceWeeklyFeeAmount (en céntimos) con la suma de la semana, vía POST .../weekly-fees.
  3. Checklist: si ONVO no lo permite, el interruptor queda en plan B (HotClick absorbe) y la diferencia solo se reporta.
  4. Checklist: maneja weekly_fee.child_bank_account_required y parent_bank_account_required.
  5. Checklist: el cambio va en su propia rama y PR, con pruebas automáticas (mvn y vitest) en verde y revisión de Seguridad si toca pagos, permisos o datos personales.
  6. Dado que el PR está aprobado, cuando se quiere subir a producción, entonces solo se despliega con la aprobación manual de HOT_CLICK, con pg_dump y etiqueta de vuelta atrás hechos antes.
  7. Checklist: ningún secreto, llave ni dato personal queda en el código o en los logs, y ningún monto queda escrito en el código (sale del plan o de la configuración).
  8. Dado el cambio en staging, cuando QA lo prueba desde el navegador a 390 y 1440 px, entonces no hay errores 500 ni textos «[PENDIENTE]» en las pantallas tocadas.

#### S4-10 · Detalle de la diferencia del mínimo para el negocio
- **Historia:** Como vendedor quiero ver en mi panel cuánto se me cobra de diferencia cada semana y por qué ventas para entender el cargo.
- **Responsable:** Desarrollador
- **Prioridad:** P1 · **Puntos:** 3
- **Dependencias:** S4-09 (Mínimo de ₡700 por diferencia semanal)
- **Criterios de aceptación:**
  1. Checklist: lista de ventas bajo el mínimo con su diferencia.
  2. Checklist: total de la semana.
  3. Checklist: texto que aclara que es comisión, no mínimo de compra.
  4. Checklist: el cambio va en su propia rama y PR, con pruebas automáticas (mvn y vitest) en verde y revisión de Seguridad si toca pagos, permisos o datos personales.
  5. Dado que el PR está aprobado, cuando se quiere subir a producción, entonces solo se despliega con la aprobación manual de HOT_CLICK, con pg_dump y etiqueta de vuelta atrás hechos antes.
  6. Checklist: ningún secreto, llave ni dato personal queda en el código o en los logs, y ningún monto queda escrito en el código (sale del plan o de la configuración).
  7. Dado el cambio en staging, cuando QA lo prueba desde el navegador a 390 y 1440 px, entonces no hay errores 500 ni textos «[PENDIENTE]» en las pantallas tocadas.

#### S4-11 · Planes pagos que se activan solo con el pago confirmado
- **Historia:** Como vendedor Pyme o Negocio Plus quiero que mi plan Pyme o Negocio Plus se active solo cuando ONVO confirma el pago para no tener un plan activo sin pagar ni pagar sin plan.
- **Responsable:** Desarrollador
- **Prioridad:** P0 · **Puntos:** 5
- **Dependencias:** S3-18 (Webhook de ONVO idempotente); S2-04 (Decisiones de cobro con ONVO)
- **Criterios de aceptación:**
  1. Checklist: el cobro va con la cuenta de HotClick (sin onBehalfOf) según la opción de mensualidad decidida.
  2. Checklist: se activa solo con el webhook confirmado más la verificación por GET, a través del puerto PlanPagoConfirmado.
  3. Checklist: si el pago falla, sigue en Emprendedor con «Completar pago».
  4. Checklist: el % de comisión se actualiza a 7 % al activarse (o al que fije el admin).
  5. Checklist: el cambio va en su propia rama y PR, con pruebas automáticas (mvn y vitest) en verde y revisión de Seguridad si toca pagos, permisos o datos personales.
  6. Dado que el PR está aprobado, cuando se quiere subir a producción, entonces solo se despliega con la aprobación manual de HOT_CLICK, con pg_dump y etiqueta de vuelta atrás hechos antes.
  7. Checklist: ningún secreto, llave ni dato personal queda en el código o en los logs, y ningún monto queda escrito en el código (sale del plan o de la configuración).
  8. Dado el cambio en staging, cuando QA lo prueba desde el navegador a 390 y 1440 px, entonces no hay errores 500 ni textos «[PENDIENTE]» en las pantallas tocadas.

#### S4-12 · Renovación de la mensualidad
- **Historia:** Como vendedor Pyme o Negocio Plus quiero que la mensualidad se renueve con la opción decidida y me avise antes para no perder mi plan por descuido.
- **Responsable:** Desarrollador
- **Prioridad:** P1 · **Puntos:** 3
- **Dependencias:** S4-11 (Planes pagos que se activan solo con el pago confirmado)
- **Criterios de aceptación:**
  1. Checklist: aviso antes del cobro.
  2. Checklist: renovación fallida deja días de gracia según la regla vigente (7 días).
  3. Checklist: eventos subscription.renewal.* si se usa cargo recurrente.
  4. Checklist: el cambio va en su propia rama y PR, con pruebas automáticas (mvn y vitest) en verde y revisión de Seguridad si toca pagos, permisos o datos personales.
  5. Dado que el PR está aprobado, cuando se quiere subir a producción, entonces solo se despliega con la aprobación manual de HOT_CLICK, con pg_dump y etiqueta de vuelta atrás hechos antes.
  6. Checklist: ningún secreto, llave ni dato personal queda en el código o en los logs, y ningún monto queda escrito en el código (sale del plan o de la configuración).
  7. Dado el cambio en staging, cuando QA lo prueba desde el navegador a 390 y 1440 px, entonces no hay errores 500 ni textos «[PENDIENTE]» en las pantallas tocadas.

#### S4-13 · Polling de liquidaciones
- **Historia:** Como sistema quiero consultar periódicamente las liquidaciones y movimientos de cada negocio para conciliar sin webhooks de liquidación.
- **Responsable:** Desarrollador
- **Prioridad:** P1 · **Puntos:** 3
- **Dependencias:** S3-18 (Webhook de ONVO idempotente)
- **Criterios de aceptación:**
  1. Checklist: job diario que lista intenciones por negocio.
  2. Checklist: guarda ultima_sincronizacion.
  3. Checklist: si ONVO no expone liquidaciones por API, se registra la limitación y se concilia por intenciones.
  4. Checklist: el cambio va en su propia rama y PR, con pruebas automáticas (mvn y vitest) en verde y revisión de Seguridad si toca pagos, permisos o datos personales.
  5. Dado que el PR está aprobado, cuando se quiere subir a producción, entonces solo se despliega con la aprobación manual de HOT_CLICK, con pg_dump y etiqueta de vuelta atrás hechos antes.
  6. Checklist: ningún secreto, llave ni dato personal queda en el código o en los logs, y ningún monto queda escrito en el código (sale del plan o de la configuración).
  7. Dado el cambio en staging, cuando QA lo prueba desde el navegador a 390 y 1440 px, entonces no hay errores 500 ni textos «[PENDIENTE]» en las pantallas tocadas.

#### S4-14 · Excluir del pago quincenal propio lo cobrado por ONVO
- **Historia:** Como sistema quiero marcar liquidado_por_pasarela y sacar esas ventas de WalletLiquidacionService para no pagarle doble al vendedor.
- **Responsable:** Desarrollador
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** S3-18 (Webhook de ONVO idempotente)
- **Criterios de aceptación:**
  1. Checklist: ventas ONVO excluidas.
  2. Checklist: efectivo y contra entrega siguen su flujo.
  3. Checklist: prueba con mezcla de ventas.
  4. Checklist: el cambio va en su propia rama y PR, con pruebas automáticas (mvn y vitest) en verde y revisión de Seguridad si toca pagos, permisos o datos personales.
  5. Dado que el PR está aprobado, cuando se quiere subir a producción, entonces solo se despliega con la aprobación manual de HOT_CLICK, con pg_dump y etiqueta de vuelta atrás hechos antes.
  6. Checklist: ningún secreto, llave ni dato personal queda en el código o en los logs, y ningún monto queda escrito en el código (sale del plan o de la configuración).
  7. Dado el cambio en staging, cuando QA lo prueba desde el navegador a 390 y 1440 px, entonces no hay errores 500 ni textos «[PENDIENTE]» en las pantallas tocadas.

#### S4-15 · Panel de ventas con bruto, comisión y neto
- **Historia:** Como vendedor quiero ver cada venta con bruto, comisión y neto para entender mis ingresos.
- **Responsable:** Desarrollador
- **Prioridad:** P1 · **Puntos:** 3
- **Dependencias:** S4-13 (Polling de liquidaciones)
- **Criterios de aceptación:**
  1. Checklist: datos que devuelve ONVO.
  2. Checklist: frecuencia de liquidación elegida y US$3 por liquidación visibles.
  3. Checklist: solo veo mis ventas.
  4. Checklist: el cambio va en su propia rama y PR, con pruebas automáticas (mvn y vitest) en verde y revisión de Seguridad si toca pagos, permisos o datos personales.
  5. Dado que el PR está aprobado, cuando se quiere subir a producción, entonces solo se despliega con la aprobación manual de HOT_CLICK, con pg_dump y etiqueta de vuelta atrás hechos antes.
  6. Checklist: ningún secreto, llave ni dato personal queda en el código o en los logs, y ningún monto queda escrito en el código (sale del plan o de la configuración).
  7. Dado el cambio en staging, cuando QA lo prueba desde el navegador a 390 y 1440 px, entonces no hay errores 500 ni textos «[PENDIENTE]» en las pantallas tocadas.

#### S4-16 · Tienda propia conectada a la pasarela
- **Historia:** Como comprador quiero pagar en línea también en /tienda/<slug> para no tener que coordinar el pago con el vendedor.
- **Responsable:** Desarrollador
- **Prioridad:** P1 · **Puntos:** 3
- **Dependencias:** S3-16 (Checkout hospedado con onBehalfOf)
- **Criterios de aceptación:**
  1. Checklist: mismo Checkout hospedado con onBehalfOf de la tienda.
  2. Checklist: «Confirmar pago recibido» queda solo para pagos fuera de línea.
  3. Checklist: si la tienda no está activa o está pausada, solo efectivo o contra entrega.
  4. Checklist: el cambio va en su propia rama y PR, con pruebas automáticas (mvn y vitest) en verde y revisión de Seguridad si toca pagos, permisos o datos personales.
  5. Dado que el PR está aprobado, cuando se quiere subir a producción, entonces solo se despliega con la aprobación manual de HOT_CLICK, con pg_dump y etiqueta de vuelta atrás hechos antes.
  6. Checklist: ningún secreto, llave ni dato personal queda en el código o en los logs, y ningún monto queda escrito en el código (sale del plan o de la configuración).
  7. Dado el cambio en staging, cuando QA lo prueba desde el navegador a 390 y 1440 px, entonces no hay errores 500 ni textos «[PENDIENTE]» en las pantallas tocadas.

#### S4-17 · POS según la decisión de HOT_CLICK
- **Historia:** Como vendedor quiero que el POS aplique la decisión sobre negocios sin aprobar y sobre el QR para vender en caja con reglas claras.
- **Responsable:** Desarrollador
- **Prioridad:** P1 · **Puntos:** 3
- **Dependencias:** S1-04 (Decidir si un negocio sin aprobar cobra en efectivo en el POS (NP-13a)); S4-02 (Decidir el POS QR con SINPE)
- **Criterios de aceptación:**
  1. Checklist: CobroNegocioGuard aplicado en todos los proveedores nuevos.
  2. Checklist: POS QR con ONVO, con el número del negocio o escondido según decidió HOT_CLICK.
  3. Checklist: efectivo con monto exacto en un clic.
  4. Checklist: el cambio va en su propia rama y PR, con pruebas automáticas (mvn y vitest) en verde y revisión de Seguridad si toca pagos, permisos o datos personales.
  5. Dado que el PR está aprobado, cuando se quiere subir a producción, entonces solo se despliega con la aprobación manual de HOT_CLICK, con pg_dump y etiqueta de vuelta atrás hechos antes.
  6. Checklist: ningún secreto, llave ni dato personal queda en el código o en los logs, y ningún monto queda escrito en el código (sale del plan o de la configuración).
  7. Dado el cambio en staging, cuando QA lo prueba desde el navegador a 390 y 1440 px, entonces no hay errores 500 ni textos «[PENDIENTE]» en las pantallas tocadas.

#### S4-18 · Opciones de envío en el checkout
- **Historia:** Como comprador quiero elegir entre envío normal, retiro y las demás opciones vigentes con su costo claro para saber cuánto pago antes de confirmar.
- **Responsable:** Desarrollador
- **Prioridad:** P1 · **Puntos:** 3
- **Dependencias:** S4-04 (Confirmar las tarifas de envío y la página de envíos (DIS-3))
- **Criterios de aceptación:**
  1. Checklist: una sola fuente de tarifas en el backend; se quita la tabla duplicada del front.
  2. Checklist: envío normal GAM de ₡4.000; otros montos según HOT_CLICK.
  3. Checklist: contra entrega según la decisión (PAG-7).
  4. Checklist: el cambio va en su propia rama y PR, con pruebas automáticas (mvn y vitest) en verde y revisión de Seguridad si toca pagos, permisos o datos personales.
  5. Dado que el PR está aprobado, cuando se quiere subir a producción, entonces solo se despliega con la aprobación manual de HOT_CLICK, con pg_dump y etiqueta de vuelta atrás hechos antes.
  6. Checklist: ningún secreto, llave ni dato personal queda en el código o en los logs, y ningún monto queda escrito en el código (sale del plan o de la configuración).
  7. Dado el cambio en staging, cuando QA lo prueba desde el navegador a 390 y 1440 px, entonces no hay errores 500 ni textos «[PENDIENTE]» en las pantallas tocadas.

#### S4-19 · Pedido con correo ya registrado
- **Historia:** Como comprador quiero que el checkout me proponga iniciar sesión si mi correo ya tiene cuenta para ver la compra en mis pedidos.
- **Responsable:** Desarrollador
- **Prioridad:** P2 · **Puntos:** 2
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: ofrece iniciar sesión sin bloquear la compra como invitado.
  2. Checklist: no revela si el correo existe a terceros (mensaje neutro).
  3. Checklist: Seguridad aprueba.
  4. Checklist: el cambio va en su propia rama y PR, con pruebas automáticas (mvn y vitest) en verde y revisión de Seguridad si toca pagos, permisos o datos personales.
  5. Dado que el PR está aprobado, cuando se quiere subir a producción, entonces solo se despliega con la aprobación manual de HOT_CLICK, con pg_dump y etiqueta de vuelta atrás hechos antes.
  6. Checklist: ningún secreto, llave ni dato personal queda en el código o en los logs, y ningún monto queda escrito en el código (sale del plan o de la configuración).
  7. Dado el cambio en staging, cuando QA lo prueba desde el navegador a 390 y 1440 px, entonces no hay errores 500 ni textos «[PENDIENTE]» en las pantallas tocadas.

#### S4-20 · Números de pedido por tienda
- **Historia:** Como vendedor quiero que mis pedidos tengan numeración propia para no exponer el volumen de la plataforma.
- **Responsable:** Desarrollador
- **Prioridad:** P2 · **Puntos:** 2
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: número visible por tienda; el id interno no se muestra.
  2. Checklist: pedidos viejos conservan su número.
  3. Checklist: abrir el pedido de otra tienda sigue bloqueado.
  4. Checklist: el cambio va en su propia rama y PR, con pruebas automáticas (mvn y vitest) en verde y revisión de Seguridad si toca pagos, permisos o datos personales.
  5. Dado que el PR está aprobado, cuando se quiere subir a producción, entonces solo se despliega con la aprobación manual de HOT_CLICK, con pg_dump y etiqueta de vuelta atrás hechos antes.
  6. Checklist: ningún secreto, llave ni dato personal queda en el código o en los logs, y ningún monto queda escrito en el código (sale del plan o de la configuración).
  7. Dado el cambio en staging, cuando QA lo prueba desde el navegador a 390 y 1440 px, entonces no hay errores 500 ni textos «[PENDIENTE]» en las pantallas tocadas.

#### S4-21 · Comisión al cambiar de plan
- **Historia:** Como dueño de HotClick quiero que la comisión en ONVO se actualice cuando un negocio cambia de plan para cobrar el % correcto.
- **Responsable:** Desarrollador
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** S3-09 (Comisión % por negocio editable desde el admin); S4-11 (Planes pagos que se activan solo con el pago confirmado)
- **Criterios de aceptación:**
  1. Checklist: listener after-commit con reintento.
  2. Checklist: respeta un % editado por el admin (avisa la diferencia, no lo pisa sin confirmar).
  3. Checklist: auditoría.
  4. Checklist: el cambio va en su propia rama y PR, con pruebas automáticas (mvn y vitest) en verde y revisión de Seguridad si toca pagos, permisos o datos personales.
  5. Dado que el PR está aprobado, cuando se quiere subir a producción, entonces solo se despliega con la aprobación manual de HOT_CLICK, con pg_dump y etiqueta de vuelta atrás hechos antes.
  6. Checklist: ningún secreto, llave ni dato personal queda en el código o en los logs, y ningún monto queda escrito en el código (sale del plan o de la configuración).
  7. Dado el cambio en staging, cuando QA lo prueba desde el navegador a 390 y 1440 px, entonces no hay errores 500 ni textos «[PENDIENTE]» en las pantallas tocadas.

### Sprint 4 · Diseño / UX (Figma)

#### S4-22 · Pantalla de pago pendiente SINPE
- **Historia:** Como comprador SINPE quiero la pantalla de «Pago pendiente» con mi pedido reservado para quedarme tranquilo.
- **Responsable:** Diseño / UX (Figma)
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: «Te avisamos por correo».
  2. Checklist: plazo de espera visible.
  3. Checklist: 390 y 1440.
  4. Checklist: el diseño está en Figma con marcos a 390 y 1440 px y notas de entrega para el Desarrollador.
  5. Checklist: contraste AA, foco visible y una sola llamada a la acción roja por pantalla.
  6. Checklist: los textos no inventan montos; donde falta uno dice «monto a definir por HOT_CLICK».
  7. Dado el boceto terminado, cuando lo revisan Producto y HOT_CLICK, entonces queda aprobado por escrito o con la lista de cambios anotada.

#### S4-23 · Panel de ventas y diferencia semanal
- **Historia:** Como vendedor quiero el diseño del panel de ventas con bruto, comisión, neto y la diferencia del mínimo para leer mis números rápido.
- **Responsable:** Diseño / UX (Figma)
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: móvil primero.
  2. Checklist: total de la semana visible.
  3. Checklist: explicación corta del mínimo de ₡700.
  4. Checklist: el diseño está en Figma con marcos a 390 y 1440 px y notas de entrega para el Desarrollador.
  5. Checklist: contraste AA, foco visible y una sola llamada a la acción roja por pantalla.
  6. Checklist: los textos no inventan montos; donde falta uno dice «monto a definir por HOT_CLICK».
  7. Dado el boceto terminado, cuando lo revisan Producto y HOT_CLICK, entonces queda aprobado por escrito o con la lista de cambios anotada.

#### S4-24 · Próxima mensualidad y estado del plan
- **Historia:** Como vendedor Pyme o Negocio Plus quiero ver mi próxima mensualidad y su fecha para evitar sorpresas.
- **Responsable:** Diseño / UX (Figma)
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: ₡12.900 o ₡28.900 según plan.
  2. Checklist: estado Activo, Pendiente de pago o En gracia.
  3. Checklist: botón «Completar pago».
  4. Checklist: el diseño está en Figma con marcos a 390 y 1440 px y notas de entrega para el Desarrollador.
  5. Checklist: contraste AA, foco visible y una sola llamada a la acción roja por pantalla.
  6. Checklist: los textos no inventan montos; donde falta uno dice «monto a definir por HOT_CLICK».
  7. Dado el boceto terminado, cuando lo revisan Producto y HOT_CLICK, entonces queda aprobado por escrito o con la lista de cambios anotada.

#### S4-25 · Selector de envío
- **Historia:** Como comprador quiero el diseño del selector de envío con costo y tiempos para elegir rápido.
- **Responsable:** Diseño / UX (Figma)
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: costo por opción.
  2. Checklist: contra entrega claramente marcada.
  3. Checklist: total actualizado al instante.
  4. Checklist: el diseño está en Figma con marcos a 390 y 1440 px y notas de entrega para el Desarrollador.
  5. Checklist: contraste AA, foco visible y una sola llamada a la acción roja por pantalla.
  6. Checklist: los textos no inventan montos; donde falta uno dice «monto a definir por HOT_CLICK».
  7. Dado el boceto terminado, cuando lo revisan Producto y HOT_CLICK, entonces queda aprobado por escrito o con la lista de cambios anotada.

#### S4-26 · POS con cobro en un clic
- **Historia:** Como cajero quiero el diseño del cobro en efectivo con monto exacto y el ticket en el historial para atender rápido.
- **Responsable:** Diseño / UX (Figma)
- **Prioridad:** P2 · **Puntos:** 2
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: botón «Monto exacto».
  2. Checklist: después de cobrar se ve el ticket en el historial.
  3. Checklist: aviso si el negocio no está aprobado (según decisión).
  4. Checklist: el diseño está en Figma con marcos a 390 y 1440 px y notas de entrega para el Desarrollador.
  5. Checklist: contraste AA, foco visible y una sola llamada a la acción roja por pantalla.
  6. Checklist: los textos no inventan montos; donde falta uno dice «monto a definir por HOT_CLICK».
  7. Dado el boceto terminado, cuando lo revisan Producto y HOT_CLICK, entonces queda aprobado por escrito o con la lista de cambios anotada.

### Sprint 4 · QA (calidad)

#### S4-27 · Casos SINPE S1 a S6
- **Historia:** Como equipo quiero probar SINPE con éxito, retraso, fallo y pago parcial para validar SINPE Móvil.
- **Responsable:** QA (calidad)
- **Prioridad:** P1 · **Puntos:** 3
- **Dependencias:** S4-06 (Pagar con SINPE Móvil en el Checkout de ONVO)
- **Criterios de aceptación:**
  1. Checklist: usa los números SINPE de prueba con retraso de 6 minutos.
  2. Checklist: evidencia por caso.
  3. Checklist: el stock se libera en el plazo decidido.
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/calidad/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

#### S4-28 · Casos de split M1 a M6
- **Historia:** Como equipo quiero verificar desde la web comisión y neto por plan para confirmar el split.
- **Responsable:** QA (calidad)
- **Prioridad:** P1 · **Puntos:** 3
- **Dependencias:** S4-15 (Panel de ventas con bruto, comisión y neto); S4-09 (Mínimo de ₡700 por diferencia semanal)
- **Criterios de aceptación:**
  1. Checklist: Emprendedor 9 %, Pyme y Negocio Plus 7 %.
  2. Checklist: venta bajo el mínimo muestra la diferencia.
  3. Checklist: sin tomar el ejemplo de la doc como tarifa real.
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/calidad/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

#### S4-29 · Activación de plan pago en sandbox
- **Historia:** Como equipo quiero probar desde la web que el plan se activa solo con pago confirmado para evitar planes gratis.
- **Responsable:** QA (calidad)
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** S4-11 (Planes pagos que se activan solo con el pago confirmado)
- **Criterios de aceptación:**
  1. Checklist: pago fallido deja Emprendedor.
  2. Checklist: pago exitoso activa el plan y cambia el %.
  3. Checklist: el resumen muestra la próxima mensualidad.
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/calidad/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

#### S4-30 · Opciones de envío
- **Historia:** Como equipo quiero probar todas las opciones de envío vigentes para que el total sea correcto.
- **Responsable:** QA (calidad)
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** S4-18 (Opciones de envío en el checkout)
- **Criterios de aceptación:**
  1. Checklist: cada opción con su costo.
  2. Checklist: contra entrega solo donde aplica.
  3. Checklist: mismo costo en tienda y marketplace.
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/calidad/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

#### S4-31 · POS con las reglas decididas
- **Historia:** Como equipo quiero probar el POS con negocio aprobado y sin aprobar para confirmar la regla.
- **Responsable:** QA (calidad)
- **Prioridad:** P2 · **Puntos:** 1
- **Dependencias:** S1-04 (Decidir si un negocio sin aprobar cobra en efectivo en el POS (NP-13a))
- **Criterios de aceptación:**
  1. Checklist: comportamiento según decisión.
  2. Checklist: QR según decisión.
  3. Checklist: historial correcto.
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/calidad/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

### Sprint 4 · QA Compradores

#### S4-32 · Comprar con SINPE Móvil en staging
- **Historia:** Como comprador quiero comprar con SINPE Móvil de prueba para validar el método más usado en Costa Rica.
- **Responsable:** QA Compradores
- **Prioridad:** P0 · **Puntos:** 3
- **Dependencias:** S4-06 (Pagar con SINPE Móvil en el Checkout de ONVO)
- **Criterios de aceptación:**
  1. Checklist: pedido pendiente y luego pagado.
  2. Checklist: correo de confirmación.
  3. Checklist: el detalle dice el método correcto.
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/compradores/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

#### S4-33 · SINPE que no llega
- **Historia:** Como comprador quiero ver qué pasa si mi SINPE no llega para saber si pierdo el pedido.
- **Responsable:** QA Compradores
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** S4-06 (Pagar con SINPE Móvil en el Checkout de ONVO)
- **Criterios de aceptación:**
  1. Checklist: aviso de cancelación al vencer el plazo.
  2. Checklist: stock liberado.
  3. Checklist: puedo volver a comprar.
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/compradores/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

#### S4-34 · Pagar en la tienda propia
- **Historia:** Como comprador quiero pagar en línea desde /tienda/<slug> para comprar directo a la tienda.
- **Responsable:** QA Compradores
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: tarjeta y SINPE Móvil disponibles si la tienda está activa.
  2. Checklist: pedido pagado visible.
  3. Checklist: tienda pausada sin pago en línea.
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/compradores/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

#### S4-35 · Elegir envío y ver el total
- **Historia:** Como comprador quiero elegir el tipo de envío y ver el total final para no tener sorpresas.
- **Responsable:** QA Compradores
- **Prioridad:** P1 · **Puntos:** 1
- **Dependencias:** S4-18 (Opciones de envío en el checkout)
- **Criterios de aceptación:**
  1. Checklist: el total cambia con la opción.
  2. Checklist: envío normal GAM ₡4.000.
  3. Checklist: contra entrega visible donde aplica.
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/compradores/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

#### S4-36 · Iniciar sesión desde el checkout
- **Historia:** Como comprador quiero iniciar sesión cuando mi correo ya tiene cuenta para ver mi pedido en mis pedidos.
- **Responsable:** QA Compradores
- **Prioridad:** P2 · **Puntos:** 1
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: la oferta aparece.
  2. Checklist: puedo seguir como invitado.
  3. Checklist: el pedido queda en mi cuenta si inicié sesión.
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/compradores/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

### Sprint 4 · QA Negocios

#### S4-37 · Pagar y activar mi plan Pyme
- **Historia:** Como vendedor Pyme quiero pagar el plan Pyme en sandbox y ver que se activa para usar las funciones Pyme.
- **Responsable:** QA Negocios
- **Prioridad:** P0 · **Puntos:** 2
- **Dependencias:** S4-11 (Planes pagos que se activan solo con el pago confirmado)
- **Criterios de aceptación:**
  1. Checklist: plan activo solo tras pago.
  2. Checklist: 2 bodegas, CRM y desarrollo visibles.
  3. Checklist: % 7 % en el resumen.
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/negocios/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

#### S4-38 · Funciones Negocio Plus tras el pago
- **Historia:** Como vendedor Negocio Plus quiero comprobar equipo, sucursales, cupones y demás funciones de Negocio Plus para recibir lo que pago.
- **Responsable:** QA Negocios
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** S4-11 (Planes pagos que se activan solo con el pago confirmado)
- **Criterios de aceptación:**
  1. Checklist: cada función visible y usable.
  2. Checklist: plan en ₡28.900/mes + 7 %.
  3. Checklist: el personal con rol LECTOR no tiene permisos de dueño.
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/negocios/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

#### S4-39 · Panel de ventas y diferencia semanal
- **Historia:** Como vendedor quiero revisar mi panel de ventas y la diferencia del mínimo para entender mis cobros.
- **Responsable:** QA Negocios
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** S4-15 (Panel de ventas con bruto, comisión y neto)
- **Criterios de aceptación:**
  1. Checklist: bruto, comisión y neto por venta.
  2. Checklist: diferencia semanal visible.
  3. Checklist: frecuencia y US$3 visibles.
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/negocios/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

#### S4-40 · POS en efectivo y QR
- **Historia:** Como cajero quiero cobrar en efectivo y por QR según la decisión para vender en el local.
- **Responsable:** QA Negocios
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** S4-02 (Decidir el POS QR con SINPE)
- **Criterios de aceptación:**
  1. Checklist: efectivo con monto exacto.
  2. Checklist: QR según decisión.
  3. Checklist: historial muestra las dos ventas.
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/negocios/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

#### S4-41 · Números de pedido propios
- **Historia:** Como vendedor quiero ver que mis pedidos arrancan en mi propia numeración para no exponer volumen.
- **Responsable:** QA Negocios
- **Prioridad:** P2 · **Puntos:** 1
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: número por tienda.
  2. Checklist: búsqueda por número funciona.
  3. Checklist: capturas.
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/negocios/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

### Sprint 4 · QA Automatización y Regresión

#### S4-42 · Guion web de SINPE Móvil
- **Historia:** Como equipo quiero un guion de compra por SINPE con espera controlada para tener SINPE en la regresión.
- **Responsable:** QA Automatización y Regresión
- **Prioridad:** P1 · **Puntos:** 3
- **Dependencias:** S4-06 (Pagar con SINPE Móvil en el Checkout de ONVO)
- **Criterios de aceptación:**
  1. Checklist: corre de noche en staging.
  2. Checklist: verifica pendiente y pagado en pantalla.
  3. Checklist: tolera el retraso de los números de prueba.
  4. Checklist: el guion solo maneja el navegador (clics, formularios y lectura de pantalla); no llama a la API, no toca la base de datos ni el servidor y no modifica el código del repo.
  5. Checklist: el guion vive en /workspace/qa/regresion/ y corre a 390 y 1440 px, con captura de cada paso que falle.
  6. Dado tres corridas seguidas sin cambios en el sitio, cuando se comparan, entonces dan el mismo resultado (menos de 1 prueba inestable por corrida).
  7. Checklist: el resultado (verde o rojo, con la lista de fallos) queda en un informe fechado y los fallos se reportan al Desarrollador.

#### S4-43 · Guion web de plan pago
- **Historia:** Como equipo quiero un guion que active un plan pago en sandbox para proteger la regla de activación.
- **Responsable:** QA Automatización y Regresión
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** S4-11 (Planes pagos que se activan solo con el pago confirmado)
- **Criterios de aceptación:**
  1. Checklist: caso fallo y caso éxito.
  2. Checklist: verifica el plan en Tu Plan.
  3. Checklist: staging.
  4. Checklist: el guion solo maneja el navegador (clics, formularios y lectura de pantalla); no llama a la API, no toca la base de datos ni el servidor y no modifica el código del repo.
  5. Checklist: el guion vive en /workspace/qa/regresion/ y corre a 390 y 1440 px, con captura de cada paso que falle.
  6. Dado tres corridas seguidas sin cambios en el sitio, cuando se comparan, entonces dan el mismo resultado (menos de 1 prueba inestable por corrida).
  7. Checklist: el resultado (verde o rojo, con la lista de fallos) queda en un informe fechado y los fallos se reportan al Desarrollador.

#### S4-44 · Guion web de envíos
- **Historia:** Como equipo quiero un guion que revise el total con cada opción de envío para no volver a cobrar ₡0 de envío por error.
- **Responsable:** QA Automatización y Regresión
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** S4-18 (Opciones de envío en el checkout)
- **Criterios de aceptación:**
  1. Checklist: tienda y marketplace.
  2. Checklist: contra entrega.
  3. Checklist: staging y producción (sin pagar).
  4. Checklist: el guion solo maneja el navegador (clics, formularios y lectura de pantalla); no llama a la API, no toca la base de datos ni el servidor y no modifica el código del repo.
  5. Checklist: el guion vive en /workspace/qa/regresion/ y corre a 390 y 1440 px, con captura de cada paso que falle.
  6. Dado tres corridas seguidas sin cambios en el sitio, cuando se comparan, entonces dan el mismo resultado (menos de 1 prueba inestable por corrida).
  7. Checklist: el resultado (verde o rojo, con la lista de fallos) queda en un informe fechado y los fallos se reportan al Desarrollador.

#### S4-45 · Guion web del panel de ventas
- **Historia:** Como equipo quiero un guion que lea el panel de ventas y compare con las compras de prueba para detectar descuadres.
- **Responsable:** QA Automatización y Regresión
- **Prioridad:** P2 · **Puntos:** 1
- **Dependencias:** S4-15 (Panel de ventas con bruto, comisión y neto)
- **Criterios de aceptación:**
  1. Checklist: compara montos en pantalla.
  2. Checklist: reporta diferencias.
  3. Checklist: staging.
  4. Checklist: el guion solo maneja el navegador (clics, formularios y lectura de pantalla); no llama a la API, no toca la base de datos ni el servidor y no modifica el código del repo.
  5. Checklist: el guion vive en /workspace/qa/regresion/ y corre a 390 y 1440 px, con captura de cada paso que falle.
  6. Dado tres corridas seguidas sin cambios en el sitio, cuando se comparan, entonces dan el mismo resultado (menos de 1 prueba inestable por corrida).
  7. Checklist: el resultado (verde o rojo, con la lista de fallos) queda en un informe fechado y los fallos se reportan al Desarrollador.

#### S4-46 · Corrida nocturna con los flujos nuevos
- **Historia:** Como equipo quiero sumar SINPE, plan pago y envíos a la corrida nocturna para cubrir lo nuevo.
- **Responsable:** QA Automatización y Regresión
- **Prioridad:** P1 · **Puntos:** 1
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: matriz actualizada.
  2. Checklist: resultado diario a Grok Bot.
  3. Checklist: inestables reportadas.
  4. Checklist: el guion solo maneja el navegador (clics, formularios y lectura de pantalla); no llama a la API, no toca la base de datos ni el servidor y no modifica el código del repo.
  5. Checklist: el guion vive en /workspace/qa/regresion/ y corre a 390 y 1440 px, con captura de cada paso que falle.
  6. Dado tres corridas seguidas sin cambios en el sitio, cuando se comparan, entonces dan el mismo resultado (menos de 1 prueba inestable por corrida).
  7. Checklist: el resultado (verde o rojo, con la lista de fallos) queda en un informe fechado y los fallos se reportan al Desarrollador.

### Sprint 4 · Seguridad

#### S4-47 · Manejo de la cédula del pagador
- **Historia:** Como dueño de HotClick quiero revisar cómo se guarda y muestra la cédula del pagador para cumplir la ley de datos.
- **Responsable:** Seguridad
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** S4-06 (Pagar con SINPE Móvil en el Checkout de ONVO)
- **Criterios de aceptación:**
  1. Checklist: minimización y plazo de conservación.
  2. Checklist: no aparece en logs.
  3. Checklist: alineado con PRODHAB.
  4. Checklist: informe corto en /workspace/seguridad/ con cada hallazgo, su gravedad (crítico, alto, medio o bajo) y el arreglo propuesto.
  5. Dado el informe, cuando se cierra la historia, entonces no queda ningún hallazgo crítico ni alto abierto sin plan y sin dueño.
  6. Checklist: no se hacen ataques ni pruebas destructivas en producción; lo que se prueba en vivo se hace con cuentas QA-TEST y con OK de HOT_CLICK.
  7. Checklist: ninguna llave, secreto ni dato personal se copia al informe ni al chat.

#### S4-48 · Cada vendedor ve solo sus ventas
- **Historia:** Como dueño de HotClick quiero confirmar que el panel de ventas aísla datos entre tiendas para proteger a los negocios.
- **Responsable:** Seguridad
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** S4-15 (Panel de ventas con bruto, comisión y neto)
- **Criterios de aceptación:**
  1. Checklist: pruebas de tenant.
  2. Checklist: export y panel revisados.
  3. Checklist: sin datos del comprador de más.
  4. Checklist: informe corto en /workspace/seguridad/ con cada hallazgo, su gravedad (crítico, alto, medio o bajo) y el arreglo propuesto.
  5. Dado el informe, cuando se cierra la historia, entonces no queda ningún hallazgo crítico ni alto abierto sin plan y sin dueño.
  6. Checklist: no se hacen ataques ni pruebas destructivas en producción; lo que se prueba en vivo se hace con cuentas QA-TEST y con OK de HOT_CLICK.
  7. Checklist: ninguna llave, secreto ni dato personal se copia al informe ni al chat.

#### S4-49 · Activación de planes sin atajos
- **Historia:** Como dueño de HotClick quiero revisar que ningún camino active un plan pago sin pago confirmado para evitar planes gratis.
- **Responsable:** Seguridad
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** S4-11 (Planes pagos que se activan solo con el pago confirmado)
- **Criterios de aceptación:**
  1. Checklist: revisión del puerto PlanPagoConfirmado.
  2. Checklist: el código viejo que simulaba con secreto vacío no queda activo.
  3. Checklist: prueba con webhook falso en staging.
  4. Checklist: informe corto en /workspace/seguridad/ con cada hallazgo, su gravedad (crítico, alto, medio o bajo) y el arreglo propuesto.
  5. Dado el informe, cuando se cierra la historia, entonces no queda ningún hallazgo crítico ni alto abierto sin plan y sin dueño.
  6. Checklist: no se hacen ataques ni pruebas destructivas en producción; lo que se prueba en vivo se hace con cuentas QA-TEST y con OK de HOT_CLICK.
  7. Checklist: ninguna llave, secreto ni dato personal se copia al informe ni al chat.

#### S4-50 · Revisión de la tarifa semanal
- **Historia:** Como dueño de HotClick quiero revisar que el cálculo y la actualización de la tarifa semanal no se puedan manipular para cobrar lo correcto.
- **Responsable:** Seguridad
- **Prioridad:** P1 · **Puntos:** 1
- **Dependencias:** S4-09 (Mínimo de ₡700 por diferencia semanal)
- **Criterios de aceptación:**
  1. Checklist: solo el sistema o un admin la cambian.
  2. Checklist: auditoría de cada actualización.
  3. Checklist: límites razonables.
  4. Checklist: informe corto en /workspace/seguridad/ con cada hallazgo, su gravedad (crítico, alto, medio o bajo) y el arreglo propuesto.
  5. Dado el informe, cuando se cierra la historia, entonces no queda ningún hallazgo crítico ni alto abierto sin plan y sin dueño.
  6. Checklist: no se hacen ataques ni pruebas destructivas en producción; lo que se prueba en vivo se hace con cuentas QA-TEST y con OK de HOT_CLICK.
  7. Checklist: ninguna llave, secreto ni dato personal se copia al informe ni al chat.

#### S4-51 · Correo registrado sin enumeración en el checkout
- **Historia:** Como dueño de HotClick quiero revisar que la oferta de iniciar sesión no revele cuentas para proteger a los usuarios.
- **Responsable:** Seguridad
- **Prioridad:** P2 · **Puntos:** 1
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: mensaje neutro.
  2. Checklist: mismo tiempo de respuesta.
  3. Checklist: resultado en el informe.
  4. Checklist: informe corto en /workspace/seguridad/ con cada hallazgo, su gravedad (crítico, alto, medio o bajo) y el arreglo propuesto.
  5. Dado el informe, cuando se cierra la historia, entonces no queda ningún hallazgo crítico ni alto abierto sin plan y sin dueño.
  6. Checklist: no se hacen ataques ni pruebas destructivas en producción; lo que se prueba en vivo se hace con cuentas QA-TEST y con OK de HOT_CLICK.
  7. Checklist: ninguna llave, secreto ni dato personal se copia al informe ni al chat.

### Sprint 4 · DevOps y Seguridad

#### S4-52 · Job semanal de la tarifa con alertas
- **Historia:** Como equipo quiero programar el job semanal de la diferencia antes del corte de ONVO con alertas para no perder el cobro de la semana.
- **Responsable:** DevOps y Seguridad
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** S4-09 (Mínimo de ₡700 por diferencia semanal)
- **Criterios de aceptación:**
  1. Checklist: corre antes del corte (viernes 02:00 CR según la doc de ONVO, a confirmar).
  2. Checklist: alerta si falla.
  3. Checklist: reintento manual documentado.
  4. Checklist: el cambio queda documentado en un runbook en /workspace/infra/ con los pasos para hacerlo y para deshacerlo.
  5. Dado cualquier paso que toque producción, cuando está listo, entonces espera la aprobación manual de HOT_CLICK antes de ejecutarse.
  6. Checklist: los secretos se guardan en los secretos del servidor o de GitHub, nunca en el repo, en el chat ni en los logs.
  7. Dado el cambio aplicado, cuando se revisa el monitoreo, entonces el sitio responde y /api/health está en verde.

#### S4-53 · Job de polling de liquidaciones
- **Historia:** Como equipo quiero programar el polling diario de liquidaciones para conciliar todos los días.
- **Responsable:** DevOps y Seguridad
- **Prioridad:** P1 · **Puntos:** 1
- **Dependencias:** S4-13 (Polling de liquidaciones)
- **Criterios de aceptación:**
  1. Checklist: ShedLock.
  2. Checklist: alerta si no corre.
  3. Checklist: tiempo de ejecución medido.
  4. Checklist: el cambio queda documentado en un runbook en /workspace/infra/ con los pasos para hacerlo y para deshacerlo.
  5. Dado cualquier paso que toque producción, cuando está listo, entonces espera la aprobación manual de HOT_CLICK antes de ejecutarse.
  6. Checklist: los secretos se guardan en los secretos del servidor o de GitHub, nunca en el repo, en el chat ni en los logs.
  7. Dado el cambio aplicado, cuando se revisa el monitoreo, entonces el sitio responde y /api/health está en verde.

#### S4-54 · Monitoreo de pagos fallidos en staging
- **Historia:** Como equipo quiero un tablero simple de pagos fallidos y webhooks con error para reaccionar rápido.
- **Responsable:** DevOps y Seguridad
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: conteo por hora.
  2. Checklist: alerta a Grok Bot.
  3. Checklist: sin datos personales en el tablero.
  4. Checklist: el cambio queda documentado en un runbook en /workspace/infra/ con los pasos para hacerlo y para deshacerlo.
  5. Dado cualquier paso que toque producción, cuando está listo, entonces espera la aprobación manual de HOT_CLICK antes de ejecutarse.
  6. Checklist: los secretos se guardan en los secretos del servidor o de GitHub, nunca en el repo, en el chat ni en los logs.
  7. Dado el cambio aplicado, cuando se revisa el monitoreo, entonces el sitio responde y /api/health está en verde.

#### S4-55 · Ensayo de vuelta atrás con migraciones ONVO
- **Historia:** Como dueño de HotClick quiero ensayar en staging la vuelta atrás con las migraciones nuevas para volver atrás también la base.
- **Responsable:** DevOps y Seguridad
- **Prioridad:** P1 · **Puntos:** 1
- **Dependencias:** S2-64 (Vuelta atrás por etiqueta ensayada)
- **Criterios de aceptación:**
  1. Checklist: tiempo medido.
  2. Checklist: datos intactos.
  3. Checklist: runbook actualizado.
  4. Checklist: el cambio queda documentado en un runbook en /workspace/infra/ con los pasos para hacerlo y para deshacerlo.
  5. Dado cualquier paso que toque producción, cuando está listo, entonces espera la aprobación manual de HOT_CLICK antes de ejecutarse.
  6. Checklist: los secretos se guardan en los secretos del servidor o de GitHub, nunca en el repo, en el chat ni en los logs.
  7. Dado el cambio aplicado, cuando se revisa el monitoreo, entonces el sitio responde y /api/health está en verde.

#### S4-56 · Pasar las alertas de staging a producción (preparado)
- **Historia:** Como equipo quiero dejar listas las alertas de pagos para producción, apagadas para encenderlas el día de la salida.
- **Responsable:** DevOps y Seguridad
- **Prioridad:** P2 · **Puntos:** 1
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: configuración lista.
  2. Checklist: apagadas hasta el OK.
  3. Checklist: documentado.
  4. Checklist: el cambio queda documentado en un runbook en /workspace/infra/ con los pasos para hacerlo y para deshacerlo.
  5. Dado cualquier paso que toque producción, cuando está listo, entonces espera la aprobación manual de HOT_CLICK antes de ejecutarse.
  6. Checklist: los secretos se guardan en los secretos del servidor o de GitHub, nunca en el repo, en el chat ni en los logs.
  7. Dado el cambio aplicado, cuando se revisa el monitoreo, entonces el sitio responde y /api/health está en verde.

### Sprint 4 · Producto Contenido y Soporte

#### S4-57 · Textos de SINPE Móvil
- **Historia:** Como comprador quiero textos de SINPE con cédula, monto exacto y espera para no equivocarme al transferir.
- **Responsable:** Producto Contenido y Soporte
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: revisados con la doc de ONVO.
  2. Checklist: plazo de espera de HOT_CLICK.
  3. Checklist: sin jerga.
  4. Checklist: el texto está en español de Costa Rica, con voseo, claro y sin jerga técnica.
  5. Checklist: no inventa montos; usa solo los decididos por HOT_CLICK o dice «monto a definir por HOT_CLICK».
  6. Dado el texto final, cuando HOT_CLICK lo revisa, entonces se publica solo con su aprobación escrita.
  7. Checklist: no promete WhatsApp API, no usa Meta Pixel y no presenta a Tilopay como pasarela vigente una vez que ONVO esté en uso.

#### S4-58 · Guía «Cómo leer mis ventas y comisiones»
- **Historia:** Como vendedor quiero una guía del panel de ventas para confiar en los números.
- **Responsable:** Producto Contenido y Soporte
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: usa 9 %, 7 % y ₡700 sin otras cifras.
  2. Checklist: explica la diferencia semanal.
  3. Checklist: explica los US$3 por liquidación.
  4. Checklist: el texto está en español de Costa Rica, con voseo, claro y sin jerga técnica.
  5. Checklist: no inventa montos; usa solo los decididos por HOT_CLICK o dice «monto a definir por HOT_CLICK».
  6. Dado el texto final, cuando HOT_CLICK lo revisa, entonces se publica solo con su aprobación escrita.
  7. Checklist: no promete WhatsApp API, no usa Meta Pixel y no presenta a Tilopay como pasarela vigente una vez que ONVO esté en uso.

#### S4-59 · Textos de mensualidad y gracia
- **Historia:** Como vendedor Pyme o Negocio Plus quiero textos de cobro, renovación y gracia del plan para saber qué pasa si no pago.
- **Responsable:** Producto Contenido y Soporte
- **Prioridad:** P1 · **Puntos:** 1
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: ₡12.900 y ₡28.900.
  2. Checklist: 7 días de gracia.
  3. Checklist: qué funciones se pierden.
  4. Checklist: el texto está en español de Costa Rica, con voseo, claro y sin jerga técnica.
  5. Checklist: no inventa montos; usa solo los decididos por HOT_CLICK o dice «monto a definir por HOT_CLICK».
  6. Dado el texto final, cuando HOT_CLICK lo revisa, entonces se publica solo con su aprobación escrita.
  7. Checklist: no promete WhatsApp API, no usa Meta Pixel y no presenta a Tilopay como pasarela vigente una vez que ONVO esté en uso.

#### S4-60 · Textos de envío y contra entrega
- **Historia:** Como comprador quiero textos claros de cada opción de envío para elegir bien.
- **Responsable:** Producto Contenido y Soporte
- **Prioridad:** P1 · **Puntos:** 1
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: costos según HOT_CLICK.
  2. Checklist: contra entrega explicada.
  3. Checklist: alineado con la página de envíos.
  4. Checklist: el texto está en español de Costa Rica, con voseo, claro y sin jerga técnica.
  5. Checklist: no inventa montos; usa solo los decididos por HOT_CLICK o dice «monto a definir por HOT_CLICK».
  6. Dado el texto final, cuando HOT_CLICK lo revisa, entonces se publica solo con su aprobación escrita.
  7. Checklist: no promete WhatsApp API, no usa Meta Pixel y no presenta a Tilopay como pasarela vigente una vez que ONVO esté en uso.

#### S4-61 · Guion de soporte de SINPE y mínimo
- **Historia:** Como soporte quiero respuestas para SINPE pendiente y diferencia del mínimo para responder igual siempre.
- **Responsable:** Producto Contenido y Soporte
- **Prioridad:** P2 · **Puntos:** 1
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: SINPE con cédula distinta: escalar.
  2. Checklist: explica la diferencia semanal.
  3. Checklist: cuándo escalar a Finanzas.
  4. Checklist: el texto está en español de Costa Rica, con voseo, claro y sin jerga técnica.
  5. Checklist: no inventa montos; usa solo los decididos por HOT_CLICK o dice «monto a definir por HOT_CLICK».
  6. Dado el texto final, cuando HOT_CLICK lo revisa, entonces se publica solo con su aprobación escrita.
  7. Checklist: no promete WhatsApp API, no usa Meta Pixel y no presenta a Tilopay como pasarela vigente una vez que ONVO esté en uso.

### Sprint 4 · Finanzas

#### S4-62 · Validar el cálculo semanal del mínimo
- **Historia:** Como dueño de HotClick quiero validar con casos la diferencia semanal hasta ₡700 para cobrar exacto.
- **Responsable:** Finanzas
- **Prioridad:** P0 · **Puntos:** 3
- **Dependencias:** S4-09 (Mínimo de ₡700 por diferencia semanal); S1-78 (Escenarios del mínimo de ₡700)
- **Criterios de aceptación:**
  1. Checklist: 10 ventas de prueba con distintos montos y planes.
  2. Checklist: suma semanal igual a la tarifa enviada a ONVO.
  3. Checklist: plan B reportado si aplica.
  4. Checklist: usa solo montos dados por HOT_CLICK o publicados en las fuentes; cualquier otro dice «monto a definir por HOT_CLICK».
  5. Checklist: la planilla o el informe queda en /workspace/finanzas/ con fecha y la fuente de cada cifra.
  6. Dado una muestra de casos, cuando se recalculan a mano, entonces el resultado cuadra o la diferencia queda explicada.
  7. Dado el resultado, cuando se le entrega a HOT_CLICK por medio de Grok Bot, entonces queda anotada su respuesta o decisión.

#### S4-63 · Panel de ventas contra ONVO
- **Historia:** Como dueño de HotClick quiero validar el panel de ventas contra los datos de ONVO para que el vendedor vea cifras correctas.
- **Responsable:** Finanzas
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** S4-15 (Panel de ventas con bruto, comisión y neto)
- **Criterios de aceptación:**
  1. Checklist: muestra de 10 ventas de prueba cuadra.
  2. Checklist: diferencias explicadas.
  3. Checklist: informe.
  4. Checklist: usa solo montos dados por HOT_CLICK o publicados en las fuentes; cualquier otro dice «monto a definir por HOT_CLICK».
  5. Checklist: la planilla o el informe queda en /workspace/finanzas/ con fecha y la fuente de cada cifra.
  6. Dado una muestra de casos, cuando se recalculan a mano, entonces el resultado cuadra o la diferencia queda explicada.
  7. Dado el resultado, cuando se le entrega a HOT_CLICK por medio de Grok Bot, entonces queda anotada su respuesta o decisión.

#### S4-64 · Margen con tarifas confirmadas
- **Historia:** Como dueño de HotClick quiero recalcular el margen por plan con las tarifas que ONVO confirme para saber la rentabilidad.
- **Responsable:** Finanzas
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: solo tarifas confirmadas; lo demás «a confirmar».
  2. Checklist: incluye quién paga la tarifa de ONVO.
  3. Checklist: escenarios con y sin mínimo.
  4. Checklist: usa solo montos dados por HOT_CLICK o publicados en las fuentes; cualquier otro dice «monto a definir por HOT_CLICK».
  5. Checklist: la planilla o el informe queda en /workspace/finanzas/ con fecha y la fuente de cada cifra.
  6. Dado una muestra de casos, cuando se recalculan a mano, entonces el resultado cuadra o la diferencia queda explicada.
  7. Dado el resultado, cuando se le entrega a HOT_CLICK por medio de Grok Bot, entonces queda anotada su respuesta o decisión.

#### S4-65 · Mensualidades cobradas en sandbox
- **Historia:** Como dueño de HotClick quiero verificar que los cobros de mensualidad de prueba sean ₡12.900 y ₡28.900 para evitar cobros erróneos.
- **Responsable:** Finanzas
- **Prioridad:** P1 · **Puntos:** 1
- **Dependencias:** S4-11 (Planes pagos que se activan solo con el pago confirmado)
- **Criterios de aceptación:**
  1. Checklist: montos correctos.
  2. Checklist: fecha según la opción decidida.
  3. Checklist: sin cobros dobles.
  4. Checklist: usa solo montos dados por HOT_CLICK o publicados en las fuentes; cualquier otro dice «monto a definir por HOT_CLICK».
  5. Checklist: la planilla o el informe queda en /workspace/finanzas/ con fecha y la fuente de cada cifra.
  6. Dado una muestra de casos, cuando se recalculan a mano, entonces el resultado cuadra o la diferencia queda explicada.
  7. Dado el resultado, cuando se le entrega a HOT_CLICK por medio de Grok Bot, entonces queda anotada su respuesta o decisión.

### Sprint 4 · Consultor

#### S4-66 · Revisión del cálculo del mínimo
- **Historia:** Como equipo quiero revisar el código del mínimo semanal para evitar errores de redondeo y de carrera.
- **Responsable:** Consultor
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** S4-09 (Mínimo de ₡700 por diferencia semanal)
- **Criterios de aceptación:**
  1. Checklist: montos en céntimos.
  2. Checklist: idempotencia del job.
  3. Checklist: casos borde (semana sin ventas, negocio pausado).
  4. Checklist: el informe queda en /workspace/consultor/ y cita archivo y línea de cada afirmación sobre el código.
  5. Checklist: trabajo solo de lectura: no cambia código, no hace push, no despliega y no le escribe a nadie.
  6. Dado cada hallazgo, cuando se entrega, entonces trae prioridad (P0, P1 o P2), dueño sugerido y si necesita una decisión de HOT_CLICK.
  7. Dado el informe, cuando lo lee el Desarrollador, entonces puede convertir cada recomendación en una historia sin tener que preguntar más.

#### S4-67 · Revisión de la activación de planes
- **Historia:** Como equipo quiero revisar el flujo de plan pago para que no se active sin pago.
- **Responsable:** Consultor
- **Prioridad:** P1 · **Puntos:** 1
- **Dependencias:** S4-11 (Planes pagos que se activan solo con el pago confirmado)
- **Criterios de aceptación:**
  1. Checklist: puerto PlanPagoConfirmado único.
  2. Checklist: sin rutas viejas.
  3. Checklist: pruebas suficientes.
  4. Checklist: el informe queda en /workspace/consultor/ y cita archivo y línea de cada afirmación sobre el código.
  5. Checklist: trabajo solo de lectura: no cambia código, no hace push, no despliega y no le escribe a nadie.
  6. Dado cada hallazgo, cuando se entrega, entonces trae prioridad (P0, P1 o P2), dueño sugerido y si necesita una decisión de HOT_CLICK.
  7. Dado el informe, cuando lo lee el Desarrollador, entonces puede convertir cada recomendación en una historia sin tener que preguntar más.

#### S4-68 · Revisión de envíos y POS
- **Historia:** Como dueño de HotClick quiero revisar que envíos y POS usen una sola fuente de verdad para no tener precios distintos.
- **Responsable:** Consultor
- **Prioridad:** P2 · **Puntos:** 1
- **Dependencias:** S4-18 (Opciones de envío en el checkout)
- **Criterios de aceptación:**
  1. Checklist: tabla de envíos única.
  2. Checklist: POS con el guardián de negocio.
  3. Checklist: recomendaciones.
  4. Checklist: el informe queda en /workspace/consultor/ y cita archivo y línea de cada afirmación sobre el código.
  5. Checklist: trabajo solo de lectura: no cambia código, no hace push, no despliega y no le escribe a nadie.
  6. Dado cada hallazgo, cuando se entrega, entonces trae prioridad (P0, P1 o P2), dueño sugerido y si necesita una decisión de HOT_CLICK.
  7. Dado el informe, cuando lo lee el Desarrollador, entonces puede convertir cada recomendación en una historia sin tener que preguntar más.

---

## Sprint 5: Reembolsos, conciliación, facturación electrónica manual y legales
- **Duración:** 1 semana (lunes 16-nov al viernes 20-nov-2026).
- **Objetivo:** Cerrar el ciclo del dinero y del cumplimiento: reembolsos totales y parciales con polling, registro de contracargos, conciliación de un mes simulado; página Admin → Facturación manual (solo HotClick factura, solo compras en la tienda, a su nombre, cero permisos para Emprendedor, Pyme y Negocio Plus, circuito de factura del negocio o acuerdo de porcentaje, interruptor automático apagado), validada con tu contador; y legales actualizados para ONVO.
- **Entregable de cierre:** Reembolsos R1–R4 en verde, mes simulado conciliado, facturación manual probada con archivos de prueba (sin emitir en Hacienda) y respuestas del contador archivadas.
- **Historias:** 67 · **Puntos:** 124

| Rol | Historias | Puntos |
|---|---:|---:|
| HOT_CLICK (dueño) | 7 | 9 |
| Desarrollador | 12 | 37 |
| Diseño / UX (Figma) | 5 | 9 |
| QA (calidad) | 5 | 10 |
| QA Compradores | 5 | 7 |
| QA Negocios | 5 | 6 |
| QA Automatización y Regresión | 5 | 9 |
| Seguridad | 5 | 8 |
| DevOps y Seguridad | 5 | 7 |
| Producto Contenido y Soporte | 6 | 11 |
| Finanzas | 4 | 7 |
| Consultor | 3 | 4 |

### Sprint 5 · HOT_CLICK (dueño)

#### S5-01 · Reunión con el contador y respuestas archivadas
- **Historia:** Como dueño de HotClick quiero reunirme con mi contador y traer las respuestas a las preguntas de A.5 para que no se emita ninguna factura real sin validación.
- **Responsable:** HOT_CLICK (dueño)
- **Prioridad:** P0 · **Puntos:** 2
- **Dependencias:** S2-79 (Preguntas para el contador, con IVA 13 % no-Tribu)
- **Criterios de aceptación:**
  1. Checklist: respuestas en /workspace/finanzas/facturacion-respuestas.md.
  2. Checklist: respondidos los puntos 1 a 5 de A.2 (actividad para la comisión, facturar ventas de otros, emisor no confirmante, factura del negocio, acuerdo del porcentaje).
  3. Checklist: si falta alguna respuesta, la emisión real queda bloqueada.
  4. Checklist: la decisión o entrega queda anotada con fecha y opción elegida en /workspace/informes/decisiones-hotclick.md.
  5. Dado que HOT_CLICK decide, cuando Grok Bot lo registra, entonces avisa al equipo qué historias quedan destrabadas.
  6. Checklist: credenciales y llaves se entregan solo por un canal seguro (solicitud de secreto), nunca por chat.
  7. Dado que la decisión no llega antes del cierre del sprint, cuando se hace la revisión, entonces las historias que dependen de ella pasan al sprint siguiente sin construirse a medias.

#### S5-02 · Confirmar con el contador «IVA 13 % no-Tribu»
- **Historia:** Como dueño de HotClick quiero confirmar con el contador si el IVA del 13 % se maneja por HotClick por fuera de TRIBU-CR estando en régimen simplificado para no cometer un error tributario.
- **Responsable:** HOT_CLICK (dueño)
- **Prioridad:** P0 · **Puntos:** 1
- **Dependencias:** S2-79 (Preguntas para el contador, con IVA 13 % no-Tribu)
- **Criterios de aceptación:**
  1. Checklist: respuesta escrita del contador sobre cómo se cobra, registra y paga el 13 %.
  2. Checklist: cómo encaja con la retención de 0,777 % de ONVO.
  3. Checklist: si el contador dice otra cosa, la regla se corrige en el plan y en el sistema antes de facturar.
  4. Checklist: la decisión o entrega queda anotada con fecha y opción elegida en /workspace/informes/decisiones-hotclick.md.
  5. Dado que HOT_CLICK decide, cuando Grok Bot lo registra, entonces avisa al equipo qué historias quedan destrabadas.
  6. Checklist: credenciales y llaves se entregan solo por un canal seguro (solicitud de secreto), nunca por chat.
  7. Dado que la decisión no llega antes del cierre del sprint, cuando se hace la revisión, entonces las historias que dependen de ella pasan al sprint siguiente sin construirse a medias.

#### S5-03 · Validar actividades 4719.9 y 4741.0 con el contador
- **Historia:** Como dueño de HotClick quiero validar si mis actividades 4719.9 y 4741.0 en régimen simplificado alcanzan para la comisión, las mensualidades y las ventas de otros negocios para saber si tengo que agregar una actividad o cambiar de régimen.
- **Responsable:** HOT_CLICK (dueño)
- **Prioridad:** P1 · **Puntos:** 1
- **Dependencias:** S2-79 (Preguntas para el contador, con IVA 13 % no-Tribu)
- **Criterios de aceptación:**
  1. Checklist: respuesta sobre si la comisión necesita su propio código de actividad.
  2. Checklist: respuesta sobre el tope de compras del régimen simplificado (186 salarios base).
  3. Checklist: decisión sobre ajustes en Hacienda anotada.
  4. Checklist: la decisión o entrega queda anotada con fecha y opción elegida en /workspace/informes/decisiones-hotclick.md.
  5. Dado que HOT_CLICK decide, cuando Grok Bot lo registra, entonces avisa al equipo qué historias quedan destrabadas.
  6. Checklist: credenciales y llaves se entregan solo por un canal seguro (solicitud de secreto), nunca por chat.
  7. Dado que la decisión no llega antes del cierre del sprint, cuando se hace la revisión, entonces las historias que dependen de ella pasan al sprint siguiente sin construirse a medias.

#### S5-04 · Decidir el circuito de factura del negocio
- **Historia:** Como dueño de HotClick quiero decidir si HotClick pide la factura a cada negocio (semanal o mensual) o aplica el acuerdo de responsabilidad del porcentaje para que el admin sepa qué seguir.
- **Responsable:** HOT_CLICK (dueño)
- **Prioridad:** P1 · **Puntos:** 1
- **Dependencias:** S5-01 (Reunión con el contador y respuestas archivadas)
- **Criterios de aceptación:**
  1. Checklist: agrupación semanal o mensual elegida.
  2. Checklist: qué «porcentaje» cubre el acuerdo (IVA, comisión u otro) aclarado.
  3. Checklist: qué negocios firman el acuerdo.
  4. Checklist: la decisión o entrega queda anotada con fecha y opción elegida en /workspace/informes/decisiones-hotclick.md.
  5. Dado que HOT_CLICK decide, cuando Grok Bot lo registra, entonces avisa al equipo qué historias quedan destrabadas.
  6. Checklist: credenciales y llaves se entregan solo por un canal seguro (solicitud de secreto), nunca por chat.
  7. Dado que la decisión no llega antes del cierre del sprint, cuando se hace la revisión, entonces las historias que dependen de ella pasan al sprint siguiente sin construirse a medias.

#### S5-05 · Decisiones de reembolsos y contracargos
- **Historia:** Como dueño de HotClick quiero decidir si se devuelve la comisión en un reembolso, quién paga el envío de una devolución y la reserva para contracargos para que Soporte y Finanzas actúen igual siempre.
- **Responsable:** HOT_CLICK (dueño)
- **Prioridad:** P1 · **Puntos:** 1
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: cada decisión con opción elegida o «a definir por HOT_CLICK».
  2. Checklist: la reserva para contracargos sin montos inventados.
  3. Checklist: anotado en la tabla de decisiones.
  4. Checklist: la decisión o entrega queda anotada con fecha y opción elegida en /workspace/informes/decisiones-hotclick.md.
  5. Dado que HOT_CLICK decide, cuando Grok Bot lo registra, entonces avisa al equipo qué historias quedan destrabadas.
  6. Checklist: credenciales y llaves se entregan solo por un canal seguro (solicitud de secreto), nunca por chat.
  7. Dado que la decisión no llega antes del cierre del sprint, cuando se hace la revisión, entonces las historias que dependen de ella pasan al sprint siguiente sin construirse a medias.

#### S5-06 · Aprobar los textos legales actualizados
- **Historia:** Como dueño de HotClick quiero aprobar Términos, Privacidad, Acuerdo de vendedores y Devoluciones actualizados para ONVO y facturación para publicarlos con la salida.
- **Responsable:** HOT_CLICK (dueño)
- **Prioridad:** P1 · **Puntos:** 1
- **Dependencias:** S5-55 (Términos, Privacidad, Acuerdo y Devoluciones para ONVO y facturación)
- **Criterios de aceptación:**
  1. Checklist: revisados por el abogado.
  2. Checklist: sin «[PENDIENTE]».
  3. Checklist: aprobados por escrito.
  4. Checklist: la decisión o entrega queda anotada con fecha y opción elegida en /workspace/informes/decisiones-hotclick.md.
  5. Dado que HOT_CLICK decide, cuando Grok Bot lo registra, entonces avisa al equipo qué historias quedan destrabadas.
  6. Checklist: credenciales y llaves se entregan solo por un canal seguro (solicitud de secreto), nunca por chat.
  7. Dado que la decisión no llega antes del cierre del sprint, cuando se hace la revisión, entonces las historias que dependen de ella pasan al sprint siguiente sin construirse a medias.

#### S5-07 · Ajustes en Hacienda y una factura de prueba Aceptada
- **Historia:** Como dueño de HotClick quiero hacer con el contador los ajustes que indique en Hacienda (emisor no confirmante, actividad para la comisión, sucursal y caja en TicoFactura) para poder emitir comprobantes válidos.
- **Responsable:** HOT_CLICK (dueño)
- **Prioridad:** P0 · **Puntos:** 2
- **Dependencias:** S5-01 (Reunión con el contador y respuestas archivadas); S5-03 (Validar actividades 4719.9 y 4741.0 con el contador)
- **Criterios de aceptación:**
  1. Checklist: captura de «Mis datos» en TRIBU-CR con los cambios hechos.
  2. Checklist: una factura de prueba queda en estado «Aceptada».
  3. Checklist: si el contador dice que HotClick no puede facturar productos de otros negocios, se decide si la facturación queda solo para productos de HotClick y comisiones.
  4. Checklist: la decisión o entrega queda anotada con fecha y opción elegida en /workspace/informes/decisiones-hotclick.md.
  5. Dado que HOT_CLICK decide, cuando Grok Bot lo registra, entonces avisa al equipo qué historias quedan destrabadas.
  6. Checklist: credenciales y llaves se entregan solo por un canal seguro (solicitud de secreto), nunca por chat.
  7. Dado que la decisión no llega antes del cierre del sprint, cuando se hace la revisión, entonces las historias que dependen de ella pasan al sprint siguiente sin construirse a medias.

### Sprint 5 · Desarrollador

#### S5-08 · Pedir un reembolso desde «Mis pedidos»
- **Historia:** Como comprador quiero pedir un reembolso total o parcial desde «Mis pedidos» para recuperar mi plata al mismo medio.
- **Responsable:** Desarrollador
- **Prioridad:** P0 · **Puntos:** 5
- **Dependencias:** S3-18 (Webhook de ONVO idempotente)
- **Criterios de aceptación:**
  1. Checklist: POST /v1/refunds con paymentIntentId y monto, solo dentro de los 30 días naturales.
  2. Checklist: el pedido no pasa a reembolsado antes de la confirmación.
  3. Checklist: se valida que el pedido sea del mismo negocio y reembolsable.
  4. Checklist: el cambio va en su propia rama y PR, con pruebas automáticas (mvn y vitest) en verde y revisión de Seguridad si toca pagos, permisos o datos personales.
  5. Dado que el PR está aprobado, cuando se quiere subir a producción, entonces solo se despliega con la aprobación manual de HOT_CLICK, con pg_dump y etiqueta de vuelta atrás hechos antes.
  6. Checklist: ningún secreto, llave ni dato personal queda en el código o en los logs, y ningún monto queda escrito en el código (sale del plan o de la configuración).
  7. Dado el cambio en staging, cuando QA lo prueba desde el navegador a 390 y 1440 px, entonces no hay errores 500 ni textos «[PENDIENTE]» en las pantallas tocadas.

#### S5-09 · Polling de reembolsos
- **Historia:** Como sistema quiero consultar GET /v1/refunds/{id} hasta que el reembolso termine para mostrar el estado real sin webhooks de reembolso.
- **Responsable:** Desarrollador
- **Prioridad:** P0 · **Puntos:** 3
- **Dependencias:** S5-08 (Pedir un reembolso desde «Mis pedidos»)
- **Criterios de aceptación:**
  1. Checklist: polling más frecuente mientras hay reembolsos abiertos.
  2. Checklist: guarda ultima_sincronizacion y fecha estimada de acreditación.
  3. Checklist: «Mis pedidos» muestra «Actualizado hace N min».
  4. Checklist: el cambio va en su propia rama y PR, con pruebas automáticas (mvn y vitest) en verde y revisión de Seguridad si toca pagos, permisos o datos personales.
  5. Dado que el PR está aprobado, cuando se quiere subir a producción, entonces solo se despliega con la aprobación manual de HOT_CLICK, con pg_dump y etiqueta de vuelta atrás hechos antes.
  6. Checklist: ningún secreto, llave ni dato personal queda en el código o en los logs, y ningún monto queda escrito en el código (sale del plan o de la configuración).
  7. Dado el cambio en staging, cuando QA lo prueba desde el navegador a 390 y 1440 px, entonces no hay errores 500 ni textos «[PENDIENTE]» en las pantallas tocadas.

#### S5-10 · Aprobar o rechazar solicitudes de reembolso
- **Historia:** Como vendedor quiero aprobar o rechazar una solicitud de reembolso para gestionar devoluciones.
- **Responsable:** Desarrollador
- **Prioridad:** P1 · **Puntos:** 3
- **Dependencias:** S5-08 (Pedir un reembolso desde «Mis pedidos»)
- **Criterios de aceptación:**
  1. Checklist: plazo de respuesta visible.
  2. Checklist: notifica al comprador.
  3. Checklist: solo el vendedor del pedido puede responder.
  4. Checklist: el cambio va en su propia rama y PR, con pruebas automáticas (mvn y vitest) en verde y revisión de Seguridad si toca pagos, permisos o datos personales.
  5. Dado que el PR está aprobado, cuando se quiere subir a producción, entonces solo se despliega con la aprobación manual de HOT_CLICK, con pg_dump y etiqueta de vuelta atrás hechos antes.
  6. Checklist: ningún secreto, llave ni dato personal queda en el código o en los logs, y ningún monto queda escrito en el código (sale del plan o de la configuración).
  7. Dado el cambio en staging, cuando QA lo prueba desde el navegador a 390 y 1440 px, entonces no hay errores 500 ni textos «[PENDIENTE]» en las pantallas tocadas.

#### S5-11 · Registro de contracargos
- **Historia:** Como admin de HotClick quiero registrar contracargos y adjuntar pruebas de entrega para responder dentro de los 3 días que da ONVO.
- **Responsable:** Desarrollador
- **Prioridad:** P1 · **Puntos:** 3
- **Dependencias:** S5-05 (Decisiones de reembolsos y contracargos)
- **Criterios de aceptación:**
  1. Checklist: alerta de plazo.
  2. Checklist: adjuntos en almacenamiento privado.
  3. Checklist: registro de la retención de US$45 informada por ONVO.
  4. Checklist: el cambio va en su propia rama y PR, con pruebas automáticas (mvn y vitest) en verde y revisión de Seguridad si toca pagos, permisos o datos personales.
  5. Dado que el PR está aprobado, cuando se quiere subir a producción, entonces solo se despliega con la aprobación manual de HOT_CLICK, con pg_dump y etiqueta de vuelta atrás hechos antes.
  6. Checklist: ningún secreto, llave ni dato personal queda en el código o en los logs, y ningún monto queda escrito en el código (sale del plan o de la configuración).
  7. Dado el cambio en staging, cuando QA lo prueba desde el navegador a 390 y 1440 px, entonces no hay errores 500 ni textos «[PENDIENTE]» en las pantallas tocadas.

#### S5-12 · Reporte de conciliación CSV
- **Historia:** Como Finanzas quiero un CSV de pedidos, cobros, comisiones, diferencias del mínimo y reembolsos para detectar diferencias.
- **Responsable:** Desarrollador
- **Prioridad:** P1 · **Puntos:** 3
- **Dependencias:** S4-13 (Polling de liquidaciones); S5-09 (Polling de reembolsos)
- **Criterios de aceptación:**
  1. Checklist: filtro por fecha y tienda.
  2. Checklist: sin cédula completa ni IBAN.
  3. Checklist: incluye liquidaciones conocidas y US$3 por liquidación.
  4. Checklist: el cambio va en su propia rama y PR, con pruebas automáticas (mvn y vitest) en verde y revisión de Seguridad si toca pagos, permisos o datos personales.
  5. Dado que el PR está aprobado, cuando se quiere subir a producción, entonces solo se despliega con la aprobación manual de HOT_CLICK, con pg_dump y etiqueta de vuelta atrás hechos antes.
  6. Checklist: ningún secreto, llave ni dato personal queda en el código o en los logs, y ningún monto queda escrito en el código (sale del plan o de la configuración).
  7. Dado el cambio en staging, cuando QA lo prueba desde el navegador a 390 y 1440 px, entonces no hay errores 500 ni textos «[PENDIENTE]» en las pantallas tocadas.

#### S5-13 · Admin → Facturación: «Por facturar» solo con compras en la tienda
- **Historia:** Como admin de HotClick quiero una página «Por facturar» que liste solo las compras hechas en la tienda, pagadas o entregadas según la regla para facturar a nombre de HotClick sin mezclar ventas de los negocios.
- **Responsable:** Desarrollador
- **Prioridad:** P0 · **Puntos:** 5
- **Dependencias:** S1-07 (Aclarar qué es «la tienda» para la facturación)
- **Criterios de aceptación:**
  1. Dado un pedido de /tienda/<slug> o del POS de un negocio, cuando se abre «Por facturar», entonces no aparece.
  2. Checklist: el filtro de «la tienda» sigue la opción que eligió HOT_CLICK y se cambia desde un ajuste del admin.
  3. Checklist: el detalle muestra productos con CABYS, montos, negocio, datos del comprador si los dio y el botón «Copiar datos para TicoFactura».
  4. Checklist: rutas solo ADMIN.
  5. Checklist: el cambio va en su propia rama y PR, con pruebas automáticas (mvn y vitest) en verde y revisión de Seguridad si toca pagos, permisos o datos personales.
  6. Dado que el PR está aprobado, cuando se quiere subir a producción, entonces solo se despliega con la aprobación manual de HOT_CLICK, con pg_dump y etiqueta de vuelta atrás hechos antes.
  7. Checklist: ningún secreto, llave ni dato personal queda en el código o en los logs, y ningún monto queda escrito en el código (sale del plan o de la configuración).
  8. Dado el cambio en staging, cuando QA lo prueba desde el navegador a 390 y 1440 px, entonces no hay errores 500 ni textos «[PENDIENTE]» en las pantallas tocadas.

#### S5-14 · Registrar comprobante emitido a mano
- **Historia:** Como admin de HotClick quiero subir PDF y XML, escribir la clave numérica y el consecutivo y marcar la compra como Emitida para llevar el registro de lo que emití en TicoFactura.
- **Responsable:** Desarrollador
- **Prioridad:** P0 · **Puntos:** 3
- **Dependencias:** S5-13 (Admin → Facturación: «Por facturar» solo con compras en la tienda)
- **Criterios de aceptación:**
  1. Checklist: archivos en almacenamiento privado; no se abren sin sesión de admin.
  2. Checklist: el comprobante se envía al comprador por correo si dio correo, y queda en la auditoría.
  3. Checklist: nota de crédito registrable para devoluciones.
  4. Checklist: el cambio va en su propia rama y PR, con pruebas automáticas (mvn y vitest) en verde y revisión de Seguridad si toca pagos, permisos o datos personales.
  5. Dado que el PR está aprobado, cuando se quiere subir a producción, entonces solo se despliega con la aprobación manual de HOT_CLICK, con pg_dump y etiqueta de vuelta atrás hechos antes.
  6. Checklist: ningún secreto, llave ni dato personal queda en el código o en los logs, y ningún monto queda escrito en el código (sale del plan o de la configuración).
  7. Dado el cambio en staging, cuando QA lo prueba desde el navegador a 390 y 1440 px, entonces no hay errores 500 ni textos «[PENDIENTE]» en las pantallas tocadas.

#### S5-15 · Cero permisos de facturación para los negocios
- **Historia:** Como admin de HotClick quiero que Emprendedor, Pyme y Negocio Plus no vean ni usen nada de facturación para cumplir la regla de que solo HotClick factura.
- **Responsable:** Desarrollador
- **Prioridad:** P0 · **Puntos:** 3
- **Dependencias:** S5-13 (Admin → Facturación: «Por facturar» solo con compras en la tienda)
- **Criterios de aceptación:**
  1. Dado un usuario de negocio, cuando entra a cualquier ruta de facturación, entonces recibe 403.
  2. Checklist: el menú de los negocios no muestra facturación.
  3. Checklist: pruebas automáticas por cada plan y rol de personal.
  4. Checklist: el cambio va en su propia rama y PR, con pruebas automáticas (mvn y vitest) en verde y revisión de Seguridad si toca pagos, permisos o datos personales.
  5. Dado que el PR está aprobado, cuando se quiere subir a producción, entonces solo se despliega con la aprobación manual de HOT_CLICK, con pg_dump y etiqueta de vuelta atrás hechos antes.
  6. Checklist: ningún secreto, llave ni dato personal queda en el código o en los logs, y ningún monto queda escrito en el código (sale del plan o de la configuración).
  7. Dado el cambio en staging, cuando QA lo prueba desde el navegador a 390 y 1440 px, entonces no hay errores 500 ni textos «[PENDIENTE]» en las pantallas tocadas.

#### S5-16 · Circuito «Factura del negocio» y acuerdos
- **Historia:** Como admin de HotClick quiero un pendiente por cada compra facturada con estados Pedida, Recibida, Revisada o Cubierta por acuerdo para pedirle su factura a cada negocio o aplicar el acuerdo.
- **Responsable:** Desarrollador
- **Prioridad:** P1 · **Puntos:** 3
- **Dependencias:** S5-14 (Registrar comprobante emitido a mano); S5-04 (Decidir el circuito de factura del negocio)
- **Criterios de aceptación:**
  1. Checklist: el admin pide la factura con un correo de plantilla agrupado según la decisión.
  2. Checklist: el admin sube la factura recibida; el negocio no sube nada en la plataforma.
  3. Checklist: en la ficha del negocio se registra el acuerdo (sí o no, fecha y documento) y sus compras quedan «Cubierta por acuerdo».
  4. Checklist: el cambio va en su propia rama y PR, con pruebas automáticas (mvn y vitest) en verde y revisión de Seguridad si toca pagos, permisos o datos personales.
  5. Dado que el PR está aprobado, cuando se quiere subir a producción, entonces solo se despliega con la aprobación manual de HOT_CLICK, con pg_dump y etiqueta de vuelta atrás hechos antes.
  6. Checklist: ningún secreto, llave ni dato personal queda en el código o en los logs, y ningún monto queda escrito en el código (sale del plan o de la configuración).
  7. Dado el cambio en staging, cuando QA lo prueba desde el navegador a 390 y 1440 px, entonces no hay errores 500 ni textos «[PENDIENTE]» en las pantallas tocadas.

#### S5-17 · Interruptor facturacion.automatica apagado
- **Historia:** Como admin de HotClick quiero un interruptor facturacion.automatica que exista desde el inicio pero apagado y sin efecto para pasar a automático más adelante sin rehacer nada.
- **Responsable:** Desarrollador
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** S5-13 (Admin → Facturación: «Por facturar» solo con compras en la tienda)
- **Criterios de aceptación:**
  1. Checklist: apagado por defecto.
  2. Checklist: encenderlo no hace nada hasta que exista el flujo automático aprobado.
  3. Checklist: cambiarlo queda auditado.
  4. Checklist: el cambio va en su propia rama y PR, con pruebas automáticas (mvn y vitest) en verde y revisión de Seguridad si toca pagos, permisos o datos personales.
  5. Dado que el PR está aprobado, cuando se quiere subir a producción, entonces solo se despliega con la aprobación manual de HOT_CLICK, con pg_dump y etiqueta de vuelta atrás hechos antes.
  6. Checklist: ningún secreto, llave ni dato personal queda en el código o en los logs, y ningún monto queda escrito en el código (sale del plan o de la configuración).
  7. Dado el cambio en staging, cuando QA lo prueba desde el navegador a 390 y 1440 px, entonces no hay errores 500 ni textos «[PENDIENTE]» en las pantallas tocadas.

#### S5-18 · Campo CABYS solo para el admin
- **Historia:** Como admin de HotClick quiero un campo CABYS en los productos que factura HotClick, visible solo para el admin para cumplir los comprobantes 4.4.
- **Responsable:** Desarrollador
- **Prioridad:** P2 · **Puntos:** 2
- **Dependencias:** S5-01 (Reunión con el contador y respuestas archivadas)
- **Criterios de aceptación:**
  1. Checklist: los negocios no lo ven.
  2. Checklist: valores según la lista revisada por el contador.
  3. Checklist: aviso si falta CABYS al facturar.
  4. Checklist: el cambio va en su propia rama y PR, con pruebas automáticas (mvn y vitest) en verde y revisión de Seguridad si toca pagos, permisos o datos personales.
  5. Dado que el PR está aprobado, cuando se quiere subir a producción, entonces solo se despliega con la aprobación manual de HOT_CLICK, con pg_dump y etiqueta de vuelta atrás hechos antes.
  6. Checklist: ningún secreto, llave ni dato personal queda en el código o en los logs, y ningún monto queda escrito en el código (sale del plan o de la configuración).
  7. Dado el cambio en staging, cuando QA lo prueba desde el navegador a 390 y 1440 px, entonces no hay errores 500 ni textos «[PENDIENTE]» en las pantallas tocadas.

#### S5-19 · Desactivar pago quincenal propio para ventas ONVO (verificación)
- **Historia:** Como comprador quiero que el reembolso de una venta ONVO no toque el wallet propio para no descuadrar las liquidaciones.
- **Responsable:** Desarrollador
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** S5-08 (Pedir un reembolso desde «Mis pedidos»)
- **Criterios de aceptación:**
  1. Checklist: reembolso ONVO solo por ONVO.
  2. Checklist: contra entrega sigue con su flujo.
  3. Checklist: prueba combinada.
  4. Checklist: el cambio va en su propia rama y PR, con pruebas automáticas (mvn y vitest) en verde y revisión de Seguridad si toca pagos, permisos o datos personales.
  5. Dado que el PR está aprobado, cuando se quiere subir a producción, entonces solo se despliega con la aprobación manual de HOT_CLICK, con pg_dump y etiqueta de vuelta atrás hechos antes.
  6. Checklist: ningún secreto, llave ni dato personal queda en el código o en los logs, y ningún monto queda escrito en el código (sale del plan o de la configuración).
  7. Dado el cambio en staging, cuando QA lo prueba desde el navegador a 390 y 1440 px, entonces no hay errores 500 ni textos «[PENDIENTE]» en las pantallas tocadas.

### Sprint 5 · Diseño / UX (Figma)

#### S5-20 · Diseño de Admin → Facturación
- **Historia:** Como admin de HotClick quiero bocetos de Por facturar, Emitidas, Facturas de negocios y Acuerdos para trabajar la facturación manual con orden.
- **Responsable:** Diseño / UX (Figma)
- **Prioridad:** P1 · **Puntos:** 3
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: estados y filtros claros.
  2. Checklist: botón «Copiar datos para TicoFactura».
  3. Checklist: sin campo de datos fiscales en el checkout hasta que HOT_CLICK lo confirme.
  4. Checklist: el diseño está en Figma con marcos a 390 y 1440 px y notas de entrega para el Desarrollador.
  5. Checklist: contraste AA, foco visible y una sola llamada a la acción roja por pantalla.
  6. Checklist: los textos no inventan montos; donde falta uno dice «monto a definir por HOT_CLICK».
  7. Dado el boceto terminado, cuando lo revisan Producto y HOT_CLICK, entonces queda aprobado por escrito o con la lista de cambios anotada.

#### S5-21 · Flujo de solicitud de reembolso
- **Historia:** Como comprador quiero el diseño para pedir un reembolso para pedirlo sin escribir a la tienda.
- **Responsable:** Diseño / UX (Figma)
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: estado con fecha estimada.
  2. Checklist: «Actualizado hace N min».
  3. Checklist: motivo obligatorio.
  4. Checklist: el diseño está en Figma con marcos a 390 y 1440 px y notas de entrega para el Desarrollador.
  5. Checklist: contraste AA, foco visible y una sola llamada a la acción roja por pantalla.
  6. Checklist: los textos no inventan montos; donde falta uno dice «monto a definir por HOT_CLICK».
  7. Dado el boceto terminado, cuando lo revisan Producto y HOT_CLICK, entonces queda aprobado por escrito o con la lista de cambios anotada.

#### S5-22 · Pantalla de solicitudes de reembolso
- **Historia:** Como vendedor quiero una pantalla de solicitudes con alerta de plazo para responder a tiempo.
- **Responsable:** Diseño / UX (Figma)
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: alerta visible.
  2. Checklist: aprobar o rechazar en un clic con confirmación.
  3. Checklist: historial.
  4. Checklist: el diseño está en Figma con marcos a 390 y 1440 px y notas de entrega para el Desarrollador.
  5. Checklist: contraste AA, foco visible y una sola llamada a la acción roja por pantalla.
  6. Checklist: los textos no inventan montos; donde falta uno dice «monto a definir por HOT_CLICK».
  7. Dado el boceto terminado, cuando lo revisan Producto y HOT_CLICK, entonces queda aprobado por escrito o con la lista de cambios anotada.

#### S5-23 · Pantalla de contracargos
- **Historia:** Como admin de HotClick quiero una pantalla de contracargos con plazo de 3 días para no perder disputas por tiempo.
- **Responsable:** Diseño / UX (Figma)
- **Prioridad:** P2 · **Puntos:** 1
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: cuenta regresiva.
  2. Checklist: adjuntar pruebas.
  3. Checklist: estado final.
  4. Checklist: el diseño está en Figma con marcos a 390 y 1440 px y notas de entrega para el Desarrollador.
  5. Checklist: contraste AA, foco visible y una sola llamada a la acción roja por pantalla.
  6. Checklist: los textos no inventan montos; donde falta uno dice «monto a definir por HOT_CLICK».
  7. Dado el boceto terminado, cuando lo revisan Producto y HOT_CLICK, entonces queda aprobado por escrito o con la lista de cambios anotada.

#### S5-24 · Resumen de textos legales (DIS-4)
- **Historia:** Como dueño de HotClick quiero un resumen de cada texto legal que se muestre solo cuando Legal lo apruebe para que la gente entienda lo importante.
- **Responsable:** Diseño / UX (Figma)
- **Prioridad:** P2 · **Puntos:** 1
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: oculto hasta aprobación.
  2. Checklist: lenguaje claro.
  3. Checklist: enlace al texto completo.
  4. Checklist: el diseño está en Figma con marcos a 390 y 1440 px y notas de entrega para el Desarrollador.
  5. Checklist: contraste AA, foco visible y una sola llamada a la acción roja por pantalla.
  6. Checklist: los textos no inventan montos; donde falta uno dice «monto a definir por HOT_CLICK».
  7. Dado el boceto terminado, cuando lo revisan Producto y HOT_CLICK, entonces queda aprobado por escrito o con la lista de cambios anotada.

### Sprint 5 · QA (calidad)

#### S5-25 · Facturación de punta a punta con archivos de prueba
- **Historia:** Como equipo quiero probar desde la web: compra en la tienda, registrar comprobante con archivos de prueba, enviar, pedir la factura al negocio, recibirla o marcar acuerdo y nota de crédito para validar el flujo manual.
- **Responsable:** QA (calidad)
- **Prioridad:** P0 · **Puntos:** 3
- **Dependencias:** S5-16 (Circuito «Factura del negocio» y acuerdos)
- **Criterios de aceptación:**
  1. Checklist: sin emitir nada en Hacienda; archivos de prueba marcados QA-TEST.
  2. Checklist: el comprador recibe el correo con el comprobante de prueba.
  3. Checklist: el estado de la factura del negocio avanza hasta Revisada o Cubierta por acuerdo.
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/calidad/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

#### S5-26 · Casos negativos de facturación
- **Historia:** Como equipo quiero comprobar desde la web que un negocio no puede entrar a facturación y que sus pedidos no aparecen para cumplir la regla.
- **Responsable:** QA (calidad)
- **Prioridad:** P0 · **Puntos:** 2
- **Dependencias:** S5-15 (Cero permisos de facturación para los negocios)
- **Criterios de aceptación:**
  1. Checklist: Emprendedor, Pyme y Negocio Plus ven acceso denegado al abrir la página por enlace.
  2. Checklist: pedidos de tienda propia y POS de negocios no salen en «Por facturar».
  3. Checklist: los PDF y XML no abren sin sesión de admin.
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/calidad/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

#### S5-27 · Casos de reembolso R1 a R4
- **Historia:** Como equipo quiero probar reembolsos totales y parciales para confirmar devoluciones correctas.
- **Responsable:** QA (calidad)
- **Prioridad:** P1 · **Puntos:** 3
- **Dependencias:** S5-08 (Pedir un reembolso desde «Mis pedidos»)
- **Criterios de aceptación:**
  1. Checklist: evidencia por caso.
  2. Checklist: estado se actualiza por polling.
  3. Checklist: fuera de 30 días no se permite.
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/calidad/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

#### S5-28 · Textos legales publicados contra aprobados
- **Historia:** Como equipo quiero comparar lo publicado con lo aprobado para que no haya diferencias.
- **Responsable:** QA (calidad)
- **Prioridad:** P1 · **Puntos:** 1
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: página por página.
  2. Checklist: diferencias a Producto.
  3. Checklist: capturas.
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/calidad/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

#### S5-29 · Contracargo simulado
- **Historia:** Como equipo quiero revisar desde el admin de staging el registro de un contracargo simulado para validar la pantalla.
- **Responsable:** QA (calidad)
- **Prioridad:** P2 · **Puntos:** 1
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: alerta de plazo.
  2. Checklist: adjuntos privados.
  3. Checklist: estado final.
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/calidad/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

### Sprint 5 · QA Compradores

#### S5-30 · Pedir reembolso total
- **Historia:** Como comprador quiero pedir el reembolso total de una compra de prueba para recuperar todo.
- **Responsable:** QA Compradores
- **Prioridad:** P0 · **Puntos:** 2
- **Dependencias:** S5-08 (Pedir un reembolso desde «Mis pedidos»)
- **Criterios de aceptación:**
  1. Checklist: solicitud enviada.
  2. Checklist: estado y fecha estimada visibles.
  3. Checklist: correo al terminar.
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/compradores/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

#### S5-31 · Pedir reembolso parcial
- **Historia:** Como comprador quiero pedir el reembolso de un producto de un pedido con varios para recuperar solo lo que devuelvo.
- **Responsable:** QA Compradores
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** S5-08 (Pedir un reembolso desde «Mis pedidos»)
- **Criterios de aceptación:**
  1. Checklist: monto parcial correcto.
  2. Checklist: el resto del pedido sigue.
  3. Checklist: estado parcialmente reembolsado.
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/compradores/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

#### S5-32 · Recibir el comprobante de una compra en la tienda
- **Historia:** Como comprador quiero recibir por correo el comprobante de prueba de mi compra en la tienda para tener mi respaldo.
- **Responsable:** QA Compradores
- **Prioridad:** P1 · **Puntos:** 1
- **Dependencias:** S5-14 (Registrar comprobante emitido a mano)
- **Criterios de aceptación:**
  1. Checklist: correo recibido con el archivo.
  2. Checklist: a nombre de HotClick.
  3. Checklist: una compra en tienda propia de un negocio no genera comprobante.
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/compradores/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

#### S5-33 · Reembolso en carrito multitienda
- **Historia:** Como comprador quiero pedir reembolso de solo una de las tiendas para no afectar las otras compras.
- **Responsable:** QA Compradores
- **Prioridad:** P1 · **Puntos:** 1
- **Dependencias:** S5-08 (Pedir un reembolso desde «Mis pedidos»)
- **Criterios de aceptación:**
  1. Checklist: reembolso por subpedido.
  2. Checklist: las otras tiendas no cambian.
  3. Checklist: estados correctos.
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/compradores/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

#### S5-34 · Leer Devoluciones y retracto
- **Historia:** Como comprador quiero leer la página de devoluciones para saber mis derechos.
- **Responsable:** QA Compradores
- **Prioridad:** P2 · **Puntos:** 1
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: retracto de 8 días hábiles.
  2. Checklist: quién paga el envío de la devolución según decisión.
  3. Checklist: sin «[PENDIENTE]».
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/compradores/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

### Sprint 5 · QA Negocios

#### S5-35 · Responder solicitudes de reembolso
- **Historia:** Como vendedor quiero aprobar y rechazar solicitudes desde mi panel para gestionar devoluciones.
- **Responsable:** QA Negocios
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** S5-08 (Pedir un reembolso desde «Mis pedidos»)
- **Criterios de aceptación:**
  1. Checklist: aprobar dispara el reembolso.
  2. Checklist: rechazar avisa al comprador.
  3. Checklist: alerta de plazo.
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/negocios/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

#### S5-36 · No veo facturación en mi panel
- **Historia:** Como vendedor quiero comprobar que como negocio no tengo facturación para cumplir la regla.
- **Responsable:** QA Negocios
- **Prioridad:** P0 · **Puntos:** 1
- **Dependencias:** S5-15 (Cero permisos de facturación para los negocios)
- **Criterios de aceptación:**
  1. Checklist: revisado en los tres planes.
  2. Checklist: rol de personal también.
  3. Checklist: capturas.
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/negocios/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

#### S5-37 · Recibir el pedido de factura de HotClick
- **Historia:** Como vendedor quiero recibir el correo de HotClick pidiéndome mi factura para saber qué enviar.
- **Responsable:** QA Negocios
- **Prioridad:** P1 · **Puntos:** 1
- **Dependencias:** S5-16 (Circuito «Factura del negocio» y acuerdos)
- **Criterios de aceptación:**
  1. Checklist: correo con el detalle de las compras.
  2. Checklist: no hay botón para subir en la plataforma.
  3. Checklist: el texto explica cómo responder.
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/negocios/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

#### S5-38 · Panel de ventas con reembolsos
- **Historia:** Como vendedor quiero ver mis reembolsos en el panel de ventas para entender mis números.
- **Responsable:** QA Negocios
- **Prioridad:** P2 · **Puntos:** 1
- **Dependencias:** S5-08 (Pedir un reembolso desde «Mis pedidos»)
- **Criterios de aceptación:**
  1. Checklist: reembolso restado del neto.
  2. Checklist: fecha.
  3. Checklist: estado.
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/negocios/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

#### S5-39 · Acuerdo de vendedores visible
- **Historia:** Como vendedor quiero leer el Acuerdo de vendedores actualizado para saber qué firmé.
- **Responsable:** QA Negocios
- **Prioridad:** P2 · **Puntos:** 1
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: comisión, mínimo, liquidación y US$3.
  2. Checklist: cláusula de factura o acuerdo.
  3. Checklist: fecha de versión.
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/negocios/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

### Sprint 5 · QA Automatización y Regresión

#### S5-40 · Guion web de facturación manual
- **Historia:** Como equipo quiero un guion que recorra la facturación manual con archivos de prueba para proteger el flujo.
- **Responsable:** QA Automatización y Regresión
- **Prioridad:** P1 · **Puntos:** 3
- **Dependencias:** S5-16 (Circuito «Factura del negocio» y acuerdos)
- **Criterios de aceptación:**
  1. Checklist: incluye el 403 para negocios (acceso denegado en pantalla).
  2. Checklist: sin emitir en Hacienda.
  3. Checklist: staging.
  4. Checklist: el guion solo maneja el navegador (clics, formularios y lectura de pantalla); no llama a la API, no toca la base de datos ni el servidor y no modifica el código del repo.
  5. Checklist: el guion vive en /workspace/qa/regresion/ y corre a 390 y 1440 px, con captura de cada paso que falle.
  6. Dado tres corridas seguidas sin cambios en el sitio, cuando se comparan, entonces dan el mismo resultado (menos de 1 prueba inestable por corrida).
  7. Checklist: el resultado (verde o rojo, con la lista de fallos) queda en un informe fechado y los fallos se reportan al Desarrollador.

#### S5-41 · Guion web de reembolsos
- **Historia:** Como equipo quiero un guion de reembolso total y parcial para tener reembolsos en la regresión.
- **Responsable:** QA Automatización y Regresión
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** S5-08 (Pedir un reembolso desde «Mis pedidos»)
- **Criterios de aceptación:**
  1. Checklist: espera el polling.
  2. Checklist: verifica estados.
  3. Checklist: staging.
  4. Checklist: el guion solo maneja el navegador (clics, formularios y lectura de pantalla); no llama a la API, no toca la base de datos ni el servidor y no modifica el código del repo.
  5. Checklist: el guion vive en /workspace/qa/regresion/ y corre a 390 y 1440 px, con captura de cada paso que falle.
  6. Dado tres corridas seguidas sin cambios en el sitio, cuando se comparan, entonces dan el mismo resultado (menos de 1 prueba inestable por corrida).
  7. Checklist: el resultado (verde o rojo, con la lista de fallos) queda en un informe fechado y los fallos se reportan al Desarrollador.

#### S5-42 · Regresión completa con todo lo nuevo
- **Historia:** Como equipo quiero una corrida completa con compradores, negocios, admin, POS, pagos y facturación para ver el estado general.
- **Responsable:** QA Automatización y Regresión
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: informe con porcentaje en verde.
  2. Checklist: fallos priorizados.
  3. Checklist: staging.
  4. Checklist: el guion solo maneja el navegador (clics, formularios y lectura de pantalla); no llama a la API, no toca la base de datos ni el servidor y no modifica el código del repo.
  5. Checklist: el guion vive en /workspace/qa/regresion/ y corre a 390 y 1440 px, con captura de cada paso que falle.
  6. Dado tres corridas seguidas sin cambios en el sitio, cuando se comparan, entonces dan el mismo resultado (menos de 1 prueba inestable por corrida).
  7. Checklist: el resultado (verde o rojo, con la lista de fallos) queda en un informe fechado y los fallos se reportan al Desarrollador.

#### S5-43 · Guion web de páginas legales
- **Historia:** Como equipo quiero un guion que revise que ninguna página legal tenga marcadores para no publicar «[PENDIENTE]».
- **Responsable:** QA Automatización y Regresión
- **Prioridad:** P2 · **Puntos:** 1
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: busca «[PENDIENTE]» y «[REVISIÓN LEGAL]».
  2. Checklist: corre en producción sin iniciar sesión.
  3. Checklist: semanal.
  4. Checklist: el guion solo maneja el navegador (clics, formularios y lectura de pantalla); no llama a la API, no toca la base de datos ni el servidor y no modifica el código del repo.
  5. Checklist: el guion vive en /workspace/qa/regresion/ y corre a 390 y 1440 px, con captura de cada paso que falle.
  6. Dado tres corridas seguidas sin cambios en el sitio, cuando se comparan, entonces dan el mismo resultado (menos de 1 prueba inestable por corrida).
  7. Checklist: el resultado (verde o rojo, con la lista de fallos) queda en un informe fechado y los fallos se reportan al Desarrollador.

#### S5-44 · Informe de inestables del sprint
- **Historia:** Como equipo quiero el informe de pruebas inestables del sprint para mantener la regresión confiable.
- **Responsable:** QA Automatización y Regresión
- **Prioridad:** P2 · **Puntos:** 1
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: lista.
  2. Checklist: causa.
  3. Checklist: dueño.
  4. Checklist: el guion solo maneja el navegador (clics, formularios y lectura de pantalla); no llama a la API, no toca la base de datos ni el servidor y no modifica el código del repo.
  5. Checklist: el guion vive en /workspace/qa/regresion/ y corre a 390 y 1440 px, con captura de cada paso que falle.
  6. Dado tres corridas seguidas sin cambios en el sitio, cuando se comparan, entonces dan el mismo resultado (menos de 1 prueba inestable por corrida).
  7. Checklist: el resultado (verde o rojo, con la lista de fallos) queda en un informe fechado y los fallos se reportan al Desarrollador.

### Sprint 5 · Seguridad

#### S5-45 · Revisión de seguridad de la facturación
- **Historia:** Como dueño de HotClick quiero revisar permisos por rol, almacenamiento privado, auditoría y retención de la facturación para proteger datos fiscales.
- **Responsable:** Seguridad
- **Prioridad:** P0 · **Puntos:** 3
- **Dependencias:** S5-15 (Cero permisos de facturación para los negocios); S5-14 (Registrar comprobante emitido a mano)
- **Criterios de aceptación:**
  1. Checklist: un usuario de negocio recibe 403 en todas las rutas.
  2. Checklist: archivos privados con acceso solo de admin.
  3. Checklist: sin datos personales en logs.
  4. Checklist: informe corto en /workspace/seguridad/ con cada hallazgo, su gravedad (crítico, alto, medio o bajo) y el arreglo propuesto.
  5. Dado el informe, cuando se cierra la historia, entonces no queda ningún hallazgo crítico ni alto abierto sin plan y sin dueño.
  6. Checklist: no se hacen ataques ni pruebas destructivas en producción; lo que se prueba en vivo se hace con cuentas QA-TEST y con OK de HOT_CLICK.
  7. Checklist: ninguna llave, secreto ni dato personal se copia al informe ni al chat.

#### S5-46 · Autorización de reembolsos
- **Historia:** Como dueño de HotClick quiero que solo el comprador y el vendedor del pedido puedan pedir o aprobar reembolsos para evitar reembolsos fraudulentos.
- **Responsable:** Seguridad
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** S5-08 (Pedir un reembolso desde «Mis pedidos»)
- **Criterios de aceptación:**
  1. Checklist: pruebas de autorización.
  2. Checklist: auditoría inmutable.
  3. Checklist: límites por día.
  4. Checklist: informe corto en /workspace/seguridad/ con cada hallazgo, su gravedad (crítico, alto, medio o bajo) y el arreglo propuesto.
  5. Dado el informe, cuando se cierra la historia, entonces no queda ningún hallazgo crítico ni alto abierto sin plan y sin dueño.
  6. Checklist: no se hacen ataques ni pruebas destructivas en producción; lo que se prueba en vivo se hace con cuentas QA-TEST y con OK de HOT_CLICK.
  7. Checklist: ninguna llave, secreto ni dato personal se copia al informe ni al chat.

#### S5-47 · CSV de conciliación sin datos de más
- **Historia:** Como dueño de HotClick quiero revisar que el CSV no exponga datos personales innecesarios para cumplir la ley de datos.
- **Responsable:** Seguridad
- **Prioridad:** P1 · **Puntos:** 1
- **Dependencias:** S5-12 (Reporte de conciliación CSV)
- **Criterios de aceptación:**
  1. Checklist: sin cédula completa ni IBAN.
  2. Checklist: acceso solo de admin y Finanzas.
  3. Checklist: descarga auditada.
  4. Checklist: informe corto en /workspace/seguridad/ con cada hallazgo, su gravedad (crítico, alto, medio o bajo) y el arreglo propuesto.
  5. Dado el informe, cuando se cierra la historia, entonces no queda ningún hallazgo crítico ni alto abierto sin plan y sin dueño.
  6. Checklist: no se hacen ataques ni pruebas destructivas en producción; lo que se prueba en vivo se hace con cuentas QA-TEST y con OK de HOT_CLICK.
  7. Checklist: ninguna llave, secreto ni dato personal se copia al informe ni al chat.

#### S5-48 · Auditoría de cambios de comisión y reembolsos
- **Historia:** Como dueño de HotClick quiero un registro de auditoría de cambios de % y reembolsos para rastrear quién hizo qué.
- **Responsable:** Seguridad
- **Prioridad:** P1 · **Puntos:** 1
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: usuario y fecha.
  2. Checklist: no se puede editar.
  3. Checklist: consulta desde el admin.
  4. Checklist: informe corto en /workspace/seguridad/ con cada hallazgo, su gravedad (crítico, alto, medio o bajo) y el arreglo propuesto.
  5. Dado el informe, cuando se cierra la historia, entonces no queda ningún hallazgo crítico ni alto abierto sin plan y sin dueño.
  6. Checklist: no se hacen ataques ni pruebas destructivas en producción; lo que se prueba en vivo se hace con cuentas QA-TEST y con OK de HOT_CLICK.
  7. Checklist: ninguna llave, secreto ni dato personal se copia al informe ni al chat.

#### S5-49 · Lista de cookies y proveedores (LEG-11)
- **Historia:** Como dueño de HotClick quiero la lista definitiva de cookies y proveedores que tratan datos para completar la Privacidad.
- **Responsable:** Seguridad
- **Prioridad:** P2 · **Puntos:** 1
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: incluye proveedor de IA, ONVO y correo.
  2. Checklist: sin Meta Pixel.
  3. Checklist: confirmada por HOT_CLICK.
  4. Checklist: informe corto en /workspace/seguridad/ con cada hallazgo, su gravedad (crítico, alto, medio o bajo) y el arreglo propuesto.
  5. Dado el informe, cuando se cierra la historia, entonces no queda ningún hallazgo crítico ni alto abierto sin plan y sin dueño.
  6. Checklist: no se hacen ataques ni pruebas destructivas en producción; lo que se prueba en vivo se hace con cuentas QA-TEST y con OK de HOT_CLICK.
  7. Checklist: ninguna llave, secreto ni dato personal se copia al informe ni al chat.

### Sprint 5 · DevOps y Seguridad

#### S5-50 · Almacenamiento privado para comprobantes
- **Historia:** Como dueño de HotClick quiero un bucket privado para PDF y XML de facturas y pruebas de contracargo para guardar documentos sensibles.
- **Responsable:** DevOps y Seguridad
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: sin acceso público.
  2. Checklist: URL firmada de corta duración.
  3. Checklist: retención según lo que diga el contador (plazo de conservación a confirmar; ONVO pide 4 años de comprobantes).
  4. Checklist: el cambio queda documentado en un runbook en /workspace/infra/ con los pasos para hacerlo y para deshacerlo.
  5. Dado cualquier paso que toque producción, cuando está listo, entonces espera la aprobación manual de HOT_CLICK antes de ejecutarse.
  6. Checklist: los secretos se guardan en los secretos del servidor o de GitHub, nunca en el repo, en el chat ni en los logs.
  7. Dado el cambio aplicado, cuando se revisa el monitoreo, entonces el sitio responde y /api/health está en verde.

#### S5-51 · Backups que incluyen la facturación
- **Historia:** Como dueño de HotClick quiero confirmar que los backups cubren tablas y archivos de facturación para no perder comprobantes.
- **Responsable:** DevOps y Seguridad
- **Prioridad:** P1 · **Puntos:** 1
- **Dependencias:** S2-62 (Backups cifrados automáticos a Google Drive)
- **Criterios de aceptación:**
  1. Checklist: tablas incluidas.
  2. Checklist: archivos con copia.
  3. Checklist: restauración probada.
  4. Checklist: el cambio queda documentado en un runbook en /workspace/infra/ con los pasos para hacerlo y para deshacerlo.
  5. Dado cualquier paso que toque producción, cuando está listo, entonces espera la aprobación manual de HOT_CLICK antes de ejecutarse.
  6. Checklist: los secretos se guardan en los secretos del servidor o de GitHub, nunca en el repo, en el chat ni en los logs.
  7. Dado el cambio aplicado, cuando se revisa el monitoreo, entonces el sitio responde y /api/health está en verde.

#### S5-52 · Job de polling de reembolsos
- **Historia:** Como equipo quiero programar el polling de reembolsos con frecuencia variable para estados al día.
- **Responsable:** DevOps y Seguridad
- **Prioridad:** P1 · **Puntos:** 1
- **Dependencias:** S5-09 (Polling de reembolsos)
- **Criterios de aceptación:**
  1. Checklist: más frecuente con reembolsos abiertos.
  2. Checklist: ShedLock.
  3. Checklist: alerta si se atrasa.
  4. Checklist: el cambio queda documentado en un runbook en /workspace/infra/ con los pasos para hacerlo y para deshacerlo.
  5. Dado cualquier paso que toque producción, cuando está listo, entonces espera la aprobación manual de HOT_CLICK antes de ejecutarse.
  6. Checklist: los secretos se guardan en los secretos del servidor o de GitHub, nunca en el repo, en el chat ni en los logs.
  7. Dado el cambio aplicado, cuando se revisa el monitoreo, entonces el sitio responde y /api/health está en verde.

#### S5-53 · Ensayo general de salida en staging
- **Historia:** Como dueño de HotClick quiero un ensayo de la salida a producción en staging con backup, deploy, smoke y vuelta atrás para llegar al sprint 6 sin sorpresas.
- **Responsable:** DevOps y Seguridad
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** S2-64 (Vuelta atrás por etiqueta ensayada)
- **Criterios de aceptación:**
  1. Checklist: tiempos medidos.
  2. Checklist: lista de verificación firmada por QA y Seguridad.
  3. Checklist: aprobación manual simulada.
  4. Checklist: el cambio queda documentado en un runbook en /workspace/infra/ con los pasos para hacerlo y para deshacerlo.
  5. Dado cualquier paso que toque producción, cuando está listo, entonces espera la aprobación manual de HOT_CLICK antes de ejecutarse.
  6. Checklist: los secretos se guardan en los secretos del servidor o de GitHub, nunca en el repo, en el chat ni en los logs.
  7. Dado el cambio aplicado, cuando se revisa el monitoreo, entonces el sitio responde y /api/health está en verde.

#### S5-54 · Logs centralizados básicos (INF-9)
- **Historia:** Como equipo quiero logs centralizados con búsqueda para investigar incidentes rápido.
- **Responsable:** DevOps y Seguridad
- **Prioridad:** P2 · **Puntos:** 1
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: retención definida.
  2. Checklist: sin datos personales completos.
  3. Checklist: acceso restringido.
  4. Checklist: el cambio queda documentado en un runbook en /workspace/infra/ con los pasos para hacerlo y para deshacerlo.
  5. Dado cualquier paso que toque producción, cuando está listo, entonces espera la aprobación manual de HOT_CLICK antes de ejecutarse.
  6. Checklist: los secretos se guardan en los secretos del servidor o de GitHub, nunca en el repo, en el chat ni en los logs.
  7. Dado el cambio aplicado, cuando se revisa el monitoreo, entonces el sitio responde y /api/health está en verde.

### Sprint 5 · Producto Contenido y Soporte

#### S5-55 · Términos, Privacidad, Acuerdo y Devoluciones para ONVO y facturación
- **Historia:** Como dueño de HotClick quiero actualizar los textos legales con ONVO, quién factura qué y datos personales para cumplir ley y contrato.
- **Responsable:** Producto Contenido y Soporte
- **Prioridad:** P0 · **Puntos:** 3
- **Dependencias:** S2-08 (Lista y OK de legales LEG-6 a LEG-11); S2-71 (Borrador del Acuerdo de vendedores con ONVO)
- **Criterios de aceptación:**
  1. Checklist: retracto de 8 días hábiles y datos personales en 5 días hábiles.
  2. Checklist: quién factura qué, solo después de la validación del contador.
  3. Checklist: reembolsos dentro de 30 días según ONVO y decisiones de HOT_CLICK.
  4. Checklist: el texto está en español de Costa Rica, con voseo, claro y sin jerga técnica.
  5. Checklist: no inventa montos; usa solo los decididos por HOT_CLICK o dice «monto a definir por HOT_CLICK».
  6. Dado el texto final, cuando HOT_CLICK lo revisa, entonces se publica solo con su aprobación escrita.
  7. Checklist: no promete WhatsApp API, no usa Meta Pixel y no presenta a Tilopay como pasarela vigente una vez que ONVO esté en uso.

#### S5-56 · Guion de reembolsos y contracargos
- **Historia:** Como soporte quiero respuestas para reembolsos y contracargos para responder con criterio único.
- **Responsable:** Producto Contenido y Soporte
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: quién asume el monto según decisión.
  2. Checklist: plazos.
  3. Checklist: nunca pedir tarjeta.
  4. Checklist: el texto está en español de Costa Rica, con voseo, claro y sin jerga técnica.
  5. Checklist: no inventa montos; usa solo los decididos por HOT_CLICK o dice «monto a definir por HOT_CLICK».
  6. Dado el texto final, cuando HOT_CLICK lo revisa, entonces se publica solo con su aprobación escrita.
  7. Checklist: no promete WhatsApp API, no usa Meta Pixel y no presenta a Tilopay como pasarela vigente una vez que ONVO esté en uso.

#### S5-57 · Plantilla de correo para pedir la factura al negocio
- **Historia:** Como admin de HotClick quiero una plantilla de correo para pedir la factura para pedirla igual a todos.
- **Responsable:** Producto Contenido y Soporte
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** S5-04 (Decidir el circuito de factura del negocio)
- **Criterios de aceptación:**
  1. Checklist: detalle de compras agrupadas.
  2. Checklist: cómo enviar la factura.
  3. Checklist: mención del acuerdo si aplica.
  4. Checklist: el texto está en español de Costa Rica, con voseo, claro y sin jerga técnica.
  5. Checklist: no inventa montos; usa solo los decididos por HOT_CLICK o dice «monto a definir por HOT_CLICK».
  6. Dado el texto final, cuando HOT_CLICK lo revisa, entonces se publica solo con su aprobación escrita.
  7. Checklist: no promete WhatsApp API, no usa Meta Pixel y no presenta a Tilopay como pasarela vigente una vez que ONVO esté en uso.

#### S5-58 · Lista CABYS de lo que se factura
- **Historia:** Como dueño de HotClick quiero una lista de códigos CABYS para lo que factura HotClick para cumplir los comprobantes.
- **Responsable:** Producto Contenido y Soporte
- **Prioridad:** P1 · **Puntos:** 1
- **Dependencias:** S5-01 (Reunión con el contador y respuestas archivadas)
- **Criterios de aceptación:**
  1. Checklist: revisada por el contador.
  2. Checklist: incluye la comisión si corresponde.
  3. Checklist: entregada al Desarrollador.
  4. Checklist: el texto está en español de Costa Rica, con voseo, claro y sin jerga técnica.
  5. Checklist: no inventa montos; usa solo los decididos por HOT_CLICK o dice «monto a definir por HOT_CLICK».
  6. Dado el texto final, cuando HOT_CLICK lo revisa, entonces se publica solo con su aprobación escrita.
  7. Checklist: no promete WhatsApp API, no usa Meta Pixel y no presenta a Tilopay como pasarela vigente una vez que ONVO esté en uso.

#### S5-59 · Textos de reembolso para el comprador
- **Historia:** Como comprador quiero textos claros del estado del reembolso para saber cuándo me llega.
- **Responsable:** Producto Contenido y Soporte
- **Prioridad:** P2 · **Puntos:** 1
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: fecha estimada.
  2. Checklist: qué hacer si no llega.
  3. Checklist: sin jerga.
  4. Checklist: el texto está en español de Costa Rica, con voseo, claro y sin jerga técnica.
  5. Checklist: no inventa montos; usa solo los decididos por HOT_CLICK o dice «monto a definir por HOT_CLICK».
  6. Dado el texto final, cuando HOT_CLICK lo revisa, entonces se publica solo con su aprobación escrita.
  7. Checklist: no promete WhatsApp API, no usa Meta Pixel y no presenta a Tilopay como pasarela vigente una vez que ONVO esté en uso.

#### S5-60 · Cláusula de factura o acuerdo aceptada por las tiendas piloto
- **Historia:** Como vendedor piloto quiero que cada tienda piloto acepte la cláusula de factura a HotClick o la de responsabilidad del porcentaje para que el circuito de facturas de negocios tenga respaldo.
- **Responsable:** Producto Contenido y Soporte
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** S5-04 (Decidir el circuito de factura del negocio); S2-71 (Borrador del Acuerdo de vendedores con ONVO)
- **Criterios de aceptación:**
  1. Checklist: texto final revisado por el abogado y el contador.
  2. Checklist: cada tienda piloto la firmó o aceptó, con fecha.
  3. Checklist: el admin registra en la ficha del negocio si hay acuerdo y adjunta el documento.
  4. Checklist: el texto está en español de Costa Rica, con voseo, claro y sin jerga técnica.
  5. Checklist: no inventa montos; usa solo los decididos por HOT_CLICK o dice «monto a definir por HOT_CLICK».
  6. Dado el texto final, cuando HOT_CLICK lo revisa, entonces se publica solo con su aprobación escrita.
  7. Checklist: no promete WhatsApp API, no usa Meta Pixel y no presenta a Tilopay como pasarela vigente una vez que ONVO esté en uso.

### Sprint 5 · Finanzas

#### S5-61 · Conciliar un mes simulado
- **Historia:** Como dueño de HotClick quiero conciliar un mes simulado completo en sandbox para confirmar que el reporte cuadra.
- **Responsable:** Finanzas
- **Prioridad:** P0 · **Puntos:** 3
- **Dependencias:** S5-12 (Reporte de conciliación CSV)
- **Criterios de aceptación:**
  1. Checklist: diferencia cero o explicada.
  2. Checklist: incluye comisiones, diferencias del mínimo, reembolsos y US$3 por liquidación.
  3. Checklist: informe a HOT_CLICK.
  4. Checklist: usa solo montos dados por HOT_CLICK o publicados en las fuentes; cualquier otro dice «monto a definir por HOT_CLICK».
  5. Checklist: la planilla o el informe queda en /workspace/finanzas/ con fecha y la fuente de cada cifra.
  6. Dado una muestra de casos, cuando se recalculan a mano, entonces el resultado cuadra o la diferencia queda explicada.
  7. Dado el resultado, cuando se le entrega a HOT_CLICK por medio de Grok Bot, entonces queda anotada su respuesta o decisión.

#### S5-62 · Reporte mensual de facturación
- **Historia:** Como dueño de HotClick quiero un reporte de emitidas, notas de crédito, facturas de negocios pendientes y recibidas y acuerdos para seguir la facturación.
- **Responsable:** Finanzas
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** S5-16 (Circuito «Factura del negocio» y acuerdos)
- **Criterios de aceptación:**
  1. Checklist: CSV mensual.
  2. Checklist: un mes simulado cuadra.
  3. Checklist: seguimiento del tope de compras del régimen simplificado.
  4. Checklist: usa solo montos dados por HOT_CLICK o publicados en las fuentes; cualquier otro dice «monto a definir por HOT_CLICK».
  5. Checklist: la planilla o el informe queda en /workspace/finanzas/ con fecha y la fuente de cada cifra.
  6. Dado una muestra de casos, cuando se recalculan a mano, entonces el resultado cuadra o la diferencia queda explicada.
  7. Dado el resultado, cuando se le entrega a HOT_CLICK por medio de Grok Bot, entonces queda anotada su respuesta o decisión.

#### S5-63 · Política de reserva para contracargos
- **Historia:** Como dueño de HotClick quiero una propuesta de política de reserva para contracargos para cubrir disputas sin saldo del vendedor.
- **Responsable:** Finanzas
- **Prioridad:** P1 · **Puntos:** 1
- **Dependencias:** S5-05 (Decisiones de reembolsos y contracargos)
- **Criterios de aceptación:**
  1. Checklist: sin montos inventados («monto a definir por HOT_CLICK»).
  2. Checklist: opciones con pros y contras.
  3. Checklist: decisión marcada.
  4. Checklist: usa solo montos dados por HOT_CLICK o publicados en las fuentes; cualquier otro dice «monto a definir por HOT_CLICK».
  5. Checklist: la planilla o el informe queda en /workspace/finanzas/ con fecha y la fuente de cada cifra.
  6. Dado una muestra de casos, cuando se recalculan a mano, entonces el resultado cuadra o la diferencia queda explicada.
  7. Dado el resultado, cuando se le entrega a HOT_CLICK por medio de Grok Bot, entonces queda anotada su respuesta o decisión.

#### S5-64 · Tratamiento del IVA según el contador
- **Historia:** Como dueño de HotClick quiero documentar cómo se registra el IVA del 13 % según la respuesta del contador para aplicarlo igual siempre.
- **Responsable:** Finanzas
- **Prioridad:** P1 · **Puntos:** 1
- **Dependencias:** S5-02 (Confirmar con el contador «IVA 13 % no-Tribu»)
- **Criterios de aceptación:**
  1. Checklist: procedimiento paso a paso.
  2. Checklist: relación con la retención de 0,777 % de ONVO.
  3. Checklist: aprobado por HOT_CLICK.
  4. Checklist: usa solo montos dados por HOT_CLICK o publicados en las fuentes; cualquier otro dice «monto a definir por HOT_CLICK».
  5. Checklist: la planilla o el informe queda en /workspace/finanzas/ con fecha y la fuente de cada cifra.
  6. Dado una muestra de casos, cuando se recalculan a mano, entonces el resultado cuadra o la diferencia queda explicada.
  7. Dado el resultado, cuando se le entrega a HOT_CLICK por medio de Grok Bot, entonces queda anotada su respuesta o decisión.

### Sprint 5 · Consultor

#### S5-65 · Revisión de la facturación contra las reglas del dueño
- **Historia:** Como equipo quiero revisar que la facturación cumpla las 6 reglas vigentes para no construir algo que choque con la regla.
- **Responsable:** Consultor
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** S5-16 (Circuito «Factura del negocio» y acuerdos)
- **Criterios de aceptación:**
  1. Checklist: regla por regla con evidencia.
  2. Checklist: nada fuera de la versión 1.
  3. Checklist: recomendaciones.
  4. Checklist: el informe queda en /workspace/consultor/ y cita archivo y línea de cada afirmación sobre el código.
  5. Checklist: trabajo solo de lectura: no cambia código, no hace push, no despliega y no le escribe a nadie.
  6. Dado cada hallazgo, cuando se entrega, entonces trae prioridad (P0, P1 o P2), dueño sugerido y si necesita una decisión de HOT_CLICK.
  7. Dado el informe, cuando lo lee el Desarrollador, entonces puede convertir cada recomendación en una historia sin tener que preguntar más.

#### S5-66 · Revisión de reembolsos
- **Historia:** Como equipo quiero revisar el flujo de reembolsos y polling para que no queden reembolsos colgados.
- **Responsable:** Consultor
- **Prioridad:** P1 · **Puntos:** 1
- **Dependencias:** S5-08 (Pedir un reembolso desde «Mis pedidos»)
- **Criterios de aceptación:**
  1. Checklist: estados.
  2. Checklist: tiempos de polling.
  3. Checklist: casos borde.
  4. Checklist: el informe queda en /workspace/consultor/ y cita archivo y línea de cada afirmación sobre el código.
  5. Checklist: trabajo solo de lectura: no cambia código, no hace push, no despliega y no le escribe a nadie.
  6. Dado cada hallazgo, cuando se entrega, entonces trae prioridad (P0, P1 o P2), dueño sugerido y si necesita una decisión de HOT_CLICK.
  7. Dado el informe, cuando lo lee el Desarrollador, entonces puede convertir cada recomendación en una historia sin tener que preguntar más.

#### S5-67 · Riesgos tributarios señalados por el contador
- **Historia:** Como dueño de HotClick quiero un resumen de los riesgos que señale el contador y su efecto en el plan para ajustar a tiempo.
- **Responsable:** Consultor
- **Prioridad:** P2 · **Puntos:** 1
- **Dependencias:** S5-01 (Reunión con el contador y respuestas archivadas)
- **Criterios de aceptación:**
  1. Checklist: cada riesgo con historia afectada.
  2. Checklist: prioridad.
  3. Checklist: decisión pendiente marcada.
  4. Checklist: el informe queda en /workspace/consultor/ y cita archivo y línea de cada afirmación sobre el código.
  5. Checklist: trabajo solo de lectura: no cambia código, no hace push, no despliega y no le escribe a nadie.
  6. Dado cada hallazgo, cuando se entrega, entonces trae prioridad (P0, P1 o P2), dueño sugerido y si necesita una decisión de HOT_CLICK.
  7. Dado el informe, cuando lo lee el Desarrollador, entonces puede convertir cada recomendación en una historia sin tener que preguntar más.

---

## Sprint 6: Endurecer, salir en vivo con la tienda piloto y preparar la salida de Tilopay
- **Duración:** 1 semana (lunes 23-nov al viernes 27-nov-2026).
- **Objetivo:** Salir a producción con ONVO solo con tu OK: auditoría final sin hallazgos altos, llaves live, tienda piloto recreada en live, interruptor por tienda, primera venta real conciliada; regresión completa automatizada; facturación manual en piloto; PR de quitar Tilopay listo pero desplegado solo cuando ONVO funcione estable; rendimiento, contenido y soporte de lanzamiento.
- **Entregable de cierre:** Informe QA «listo», tu OK de go-live, una venta real conciliada y el PR de Tilopay listo para cuando ONVO esté estable.
- **Historias:** 66 · **Puntos:** 112

| Rol | Historias | Puntos |
|---|---:|---:|
| HOT_CLICK (dueño) | 6 | 6 |
| Desarrollador | 12 | 30 |
| Diseño / UX (Figma) | 5 | 6 |
| QA (calidad) | 5 | 12 |
| QA Compradores | 5 | 7 |
| QA Negocios | 5 | 7 |
| QA Automatización y Regresión | 5 | 9 |
| Seguridad | 5 | 8 |
| DevOps y Seguridad | 6 | 11 |
| Producto Contenido y Soporte | 5 | 7 |
| Finanzas | 4 | 5 |
| Consultor | 3 | 4 |

### Sprint 6 · HOT_CLICK (dueño)

#### S6-01 · OK de go-live con ONVO
- **Historia:** Como dueño de HotClick quiero dar o negar el OK de salida a producción con ONVO para salir solo cuando esté listo.
- **Responsable:** HOT_CLICK (dueño)
- **Prioridad:** P0 · **Puntos:** 1
- **Dependencias:** S6-24 (Informe QA integral «listo/no listo»); S6-44 (Auditoría final de pagos y datos)
- **Criterios de aceptación:**
  1. Checklist: lee el informe QA «listo/no listo» y el de Seguridad.
  2. Checklist: aprueba a mano el deploy en GitHub (environment production).
  3. Checklist: la fecha y la ventana quedan anotadas.
  4. Checklist: la decisión o entrega queda anotada con fecha y opción elegida en /workspace/informes/decisiones-hotclick.md.
  5. Dado que HOT_CLICK decide, cuando Grok Bot lo registra, entonces avisa al equipo qué historias quedan destrabadas.
  6. Checklist: credenciales y llaves se entregan solo por un canal seguro (solicitud de secreto), nunca por chat.
  7. Dado que la decisión no llega antes del cierre del sprint, cuando se hace la revisión, entonces las historias que dependen de ella pasan al sprint siguiente sin construirse a medias.

#### S6-02 · Llaves live de ONVO
- **Historia:** Como dueño de HotClick quiero entregar las llaves live y el secreto del webhook por canal seguro para cobrar de verdad.
- **Responsable:** HOT_CLICK (dueño)
- **Prioridad:** P0 · **Puntos:** 1
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: llaves onvo_live_ por solicitud de secreto.
  2. Checklist: Marketplace y tarifa semanal habilitados en live.
  3. Checklist: las de prueba no se usan en producción.
  4. Checklist: la decisión o entrega queda anotada con fecha y opción elegida en /workspace/informes/decisiones-hotclick.md.
  5. Dado que HOT_CLICK decide, cuando Grok Bot lo registra, entonces avisa al equipo qué historias quedan destrabadas.
  6. Checklist: credenciales y llaves se entregan solo por un canal seguro (solicitud de secreto), nunca por chat.
  7. Dado que la decisión no llega antes del cierre del sprint, cuando se hace la revisión, entonces las historias que dependen de ella pasan al sprint siguiente sin construirse a medias.

#### S6-03 · OK para la primera venta real
- **Historia:** Como dueño de HotClick quiero autorizar una compra real mínima en la tienda piloto para confirmar el flujo en vivo.
- **Responsable:** HOT_CLICK (dueño)
- **Prioridad:** P1 · **Puntos:** 1
- **Dependencias:** S6-01 (OK de go-live con ONVO)
- **Criterios de aceptación:**
  1. Checklist: monto y producto elegidos por HOT_CLICK («monto a definir por HOT_CLICK»).
  2. Checklist: quién paga y cómo se devuelve si hace falta.
  3. Checklist: autorización escrita.
  4. Checklist: la decisión o entrega queda anotada con fecha y opción elegida en /workspace/informes/decisiones-hotclick.md.
  5. Dado que HOT_CLICK decide, cuando Grok Bot lo registra, entonces avisa al equipo qué historias quedan destrabadas.
  6. Checklist: credenciales y llaves se entregan solo por un canal seguro (solicitud de secreto), nunca por chat.
  7. Dado que la decisión no llega antes del cierre del sprint, cuando se hace la revisión, entonces las historias que dependen de ella pasan al sprint siguiente sin construirse a medias.

#### S6-04 · Decidir cuándo se despliega la salida de Tilopay
- **Historia:** Como dueño de HotClick quiero decidir la fecha para desplegar chore/quitar-tilopay cuando ONVO esté estable para no quedarme sin pagos.
- **Responsable:** HOT_CLICK (dueño)
- **Prioridad:** P1 · **Puntos:** 1
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: condición: ONVO en producción y ~2 semanas estable.
  2. Checklist: aprobación manual del deploy.
  3. Checklist: fecha tentativa anotada (probablemente después de este sprint).
  4. Checklist: la decisión o entrega queda anotada con fecha y opción elegida en /workspace/informes/decisiones-hotclick.md.
  5. Dado que HOT_CLICK decide, cuando Grok Bot lo registra, entonces avisa al equipo qué historias quedan destrabadas.
  6. Checklist: credenciales y llaves se entregan solo por un canal seguro (solicitud de secreto), nunca por chat.
  7. Dado que la decisión no llega antes del cierre del sprint, cuando se hace la revisión, entonces las historias que dependen de ella pasan al sprint siguiente sin construirse a medias.

#### S6-05 · Arrancar el piloto de facturación manual
- **Historia:** Como dueño de HotClick quiero definir quién emite (yo o alguien designado) y cuántas semanas dura el piloto para probar la facturación real.
- **Responsable:** HOT_CLICK (dueño)
- **Prioridad:** P1 · **Puntos:** 1
- **Dependencias:** S5-01 (Reunión con el contador y respuestas archivadas); S5-07 (Ajustes en Hacienda y una factura de prueba Aceptada)
- **Criterios de aceptación:**
  1. Checklist: solo si el contador respondió los puntos 1 a 4 y hay una factura de prueba Aceptada.
  2. Checklist: duración elegida.
  3. Checklist: bitácora definida.
  4. Checklist: la decisión o entrega queda anotada con fecha y opción elegida en /workspace/informes/decisiones-hotclick.md.
  5. Dado que HOT_CLICK decide, cuando Grok Bot lo registra, entonces avisa al equipo qué historias quedan destrabadas.
  6. Checklist: credenciales y llaves se entregan solo por un canal seguro (solicitud de secreto), nunca por chat.
  7. Dado que la decisión no llega antes del cierre del sprint, cuando se hace la revisión, entonces las historias que dependen de ella pasan al sprint siguiente sin construirse a medias.

#### S6-06 · Repo privado y Dependabot (INF-13)
- **Historia:** Como dueño de HotClick quiero decidir cuándo pasar el repo a privado y revisar los PRs de Dependabot para reducir exposición.
- **Responsable:** HOT_CLICK (dueño)
- **Prioridad:** P2 · **Puntos:** 1
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: fecha elegida.
  2. Checklist: efecto en CodeQL (pasa a Semgrep) aceptado.
  3. Checklist: PRs de Dependabot priorizados.
  4. Checklist: la decisión o entrega queda anotada con fecha y opción elegida en /workspace/informes/decisiones-hotclick.md.
  5. Dado que HOT_CLICK decide, cuando Grok Bot lo registra, entonces avisa al equipo qué historias quedan destrabadas.
  6. Checklist: credenciales y llaves se entregan solo por un canal seguro (solicitud de secreto), nunca por chat.
  7. Dado que la decisión no llega antes del cierre del sprint, cuando se hace la revisión, entonces las historias que dependen de ella pasan al sprint siguiente sin construirse a medias.

### Sprint 6 · Desarrollador

#### S6-07 · Corregir los bugs del informe QA
- **Historia:** Como equipo quiero corregir lo que salga del informe QA final para llegar a «listo».
- **Responsable:** Desarrollador
- **Prioridad:** P0 · **Puntos:** 3
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: cada bug con prueba.
  2. Checklist: re-verificado por QA desde la web.
  3. Checklist: nada nuevo sin historia.
  4. Checklist: el cambio va en su propia rama y PR, con pruebas automáticas (mvn y vitest) en verde y revisión de Seguridad si toca pagos, permisos o datos personales.
  5. Dado que el PR está aprobado, cuando se quiere subir a producción, entonces solo se despliega con la aprobación manual de HOT_CLICK, con pg_dump y etiqueta de vuelta atrás hechos antes.
  6. Checklist: ningún secreto, llave ni dato personal queda en el código o en los logs, y ningún monto queda escrito en el código (sale del plan o de la configuración).
  7. Dado el cambio en staging, cuando QA lo prueba desde el navegador a 390 y 1440 px, entonces no hay errores 500 ni textos «[PENDIENTE]» en las pantallas tocadas.

#### S6-08 · Interruptor ONVO por tienda en producción
- **Historia:** Como dueño de HotClick quiero encender ONVO solo para la tienda piloto para salir de a poco y apagar rápido.
- **Responsable:** Desarrollador
- **Prioridad:** P0 · **Puntos:** 2
- **Dependencias:** S2-14 (Interruptores de pasarela por capacidad y por negocio)
- **Criterios de aceptación:**
  1. Checklist: por tienda.
  2. Checklist: apagado vuelve a efectivo y contra entrega.
  3. Checklist: cambio auditado.
  4. Checklist: el cambio va en su propia rama y PR, con pruebas automáticas (mvn y vitest) en verde y revisión de Seguridad si toca pagos, permisos o datos personales.
  5. Dado que el PR está aprobado, cuando se quiere subir a producción, entonces solo se despliega con la aprobación manual de HOT_CLICK, con pg_dump y etiqueta de vuelta atrás hechos antes.
  6. Checklist: ningún secreto, llave ni dato personal queda en el código o en los logs, y ningún monto queda escrito en el código (sale del plan o de la configuración).
  7. Dado el cambio en staging, cuando QA lo prueba desde el navegador a 390 y 1440 px, entonces no hay errores 500 ni textos «[PENDIENTE]» en las pantallas tocadas.

#### S6-09 · Recrear la tienda piloto en live
- **Historia:** Como admin de HotClick quiero registrar la tienda piloto en ONVO live con el botón del admin para cobrar de verdad.
- **Responsable:** Desarrollador
- **Prioridad:** P0 · **Puntos:** 2
- **Dependencias:** S6-02 (Llaves live de ONVO); S3-04 (Elegir la tienda piloto de ONVO)
- **Criterios de aceptación:**
  1. Checklist: las cuentas de prueba no migran.
  2. Checklist: la tienda completa KYC e IBAN en live.
  3. Checklist: % y frecuencia configurados.
  4. Checklist: el cambio va en su propia rama y PR, con pruebas automáticas (mvn y vitest) en verde y revisión de Seguridad si toca pagos, permisos o datos personales.
  5. Dado que el PR está aprobado, cuando se quiere subir a producción, entonces solo se despliega con la aprobación manual de HOT_CLICK, con pg_dump y etiqueta de vuelta atrás hechos antes.
  6. Checklist: ningún secreto, llave ni dato personal queda en el código o en los logs, y ningún monto queda escrito en el código (sale del plan o de la configuración).
  7. Dado el cambio en staging, cuando QA lo prueba desde el navegador a 390 y 1440 px, entonces no hay errores 500 ni textos «[PENDIENTE]» en las pantallas tocadas.

#### S6-10 · Rebasar chore/quitar-tilopay sobre ONVO
- **Historia:** Como equipo quiero actualizar el PR de quitar Tilopay sobre la rama con ONVO para tenerlo listo sin conflictos.
- **Responsable:** Desarrollador
- **Prioridad:** P1 · **Puntos:** 3
- **Dependencias:** S6-04 (Decidir cuándo se despliega la salida de Tilopay)
- **Criterios de aceptación:**
  1. Checklist: checkout sin proveedor se rechaza; tarjeta y planes van por ONVO.
  2. Checklist: POS QR conectado a ONVO o según decisión.
  3. Checklist: PR aparte y no se despliega hasta que ONVO funcione y HOT_CLICK apruebe.
  4. Checklist: el cambio va en su propia rama y PR, con pruebas automáticas (mvn y vitest) en verde y revisión de Seguridad si toca pagos, permisos o datos personales.
  5. Dado que el PR está aprobado, cuando se quiere subir a producción, entonces solo se despliega con la aprobación manual de HOT_CLICK, con pg_dump y etiqueta de vuelta atrás hechos antes.
  6. Checklist: ningún secreto, llave ni dato personal queda en el código o en los logs, y ningún monto queda escrito en el código (sale del plan o de la configuración).
  7. Dado el cambio en staging, cuando QA lo prueba desde el navegador a 390 y 1440 px, entonces no hay errores 500 ni textos «[PENDIENTE]» en las pantallas tocadas.

#### S6-11 · Textos e i18n sin Tilopay
- **Historia:** Como equipo quiero quitar Tilopay de textos, i18n y docs (menos las migraciones históricas) para no confundir a nadie.
- **Responsable:** Desarrollador
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** S6-10 (Rebasar chore/quitar-tilopay sobre ONVO)
- **Criterios de aceptación:**
  1. Checklist: README, .env.example y legales actualizados.
  2. Checklist: etiqueta de pedidos históricos conservada.
  3. Checklist: amenazas-activas.md actualizado.
  4. Checklist: el cambio va en su propia rama y PR, con pruebas automáticas (mvn y vitest) en verde y revisión de Seguridad si toca pagos, permisos o datos personales.
  5. Dado que el PR está aprobado, cuando se quiere subir a producción, entonces solo se despliega con la aprobación manual de HOT_CLICK, con pg_dump y etiqueta de vuelta atrás hechos antes.
  6. Checklist: ningún secreto, llave ni dato personal queda en el código o en los logs, y ningún monto queda escrito en el código (sale del plan o de la configuración).
  7. Dado el cambio en staging, cuando QA lo prueba desde el navegador a 390 y 1440 px, entonces no hay errores 500 ni textos «[PENDIENTE]» en las pantallas tocadas.

#### S6-12 · Rendimiento de la portada, segunda pasada
- **Historia:** Como comprador quiero que la portada cargue rápido en el teléfono para comprar sin esperar.
- **Responsable:** Desarrollador
- **Prioridad:** P1 · **Puntos:** 5
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: Lighthouse móvil con meta acordada con HOT_CLICK.
  2. Checklist: LCP medido antes y después.
  3. Checklist: sin romper el carrusel.
  4. Checklist: el cambio va en su propia rama y PR, con pruebas automáticas (mvn y vitest) en verde y revisión de Seguridad si toca pagos, permisos o datos personales.
  5. Dado que el PR está aprobado, cuando se quiere subir a producción, entonces solo se despliega con la aprobación manual de HOT_CLICK, con pg_dump y etiqueta de vuelta atrás hechos antes.
  6. Checklist: ningún secreto, llave ni dato personal queda en el código o en los logs, y ningún monto queda escrito en el código (sale del plan o de la configuración).
  7. Dado el cambio en staging, cuando QA lo prueba desde el navegador a 390 y 1440 px, entonces no hay errores 500 ni textos «[PENDIENTE]» en las pantallas tocadas.

#### S6-13 · Sitemap y SEO básico (INF-10)
- **Historia:** Como comprador quiero un sitemap y metadatos correctos para que me encuentren en buscadores.
- **Responsable:** Desarrollador
- **Prioridad:** P2 · **Puntos:** 2
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: sitemap.xml con tiendas aprobadas y productos visibles.
  2. Checklist: nada de tiendas pendientes.
  3. Checklist: sin Meta Pixel.
  4. Checklist: el cambio va en su propia rama y PR, con pruebas automáticas (mvn y vitest) en verde y revisión de Seguridad si toca pagos, permisos o datos personales.
  5. Dado que el PR está aprobado, cuando se quiere subir a producción, entonces solo se despliega con la aprobación manual de HOT_CLICK, con pg_dump y etiqueta de vuelta atrás hechos antes.
  6. Checklist: ningún secreto, llave ni dato personal queda en el código o en los logs, y ningún monto queda escrito en el código (sale del plan o de la configuración).
  7. Dado el cambio en staging, cuando QA lo prueba desde el navegador a 390 y 1440 px, entonces no hay errores 500 ni textos «[PENDIENTE]» en las pantallas tocadas.

#### S6-14 · Accesibilidad (LAN-8)
- **Historia:** Como comprador quiero arreglar contraste y el error crítico de aria para que todos puedan usar el sitio.
- **Responsable:** Desarrollador
- **Prioridad:** P2 · **Puntos:** 2
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: contraste AA.
  2. Checklist: sin errores críticos en el escaneo.
  3. Checklist: probado con lector de pantalla.
  4. Checklist: el cambio va en su propia rama y PR, con pruebas automáticas (mvn y vitest) en verde y revisión de Seguridad si toca pagos, permisos o datos personales.
  5. Dado que el PR está aprobado, cuando se quiere subir a producción, entonces solo se despliega con la aprobación manual de HOT_CLICK, con pg_dump y etiqueta de vuelta atrás hechos antes.
  6. Checklist: ningún secreto, llave ni dato personal queda en el código o en los logs, y ningún monto queda escrito en el código (sale del plan o de la configuración).
  7. Dado el cambio en staging, cuando QA lo prueba desde el navegador a 390 y 1440 px, entonces no hay errores 500 ni textos «[PENDIENTE]» en las pantallas tocadas.

#### S6-15 · Diseño técnico del modo automático de facturación
- **Historia:** Como admin de HotClick quiero un diseño técnico del modo automático (FACBOX por API o conexión propia) como borrador que el admin aprueba para prepararlo sin construirlo.
- **Responsable:** Desarrollador
- **Prioridad:** P2 · **Puntos:** 3
- **Dependencias:** S6-05 (Arrancar el piloto de facturación manual)
- **Criterios de aceptación:**
  1. Checklist: solo documento, sin código.
  2. Checklist: opciones con costo «monto a definir por HOT_CLICK».
  3. Checklist: se construye solo con decisión de HOT_CLICK y flujo manual probado.
  4. Checklist: el cambio va en su propia rama y PR, con pruebas automáticas (mvn y vitest) en verde y revisión de Seguridad si toca pagos, permisos o datos personales.
  5. Dado que el PR está aprobado, cuando se quiere subir a producción, entonces solo se despliega con la aprobación manual de HOT_CLICK, con pg_dump y etiqueta de vuelta atrás hechos antes.
  6. Checklist: ningún secreto, llave ni dato personal queda en el código o en los logs, y ningún monto queda escrito en el código (sale del plan o de la configuración).
  7. Dado el cambio en staging, cuando QA lo prueba desde el navegador a 390 y 1440 px, entonces no hay errores 500 ni textos «[PENDIENTE]» en las pantallas tocadas.

#### S6-16 · Arreglos menores pendientes
- **Historia:** Como equipo quiero cerrar CMP-4, page gigante, ServiceWorker, 405 en vez de 403 y textos mal codificados para limpiar deuda chica.
- **Responsable:** Desarrollador
- **Prioridad:** P2 · **Puntos:** 2
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: cada ítem con prueba.
  2. Checklist: verificado por QA.
  3. Checklist: sin cambios de comportamiento inesperados.
  4. Checklist: el cambio va en su propia rama y PR, con pruebas automáticas (mvn y vitest) en verde y revisión de Seguridad si toca pagos, permisos o datos personales.
  5. Dado que el PR está aprobado, cuando se quiere subir a producción, entonces solo se despliega con la aprobación manual de HOT_CLICK, con pg_dump y etiqueta de vuelta atrás hechos antes.
  6. Checklist: ningún secreto, llave ni dato personal queda en el código o en los logs, y ningún monto queda escrito en el código (sale del plan o de la configuración).
  7. Dado el cambio en staging, cuando QA lo prueba desde el navegador a 390 y 1440 px, entonces no hay errores 500 ni textos «[PENDIENTE]» en las pantallas tocadas.

#### S6-17 · Admin «Revisar» (HANDOFF de Diseño)
- **Historia:** Como admin de HotClick quiero la pantalla «Revisar» del admin en un PR aparte para moderar más rápido.
- **Responsable:** Desarrollador
- **Prioridad:** P2 · **Puntos:** 2
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: según HANDOFF.
  2. Checklist: PR aparte.
  3. Checklist: QA desde la web.
  4. Checklist: el cambio va en su propia rama y PR, con pruebas automáticas (mvn y vitest) en verde y revisión de Seguridad si toca pagos, permisos o datos personales.
  5. Dado que el PR está aprobado, cuando se quiere subir a producción, entonces solo se despliega con la aprobación manual de HOT_CLICK, con pg_dump y etiqueta de vuelta atrás hechos antes.
  6. Checklist: ningún secreto, llave ni dato personal queda en el código o en los logs, y ningún monto queda escrito en el código (sale del plan o de la configuración).
  7. Dado el cambio en staging, cuando QA lo prueba desde el navegador a 390 y 1440 px, entonces no hay errores 500 ni textos «[PENDIENTE]» en las pantallas tocadas.

#### S6-18 · Tablero de comisión cobrada por plan
- **Historia:** Como dueño de HotClick quiero un tablero de comisión cobrada por plan solo con datos reales para seguir ingresos.
- **Responsable:** Desarrollador
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: solo datos reales.
  2. Checklist: por semana y por plan.
  3. Checklist: acceso solo admin y Finanzas.
  4. Checklist: el cambio va en su propia rama y PR, con pruebas automáticas (mvn y vitest) en verde y revisión de Seguridad si toca pagos, permisos o datos personales.
  5. Dado que el PR está aprobado, cuando se quiere subir a producción, entonces solo se despliega con la aprobación manual de HOT_CLICK, con pg_dump y etiqueta de vuelta atrás hechos antes.
  6. Checklist: ningún secreto, llave ni dato personal queda en el código o en los logs, y ningún monto queda escrito en el código (sale del plan o de la configuración).
  7. Dado el cambio en staging, cuando QA lo prueba desde el navegador a 390 y 1440 px, entonces no hay errores 500 ni textos «[PENDIENTE]» en las pantallas tocadas.

### Sprint 6 · Diseño / UX (Figma)

#### S6-19 · Revisión visual final
- **Historia:** Como dueño de HotClick quiero revisar todas las pantallas ONVO y de facturación para lanzar con calidad.
- **Responsable:** Diseño / UX (Figma)
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: 390 y 1440.
  2. Checklist: lista de ajustes cerrada.
  3. Checklist: modo oscuro si aplica.
  4. Checklist: el diseño está en Figma con marcos a 390 y 1440 px y notas de entrega para el Desarrollador.
  5. Checklist: contraste AA, foco visible y una sola llamada a la acción roja por pantalla.
  6. Checklist: los textos no inventan montos; donde falta uno dice «monto a definir por HOT_CLICK».
  7. Dado el boceto terminado, cuando lo revisan Producto y HOT_CLICK, entonces queda aprobado por escrito o con la lista de cambios anotada.

#### S6-20 · Banner «Ya podés cobrar en línea»
- **Historia:** Como vendedor quiero un banner que aparezca cuando mi cuenta está activa para enterarme de la novedad.
- **Responsable:** Diseño / UX (Figma)
- **Prioridad:** P2 · **Puntos:** 1
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: solo si la tienda está activa.
  2. Checklist: se puede cerrar.
  3. Checklist: no tapa botones.
  4. Checklist: el diseño está en Figma con marcos a 390 y 1440 px y notas de entrega para el Desarrollador.
  5. Checklist: contraste AA, foco visible y una sola llamada a la acción roja por pantalla.
  6. Checklist: los textos no inventan montos; donde falta uno dice «monto a definir por HOT_CLICK».
  7. Dado el boceto terminado, cuando lo revisan Producto y HOT_CLICK, entonces queda aprobado por escrito o con la lista de cambios anotada.

#### S6-21 · Página de envíos
- **Historia:** Como comprador quiero la página de envíos según la decisión de HOT_CLICK para saber costos y tiempos.
- **Responsable:** Diseño / UX (Figma)
- **Prioridad:** P2 · **Puntos:** 1
- **Dependencias:** S4-04 (Confirmar las tarifas de envío y la página de envíos (DIS-3))
- **Criterios de aceptación:**
  1. Checklist: tarifas según decisión.
  2. Checklist: contra entrega explicada.
  3. Checklist: enlace desde el checkout.
  4. Checklist: el diseño está en Figma con marcos a 390 y 1440 px y notas de entrega para el Desarrollador.
  5. Checklist: contraste AA, foco visible y una sola llamada a la acción roja por pantalla.
  6. Checklist: los textos no inventan montos; donde falta uno dice «monto a definir por HOT_CLICK».
  7. Dado el boceto terminado, cuando lo revisan Producto y HOT_CLICK, entonces queda aprobado por escrito o con la lista de cambios anotada.

#### S6-22 · Pantallas sin Tilopay
- **Historia:** Como vendedor quiero revisar que ninguna pantalla muestre Tilopay para no confundir.
- **Responsable:** Diseño / UX (Figma)
- **Prioridad:** P2 · **Puntos:** 1
- **Dependencias:** S6-10 (Rebasar chore/quitar-tilopay sobre ONVO)
- **Criterios de aceptación:**
  1. Checklist: revisión completa.
  2. Checklist: capturas.
  3. Checklist: lista al Desarrollador.
  4. Checklist: el diseño está en Figma con marcos a 390 y 1440 px y notas de entrega para el Desarrollador.
  5. Checklist: contraste AA, foco visible y una sola llamada a la acción roja por pantalla.
  6. Checklist: los textos no inventan montos; donde falta uno dice «monto a definir por HOT_CLICK».
  7. Dado el boceto terminado, cuando lo revisan Producto y HOT_CLICK, entonces queda aprobado por escrito o con la lista de cambios anotada.

#### S6-23 · Kit visual de lanzamiento
- **Historia:** Como dueño de HotClick quiero piezas visuales para anunciar los pagos en línea para comunicar con una sola imagen.
- **Responsable:** Diseño / UX (Figma)
- **Prioridad:** P2 · **Puntos:** 1
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: sin montos inventados.
  2. Checklist: aprobado por HOT_CLICK.
  3. Checklist: sin Meta Pixel ni promesas de WhatsApp API.
  4. Checklist: el diseño está en Figma con marcos a 390 y 1440 px y notas de entrega para el Desarrollador.
  5. Checklist: contraste AA, foco visible y una sola llamada a la acción roja por pantalla.
  6. Checklist: los textos no inventan montos; donde falta uno dice «monto a definir por HOT_CLICK».
  7. Dado el boceto terminado, cuando lo revisan Producto y HOT_CLICK, entonces queda aprobado por escrito o con la lista de cambios anotada.

### Sprint 6 · QA (calidad)

#### S6-24 · Informe QA integral «listo/no listo»
- **Historia:** Como dueño de HotClick quiero un informe con veredicto listo o no listo para la salida para decidir con evidencia.
- **Responsable:** QA (calidad)
- **Prioridad:** P0 · **Puntos:** 5
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: cubre compradores, negocios, admin, POS, pagos, reembolsos, facturación y legales.
  2. Checklist: criterios de salida del plan de QA.
  3. Checklist: bugs abiertos con prioridad.
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/calidad/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

#### S6-25 · Smoke en producción después de la salida
- **Historia:** Como equipo quiero un smoke en producción con la tienda piloto para confirmar que live funciona.
- **Responsable:** QA (calidad)
- **Prioridad:** P0 · **Puntos:** 2
- **Dependencias:** S6-03 (OK para la primera venta real)
- **Criterios de aceptación:**
  1. Checklist: compra real mínima solo con OK de HOT_CLICK.
  2. Checklist: verificación del pedido y del correo.
  3. Checklist: informe en la primera hora.
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/calidad/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

#### S6-26 · Regresión de efectivo y contra entrega
- **Historia:** Como equipo quiero confirmar que efectivo y contra entrega siguen funcionando para que nada viejo se rompa.
- **Responsable:** QA (calidad)
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: tienda sin ONVO.
  2. Checklist: tienda con ONVO apagado.
  3. Checklist: capturas.
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/calidad/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

#### S6-27 · Prueba del PR de quitar Tilopay en staging
- **Historia:** Como equipo quiero probar desde la web el PR de quitar Tilopay en staging para que no falte nada.
- **Responsable:** QA (calidad)
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** S6-10 (Rebasar chore/quitar-tilopay sobre ONVO)
- **Criterios de aceptación:**
  1. Checklist: checkout, planes y POS QR.
  2. Checklist: mensajes claros donde no hay pasarela.
  3. Checklist: pedidos históricos se ven bien.
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/calidad/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

#### S6-28 · Piloto de facturación: primera semana
- **Historia:** Como equipo quiero acompañar desde la web la primera semana del piloto de facturación para detectar fallas temprano.
- **Responsable:** QA (calidad)
- **Prioridad:** P1 · **Puntos:** 1
- **Dependencias:** S6-05 (Arrancar el piloto de facturación manual)
- **Criterios de aceptación:**
  1. Checklist: revisa la bitácora del admin.
  2. Checklist: comprobantes enviados a compradores.
  3. Checklist: informe.
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/calidad/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

### Sprint 6 · QA Compradores

#### S6-29 · Compra real en la tienda piloto
- **Historia:** Como comprador quiero hacer la compra real autorizada en la tienda piloto para confirmar el flujo en vivo.
- **Responsable:** QA Compradores
- **Prioridad:** P0 · **Puntos:** 2
- **Dependencias:** S6-03 (OK para la primera venta real)
- **Criterios de aceptación:**
  1. Checklist: solo con OK escrito de HOT_CLICK.
  2. Checklist: pedido pagado y correo recibido.
  3. Checklist: capturas.
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/compradores/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

#### S6-30 · Recorrido completo del comprador en producción
- **Historia:** Como comprador quiero recorrer búsqueda, ficha, carrito, checkout, mis pedidos y reembolso (sin pagar salvo OK) para ver el sitio como lo verá el público.
- **Responsable:** QA Compradores
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: 390 y 1440.
  2. Checklist: sin «[PENDIENTE]».
  3. Checklist: tiempos anotados.
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/compradores/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

#### S6-31 · Compra en tienda sin ONVO
- **Historia:** Como comprador quiero comprar en una tienda que no tiene ONVO activo para confirmar que hay opciones.
- **Responsable:** QA Compradores
- **Prioridad:** P1 · **Puntos:** 1
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: efectivo o contra entrega.
  2. Checklist: mensaje claro.
  3. Checklist: pedido creado.
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/compradores/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

#### S6-32 · Rendimiento percibido final
- **Historia:** Como comprador quiero medir la portada desde el teléfono después de las mejoras para confirmar la mejora.
- **Responsable:** QA Compradores
- **Prioridad:** P2 · **Puntos:** 1
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: antes y después.
  2. Checklist: 4G simulado.
  3. Checklist: capturas.
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/compradores/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

#### S6-33 · Accesibilidad básica
- **Historia:** Como comprador quiero recorrer el checkout solo con teclado para que funcione para todos.
- **Responsable:** QA Compradores
- **Prioridad:** P2 · **Puntos:** 1
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: foco visible.
  2. Checklist: orden lógico.
  3. Checklist: botones con nombre.
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/compradores/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

### Sprint 6 · QA Negocios

#### S6-34 · Tienda piloto activa en live
- **Historia:** Como vendedor piloto quiero ver mi cuenta activa y mi primera venta en línea para empezar a cobrar.
- **Responsable:** QA Negocios
- **Prioridad:** P0 · **Puntos:** 2
- **Dependencias:** S6-09 (Recrear la tienda piloto en live)
- **Criterios de aceptación:**
  1. Checklist: estado Activa.
  2. Checklist: venta en el panel con bruto, comisión y neto.
  3. Checklist: frecuencia y US$3 visibles.
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/negocios/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

#### S6-35 · Recorrido completo del negocio en producción
- **Historia:** Como vendedor quiero recorrer registro, productos, POS, pedidos y panel de ventas para ver el panel como lo verán los negocios.
- **Responsable:** QA Negocios
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: los tres planes.
  2. Checklist: sin datos demo.
  3. Checklist: 390 y 1440.
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/negocios/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

#### S6-36 · Pausa en producción
- **Historia:** Como vendedor quiero confirmar que «Pausar cobros» funciona en producción con una tienda QA-TEST para tener el freno listo.
- **Responsable:** QA Negocios
- **Prioridad:** P1 · **Puntos:** 1
- **Dependencias:** S3-10 («Pausar cobros» como bloqueo de HotClick)
- **Criterios de aceptación:**
  1. Checklist: pausa y reanuda.
  2. Checklist: comprador sin pago en línea durante la pausa.
  3. Checklist: capturas.
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/negocios/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

#### S6-37 · Banner de cobros activos
- **Historia:** Como vendedor quiero ver el banner «Ya podés cobrar en línea» solo si estoy activo para no confundirme.
- **Responsable:** QA Negocios
- **Prioridad:** P2 · **Puntos:** 1
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: aparece si activa.
  2. Checklist: no aparece si pendiente.
  3. Checklist: se cierra.
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/negocios/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

#### S6-38 · Sin Tilopay en el panel
- **Historia:** Como vendedor quiero revisar que el panel no mencione Tilopay después del PR para no confundirme.
- **Responsable:** QA Negocios
- **Prioridad:** P2 · **Puntos:** 1
- **Dependencias:** S6-10 (Rebasar chore/quitar-tilopay sobre ONVO)
- **Criterios de aceptación:**
  1. Checklist: Tu Plan, Cobros y POS.
  2. Checklist: capturas.
  3. Checklist: lista al Desarrollador.
  4. Checklist: la prueba se hace solo desde el navegador, como una persona normal: sin código, sin base de datos, sin entrar al servidor y sin llamar a la API directamente.
  5. Checklist: se prueba a 390 px y a 1440 px y las capturas quedan en /workspace/qa/negocios/.
  6. Dado un fallo, cuando se reporta, entonces lleva pasos, resultado actual, resultado esperado y captura, y se asigna al Desarrollador (o a Seguridad si es de seguridad).
  7. Checklist: se usan solo cuentas y datos con prefijo QA-TEST y no se hace ningún pago real sin el OK escrito de HOT_CLICK.

### Sprint 6 · QA Automatización y Regresión

#### S6-39 · Suite de regresión prioridad 1 y 2 estable
- **Historia:** Como equipo quiero la suite de regresión web de prioridad 1 y 2 estable para evitar regresiones.
- **Responsable:** QA Automatización y Regresión
- **Prioridad:** P0 · **Puntos:** 3
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: sin datos reales.
  2. Checklist: menos de 1 inestable por corrida.
  3. Checklist: el Desarrollador la integra al CI con el resultado visible en cada PR.
  4. Checklist: el guion solo maneja el navegador (clics, formularios y lectura de pantalla); no llama a la API, no toca la base de datos ni el servidor y no modifica el código del repo.
  5. Checklist: el guion vive en /workspace/qa/regresion/ y corre a 390 y 1440 px, con captura de cada paso que falle.
  6. Dado tres corridas seguidas sin cambios en el sitio, cuando se comparan, entonces dan el mismo resultado (menos de 1 prueba inestable por corrida).
  7. Checklist: el resultado (verde o rojo, con la lista de fallos) queda en un informe fechado y los fallos se reportan al Desarrollador.

#### S6-40 · Smoke de producción automático tras la salida
- **Historia:** Como equipo quiero el smoke automático corriendo después del deploy de go-live para confirmar en minutos.
- **Responsable:** QA Automatización y Regresión
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** S6-01 (OK de go-live con ONVO)
- **Criterios de aceptación:**
  1. Checklist: sin pagar.
  2. Checklist: resultado a Grok Bot.
  3. Checklist: recomienda volver atrás si falla.
  4. Checklist: el guion solo maneja el navegador (clics, formularios y lectura de pantalla); no llama a la API, no toca la base de datos ni el servidor y no modifica el código del repo.
  5. Checklist: el guion vive en /workspace/qa/regresion/ y corre a 390 y 1440 px, con captura de cada paso que falle.
  6. Dado tres corridas seguidas sin cambios en el sitio, cuando se comparan, entonces dan el mismo resultado (menos de 1 prueba inestable por corrida).
  7. Checklist: el resultado (verde o rojo, con la lista de fallos) queda en un informe fechado y los fallos se reportan al Desarrollador.

#### S6-41 · Regresión del PR de quitar Tilopay
- **Historia:** Como equipo quiero correr la regresión completa contra staging con el PR de Tilopay para detectar roturas.
- **Responsable:** QA Automatización y Regresión
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** S6-10 (Rebasar chore/quitar-tilopay sobre ONVO)
- **Criterios de aceptación:**
  1. Checklist: checkout, planes y POS.
  2. Checklist: informe.
  3. Checklist: staging.
  4. Checklist: el guion solo maneja el navegador (clics, formularios y lectura de pantalla); no llama a la API, no toca la base de datos ni el servidor y no modifica el código del repo.
  5. Checklist: el guion vive en /workspace/qa/regresion/ y corre a 390 y 1440 px, con captura de cada paso que falle.
  6. Dado tres corridas seguidas sin cambios en el sitio, cuando se comparan, entonces dan el mismo resultado (menos de 1 prueba inestable por corrida).
  7. Checklist: el resultado (verde o rojo, con la lista de fallos) queda en un informe fechado y los fallos se reportan al Desarrollador.

#### S6-42 · Corrida semanal en producción
- **Historia:** Como equipo quiero una corrida semanal de solo lectura en producción para vigilar sin molestar.
- **Responsable:** QA Automatización y Regresión
- **Prioridad:** P2 · **Puntos:** 1
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: sin crear pedidos.
  2. Checklist: navegación y búsquedas.
  3. Checklist: informe.
  4. Checklist: el guion solo maneja el navegador (clics, formularios y lectura de pantalla); no llama a la API, no toca la base de datos ni el servidor y no modifica el código del repo.
  5. Checklist: el guion vive en /workspace/qa/regresion/ y corre a 390 y 1440 px, con captura de cada paso que falle.
  6. Dado tres corridas seguidas sin cambios en el sitio, cuando se comparan, entonces dan el mismo resultado (menos de 1 prueba inestable por corrida).
  7. Checklist: el resultado (verde o rojo, con la lista de fallos) queda en un informe fechado y los fallos se reportan al Desarrollador.

#### S6-43 · Manual de la regresión
- **Historia:** Como equipo quiero un manual corto de cómo correr y leer la regresión para que cualquiera la use.
- **Responsable:** QA Automatización y Regresión
- **Prioridad:** P2 · **Puntos:** 1
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: pasos.
  2. Checklist: cómo leer fallos.
  3. Checklist: dónde están los informes.
  4. Checklist: el guion solo maneja el navegador (clics, formularios y lectura de pantalla); no llama a la API, no toca la base de datos ni el servidor y no modifica el código del repo.
  5. Checklist: el guion vive en /workspace/qa/regresion/ y corre a 390 y 1440 px, con captura de cada paso que falle.
  6. Dado tres corridas seguidas sin cambios en el sitio, cuando se comparan, entonces dan el mismo resultado (menos de 1 prueba inestable por corrida).
  7. Checklist: el resultado (verde o rojo, con la lista de fallos) queda en un informe fechado y los fallos se reportan al Desarrollador.

### Sprint 6 · Seguridad

#### S6-44 · Auditoría final de pagos y datos
- **Historia:** Como dueño de HotClick quiero una auditoría final de pagos, webhooks, secretos, PCI, facturación y datos personales para salir sin riesgos altos.
- **Responsable:** Seguridad
- **Prioridad:** P0 · **Puntos:** 3
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: cero hallazgos altos o críticos.
  2. Checklist: #123 cerrado y Google key rotada verificados.
  3. Checklist: gitleaks y osv-scanner en verde.
  4. Checklist: informe corto en /workspace/seguridad/ con cada hallazgo, su gravedad (crítico, alto, medio o bajo) y el arreglo propuesto.
  5. Dado el informe, cuando se cierra la historia, entonces no queda ningún hallazgo crítico ni alto abierto sin plan y sin dueño.
  6. Checklist: no se hacen ataques ni pruebas destructivas en producción; lo que se prueba en vivo se hace con cuentas QA-TEST y con OK de HOT_CLICK.
  7. Checklist: ninguna llave, secreto ni dato personal se copia al informe ni al chat.

#### S6-45 · Rotar y cargar llaves live
- **Historia:** Como dueño de HotClick quiero verificar la carga de llaves live y secreto del webhook para empezar limpio en producción.
- **Responsable:** Seguridad
- **Prioridad:** P0 · **Puntos:** 2
- **Dependencias:** S6-02 (Llaves live de ONVO)
- **Criterios de aceptación:**
  1. Checklist: por solicitud de secreto.
  2. Checklist: llaves de prueba fuera de producción.
  3. Checklist: arranque falla si el modo no coincide.
  4. Checklist: informe corto en /workspace/seguridad/ con cada hallazgo, su gravedad (crítico, alto, medio o bajo) y el arreglo propuesto.
  5. Dado el informe, cuando se cierra la historia, entonces no queda ningún hallazgo crítico ni alto abierto sin plan y sin dueño.
  6. Checklist: no se hacen ataques ni pruebas destructivas en producción; lo que se prueba en vivo se hace con cuentas QA-TEST y con OK de HOT_CLICK.
  7. Checklist: ninguna llave, secreto ni dato personal se copia al informe ni al chat.

#### S6-46 · Revocar credenciales de Tilopay
- **Historia:** Como dueño de HotClick quiero planificar la revocación de credenciales de Tilopay para cerrar la superficie vieja.
- **Responsable:** Seguridad
- **Prioridad:** P1 · **Puntos:** 1
- **Dependencias:** S6-10 (Rebasar chore/quitar-tilopay sobre ONVO)
- **Criterios de aceptación:**
  1. Checklist: solo después del deploy del PR de Tilopay.
  2. Checklist: lista de variables a borrar del servidor.
  3. Checklist: HOT_CLICK revoca en el panel de Tilopay.
  4. Checklist: informe corto en /workspace/seguridad/ con cada hallazgo, su gravedad (crítico, alto, medio o bajo) y el arreglo propuesto.
  5. Dado el informe, cuando se cierra la historia, entonces no queda ningún hallazgo crítico ni alto abierto sin plan y sin dueño.
  6. Checklist: no se hacen ataques ni pruebas destructivas en producción; lo que se prueba en vivo se hace con cuentas QA-TEST y con OK de HOT_CLICK.
  7. Checklist: ninguna llave, secreto ni dato personal se copia al informe ni al chat.

#### S6-47 · Revisión post-salida
- **Historia:** Como dueño de HotClick quiero revisar logs y alertas la primera semana para detectar abusos temprano.
- **Responsable:** Seguridad
- **Prioridad:** P1 · **Puntos:** 1
- **Dependencias:** S6-01 (OK de go-live con ONVO)
- **Criterios de aceptación:**
  1. Checklist: webhooks con secreto inválido.
  2. Checklist: intentos de pago anómalos.
  3. Checklist: informe.
  4. Checklist: informe corto en /workspace/seguridad/ con cada hallazgo, su gravedad (crítico, alto, medio o bajo) y el arreglo propuesto.
  5. Dado el informe, cuando se cierra la historia, entonces no queda ningún hallazgo crítico ni alto abierto sin plan y sin dueño.
  6. Checklist: no se hacen ataques ni pruebas destructivas en producción; lo que se prueba en vivo se hace con cuentas QA-TEST y con OK de HOT_CLICK.
  7. Checklist: ninguna llave, secreto ni dato personal se copia al informe ni al chat.

#### S6-48 · Plan de respuesta a incidentes
- **Historia:** Como dueño de HotClick quiero un plan corto de qué hacer ante un incidente de pagos o datos para reaccionar ordenado.
- **Responsable:** Seguridad
- **Prioridad:** P2 · **Puntos:** 1
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: quién decide.
  2. Checklist: cómo pausar cobros.
  3. Checklist: plazos legales de aviso.
  4. Checklist: informe corto en /workspace/seguridad/ con cada hallazgo, su gravedad (crítico, alto, medio o bajo) y el arreglo propuesto.
  5. Dado el informe, cuando se cierra la historia, entonces no queda ningún hallazgo crítico ni alto abierto sin plan y sin dueño.
  6. Checklist: no se hacen ataques ni pruebas destructivas en producción; lo que se prueba en vivo se hace con cuentas QA-TEST y con OK de HOT_CLICK.
  7. Checklist: ninguna llave, secreto ni dato personal se copia al informe ni al chat.

### Sprint 6 · DevOps y Seguridad

#### S6-49 · Plan de salida con vuelta atrás
- **Historia:** Como dueño de HotClick quiero un plan de salida con pg_dump verificado, etiqueta, health check y smoke para poder volver atrás.
- **Responsable:** DevOps y Seguridad
- **Prioridad:** P0 · **Puntos:** 3
- **Dependencias:** S2-64 (Vuelta atrás por etiqueta ensayada)
- **Criterios de aceptación:**
  1. Checklist: lista firmada por QA y Seguridad.
  2. Checklist: deploy solo con la aprobación manual de HOT_CLICK.
  3. Checklist: tiempo de vuelta atrás medido en el ensayo.
  4. Checklist: el cambio queda documentado en un runbook en /workspace/infra/ con los pasos para hacerlo y para deshacerlo.
  5. Dado cualquier paso que toque producción, cuando está listo, entonces espera la aprobación manual de HOT_CLICK antes de ejecutarse.
  6. Checklist: los secretos se guardan en los secretos del servidor o de GitHub, nunca en el repo, en el chat ni en los logs.
  7. Dado el cambio aplicado, cuando se revisa el monitoreo, entonces el sitio responde y /api/health está en verde.

#### S6-50 · Deploy de go-live
- **Historia:** Como dueño de HotClick quiero ejecutar el deploy de ONVO a producción en la ventana aprobada para salir en vivo.
- **Responsable:** DevOps y Seguridad
- **Prioridad:** P0 · **Puntos:** 2
- **Dependencias:** S6-01 (OK de go-live con ONVO)
- **Criterios de aceptación:**
  1. Checklist: aprobación manual registrada.
  2. Checklist: interruptor solo para la tienda piloto.
  3. Checklist: monitoreo reforzado por 24 h.
  4. Checklist: el cambio queda documentado en un runbook en /workspace/infra/ con los pasos para hacerlo y para deshacerlo.
  5. Dado cualquier paso que toque producción, cuando está listo, entonces espera la aprobación manual de HOT_CLICK antes de ejecutarse.
  6. Checklist: los secretos se guardan en los secretos del servidor o de GitHub, nunca en el repo, en el chat ni en los logs.
  7. Dado el cambio aplicado, cuando se revisa el monitoreo, entonces el sitio responde y /api/health está en verde.

#### S6-51 · Alertas de pagos en producción
- **Historia:** Como equipo quiero encender las alertas de webhooks y pagos fallidos en producción para reaccionar rápido.
- **Responsable:** DevOps y Seguridad
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** S6-01 (OK de go-live con ONVO)
- **Criterios de aceptación:**
  1. Checklist: alertas a Grok Bot.
  2. Checklist: umbrales.
  3. Checklist: probadas.
  4. Checklist: el cambio queda documentado en un runbook en /workspace/infra/ con los pasos para hacerlo y para deshacerlo.
  5. Dado cualquier paso que toque producción, cuando está listo, entonces espera la aprobación manual de HOT_CLICK antes de ejecutarse.
  6. Checklist: los secretos se guardan en los secretos del servidor o de GitHub, nunca en el repo, en el chat ni en los logs.
  7. Dado el cambio aplicado, cuando se revisa el monitoreo, entonces el sitio responde y /api/health está en verde.

#### S6-52 · Borrar variables de Tilopay (preparado)
- **Historia:** Como equipo quiero dejar listo el paso para borrar las variables de Tilopay del servidor para hacerlo el día del deploy del PR.
- **Responsable:** DevOps y Seguridad
- **Prioridad:** P1 · **Puntos:** 1
- **Dependencias:** S6-10 (Rebasar chore/quitar-tilopay sobre ONVO)
- **Criterios de aceptación:**
  1. Checklist: lista de variables.
  2. Checklist: solo con OK de HOT_CLICK.
  3. Checklist: runbook.
  4. Checklist: el cambio queda documentado en un runbook en /workspace/infra/ con los pasos para hacerlo y para deshacerlo.
  5. Dado cualquier paso que toque producción, cuando está listo, entonces espera la aprobación manual de HOT_CLICK antes de ejecutarse.
  6. Checklist: los secretos se guardan en los secretos del servidor o de GitHub, nunca en el repo, en el chat ni en los logs.
  7. Dado el cambio aplicado, cuando se revisa el monitoreo, entonces el sitio responde y /api/health está en verde.

#### S6-53 · Infraestructura como código para la mudanza (INF-11)
- **Historia:** Como dueño de HotClick quiero un inventario de la infraestructura para una futura mudanza a Google Cloud para no depender de la memoria.
- **Responsable:** DevOps y Seguridad
- **Prioridad:** P2 · **Puntos:** 1
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: inventario de servicios.
  2. Checklist: secretos listados sin valores.
  3. Checklist: sin migrar nada.
  4. Checklist: el cambio queda documentado en un runbook en /workspace/infra/ con los pasos para hacerlo y para deshacerlo.
  5. Dado cualquier paso que toque producción, cuando está listo, entonces espera la aprobación manual de HOT_CLICK antes de ejecutarse.
  6. Checklist: los secretos se guardan en los secretos del servidor o de GitHub, nunca en el repo, en el chat ni en los logs.
  7. Dado el cambio aplicado, cuando se revisa el monitoreo, entonces el sitio responde y /api/health está en verde.

#### S6-54 · Deploy de Admin → Facturación con el interruptor apagado
- **Historia:** Como dueño de HotClick quiero subir a producción la facturación manual con facturacion.automatica apagado para empezar el piloto manual.
- **Responsable:** DevOps y Seguridad
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** S6-05 (Arrancar el piloto de facturación manual)
- **Criterios de aceptación:**
  1. Checklist: solo con la aprobación manual de HOT_CLICK y después de la revisión de Seguridad sin hallazgos altos.
  2. Checklist: smoke: el admin ve «Por facturar» y un usuario de negocio ve acceso denegado.
  3. Checklist: se puede volver atrás con la etiqueta del deploy.
  4. Checklist: el cambio queda documentado en un runbook en /workspace/infra/ con los pasos para hacerlo y para deshacerlo.
  5. Dado cualquier paso que toque producción, cuando está listo, entonces espera la aprobación manual de HOT_CLICK antes de ejecutarse.
  6. Checklist: los secretos se guardan en los secretos del servidor o de GitHub, nunca en el repo, en el chat ni en los logs.
  7. Dado el cambio aplicado, cuando se revisa el monitoreo, entonces el sitio responde y /api/health está en verde.

### Sprint 6 · Producto Contenido y Soporte

#### S6-55 · Guía de lanzamiento y canal de soporte
- **Historia:** Como vendedor piloto quiero una guía de lanzamiento y el canal oficial de soporte para resolver dudas el primer día.
- **Responsable:** Producto Contenido y Soporte
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: horario de soporte según HOT_CLICK.
  2. Checklist: cómo ver ventas, liquidaciones y diferencia semanal.
  3. Checklist: la envía HOT_CLICK.
  4. Checklist: el texto está en español de Costa Rica, con voseo, claro y sin jerga técnica.
  5. Checklist: no inventa montos; usa solo los decididos por HOT_CLICK o dice «monto a definir por HOT_CLICK».
  6. Dado el texto final, cuando HOT_CLICK lo revisa, entonces se publica solo con su aprobación escrita.
  7. Checklist: no promete WhatsApp API, no usa Meta Pixel y no presenta a Tilopay como pasarela vigente una vez que ONVO esté en uso.

#### S6-56 · Publicar los legales aprobados con la salida
- **Historia:** Como dueño de HotClick quiero publicar los legales aprobados el día de la salida para cumplir desde el primer día.
- **Responsable:** Producto Contenido y Soporte
- **Prioridad:** P1 · **Puntos:** 1
- **Dependencias:** S5-55 (Términos, Privacidad, Acuerdo y Devoluciones para ONVO y facturación)
- **Criterios de aceptación:**
  1. Checklist: solo tras OK de HOT_CLICK.
  2. Checklist: versión y fecha visibles.
  3. Checklist: QA verifica lo publicado.
  4. Checklist: el texto está en español de Costa Rica, con voseo, claro y sin jerga técnica.
  5. Checklist: no inventa montos; usa solo los decididos por HOT_CLICK o dice «monto a definir por HOT_CLICK».
  6. Dado el texto final, cuando HOT_CLICK lo revisa, entonces se publica solo con su aprobación escrita.
  7. Checklist: no promete WhatsApp API, no usa Meta Pixel y no presenta a Tilopay como pasarela vigente una vez que ONVO esté en uso.

#### S6-57 · Plantilla de incidentes de pago
- **Historia:** Como soporte quiero una plantilla para comunicar fallas de pago para comunicar igual siempre.
- **Responsable:** Producto Contenido y Soporte
- **Prioridad:** P1 · **Puntos:** 1
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: sin culpar a la tienda.
  2. Checklist: sin exponer datos.
  3. Checklist: aprobada por HOT_CLICK.
  4. Checklist: el texto está en español de Costa Rica, con voseo, claro y sin jerga técnica.
  5. Checklist: no inventa montos; usa solo los decididos por HOT_CLICK o dice «monto a definir por HOT_CLICK».
  6. Dado el texto final, cuando HOT_CLICK lo revisa, entonces se publica solo con su aprobación escrita.
  7. Checklist: no promete WhatsApp API, no usa Meta Pixel y no presenta a Tilopay como pasarela vigente una vez que ONVO esté en uso.

#### S6-58 · Videos con datos tapados (MKT-3 a MKT-7)
- **Historia:** Como dueño de HotClick quiero terminar capturas y videos con las pantallas ya arregladas para publicar contenido confiable.
- **Responsable:** Producto Contenido y Soporte
- **Prioridad:** P2 · **Puntos:** 2
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: solo pantallas sin bugs.
  2. Checklist: sin Tilopay ni datos personales.
  3. Checklist: publicación con OK de HOT_CLICK.
  4. Checklist: el texto está en español de Costa Rica, con voseo, claro y sin jerga técnica.
  5. Checklist: no inventa montos; usa solo los decididos por HOT_CLICK o dice «monto a definir por HOT_CLICK».
  6. Dado el texto final, cuando HOT_CLICK lo revisa, entonces se publica solo con su aprobación escrita.
  7. Checklist: no promete WhatsApp API, no usa Meta Pixel y no presenta a Tilopay como pasarela vigente una vez que ONVO esté en uso.

#### S6-59 · Textos actualizados sin Tilopay
- **Historia:** Como vendedor quiero actualizar los textos que dicen Tilopay cuando ONVO esté vivo para no confundir.
- **Responsable:** Producto Contenido y Soporte
- **Prioridad:** P2 · **Puntos:** 1
- **Dependencias:** S6-10 (Rebasar chore/quitar-tilopay sobre ONVO)
- **Criterios de aceptación:**
  1. Checklist: FAQ, planes y ayuda.
  2. Checklist: capturas nuevas.
  3. Checklist: QA revisa.
  4. Checklist: el texto está en español de Costa Rica, con voseo, claro y sin jerga técnica.
  5. Checklist: no inventa montos; usa solo los decididos por HOT_CLICK o dice «monto a definir por HOT_CLICK».
  6. Dado el texto final, cuando HOT_CLICK lo revisa, entonces se publica solo con su aprobación escrita.
  7. Checklist: no promete WhatsApp API, no usa Meta Pixel y no presenta a Tilopay como pasarela vigente una vez que ONVO esté en uso.

### Sprint 6 · Finanzas

#### S6-60 · Conciliar la primera semana real
- **Historia:** Como dueño de HotClick quiero conciliar la primera semana de la tienda piloto para validar números reales.
- **Responsable:** Finanzas
- **Prioridad:** P0 · **Puntos:** 2
- **Dependencias:** S6-09 (Recrear la tienda piloto en live)
- **Criterios de aceptación:**
  1. Checklist: pedidos, cobros, comisión, diferencia del mínimo y US$3.
  2. Checklist: diferencia cero o explicada.
  3. Checklist: informe a HOT_CLICK por Grok Bot.
  4. Checklist: usa solo montos dados por HOT_CLICK o publicados en las fuentes; cualquier otro dice «monto a definir por HOT_CLICK».
  5. Checklist: la planilla o el informe queda en /workspace/finanzas/ con fecha y la fuente de cada cifra.
  6. Dado una muestra de casos, cuando se recalculan a mano, entonces el resultado cuadra o la diferencia queda explicada.
  7. Dado el resultado, cuando se le entrega a HOT_CLICK por medio de Grok Bot, entonces queda anotada su respuesta o decisión.

#### S6-61 · Bitácora del piloto de facturación
- **Historia:** Como dueño de HotClick quiero llevar con el admin la bitácora del piloto de facturación para saber si funciona.
- **Responsable:** Finanzas
- **Prioridad:** P1 · **Puntos:** 1
- **Dependencias:** S6-05 (Arrancar el piloto de facturación manual)
- **Criterios de aceptación:**
  1. Checklist: comprobantes Aceptados.
  2. Checklist: facturas de negocios al día o cubiertas por acuerdo.
  3. Checklist: seguimiento del tope del régimen simplificado.
  4. Checklist: usa solo montos dados por HOT_CLICK o publicados en las fuentes; cualquier otro dice «monto a definir por HOT_CLICK».
  5. Checklist: la planilla o el informe queda en /workspace/finanzas/ con fecha y la fuente de cada cifra.
  6. Dado una muestra de casos, cuando se recalculan a mano, entonces el resultado cuadra o la diferencia queda explicada.
  7. Dado el resultado, cuando se le entrega a HOT_CLICK por medio de Grok Bot, entonces queda anotada su respuesta o decisión.

#### S6-62 · Costos de pasar a facturación automática
- **Historia:** Como dueño de HotClick quiero comparar costos de FACBOX y conexión propia para decidir más adelante.
- **Responsable:** Finanzas
- **Prioridad:** P2 · **Puntos:** 1
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: solo costos publicados o «monto a definir por HOT_CLICK».
  2. Checklist: pros y contras.
  3. Checklist: sin compromiso de compra.
  4. Checklist: usa solo montos dados por HOT_CLICK o publicados en las fuentes; cualquier otro dice «monto a definir por HOT_CLICK».
  5. Checklist: la planilla o el informe queda en /workspace/finanzas/ con fecha y la fuente de cada cifra.
  6. Dado una muestra de casos, cuando se recalculan a mano, entonces el resultado cuadra o la diferencia queda explicada.
  7. Dado el resultado, cuando se le entrega a HOT_CLICK por medio de Grok Bot, entonces queda anotada su respuesta o decisión.

#### S6-63 · Proyección para el negocio 71 (FIN-2)
- **Historia:** Como dueño de HotClick quiero dejar listo el análisis de la suscripción Emprendedor desde el negocio 71, sin monto para decidir cuando se acaben los 70 cupos.
- **Responsable:** Finanzas
- **Prioridad:** P2 · **Puntos:** 1
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: sin monto («monto a definir por HOT_CLICK»).
  2. Checklist: escenarios.
  3. Checklist: alerta cuando queden pocos cupos.
  4. Checklist: usa solo montos dados por HOT_CLICK o publicados en las fuentes; cualquier otro dice «monto a definir por HOT_CLICK».
  5. Checklist: la planilla o el informe queda en /workspace/finanzas/ con fecha y la fuente de cada cifra.
  6. Dado una muestra de casos, cuando se recalculan a mano, entonces el resultado cuadra o la diferencia queda explicada.
  7. Dado el resultado, cuando se le entrega a HOT_CLICK por medio de Grok Bot, entonces queda anotada su respuesta o decisión.

### Sprint 6 · Consultor

#### S6-64 · Revisión final de preparación para la salida
- **Historia:** Como dueño de HotClick quiero una revisión independiente de que todo lo P0 está cerrado para salir sin cabos sueltos.
- **Responsable:** Consultor
- **Prioridad:** P1 · **Puntos:** 2
- **Dependencias:** S6-24 (Informe QA integral «listo/no listo»)
- **Criterios de aceptación:**
  1. Checklist: cruce con FALTA-100 y este plan.
  2. Checklist: lista de lo que queda abierto.
  3. Checklist: recomendación go o no-go.
  4. Checklist: el informe queda en /workspace/consultor/ y cita archivo y línea de cada afirmación sobre el código.
  5. Checklist: trabajo solo de lectura: no cambia código, no hace push, no despliega y no le escribe a nadie.
  6. Dado cada hallazgo, cuando se entrega, entonces trae prioridad (P0, P1 o P2), dueño sugerido y si necesita una decisión de HOT_CLICK.
  7. Dado el informe, cuando lo lee el Desarrollador, entonces puede convertir cada recomendación en una historia sin tener que preguntar más.

#### S6-65 · Revisión del PR de quitar Tilopay
- **Historia:** Como equipo quiero revisar el PR de Tilopay sobre ONVO para no dejar referencias rotas.
- **Responsable:** Consultor
- **Prioridad:** P1 · **Puntos:** 1
- **Dependencias:** S6-10 (Rebasar chore/quitar-tilopay sobre ONVO)
- **Criterios de aceptación:**
  1. Checklist: rg de Tilopay sin sorpresas.
  2. Checklist: pruebas.
  3. Checklist: plan de deploy.
  4. Checklist: el informe queda en /workspace/consultor/ y cita archivo y línea de cada afirmación sobre el código.
  5. Checklist: trabajo solo de lectura: no cambia código, no hace push, no despliega y no le escribe a nadie.
  6. Dado cada hallazgo, cuando se entrega, entonces trae prioridad (P0, P1 o P2), dueño sugerido y si necesita una decisión de HOT_CLICK.
  7. Dado el informe, cuando lo lee el Desarrollador, entonces puede convertir cada recomendación en una historia sin tener que preguntar más.

#### S6-66 · Retrospectiva de los 6 sprints
- **Historia:** Como dueño de HotClick quiero una retrospectiva de los 6 sprints con lecciones y siguiente backlog para mejorar el próximo ciclo.
- **Responsable:** Consultor
- **Prioridad:** P2 · **Puntos:** 1
- **Dependencias:** Ninguna
- **Criterios de aceptación:**
  1. Checklist: qué funcionó y qué no.
  2. Checklist: backlog siguiente priorizado.
  3. Checklist: entregada a HOT_CLICK.
  4. Checklist: el informe queda en /workspace/consultor/ y cita archivo y línea de cada afirmación sobre el código.
  5. Checklist: trabajo solo de lectura: no cambia código, no hace push, no despliega y no le escribe a nadie.
  6. Dado cada hallazgo, cuando se entrega, entonces trae prioridad (P0, P1 o P2), dueño sugerido y si necesita una decisión de HOT_CLICK.
  7. Dado el informe, cuando lo lee el Desarrollador, entonces puede convertir cada recomendación en una historia sin tener que preguntar más.

---
*Fuentes leídas: `informes/plan-y-pendientes-1610.md` (releído antes de cerrar), `informes/informe-1610.md`, `informes/onvo-split-resumen.md`, `pagos/onvo-plan-backend.md`, `pagos/onvo-scrum.md`, `qa/visitantes-1610/*.md`, `seguridad/auditoria-por-partes/CLASIFICACION_*_1610.md`, `ramas/auditoria-consultor-cruce.md`, `ramas/PR-*.md` (en especial reverificacion-1610 y quitar-tilopay) y `plan-sabado/FALTA-100.md`. No se abrió `qa/reverificacion-1610/full.log`.*
