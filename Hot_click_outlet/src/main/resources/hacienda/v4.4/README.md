# XSD oficiales Hacienda CR v4.4

| Archivo | Fuente | SHA-256 del original |
|---|---|---|
| FacturaElectronica_V4.4.xsd | Ministerio de Hacienda CR, "Anexos y Estructuras v4.4", ruta oficial `hacienda.go.cr/ATV/ComprobanteElectronico/docs/esquemas/2024/v4.4/`. Bajado del espejo público `apis.gometa.org/4.4/hacienda/ATV/ComprobanteElectronico/docs/esquemas/2024/v4.4/` (el CDN oficial respondió 403 desde el box). | ver abajo |
| TiqueteElectronico_V4.4.xsd | igual que el anterior | ver abajo |
| xmldsig-core-schema.xsd | W3C, https://www.w3.org/TR/xmldsig-core/xmldsig-core-schema.xsd. Se quitó el DOCTYPE y se expandió `&dsig;` para no cargar DTD externos. | ver abajo |

Licencia: los esquemas de Hacienda son documentos técnicos públicos que la DGT publica para que los emisores los usen en sus sistemas. El de W3C va bajo la W3C Software License.

Antes de producción: comparar el SHA-256 con la copia del sitio oficial de Hacienda.
    4d7a1718cf5b09a4816503c08d1701c37b7beca5f212dd82f18d1d3a9a3042ba  FacturaElectronica_V4.4.xsd
    5184857d0f5d9777b898bd1c129bd3e8936d37362ede6b3b975b36fe5345cc41  TiqueteElectronico_V4.4.xsd
    d102ad3df7664c307e0c2c776ba4a90513b1969974d8a940bae1a77f9f21e15d  xmldsig-core-schema.xsd
