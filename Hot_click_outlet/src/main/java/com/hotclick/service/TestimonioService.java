package com.hotclick.service;

import com.hotclick.model.Testimonio;
import com.hotclick.repository.TestimonioRepository;
import com.hotclick.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class TestimonioService {

    @Autowired private TestimonioRepository repo;
    @Autowired private UsuarioRepository usuarioRepo;

    public Testimonio crear(String correo, String comentario, String imagenUrl) {
        var usuario = usuarioRepo.findByCorreo(correo)
            .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        Testimonio t = new Testimonio();
        t.setUsuario(usuario);
        t.setComentario(comentario.trim());
        t.setImagenUrl(imagenUrl);
        return repo.save(t);
    }

    /** Proyección segura para el endpoint público — no expone email ni datos sensibles. */
    public List<Map<String, Object>> listarAprobadosPublico() {
        return repo.findByEstadoOrderByFechaAprobacionDesc("APROBADO")
            .stream()
            .map(this::toPublicMap)
            .toList();
    }

    public List<Map<String, Object>> listarTodosAdmin() {
        return repo.findAllByOrderByFechaCreacionDesc()
            .stream()
            .map(this::toAdminMap)
            .toList();
    }

    public Testimonio aprobar(Long id) {
        Testimonio t = repo.findById(id)
            .orElseThrow(() -> new RuntimeException("Testimonio no encontrado"));
        t.setEstado("APROBADO");
        t.setFechaAprobacion(LocalDateTime.now());
        return repo.save(t);
    }

    public Testimonio rechazar(Long id) {
        Testimonio t = repo.findById(id)
            .orElseThrow(() -> new RuntimeException("Testimonio no encontrado"));
        t.setEstado("RECHAZADO");
        return repo.save(t);
    }

    private Map<String, Object> toPublicMap(Testimonio t) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", t.getId());
        m.put("nombreUsuario", nombreCompleto(t));
        m.put("comentario", t.getComentario());
        m.put("imagenUrl", t.getImagenUrl());
        m.put("fechaAprobacion", t.getFechaAprobacion());
        return m;
    }

    private Map<String, Object> toAdminMap(Testimonio t) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", t.getId());
        m.put("nombreUsuario", nombreCompleto(t));
        m.put("correoUsuario", t.getUsuario() != null ? t.getUsuario().getCorreo() : null);
        m.put("comentario", t.getComentario());
        m.put("imagenUrl", t.getImagenUrl());
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
