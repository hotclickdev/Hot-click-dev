package com.hotclick.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "hot_click_resultado_ruleta_tb")
public class ResultadoRuleta extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_resultado")
    private Long id;

    @Column(name = "fecha_giro")
    private LocalDateTime fechaGiro;

    @Column(name = "codigo_canje", unique = true, length = 20)
    private String codigoCanje;

    @Column(name = "canjeado")
    private Boolean canjeado = false;

    @Column(name = "fecha_canje")
    private LocalDateTime fechaCanje;

    @Column(name = "expira_en")
    private LocalDateTime expiraEn;

    @OneToOne
    @JoinColumn(name = "fk_id_giro", nullable = false, unique = true)
    private GiroRuleta giro;

    @ManyToOne
    @JoinColumn(name = "fk_id_usuario_final", nullable = false)
    private Usuario usuarioFinal;

    @ManyToOne
    @JoinColumn(name = "fk_id_premio", nullable = false)
    private Premio premio;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public LocalDateTime getFechaGiro() { return fechaGiro; }
    public void setFechaGiro(LocalDateTime fechaGiro) { this.fechaGiro = fechaGiro; }

    public String getCodigoCanje() { return codigoCanje; }
    public void setCodigoCanje(String codigoCanje) { this.codigoCanje = codigoCanje; }

    public Boolean getCanjeado() { return canjeado; }
    public void setCanjeado(Boolean canjeado) { this.canjeado = canjeado; }

    public LocalDateTime getFechaCanje() { return fechaCanje; }
    public void setFechaCanje(LocalDateTime fechaCanje) { this.fechaCanje = fechaCanje; }

    public LocalDateTime getExpiraEn() { return expiraEn; }
    public void setExpiraEn(LocalDateTime expiraEn) { this.expiraEn = expiraEn; }

    public GiroRuleta getGiro() { return giro; }
    public void setGiro(GiroRuleta giro) { this.giro = giro; }

    public Usuario getUsuarioFinal() { return usuarioFinal; }
    public void setUsuarioFinal(Usuario usuarioFinal) { this.usuarioFinal = usuarioFinal; }

    public Premio getPremio() { return premio; }
    public void setPremio(Premio premio) { this.premio = premio; }
}
