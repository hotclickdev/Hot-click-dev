# Tests post-B19

Fecha: 2-oct-2026. Rama `feat/figma/base`. Solo tests. No cambia producto, inventario ni contadores.

Primera corrida, antes de editar: 50 casos, 17 fallos, 33 verdes. `barra-interna-h1` y `bottom-nav` pasaron enteros.

| Test | Resultado | Motivo |
| --- | --- | --- |
| `ui-sin-emoji.spec.ts` | corregido | Rutas borradas o movidas (testimonio, convenios, marcas, accesibilidad, envíos, navbar, idioma) y selectores del Home (Menú, cupón, «Solicitar búsqueda»). El objetivo sigue siendo que no haya emojis de UI. |
| `asistente-checkout.spec.ts` | corregido | El chat se abre desde «Preguntale al asistente» / «Enviar al asistente». El diálogo, «Ir a datos y pago» y WhatsApp no se tocaron. |
| `envio-rapido.spec.ts` | corregido en Home; `/envios` mantenido | El Home ya no tiene «Enviamos a todo el país.». `/envios` seguía alineado y pasó sin cambios. |
| `envio-internacional.spec.ts` | corregido en Home; `/envios` mantenido | El atajo internacional no está en el Home. En `/envios` sigue y pasó sin cambios. |
| `convenios-marquee.spec.ts` | corregido | El marquee no se pinta en `/` aunque la API devuelva un convenio. No se restauró. |
| `barra-interna-h1.spec.ts` | mantenido | Los 8 casos pasaron, incluido `/servicios`. B6 sigue vigente. |
| `bottom-nav.spec.ts` | mantenido | Los 8 casos pasaron contra Inicio, Buscar, Categorías, Pedido y Cuenta. |
| `catalogo-iconos.spec.ts` | no modificado | Los dos de emoji pasaron. «Ver más» falló: el botón sigue en `CategoryRow`, pero `/productos` abre la grilla plana porque el filtro de stock arranca en «ok». No hay evidencia de que el control se haya eliminado. |

Segunda corrida, después de editar: 31 pasados en los cinco archivos tocados.

No se modificó producto. No se promovió ninguna pantalla a PASS.
