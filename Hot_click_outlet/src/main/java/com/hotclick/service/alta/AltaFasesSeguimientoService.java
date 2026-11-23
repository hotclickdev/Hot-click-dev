package com.hotclick.service.alta;

import com.hotclick.model.Empresa;
import com.hotclick.model.EmpresaCuentaOnvo;
import com.hotclick.repository.EmpresaCuentaOnvoRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.service.onvo.cuenta.CuentaOnvoService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Clock;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Seguimiento de cuentas ONVO que dejaron de estar ACTIVAS. Lo corre el poller de cuentas (ShedLock) después de consultar.
 * <p><b>Cadencia</b>: el primer aviso sale en el mismo ciclo en que se detecta la pérdida; luego un recordatorio cada
 * {@code hotclick.alta-fases.recordatorio-intervalo} (24 h por defecto) hasta un tope de
 * {@code hotclick.alta-fases.recordatorio-max} avisos en total (7 = el primero + 6 recordatorios, o sea una semana).
 * Cada aviso se reclama con un UPDATE condicional en base de datos: con varios pods o ciclos repetidos no se duplica.
 * Al volver a ACTIVA se avisa «cobros reanudados» UNA vez y el contador se reinicia.
 */
@Service
public class AltaFasesSeguimientoService {

    private static final Logger log = LoggerFactory.getLogger(AltaFasesSeguimientoService.class);

    private final EmpresaCuentaOnvoRepository cuentaRepository;
    private final EmpresaRepository empresaRepository;
    private final AltaFasesAvisoService avisos;
    private final CuentaOnvoService cuentaOnvoService;
    private final TransactionTemplate tx;
    private final Duration intervalo;
    private final int maxAvisos;
    private final int lote;
    private Clock clock = Clock.systemDefaultZone();

    public AltaFasesSeguimientoService(EmpresaCuentaOnvoRepository cuentaRepository, EmpresaRepository empresaRepository,
                                       AltaFasesAvisoService avisos, CuentaOnvoService cuentaOnvoService,
                                       PlatformTransactionManager txManager,
                                       @Value("${hotclick.alta-fases.recordatorio-intervalo:PT24H}") Duration intervalo,
                                       @Value("${hotclick.alta-fases.recordatorio-max:7}") int maxAvisos,
                                       @Value("${onvo.cuentas.poller.lote:50}") int lote) {
        this.cuentaRepository = cuentaRepository;
        this.empresaRepository = empresaRepository;
        this.avisos = avisos;
        this.cuentaOnvoService = cuentaOnvoService;
        this.tx = new TransactionTemplate(txManager);
        this.intervalo = intervalo;
        this.maxAvisos = Math.max(1, maxAvisos);
        this.lote = lote;
    }

    public void setClock(Clock clock) { this.clock = clock; }

    public void ciclo() {
        LocalDateTime ahora = LocalDateTime.now(clock);
        for (EmpresaCuentaOnvo c : cuentaRepository.findByPerdidaDesdeIsNotNullOrderByActualizadoEnAsc(PageRequest.of(0, lote))) {
            try {
                avisarPerdida(c.getId(), c.getEmpresaId(), ahora);
            } catch (RuntimeException e) {
                log.warn("[alta-fases] seguimiento de pérdida falló cuenta={}: {}", c.getId(), e.getClass().getSimpleName());
            }
        }
        for (EmpresaCuentaOnvo c : cuentaRepository.findByRecuperadaAvisoPendienteTrueOrderByActualizadoEnAsc(PageRequest.of(0, lote))) {
            try {
                avisarRecuperada(c.getId(), c.getEmpresaId());
            } catch (RuntimeException e) {
                log.warn("[alta-fases] aviso de reanudación falló cuenta={}: {}", c.getId(), e.getClass().getSimpleName());
            }
        }
    }

    /** Devuelve true si este llamador ganó el claim y envió el aviso. */
    boolean avisarPerdida(Long cuentaId, Long empresaId, LocalDateTime ahora) {
        Integer ganado = tx.execute(s -> cuentaRepository.reclamarAvisoPerdida(cuentaId, ahora, ahora.minus(intervalo), maxAvisos));
        if (ganado == null || ganado != 1) return false;
        int numero = cuentaRepository.findById(cuentaId).map(EmpresaCuentaOnvo::getAvisosPerdida).orElse(1);
        String nombre = nombreDe(empresaId);
        avisos.avisarPerdida(empresaId, nombre, numero, cuentaOnvoService.onboardingUrlParaDueno(empresaId));
        return true;
    }

    boolean avisarRecuperada(Long cuentaId, Long empresaId) {
        Integer ganado = tx.execute(s -> cuentaRepository.reclamarAvisoRecuperada(cuentaId));
        if (ganado == null || ganado != 1) return false;
        avisos.avisarReanudado(empresaId, nombreDe(empresaId));
        return true;
    }

    private String nombreDe(Long empresaId) {
        Empresa e = empresaRepository.findById(empresaId).orElse(null);
        if (e == null) return "Negocio";
        return e.getNombreComercial() != null && !e.getNombreComercial().isBlank() ? e.getNombreComercial() : e.getNombreEmpresa();
    }

    List<EmpresaCuentaOnvo> pendientesPerdida() {
        return cuentaRepository.findByPerdidaDesdeIsNotNullOrderByActualizadoEnAsc(PageRequest.of(0, lote));
    }
}
