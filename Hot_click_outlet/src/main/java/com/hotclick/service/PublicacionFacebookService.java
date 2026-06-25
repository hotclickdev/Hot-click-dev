package com.hotclick.service;
import com.hotclick.utils.Constants;

import com.hotclick.model.Producto;
import com.hotclick.model.PublicacionFacebook;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.repository.PublicacionFacebookRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.NumberFormat;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;

@Service
public class PublicacionFacebookService {

    private static final Logger log = LoggerFactory.getLogger(PublicacionFacebookService.class);

    @Autowired private PublicacionFacebookRepository pubRepo;
    @Autowired private ProductoRepository productoRepo;

    @Value("${app.publication.enabled:true}")
    private boolean publicacionEnabled;

    // Genera o actualiza la entrada en la cola FB para un producto
    @Transactional
    public PublicacionFacebook crearOActualizar(Long productoId, String notasAdmin) {
        Producto p = productoRepo.findById(productoId)
            .orElseThrow(() -> new RuntimeException("Producto no encontrado: " + productoId));

        PublicacionFacebook pub = pubRepo.findFirstByProductoIdOrderByFechaCreacionDesc(productoId)
            .orElse(new PublicacionFacebook());

        pub.setProducto(p);
        pub.setTituloFb(generarTitulo(p));
        pub.setTextoFb(generarTexto(p));
        pub.setPrecioPublicar(p.getPrecioVenta());
        pub.setCondicionFb(mapearCondicion(p.getCondicion()));
        pub.setCategoriaFb(p.getCategoria() != null ? p.getCategoria().getNombreCategoria() : "Electrónica");
        pub.setEstadoPublicacion("LISTO");
        if (notasAdmin != null) pub.setNotasAdmin(notasAdmin);

        return pubRepo.save(pub);
    }

    @Transactional
    public PublicacionFacebook marcarPublicado(Long id) {
        PublicacionFacebook pub = pubRepo.findById(id)
            .orElseThrow(() -> new RuntimeException("Publicación no encontrada: " + id));
        pub.setEstadoPublicacion("PUBLICADO");
        pub.setFechaPublicacion(LocalDateTime.now(Constants.ZONA_CR));
        return pubRepo.save(pub);
    }

    @Transactional
    public void eliminar(Long id) {
        pubRepo.deleteById(id);
    }

    public List<PublicacionFacebook> listarTodas() {
        return pubRepo.findAllByOrderByFechaCreacionDesc();
    }

    public List<PublicacionFacebook> listarPorEstado(String estado) {
        return pubRepo.findByEstadoPublicacionOrderByFechaCreacionDesc(estado);
    }

    // Corre cada N minutos para generar texto FB a productos nuevos sin entrada en cola
    @Scheduled(fixedDelayString = "${app.publication.interval-ms:1800000}")
    @SchedulerLock(name = "publicacion_facebook_scheduler", lockAtMostFor = "PT25M", lockAtLeastFor = "PT5M")
    @Transactional
    public void generarParaProductosNuevos() {
        if (!publicacionEnabled) return;
        // Solo los productos que aún no tienen publicación — máximo 50 por ejecución
        List<Producto> productos = productoRepo.findActivosSinPublicacion(PageRequest.of(0, 50));
        int creados = 0;
        for (Producto p : productos) {
            try {
                crearOActualizar(p.getId(), null);
                creados++;
            } catch (Exception e) {
                log.warn("No se pudo generar publicación para producto {}: {}", p.getId(), e.getMessage());
            }
        }
        if (creados > 0) log.info("PublicacionScheduler: {} entradas FB generadas", creados);
    }

    private String generarTitulo(Producto p) {
        String nombre = p.getTituloProducto() != null ? p.getTituloProducto() : p.getNombreProducto();
        return nombre != null ? nombre : "Producto";
    }

    private String generarTexto(Producto p) {
        NumberFormat fmt = NumberFormat.getNumberInstance(Locale.of("es", "CR"));
        StringBuilder sb = new StringBuilder();

        String nombre = p.getTituloProducto() != null ? p.getTituloProducto() : p.getNombreProducto();
        sb.append("🛒 ").append(nombre).append("\n\n");

        if (p.getDescripcionCorta() != null && !p.getDescripcionCorta().isBlank()) {
            sb.append(p.getDescripcionCorta()).append("\n\n");
        }

        sb.append("💰 Precio: ₡").append(fmt.format(p.getPrecioVenta())).append("\n");
        sb.append("📦 Stock disponible: ").append(p.getStockDisponible()).append(" unidades\n");

        if (p.getCondicion() != null) {
            sb.append("✅ Condición: ").append(mapearCondicion(p.getCondicion())).append("\n");
        }

        sb.append("\n📲 Contáctanos por WhatsApp o mensaje directo para más información.\n");
        sb.append("🚚 Envíos a todo Costa Rica.");

        return sb.toString();
    }

    private String mapearCondicion(String condicion) {
        if (condicion == null) return "Nuevo";
        return switch (condicion.toUpperCase()) {
            case "NUEVO" -> "Nuevo";
            case "USADO" -> "Usado - Buenas condiciones";
            case "REACONDICIONADO" -> "Reacondicionado por el vendedor";
            default -> condicion;
        };
    }
}
