package com.hotclick.payment;

import com.hotclick.model.Empresa;
import com.hotclick.model.Pedido;
import com.hotclick.model.Usuario;
import com.hotclick.service.OnvoService;
import com.hotclick.model.PedidoRetencionOnvo;
import com.hotclick.repository.PedidoRetencionOnvoRepository;
import com.hotclick.service.onvo.cuenta.ComisionOnvoSyncService;
import com.hotclick.service.onvo.cuenta.CuentaOnvoService;
import java.math.BigDecimal;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpEntity;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@DisplayName("Cobro ONVO con onBehalfOf solo si la cuenta conectada está ACTIVA")
class OnvoOnBehalfOfTest {

    private Pedido pedido() {
        Empresa e = new Empresa();
        e.setId(7L);
        Pedido p = new Pedido();
        p.setId(1L);
        p.setNumeroPedido("HC-1");
        p.setTotalPedido(1000);
        p.setEmpresa(e);
        return p;
    }

    private OnvoPaymentProvider provider(OnvoService onvo, CuentaOnvoService cuentas) {
        OnvoPaymentProvider p = new OnvoPaymentProvider();
        ReflectionTestUtils.setField(p, "onvoService", onvo);
        ReflectionTestUtils.setField(p, "cuentaOnvoService", cuentas);
        ReflectionTestUtils.setField(p, "pedidoStatusTokenService", com.hotclick.service.payment.PedidoStatusTokenServiceTest.servicio());
        ReflectionTestUtils.setField(p, "appUrl", "https://hotclick.lat");
        return p;
    }

    private OnvoService onvoListo() {
        OnvoService onvo = mock(OnvoService.class);
        when(onvo.isPagosDisponibles()).thenReturn(true);
        when(onvo.isMockMode()).thenReturn(false);
        OnvoService.OnvoCheckoutSession s = new OnvoService.OnvoCheckoutSession("cs_1", "https://checkout");
        when(onvo.crearCheckoutSession(anyInt(), anyString(), anyString(), anyString(), any(), anyMap())).thenReturn(s);
        when(onvo.crearCheckoutSession(anyInt(), anyString(), anyString(), anyString(), any(), anyMap(), anyString())).thenReturn(s);
        return onvo;
    }

    @Test
    @DisplayName("Cuenta ACTIVA con % sincronizado → sesión con onBehalfOf y marca de retención del pedido")
    void activaUsaOnBehalfOf() throws Exception {
        OnvoService onvo = onvoListo();
        CuentaOnvoService cuentas = mock(CuentaOnvoService.class);
        when(cuentas.onBehalfOfPara(any())).thenReturn("cl_abc123");
        ComisionOnvoSyncService sync = mock(ComisionOnvoSyncService.class);
        when(sync.feeVigente(7L)).thenReturn(new BigDecimal("9.00"));
        PedidoRetencionOnvoRepository retencion = mock(PedidoRetencionOnvoRepository.class);
        OnvoPaymentProvider p = provider(onvo, cuentas);
        ReflectionTestUtils.setField(p, "comisionSync", sync);
        ReflectionTestUtils.setField(p, "retencionRepo", retencion);
        p.crearSesion(pedido(), new Usuario());
        verify(onvo).crearCheckoutSession(eq(1000), anyString(), anyString(), anyString(), any(), anyMap(), eq("cl_abc123"));
        ArgumentCaptor<PedidoRetencionOnvo> cap = ArgumentCaptor.forClass(PedidoRetencionOnvo.class);
        verify(retencion).save(cap.capture());
        assertThat(cap.getValue().getPedidoId()).isEqualTo(1L);
        assertThat(cap.getValue().getFeePct()).isEqualByComparingTo("9.00");
    }

