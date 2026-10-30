package com.hotclick.service.facturacion;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.hotclick.controller.FacturaController;
import com.hotclick.model.ComprobanteFiscal;
import com.hotclick.model.Empresa;
import com.hotclick.model.Pedido;
import com.hotclick.repository.ComprobanteFiscalRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.security.PropietarioGuard;
import com.hotclick.service.ClaveNumericaService;
import com.hotclick.service.ConsecutivoFiscalService;
import com.hotclick.service.FacturacionService;
import com.hotclick.service.HaciendaContribuyenteService;
import com.hotclick.service.HaciendaTokenService;
import com.hotclick.service.TotpSecretEncryptionService;
import com.hotclick.service.hacienda.HaciendaConfiguracionException;
import com.hotclick.service.hacienda.HaciendaTransitoriaException;
import com.hotclick.service.payment.CompraPagadaEvent;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import java.lang.reflect.Method;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** Área 7 (auditoría sobre d36f3816): N1, N2, logs con clave/cédula, token vacío y cédula de relleno. */
@DisplayName("Área 7 — emisión solo admin a nombre de HotClick, interruptor automático y logs sanitizados")
class Area7EmisionYLogsTest {

    // Valores ficticios con forma de clave y cédula (no son datos reales).
    private static final String CLAVE_FICTICIA = "50601012600" + "3101999999" + "00100001040000000001" + "1" + "12345678";
    private static final String CEDULA_FICTICIA = "3101999999";

    private final ComprobanteFiscalRepository comprobantes = mock(ComprobanteFiscalRepository.class);
    private final ConsecutivoFiscalService consecutivos = mock(ConsecutivoFiscalService.class);
    private final ClaveNumericaService claves = mock(ClaveNumericaService.class);
    private final CompanyScope scope = mock(CompanyScope.class);
    private final PedidoRepository pedidos = mock(PedidoRepository.class);
    private final EmpresaRepository empresas = mock(EmpresaRepository.class);
    private FacturacionEmisionSupport support;
    private Empresa hotclick;
    private Empresa negocio;
    private ListAppender<ILoggingEvent> appender;
    private final List<Logger> loggers = new java.util.ArrayList<>();

    @BeforeEach
    void setUp() {
        support = new FacturacionEmisionSupport(comprobantes, consecutivos, claves, scope, pedidos, empresas);
        hotclick = new Empresa();
        hotclick.setId(Constants.EMPRESA_PLATAFORMA_ID);
        hotclick.setCedulaJuridica(CEDULA_FICTICIA);
        negocio = new Empresa();
        negocio.setId(42L);
        when(empresas.findById(Constants.EMPRESA_PLATAFORMA_ID)).thenReturn(Optional.of(hotclick));
        when(comprobantes.save(any())).thenAnswer(i -> i.getArgument(0));
        when(consecutivos.siguienteNumero(anyLong(), anyString())).thenReturn(1L);
        when(claves.generar(anyString(), anyString(), any())).thenReturn(CLAVE_FICTICIA);
        appender = new ListAppender<>();
        appender.start();
    }

    @AfterEach
    void tearDown() {
        loggers.forEach(l -> l.detachAppender(appender));
    }

    private void escuchar(Class<?> c) {
        Logger l = (Logger) LoggerFactory.getLogger(c);
        l.addAppender(appender);
        loggers.add(l);
    }

    private String logs() {
        return String.join("\n", appender.list.stream().map(ILoggingEvent::getFormattedMessage).toList());
    }

    private Pedido pedidoDelNegocio() {
        Pedido p = new Pedido();
        p.setId(5L);
        p.setEmpresa(negocio);
        return p;
    }

    // ── N1 ────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("N1: el endpoint de emisión solo admite el rol ADMIN")
    void n1EndpointSoloAdmin() throws Exception {
        Method m = FacturaController.class.getMethod("emitir", Long.class, Map.class);
        assertThat(m.getAnnotation(PreAuthorize.class).value()).isEqualTo("hasRole('ADMIN')");
    }

    @Test
    @DisplayName("N1: un EMPRENDEDOR recibe 403 en el controller y no se llama al servicio")
    void n1ControllerEmprendedor403() {
        FacturacionService svc = mock(FacturacionService.class);
        when(scope.isAdminIT()).thenReturn(false);
        FacturaController ctrl = new FacturaController(svc, mock(FacturaConsultaService.class),
            mock(PropietarioGuard.class), scope);
        assertThatThrownBy(() -> ctrl.emitir(5L, null)).isInstanceOf(AccessDeniedException.class);
        verifyNoInteractions(svc);
    }

