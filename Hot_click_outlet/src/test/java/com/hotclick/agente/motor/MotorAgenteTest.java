package com.hotclick.agente.motor;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.dto.AccionPropuestaTelegram;
import com.hotclick.rag.dto.ProductoContexto;
import com.hotclick.rag.service.VectorSearchService;
import com.hotclick.service.TextModerationService;
import com.hotclick.service.ai.ClaudePrecios;
import com.hotclick.service.ai.ClaudeUsoRegistrador;
import com.hotclick.service.ai.UsoTokens;
import com.hotclick.service.copilot.AiCopilotToolExecutor;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@DisplayName("MotorAgente — bucle de tools con cliente HTTP mockeado")
class MotorAgenteTest {

    private static final ObjectMapper OM = new ObjectMapper();
    private static final Long EMPRESA = 7L;

    private ClienteClaude cliente;
    private VectorSearchService busqueda;
    private AiCopilotToolExecutor copilot;
    private ClaudeUsoRegistrador registrador;
    private MotorAgente motor;

    @BeforeEach
    void preparar() {
        cliente = mock(ClienteClaude.class);
        busqueda = mock(VectorSearchService.class);
        copilot = mock(AiCopilotToolExecutor.class);
        registrador = mock(ClaudeUsoRegistrador.class);
        when(copilot.buildTools(any(), anyBoolean(), anyBoolean())).thenReturn(List.of(
            Map.of("name", "consultar_ventas", "description", "ventas",
                "input_schema", Map.of("type", "object", "properties", Map.of()))));
        List<HerramientaAgente> herramientas = List.of(
            new BuscarProductosHerramienta(busqueda, OM), new PasarAPersonaHerramienta(),
            new HerramientasPendientes.CrearEnlaceCompra());
        RegistroHerramientas registro = new RegistroHerramientas(herramientas, copilot);
        motor = new MotorAgente(cliente, registro, ConfigMotorAgente.porDefecto(), new TextModerationService(),
            registrador, ClaudePrecios.actual(), OM);
    }

    private static ClienteClaude.RespuestaClaude respuesta(String stop, String contenidoJson, int in, int out) {
        return new ClienteClaude.RespuestaClaude(200, "{\"stop_reason\":\"" + stop + "\",\"content\":" + contenidoJson
            + ",\"usage\":{\"input_tokens\":" + in + ",\"output_tokens\":" + out + "}}");
    }

    private static String toolUse(String id, String nombre, String inputJson) {
        return "[{\"type\":\"thinking\",\"thinking\":\"\",\"signature\":\"sig\"},"
            + "{\"type\":\"tool_use\",\"id\":\"" + id + "\",\"name\":\"" + nombre + "\",\"input\":" + inputJson + "}]";
    }

    private static final String TEXTO_FINAL = "[{\"type\":\"text\",\"text\":\"Tenemos el bolso en ₡15000.\"}]";

    private ContextoHerramienta ventas() {
        return new ContextoHerramienta(EMPRESA, "50688888888", PerfilAgente.NEGOCIO_VENTAS, "Tienda Prueba");
    }

    private List<JsonNode> peticiones() throws Exception {
        ArgumentCaptor<String> c = ArgumentCaptor.forClass(String.class);
        verify(cliente, org.mockito.Mockito.atLeastOnce()).enviar(c.capture());
        List<JsonNode> r = new ArrayList<>();
        for (String s : c.getAllValues()) r.add(OM.readTree(s));
        return r;
    }

