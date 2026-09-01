package com.hotclick.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.ArrayList;
import java.util.List;

public class EncargoCreateRequest {

    @NotNull(message = "El producto es requerido")
    private Long productoId;

    @NotBlank(message = "El nombre es requerido")
    @Size(max = 120)
    private String nombreCliente;

    @NotBlank(message = "El email es requerido")
    @Email
    @Size(max = 200)
    private String email;

    @Size(max = 30)
    private String telefono;

    @Size(max = 2000)
    private String notas;

    @Size(max = 50)
    private String tallaSeleccionada;

    private List<@Size(max = 500) String> imagenes = new ArrayList<>();

    public Long getProductoId() { return productoId; }
    public void setProductoId(Long productoId) { this.productoId = productoId; }

    public String getNombreCliente() { return nombreCliente; }
    public void setNombreCliente(String nombreCliente) { this.nombreCliente = nombreCliente; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getTelefono() { return telefono; }
    public void setTelefono(String telefono) { this.telefono = telefono; }

    public String getNotas() { return notas; }
    public void setNotas(String notas) { this.notas = notas; }

    public String getTallaSeleccionada() { return tallaSeleccionada; }
    public void setTallaSeleccionada(String tallaSeleccionada) { this.tallaSeleccionada = tallaSeleccionada; }

    public List<String> getImagenes() { return imagenes; }
    public void setImagenes(List<String> imagenes) { this.imagenes = imagenes; }
}
