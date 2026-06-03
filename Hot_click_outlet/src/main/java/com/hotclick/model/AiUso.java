package com.hotclick.model;

import jakarta.persistence.*;

@Entity
@Table(name = "hot_click_ai_uso_tb",
    uniqueConstraints = @UniqueConstraint(columnNames = {"fk_id_empresa", "anio", "mes"}))
public class AiUso {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_uso")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_id_empresa", nullable = false)
    private Empresa empresa;

    @Column(name = "anio", nullable = false)
    private Integer anio;

    @Column(name = "mes", nullable = false)
    private Integer mes;

    @Column(name = "llamadas", nullable = false)
    private Integer llamadas = 0;

    @Column(name = "tokens_entrada", nullable = false)
    private Integer tokensEntrada = 0;

    @Column(name = "tokens_salida", nullable = false)
    private Integer tokensSalida = 0;

    public Long getId() { return id; }

    public Empresa getEmpresa() { return empresa; }
    public void setEmpresa(Empresa empresa) { this.empresa = empresa; }

    public Integer getAnio() { return anio; }
    public void setAnio(Integer anio) { this.anio = anio; }

    public Integer getMes() { return mes; }
    public void setMes(Integer mes) { this.mes = mes; }

    public Integer getLlamadas() { return llamadas; }
    public void setLlamadas(Integer llamadas) { this.llamadas = llamadas; }

    public Integer getTokensEntrada() { return tokensEntrada; }
    public void setTokensEntrada(Integer tokensEntrada) { this.tokensEntrada = tokensEntrada; }

    public Integer getTokensSalida() { return tokensSalida; }
    public void setTokensSalida(Integer tokensSalida) { this.tokensSalida = tokensSalida; }
}
