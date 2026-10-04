package com.hotclick.service.sinpe;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * La auto-aprobación de comprobantes SINPE está apagada.
 * Un comprobante solo pasa a pagado cuando una persona lo revisa.
 */
@Service
public class SinpeAutoApprovalService {

    private static final Logger log = LoggerFactory.getLogger(SinpeAutoApprovalService.class);

    public void autoAprobarExpirados() {
        log.info("[sinpe-auto-aprobacion] Deshabilitada: los comprobantes quedan pendientes hasta revisión manual");
    }
}
