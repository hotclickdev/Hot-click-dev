package com.hotclick.service.alta;

import com.hotclick.repository.EmpresaCuentaOnvoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.List;

/**
 * Lleva negocios EXISTENTES (ACTIVOS, sin cuenta ONVO ACTIVA) al flujo por fases: quedan {@code alta_por_fases=true} y sin
 * venta en línea hasta que su cuenta ONVO se active. DESPUBLICA, por eso está detrás de
 * {@code hotclick.alta-fases.migrar-existentes} (por defecto <b>false</b>) y además exige
 * {@code hotclick.alta-fases.enabled=true}. Con el flag apagado no lee ni escribe nada.
 * <p>Idempotente y por lotes ({@code hotclick.alta-fases.migrar-lote}, 100 por ciclo del poller, ShedLock del poller):
 * un negocio ya migrado deja de ser candidato.
 */
@Service
public class AltaFasesMigracionExistentesService {

    private static final Logger log = LoggerFactory.getLogger(AltaFasesMigracionExistentesService.class);

    private final EmpresaCuentaOnvoRepository repo;
    private final AltaFasesService altaFases;
    private final TransactionTemplate tx;
    private final boolean migrar;
    private final int lote;

    public AltaFasesMigracionExistentesService(EmpresaCuentaOnvoRepository repo, AltaFasesService altaFases,
                                               PlatformTransactionManager txManager,
                                               @Value("${hotclick.alta-fases.migrar-existentes:false}") boolean migrar,
                                               @Value("${hotclick.alta-fases.migrar-lote:100}") int lote) {
        this.repo = repo;
        this.altaFases = altaFases;
        this.tx = new TransactionTemplate(txManager);
        this.migrar = migrar;
        this.lote = Math.max(1, Math.min(lote, 500));
    }

    public boolean activo() { return migrar && altaFases.exigirFasesAlNuevos(); }

    /** Devuelve cuántos negocios migró en este ciclo (0 con el flag apagado). */
    public int ciclo() {
        if (!activo()) return 0;
        try {
            Integer n = tx.execute(s -> {
                List<Long> ids = repo.idsExistentesParaMigrar(PageRequest.of(0, lote));
                return ids.isEmpty() ? 0 : repo.migrarAFases(ids);
            });
            int migrados = n == null ? 0 : n;
            if (migrados > 0) {
                altaFases.limpiarCaches(null);
                log.info("[alta-fases] migrados {} negocios existentes al flujo por fases", migrados);
            }
            return migrados;
        } catch (RuntimeException e) {
            log.warn("[alta-fases] migración de existentes falló: {}", e.getClass().getSimpleName());
            return 0;
        }
    }
}
