package com.hotclick.service.onvo.cuenta;

import com.hotclick.model.EnlacePagoOnvo;
import com.hotclick.payment.OnvoPaymentProvider;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.EnlacePagoOnvoRepository;
import com.hotclick.service.OnvoService;
import com.hotclick.service.onvo.cuenta.EnlacePagoOnvoService.EnlaceConflictoException;
import com.hotclick.service.onvo.cuenta.EnlacePagoOnvoService.ResultadoWebhook;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.*;

@DisplayName("Enlace de pago único ONVO (factura tardía)")
class EnlacePagoOnvoServiceTest {

    private EnlacePagoOnvoRepository repo;
    private EmpresaRepository empresaRepo;
    private OnvoService onvo;
    private OnvoPaymentProvider provider;
    private EnlacePagoOnvoService svc;

    @BeforeEach
    void setUp() {
        repo = mock(EnlacePagoOnvoRepository.class);
        empresaRepo = mock(EmpresaRepository.class);
        onvo = mock(OnvoService.class);
        provider = mock(OnvoPaymentProvider.class);
        svc = new EnlacePagoOnvoService(repo, empresaRepo, onvo, provider, "https://app.test", 50);
        when(empresaRepo.existsById(7L)).thenReturn(true);
        when(repo.save(any())).thenAnswer(i -> i.getArgument(0));
        when(repo.findByEmpresaIdAndEstado(7L, EnlacePagoOnvo.CREADO)).thenReturn(List.of());
        when(onvo.crearCheckoutSession(anyInt(), anyString(), anyString(), anyString(), any(), anyMap()))
            .thenReturn(new OnvoService.OnvoCheckoutSession("sess_1", "https://pay.test/s1"));
    }

    private EnlacePagoOnvo abierto() {
        EnlacePagoOnvo e = new EnlacePagoOnvo();
        org.springframework.test.util.ReflectionTestUtils.setField(e, "id", 1L);
        e.setEmpresaId(7L);
        e.setMontoCrc(50_000);
        e.setMotivo("Factura tardía");
        e.setOnvoSessionId("sess_1");
        e.setUrl("https://pay.test/s1");
        when(repo.findById(1L)).thenReturn(Optional.of(e));
        when(repo.findByOnvoSessionId("sess_1")).thenReturn(Optional.of(e));
        return e;
    }

    @Test
    @DisplayName("Crear: valida monto y motivo en el servidor, cobra a HotClick (sin onBehalfOf) y queda CREADO")
    void crear() {
        EnlacePagoOnvo e = svc.crear(7L, 50_000, "  Factura tardía de octubre ");
        assertThat(e.getEstado()).isEqualTo(EnlacePagoOnvo.CREADO);
        assertThat(e.getMotivo()).isEqualTo("Factura tardía de octubre");
        assertThat(e.getOnvoSessionId()).isEqualTo("sess_1");
        // Firma de 6 argumentos = sin onBehalfOf.
        verify(onvo).crearCheckoutSession(eq50k(), anyString(), anyString(), anyString(), isNull(), anyMap());
    }

    private static int eq50k() { return org.mockito.ArgumentMatchers.eq(50_000); }

    @Test
    @DisplayName("Crear rechaza monto fuera de rango, motivo corto, empresa inexistente y segundo enlace abierto")
    void crearValidaciones() {
        assertThatThrownBy(() -> svc.crear(7L, 0, "motivo válido")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> svc.crear(7L, -5, "motivo válido")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> svc.crear(7L, 99_999_999, "motivo válido")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> svc.crear(7L, null, "motivo válido")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> svc.crear(7L, 5000, "ab")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> svc.crear(99L, 5000, "motivo válido")).isInstanceOf(IllegalArgumentException.class);
        when(repo.findByEmpresaIdAndEstado(7L, EnlacePagoOnvo.CREADO)).thenReturn(List.of(new EnlacePagoOnvo()));
        assertThatThrownBy(() -> svc.crear(7L, 5000, "motivo válido")).isInstanceOf(EnlaceConflictoException.class);
        verifyNoInteractions(onvo);
    }

    @Test
    @DisplayName("Cancelar: expira la sesión en ONVO y marca CANCELADO")
    void cancelar() {
        EnlacePagoOnvo e = abierto();
        when(provider.expirarSesionParaCancelar("sess_1")).thenReturn(true);
        assertThat(svc.cancelar(1L).getEstado()).isEqualTo(EnlacePagoOnvo.CANCELADO);
        assertThat(e.getCerradoEn()).isNotNull();
    }

    @Test
    @DisplayName("Cancelar sin confirmación de ONVO: sigue CREADO (fail-closed)")
    void cancelarSinConfirmar() {
        EnlacePagoOnvo e = abierto();
        when(provider.expirarSesionParaCancelar("sess_1")).thenReturn(false);
        doReturn(Map.of("paymentStatus", "unpaid")).when(onvo).obtenerCheckoutSession("sess_1");
        assertThatThrownBy(() -> svc.cancelar(1L)).isInstanceOf(EnlaceConflictoException.class);
        assertThat(e.getEstado()).isEqualTo(EnlacePagoOnvo.CREADO);
        when(provider.expirarSesionParaCancelar("sess_1")).thenThrow(new IllegalStateException("x"));
        assertThatThrownBy(() -> svc.cancelar(1L)).isInstanceOf(EnlaceConflictoException.class);
        assertThat(e.getEstado()).isEqualTo(EnlacePagoOnvo.CREADO);
    }

