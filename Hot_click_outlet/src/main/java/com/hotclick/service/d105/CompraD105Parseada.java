package com.hotclick.service.d105;

import java.time.LocalDate;

public record CompraD105Parseada(
    String claveNumerica,
    String tipoDocumento,
    LocalDate fechaEmision,
    int anio,
    String trimestre,
    String emisorCedula,
    String emisorNombre,
    int subtotalNeto,
    int totalImpuesto,
    int totalComprobante
) {
    public static final String FACTURA = "01";
    public static final String NOTA_CREDITO = "03";
}