    @Test
    @DisplayName("Bucle tool_use: ejecuta buscar_productos, devuelve tool_result y responde con texto; suma tokens y registra costo")
    void bucleConToolUse() throws Exception {
        when(busqueda.buscarSimilares(eq(EMPRESA), eq("bolso"), anyInt(), eq(false))).thenReturn(List.of(
            new ProductoContexto(1L, "Bolso", "SKU1", 15000, "Bolso de cuero", null, 4, null, "Bolsos", null, null,
                false, null, null, null, null, null, null)));
        when(cliente.enviar(anyString())).thenReturn(
            respuesta("tool_use", toolUse("tu_1", "buscar_productos", "{\"consulta\":\"bolso\"}"), 1000, 50),
            respuesta("end_turn", TEXTO_FINAL, 1200, 30));

        ResultadoAgente r = motor.ejecutar(PerfilAgente.NEGOCIO_VENTAS, ventas(), List.of(), "Tienen bolsos?");

        assertThat(r.motivoFin()).isEqualTo(MotivoFin.COMPLETO);
        assertThat(r.texto()).contains("₡15000");
        assertThat(r.iteraciones()).isEqualTo(2);
        assertThat(r.tokensEntrada()).isEqualTo(2200);
        assertThat(r.tokensSalida()).isEqualTo(80);
        assertThat(r.costoUsd()).isGreaterThan(0.0);
        assertThat(r.modelo()).isEqualTo("claude-haiku-5-5");
        verify(registrador, times(2)).registrar(eq(EMPRESA), any(UsoTokens.class));

        List<JsonNode> reqs = peticiones();
        JsonNode segunda = reqs.get(1).path("messages");
        assertThat(segunda).hasSize(3); // user, assistant(tool_use + thinking), user(tool_result)
        assertThat(segunda.get(1).path("role").asText()).isEqualTo("assistant");
        assertThat(segunda.get(1).path("content").get(0).path("type").asText()).isEqualTo("thinking");
        JsonNode tr = segunda.get(2).path("content").get(0);
        assertThat(tr.path("type").asText()).isEqualTo("tool_result");
        assertThat(tr.path("tool_use_id").asText()).isEqualTo("tu_1");
        assertThat(tr.path("content").asText()).contains("Bolso").contains("15000");
    }

    @Test
    @DisplayName("Request: sin temperature/top_p/budget_tokens/prefill, tool_choice auto, strict, caché en system y tools, effort y modelo por perfil")
    void formaDelRequest() throws Exception {
        when(cliente.enviar(anyString())).thenReturn(respuesta("end_turn", TEXTO_FINAL, 10, 5));

        motor.ejecutar(PerfilAgente.NEGOCIO_VENTAS, ventas(),
            List.of(TurnoConversacion.asistente("Hola, soy el bot"), TurnoConversacion.usuario("hola"),
                TurnoConversacion.asistente("En qué le ayudo?")), "Quiero un bolso");

        JsonNode req = peticiones().get(0);
        assertThat(req.path("model").asText()).isEqualTo("claude-haiku-5-5");
        assertThat(req.has("temperature")).isFalse();
        assertThat(req.has("top_p")).isFalse();
        assertThat(req.has("thinking")).isFalse();
        assertThat(req.path("tool_choice").path("type").asText()).isEqualTo("auto");
        assertThat(req.path("output_config").path("effort").asText()).isEqualTo("low");
        assertThat(req.path("system").get(0).path("cache_control").path("type").asText()).isEqualTo("ephemeral");
        JsonNode tools = req.path("tools");
        assertThat(tools.get(tools.size() - 1).path("cache_control").path("type").asText()).isEqualTo("ephemeral");
        for (JsonNode t : tools) {
            assertThat(t.path("strict").asBoolean()).isTrue();
            assertThat(t.path("input_schema").path("additionalProperties").asBoolean(true)).isFalse();
        }
        JsonNode msgs = req.path("messages");
        assertThat(msgs.get(0).path("role").asText()).isEqualTo("user"); // se descartó el turno inicial del asistente
        assertThat(msgs.get(msgs.size() - 1).path("role").asText()).isEqualTo("user"); // sin prefill
        assertThat(msgs.get(msgs.size() - 1).path("content").asText()).isEqualTo("Quiero un bolso");
    }

    @Test
    @DisplayName("pasar_a_persona devuelve la señal PASAR_A_PERSONA en el resultado")
    void pasarAPersona() {
        when(cliente.enviar(anyString())).thenReturn(
            respuesta("tool_use", toolUse("tu_9", "pasar_a_persona", "{\"motivo\":\"reclamo por pedido\"}"), 100, 20),
            respuesta("end_turn", "[{\"type\":\"text\",\"text\":\"Le paso con una persona.\"}]", 150, 10));

        ResultadoAgente r = motor.ejecutar(PerfilAgente.NEGOCIO_VENTAS, ventas(), List.of(), "Quiero un reclamo");

        assertThat(r.pasarAPersona()).isTrue();
        assertThat(r.acciones()).hasSize(1);
        assertThat(r.acciones().get(0).dato()).isEqualTo("reclamo por pedido");
        assertThat(r.motivoFin()).isEqualTo(MotivoFin.COMPLETO);
        assertThat(r.texto()).isEqualTo("Le paso con una persona.");
    }

