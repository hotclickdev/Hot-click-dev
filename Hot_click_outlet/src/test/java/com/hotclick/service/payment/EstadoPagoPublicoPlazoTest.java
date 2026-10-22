package com.hotclick.service.payment;

import com.hotclick.model.Pago;
import com.hotclick.model.Pedido;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** S4-22: el plazo SINPE es configurable y por defecto no existe (ONVO no documenta uno). */
class EstadoPagoPublicoPlazoTest {

    private static final LocalDateTime AHORA = LocalDateTime.of(2026, 10, 16, 12, 0);
    private final Clock reloj = Clock.fixed(AHORA.atZone(Constants.ZONA_CR).toInstant(), Constants.ZONA_CR);
    private final EstadoPagoTokenService tokens = new EstadoPagoTokenService("secreto-de-prueba-solo-tests");

    private Map<String, Object> consultar(Integer plazo, LocalDateTime creado) {
        PedidoRepository repo = mock(PedidoRepository.class);
        PedidoGrupoService grupo = mock(PedidoGrupoService.class);
        Pedido p = new Pedido();
        p.setId(1L);
        p.setNumeroPedido("ORD-PLZ");
        p.setSubtotal(1000);
        p.setTotalPedido(1000);
        Pago pago = new Pago();
        pago.setEstadoPago(Constants.PAGO_PENDIENTE);
        pago.setMonto(1000);
        pago.setFechaCreacion(creado);
        when(repo.findByNumeroPedido("ORD-PLZ")).thenReturn(Optional.of(p));
        when(grupo.delGrupo(p)).thenReturn(List.of(p));
        when(grupo.pagoDelGrupo(p)).thenReturn(Optional.of(pago));
        return new EstadoPagoPublicoService(repo, grupo, tokens, plazo, reloj)
            .consultar("ORD-PLZ", tokens.emitir("ORD-PLZ")).orElseThrow();
    }

    @Test
    void sinPlazoConfigurado_nuncaVencePorTiempo() {
        Map<String, Object> r = consultar(null, AHORA.minusDays(30));
        assertThat(r.get("estado")).isEqualTo("PENDIENTE");
        assertThat(r.get("reservadoHasta")).isNull();
    }

    @Test
    void plazoCeroONegativo_esComoSinPlazo() {
        assertThat(consultar(0, AHORA.minusDays(1)).get("estado")).isEqualTo("PENDIENTE");
        assertThat(consultar(-5, AHORA.minusDays(1)).get("reservadoHasta")).isNull();
    }

    @Test
    void conPlazo_pendienteDentroYVencidoFuera() {
        Map<String, Object> dentro = consultar(30, AHORA.minusMinutes(10));
        assertThat(dentro.get("estado")).isEqualTo("PENDIENTE");
        assertThat(dentro.get("reservadoHasta")).isEqualTo("2026-10-16T12:20-06:00");
        assertThat(consultar(30, AHORA.minusMinutes(31)).get("estado")).isEqualTo("VENCIDO");
    }

    @Test
    void tokenDeEstado_noEsElCancelToken() {
        assertThat(tokens.esValido("ORD-PLZ", tokens.emitir("ORD-PLZ"))).isTrue();
        assertThat(tokens.esValido("ORD-PLZ", tokens.emitir("ORD-OTRO"))).isFalse();
        assertThat(tokens.esValido("ORD-PLZ", null)).isFalse();
    }
}
