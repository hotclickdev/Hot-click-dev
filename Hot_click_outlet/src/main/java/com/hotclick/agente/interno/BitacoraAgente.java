package com.hotclick.agente.interno;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Clock;

/** AG-21: registra cada acción (o consulta de finanzas) del modo interno. Sin datos del cliente. */
@Service
public class BitacoraAgente {

    private static final Logger log = LoggerFactory.getLogger(BitacoraAgente.class);

    private final AgenteAccionRepository repo;
    private final Clock clock;

    @org.springframework.beans.factory.annotation.Autowired
    public BitacoraAgente(AgenteAccionRepository repo) {
        this(repo, Clock.systemUTC());
    }

    BitacoraAgente(AgenteAccionRepository repo, Clock clock) {
        this.repo = repo;
        this.clock = clock;
    }

    /** Nunca lanza: un fallo de la bitácora se avisa en el log pero no deshace la acción ya aplicada. */
    public void registrar(Long empresaId, Long usuarioId, String accion, String resultado, Long entidadId) {
        try {
            AgenteAccion a = new AgenteAccion();
            a.setEmpresaId(empresaId);
            a.setUsuarioId(usuarioId);
            a.setAccion(accion);
            a.setResultado(resultado);
            a.setEntidadId(entidadId);
            a.setFechaCreacion(clock.instant());
            repo.save(a);
        } catch (RuntimeException e) {
            log.error("[agente-interno] no se pudo escribir la bitácora ({}) empresa={} accion={}",
                e.getClass().getSimpleName(), empresaId, accion);
        }
    }
}
