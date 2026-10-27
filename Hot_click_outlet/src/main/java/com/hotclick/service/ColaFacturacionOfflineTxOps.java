package com.hotclick.service;
import com.hotclick.utils.Constants;

import com.hotclick.model.ColaFacturacionOffline;
import com.hotclick.model.ComprobanteFiscal;
import com.hotclick.repository.ColaFacturacionOfflineRepository;
import com.hotclick.repository.ComprobanteFiscalRepository;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
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
    private final Counter filasRecuperadas;

    public ColaFacturacionOfflineTxOps(ColaFacturacionOfflineRepository colaRepo,
                                        ComprobanteFiscalRepository comprobanteRepo,
                                        MeterRegistry registry) {
        this.colaRepo        = colaRepo;
        this.comprobanteRepo = comprobanteRepo;
        // BAJO-3 (#428): cuántas filas rescata L4 de PROCESANDO (una subida sostenida indica pods que caen o Hacienda lenta).
        this.filasRecuperadas = Counter.builder(METRICA_FILAS_RECUPERADAS)
            .description("Filas de la cola de contingencia recuperadas de PROCESANDO tras superar el timeout")
            .register(registry);
    }

    public static final String METRICA_FILAS_RECUPERADAS = "hotclick.contingencia.filas.recuperadas";

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

    /**
     * Reclama y marca PROCESANDO en una sola transacción: las filas quedan bloqueadas (SKIP LOCKED)
     * hasta el commit, así que otra ejecución concurrente no puede tomarlas (ver ColaFacturacionOfflineRepository).
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public List<ColaFacturacionOffline> reclamarLote(int limite) {
        LocalDateTime ahora = LocalDateTime.now(Constants.ZONA_CR);
        List<ColaFacturacionOffline> lote = colaRepo.bloquearPendientesListas(ahora, PageRequest.of(0, limite));
        return colaRepo.saveAll(marcarProcesando(lote, ahora));
    }

    /**
     * L4 (#406): devuelve a PENDIENTE las filas que llevan más de {@code timeout} en PROCESANDO (el proceso que las
     * reclamó cayó antes de cerrarlas). Cuenta como un intento (si ya agotó {@code maxIntentos} pasa a AGOTADO, para
     * que un comprobante que tumba el proceso no cicle para siempre). Idempotente: una fila recuperada deja de estar
     * PROCESANDO, así que una segunda corrida no la toca; las que están siendo procesadas con un lock vivo se saltan.
     *
     * @return cuántas filas se recuperaron
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public int recuperarTrabadas(java.time.Duration timeout, int limite) {
        LocalDateTime ahora = LocalDateTime.now(Constants.ZONA_CR);
        List<ColaFacturacionOffline> trabadas =
            colaRepo.bloquearProcesandoTrabadas(ahora.minus(timeout), PageRequest.of(0, limite));
        for (ColaFacturacionOffline c : trabadas) {
            int intentos = c.getIntentos() + 1;
            c.setIntentos(intentos);
            c.setUltimoError("Recuperada de PROCESANDO tras superar el tiempo máximo de proceso");
            c.setFechaInicioProceso(null);
            if (intentos >= c.getMaxIntentos()) {
                c.setEstado(ColaFacturacionOffline.ESTADO_AGOTADO);
                log.warn("[contingencia] cola_offline={} agotó {} intentos al recuperarla de PROCESANDO — revisión manual",
                    c.getId(), intentos);
            } else {
                c.setEstado(ColaFacturacionOffline.ESTADO_PENDIENTE);
                c.setFechaProximoIntento(ahora);
            }
        }
        colaRepo.saveAll(trabadas);
        if (!trabadas.isEmpty()) {
            filasRecuperadas.increment(trabadas.size());
            log.warn("[contingencia] {} fila(s) trabada(s) en PROCESANDO recuperada(s)", trabadas.size());
        }
        return trabadas.size();
    }

    /**
     * BAJO-2 (#428): reinicia el reloj de PROCESANDO de esta fila justo antes de procesarla.
     *
     * @return false si la fila ya no está PROCESANDO (otra corrida la recuperó): no hay que enviarla
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean renovarInicioProceso(Long colaId) {
        return colaRepo.renovarInicioProceso(colaId, LocalDateTime.now(Constants.ZONA_CR)) == 1;
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

    /** Solo cambia el estado en memoria (sin tocar la DB); el guardado lo hace el llamador. */
    private static List<ColaFacturacionOffline> marcarProcesando(List<ColaFacturacionOffline> lote, LocalDateTime ahora) {
        for (ColaFacturacionOffline c : lote) {
            c.setEstado(ColaFacturacionOffline.ESTADO_PROCESANDO);
            c.setFechaInicioProceso(ahora);
        }
        return lote;
    }
}
