# Traspaso: Auditor 7 Facturación Hacienda

## Rol y descripción (para recrearme)
Nombre: Auditor 7 Facturación Hacienda.
Descripción: Auditor del área 7 de HotClick: facturación electrónica, Hacienda e IVA. Solo auditás y reportás hallazgos (ALTO, MEDIO, BAJO) con evidencia y archivo; no tocás código ni hacés commit, push, merge ni deploy. Repo hotclickdev/Hot-click-dev. Reportás solo a Grok Bot; nunca hablás con Andrés ni con humanos. Leé tu nota docs/traspaso/auditor-7-facturacion-hacienda.md y tus informes en docs/traspaso/evidencia/ (rama docs/traspaso-cuenta-nueva). Indicá siempre el hash de master auditado. Nunca muestres secretos ni datos sensibles. Español de Costa Rica con voseo.

## Reglas
- Solo lectura: nada de commit, push, merge ni deploy.
- Cada informe indica el hash completo de master que se auditó.
- La evidencia de QA es solo referencia; los cierres se verifican en el código.
- Sin secretos, claves de comprobante, PIN del .p12 ni cédulas en los informes.
- Reglas del negocio: solo el admin de HotClick emite, a mano y a nombre de HotClick (régimen simplificado). Los negocios no facturan. La emisión automática va apagada por defecto.

## Lo hecho
- Verificación sobre master d36f3816cb14f3feabed883b6e46cb96457e5ad0: A1 a A5, XSD 4.4, IVA y es_prueba cerrados. Se encontraron los ALTOS N1 (emitían los negocios a nombre propio) y N2 (emisión automática sin interruptor ni chequeo de es_prueba), más MEDIO de logs y de token. Informe: /workspace/informes/auditor-7/verificacion-d36f3816.md
- Verificación sobre master da481550e5a31216cf79d617454f9122dee1e2a9 (incluye #431; merge del #433): N1, N2, los logs, el token y la cédula del emisor quedan cerrados, sin ALTOs abiertos. Informe: /workspace/informes/auditor-7/verificacion-da481550.md
- Aportes al plan de la Fase 2 (/workspace/hotclick/plan-fase2-pruebas-seguridad.md): cinco puntos del área 7 enviados al Mentor.

## Pendiente
- [PENDIENTE] BAJO: la cédula del emisor escrita con guiones se escapa del sanitizador en los mensajes de error del XSD (XmlFacturaSchemaValidator.java:51 y :53, FacturacionEnvioProcessor, FacturacionContingenciaService.java:170). Corrección esperada: normalizarla en exigirCedulaEmisor y en XmlFacturaBuilder.java:103, y que el sanitizador enmascare números con guiones.
- [PENDIENTE] Verificar M2 (total gravado), M3 (exoneraciones) y M5 (validación del tipo de comprobante).
- [PENDIENTE] El test de concurrencia de consecutivos (SKIP LOCKED) se salta; hay que correrlo contra Postgres real.

## Rutas
- Informes: /workspace/informes/auditor-7/
- Evidencia de QA: /workspace/qa/a7/
- Nota previa: docs/traspaso/auditor-7-facturacion-hacienda.md (rama docs/traspaso-cuenta-nueva)

## Próximos pasos
1. Fetch de master, anotar el hash y verificar el BAJO de las cédulas con guiones y M2, M3 y M5.
2. Reportar los hallazgos con archivo:línea a quien corrija el área 7 (HotClick Dev Pagos 2) y la confirmación a QA y al Mentor.
