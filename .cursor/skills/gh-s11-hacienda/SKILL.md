---
name: gh-s11-hacienda
description: Alinea XmlFacturaBuilder con el XML de muestra cuando S11 marca un campo faltante. Usar al tocar facturación electrónica.
disable-model-invocation: true
---

# S11 Hacienda XML

Workflow: `.github/workflows/hacienda-xml-drift.yml`
Check: `S11 Hacienda XML`

## Cuándo corre

Los jueves. Compara factura-muestra.xml y un subconjunto del XSD con XmlFacturaBuilder y FacturacionService. No llama a Hacienda.

## Qué hacer para que no salga en rojo

1. Un campo requerido que el issue nombra se agrega en el builder y en el test del XML.
2. No pegues a la API de Hacienda desde el agente para "probar".
3. No cambies el scheduler de contingencia en el mismo pase.

## Label de skip

Label `skip-hacienda-xml` solo si el caso es un falso positivo y lo decís en el PR. No la uses para ahorrarte el paso.
