package com.hotclick.controller.observabilidad;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.service.whatsapp.WhatsAppOperacionStatus;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Construcción de métricas del dashboard de observabilidad.
 * Extraído bit-idéntico de ObservabilityController — no cambia comportamiento.
 */
@Component
public class ObservabilityMetricsHandler {

    private static final Logger log = LoggerFactory.getLogger(ObservabilityMetricsHandler.class);

    @Autowired private ObservabilityNegocioMetrics negocioMetrics;
    @Autowired private ObservabilityHttpMetrics    httpMetrics;
    @Autowired private ObservabilityJvmMetrics     jvmMetrics;
    @Autowired private WhatsAppOperacionStatus     whatsAppOperacionStatus;

    public ResponseEntity<ResponseDTO> getMetrics() {
        try {
            Map<String, Object> metrics = new LinkedHashMap<>();

            metrics.put("empresas",  negocioMetrics.empresas());
            metrics.put("pedidos",   negocioMetrics.pedidos());
            metrics.put("pagos",     negocioMetrics.pagos());
            metrics.put("usuarios",  negocioMetrics.usuarios());
            metrics.put("seguridad", negocioMetrics.seguridad());
            metrics.put("ia",        negocioMetrics.ia());
            metrics.put("webhooks",  negocioMetrics.webhooks());
            metrics.put("productos", negocioMetrics.productos());

            jvmMetrics.agregarBaseDeDatos(metrics);
            metrics.put("circuitBreakers", httpMetrics.circuitBreakers());
            jvmMetrics.agregarCaches(metrics);
            jvmMetrics.agregarHikari(metrics);

            metrics.put("integraciones", Map.of("whatsappModo", whatsAppOperacionStatus.modo()));
            metrics.put("generadoEn", LocalDateTime.now(Constants.ZONA_CR).toString());

            return ResponseEntity.ok(ResponseDTO.success("Métricas de plataforma", metrics));

        } catch (Exception e) {
            log.error("[observabilidad] Error: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError()
                .body(ResponseDTO.error("Error al obtener métricas"));
        }
    }
}
