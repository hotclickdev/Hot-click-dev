package com.hotclick.model;
import com.hotclick.utils.Constants;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "hot_click_api_key_tb")
public class ApiKey {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_api_key")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_id_empresa", nullable = false)
    private Empresa empresa;

    @Column(name = "nombre", nullable = false, length = 100)
    private String nombre;

    /** First 12 chars of the plaintext key — safe to display in UI */
    @Column(name = "prefijo", nullable = false, length = 20)
    private String prefijo;

    /** SHA-256 hex of the full plaintext key — used for lookup */
    @Column(name = "key_hash", nullable = false, unique = true, length = 64)
    private String keyHash;

    /** live | test */
    @Column(name = "entorno", nullable = false, length = 10)
    private String entorno = "live";

    @Column(name = "activo", nullable = false)
    private Boolean activo = true;

    /**
     * Permisos de la key, CSV. Ej: "read:productos,write:pedidos".
     * Valor especial "read:all" (default) da acceso de lectura total.
     * Una key sin este campo (null → migrada) conserva el comportamiento previo.
     */
    @Column(name = "scopes", columnDefinition = "TEXT")
    private String scopes = "read:all";

    @Column(name = "ultimo_uso")
    private LocalDateTime ultimoUso;

    @Column(name = "fecha_creacion")
    private LocalDateTime fechaCreacion;

    @PrePersist
    void onCreate() { fechaCreacion = LocalDateTime.now(Constants.ZONA_CR); }

    public Long getId() { return id; }

    public Empresa getEmpresa() { return empresa; }
    public void setEmpresa(Empresa e) { this.empresa = e; }

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    public String getPrefijo() { return prefijo; }
    public void setPrefijo(String prefijo) { this.prefijo = prefijo; }

    public String getKeyHash() { return keyHash; }
    public void setKeyHash(String keyHash) { this.keyHash = keyHash; }

    public String getEntorno() { return entorno; }
    public void setEntorno(String entorno) { this.entorno = entorno; }

    public Boolean getActivo() { return activo; }
    public void setActivo(Boolean activo) { this.activo = activo; }

    public LocalDateTime getUltimoUso() { return ultimoUso; }
    public void setUltimoUso(LocalDateTime ultimoUso) { this.ultimoUso = ultimoUso; }

    public LocalDateTime getFechaCreacion() { return fechaCreacion; }

    public String getScopes() { return scopes; }
    public void setScopes(String scopes) { this.scopes = scopes; }
}
