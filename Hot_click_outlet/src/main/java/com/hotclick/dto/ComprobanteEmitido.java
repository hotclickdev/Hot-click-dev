package com.hotclick.dto;

import com.hotclick.model.ComprobanteFiscal;

import java.time.LocalDateTime;

/**
 * Lo que el admin puede ver de un tiquete. No incluye la empresa ni las rutas
 * del XML: la empresa arrastra la clave de Hacienda y el PIN del certificado.
 */
public record ComprobanteEmitido(
    Long id,
    LocalDateTime fechaEmision,
    String tipo,
    String claveNumerica,
    String estado,
    String ambiente,
    Integer totalNeto,
    Integer totalImpuesto,
    Integer totalFactura,
    Integer intentosEnvio,
    String mensajeHacienda
) {
    public static ComprobanteEmitido de(ComprobanteFiscal comprobante) {
        return new ComprobanteEmitido(
            comprobante.getId(),
            comprobante.getFechaEmision(),
            comprobante.getTipo(),
            comprobante.getClaveNumerica(),
            comprobante.getEstado(),
            comprobante.getAmbiente(),
            comprobante.getTotalNeto(),
            comprobante.getTotalImpuesto(),
            comprobante.getTotalFactura(),
            comprobante.getIntentosEnvio(),
            comprobante.getMensajeHacienda()
        );
    }
}
