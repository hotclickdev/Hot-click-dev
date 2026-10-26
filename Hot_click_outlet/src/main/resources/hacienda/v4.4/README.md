# XSD oficiales Hacienda CR v4.4

| Archivo | Fuente | SHA-256 |
|---|---|---|
| FacturaElectronica_V4.4.xsd | Copia oficial de ATV, descarga pública byte a byte (2026-10-26): https://atv.hacienda.go.cr/ATV/ComprobanteElectronico/docs/esquemas/2024/v4.4/FacturaElectronica_V4.4.xsd | `d384afef665573606f6499b2182d6070850ada8c93bc40fa7f0f3901a25b9cc8` |
| TiqueteElectronico_V4.4.xsd | Copia oficial de ATV, descarga pública byte a byte (2026-10-26): https://atv.hacienda.go.cr/ATV/ComprobanteElectronico/docs/esquemas/2024/v4.4/TiqueteElectronico_V4.4.xsd | `cda1c7dd97f9a235111c29948f05d7893864663cd73792fd3b51e3dae582cfdb` |
| xmldsig-core-schema.xsd | W3C, https://www.w3.org/TR/xmldsig-core/xmldsig-core-schema.xsd. Se quitó el DOCTYPE y se expandió `&dsig;` para no cargar DTD externos. | `d102ad3df7664c307e0c2c776ba4a90513b1969974d8a940bae1a77f9f21e15d` (original W3C) |

Índice oficial: https://atv.hacienda.go.cr/ATV/ComprobanteElectronico/frmAnexosyEstructuras.aspx

Historial: la copia anterior venía del espejo `apis.gometa.org` y era una revisión vieja
(Signature maxOccurs 1, NumTelefono ≥ 10000000, Proporcion 5,2); la oficial es más permisiva
(Signature hasta 5, NumTelefono ≥ 100, Proporcion 10,5). No editar a mano: si Hacienda publica
otra revisión, reemplazar y actualizar los sha256 aquí y en `XsdOficialHaciendaTest`.
