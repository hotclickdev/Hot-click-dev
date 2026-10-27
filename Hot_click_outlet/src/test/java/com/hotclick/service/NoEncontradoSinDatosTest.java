package com.hotclick.service;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.hotclick.config.GlobalExceptionHandler;
import com.hotclick.dto.VentaRequestDTO;
import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.repository.PlanRepository;
import com.hotclick.repository.SuscripcionRepository;
import com.hotclick.repository.TipoOtpRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.model.Empresa;
import com.hotclick.model.Pedido;
import com.hotclick.service.payment.PedidoGrupoService;
import com.hotclick.service.suscripcion.SuscripcionBillingService;
import com.hotclick.utils.ErrorPublico;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.regex.Pattern;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * L3 (Seguridad): un {@link RecursoNoEncontradoException} (404) no lleva datos internos en el mensaje que ve el cliente
 * (correo del operador, plan o tipo de OTP configurados, número de pedido...). El detalle va solo al log del servidor,
 * sin correos y con el número de pedido enmascarado.
 */
@DisplayName("404 sin datos internos en el mensaje (L3)")
class NoEncontradoSinDatosTest {

    private static final String CORREO = "operador.ficticio@example.test";
    private static final String NUMERO_PEDIDO = "HC-20261027-ABCD1234";
    private static final String TIPO_OTP = "TIPO_OTP_INTERNO_X";
    private static final String PLAN_TRIAL = "PLAN_TRIAL_INTERNO_X";

    private final ListAppender<ILoggingEvent> appender = new ListAppender<>();
    private Logger logExcepcion;

    @BeforeEach
    void capturarLog() {
        logExcepcion = (Logger) LoggerFactory.getLogger(RecursoNoEncontradoException.class);
        appender.start();
        logExcepcion.addAppender(appender);
    }

    @AfterEach
    void soltarLog() {
        logExcepcion.detachAppender(appender);
        appender.stop();
    }

    private String logs() {
        StringBuilder sb = new StringBuilder();
        for (ILoggingEvent e : appender.list) sb.append(e.getFormattedMessage()).append('\n');
        return sb.toString();
    }

    private static String alCliente(Throwable t) {
        assertThat(t).isInstanceOf(NoSuchElementException.class);
        return new GlobalExceptionHandler().handleNotFound((NoSuchElementException) t).getBody().getMessage();
    }

    // ── VentaService ──────────────────────────────────────────────────────────

    private VentaService venta(EmpresaRepository empresas, UsuarioRepository usuarios) {
        VentaService v = new VentaService();
        ReflectionTestUtils.setField(v, "empresaRepository", empresas);
        ReflectionTestUtils.setField(v, "usuarioRepository", usuarios);
        return v;
    }

    @Test
    @DisplayName("VentaService: empresa inexistente → «Empresa no encontrada» sin id; el id queda en el log")
    void ventaEmpresa() {
        EmpresaRepository empresas = mock(EmpresaRepository.class);
        when(empresas.findById(anyLong())).thenReturn(Optional.empty());
        VentaRequestDTO dto = new VentaRequestDTO();
        dto.setItems(List.of(new VentaRequestDTO.ItemVentaDTO()));
        Throwable t = catchThrowable(() -> venta(empresas, null).crearVenta(dto, CORREO, 424242L));
        assertThat(alCliente(t)).isEqualTo("Empresa no encontrada");
        assertThat(t.getMessage()).doesNotContain("424242");
        assertThat(logs()).contains("empresaId=424242");
    }

    @Test
    @DisplayName("VentaService: cliente inexistente → sin el id del cliente en el mensaje")
    void ventaCliente() {
        UsuarioRepository usuarios = mock(UsuarioRepository.class);
        when(usuarios.findById(anyLong())).thenReturn(Optional.empty());
        VentaRequestDTO dto = new VentaRequestDTO();
        dto.setClienteId(515151L);
        Throwable t = catchThrowable(() -> ReflectionTestUtils.invokeMethod(venta(null, usuarios), "resolverUsuario", dto, CORREO));
        assertThat(alCliente(t)).isEqualTo("Cliente no encontrado");
        assertThat(t.getMessage()).doesNotContain("515151");
    }

