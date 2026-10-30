package com.hotclick.integration;

import com.hotclick.model.ColaFacturacionOffline;
import com.hotclick.repository.ColaFacturacionOfflineRepository;
import com.hotclick.service.ColaFacturacionOfflineTxOps;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Área 7: el reclamo de la cola de contingencia (FacturacionContingenciaScheduler) usaba SQL solo-PostgreSQL
 * (CTE + UPDATE ... FROM ... RETURNING) que falla en H2 (QA/tests). Ahora es JPA portable con
 * PESSIMISTIC_WRITE + SKIP LOCKED y corre igual en H2 (CI) y en PostgreSQL real.
 */
@DisplayName("Área 7 | cola de contingencia: reclamo portable de pendientes")
class ColaContingenciaReclamoTest extends BaseIntegrationTest {

    @Autowired private ColaFacturacionOfflineRepository colaRepo;
    @Autowired private ColaFacturacionOfflineTxOps txOps;
    @Autowired private PlatformTransactionManager txManager;

    @AfterEach
    void limpiar() {
        colaRepo.deleteAll();
    }

    @Test
    @DisplayName("Reclama solo PENDIENTE vencidas, en orden de creación, respeta el límite y no reclama dos veces")
    void reclamaSoloVencidasSinDuplicar() {
        LocalDateTime ahora = LocalDateTime.now(Constants.ZONA_CR);
        Long a = cola(1L, ColaFacturacionOffline.ESTADO_PENDIENTE, ahora.minusHours(3), ahora.minusMinutes(5));
        Long b = cola(2L, ColaFacturacionOffline.ESTADO_PENDIENTE, ahora.minusHours(2), ahora.minusMinutes(5));
        Long futura = cola(3L, ColaFacturacionOffline.ESTADO_PENDIENTE, ahora.minusHours(1), ahora.plusHours(1));
        Long yaProcesando = cola(4L, ColaFacturacionOffline.ESTADO_PROCESANDO, ahora.minusHours(4), ahora.minusMinutes(5));

        List<ColaFacturacionOffline> lote1 = txOps.reclamarLote(1);
        assertThat(lote1).extracting(ColaFacturacionOffline::getId).containsExactly(a);
        assertThat(lote1.get(0).getEstado()).isEqualTo(ColaFacturacionOffline.ESTADO_PROCESANDO);

        List<ColaFacturacionOffline> lote2 = txOps.reclamarLote(10);
        assertThat(lote2).extracting(ColaFacturacionOffline::getId).containsExactly(b);

        assertThat(txOps.reclamarLote(10)).isEmpty();

        assertThat(colaRepo.findById(a).orElseThrow().getEstado()).isEqualTo(ColaFacturacionOffline.ESTADO_PROCESANDO);
        assertThat(colaRepo.findById(a).orElseThrow().getFechaInicioProceso()).isNotNull();
        assertThat(colaRepo.findById(futura).orElseThrow().getEstado()).isEqualTo(ColaFacturacionOffline.ESTADO_PENDIENTE);
        assertThat(colaRepo.findById(yaProcesando).orElseThrow().getEstado()).isEqualTo(ColaFacturacionOffline.ESTADO_PROCESANDO);
    }

    @Test
    @DisplayName("SKIP LOCKED: una fila bloqueada por otra transacción no se reclama dos veces")
    void filaBloqueadaPorOtraTransaccionSeSalta() throws Exception {
        // El dialecto de H2 no emite SKIP LOCKED: este caso solo aplica a PostgreSQL real (verificación manual,
        // ver ReporteIvaPortableTest). En CI/H2 se omite; el resto de la clase sí corre.
        String motor = jdbcTemplate.execute((java.sql.Connection c) -> c.getMetaData().getDatabaseProductName());
        Assumptions.assumeTrue("PostgreSQL".equals(motor), "requiere PostgreSQL real");
        LocalDateTime ahora = LocalDateTime.now(Constants.ZONA_CR);
        Long bloqueada = cola(1L, ColaFacturacionOffline.ESTADO_PENDIENTE, ahora.minusHours(3), ahora.minusMinutes(5));
        Long libre = cola(2L, ColaFacturacionOffline.ESTADO_PENDIENTE, ahora.minusHours(2), ahora.minusMinutes(5));

        List<Long> reclamadasPorOtro = new TransactionTemplate(txManager).execute(status -> {
            // Esta transacción retiene el lock sobre la fila más antigua (aún sin commit).
            colaRepo.bloquearPendientesListas(ahora, PageRequest.of(0, 1));
            try {
                return Executors.newSingleThreadExecutor().submit(() ->
                    txOps.reclamarLote(10).stream().map(ColaFacturacionOffline::getId).toList()
                ).get(20, TimeUnit.SECONDS);
            } catch (Exception e) {
                throw new IllegalStateException(e);
            }
        });

        assertThat(reclamadasPorOtro).containsExactly(libre).doesNotContain(bloqueada);
    }

    private Long cola(Long comprobanteId, String estado, LocalDateTime creacion, LocalDateTime proximo) {
        ColaFacturacionOffline c = new ColaFacturacionOffline();
        c.setEmpresaId(1L);
        c.setComprobanteId(comprobanteId);
        c.setEstado(estado);
        c.setFechaCreacion(creacion);
        c.setFechaProximoIntento(proximo);
        return colaRepo.saveAndFlush(c).getId();
    }
}
