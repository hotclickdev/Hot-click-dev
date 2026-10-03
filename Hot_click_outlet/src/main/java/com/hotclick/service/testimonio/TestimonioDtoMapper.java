package com.hotclick.service.testimonio;

import com.hotclick.model.Testimonio;
import com.hotclick.service.contacto.ContactoTextoPublico;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.Map;

@Component
public class TestimonioDtoMapper {

    private final ContactoTextoPublico contactoTexto;

    public TestimonioDtoMapper(ContactoTextoPublico contactoTexto) {
        this.contactoTexto = contactoTexto;
    }

    /**
     * Salida pública: con plan sin contacto directo (EMPRENDEDOR, sin plan) se ocultan teléfonos,
     * correos, @usuarios y enlaces externos del comentario y del nombre del producto.
     */
    public Map<String, Object> toPublicMap(Testimonio t) {
        Long empresaId = t.getProducto() != null ? t.getProducto().getEmpresaId() : null;
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", t.getId());
        m.put("tipo", t.getTipo());
        m.put("nombreUsuario", nombreCompleto(t));
        m.put("productoNombre", t.getProducto() != null
                ? contactoTexto.texto(empresaId, t.getProducto().getNombreProducto()) : null);
        m.put("comentario", contactoTexto.texto(empresaId, t.getComentario()));
        m.put("imagenUrl", t.getImagenUrl());
        m.put("calificacion", t.getCalificacion());
        m.put("fechaAprobacion", t.getFechaAprobacion());
        return m;
    }

    public Map<String, Object> toAdminMap(Testimonio t) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", t.getId());
        m.put("tipo", t.getTipo());
        m.put("nombreUsuario", nombreCompleto(t));
        m.put("correoUsuario", t.getUsuario() != null ? t.getUsuario().getCorreo() : null);
        m.put("productoId", t.getProducto() != null ? t.getProducto().getId() : null);
        m.put("productoNombre", t.getProducto() != null ? t.getProducto().getNombreProducto() : null);
        m.put("comentario", t.getComentario());
        m.put("imagenUrl", t.getImagenUrl());
        m.put("calificacion", t.getCalificacion());
        m.put("estado", t.getEstado());
        m.put("fechaCreacion", t.getFechaCreacion());
        m.put("fechaAprobacion", t.getFechaAprobacion());
        return m;
    }

    private String nombreCompleto(Testimonio t) {
        if (t.getUsuario() == null) return "Cliente";
        var u = t.getUsuario();
        String nombre = u.getNombre() != null ? u.getNombre() : "";
        String ap = u.getApellidoPaterno() != null ? u.getApellidoPaterno() : "";
        String full = (nombre + " " + ap).trim();
        return full.isEmpty() ? "Cliente" : full;
    }
}
