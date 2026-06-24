package com.hotclick.service;
nimport com.hotclick.utils.Constants;

import com.hotclick.model.ColaFacturacionOffline;
import com.hotclick.model.ComprobanteFiscal;
import com.hotclick.repository.ColaFacturacionOfflineRepository;
import com.hotclick.repository.ComprobanteFiscalRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Transacciones cortas REQUIRES_NEW para la cola de contingencia de Hacienda,
 * aisladas en su propio bean a propósito: si estos métodos vivieran en
 * FacturacionContingenciaService y se llamaran como {@code this.metodo()},
 * el proxy de Spring no interceptaría la llamada y @Transactional se
 * ignoraría en silencio (auto-invocación). Mismo criterio que
 * ConsecutivoFiscalService respecto a FacturacionService.
 */
@Service
public class ColaFacturacionOfflineTxOps {

    private static final Logger log = LoggerFactory.getLogger(ColaFacturacionOfflineTxOps.class);

    private static final long BACKOFF_MINUTOS_POR_INTENTO = 10;
    private static final long BACKOFF_MINUTOS_MAX = 120;

    private final ColaFacturacionOfflineRepository colaRepo;
    private final ComprobanteFiscalRepository comprobanteRepo;

    public ColaFacturacionOfflineTxOps(ColaFacturacionOfflineRepository colaRepo,
                                        ComprobanteFiscalRepository comprobanteRepo) {
        this.colaRepo        = colaRepo;
        this.comprobanteRepo = comprobanteRepo;
    }

    /** Encola un comprobante agotado. Idempotente vía constraint UNIQUE(fk_id_comprobante). */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void encolar(Long comprobanteId) {
        if (colaRepo.existsByComprobanteId(comprobanteId)) {
            return;
        }
        ComprobanteFiscal cf = comprobanteRepo.findById(comprobanteId).orElse(null);
        if (cf == null || cf.getEmpresa() == null) {
            log.warn("[contingencia] comprobante={} no existe o sin empresa — no se encola", comprobanteId);
            return;
        }
        ColaFacturacionOffline item = new ColaFacturacionOffline();
        item.setEmpresaId(cf.getEmpresa().getId());
        item.setComprobanteId(comprobanteId);
        colaRepo.save(item);
        log.info("[contingencia] comprobante={} empresa={} encolado para reintento offline",
            comprobanteId, cf.getEmpresa().getId());
    }

    /** Reclama y marca PROCESANDO en un único statement (ver ColaFacturacionOfflineRepository). */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public List<ColaFacturacionOffline> reclamarLote(int limite) {
        return colaRepo.reclamarPendientes(limite);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void marcarCompletado(Long colaId, Long comprobanteId) {
        colaRepo.findById(colaId).ifPresent(item -> {
            item.setEstado(ColaFacturacionOffline.ESTADO_COMPLETADO);
            item.setFechaCompletado(LocalDateTime.now(Constants.ZONA_CR));
            colaRepo.save(item);
        });
        // ENVIADO (no ACEPTADO): Hacienda procesa async. El polling normal de
        // FacturacionService.consultarPendientesHacienda confirma ACEPTADO/RECHAZADO.
        comprobanteRepo.findById(comprobanteId).ifPresent(cf -> {
            cf.setEstado(ComprobanteFiscal.ESTADO_ENVIADO);
            comprobanteRepo.save(cf);
        });
        log.info("[contingencia] comprobante={} reenviado con éxito, vuelve al polling normal", comprobanteId);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void marcarFallo(Long colaId, String error) {
        colaRepo.findById(colaId).ifPresent(item -> {
            int intentos = item.getIntentos() + 1;
            item.setIntentos(intentos);
            item.setUltimoError(truncar(error));

            if (intentos >= item.getMaxIntentos()) {
                item.setEstado(ColaFacturacionOffline.ESTADO_AGOTADO);
                log.warn("[contingencia] comprobante={} agotó {} intentos — requiere revisión manual",
                    item.getComprobanteId(), intentos);
            } else {
                long backoffMin = Math.min(intentos * BACKOFF_MINUTOS_POR_INTENTO, BACKOFF_MINUTOS_MAX);
                item.setEstado(ColaFacturacionOffline.ESTADO_PENDIENTE);
                item.setFechaProximoIntento(LocalDateTime.now(Constants.ZONA_CR).plusMinutes(backoffMin));
            }
            colaRepo.save(item);
        });
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void marcarAgotado(Long colaId, String error) {
        colaRepo.findById(colaId).ifPresent(item -> {
            item.setEstado(ColaFacturacionOffline.ESTADO_AGOTADO);
            item.setUltimoError(truncar(error));
            colaRepo.save(item);
        });
    }

    private String truncar(String texto) {
        if (texto == null) return null;
        return texto.length() > 2000 ? texto.substring(0, 2000) : texto;
    }
}