    @Test
    @DisplayName("Cuenta ACTIVA pero % no sincronizado → cobro a la plataforma, sin marca (HotClick descuenta como siempre)")
    void activaSinPorcentajeVigente() throws Exception {
        OnvoService onvo = onvoListo();
        CuentaOnvoService cuentas = mock(CuentaOnvoService.class);
        when(cuentas.onBehalfOfPara(any())).thenReturn("cl_abc123");
        ComisionOnvoSyncService sync = mock(ComisionOnvoSyncService.class);
        when(sync.feeVigente(7L)).thenReturn(null);
        PedidoRetencionOnvoRepository retencion = mock(PedidoRetencionOnvoRepository.class);
        OnvoPaymentProvider p = provider(onvo, cuentas);
        ReflectionTestUtils.setField(p, "comisionSync", sync);
        ReflectionTestUtils.setField(p, "retencionRepo", retencion);
        p.crearSesion(pedido(), new Usuario());
        verify(onvo, never()).crearCheckoutSession(anyInt(), anyString(), anyString(), anyString(), any(), anyMap(), anyString());
        verify(retencion, never()).save(any());
        verify(retencion).borrarPorPedido(1L);
    }

    @Test
    @DisplayName("Si ONVO falla al crear la sesión, la marca de retención se borra")
    void falloBorraMarca() {
        OnvoService onvo = onvoListo();
        when(onvo.crearCheckoutSession(anyInt(), anyString(), anyString(), anyString(), any(), anyMap(), anyString()))
            .thenThrow(new IllegalStateException("x"));
        CuentaOnvoService cuentas = mock(CuentaOnvoService.class);
        when(cuentas.onBehalfOfPara(any())).thenReturn("cl_abc123");
        ComisionOnvoSyncService sync = mock(ComisionOnvoSyncService.class);
        when(sync.feeVigente(7L)).thenReturn(new BigDecimal("9.00"));
        PedidoRetencionOnvoRepository retencion = mock(PedidoRetencionOnvoRepository.class);
        OnvoPaymentProvider p = provider(onvo, cuentas);
        ReflectionTestUtils.setField(p, "comisionSync", sync);
        ReflectionTestUtils.setField(p, "retencionRepo", retencion);
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> p.crearSesion(pedido(), new Usuario()))
            .isInstanceOf(IllegalStateException.class);
        verify(retencion, atLeastOnce()).borrarPorPedido(1L);
    }

    @Test
    @DisplayName("Cuenta no activa (o sin servicio) → sesión como hoy, sin onBehalfOf")
    void noActivaSinOnBehalfOf() throws Exception {
        OnvoService onvo = onvoListo();
        CuentaOnvoService cuentas = mock(CuentaOnvoService.class);
        when(cuentas.onBehalfOfPara(any())).thenReturn(null);
        provider(onvo, cuentas).crearSesion(pedido(), new Usuario());
        provider(onvo, null).crearSesion(pedido(), new Usuario());
        verify(onvo, times(2)).crearCheckoutSession(anyInt(), anyString(), anyString(), anyString(), any(), anyMap());
        verify(onvo, never()).crearCheckoutSession(anyInt(), anyString(), anyString(), anyString(), any(), anyMap(), anyString());
    }

    @Test
    @DisplayName("OnvoService manda onBehalfOf en CreateOneTimeLink solo en la variante con cuenta")
    @SuppressWarnings({"unchecked", "rawtypes"})
    void cuerpoOneTimeLink() {
        RestTemplate rt = mock(RestTemplate.class);
        when(rt.exchange(anyString(), any(), any(), eq(Map.class)))
            .thenReturn((ResponseEntity) ResponseEntity.ok(Map.of("id", "cs_1", "url", "https://checkout")));
        OnvoService s = new OnvoService(rt);
        ReflectionTestUtils.setField(s, "secretKey", "onvo_test_secret_key_abc");
        // Llave de prueba solo se acepta en perfil test (master: fuera de dev/test falla cerrado).
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("test");
        ReflectionTestUtils.setField(s, "environment", env);
        s.init();
        s.crearCheckoutSession(1000, "d", "https://ok", "https://ko", null, Map.of(), "cl_abc123");
        s.crearCheckoutSession(1000, "d", "https://ok", "https://ko", null, Map.of());
        ArgumentCaptor<HttpEntity> cap = ArgumentCaptor.forClass(HttpEntity.class);
        verify(rt, times(2)).exchange(anyString(), any(), cap.capture(), eq(Map.class));
        assertThat((Map<String, Object>) cap.getAllValues().get(0).getBody()).containsEntry("onBehalfOf", "cl_abc123");
        assertThat((Map<String, Object>) cap.getAllValues().get(1).getBody()).doesNotContainKey("onBehalfOf");
    }
}