    @Test
    @DisplayName("N1: quien no es admin de HotClick recibe 403 sin reservar consecutivo")
    void n1SoporteNoAdminSinConsecutivo() {
        when(scope.isAdminIT()).thenReturn(false);
        assertThatThrownBy(() -> support.emitir(pedidoDelNegocio(), ComprobanteFiscal.TIPO_TIQUETE))
            .isInstanceOf(AccessDeniedException.class);
        verifyNoInteractions(consecutivos, claves);
        verify(comprobantes, never()).save(any());
    }

    @Test
    @DisplayName("N1: el admin emite siempre a nombre de HotClick, no del negocio")
    void n1AdminEmiteComoHotClick() {
        when(scope.isAdminIT()).thenReturn(true);
        ComprobanteFiscal cf = support.emitir(pedidoDelNegocio(), ComprobanteFiscal.TIPO_TIQUETE);
        assertThat(cf.getEmpresa()).isSameAs(hotclick);
        verify(consecutivos).siguienteNumero(Constants.EMPRESA_PLATAFORMA_ID, ComprobanteFiscal.TIPO_TIQUETE);
        verify(consecutivos, never()).siguienteNumero(eq(42L), anyString());
        verify(claves).generar(eq(CEDULA_FICTICIA), anyString(), any());
    }

    // ── N2 ────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("N2: con el interruptor apagado (default) el listener no emite")
    void n2InterruptorApagadoNoEmite() {
        FacturacionService svc = mock(FacturacionService.class);
        new TiqueteCompraListener(svc, false).alConfirmarCompra(new CompraPagadaEvent(55L));
        verifyNoInteractions(svc);
    }

    @Test
    @DisplayName("N2: el default de hacienda.emision-automatica es false")
    void n2DefaultApagado() throws Exception {
        java.util.Properties p = new java.util.Properties();
        try (var in = getClass().getResourceAsStream("/application.properties")) { p.load(in); }
        assertThat(p.getProperty("hacienda.emision-automatica")).isEqualTo("${HACIENDA_EMISION_AUTOMATICA:false}");
    }

    @Test
    @DisplayName("N2: una compra con pedidos es_prueba no genera tiquete ni consecutivo")
    void n2CompraDePruebaSeSalta() {
        Pedido p = pedidoDelNegocio();
        p.setEsPrueba(true);
        when(comprobantes.findFirstByCompra_IdAndEstadoIn(eq(77L), anyList())).thenReturn(Optional.empty());
        when(pedidos.findByCompra_IdOrderByNumeroPaqueteAsc(77L)).thenReturn(List.of(p));
        assertThat(support.emitirTiqueteDeCompra(77L)).isNull();
        verifyNoInteractions(consecutivos, claves);
        verify(comprobantes, never()).save(any());
    }

    @Test
    @DisplayName("N2/logs: si la emisión automática falla, el log no lleva el mensaje crudo")
    void n2ListenerLogSanitizado() {
        escuchar(TiqueteCompraListener.class);
        FacturacionService svc = mock(FacturacionService.class);
        when(svc.emitirTiqueteDeCompra(55L)).thenThrow(new IllegalStateException("falló clave " + CLAVE_FICTICIA));
        new TiqueteCompraListener(svc, true).alConfirmarCompra(new CompraPagadaEvent(55L));
        verify(svc).emitirTiqueteDeCompra(55L);
        assertThat(logs()).doesNotContain(CLAVE_FICTICIA).doesNotContain(CEDULA_FICTICIA);
    }

    // ── MEDIO logs ────────────────────────────────────────────────────────────

    @Test
    @DisplayName("logs: al crear el comprobante no se loguea la clave completa")
    void logsClaveEnmascarada() {
        escuchar(FacturacionEmisionSupport.class);
        when(scope.isAdminIT()).thenReturn(true);
        support.emitir(pedidoDelNegocio(), ComprobanteFiscal.TIPO_TIQUETE);
        assertThat(logs()).contains("***5678").doesNotContain(CLAVE_FICTICIA).doesNotContain(CEDULA_FICTICIA);
    }

