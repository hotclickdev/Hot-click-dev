# B10 — Decisiones Figma Checkout

Fecha: 2-oct-2026. Investigación. Sin cambios de checkout, pago, validaciones, rutas, CSS, backend ni tests.

B7, B8 y B9 no contestaron D04, D05, D08 ni D18. `PROGRESS.md` decisión 26 sigue abierta: cédula SINPE, atajo internacional y consentimiento en escritorio «se conservan; ¿se aceptan?». «Se conservan» describe el código actual. No es un cierre.

La ausencia de un control en un frame no se toma como instrucción de borrarlo.

## Estado Git

| | |
| --- | --- |
| Branch | `feat/figma/base` |
| HEAD al investigar | `c50794a2` |
| Master | `b355fd20` |
| PASS / PARTIAL | 37 / 53 |

## D04 — Consentimiento

### Evidencia Figma

`28:1083` es el paso Datos en móvil. El inventario y `CHK.md` dicen que ese paso coincide al píxel con lo dibujado. El frame no incluye una casilla de consentimiento ni el texto de la Ley 8968.

Tampoco lo dibujan `29:1344` (pago móvil) ni `30:2385` (checkout de escritorio). No apareció otro id de frame del checkout que dibuje esa casilla. El aviso de cookies es otro control.

### Código actual

`ConsentimientoDatos` está en `PasoPago.tsx`. El comentario dice que es obligatorio y que Figma no lo dibuja. Enlaza a `/privacidad` y `/cookies`.

En móvil no está en el paso Datos (`PasoDatos.tsx`). Se muestra en el paso 3, después de los métodos de pago. En escritorio va en la columna del resumen, antes del botón Pagar (`ResumenCarrito`).

`aceptaDatos` nace en falso. `CheckoutLayout.pagar()` y `ejecutarPagarCheckout` no inician el pago si la casilla no está marcada. El paso 1 no exige esa casilla para continuar.

`tests/checkout-cta.spec.ts` cubre que, sin marcar la casilla, no sale una llamada de pago.

### Diferencia

En la pantalla de `28:1083` no hay contradicción de layout: el consentimiento no está en ese paso. La diferencia está en el paso 3 y en el resumen de escritorio, donde el control existe y ningún frame del checkout lo dibuja.

B8 agrupó el consentimiento con la cédula en el paso Datos. En el código la cédula no está en ese paso. Esa agrupación de B8 no cambia la pregunta de si la casilla se queda.

### Clasificación

DECISIÓN HUMANA

### Conclusión

No hay un frame que mande dibujar la casilla ni un frame que diga quitarla. Quitarla dejaría el pago sin el gate de `aceptaDatos`. Mantenerla deja el checkout con un bloque que los frames medidos no incluyen. Las dos opciones siguen abiertas. No hay cambio de UI que cierre D04.

## D05 — Cédula SINPE

### Evidencia Figma

`29:1344` es el paso Pago en móvil. El inventario dice que el paso coincide y que SINPE es el método por defecto. El mismo texto dice que la cédula y el atajo internacional no tienen frame en ese paso.

`PasoPago.tsx` cita `29:1379` para las instrucciones SINPE y `29:1370` para la lista de métodos. Esos nodos acompañan el paso de pago. La documentación no dice que dibujen el campo de cédula.

`45:1640` (pago en revisión) puede mostrar la cédula ya enviada, en solo lectura. No es el formulario del paso 3. `29:1830` es el SINPE del QR de caja, otro flujo, y su formulario de pagador tampoco tiene frame (Figma-D15).

### Código actual

`DatosRemitente` es una función interna de `PasoPago.tsx`, dentro de `InstruccionesSinpe`. El comentario dice que SINPE pide cédula y nombre, y que no están en Figma.

Se monta cuando el método es SINPE. El valor inicial del método es SINPE, alineado al comentario de `29:1344`.

Con sesión, nombre y cédula van en ese bloque. Sin sesión, el nombre va en el paso 1 y la cédula en el paso 3. `ejecutarPagarCheckout` no llama al pago SINPE si faltan nombre o cédula. El comprobante no es la condición de esa función. La cédula se agrega a las notas del pedido.

`tests/checkout-cta.spec.ts` llena «Número de cédula» en el caso SINPE. `checkoutFigma.test.ts` no cubre esa validación.

El atajo internacional no está en este paso. Vive en Entrega. Ver D18.

### Diferencia

El chrome dibujado de `29:1344` está medido. El campo de cédula es un control adicional dentro del panel SINPE. No hay un frame que lo dibuje ni uno que lo prohíba.

### Clasificación

DECISIÓN HUMANA

### Conclusión

La cédula no depende de un dato que el API no tenga: el formulario la pide y la manda en las notas. La pregunta abierta es si ese campo permanece en el paso de pago. No es un ajuste de píxeles de `29:1344`. No hay implementación desbloqueada.

