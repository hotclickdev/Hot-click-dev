package com.hotclick.integration;

import com.hotclick.model.ColaFacturacionOffline;
import com.hotclick.repository.ColaFacturacionOfflineRepository;
import com.hotclick.service.ColaFacturacionOfflineTxOps;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.Duration;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * L4 (#406): las filas que quedaron en PROCESANDO (el proceso cayó tras reclamarlas) no se recuperaban nunca.
 * Ahora, pasado el timeout configurable, vuelven a PENDIENTE (o a AGOTADO si ya no quedan intentos), de forma
 * idempotente. Corre igual en H2 y PostgreSQL (JPA con PESSIMISTIC_WRITE + SKIP LOCKED).
 */
@DisplayName("#406 L4 | cola de contingencia: recuperar filas trabadas en PROCESANDO")
class ColaContingenciaTrabadasTest extends BaseIntegrationTest {

    @Autowired private ColaFacturacionOfflineRepository colaRepo;
    @Autowired private ColaFacturacionOfflineTxOps txOps;
    @Autowired private io.micrometer.core.instrument.MeterRegistry meterRegistry;

    private static final Duration TIMEOUT = Duration.ofMinutes(30);

    @AfterEach
    void limpiar() {
        colaRepo.deleteAll();
    }

    @Test
    @DisplayName("Recupera solo PROCESANDO vencidas (o sin fecha de inicio): vuelven a PENDIENTE, ya reclamables; es idempotente")
    void recuperaVencidasEIdempotente() {
        LocalDateTime ahora = LocalDateTime.now(Constants.ZONA_CR);
        Long vieja = cola(1L, ColaFacturacionOffline.ESTADO_PROCESANDO, ahora.minusHours(2), ahora.minusHours(1), 0);
        Long sinInicio = cola(2L, ColaFacturacionOffline.ESTADO_PROCESANDO, null, ahora.minusHours(1), 0);
        Long reciente = cola(3L, ColaFacturacionOffline.ESTADO_PROCESANDO, ahora.minusMinutes(5), ahora.minusHours(1), 0);
        Long pendiente = cola(4L, ColaFacturacionOffline.ESTADO_PENDIENTE, null, ahora.plusHours(1), 2);
        Long completada = cola(5L, ColaFacturacionOffline.ESTADO_COMPLETADO, null, ahora.minusHours(1), 1);

        assertThat(txOps.recuperarTrabadas(TIMEOUT, 100)).isEqualTo(2);

        ColaFacturacionOffline v = colaRepo.findById(vieja).orElseThrow();
        assertThat(v.getEstado()).isEqualTo(ColaFacturacionOffline.ESTADO_PENDIENTE);
        assertThat(v.getIntentos()).isEqualTo(1);
        assertThat(v.getFechaInicioProceso()).isNull();
        assertThat(v.getFechaProximoIntento()).isAfterOrEqualTo(ahora.minusSeconds(5));
        assertThat(v.getUltimoError()).contains("Recuperada de PROCESANDO");
        assertThat(colaRepo.findById(sinInicio).orElseThrow().getEstado()).isEqualTo(ColaFacturacionOffline.ESTADO_PENDIENTE);
        assertThat(colaRepo.findById(reciente).orElseThrow().getEstado()).isEqualTo(ColaFacturacionOffline.ESTADO_PROCESANDO);
        assertThat(colaRepo.findById(pendiente).orElseThrow().getIntentos()).isEqualTo(2);
        assertThat(colaRepo.findById(completada).orElseThrow().getEstado()).isEqualTo(ColaFacturacionOffline.ESTADO_COMPLETADO);

        // Segunda corrida: nada que recuperar y los intentos no vuelven a subir.
        assertThat(txOps.recuperarTrabadas(TIMEOUT, 100)).isZero();
        assertThat(colaRepo.findById(vieja).orElseThrow().getIntentos()).isEqualTo(1);

        // Y el siguiente reclamo ya las ve (las 2 recuperadas; la reciente sigue en PROCESANDO).
        assertThat(txOps.reclamarLote(10)).extracting(ColaFacturacionOffline::getId).containsExactlyInAnyOrder(vieja, sinInicio);
    }

    @Test
    @DisplayName("Una fila que ya agotó sus intentos al recuperarla pasa a AGOTADO (no cicla para siempre)")
    void sinIntentosPasaAAgotado() {
        LocalDateTime ahora = LocalDateTime.now(Constants.ZONA_CR);
        Long id = cola(9L, ColaFacturacionOffline.ESTADO_PROCESANDO, ahora.minusHours(3), ahora.minusHours(1), 11); // maxIntentos = 12

        assertThat(txOps.recuperarTrabadas(TIMEOUT, 100)).isEqualTo(1);

        ColaFacturacionOffline c = colaRepo.findById(id).orElseThrow();
        assertThat(c.getEstado()).isEqualTo(ColaFacturacionOffline.ESTADO_AGOTADO);
        assertThat(c.getIntentos()).isEqualTo(12);
        assertThat(txOps.reclamarLote(10)).isEmpty();
    }

    @Test
    @DisplayName("Respeta el límite del lote")
    void respetaLimite() {
        LocalDateTime ahora = LocalDateTime.now(Constants.ZONA_CR);
        for (long i = 1; i <= 3; i++) cola(i, ColaFacturacionOffline.ESTADO_PROCESANDO, ahora.minusHours(2), ahora.minusHours(1), 0);
        assertThat(txOps.recuperarTrabadas(TIMEOUT, 2)).isEqualTo(2);
        assertThat(txOps.recuperarTrabadas(TIMEOUT, 2)).isEqualTo(1);
    }

    @Test
    @DisplayName("BAJO-3 (#428): el contador hotclick.contingencia.filas.recuperadas sube por cada fila recuperada")
    void contadorDeRecuperadas() {
        LocalDateTime ahora = LocalDateTime.now(Constants.ZONA_CR);
        double antes = recuperadas();
        cola(21L, ColaFacturacionOffline.ESTADO_PROCESANDO, ahora.minusHours(2), ahora.minusHours(1), 0);
        cola(22L, ColaFacturacionOffline.ESTADO_PROCESANDO, ahora.minusHours(2), ahora.minusHours(1), 11);
        cola(23L, ColaFacturacionOffline.ESTADO_PROCESANDO, ahora.minusMinutes(1), ahora.minusHours(1), 0);
        assertThat(txOps.recuperarTrabadas(TIMEOUT, 100)).isEqualTo(2);
        assertThat(recuperadas() - antes).isEqualTo(2.0);
        assertThat(txOps.recuperarTrabadas(TIMEOUT, 100)).isZero();
        assertThat(recuperadas() - antes).isEqualTo(2.0);
    }

    @Test
    @DisplayName("BAJO-2 (#428): renovar el inicio de proceso por fila solo toca filas PROCESANDO y evita recuperarla a mitad de lote")
    void renovarInicioPorFila() {
        LocalDateTime ahora = LocalDateTime.now(Constants.ZONA_CR);
        // Reclamada hace 40 min (lote largo): sin renovar, se recuperaría aunque recién empiece su envío.
        Long id = cola(31L, ColaFacturacionOffline.ESTADO_PROCESANDO, ahora.minusMinutes(40), ahora.minusHours(1), 0);
        Long pendiente = cola(32L, ColaFacturacionOffline.ESTADO_PENDIENTE, null, ahora.minusHours(1), 0);

        assertThat(txOps.renovarInicioProceso(id)).isTrue();
        assertThat(colaRepo.findById(id).orElseThrow().getFechaInicioProceso()).isAfter(ahora.minusMinutes(1));
        assertThat(txOps.recuperarTrabadas(TIMEOUT, 100)).isZero();
        assertThat(colaRepo.findById(id).orElseThrow().getEstado()).isEqualTo(ColaFacturacionOffline.ESTADO_PROCESANDO);

        assertThat(txOps.renovarInicioProceso(pendiente)).isFalse();
        assertThat(colaRepo.findById(pendiente).orElseThrow().getFechaInicioProceso()).isNull();
        assertThat(txOps.renovarInicioProceso(-1L)).isFalse();
    }

    private double recuperadas() {
        var c = meterRegistry.find(ColaFacturacionOfflineTxOps.METRICA_FILAS_RECUPERADAS).counter();
        return c == null ? 0.0 : c.count();
    }

    private Long cola(Long comprobanteId, String estado, LocalDateTime inicio, LocalDateTime proximo, int intentos) {
        ColaFacturacionOffline c = new ColaFacturacionOffline();
        c.setEmpresaId(1L);
        c.setComprobanteId(comprobanteId);
        c.setEstado(estado);
        c.setIntentos(intentos);
        c.setFechaCreacion(LocalDateTime.now(Constants.ZONA_CR).minusHours(5).plusSeconds(comprobanteId));
        c.setFechaProximoIntento(proximo);
        c.setFechaInicioProceso(inicio);
        return colaRepo.saveAndFlush(c).getId();
    }
}
