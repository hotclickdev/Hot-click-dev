package com.hotclick.service.telegram;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.classic.spi.IThrowableProxy;
import ch.qos.logback.core.read.ListAppender;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.dto.AccionPropuestaTelegram;
import com.hotclick.dto.TelegramFlujoEstado;
import com.hotclick.model.Empresa;
import com.hotclick.model.Pedido;
import com.hotclick.model.TelegramVinculacion;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.service.AiCopilotService;
import com.hotclick.service.SupabaseStorageService;
import com.hotclick.service.TelegramClienteBotService;
import com.hotclick.service.TelegramFlujoService;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.util.ReflectionUtils;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * M1 de Seguridad sobre #386: la excepción que va a {@code log.error(msg, ex)} no puede arrastrar el mensaje
 * original ni el de sus causas (Hibernate/PostgreSQL: {@code Failing row contains (...)},
 * {@code Detail: Key (email)=(...)}) hacia logback ni Sentry. Se revisa el mensaje, el throwable y toda la cadena
 * de causas. Datos ficticios. Usa solo APIs que ya existían: el mismo test corre contra el código anterior.
 */
class TelegramLogsExcepcionSaneadaTest {

    static final long CHAT = 987654321L;
    static final String FILA = "FICT-0001";
    static final String CORREO = "ficticio@ejemplo.test";
    static final String MSJ_RAIZ = "Failing row contains (" + FILA + ", Joyeria Ficticia, hash-fict-no-real)";
    static final String MSJ_CAUSA = "Detail: Key (email)=(" + CORREO + ") already exists.";

    private ListAppender<ILoggingEvent> appender;
    private Logger raiz;
    private Level nivelOriginal;

    @BeforeEach
    void capturar() {
        raiz = (Logger) org.slf4j.LoggerFactory.getLogger("com.hotclick");
        nivelOriginal = raiz.getLevel();
        raiz.setLevel(Level.DEBUG);
        appender = new ListAppender<>();
        appender.start();
        raiz.addAppender(appender);
    }

    @AfterEach
    void soltar() {
        raiz.detachAppender(appender);
        raiz.setLevel(nivelOriginal);
    }

    /** Excepción tipo JPA: mensaje con datos de la fila y una causa (SQL) con el detalle de la clave. */
    private static RuntimeException excepcionConDatos() {
        return new IllegalStateException(MSJ_RAIZ,
            new IOException("ERROR: duplicate key value violates unique constraint",
                new IllegalArgumentException(MSJ_CAUSA)));
    }

    /** Todo lo que un appender real vería: línea formateada + clase y mensaje de cada eslabón de la cadena. */
    private String todoElLogConCadena() {
        StringBuilder sb = new StringBuilder();
        for (ILoggingEvent e : appender.list) {
            sb.append(e.getFormattedMessage()).append('\n');
            IThrowableProxy p = e.getThrowableProxy();
            for (int i = 0; p != null && i < 50; i++, p = p.getCause()) {
                sb.append(p.getClassName()).append(": ").append(p.getMessage()).append('\n');
                for (IThrowableProxy s : p.getSuppressed()) {
                    sb.append(s.getClassName()).append(": ").append(s.getMessage()).append('\n');
                }
            }
        }
        return sb.toString();
    }

    private ILoggingEvent errorConExcepcion() {
        return appender.list.stream().filter(e -> e.getLevel() == Level.ERROR && e.getThrowableProxy() != null)
            .findFirst().orElseThrow(() -> new AssertionError("no se registró ningún log.error con excepción"));
    }

    private void assertSinDatosEnLaCadena() {
        assertThat(todoElLogConCadena())
            .doesNotContain(FILA).doesNotContain(CORREO).doesNotContain("Failing row")
            .doesNotContain("Detail: Key").doesNotContain("hash-fict").doesNotContain("Joyeria")
            .doesNotContain(String.valueOf(CHAT));
        assertThat(errorConExcepcion().getThrowableProxy().getStackTraceElementProxyArray())
            .as("el stack trace se conserva para diagnosticar").isNotEmpty();
    }

    private static TelegramVinculacion vinculacion() {
        TelegramVinculacion v = new TelegramVinculacion();
        v.setChatId(CHAT);
        v.setEmpresaActivaId(9L);
        return v;
    }

    private static void set(Object target, String campo, Object valor) {
        if (ReflectionUtils.findField(target.getClass(), campo) != null) {
            ReflectionTestUtils.setField(target, campo, valor);
        }
    }

