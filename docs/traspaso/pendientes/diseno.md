# Diseño: decisiones abiertas y entregas (copia)

Fuente: `/workspace/diseno/PENDIENTES_DUENO.md` (16-oct-2026). Las láminas, maquetas y handoffs siguen en la máquina compartida: `/workspace/diseno/sprint1..6/<historia>/`, `HANDOFF_DEV.md` en `carrusel-inicio/`, `admin-revisar/` y `extra/`; `LEEME.md` en `checkout/`, `demo-0410/`, `registro-empresa/` y `bodega/`; recorrido móvil en `MOBILE_RECORRIDO_COMPLETO.md`. **Nota:** la decisión 7 (frecuencia por defecto) ya está resuelta por el dueño: no hay valor preseleccionado, el negocio elige al registrarse. La 21 (POS de negocio no aprobado) es QA-NEG-056: el backend debe bloquear la caja.

Consolidado el 16-oct-2026, sin duplicados. Cada fila dice qué pantalla bloquea. Mientras no se decida, las láminas dicen «a definir por HOT_CLICK» (o «por el negocio») y nunca inventan el dato.

## Envíos y checkout
| # | Decisión | Bloquea |
|---|---|---|
| 1 | Página de envíos: opción A (tarifas) u opción B (remitir al carrito) (DIS-3, S4-04) | S6-21, S1-29 (dis3) |
| 2 | Zonas fuera del GAM (dentro del rango de ₡5.000 a ₡10.000) | S4-25, S6-21, S1-29 |
| 3 | Tiempos de entrega: normal GAM, fuera del GAM y punto de retiro (solo Uber Flash está decidido) | S4-25, S6-21 |
| 4 | Si fuera del GAM acepta contra entrega | S4-25, S6-21 |
| 5 | Cargo de contra entrega (₡4.000): ¿por pedido o por negocio? | S2-contra-entrega, S2-27, S1-30 |
| 6 | Texto para cuando un pedido no llega al mínimo de contra entrega de un negocio | S2-contra-entrega, S4-25 |

## Plan, comisiones y cobros
| # | Decisión | Bloquea |
|---|---|---|
| 7 | Frecuencia de liquidación por defecto en el registro (propuesta: Quincenal) | S2-28 |
| 8 | Fecha de cobro de la mensualidad Pyme / Negocio Plus (cargo aparte día 28/13 o en ONVO) | S4-24 |
| 9 | Duración del período de gracia | S4-24, S2-28 |
| 10 | Corte de semana del panel de ventas (¿lunes a domingo?) | S4-23 |
| 11 | Precio de Destacar (publicidad pagada) | S1-25 |

## Multinegocio
| # | Decisión | Bloquea |
|---|---|---|
| 12 | #41 Con qué plan arranca un negocio nuevo (¿se elige?) | S2-multinegocio (Crear otro emprendimiento) |
| 13 | #43 Si cada negocio elige su frecuencia de liquidación y su cargo de US$3 | S2-multinegocio, S2-28 |
| 14 | #44 Si se puede borrar o traspasar un negocio | S2-multinegocio (no hay pantalla) |

## Reembolsos, contracargos y facturación
| # | Decisión | Bloquea |
|---|---|---|
| 15 | Quién paga el envío de una devolución (S5-05) | S5-21 |
| 16 | Si se devuelve la comisión en un reembolso (S5-05) | S5-21 |
| 17 | Plazo del vendedor para responder una solicitud de reembolso y qué pasa si vence | S5-22 |
| 18 | Quién asume un contracargo: el negocio o HotClick (S5-05) | S5-23 |
| 19 | Regla de «Por facturar»: compras pagadas o entregadas | S5-20 |
| 20 | Cómo se agrupa el correo para pedir facturas a los negocios | S5-20 |

## Otros
| # | Decisión | Bloquea |
|---|---|---|
| 21 | Si un negocio no aprobado puede usar la caja (POS) | S4-26 |
| 22 | Modo oscuro en admin, panel y facturación para el lanzamiento (propuesta: no) | S6-19 |
| 23 | Aprobar el kit de lanzamiento y confirmar el dominio público | S6-23 |
| 24 | Aprobación escrita de Producto y HOT_CLICK de las láminas de S2 a S6 | todas |

## No son del dueño, pero bloquean (para seguimiento)
- Plazo del SINPE pendiente: lo tiene que dar ONVO (no está en su doc). Bloquea S4-22 y S2-26.
- Mapa de errores de ONVO (códigos HTTP): confirmarlo con la API en S3-07 y la demo. Bloquea S3-22.
- Texto del resumen legal: lo redacta y aprueba Legal. Bloquea S5-24.
- Copy «correo ya registrado» en textos-lanzamiento.md: lo alinea Contenido. Afecta S2-registro-negocio.
- Capturas sin Tilopay en staging (QA, después de S6-10). Bloquea S6-22.
- Prueba en teléfono real con TalkBack y VoiceOver (una persona). Bloquea S1-28.