    @Test
    @DisplayName("refusal: no hay fallback de servidor; se deriva a una persona")
    void refusal() {
        when(cliente.enviar(anyString())).thenReturn(new ClienteClaude.RespuestaClaude(200,
            "{\"stop_reason\":\"refusal\",\"stop_details\":{\"type\":\"refusal\",\"category\":\"cyber\"},"
                + "\"content\":[],\"usage\":{\"input_tokens\":10,\"output_tokens\":0}}"));

        ResultadoAgente r = motor.ejecutar(PerfilAgente.NEGOCIO_VENTAS, ventas(), List.of(), "hola");

        assertThat(r.motivoFin()).isEqualTo(MotivoFin.REFUSAL);
        assertThat(r.pasarAPersona()).isTrue();
        assertThat(r.texto()).isNotBlank();
        verify(cliente, times(1)).enviar(anyString());
    }

    @Test
    @DisplayName("max_tokens: no ejecuta herramientas ni envía texto cortado; deriva")
    void maxTokens() {
        when(cliente.enviar(anyString())).thenReturn(respuesta("max_tokens",
            "[{\"type\":\"text\",\"text\":\"Tenemos varios bol\"}]", 10, 2048));

        ResultadoAgente r = motor.ejecutar(PerfilAgente.NEGOCIO_VENTAS, ventas(), List.of(), "hola");

        assertThat(r.motivoFin()).isEqualTo(MotivoFin.MAX_TOKENS);
        assertThat(r.pasarAPersona()).isTrue();
        assertThat(r.texto()).doesNotContain("bol");
    }

    @Test
    @DisplayName("Tope de iteraciones: tras N vueltas de tool_use deriva y no sigue llamando")
    void topeIteraciones() {
        when(busqueda.buscarSimilares(any(), anyString(), anyInt(), anyBoolean())).thenReturn(List.of());
        when(cliente.enviar(anyString())).thenReturn(
            respuesta("tool_use", toolUse("tu_x", "buscar_productos", "{\"consulta\":\"x\"}"), 10, 5));

        ResultadoAgente r = motor.ejecutar(PerfilAgente.NEGOCIO_VENTAS, ventas(), List.of(), "hola");

        assertThat(r.motivoFin()).isEqualTo(MotivoFin.TOPE_ITERACIONES);
        assertThat(r.iteraciones()).isEqualTo(5);
        assertThat(r.pasarAPersona()).isTrue();
        verify(cliente, times(5)).enviar(anyString());
    }

    @Test
    @DisplayName("Un perfil de ventas no ve ni puede ejecutar tools internas del copilot")
    void toolsFiltradasPorPerfil() throws Exception {
        when(cliente.enviar(anyString())).thenReturn(
            respuesta("tool_use", toolUse("tu_2", "consultar_ventas", "{}"), 10, 5),
            respuesta("end_turn", TEXTO_FINAL, 10, 5));

        motor.ejecutar(PerfilAgente.NEGOCIO_VENTAS, ventas(), List.of(), "cuanto vendieron hoy");

        List<JsonNode> reqs = peticiones();
        List<String> nombres = new ArrayList<>();
        reqs.get(0).path("tools").forEach(t -> nombres.add(t.path("name").asText()));
        assertThat(nombres).containsExactly("buscar_productos", "pasar_a_persona"); // sin stubs ni copilot
        JsonNode tr = reqs.get(1).path("messages").get(2).path("content").get(0);
        assertThat(tr.path("is_error").asBoolean()).isTrue();
        verify(copilot, never()).ejecutarTool(any(), anyString(), any(), any(AccionPropuestaTelegram[].class), anyBoolean());
    }

