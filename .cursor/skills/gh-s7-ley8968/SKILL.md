---
name: gh-s7-ley8968
description: Mantiene el checklist de la Ley 8968 (privacidad, consentimiento, ARCO) cuando S7 abre un issue. Usar al tocar privacidad, checkout o consentimiento.
disable-model-invocation: true
---

# S7 Ley 8968

Workflow: `.github/workflows/ley8968-checklist.yml`
Check: `S7 Ley 8968`

## Cuándo corre

Los martes. Heurística de /privacidad, checkbox de checkout, consentimiento del vendedor, POST /api/consentimiento y ARCO.

## Qué hacer para que no salga en rojo

1. Si el issue dice que falta una pieza, se agrega en el flujo real, no con un texto escondido.
2. No copies datos de producción a dev para "probar" el consentimiento.
3. No desactives el checklist para mergear un checkout sin la casilla.

## Label de skip

Label `skip-ley8968` solo si el caso es un falso positivo y lo decís en el PR. No la uses para ahorrarte el paso.
