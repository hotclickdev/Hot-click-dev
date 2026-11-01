package com.hotclick.service;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.hotclick.config.GlobalExceptionHandler;
import com.hotclick.dto.VentaRequestDTO;
import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PlanRepository;
import com.hotclick.repository.SuscripcionRepository;
import com.hotclick.repository.TipoOtpRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.model.Empresa;
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

    // ── Guarda ampliada (LOWs): mensajes armados en variables e IAE/ISE que el handler devuelve al cliente ──────

    /** Texto del argumento (entre paréntesis balanceados) de la llamada que abre en {@code abre}, o null. */
    static String argumentos(String src, int abre) {
        int d = 0;
        boolean enTexto = false;
        char q = 0;
        for (int j = abre; j < src.length(); j++) {
            char c = src.charAt(j);
            if (enTexto) {
                if (c == '\\') j++;
                else if (c == q) enTexto = false;
            } else if (c == '"' || c == '\'') {
                enTexto = true;
                q = c;
            } else if (c == '(') {
                d++;
            } else if (c == ')' && --d == 0) {
                return src.substring(abre + 1, j);
            }
        }
        return null;
    }

    private static final Pattern NUEVO_404 = Pattern.compile(
        "new\\s+(?:java\\.util\\.)?(?:RecursoNoEncontradoException|NoSuchElementException)\\(");
    /** Primer argumento aceptado: un texto literal o una constante (MAYUSCULAS). Una variable puede traer datos. */
    private static final Pattern PRIMER_ARG_FIJO = Pattern.compile("^\\s*(?:\"(?:[^\"\\\\]|\\\\.)*\"|[A-Z][A-Z0-9_]*)\\s*(?:,|$)");

    /** 404 cuyo mensaje no es un literal ni una constante (p. ej. {@code String msg = "..." + x; new ...(msg)}). */
    static List<String> mensajeEnVariable(String src) {
        List<String> r = new ArrayList<>();
        var m = NUEVO_404.matcher(src);
        while (m.find()) {
            String a = argumentos(src, m.end() - 1);
            if (a == null || a.isBlank()) continue;
            if (!PRIMER_ARG_FIJO.matcher(a).find()) r.add(src.substring(0, m.start()).split("\n", -1).length + ": " + a.strip());
        }
        return r;
    }

    private static final Pattern NUEVO_IAE_ISE = Pattern.compile("new\\s+(?:IllegalArgumentException|IllegalStateException)\\(");
    private static final Pattern INTERPOLA = Pattern.compile("\\+|String\\.format|\\.formatted\\(");
    /** Datos de personas o de terceros que no deben salir en un texto al cliente. */
    private static final Pattern DATO_SENSIBLE = Pattern.compile(
        "(?i)correo|email|mail|telefono|celular|cedula|token|iban|sinpe|password|passwd|secret|numeroPedido|subscription|onvo\\w*id|customer|getMessage\\(\\)");
    /** Último argumento = la causa ({@code ..., e}): con causa el handler responde genérico y el texto va solo al log. */
    private static final Pattern TERMINA_EN_CAUSA = Pattern.compile(",\\s*[a-z]\\w*\\s*$");

    /** IAE/ISE que interpolan datos sensibles y que, sin causa, el handler devolvería tal cual al cliente. */
    static List<String> iaeIseConDatos(String src) {
        List<String> r = new ArrayList<>();
        var m = NUEVO_IAE_ISE.matcher(src);
        while (m.find()) {
            String a = argumentos(src, m.end() - 1);
            if (a == null || !INTERPOLA.matcher(a).find() || TERMINA_EN_CAUSA.matcher(a).find()) continue;
            String sinLiterales = a.replaceAll("\"(?:[^\"\\\\]|\\\\.)*\"", "\"\"");
            if (DATO_SENSIBLE.matcher(sinLiterales).find()) {
                r.add(src.substring(0, m.start()).split("\n", -1).length + ": " + a.strip().replaceAll("\\s+", " "));
            }
        }
        return r;
    }

    /**
     * Excepciones revisadas a mano: el texto viene de nuestra {@code ContenidoNoPermitidoException} (mensaje de
     * moderación pensado para mostrarse) más el nombre de la fila del CSV que cargó el propio vendedor.
     */
    private static final java.util.Set<String> IAE_ISE_REVISADAS = java.util.Set.of("InventarioPaqueteService.java");

    @Test
    @DisplayName("Guarda ampliada: detecta el mensaje armado en una variable (y acepta literales y constantes)")
    void detectaMensajeEnVariable() {
        assertThat(mensajeEnVariable("String m = \"Pedido \" + n;\nthrow new RecursoNoEncontradoException(m);")).hasSize(1);
        assertThat(mensajeEnVariable("x.orElseThrow(() -> new NoSuchElementException(mensaje))")).hasSize(1);
        assertThat(mensajeEnVariable("throw new RecursoNoEncontradoException(\"Producto no encontrado\");")).isEmpty();
        assertThat(mensajeEnVariable("throw new RecursoNoEncontradoException(MSG_CLIENTE);")).isEmpty();
        assertThat(mensajeEnVariable("throw new RecursoNoEncontradoException(\"Bodega\", id);")).isEmpty();
        assertThat(mensajeEnVariable("throw new NoSuchElementException();")).isEmpty();
    }

    @Test
    @DisplayName("Guarda ampliada: detecta IAE/ISE sin causa que interpolan correo, token, id de ONVO o getMessage()")
    void detectaIaeIseConDatos() {
        assertThat(iaeIseConDatos("throw new IllegalStateException(\"Sin registro para: \" + email);")).hasSize(1);
        assertThat(iaeIseConDatos("throw new IllegalArgumentException(\"URL inválida: \" + e.getMessage());")).hasSize(1);
        assertThat(iaeIseConDatos("throw new IllegalStateException(\"Sin fin para \" + onvoSubId);")).hasSize(1);
        assertThat(iaeIseConDatos("throw new IllegalStateException(String.format(PLANTILLA,\n  correoCliente));")).hasSize(1);
        // con causa → genérico para el cliente; sin datos sensibles → fuera de alcance
        assertThat(iaeIseConDatos("throw new IllegalStateException(\"Falló: \" + e.getMessage(), e);")).isEmpty();
        assertThat(iaeIseConDatos("throw new IllegalArgumentException(\"Máximo \" + MAX + \" imágenes\");")).isEmpty();
        assertThat(iaeIseConDatos("throw new IllegalArgumentException(\"No usa token en el texto\");")).isEmpty();
    }

    @Test
    @DisplayName("Guarda ampliada: en src/main/java ningún 404 arma el mensaje en una variable ni IAE/ISE devuelve datos sensibles")
    void guardaAmpliadaSobreElCodigo() throws IOException {
        List<String> variables = new ArrayList<>();
        List<String> iaeIse = new ArrayList<>();
        try (Stream<Path> files = Files.walk(Path.of("src/main/java"))) {
            for (Path p : (Iterable<Path>) files.filter(f -> f.toString().endsWith(".java"))::iterator) {
                String src = Files.readString(p);
                boolean esLaClase = p.getFileName().toString().equals("RecursoNoEncontradoException.java");
                if (!esLaClase) mensajeEnVariable(src).forEach(h -> variables.add(p + ":" + h));
                if (!IAE_ISE_REVISADAS.contains(p.getFileName().toString())) {
                    iaeIseConDatos(src).forEach(h -> iaeIse.add(p + ":" + h));
                }
            }
        }
        assertThat(variables).as("404 con el mensaje en una variable (usar un literal o conDetalle)").isEmpty();
        assertThat(iaeIse).as("IAE/ISE sin causa con datos sensibles en el texto (el handler los devuelve al cliente)").isEmpty();
    }
}
