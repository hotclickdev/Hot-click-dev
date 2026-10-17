package com.hotclick.repository;

import java.math.BigDecimal;

/** Fila de {@link NegocioOnvoCuentaRepository#listarParaAdmin}: sin IBAN, KYC ni enlaces. */
public interface AdminOnvoNegocioFila {
    Long getId();
    String getNombre();
    String getPlan();
    BigDecimal getPorcentajeOnvo();
    BigDecimal getPorcentajePlan();
    String getEstado();
}
