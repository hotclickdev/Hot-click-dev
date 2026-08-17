package com.hotclick.controller.aprobacion;

import com.hotclick.model.SolicitudAprobacion;
import com.hotclick.repository.SolicitudAprobacionRepository;
import org.springframework.stereotype.Component;

/**
 * Lookup de solicitudes por tipo de entidad.
 * Extraído bit-idéntico de SolicitudAprobacionController — no cambia comportamiento.
 */
@Component
public class SolicitudLookupHelper {

    private final SolicitudAprobacionRepository solicitudAprobacionRepository;

    public SolicitudLookupHelper(SolicitudAprobacionRepository solicitudAprobacionRepository) {
        this.solicitudAprobacionRepository = solicitudAprobacionRepository;
    }

    public SolicitudAprobacion findByTipo(Long id, String tipoEntidad) {
        return solicitudAprobacionRepository.findById(id)
            .filter(s -> tipoEntidad.equals(s.getTipoEntidad()))
            .orElse(null);
    }
}
