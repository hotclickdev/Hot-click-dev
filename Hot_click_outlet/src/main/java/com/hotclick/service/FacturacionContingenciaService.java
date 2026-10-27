package com.hotclick.service;

import com.hotclick.model.ColaFacturacionOffline;
import com.hotclick.model.ComprobanteFiscal;
import com.hotclick.repository.ComprobanteFiscalRepository;
import com.hotclick.service.facturacion.ComprobanteXmlPreparer;
import com.hotclick.service.hacienda.ComprobanteInvalidoException;
import com.hotclick.service.hacienda.ResultadoEnvioHacienda;
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

    /** L4 (#406): minutos en PROCESANDO tras los cuales se considera trabada (el proceso que la reclamó cayó). */
    @org.springframework.beans.factory.annotation.Value("${hotclick.facturacion.contingencia.procesando-timeout-minutos:30}")
    private long procesandoTimeoutMinutos = 30;

    private final ColaFacturacionOfflineTxOps txOps;
    private final ComprobanteFiscalRepository comprobanteRepo;
    private final ComprobanteXmlPreparer preparer;
    private final HaciendaApiClient haciendaClient;

    public FacturacionContingenciaService(ColaFacturacionOfflineTxOps txOps,
                                           ComprobanteFiscalRepository comprobanteRepo,
                                           @org.springframework.context.annotation.Lazy ComprobanteXmlPreparer preparer,
                                           HaciendaApiClient haciendaClient) {
        this.txOps           = txOps;
        this.comprobanteRepo = comprobanteRepo;
        this.preparer         = preparer;
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
        recuperarTrabadas();
        List<ColaFacturacionOffline> lote = txOps.reclamarLote(TAMANO_LOTE);
        if (lote.isEmpty()) {
            return;
        }
        log.info("[contingencia] {} comprobante(s) reclamado(s) para reintento", lote.size());
        for (ColaFacturacionOffline item : lote) {
            procesarItem(item);
        }
    }

    /** Antes de reclamar: las filas PROCESANDO huérfanas vuelven a PENDIENTE y entran en este mismo ciclo. */
    void recuperarTrabadas() {
        try {
            txOps.recuperarTrabadas(java.time.Duration.ofMinutes(Math.max(1, procesandoTimeoutMinutos)), TAMANO_LOTE * 5);
        } catch (Exception e) {
            log.error("[contingencia] no se pudieron recuperar filas trabadas: {}", e.getClass().getSimpleName());
        }
    }

    private void procesarItem(ColaFacturacionOffline item) {
        try {
            // Empresa propietaria de ESTE comprobante específico — trazabilidad
            // multi-tenant correcta aunque el lote mezcle facturas de varias empresas.
            TenantContext.set(item.getEmpresaId());

            if (comprobanteRepo.findById(item.getComprobanteId()).isEmpty()) {
                txOps.marcarAgotado(item.getId(), "El comprobante ya no existe");
                return;
            }

            // Arma, firma y valida contra el XSD oficial en una transacción corta de solo lectura.
            ComprobanteXmlPreparer.Preparado p = preparer.preparar(item.getComprobanteId());

            // Fuera de transacción de BD a propósito: puede tardar varios segundos.
            // Fallas transitorias salen como HaciendaTransitoriaException y caen al catch.
            ResultadoEnvioHacienda r = haciendaClient.enviar(p.xmlFirmado(), p.clave(), p.empresa());

            if (r.recibido()) {
                txOps.marcarCompletado(item.getId(), p.comprobanteId());
            } else {
                // 4xx: Hacienda rechazó la recepción; reenviar el mismo XML no lo arregla.
                txOps.marcarAgotado(item.getId(), r.motivo());
            }
        } catch (ComprobanteInvalidoException e) {
            log.error("[contingencia] comprobante={} no cumple el XSD oficial: {}", item.getComprobanteId(), e.getMessage());
            txOps.marcarAgotado(item.getId(), e.getMessage());
        } catch (Exception e) {
            log.error("[contingencia] error procesando cola_offline={} comprobante={}: {}",
                item.getId(), item.getComprobanteId(), e.getMessage());
            txOps.marcarFallo(item.getId(), e.getMessage());
        } finally {
            TenantContext.clear();
        }
    }
}
