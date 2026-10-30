package com.hotclick.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Fila única (id=1) con los montos de envío de la plataforma (V211). Se lee y escribe con
 * {@code ConfiguracionEnvioService}; el mapeo existe para que el esquema de pruebas (ddl-auto) la cree.
 */
@Entity
@Table(name = "hot_click_config_envio_tb")
public class ConfigEnvio {
    @Id
    private Long id;
    @Column(name = "monto_gam_crc", nullable = false)
    private Integer montoGamCrc;
    @Column(name = "monto_fuera_gam_crc", nullable = false)
    private Integer montoFueraGamCrc;
    @Column(name = "monto_rapido_crc", nullable = false)
    private Integer montoRapidoCrc;

    public Long getId() { return id; }
    public Integer getMontoGamCrc() { return montoGamCrc; }
    public Integer getMontoFueraGamCrc() { return montoFueraGamCrc; }
    public Integer getMontoRapidoCrc() { return montoRapidoCrc; }
}
