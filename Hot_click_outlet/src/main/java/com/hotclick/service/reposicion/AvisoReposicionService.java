package com.hotclick.service.reposicion;

import com.hotclick.model.Producto;
import com.hotclick.model.SuscripcionReposicion;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.repository.SuscripcionReposicionRepository;
import com.hotclick.service.ResendEmailService;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Envía el correo «¡Volvió!» a cada suscripción pendiente de un producto repuesto.
 * Cada suscripción se reclama con un UPDATE condicional (notificado = false → true) antes de
 * enviar: dos reposiciones simultáneas no mandan el correo dos veces. Si el envío falla, la
 * suscripción se libera para que la próxima reposición lo intente de nuevo.
 */
@Service
public class AvisoReposicionService {

    private static final Logger log = LoggerFactory.getLogger(AvisoReposicionService.class);

    private final SuscripcionReposicionRepository suscripciones;
    private final ProductoRepository productos;
    private final ResendEmailService email;
    private final ReposicionEmailBuilder plantilla;

    public AvisoReposicionService(SuscripcionReposicionRepository suscripciones,
                                  ProductoRepository productos,
                                  ResendEmailService email,
                                  ReposicionEmailBuilder plantilla) {
        this.suscripciones = suscripciones;
        this.productos = productos;
        this.email = email;
        this.plantilla = plantilla;
    }

    @Async("taskExecutor")
    public void avisarSuscriptores(Long productoId) {
        Producto producto = productos.findById(productoId).orElse(null);
        if (producto == null || producto.getStockDisponible() <= 0) return;
        List<SuscripcionReposicion> pendientes = suscripciones.findByProducto_IdAndNotificadoFalse(productoId);
        if (pendientes.isEmpty()) return;

        String asunto = plantilla.asunto(producto);
        String html = plantilla.html(producto);
        int enviados = 0;
        for (SuscripcionReposicion s : pendientes) {
            if (suscripciones.reclamarParaAviso(s.getId(), LocalDateTime.now(Constants.ZONA_CR)) == 0) {
                continue; // otra reposición concurrente ya la tomó
            }
            try {
                email.send(s.getCorreo(), asunto, html);
                enviados++;
            } catch (RuntimeException e) {
                suscripciones.liberarAviso(s.getId());
                log.warn("[avisar-reposicion] producto {} — falló el correo de la suscripción {}: {}",
                    productoId, s.getId(), e.getMessage());
            }
        }
        log.info("[avisar-reposicion] producto {} repuesto — {} aviso(s) enviados", productoId, enviados);
    }
}
