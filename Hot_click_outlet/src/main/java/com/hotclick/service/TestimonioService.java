package com.hotclick.service;
import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.utils.Constants;

import com.hotclick.model.Testimonio;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.repository.TestimonioRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.service.testimonio.TestimonioDtoMapper;
import com.hotclick.service.testimonio.TestimonioResenaSupport;
import com.hotclick.utils.InputSanitizer;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class TestimonioService {

    @Autowired private TestimonioRepository repo;
    @Autowired private UsuarioRepository usuarioRepo;
    @Autowired private ProductoRepository productoRepo;
    @Autowired private InputSanitizer sanitizer;
    @Autowired private TestimonioDtoMapper dtoMapper;
    @Autowired private TestimonioResenaSupport resenaSupport;
    @Autowired private ModeracionAvisoService moderacionAvisoService;

    /**
     * Crea un testimonio general sobre la web/servicio.
     * No requiere producto ni compra previa. Calificación opcional.
     */
    @CacheEvict(value = "testimonios-publicos", allEntries = true)
    public Testimonio crearTestimonio(String correo, String comentario, String imagenUrl, Integer calificacion) {
        var usuario = usuarioRepo.findByCorreo(correo)
            .orElseThrow(() -> new RecursoNoEncontradoException("Usuario no encontrado"));

        if (calificacion != null && (calificacion < 1 || calificacion > 5))
            throw new IllegalArgumentException("La calificación debe ser entre 1 y 5 estrellas");

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
            .orElseThrow(() -> new RecursoNoEncontradoException("Usuario no encontrado"));

        if (productoId == null)
            throw new IllegalArgumentException("Debes seleccionar el producto que compraste");

        var producto = productoRepo.findById(productoId)
            .orElseThrow(() -> new RecursoNoEncontradoException("Producto no encontrado"));

        Long compras = repo.countCompra(productoId, usuario.getId());
        if (compras == null || compras == 0)
            throw new IllegalArgumentException("Solo puedes reseñar productos que hayas comprado");

        long resenasPrevias = repo.countByUsuarioIdAndProductoIdAndTipo(usuario.getId(), productoId, "RESENA");
        if (resenasPrevias >= TestimonioResenaSupport.MAX_RESENAS_POR_PRODUCTO)
            throw new IllegalArgumentException("Ya alcanzaste el límite de " + TestimonioResenaSupport.MAX_RESENAS_POR_PRODUCTO + " reseñas para este producto");

        if (calificacion == null)
            throw new IllegalArgumentException("La calificación es obligatoria");
        if (calificacion < 1 || calificacion > 5)
            throw new IllegalArgumentException("La calificación debe ser entre 1 y 5 estrellas");

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
            .map(dtoMapper::toPublicMap)
            .toList();
    }

    /** Reseñas aprobadas de un producto (para página de detalle). */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> listarResenasProducto(Long productoId) {
        return repo.findResenasByProducto(productoId)
            .stream()
            .map(dtoMapper::toPublicMap)
            .toList();
    }

    /** Lista todos para el admin. */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> listarTodosAdmin() {
        return repo.findAllByOrderByFechaCreacionDesc()
            .stream()
            .map(dtoMapper::toAdminMap)
            .toList();
    }

    /** Testimonios y reseñas del usuario autenticado. */
    public List<Map<String, Object>> listarPorUsuario(String correo) {
        var usuario = usuarioRepo.findByCorreo(correo)
            .orElseThrow(() -> new RecursoNoEncontradoException("Usuario no encontrado"));
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

    public List<Map<String, Object>> productosParaResenar(String correo) {
        var usuario = usuarioRepo.findByCorreo(correo)
            .orElseThrow(() -> new RecursoNoEncontradoException("Usuario no encontrado"));
        return resenaSupport.productosParaResenar(usuario.getId());
    }

    @CacheEvict(value = "testimonios-publicos", allEntries = true)
    @Transactional
    public Testimonio aprobar(Long id) {
        Testimonio t = repo.findById(id)
            .orElseThrow(() -> new RecursoNoEncontradoException("Testimonio no encontrado"));
        t.setEstado("APROBADO");
        t.setFechaAprobacion(LocalDateTime.now(Constants.ZONA_CR));
        Testimonio guardado = repo.save(t);
        avisarAutor(guardado, true);
        return guardado;
    }

    @CacheEvict(value = "testimonios-publicos", allEntries = true)
    @Transactional
    public Testimonio rechazar(Long id) {
        Testimonio t = repo.findById(id)
            .orElseThrow(() -> new RecursoNoEncontradoException("Testimonio no encontrado"));
        t.setEstado("RECHAZADO");
        Testimonio guardado = repo.save(t);
        avisarAutor(guardado, false);
        return guardado;
    }

    private void avisarAutor(Testimonio t, boolean aprobada) {
        if (t.getUsuario() == null || t.getUsuario().getCorreo() == null) return;
        String productoNombre = t.getProducto() != null ? t.getProducto().getNombreProducto() : null;
        moderacionAvisoService.avisarResena(
            t.getUsuario().getCorreo(),
            t.getUsuario().getNombre(),
            aprobada,
            productoNombre);
    }

    public Map<String, Object> getRatingStats(Long productoId) {
        Double avg   = repo.avgCalificacion(productoId);
        Long   count = repo.countAprobadosConCalificacion(productoId);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("reviewCount", count == null ? 0 : count);
        m.put("ratingValue",  avg  == null ? null : Math.round(avg * 10.0) / 10.0);
        return m;
    }
}
