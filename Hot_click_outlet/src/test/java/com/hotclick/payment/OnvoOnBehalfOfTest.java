package com.hotclick.payment;

import com.hotclick.model.Empresa;
import com.hotclick.model.Pedido;
import com.hotclick.model.Usuario;
import com.hotclick.service.OnvoService;
import com.hotclick.service.onvo.cuenta.CuentaOnvoService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpEntity;
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
    @DisplayName("Cuenta ACTIVA → sesión con onBehalfOf")
    void activaUsaOnBehalfOf() throws Exception {
        OnvoService onvo = onvoListo();
        CuentaOnvoService cuentas = mock(CuentaOnvoService.class);
        when(cuentas.onBehalfOfPara(any())).thenReturn("cl_abc123");
        Usuario u = new Usuario();
        provider(onvo, cuentas).crearSesion(pedido(), u);
        verify(onvo).crearCheckoutSession(eq(1000), anyString(), anyString(), anyString(), any(), anyMap(), eq("cl_abc123"));
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
        s.init();
        s.crearCheckoutSession(1000, "d", "https://ok", "https://ko", null, Map.of(), "cl_abc123");
        s.crearCheckoutSession(1000, "d", "https://ok", "https://ko", null, Map.of());
        ArgumentCaptor<HttpEntity> cap = ArgumentCaptor.forClass(HttpEntity.class);
        verify(rt, times(2)).exchange(anyString(), any(), cap.capture(), eq(Map.class));
        assertThat((Map<String, Object>) cap.getAllValues().get(0).getBody()).containsEntry("onBehalfOf", "cl_abc123");
        assertThat((Map<String, Object>) cap.getAllValues().get(1).getBody()).doesNotContainKey("onBehalfOf");
    }
}
