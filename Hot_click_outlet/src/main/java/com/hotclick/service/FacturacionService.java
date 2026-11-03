package com.hotclick.service;

import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.ComprobanteFiscal;
import com.hotclick.model.Pedido;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.facturacion.FacturacionEmisionSupport;
import com.hotclick.service.facturacion.ComprobanteEmitidoEvent;
import org.springframework.context.ApplicationEventPublisher;
import com.hotclick.service.facturacion.FacturacionPollingService;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;


/**
 * Orquesta la emisión de comprobantes electrónicos a Hacienda CR.
 *
 * Flujo asíncrono:
 *   1. emitir(pedidoId, tipo) → crea ComprobanteFiscal en PENDIENTE, retorna inmediatamente
 *   2. Publica ComprobanteEmitidoEvent; FacturacionAsyncRunner (@Async, AFTER_COMMIT) firma y envía
 *      fuera de la transacción
 *   3. @Scheduled consultarPendientes() → hace polling a Hacienda para actualizar estado
 */
@Service
public class FacturacionService {

    private static final Logger log = LoggerFactory.getLogger(FacturacionService.class);

    private final PedidoRepository pedidoRepo;
    private final FacturacionEmisionSupport emisionSupport;
    private final ApplicationEventPublisher eventos;
    private final FacturacionPollingService pollingService;
    private final CompanyScope companyScope;

    public FacturacionService(PedidoRepository pedidoRepo,
                               FacturacionEmisionSupport emisionSupport,
                               ApplicationEventPublisher eventos,
                               FacturacionPollingService pollingService,
                               CompanyScope companyScope) {
        this.pedidoRepo       = pedidoRepo;
        this.emisionSupport   = emisionSupport;
        this.eventos          = eventos;
        this.pollingService   = pollingService;
        this.companyScope     = companyScope;
    }

    public static final String MSG_PEDIDO_PRUEBA =
        "Este pedido se cobró en modo prueba y no se puede facturar ante Hacienda.";

    /** P-04: un pedido cobrado con llave ONVO de prueba nunca se factura ante Hacienda. */
    public static void exigirNoPrueba(Pedido pedido) {
        if (pedido != null && pedido.isEsPrueba()) throw new IllegalStateException(MSG_PEDIDO_PRUEBA);
    }

    @Transactional
    public ComprobanteFiscal emitir(Long pedidoId, String tipo) {
        Pedido pedido = pedidoRepo.findById(pedidoId)
            .orElseThrow(() -> RecursoNoEncontradoException.conDetalle("Pedido no encontrado", "pedidoId=" + pedidoId));
        companyScope.assertCanAccessNullable(pedido.getEmpresaId());
        exigirNoPrueba(pedido);

        ComprobanteFiscal cf = emisionSupport.emitir(pedido, tipo);

        eventos.publishEvent(new ComprobanteEmitidoEvent(cf.getId()));

        return cf;
    }

    /**
     * Tiquete de la compra marketplace. Sin certificado queda PENDIENTE y no se llama a Hacienda.
     * REQUIRES_NEW: lo llama un listener AFTER_COMMIT, donde la transacción original ya cerró;
     * así el evento de envío se dispara al commit de esta transacción nueva.
     */
    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.REQUIRES_NEW)
    public ComprobanteFiscal emitirTiqueteDeCompra(Long compraId) {
        ComprobanteFiscal cf = emisionSupport.emitirTiqueteDeCompra(compraId);
        if (cf == null || !ComprobanteFiscal.ESTADO_PENDIENTE.equals(cf.getEstado())) {
            return cf;
        }
        if (cf.getEmpresa() != null && cf.getEmpresa().isConfiguracionFiscalCompleta()) {
            eventos.publishEvent(new ComprobanteEmitidoEvent(cf.getId()));
        }
        return cf;
    }

    @Scheduled(cron = "0 */5 * * * *")
    @SchedulerLock(name = "facturacion_polling", lockAtMostFor = "PT4M", lockAtLeastFor = "PT1M")
    public void consultarPendientesHacienda() {
        pollingService.consultarPendientesHacienda();
    }
}
