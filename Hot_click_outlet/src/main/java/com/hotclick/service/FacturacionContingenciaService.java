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

    /** Fila que ya se envió (o se intentó) antes: recuperada de PROCESANDO o reintentada tras un fallo. */
    private static boolean esReintento(ColaFacturacionOffline item) {
        return item.getIntentos() != null && item.getIntentos() > 0;
    }

    /**
     * Pregunta a Hacienda por la clave tras un 4xx en un reintento. true = Hacienda responde la consulta (el
     * documento existe, en cualquier estado). false = no lo conoce (404 u otro 4xx de la consulta): el 4xx original
     * es un rechazo real. Si la consulta falla por algo transitorio (5xx, timeout, 408/429) la excepción sale y la
     * fila vuelve a PENDIENTE con backoff (marcarFallo) en vez de darse por perdida.
     */
    private boolean haciendaYaTieneElComprobante(ColaFacturacionOffline item, String clave,
                                                 com.hotclick.model.Empresa empresa) {
        try {
            haciendaClient.consultarEstado(clave, empresa);
            return true;
        } catch (org.springframework.web.client.HttpClientErrorException e) {
            int status = e.getStatusCode().value();
            if (status == 408 || status == 429) throw e;
            log.info("[contingencia] cola_offline={}: Hacienda no conoce la clave (consulta status={})", item.getId(), status);
            return false;
        }
    }

    private void procesarItem(ColaFacturacionOffline item) {
        try {
            // Empresa propietaria de ESTE comprobante específico — trazabilidad
            // multi-tenant correcta aunque el lote mezcle facturas de varias empresas.
            TenantContext.set(item.getEmpresaId());

            // BAJO-2 (#428): el timeout de 30 min se mantiene, pero corre por fila desde que empieza SU proceso,
            // no desde que se reclamó el lote. Si ya no está PROCESANDO, otra corrida la recuperó: no se envía.
            if (!txOps.renovarInicioProceso(item.getId())) {
                log.warn("[contingencia] cola_offline={} ya no está PROCESANDO (recuperada por otra corrida) — se omite", item.getId());
                return;
            }

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
            } else if (esReintento(item) && haciendaYaTieneElComprobante(item, p.clave(), p.empresa())) {
                // MEDIO-1 (#428): el POST anterior sí llegó (el pod murió antes de cerrar la fila) y este reenvío
                // rebotó por clave duplicada. Hacienda ya tiene el documento: se cierra como enviado y el polling
                // normal confirma ACEPTADO/RECHAZADO.
                log.warn("[contingencia] cola_offline={} comprobante={}: Hacienda ya tenía el documento (4xx al reenviar, status={}) — se marca completada",
                    item.getId(), p.comprobanteId(), r.status());
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