## D08 — Checkout

### Evidencia Figma

`30:2385` es el checkout de escritorio: tres tarjetas y resumen. `CHK.md` y el inventario dicen que posiciones y tamaños coinciden. El frame no dibuja cédula, consentimiento ni atajo internacional. Al elegir SINPE, la implementación despliega instrucciones y cédula debajo de lo medido.

### Código actual

Es el mismo checkout que en móvil, con `escritorio` en true.

- Cédula: `DatosRemitente` dentro de `MetodosPago` cuando el método es SINPE.
- Consentimiento: prop `consentimiento` de `ResumenCarrito`, antes de Pagar.
- Atajo: `AtajoInternacional` en `PasoEntrega`, sin condición de viewport.

Ownership: CHK. Archivos: `CheckoutLayout.tsx`, `PasoPago.tsx`, `PasoEntrega.tsx`, `ResumenCarrito.tsx`.

### Diferencia

Lo que el frame dibuja está medido. Los tres bloques son información que el frame de escritorio no incluye. No hay una instrucción visual que diga ocultarlos ni una que fije su posición en 1440.

D08 repite, en escritorio, las preguntas de D04, D05 y D18. No agrega un cuarto control.

### Clasificación

DECISIÓN HUMANA

### Conclusión

Igualar `30:2385` al píxel quitando esos bloques sería interpretar la ausencia como borrado. Conservarlos deja el escritorio con controles sin frame. `PROGRESS.md` decisión 26 pide esa aceptación y no la tiene. No se desbloquea un cambio.

## D18 — Internacional

### Evidencia Figma

`51:2000` es el frame móvil del atajo en el paso Entrega. `PasoEntrega.tsx` cita además el nodo `52:2261` para el bloque «Envío internacional». Ese nodo no está como fila propia en el inventario.

`30:2385` no dibuja el atajo. El inventario de `51:2000` dice que el atajo se conserva y que el escritorio es `REQUIERE_DECISION`.

### Código actual

`AtajoInternacional` va después de las opciones de envío, en móvil y en escritorio. No hay `if` de viewport. Abre WhatsApp (`50686667888`) con un texto de consulta internacional.

`tests/checkout-cta.spec.ts` comprueba el enlace «Consultar envío internacional por WhatsApp» en el paso 2 a 390. `envio-internacional.spec.ts` cubre el mismo enlace en Home y en `/envios`, no el checkout de escritorio.

### Diferencia

En móvil el atajo coincide con `51:2000` / `52:2261`. Esa parte no pide un cambio.

En escritorio el atajo está en la tarjeta de entrega y `30:2385` no lo dibuja. No hay frame de escritorio del atajo.

### Clasificación

DECISIÓN HUMANA

### Conclusión

La parte móvil no está en disputa. La pregunta que B8 dejó abierta es solo el escritorio: mantener el atajo en 1440 o limitarlo al móvil. Las dos caben en la evidencia, porque un frame lo dibuja en móvil y el frame de escritorio no lo menciona. Elegir una es una decisión de producto, no un arreglo de layout. No es backend.

## Matriz final

| Decisión | Estado | ¿Implementable? | Motivo |
| --- | --- | --- | --- |
| D04 | DECISIÓN HUMANA | No | Ningún frame del checkout dibuja la casilla. El código la exige antes de pagar, en el paso 3 y en el resumen de escritorio. La ausencia no ordena quitarla. |
| D05 | DECISIÓN HUMANA | No | `29:1344` no dibuja la cédula. El campo vive en el panel SINPE y el pago SINPE no sigue sin ella. No falta un API. |
| D08 | DECISIÓN HUMANA | No | `30:2385` coincide en lo dibujado. Cédula, consentimiento y atajo son bloques extra sin posición en ese frame. |
| D18 | DECISIÓN HUMANA | No | El móvil ya sigue `51:2000`. El escritorio no tiene frame del atajo. Mostrarlo o ocultarlo en 1440 no se deduce del dibujo. |

## Bloque de implementación desbloqueado

Este bloque no desbloquea implementación.

D04, D05, D08 y D18 preguntan si se aceptan controles que el checkout ya tiene y que los frames medidos no dibujan. No hay un frame que fije el control que faltaría pintar, ni un frame que diga borrarlo. Tocar `PasoPago.tsx`, `PasoEntrega.tsx` o `CheckoutLayout.tsx` ahora elegiría una de las opciones de B8.

## Próximo bloque

El siguiente análisis es el de tienda, en el orden que dejó B9:

- Figma-D01 y Figma-D20: barra inferior móvil y WhatsApp de `/tienda/:slug`.
- Figma-D02: header de escritorio del mismo perfil.

Ese grupo tampoco está contestado. No queda, dentro de D04–D18, una decisión que haya pasado a IMPLEMENTABLE.