    @Test
    @DisplayName("logs: el fallback de contribuyente no loguea la cédula ni el mensaje crudo")
    void logsContribuyenteSinCedula() throws Exception {
        escuchar(HaciendaContribuyenteService.class);
        HaciendaContribuyenteService svc = new HaciendaContribuyenteService(mock(RestTemplate.class), empresas);
        Method fb = HaciendaContribuyenteService.class.getDeclaredMethod("fallbackConsulta", String.class, Throwable.class);
        fb.setAccessible(true);
        fb.invoke(svc, CEDULA_FICTICIA, new RuntimeException("caída consultando " + CEDULA_FICTICIA));
        assertThat(logs()).isNotEmpty().doesNotContain(CEDULA_FICTICIA);
    }

    // ── MEDIO token ───────────────────────────────────────────────────────────

    private Empresa conAtv() {
        Empresa e = new Empresa();
        e.setId(9L);
        e.setUsuarioHacienda("usuario-ficticio");
        e.setClaveHaciendaEnc("cifrada-ficticia");
        return e;
    }

    @Test
    @DisplayName("token: sin credenciales lanza HaciendaConfiguracionException, nunca devuelve vacío")
    void tokenSinCredencialesLanza() {
        HaciendaTokenService t = new HaciendaTokenService(mock(RestTemplate.class), mock(TotpSecretEncryptionService.class));
        Empresa e = new Empresa();
        e.setId(9L);
        assertThatThrownBy(() -> t.getToken(e)).isInstanceOf(HaciendaConfiguracionException.class);
    }

    @Test
    @DisplayName("token: si el IdP no responde lanza HaciendaTransitoriaException sin el mensaje crudo en el log")
    @SuppressWarnings({"unchecked", "rawtypes"})
    void tokenIdpCaidoLanza() {
        escuchar(HaciendaTokenService.class);
        RestTemplate rt = mock(RestTemplate.class);
        when(rt.exchange(anyString(), any(), any(), any(Class.class)))
            .thenThrow(new ResourceAccessException("timeout " + CEDULA_FICTICIA));
        HaciendaTokenService t = new HaciendaTokenService(rt, mock(TotpSecretEncryptionService.class));
        assertThatThrownBy(() -> t.getToken(conAtv())).isInstanceOf(HaciendaTransitoriaException.class);
        assertThat(logs()).doesNotContain(CEDULA_FICTICIA);
    }

    @Test
    @DisplayName("token: una respuesta 200 sin access_token lanza, no devuelve vacío")
    @SuppressWarnings({"unchecked", "rawtypes"})
    void tokenRespuestaSinTokenLanza() {
        RestTemplate rt = mock(RestTemplate.class);
        when(rt.exchange(anyString(), any(), any(), any(Class.class)))
            .thenReturn(new ResponseEntity<>(Map.of("expires_in", 1800), HttpStatus.OK));
        HaciendaTokenService t = new HaciendaTokenService(rt, mock(TotpSecretEncryptionService.class));
        assertThatThrownBy(() -> t.getToken(conAtv())).isInstanceOf(HaciendaConfiguracionException.class);
    }

    // ── BAJO cédula ───────────────────────────────────────────────────────────

    @Test
    @DisplayName("BAJO: sin cédula de HotClick la emisión manual falla sin reservar consecutivo")
    void bajoSinCedulaManualSinConsecutivo() {
        hotclick.setCedulaJuridica(null);
        when(scope.isAdminIT()).thenReturn(true);
        assertThatThrownBy(() -> support.emitir(pedidoDelNegocio(), ComprobanteFiscal.TIPO_TIQUETE))
            .isInstanceOf(HaciendaConfiguracionException.class);
        verifyNoInteractions(consecutivos, claves);
    }

    @Test
    @DisplayName("BAJO: el validador nunca devuelve la cédula de relleno con ceros")
    void bajoSinRellenoDeCeros() {
        Empresa e = new Empresa();
        e.setCedulaJuridica(" ");
        assertThatThrownBy(() -> FacturacionEmisionSupport.exigirCedulaEmisor(e))
            .isInstanceOf(HaciendaConfiguracionException.class);
        assertThat(FacturacionEmisionSupport.exigirCedulaEmisor(hotclick)).isEqualTo(CEDULA_FICTICIA);
    }
}
