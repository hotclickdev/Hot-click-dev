package com.hotclick.service.reintegro;

import com.hotclick.model.Empresa;
import com.hotclick.model.Pago;
import com.hotclick.model.Pedido;
import com.hotclick.repository.PagoRepository;
import com.hotclick.service.AuditoriaAdminRegistroService;
import com.hotclick.service.reintegro.ReintegroPlataformaService.Resultado;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@DisplayName("Saldo por reintegrar: listado por negocio y marcar reintegrado (idempotente, auditado)")
class ReintegroPlataformaServiceTest {

    PagoRepository pagos = mock(PagoRepository.class);
    AuditoriaAdminRegistroService auditoria = mock(AuditoriaAdminRegistroService.class);
    ReintegroPlataformaService svc;

    @BeforeEach
    void setUp() { svc = new ReintegroPlataformaService(pagos, auditoria); }

    static Empresa empresa(long id, String nombre) {
        Empresa e = new Empresa();
        e.setId(id);
        e.setNombreComercial(nombre);
        return e;
    }

    static Pago pago(long id, Empresa e, String numero, int monto, String moneda, String reintegro) {
        Pedido ped = new Pedido();
        ReflectionTestUtils.setField(ped, "empresa", e);
        ReflectionTestUtils.setField(ped, "numeroPedido", numero);
        Pago p = new Pago();
        ReflectionTestUtils.setField(p, "id", id);
        p.setPedido(ped);
        p.setMonto(monto);
        p.setMoneda(moneda);
        p.setEstadoPago(Constants.PAGO_CAPTURADO);
        p.setReintegroEstado(reintegro);
        p.setFechaCreacion(LocalDateTime.of(2026, 11, 20, 10, 0));
        return p;
    }

    @Test
    @DisplayName("Lista por negocio y moneda: monto pendiente, reintegrado, cantidad y pedidos asociados")
    @SuppressWarnings("unchecked")
    void resumenPorNegocio() {
        Empresa a = empresa(1, "Soda A");
        Empresa b = empresa(2, "Tienda B");
        when(pagos.pagosConReintegro(eq(Constants.PAGO_CAPTURADO), any())).thenReturn(List.of(
            pago(10, a, "HC-1", 5000, "CRC", Pago.REINTEGRO_PENDIENTE),
            pago(11, a, "HC-2", 7000, "CRC", Pago.REINTEGRO_PENDIENTE),
            pago(12, a, "HC-3", 3000, "CRC", Pago.REINTEGRO_HECHO),
            pago(13, a, "HC-4", 20, "USD", Pago.REINTEGRO_PENDIENTE),
            pago(14, b, "HC-5", 900, "CRC", Pago.REINTEGRO_PENDIENTE)));

        List<Map<String, Object>> r = svc.resumenPorNegocio();

        assertThat(r).hasSize(3);
        Map<String, Object> sodaCrc = r.get(0);
        assertThat(sodaCrc).containsEntry("empresaId", 1L).containsEntry("negocio", "Soda A").containsEntry("moneda", "CRC")
            .containsEntry("montoPendiente", 12000L).containsEntry("montoReintegrado", 3000L).containsEntry("cantidadPendiente", 2);
        List<Map<String, Object>> filas = (List<Map<String, Object>>) sodaCrc.get("pagos");
        assertThat(filas).extracting(f -> f.get("pedido")).containsExactly("HC-1", "HC-2", "HC-3");
        assertThat(filas).extracting(f -> f.get("estado")).containsExactly("NO_REINTEGRADO", "NO_REINTEGRADO", "REINTEGRADO");
        // la moneda no se mezcla
        assertThat(r.get(1)).containsEntry("moneda", "USD").containsEntry("montoPendiente", 20L);
        assertThat(r.get(2)).containsEntry("empresaId", 2L).containsEntry("montoPendiente", 900L);
    }

    @Test
    @DisplayName("Marcar reintegrado registra quién y cuándo, audita una vez y repetirlo no cambia nada")
    void marcarEsIdempotente() {
        Empresa a = empresa(1, "Soda A");
        Pago p = pago(10, a, "HC-1", 5000, "CRC", Pago.REINTEGRO_PENDIENTE);
        when(pagos.marcarReintegrado(eq(10L), eq("admin@test.invalid"), any(LocalDateTime.class), eq("SINPE ref 123"), eq(Constants.PAGO_CAPTURADO)))
            .thenReturn(1).thenReturn(0);
        when(pagos.findById(10L)).thenAnswer(i -> {
            p.setReintegroEstado(Pago.REINTEGRO_HECHO);
            return Optional.of(p);
        });

        assertThat(svc.marcarReintegrado(10L, "admin@test.invalid", "SINPE ref 123")).isEqualTo(Resultado.MARCADO);
        assertThat(svc.marcarReintegrado(10L, "admin@test.invalid", "SINPE ref 123")).isEqualTo(Resultado.YA_REINTEGRADO);

        verify(auditoria, times(1)).registrarSiAdmin(eq("PAGO_REINTEGRADO"), eq("PAGO"), eq(10L), eq(1L), contains("SINPE ref 123"));
    }

    @Test
    @DisplayName("Un cobro que no debe nada (subcuenta, sin registro o inexistente) responde NO_APLICA")
    void noAplica() {
        when(pagos.marcarReintegrado(anyLong(), any(), any(), any(), any())).thenReturn(0);
        Pago subcuenta = pago(20, empresa(1, "A"), "HC-9", 100, "CRC", null);
        when(pagos.findById(20L)).thenReturn(Optional.of(subcuenta));
        when(pagos.findById(21L)).thenReturn(Optional.empty());
        assertThat(svc.marcarReintegrado(20L, "a", null)).isEqualTo(Resultado.NO_APLICA);
        assertThat(svc.marcarReintegrado(21L, "a", null)).isEqualTo(Resultado.NO_APLICA);
        verifyNoInteractions(auditoria);
    }

    @Test
    @DisplayName("Marcar todo un negocio cuenta solo los que cambiaron; la nota se limpia y se acota")
    void marcarNegocioYNota() {
        when(pagos.idsPendientesDeReintegroPorEmpresa(1L, Constants.PAGO_CAPTURADO)).thenReturn(List.of(10L, 11L));
        when(pagos.marcarReintegrado(eq(10L), any(), any(), any(), any())).thenReturn(1);
        when(pagos.marcarReintegrado(eq(11L), any(), any(), any(), any())).thenReturn(0);
        when(pagos.findById(anyLong())).thenReturn(Optional.empty());
        assertThat(svc.marcarReintegradoNegocio(1L, "admin", "ok")).isEqualTo(1);

        assertThat(ReintegroPlataformaService.limpiarNota("  línea1\nlínea2  ")).isEqualTo("línea1 línea2");
        assertThat(ReintegroPlataformaService.limpiarNota("x".repeat(500))).hasSize(300);
        assertThat(ReintegroPlataformaService.limpiarNota("  ")).isNull();
    }
}
