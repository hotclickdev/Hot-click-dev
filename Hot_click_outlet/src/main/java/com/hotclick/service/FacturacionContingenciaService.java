package com.hotclick.service;

import com.hotclick.model.ColaFacturacionOffline;
import com.hotclick.model.ComprobanteFiscal;
import com.hotclick.model.Empresa;
import com.hotclick.model.Pedido;
import com.hotclick.repository.ComprobanteFiscalRepository;
import com.hotclick.security.TenantContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Dead-letter queue para comprobantes que agotaron sus reintentos rápidos en
 * FacturacionService (ESTADO_ERROR) y necesitan esperar a que Hacienda se
 * restablezca. FacturacionContingenciaScheduler la procesa cada 5 minutos.
 *
 * Esta clase NO es @Transactional: orquesta una secuencia de transacciones
 * cortas e independientes (ColaFacturacionOfflineTxOps, REQUIRES_NEW) con
 * una llamada HTTP a Hacienda en medio. El call HTTP nunca ocurre dentro de
 * una transacción de BD — imprescindible con PgBouncer en transaction mode
 * (mismo criterio documentado en FacturacionService).
 */
@Service
public class FacturacionContingenciaService {

    private static final Logger log = LoggerFactory.getLogger(FacturacionContingenciaService.class);

    private static final int TAMANO_LOTE = 20;

    private final ColaFacturacionOfflineTxOps txOps;
    private final ComprobanteFiscalRepository comprobanteRepo;
    private final XmlFacturaBuilder xmlBuilder;
    private final FirmaDigitalService firmaService;
    private final HaciendaApiClient haciendaClient;

    public FacturacionContingenciaService(ColaFacturacionOfflineTxOps txOps,
                                           ComprobanteFiscalRepository comprobanteRepo,
                                           XmlFacturaBuilder xmlBuilder,
                                           FirmaDigitalService firmaService,
                                           HaciendaApiClient haciendaClient) {
        this.txOps           = txOps;
        this.comprobanteRepo = comprobanteRepo;
        this.xmlBuilder       = xmlBuilder;
        this.firmaService     = firmaService;
        this.haciendaClient   = haciendaClient;
    }

    /**
     * Encola un comprobante que agotó sus reintentos normales. Llamado desde
     * FacturacionService al caer en ESTADO_ERROR definitivo. Idempotente:
     * si ya está en cola (constraint UNIQUE en fk_id_comprobante), no duplica.
     */
    public void encolar(Long comprobanteId) {
        txOps.encolar(comprobanteId);
    }

    /**
     * Punto de entrada del scheduler. Reclama un lote (FOR UPDATE SKIP LOCKED,
     * ver ColaFacturacionOfflineRepository) y lo procesa uno a uno.
     */
    public void procesarPendientes() {
        List<ColaFacturacionOffline> lote = txOps.reclamarLote(TAMANO_LOTE);
        if (lote.isEmpty()) {
            return;
        }
        log.info("[contingencia] {} comprobante(s) reclamado(s) para reintento", lote.size());
        for (ColaFacturacionOffline item : lote) {
            procesarItem(item);
        }
    }

    private void procesarItem(ColaFacturacionOffline item) {
        try {
            // Empresa propietaria de ESTE comprobante específico — trazabilidad
            // multi-tenant correcta aunque el lote mezcle facturas de varias empresas.
            TenantContext.set(item.getEmpresaId());

            ComprobanteFiscal cf = comprobanteRepo.findById(item.getComprobanteId()).orElse(null);
            if (cf == null) {
                txOps.marcarAgotado(item.getId(), "El comprobante ya no existe");
                return;
            }

            Empresa empresa = cf.getEmpresa();
            Pedido pedido = cf.getPedido();

            String xmlSinFirmar = xmlBuilder.construir(cf, empresa, pedido);
            String xmlFirmado = firmaService.firmar(xmlSinFirmar, empresa);

            // Fuera de transacción de BD a propósito: puede tardar varios segundos
            // y, si el circuito está abierto, el fallback de HaciendaApiClient
            // responde rápido sin gastar el intento en una llamada real.
            boolean enviado = haciendaClient.enviar(xmlFirmado, cf.getClaveNumerica(), empresa);

            if (enviado) {
                txOps.marcarCompletado(item.getId(), cf.getId());
            } else {
                txOps.marcarFallo(item.getId(), "Hacienda no aceptó la recepción (circuit breaker abierto o error HTTP)");
            }
        } catch (Exception e) {
            log.error("[contingencia] error procesando cola_offline={} comprobante={}: {}",
                item.getId(), item.getComprobanteId(), e.getMessage());
            txOps.marcarFallo(item.getId(), e.getMessage());
        } finally {
            TenantContext.clear();
        }
    }
}
