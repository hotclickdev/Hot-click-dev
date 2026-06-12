package com.hotclick.service;

import com.hotclick.model.Testimonio;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.repository.TestimonioRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.utils.InputSanitizer;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class TestimonioService {

    private static final int MAX_RESENAS_POR_PRODUCTO = 3;

    @Autowired private TestimonioRepository repo;
    @Autowired private UsuarioRepository usuarioRepo;
    @Autowired private ProductoRepository productoRepo;
    @Autowired private PedidoRepository pedidoRepo;
    @Autowired private InputSanitizer sanitizer;

    /**
     * Crea un testimonio general sobre la web/servicio.
     * No requiere producto ni compra previa. Calificación opcional.
     */
    @CacheEvict(value = "testimonios-publicos", allEntries = true)
    public Testimonio crearTestimonio(String correo, String comentario, String imagenUrl, Integer calificacion) {
        var usuario = usuarioRepo.findByCorreo(correo)
            .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        if (calificacion != null && (calificacion < 1 || calificacion > 5))
            throw new RuntimeException("La calificación debe ser entre 1 y 5 estrellas");

        Testimonio t = new Testimonio();
        t.setUsuario(usuario);
        t.setTipo("TESTIMONIO");
        t.setComentario(sanitizer.cleanWithLimit(comentario, 1000));
        t.setImagenUrl(imagenUrl != null ? sanitizer.cleanWithLimit(imagenUrl, 1000) : null);
        t.setCalificacion(calificacion);
        return repo.save(t);
    }

    /**
     * Crea una reseña de producto. Valida:
     * 1. El usuario compró el producto.
     * 2. No superó el límite de 3 reseñas para ese producto.
     * 3. Calificación requerida (1-5).
     */
    @CacheEvict(value = "testimonios-publicos", allEntries = true)
    public Testimonio crearResena(String correo, String comentario, String imagenUrl, Long productoId, Integer calificacion) {
        var usuario = usuarioRepo.findByCorreo(correo)
            .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        if (productoId == null)
            throw new RuntimeException("Debes seleccionar el producto que compraste");

        var producto = productoRepo.findById(productoId)
            .orElseThrow(() -> new RuntimeException("Producto no encontrado"));

        Long compras = repo.countCompra(productoId, usuario.getId());
        if (compras == null || compras == 0)
            throw new RuntimeException("Solo puedes reseñar productos que hayas comprado");

        long resenasPrevias = repo.countByUsuarioIdAndProductoIdAndTipo(usuario.getId(), productoId, "RESENA");
        if (resenasPrevias >= MAX_RESENAS_POR_PRODUCTO)
            throw new RuntimeException("Ya alcanzaste el límite de " + MAX_RESENAS_POR_PRODUCTO + " reseñas para este producto");

        if (calificacion == null)
            throw new RuntimeException("La calificación es obligatoria");
        if (calificacion < 1 || calificacion > 5)
            throw new RuntimeException("La calificación debe ser entre 1 y 5 estrellas");

        Testimonio t = new Testimonio();
        t.setUsuario(usuario);
        t.setProducto(producto);
        t.setTipo("RESENA");
        t.setComentario(sanitizer.cleanWithLimit(comentario, 1000));
        t.setImagenUrl(imagenUrl != null ? sanitizer.cleanWithLimit(imagenUrl, 1000) : null);
        t.setCalificacion(calificacion);
        return repo.save(t);
    }

    /** Testimonios generales aprobados (para carrusel de la web). */
    @Cacheable("testimonios-publicos")
    @Transactional(readOnly = true)
    public List<Map<String, Object>> listarAprobadosPublico() {
        return repo.findByEstadoAndTipoOrderByFechaAprobacionDesc("APROBADO", "TESTIMONIO")
            .stream()
            .map(this::toPublicMap)
            .toList();
    }

    /** Reseñas aprobadas de un producto (para página de detalle). */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> listarResenasProducto(Long productoId) {
        return repo.findResenasByProducto(productoId)
            .stream()
            .map(this::toPublicMap)
            .toList();
    }

    /** Lista todos para el admin. */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> listarTodosAdmin() {
        return repo.findAllByOrderByFechaCreacionDesc()
            .stream()
            .map(this::toAdminMap)
            .toList();
    }

    /** Testimonios y reseñas del usuario autenticado. */
    public List<Map<String, Object>> listarPorUsuario(String correo) {
        var usuario = usuarioRepo.findByCorreo(correo)
            .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        return repo.findByUsuarioIdOrderByFechaCreacionDesc(usuario.getId())
            .stream()
            .map(t -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", t.getId());
                m.put("tipo", t.getTipo());
                m.put("productoId", t.getProducto() != null ? t.getProducto().getId() : null);
                m.put("productoNombre", t.getProducto() != null ? t.getProducto().getNombreProducto() : null);
                m.put("comentario", t.getComentario());
                m.put("calificacion", t.getCalificacion());
                m.put("estado", t.getEstado());
                m.put("fechaCreacion", t.getFechaCreacion());
                return m;
            })
            .toList();
    }

    /**
     * Productos entregados al usuario con cuántas reseñas ya dejó (máx 3).
     */
    public List<Map<String, Object>> productosParaResenar(String correo) {
        var usuario = usuarioRepo.findByCorreo(correo)
            .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        var pedidos = pedidoRepo.findEntregadosConItemsByUsuarioId(usuario.getId());

        Map<Long, Map<String, Object>> vistos = new LinkedHashMap<>();
        for (var pedido : pedidos) {
            if (pedido.getItems() == null) continue;
            for (var item : pedido.getItems()) {
                var p = item.getProducto();
                if (p == null || vistos.containsKey(p.getId())) continue;
                long resenasEnviadas = repo.countByUsuarioIdAndProductoIdAndTipo(usuario.getId(), p.getId(), "RESENA");
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("productoId", p.getId());
                m.put("nombre", p.getNombreProducto());
                m.put("imagenUrl", p.getImagenPrincipalUrl());
                m.put("pedidoId", pedido.getId());
                m.put("resenasEnviadas", resenasEnviadas);
                m.put("puedeResenar", resenasEnviadas < MAX_RESENAS_POR_PRODUCTO);
                vistos.put(p.getId(), m);
            }
        }
        return new ArrayList<>(vistos.values());
    }

    @CacheEvict(value = "testimonios-publicos", allEntries = true)
    public Testimonio aprobar(Long id) {
        Testimonio t = repo.findById(id)
            .orElseThrow(() -> new RuntimeException("Testimonio no encontrado"));
        t.setEstado("APROBADO");
        t.setFechaAprobacion(LocalDateTime.now());
        return repo.save(t);
    }

    @CacheEvict(value = "testimonios-publicos", allEntries = true)
    public Testimonio rechazar(Long id) {
        Testimonio t = repo.findById(id)
            .orElseThrow(() -> new RuntimeException("Testimonio no encontrado"));
        t.setEstado("RECHAZADO");
        return repo.save(t);
    }

    public Map<String, Object> getRatingStats(Long productoId) {
        Double avg   = repo.avgCalificacion(productoId);
        Long   count = repo.countAprobadosConCalificacion(productoId);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("reviewCount", count == null ? 0 : count);
        m.put("ratingValue",  avg  == null ? null : Math.round(avg * 10.0) / 10.0);
        return m;
    }

    private Map<String, Object> toPublicMap(Testimonio t) {
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

    private Map<String, Object> toAdminMap(Testimonio t) {
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