    @Test
    @DisplayName("Cancelar justo cuando ya se pagó: queda PAGADO y se avisa")
    void cancelarYaPagado() {
        EnlacePagoOnvo e = abierto();
        when(provider.expirarSesionParaCancelar("sess_1")).thenReturn(false);
        doReturn(Map.of("paymentStatus", "paid")).when(onvo).obtenerCheckoutSession("sess_1");
        assertThatThrownBy(() -> svc.cancelar(1L)).isInstanceOf(EnlaceConflictoException.class);
        assertThat(e.getEstado()).isEqualTo(EnlacePagoOnvo.PAGADO);
    }

    @Test
    @DisplayName("Un enlace ya cerrado no se cancela")
    void cancelarCerrado() {
        EnlacePagoOnvo e = abierto();
        e.setEstado(EnlacePagoOnvo.PAGADO);
        assertThatThrownBy(() -> svc.cancelar(1L)).isInstanceOf(EnlaceConflictoException.class);
        verifyNoInteractions(provider);
    }

    @Test
    @DisplayName("Webhook: paid por GET marca PAGADO; la segunda entrega es duplicada y no relee ONVO")
    void webhookIdempotente() {
        EnlacePagoOnvo e = abierto();
        doReturn(Map.of("paymentStatus", "paid", "status", "complete")).when(onvo).obtenerCheckoutSession("sess_1");
        assertThat(svc.confirmarPorWebhook("sess_1")).isEqualTo(ResultadoWebhook.PAGADO);
        assertThat(e.getEstado()).isEqualTo(EnlacePagoOnvo.PAGADO);
        assertThat(e.getPagadoEn()).isNotNull();
        assertThat(svc.confirmarPorWebhook("sess_1")).isEqualTo(ResultadoWebhook.DUPLICADO);
        verify(onvo, times(1)).obtenerCheckoutSession("sess_1");
    }

    @Test
    @DisplayName("Webhook: unpaid, ONVO caído o sesión ajena (pedido) no marcan nada")
    void webhookFailClosed() {
        EnlacePagoOnvo e = abierto();
        doReturn(Map.of("paymentStatus", "unpaid")).when(onvo).obtenerCheckoutSession("sess_1");
        assertThat(svc.confirmarPorWebhook("sess_1")).isEqualTo(ResultadoWebhook.NO_VERIFICADO);
        when(onvo.obtenerCheckoutSession("sess_1")).thenThrow(new IllegalStateException("caído"));
        assertThat(svc.confirmarPorWebhook("sess_1")).isEqualTo(ResultadoWebhook.NO_CONSULTABLE);
        assertThat(e.getEstado()).isEqualTo(EnlacePagoOnvo.CREADO);
        assertThat(svc.confirmarPorWebhook("sess_de_pedido")).isEqualTo(ResultadoWebhook.NO_ES_ENLACE);
    }

    @Test
    @DisplayName("Factura recibida: cancela los enlaces abiertos de esa empresa y nunca lanza")
    void facturaRecibida() {
        EnlacePagoOnvo e = abierto();
        when(repo.findByEmpresaIdAndEstado(7L, EnlacePagoOnvo.CREADO)).thenReturn(List.of(e));
        when(provider.expirarSesionParaCancelar("sess_1")).thenReturn(true);
        assertThat(svc.alRecibirFactura(7L)).isEqualTo(1);
        assertThat(e.getEstado()).isEqualTo(EnlacePagoOnvo.CANCELADO);

        EnlacePagoOnvo otro = new EnlacePagoOnvo();
        when(repo.findByEmpresaIdAndEstado(8L, EnlacePagoOnvo.CREADO)).thenReturn(List.of(otro));
        assertThat(svc.alRecibirFactura(8L)).isZero();
    }

    @Test
    @DisplayName("Conciliación: cierra como PAGADO o EXPIRADO lo que ONVO ya resolvió")
    void conciliar() {
        EnlacePagoOnvo pagado = abierto();
        EnlacePagoOnvo expirado = new EnlacePagoOnvo();
        expirado.setOnvoSessionId("sess_2");
        when(repo.findByEstadoOrderByCreadoEnAsc(eq(EnlacePagoOnvo.CREADO), any(Pageable.class)))
            .thenReturn(List.of(pagado, expirado));
        doReturn(Map.of("paymentStatus", "paid")).when(onvo).obtenerCheckoutSession("sess_1");
        doReturn(Map.of("status", "expired", "paymentStatus", "unpaid")).when(onvo).obtenerCheckoutSession("sess_2");
        svc.conciliar();
        assertThat(pagado.getEstado()).isEqualTo(EnlacePagoOnvo.PAGADO);
        assertThat(expirado.getEstado()).isEqualTo(EnlacePagoOnvo.EXPIRADO);
    }

    private static <T> T eq(T v) { return org.mockito.ArgumentMatchers.eq(v); }
}
