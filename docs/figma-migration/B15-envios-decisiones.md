# B15 — Envíos, tiempos y tarifas

Fecha: 2-oct-2026. Investigación. Sin cambios de textos, tarifas, checkout ni backend.

## Estado Git

| | |
| --- | --- |
| Branch | `feat/figma/base` |
| HEAD al comenzar | `264abca4` |
| Master | `b355fd20` |
| PASS / PARTIAL | 37 / 53 |

Frames: `28:1660` (`/envios`), `29:1248` (checkout entrega). Docs: `SRV.md`, `CHK.md`, `INVENTORY.md`, `enviosData.ts`, `B8-decisiones-Figma.md` (Figma-D13).

## Tiempos y tarifas de `/envios`

### Evidencia

La plantilla de `28:1660` está medida a ±1 px. Los tiempos vigentes en `enviosData.ts` son:

- Envío rápido GAM: «30 min – 2 horas»
- Envío normal GAM: «2–4 días hábiles»

`SRV.md` dice que `28:1660` escribe «24 h hábiles» y «1 a 3 días». El checkout usa el mismo copy que esta página. El comentario de `enviosData.ts` pide no alterar los textos sin avisar al negocio.

Figma define valores concretos, no solo la estructura. Esos valores no son los de la operación actual.

### Clasificación

DECISIÓN HUMANA

### ¿Desbloquea implementación?

No. Cambiar los textos iguala el frame y separa la página del checkout, o hay que cambiar los dos. No es un dato que falte en un API: es el copy que el negocio ya usa.

## GAM por origen o por destino

### Evidencia

`29:1248` coincide en layout. `CHK.md`: el envío normal se ofrece como GAM o fuera del GAM según el cantón de destino. Figma lo muestra por origen. El producto no trae la provincia de la bodega. Envío rápido solo dentro del GAM.

### Clasificación

BACKEND

### ¿Desbloquea implementación?

No. Sin la provincia de la bodega no se puede pintar «Sale de …» ni elegir GAM por origen sin inventar el dato.

## Estructura de la plantilla

### Evidencia

Índice, tarifas y preguntas de `/envios` siguen la plantilla. Los chips «Tiempos» y «Retiro» no se dibujaron porque el frame no tiene esas secciones. Devoluciones e Información no tienen frame.

### Clasificación

La estructura medida de `/envios` no pide un cambio. Devoluciones e Información: FIGMA PENDIENTE.

## Decisión

No se cambian tiempos ni tarifas. La diferencia de copy es de negocio. La diferencia de origen es de datos.

## Siguiente bloque

B16, QR y estados de pago.