    @Test
    @DisplayName("VentaService: operador sin cuenta → ni el mensaje ni el log llevan el correo")
    void ventaOperadorSinCorreo() {
        UsuarioRepository usuarios = mock(UsuarioRepository.class);
        when(usuarios.findByCorreo(anyString())).thenReturn(Optional.empty());
        Throwable t = catchThrowable(() ->
            ReflectionTestUtils.invokeMethod(venta(null, usuarios), "resolverUsuario", new VentaRequestDTO(), CORREO));
        assertThat(alCliente(t)).isEqualTo("Usuario operador no encontrado");
        assertThat(t.getMessage()).doesNotContain(CORREO).doesNotContain("@");
        assertThat(logs()).doesNotContain(CORREO).doesNotContain("@");
        assertThat(logs()).contains("Usuario operador no encontrado");
    }

    // ── PaymentService ────────────────────────────────────────────────────────

    @Test
    @DisplayName("PaymentService.consultarEstado: sin el número de pedido en el mensaje; en el log va enmascarado")
    void pagoPedido() {
        PedidoRepository pedidos = mock(PedidoRepository.class);
        when(pedidos.findByNumeroPedido(anyString())).thenReturn(Optional.empty());
        PaymentService ps = new PaymentService();
        ReflectionTestUtils.setField(ps, "pedidoRepository", pedidos);
        Throwable t = catchThrowable(() -> ps.consultarEstado(NUMERO_PEDIDO));
        assertThat(alCliente(t)).isEqualTo("Pedido no encontrado");
        assertThat(t.getMessage()).doesNotContain(NUMERO_PEDIDO).doesNotContain("ABCD1234");
        assertThat(logs()).contains("***1234").doesNotContain(NUMERO_PEDIDO);
    }

    @Test
    @DisplayName("PaymentService.consultarEstado: pago inexistente → «Pago no encontrado» sin el número de pedido")
    void pagoSinPago() {
        PedidoRepository pedidos = mock(PedidoRepository.class);
        when(pedidos.findByNumeroPedido(anyString())).thenReturn(Optional.of(new Pedido()));
        PedidoGrupoService grupo = mock(PedidoGrupoService.class);
        when(grupo.pagoDelGrupo(any())).thenReturn(Optional.empty());
        PaymentService ps = new PaymentService();
        ReflectionTestUtils.setField(ps, "pedidoRepository", pedidos);
        ReflectionTestUtils.setField(ps, "pedidoGrupoService", grupo);
        Throwable t = catchThrowable(() -> ps.consultarEstado(NUMERO_PEDIDO));
        assertThat(alCliente(t)).isEqualTo("Pago no encontrado");
        assertThat(t.getMessage()).doesNotContain(NUMERO_PEDIDO);
    }

    // ── OtpService ────────────────────────────────────────────────────────────

    @Test
    @DisplayName("OtpService: tipo de OTP no configurado → mensaje genérico sin el nombre del tipo; el tipo queda en el log")
    void otpTipo() {
        TipoOtpRepository tipos = mock(TipoOtpRepository.class);
        when(tipos.findByNombre(anyString())).thenReturn(Optional.empty());
        OtpService otp = new OtpService();
        ReflectionTestUtils.setField(otp, "tipoOtpRepository", tipos);
        Throwable t = catchThrowable(() -> otp.enviarOtp(new com.hotclick.model.Usuario(), TIPO_OTP));
        assertThat(alCliente(t)).isEqualTo(ErrorPublico.GENERICO);
        assertThat(t.getMessage()).doesNotContain(TIPO_OTP);
        assertThat(logs()).contains(TIPO_OTP);
    }

    // ── SuscripcionBillingService ─────────────────────────────────────────────

    private SuscripcionBillingService billing(EmpresaRepository empresas, SuscripcionRepository subs, PlanRepository planes) {
        SuscripcionBillingService s = new SuscripcionBillingService();
        ReflectionTestUtils.setField(s, "empresaRepo", empresas);
        ReflectionTestUtils.setField(s, "suscripcionRepo", subs);
        ReflectionTestUtils.setField(s, "planRepo", planes);
        ReflectionTestUtils.setField(s, "planTrial", PLAN_TRIAL);
        return s;
    }

