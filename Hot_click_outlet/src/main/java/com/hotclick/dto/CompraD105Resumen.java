package com.hotclick.dto;

import com.hotclick.model.CompraD105;

import java.time.LocalDate;

/** Compra de proveedor visible en el admin. Sin rutas de storage. */
public record CompraD105Resumen(
    Long id,
    String claveNumerica,
    String tipoDocumento,
    LocalDate fechaEmision,
    int anio,
    String trimestre,
    String emisorCedula,
    String emisorNombre,
    int subtotalNeto,
    int totalImpuesto,
    int totalComprobante,
    boolean tieneFoto
) {
    public static CompraD105Resumen de(CompraD105 compra) {
        String foto = compra.getFotoPath();
        return new CompraD105Resumen(
            compra.getId(),
            compra.getClaveNumerica(),
            compra.getTipoDocumento(),
            compra.getFechaEmision(),
            compra.getAnio(),
            compra.getTrimestre(),
            compra.getEmisorCedula(),
            compra.getEmisorNombre(),
            compra.getSubtotalNeto(),
            compra.getTotalImpuesto(),
            compra.getTotalComprobante(),
            foto != null && !foto.isBlank()
        );
    }
}
