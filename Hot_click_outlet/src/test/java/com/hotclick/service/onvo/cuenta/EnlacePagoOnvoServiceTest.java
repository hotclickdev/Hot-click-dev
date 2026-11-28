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
    private com.hotclick.service.fiscal.ConfiguracionFiscalService config;

    @BeforeEach
    void setUp() {
        repo = mock(EnlacePagoOnvoRepository.class);
        empresaRepo = mock(EmpresaRepository.class);
        onvo = mock(OnvoService.class);
        provider = mock(OnvoPaymentProvider.class);
        config = mock(com.hotclick.service.fiscal.ConfiguracionFiscalService.class);
        when(config.enlacesPagoActivos()).thenReturn(true);
        svc = new EnlacePagoOnvoService(repo, empresaRepo, onvo, provider, config, "https://app.test", 50);
        when(empresaRepo.existsById(7L)).thenReturn(true);
        when(repo.save(any())).thenAnswer(i -> i.getArgument(0));
        when(repo.saveAndFlush(any())).thenAnswer(i -> i.getArgument(0));
        when(repo.findByEmpresaIdAndEstado(7L, EnlacePagoOnvo.CREADO)).thenReturn(List.of());
        when(onvo.crearCheckoutSession(anyInt(), anyString(), anyString(), anyString(), any(), anyMap()))
            .thenReturn(new OnvoService.OnvoCheckoutSession("sess_1", "https://pay.test/s1"));
    }

    /** Sesión pagada de ONVO por 50.000 colones (unidad menor: x 100). */
    private static Map<String, Object> pagada() {
        return Map.of("paymentStatus", "paid", "status", "complete", "amountTotal", 5_000_000, "currency", "CRC");
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
    @DisplayName("Interruptor APAGADO: crear responde conflicto «Enlaces de pago desactivados» sin llamar a ONVO; cancelar y webhook siguen")
    void interruptorApagado() {
        when(config.enlacesPagoActivos()).thenReturn(false);
        assertThatThrownBy(() -> svc.crear(7L, 50_000, "Factura tardía"))
            .isInstanceOf(EnlaceConflictoException.class).hasMessage("Enlaces de pago desactivados");
        verifyNoInteractions(onvo);
        // Un enlace existente se puede cancelar y se marca pagado aunque el interruptor esté apagado.
        EnlacePagoOnvo e = abierto();
        when(provider.expirarSesionParaCancelar("sess_1")).thenReturn(true);
        assertThat(svc.cancelar(1L).getEstado()).isEqualTo(EnlacePagoOnvo.CANCELADO);
    }

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
        doReturn(pagada()).when(onvo).obtenerCheckoutSession("sess_1");
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
        doReturn(pagada()).when(onvo).obtenerCheckoutSession("sess_1");
        assertThat(svc.confirmarPorWebhook("sess_1")).isEqualTo(ResultadoWebhook.PAGADO);
        assertThat(e.getEstado()).isEqualTo(EnlacePagoOnvo.PAGADO);
        assertThat(e.getPagadoEn()).isNotNull();
        assertThat(svc.confirmarPorWebhook("sess_1")).isEqualTo(ResultadoWebhook.DUPLICADO);
        verify(onvo, times(1)).obtenerCheckoutSession("sess_1");
    }

    @Test
    @DisplayName("Webhook: pagada pero con otro monto, otra moneda o sin esos datos → no se marca PAGADO")
    void webhookMontoYMoneda() {
        EnlacePagoOnvo e = abierto();
        doReturn(Map.of("paymentStatus", "paid", "amountTotal", 100, "currency", "CRC")).when(onvo).obtenerCheckoutSession("sess_1");
        assertThat(svc.confirmarPorWebhook("sess_1")).isEqualTo(ResultadoWebhook.DATOS_DISTINTOS);
        doReturn(Map.of("paymentStatus", "paid", "amountTotal", 5_000_000, "currency", "USD")).when(onvo).obtenerCheckoutSession("sess_1");
        assertThat(svc.confirmarPorWebhook("sess_1")).isEqualTo(ResultadoWebhook.DATOS_DISTINTOS);
        doReturn(Map.of("paymentStatus", "paid")).when(onvo).obtenerCheckoutSession("sess_1");
        assertThat(svc.confirmarPorWebhook("sess_1")).isEqualTo(ResultadoWebhook.DATOS_DISTINTOS);
        assertThat(e.getEstado()).isEqualTo(EnlacePagoOnvo.CREADO);
    }

    @Test
    @DisplayName("Alta simultánea: el índice único rechaza el segundo enlace abierto → 409 y se expira su sesión")
    void altaSimultanea() {
        when(repo.saveAndFlush(any())).thenThrow(new org.springframework.dao.DataIntegrityViolationException("uq"));
        assertThatThrownBy(() -> svc.crear(7L, 50_000, "Factura tardía"))
            .isInstanceOf(EnlaceConflictoException.class);
        verify(provider).expirarSesionParaCancelar("sess_1");
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
        EnlacePagoOnvoLotes lotes = new EnlacePagoOnvoLotes(svc);
        assertThat(lotes.alRecibirFactura(7L)).isEqualTo(1);
        assertThat(e.getEstado()).isEqualTo(EnlacePagoOnvo.CANCELADO);

        EnlacePagoOnvo otro = new EnlacePagoOnvo();
        org.springframework.test.util.ReflectionTestUtils.setField(otro, "id", 9L);
        when(repo.findByEmpresaIdAndEstado(8L, EnlacePagoOnvo.CREADO)).thenReturn(List.of(otro));
        assertThat(lotes.alRecibirFactura(8L)).isZero();
    }

    @Test
    @DisplayName("Conciliación: cierra como PAGADO o EXPIRADO lo que ONVO ya resolvió")
    void conciliar() {
        EnlacePagoOnvo pagado = abierto();
        EnlacePagoOnvo expirado = new EnlacePagoOnvo();
        org.springframework.test.util.ReflectionTestUtils.setField(expirado, "id", 2L);
        expirado.setOnvoSessionId("sess_2");
        when(repo.findById(2L)).thenReturn(Optional.of(expirado));
        when(repo.findByEstadoOrderByCreadoEnAsc(eq(EnlacePagoOnvo.CREADO), any(Pageable.class)))
            .thenReturn(List.of(pagado, expirado));
        doReturn(pagada()).when(onvo).obtenerCheckoutSession("sess_1");
        doReturn(Map.of("status", "expired", "paymentStatus", "unpaid")).when(onvo).obtenerCheckoutSession("sess_2");
        new EnlacePagoOnvoLotes(svc).conciliar();
        assertThat(pagado.getEstado()).isEqualTo(EnlacePagoOnvo.PAGADO);
        assertThat(expirado.getEstado()).isEqualTo(EnlacePagoOnvo.EXPIRADO);
    }

    private static <T> T eq(T v) { return org.mockito.ArgumentMatchers.eq(v); }
}