    @Test
    @DisplayName("SuscripcionBillingService.iniciarTrial: plan de trial no configurado → genérico sin el nombre del plan")
    void trialPlan() {
        EmpresaRepository empresas = mock(EmpresaRepository.class);
        when(empresas.findById(anyLong())).thenReturn(Optional.of(new Empresa()));
        SuscripcionRepository subs = mock(SuscripcionRepository.class);
        when(subs.findActivaByEmpresaId(anyLong())).thenReturn(Optional.empty());
        PlanRepository planes = mock(PlanRepository.class);
        when(planes.findByNombre(anyString())).thenReturn(Optional.empty());
        Throwable t = catchThrowable(() -> billing(empresas, subs, planes).iniciarTrial(1L));
        assertThat(alCliente(t)).isEqualTo(ErrorPublico.GENERICO);
        assertThat(t.getMessage()).doesNotContain(PLAN_TRIAL);
        assertThat(logs()).contains(PLAN_TRIAL);
    }

    @Test
    @DisplayName("SuscripcionBillingService.aplicarCancelacion: sin suscripción → sin el id de la empresa")
    void cancelacionSinSuscripcion() {
        SuscripcionRepository subs = mock(SuscripcionRepository.class);
        when(subs.findActivaByEmpresaId(anyLong())).thenReturn(Optional.empty());
        Throwable t = catchThrowable(() -> billing(null, subs, null).aplicarCancelacion(737373L, true));
        assertThat(alCliente(t)).isEqualTo("Suscripción activa no encontrada");
        assertThat(t.getMessage()).doesNotContain("737373");
        assertThat(logs()).contains("empresaId=737373");
    }

    // ── La excepción ──────────────────────────────────────────────────────────

    @Test
    @DisplayName("(entidad, id): un id de texto (correo, token) no entra al mensaje; uno numérico sí, como antes")
    void constructorEntidadId() {
        assertThat(new RecursoNoEncontradoException("Admin", CORREO).getMessage()).isEqualTo("Admin no encontrado");
        assertThat(new RecursoNoEncontradoException("Empresa de la sesión QR", "tok_secreto_123").getMessage())
            .isEqualTo("Empresa de la sesión QR no encontrado");
        assertThat(new RecursoNoEncontradoException("Producto", 8L).getMessage()).isEqualTo("Producto no encontrado: 8");
    }

    @Test
    @DisplayName("enmascarar: solo los últimos 4 caracteres y sin saltos de línea (no inyecta líneas al log)")
    void enmascarar() {
        assertThat(RecursoNoEncontradoException.enmascarar(NUMERO_PEDIDO)).isEqualTo("***1234");
        assertThat(RecursoNoEncontradoException.enmascarar("ab")).isEqualTo("***");
        assertThat(RecursoNoEncontradoException.enmascarar(null)).isEqualTo("***");
        assertThat(RecursoNoEncontradoException.enmascarar("xxxx\nFAKE\r\n")).doesNotContain("\n").doesNotContain("\r");
    }

    // ── Guarda sobre todo src/main/java ───────────────────────────────────────

    private static final Pattern CONCATENA = Pattern.compile(
        "new\\s+(?:java\\.util\\.)?(?:RecursoNoEncontradoException|NoSuchElementException)\\(\\s*(?:\"[^\"\\n]*\"\\s*\\+|[A-Za-z_][\\w.()]*\\s*\\+|String\\.format|\"[^\"\\n]*\"\\.formatted)");

    @Test
    @DisplayName("Guarda: ningún 404 de src/main/java arma el mensaje concatenando datos (usar conDetalle)")
    void ningunaConcatenacion() throws IOException {
        List<String> hallazgos = new ArrayList<>();
        try (Stream<Path> files = Files.walk(Path.of("src/main/java"))) {
            for (Path p : (Iterable<Path>) files.filter(f -> f.toString().endsWith(".java"))::iterator) {
                String src = Files.readString(p);
                var m = CONCATENA.matcher(src);
                while (m.find()) {
                    int linea = src.substring(0, m.start()).split("\n", -1).length;
                    hallazgos.add(p + ":" + linea);
                }
            }
        }
        assertThat(hallazgos).as("404 con datos concatenados en el mensaje").isEmpty();
    }
}
