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

import java.util.List;
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
        @SuppressWarnings("unchecked")
        ArgumentCaptor<Iterable<PedidoRetencionOnvo>> cap = ArgumentCaptor.forClass(Iterable.class);
        verify(retencion).saveAll(cap.capture());
        verify(retencion).asignarSesion(eq("cs_1"), eq(List.of(1L)));
        PedidoRetencionOnvo guardada = cap.getValue().iterator().next();
        assertThat(guardada.getPedidoId()).isEqualTo(1L);
        assertThat(guardada.getFeePct()).isEqualByComparingTo("9.00");
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
        verify(retencion, never()).saveAll(any());
        verify(retencion).borrarPorPedidos(List.of(1L));
    }

    private OnvoPaymentProvider providerActivo(OnvoService onvo, ComisionOnvoSyncService sync, PedidoRetencionOnvoRepository retencion) {
        CuentaOnvoService cuentas = mock(CuentaOnvoService.class);
        when(cuentas.onBehalfOfPara(any())).thenReturn("cl_abc123");
        OnvoPaymentProvider p = provider(onvo, cuentas);
        ReflectionTestUtils.setField(p, "comisionSync", sync);
        ReflectionTestUtils.setField(p, "retencionRepo", retencion);
        return p;
    }

    private Pedido pedidoDe(long id, long empresaId) {
        Empresa e = new Empresa();
        e.setId(empresaId);
        Pedido p = new Pedido();
        p.setId(id);
        p.setEmpresa(e);
        return p;
    }

    @Test
    @DisplayName("Carrito de DOS negocios: cobro a la plataforma y sin marca (el total incluye plata ajena)")
    void grupoDeDosNegocios() throws Exception {
        OnvoService onvo = onvoListo();
        ComisionOnvoSyncService sync = mock(ComisionOnvoSyncService.class);
        when(sync.feeVigente(anyLong())).thenReturn(new BigDecimal("9.00"));
        PedidoRetencionOnvoRepository retencion = mock(PedidoRetencionOnvoRepository.class);
        Pedido principal = pedidoDe(1L, 7L);
        Pedido ajeno = pedidoDe(2L, 8L);
        Pedido cobro = com.hotclick.service.payment.CheckoutGrupoFactory.paraCobro(principal, 50_000, List.of(principal, ajeno));
        cobro.setNumeroPedido("HC-1");

        providerActivo(onvo, sync, retencion).crearSesion(cobro, new Usuario());

        verify(onvo, never()).crearCheckoutSession(anyInt(), anyString(), anyString(), anyString(), any(), anyMap(), anyString());
        verify(retencion, never()).saveAll(any());
        verify(retencion, never()).asignarSesion(any(), any());
    }

    @Test
    @DisplayName("Carrito de UN negocio con varios paquetes: onBehalfOf y marca en todos los pedidos del grupo")
    void grupoDeUnNegocio() throws Exception {
        OnvoService onvo = onvoListo();
        ComisionOnvoSyncService sync = mock(ComisionOnvoSyncService.class);
        when(sync.feeVigente(7L)).thenReturn(new BigDecimal("9.00"));
        PedidoRetencionOnvoRepository retencion = mock(PedidoRetencionOnvoRepository.class);
        Pedido principal = pedidoDe(1L, 7L);
        Pedido segundo = pedidoDe(2L, 7L);
        Pedido cobro = com.hotclick.service.payment.CheckoutGrupoFactory.paraCobro(principal, 50_000, List.of(principal, segundo));
        cobro.setNumeroPedido("HC-1");

        providerActivo(onvo, sync, retencion).crearSesion(cobro, new Usuario());

        verify(onvo).crearCheckoutSession(eq(50_000), anyString(), anyString(), anyString(), any(), anyMap(), eq("cl_abc123"));
        verify(retencion).saveAll(any());
        verify(retencion).asignarSesion(eq("cs_1"), eq(List.of(1L, 2L)));
    }

    private OnvoPaymentProvider conMarca(OnvoService onvo, PedidoRetencionOnvoRepository retencion) {
        PedidoRetencionOnvo marca = new PedidoRetencionOnvo();
        marca.setPedidoId(1L);
        marca.setOnvoAccountId("cl_abc123");
        marca.setFeePct(new BigDecimal("9.00"));
        when(retencion.findByOnvoSessionId("cs_1")).thenReturn(List.of(marca));
        return providerActivo(onvo, mock(ComisionOnvoSyncService.class), retencion);
    }

    @Test
    @DisplayName("Sesión a nombre de la cuenta esperada: la marca sigue como está")
    void sesionConLaCuentaEsperada() {
        OnvoService onvo = mock(OnvoService.class);
        PedidoRetencionOnvoRepository retencion = mock(PedidoRetencionOnvoRepository.class);
        doReturn(Map.of("onBehalfOfId", "cl_abc123")).when(onvo).obtenerCheckoutSession("cs_1");
        conMarca(onvo, retencion).validarRetencionDeSesion("cs_1");
        verify(retencion, never()).borrarPorSesion(any());
        verify(retencion, never()).cambiarEstadoPorSesion(any(), any());
    }

    @Test
    @DisplayName("ONVO confirma que la sesión fue SIN onBehalfOf (cobro a la plataforma): se borra la marca")
    void sesionSinOnBehalfOfConfirmado() {
        OnvoService onvo = mock(OnvoService.class);
        PedidoRetencionOnvoRepository retencion = mock(PedidoRetencionOnvoRepository.class);
        java.util.Map<String, Object> sinCuenta = new java.util.HashMap<>();
        sinCuenta.put("onBehalfOfId", null);
        doReturn(sinCuenta).when(onvo).obtenerCheckoutSession("cs_1");
        conMarca(onvo, retencion).validarRetencionDeSesion("cs_1");
        verify(retencion).borrarPorSesion("cs_1");
        verify(retencion, never()).cambiarEstadoPorSesion(any(), any());
    }

    @Test
    @DisplayName("ONVO no devuelve onBehalfOfId: NO se borra la marca; queda POR_REVISAR (sin acreditar wallet)")
    void sesionSinClaveQuedaPorRevisar() {
        OnvoService onvo = mock(OnvoService.class);
        PedidoRetencionOnvoRepository retencion = mock(PedidoRetencionOnvoRepository.class);
        doReturn(Map.of("paymentStatus", "paid")).when(onvo).obtenerCheckoutSession("cs_1");
        conMarca(onvo, retencion).validarRetencionDeSesion("cs_1");
        verify(retencion, never()).borrarPorSesion(any());
        verify(retencion).cambiarEstadoPorSesion(PedidoRetencionOnvo.POR_REVISAR, "cs_1");
    }

    @Test
    @DisplayName("ONVO devuelve otra cuenta: NO se borra la marca; queda POR_REVISAR")
    void sesionConOtraCuentaQuedaPorRevisar() {
        OnvoService onvo = mock(OnvoService.class);
        PedidoRetencionOnvoRepository retencion = mock(PedidoRetencionOnvoRepository.class);
        doReturn(Map.of("onBehalfOfId", "cl_otra")).when(onvo).obtenerCheckoutSession("cs_1");
        conMarca(onvo, retencion).validarRetencionDeSesion("cs_1");
        verify(retencion, never()).borrarPorSesion(any());
        verify(retencion).cambiarEstadoPorSesion(PedidoRetencionOnvo.POR_REVISAR, "cs_1");
    }

    @Test
    @DisplayName("Sin marcas para la sesión no se consulta ONVO")
    void sinMarcasNoConsulta() {
        OnvoService onvo = mock(OnvoService.class);
        PedidoRetencionOnvoRepository retencion = mock(PedidoRetencionOnvoRepository.class);
        providerActivo(onvo, mock(ComisionOnvoSyncService.class), retencion).validarRetencionDeSesion("cs_9");
        verify(onvo, never()).obtenerCheckoutSession(any());
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
        verify(retencion, atLeastOnce()).borrarPorPedidos(List.of(1L));
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