    @Test
    void confirmarAccion_conCadenaDeCausas_noFiltraNingunMensajeDeLaCadena() throws Exception {
        TelegramFlujoSupport support = mock(TelegramFlujoSupport.class);
        TelegramFlujoService flujo = mock(TelegramFlujoService.class);
        PedidoRepository pedidos = mock(PedidoRepository.class);
        ObjectMapper mapper = new ObjectMapper().findAndRegisterModules();
        TelegramFlujoAccionHandler h = new TelegramFlujoAccionHandler();
        set(h, "support", support);
        set(h, "flujo", flujo);
        set(h, "bot", mock(TelegramClienteBotService.class));
        set(h, "pedidoRepository", pedidos);
        set(h, "objectMapper", mapper);
        Empresa empresa = new Empresa();
        empresa.setId(9L);
        Pedido pedido = new Pedido();
        pedido.setEmpresa(empresa);
        when(pedidos.findById(33L)).thenReturn(Optional.of(pedido));
        when(support.ahora()).thenReturn(LocalDateTime.now(Constants.ZONA_CR));
        when(flujo.cambiarEstadoPedidoTx(anyLong(), any(), any())).thenThrow(excepcionConDatos());
        TelegramVinculacion v = vinculacion();
        v.setContexto(TelegramFlujoEstado.nuevaAccion(LocalDateTime.now(Constants.ZONA_CR),
            AccionPropuestaTelegram.PEDIDO_ESTADO, 33L, Map.of("nuevoEstado", "ENTREGADO"), "Resumen").serializar(mapper));

        h.callback(v, 9L, "ok");

        assertSinDatosEnLaCadena();
        assertThat(todoElLogConCadena()).as("sí queda la clase para diagnosticar").contains("IllegalStateException");
    }

    @Test
    void crossSell_conCadenaDeCausas_noFiltraNingunMensajeDeLaCadena() {
        AiCopilotService ia = mock(AiCopilotService.class);
        when(ia.crossSellCliente(anyLong(), anyLong())).thenThrow(excepcionConDatos());
        TelegramFlujoClientesHandler h = new TelegramFlujoClientesHandler();
        set(h, "aiCopilotService", ia);
        set(h, "bot", mock(TelegramClienteBotService.class));

        h.ejecutarCrossSell(CHAT, 9L, 5L);

        assertSinDatosEnLaCadena();
    }

    @Test
    void subirFoto_conCadenaDeCausas_noFiltraNingunMensajeDeLaCadena() throws Exception {
        TelegramClienteBotService bot = mock(TelegramClienteBotService.class);
        SupabaseStorageService storage = mock(SupabaseStorageService.class);
        when(bot.descargarArchivo(eq("file-fict"), anyLong())).thenReturn(new byte[] {1, 2, 3});
        when(storage.subirImagenDescargada(any(), anyString(), anyString(), anyString())).thenThrow(excepcionConDatos());
        TelegramFlujoProductoFotoHelper h = new TelegramFlujoProductoFotoHelper();
        set(h, "bot", bot);
        set(h, "storageService", storage);
        set(h, "support", mock(TelegramFlujoSupport.class));

        h.subirFotoAlBorrador(vinculacion(), TelegramFlujoEstado.nuevoProducto(LocalDateTime.now(Constants.ZONA_CR)), "file-fict");

        assertSinDatosEnLaCadena();
    }

    /** Guardia estática sobre los 7 sitios: ningún log.error del bot pasa un throwable crudo (e/ex) como último argumento. */
    @Test
    void ningunLogErrorDelBotPasaElThrowableCrudo() throws IOException {
        Path base = Path.of("src/main/java");
        Pattern llamadaLog = Pattern.compile("\\blog\\.(warn|error)\\((.*?)\\);", Pattern.DOTALL);
        Pattern throwableCrudo = Pattern.compile(",\\s*(e|ex|exception|t|throwable)\\s*$");
        List<String> infracciones = new java.util.ArrayList<>();
        try (Stream<Path> archivos = Files.walk(base)) {
            for (Path p : archivos.filter(f -> f.toString().contains("telegram") || f.getFileName().toString().matches("Telegram.*\\.java"))
                    .filter(f -> f.toString().endsWith(".java")).toList()) {
                Matcher m = llamadaLog.matcher(Files.readString(p));
                while (m.find()) {
                    String args = m.group(2).trim();
                    if (throwableCrudo.matcher(args).find()) {
                        infracciones.add(p.getFileName() + ": " + args.replaceAll("\\s+", " "));
                    }
                }
            }
        }
        assertThat(infracciones).as("log.error con throwable crudo: usar TelegramTexto.paraLog(Throwable)").isEmpty();
    }
}