    @Test
    @DisplayName("NEGOCIO_INTERNO sí ve y ejecuta las tools del copilot, siempre en solo lectura")
    void internoUsaCopilot() throws Exception {
        when(copilot.ejecutarTool(eq(EMPRESA), eq("consultar_ventas"), any(), any(AccionPropuestaTelegram[].class), eq(false)))
            .thenReturn("Ventas hoy: 3");
        when(cliente.enviar(anyString())).thenReturn(
            respuesta("tool_use", toolUse("tu_3", "consultar_ventas", "{}"), 10, 5),
            respuesta("end_turn", TEXTO_FINAL, 10, 5));

        ResultadoAgente r = motor.ejecutar(PerfilAgente.NEGOCIO_INTERNO,
            new ContextoHerramienta(EMPRESA, "50670000000", PerfilAgente.NEGOCIO_INTERNO), List.of(), "ventas de hoy");

        assertThat(r.modelo()).isEqualTo("claude-sonnet-5-5");
        assertThat(r.motivoFin()).isEqualTo(MotivoFin.COMPLETO);
        JsonNode req = peticiones().get(0);
        assertThat(req.path("output_config").path("effort").asText()).isEqualTo("medium");
        verify(copilot).ejecutarTool(eq(EMPRESA), eq("consultar_ventas"), any(), any(AccionPropuestaTelegram[].class), eq(false));
    }

    @Test
    @DisplayName("Input que no es un objeto JSON se rechaza como is_error sin ejecutar la herramienta")
    void inputInvalido() throws Exception {
        when(cliente.enviar(anyString())).thenReturn(
            respuesta("tool_use", toolUse("tu_4", "buscar_productos", "\"bolso\""), 10, 5),
            respuesta("end_turn", TEXTO_FINAL, 10, 5));

        motor.ejecutar(PerfilAgente.NEGOCIO_VENTAS, ventas(), List.of(), "bolso");

        JsonNode tr = peticiones().get(1).path("messages").get(2).path("content").get(0);
        assertThat(tr.path("is_error").asBoolean()).isTrue();
        verifyNoInteractions(busqueda);
    }

    @Test
    @DisplayName("Moderación: tarjeta y contenido bloqueado no llegan a Claude")
    void moderacionPrevia() {
        ResultadoAgente tarjeta = motor.ejecutar(PerfilAgente.NEGOCIO_VENTAS, ventas(), List.of(),
            "mi tarjeta es 4111 1111 1111 1111");
        assertThat(tarjeta.motivoFin()).isEqualTo(MotivoFin.MODERACION);
        assertThat(tarjeta.texto()).contains("tarjeta");
        verifyNoInteractions(cliente);
    }

    @Test
    @DisplayName("Falla del proveedor (circuit breaker, timeout): deriva a una persona")
    void falloProveedor() {
        when(cliente.enviar(anyString())).thenThrow(new RuntimeException("circuit abierto"));

        ResultadoAgente r = motor.ejecutar(PerfilAgente.NEGOCIO_VENTAS, ventas(), List.of(), "hola");

        assertThat(r.motivoFin()).isEqualTo(MotivoFin.ERROR_PROVEEDOR);
        assertThat(r.pasarAPersona()).isTrue();
    }

    @Test
    @DisplayName("El contexto debe corresponder al perfil y los perfiles de empresa exigen empresaId")
    void validaciones() {
        assertThatThrownBy(() -> new ContextoHerramienta(null, "x", PerfilAgente.NEGOCIO_VENTAS))
            .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> motor.ejecutar(PerfilAgente.HOTCLICK, ventas(), List.of(), "hola"))
            .isInstanceOf(IllegalArgumentException.class);
        // HOTCLICK no necesita empresa
        assertThat(new ContextoHerramienta(null, "x", PerfilAgente.HOTCLICK).esMarketplace()).isTrue();
    }

    @Test
    @DisplayName("Costo: Haiku 5.5 a 0.10/0.50 y Sonnet 5.5 a 2/10 por MTok")
    void costoPorModelo() {
        ClaudePrecios p = ClaudePrecios.actual();
        assertThat(p.paraModelo("claude-haiku-5-5").costoUsd(1_000_000, 1_000_000)).isEqualTo(0.60, org.assertj.core.data.Offset.offset(1e-9));
        assertThat(p.paraModelo("claude-sonnet-5-5").costoUsd(1_000_000, 1_000_000, 1_000_000, 0))
            .isEqualTo(12.10, org.assertj.core.data.Offset.offset(1e-9));
        assertThat(p.paraModelo("claude-sonnet-4-6").inputPorM()).isEqualTo(3.00);
    }
}
