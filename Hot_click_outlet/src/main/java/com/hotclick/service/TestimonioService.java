package com.hotclick.service;

import com.hotclick.model.Testimonio;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.repository.TestimonioRepository;
import com.hotclick.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class TestimonioService {

    @Autowired private TestimonioRepository repo;
    @Autowired private UsuarioRepository usuarioRepo;
    @Autowired private ProductoRepository productoRepo;
    @Autowired private PedidoRepository pedidoRepo;

    /**
     * Crea un testimonio. Valida:
     * 1. El usuario compró el producto (estado de pedido válido).
     * 2. Aún no tiene un testimonio para ese producto.
     */
    public Testimonio crear(String correo, String comentario, String imagenUrl, Long productoId) {
        var usuario = usuarioRepo.findByCorreo(correo)
            .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        if (productoId == null)
            throw new RuntimeException("Debes seleccionar el producto que compraste");

        var producto = productoRepo.findById(productoId)
            .orElseThrow(() -> new RuntimeException("Producto no encontrado"));

        Long compras = repo.countCompra(productoId, usuario.getId());
        if (compras == null || compras == 0)
            throw new RuntimeException("Solo puedes dejar un testimonio de productos que hayas comprado");

        if (repo.existsByUsuarioIdAndProductoId(usuario.getId(), productoId))
            throw new RuntimeException("Ya enviaste un testimonio para este producto");

        Testimonio t = new Testimonio();
        t.setUsuario(usuario);
        t.setProducto(producto);
        t.setComentario(comentario.trim());
        t.setImagenUrl(imagenUrl);
        return repo.save(t);
    }

    /** Lista aprobados para el endpoint público (sin email ni datos sensibles). */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> listarAprobadosPublico() {
        return repo.findByEstadoOrderByFechaAprobacionDesc("APROBADO")
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

    /** Testimonios del usuario (para que el frontend sepa cuáles productos ya revisó). */
    public List<Map<String, Object>> listarPorUsuario(String correo) {
        var usuario = usuarioRepo.findByCorreo(correo)
            .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        return repo.findByUsuarioIdOrderByFechaCreacionDesc(usuario.getId())
            .stream()
            .map(t -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", t.getId());
                m.put("productoId", t.getProducto() != null ? t.getProducto().getId() : null);
                m.put("productoNombre", t.getProducto() != null ? t.getProducto().getNombreProducto() : null);
                m.put("comentario", t.getComentario());
                m.put("estado", t.getEstado());
                m.put("fechaCreacion", t.getFechaCreacion());
                return m;
            })
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

    /**
     * Productos entregados al usuario, enriquecidos con si ya dejó reseña.
     * Desduplicado por producto (varios pedidos del mismo item → una entrada).
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
                boolean yaReseno = repo.existsByUsuarioIdAndProductoId(usuario.getId(), p.getId());
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("productoId", p.getId());
                m.put("nombre", p.getNombreProducto());
                m.put("imagenUrl", p.getImagenPrincipalUrl());
                m.put("pedidoId", pedido.getId());
                m.put("yaReseno", yaReseno);
                vistos.put(p.getId(), m);
            }
        }
        return new ArrayList<>(vistos.values());
    }

    // ── Proyecciones ─────────────────────────────────────────────────────────

    private Map<String, Object> toPublicMap(Testimonio t) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", t.getId());
        m.put("nombreUsuario", nombreCompleto(t));
        m.put("productoNombre", t.getProducto() != null ? t.getProducto().getNombreProducto() : null);
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
        m.put("productoId", t.getProducto() != null ? t.getProducto().getId() : null);
        m.put("productoNombre", t.getProducto() != null ? t.getProducto().getNombreProducto() : null);
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
