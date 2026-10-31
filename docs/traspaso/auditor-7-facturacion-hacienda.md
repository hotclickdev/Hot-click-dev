# Traspaso: Auditor 7 Facturación Hacienda

**Rol:** auditor en solo lectura de la facturación electrónica de Hacienda CR (XML v4.4, firma, consecutivos, impuestos, envío y reintentos). No corrige código.

**En qué quedé:** terminé la auditoría de master fb9ef78e: 16 correcciones (ALTO 5, MEDIO 7, BAJO 4) y 8 mejoras. No corrí tests porque el box no tiene java ni mvn, y no validé contra el XSD oficial v4.4.

**Ramas y PRs:** ninguno. Nunca hice commits.

**Hallazgos ALTO:**
- FirmaDigitalService.java:34-51 no firma el XML.
- FacturacionEmisionSupport.java:33-36: ERROR no está entre los estados activos, hay riesgo de doble emisión.
- HaciendaApiClient.java:96-100 atrapa todas las excepciones, así que el retry y el circuit breaker no actúan. FacturacionService.java:60 llama al @Async desde la misma clase y no surte efecto.
- HaciendaApiClient.java:58-61: si falta el usuario ATV, el envío se da por exitoso.
- El validador local usa un subconjunto propio del esquema, no el XSD oficial.

**Pendientes y decisiones:** Andrés tiene que confirmar si Producto.precioVenta ya incluye IVA (hallazgo M4, posible doble 13%). Las correcciones las hacen los bots Dev después de que Andrés apruebe.

**Próximos pasos:** validar contra el XSD oficial v4.4. Correr los tests con un JDK y Maven.

**Evidencia:** docs/traspaso/evidencia/auditor-7-facturacion-hacienda/auditoria-7-facturacion-hacienda.md
