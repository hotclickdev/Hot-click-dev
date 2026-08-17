package com.hotclick.service;

import com.hotclick.model.ComprobanteFiscal;
import com.hotclick.model.Pedido;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.service.facturacion.FacturacionEmisionSupport;
import com.hotclick.service.facturacion.FacturacionEnvioProcessor;
import com.hotclick.service.facturacion.FacturacionPollingService;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.NoSuchElementException;

/**
 * Orquesta la emisión de comprobantes electrónicos a Hacienda CR.
 *
 * Flujo asíncrono:
 *   1. emitir(pedidoId, tipo) → crea ComprobanteFiscal en PENDIENTE, retorna inmediatamente
 *   2. @Async procesarAsync(id) → genera XML, firma, envía a Hacienda
 *   3. @Scheduled consultarPendientes() → hace polling a Hacienda para actualizar estado
 */
@Service
public class FacturacionService {

    private static final Logger log = LoggerFactory.getLogger(FacturacionService.class);

    private final PedidoRepository pedidoRepo;
    private final FacturacionEmisionSupport emisionSupport;
    private final FacturacionEnvioProcessor envioProcessor;
    private final FacturacionPollingService pollingService;

    public FacturacionService(PedidoRepository pedidoRepo,
                               FacturacionEmisionSupport emisionSupport,
                               FacturacionEnvioProcessor envioProcessor,
                               FacturacionPollingService pollingService) {
        this.pedidoRepo       = pedidoRepo;
        this.emisionSupport   = emisionSupport;
        this.envioProcessor   = envioProcessor;
        this.pollingService   = pollingService;
    }

    @Transactional
    public ComprobanteFiscal emitir(Long pedidoId, String tipo) {
        Pedido pedido = pedidoRepo.findById(pedidoId)
            .orElseThrow(() -> new NoSuchElementException("Pedido no encontrado: " + pedidoId));

        ComprobanteFiscal cf = emisionSupport.emitir(pedido, tipo);

        Long comprobanteId = cf.getId();
        procesarAsync(comprobanteId);

        return cf;
    }

    @Async("taskExecutor")
    @Transactional
    public void procesarAsync(Long comprobanteId) {
        try {
            envioProcessor.procesarComprobante(comprobanteId);
        } catch (Exception e) {
            log.error("[facturacion] Error procesando async comprobante={}: {}", comprobanteId, e.getMessage());
        }
    }

    @Scheduled(cron = "0 */5 * * * *")
    @SchedulerLock(name = "facturacion_polling", lockAtMostFor = "PT4M", lockAtLeastFor = "PT1M")
    @Transactional
    public void consultarPendientesHacienda() {
        pollingService.consultarPendientesHacienda();
    }
}
