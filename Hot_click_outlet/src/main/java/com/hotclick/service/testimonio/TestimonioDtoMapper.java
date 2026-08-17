package com.hotclick.service.testimonio;

import com.hotclick.model.Testimonio;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.Map;

@Component
public class TestimonioDtoMapper {

    public Map<String, Object> toPublicMap(Testimonio t) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", t.getId());
        m.put("tipo", t.getTipo());
        m.put("nombreUsuario", nombreCompleto(t));
        m.put("productoNombre", t.getProducto() != null ? t.getProducto().getNombreProducto() : null);
        m.put("comentario", t.getComentario());
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
