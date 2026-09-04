package com.hotclick.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.hotclick.utils.Constants;
import jakarta.persistence.*;

import java.time.LocalDateTime;

/**
 * Cuenta donde el vendedor recibe el dinero de sus ventas (SINPE / IBAN / tarjeta referencia).
 * No es pasarela de cobro al cliente.
 */
@Entity
@Table(name = "hot_click_metodo_cobro_tb")
public class MetodoCobro {

    public static final String TIPO_SINPE = "SINPE";
    public static final String TIPO_IBAN = "IBAN";
    public static final String TIPO_TARJETA = "TARJETA";
    public static final String TIPO_SOLICITUD = "METODO_COBRO";
    public static final String ACCION_CAMBIO = "UPDATE_SENSIBLE";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_metodo_cobro")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_id_empresa", nullable = false)
    private Empresa empresa;

    @Column(name = "tipo", nullable = false, length = 20)
    private String tipo;

    /** Valor limpio (SINPE 8 dígitos, IBAN, o últimos dígitos de tarjeta). Nunca en JSON. */
    @JsonIgnore
    @Column(name = "destino", nullable = false, length = 80)
    private String destino;

    @Column(name = "mascara", nullable = false, length = 60)
    private String mascara;

    @Column(name = "predeterminado", nullable = false)
    private boolean predeterminado = false;

    @Column(name = "activo", nullable = false)
    private boolean activo = true;

    @Column(name = "en_revision", nullable = false)
    private boolean enRevision = false;

    @Column(name = "fecha_creacion", nullable = false, updatable = false)
    private LocalDateTime fechaCreacion = LocalDateTime.now(Constants.ZONA_CR);

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Empresa getEmpresa() { return empresa; }
    public void setEmpresa(Empresa empresa) { this.empresa = empresa; }

    public String getTipo() { return tipo; }
    public void setTipo(String tipo) { this.tipo = tipo; }

    public String getDestino() { return destino; }
    public void setDestino(String destino) { this.destino = destino; }

    public String getMascara() { return mascara; }
    public void setMascara(String mascara) { this.mascara = mascara; }

    public boolean isPredeterminado() { return predeterminado; }
    public void setPredeterminado(boolean predeterminado) { this.predeterminado = predeterminado; }

    public boolean isActivo() { return activo; }
    public void setActivo(boolean activo) { this.activo = activo; }

    public boolean isEnRevision() { return enRevision; }
    public void setEnRevision(boolean enRevision) { this.enRevision = enRevision; }

    public LocalDateTime getFechaCreacion() { return fechaCreacion; }
    public void setFechaCreacion(LocalDateTime fechaCreacion) { this.fechaCreacion = fechaCreacion; }
}
