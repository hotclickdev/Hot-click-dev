package com.hotclick.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "hot_click_usuario_tb")
public class Usuario extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_usuario")
    private Long id;

    @Column(name = "identificacion", nullable = false, unique = true, length = 20)
    private String identificacion;

    @Column(name = "nombre", nullable = false, length = 50)
    private String nombre;

    @Column(name = "apellido_paterno", nullable = false, length = 50)
    private String apellidoPaterno;

    @Column(name = "apellido_materno", length = 50)
    private String apellidoMaterno;

    @Column(name = "correo", nullable = false, unique = true, length = 100)
    private String correo;

    @Column(name = "telefono", nullable = false, length = 20)
    private String telefono;

    @Column(name = "telefono_alterno", length = 20)
    private String telefonoAlterno;

    @Column(name = "contrasena_hash", nullable = false, length = 255)
    private String contrasenaHash;

    @Column(name = "foto_perfil_url", length = 500)
    private String fotoPerfilUrl;

    @Column(name = "fecha_registro")
    private LocalDateTime fechaRegistro;

    @Column(name = "fecha_ultimo_acceso")
    private LocalDateTime fechaUltimoAcceso;

    @Column(name = "intentos_fallidos")
    private Integer intentosFallidos = 0;

    @Column(name = "bloqueado_hasta")
    private LocalDateTime bloqueadoHasta;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
        name = "hot_click_usuario_rol_tb",
        joinColumns = @JoinColumn(name = "fk_id_usuario"),
        inverseJoinColumns = @JoinColumn(name = "fk_id_rol")
    )
    private List<Rol> roles = new ArrayList<>();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getIdentificacion() { return identificacion; }
    public void setIdentificacion(String identificacion) { this.identificacion = identificacion; }

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    public String getApellidoPaterno() { return apellidoPaterno; }
    public void setApellidoPaterno(String apellidoPaterno) { this.apellidoPaterno = apellidoPaterno; }

    public String getApellidoMaterno() { return apellidoMaterno; }
    public void setApellidoMaterno(String apellidoMaterno) { this.apellidoMaterno = apellidoMaterno; }

    public String getCorreo() { return correo; }
    public void setCorreo(String correo) { this.correo = correo; }

    public String getTelefono() { return telefono; }
    public void setTelefono(String telefono) { this.telefono = telefono; }

    public String getTelefonoAlterno() { return telefonoAlterno; }
    public void setTelefonoAlterno(String telefonoAlterno) { this.telefonoAlterno = telefonoAlterno; }

    public String getContrasenaHash() { return contrasenaHash; }
    public void setContrasenaHash(String contrasenaHash) { this.contrasenaHash = contrasenaHash; }

    public String getFotoPerfilUrl() { return fotoPerfilUrl; }
    public void setFotoPerfilUrl(String fotoPerfilUrl) { this.fotoPerfilUrl = fotoPerfilUrl; }

    public LocalDateTime getFechaRegistro() { return fechaRegistro; }
    public void setFechaRegistro(LocalDateTime fechaRegistro) { this.fechaRegistro = fechaRegistro; }

    public LocalDateTime getFechaUltimoAcceso() { return fechaUltimoAcceso; }
    public void setFechaUltimoAcceso(LocalDateTime fechaUltimoAcceso) { this.fechaUltimoAcceso = fechaUltimoAcceso; }

    public Integer getIntentosFallidos() { return intentosFallidos; }
    public void setIntentosFallidos(Integer intentosFallidos) { this.intentosFallidos = intentosFallidos; }

    public LocalDateTime getBloqueadoHasta() { return bloqueadoHasta; }
    public void setBloqueadoHasta(LocalDateTime bloqueadoHasta) { this.bloqueadoHasta = bloqueadoHasta; }

    public List<Rol> getRoles() { return roles; }
    public void setRoles(List<Rol> roles) { this.roles = roles; }
}
