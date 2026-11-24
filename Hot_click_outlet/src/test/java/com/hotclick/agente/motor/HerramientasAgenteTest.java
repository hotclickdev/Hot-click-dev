package com.hotclick.agente.motor;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.rag.dto.ProductoContexto;
import com.hotclick.rag.service.VectorSearchService;
import com.hotclick.service.copilot.AiCopilotToolExecutor;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@DisplayName("Herramientas del motor: alcance, registro y perfiles")
class HerramientasAgenteTest {

    private static final ObjectMapper OM = new ObjectMapper();

    private static JsonNode json(String s) throws Exception {
        return OM.readTree(s);
    }

    private static ProductoContexto producto(String negocio) {
        return new ProductoContexto(1L, "Bolso", "S", 15000, "d", null, 3, null, "Bolsos", null, null,
            false, null, null, null, null, null, null, negocio, "slug-" + negocio);
    }

    @Test
    @DisplayName("buscar_productos con perfil de empresa busca SOLO en la empresa del contexto, nunca en marketplace")
    void alcanceEmpresa() throws Exception {
        VectorSearchService vs = mock(VectorSearchService.class);
        when(vs.buscarSimilares(any(), anyString(), anyInt(), anyBoolean())).thenReturn(List.of(producto("X")));
        BuscarProductosHerramienta h = new BuscarProductosHerramienta(vs, OM);

        ResultadoHerramienta r = h.ejecutar(new ContextoHerramienta(42L, "506", PerfilAgente.NEGOCIO_VENTAS),
            // el modelo intenta colar otra empresa: el schema no la admite y el código la ignora
            json("{\"consulta\":\"bolso\",\"limite\":99,\"empresaId\":999}"));

        verify(vs).buscarSimilares(eq(42L), eq("bolso"), eq(BuscarProductosHerramienta.LIMITE_MAXIMO), eq(false));
        assertThat(r.esError()).isFalse();
        assertThat(r.contenido()).doesNotContain("negocio"); // el nombre de otros negocios solo en marketplace
    }

    @Test
    @DisplayName("buscar_productos con HOTCLICK usa marketplace (sin empresa) e incluye el negocio vendedor")
    void alcanceMarketplace() throws Exception {
        VectorSearchService vs = mock(VectorSearchService.class);
        when(vs.buscarSimilares(any(), anyString(), anyInt(), anyBoolean())).thenReturn(List.of(producto("Tienda A")));
        BuscarProductosHerramienta h = new BuscarProductosHerramienta(vs, OM);

        ResultadoHerramienta r = h.ejecutar(new ContextoHerramienta(42L, "506", PerfilAgente.HOTCLICK),
            json("{\"consulta\":\"bolso\"}"));

        verify(vs).buscarSimilares(eq(null), eq("bolso"), eq(BuscarProductosHerramienta.LIMITE_DEFECTO), eq(true));
        assertThat(r.contenido()).contains("Tienda A");
    }

    @Test
    @DisplayName("ASESOR_WEB: empresa si hay empresaId, marketplace si no")
    void alcanceAsesorWeb() throws Exception {
        VectorSearchService vs = mock(VectorSearchService.class);
        when(vs.buscarSimilares(any(), anyString(), anyInt(), anyBoolean())).thenReturn(List.of());
        BuscarProductosHerramienta h = new BuscarProductosHerramienta(vs, OM);

        h.ejecutar(new ContextoHerramienta(5L, "w", PerfilAgente.ASESOR_WEB), json("{\"consulta\":\"a\"}"));
        verify(vs).buscarSimilares(eq(5L), eq("a"), anyInt(), eq(false));
        h.ejecutar(new ContextoHerramienta(null, "w", PerfilAgente.ASESOR_WEB), json("{\"consulta\":\"b\"}"));
        verify(vs).buscarSimilares(eq(null), eq("b"), anyInt(), eq(true));
    }

    @Test
    @DisplayName("buscar_productos rechaza consulta vacía sin buscar")
    void consultaVacia() throws Exception {
        VectorSearchService vs = mock(VectorSearchService.class);
        ResultadoHerramienta r = new BuscarProductosHerramienta(vs, OM)
            .ejecutar(new ContextoHerramienta(1L, "x", PerfilAgente.NEGOCIO_VENTAS), json("{\"consulta\":\"  \"}"));
        assertThat(r.esError()).isTrue();
    }

    @Test
    @DisplayName("El registro nunca expone stubs, mutaciones ni finanzas, y un real reemplaza al stub")
    void registro() {
        AiCopilotToolExecutor copilot = mock(AiCopilotToolExecutor.class);
        when(copilot.buildTools(any(), anyBoolean(), anyBoolean())).thenReturn(List.of(
            Map.of("name", "consultar_inventario", "description", "d", "input_schema", Map.of("type", "object")),
            Map.of("name", "proponer_ajustar_stock", "description", "d", "input_schema", Map.of("type", "object"))));
        HerramientaAgente real = new HerramientaAgente() {
            public String nombre() { return "crear_enlace_compra"; }
            public String descripcion() { return "real"; }
            public Map<String, Object> inputSchema() { return EsquemasAgente.objeto(Map.of(), List.of()); }
            public ResultadoHerramienta ejecutar(ContextoHerramienta c, JsonNode i) { return ResultadoHerramienta.ok("ok"); }
        };
        RegistroHerramientas sinReal = new RegistroHerramientas(
            List.of(new PasarAPersonaHerramienta(), new HerramientasPendientes.CrearEnlaceCompra()), copilot);
        assertThat(sinReal.paraPerfil(PerfilAgente.NEGOCIO_VENTAS)).extracting(HerramientaAgente::nombre)
            .containsExactly("pasar_a_persona");
        assertThat(sinReal.paraPerfil(PerfilAgente.NEGOCIO_INTERNO)).extracting(HerramientaAgente::nombre)
            .containsExactly("consultar_inventario", "pasar_a_persona"); // proponer_* fuera de la lista del perfil
        assertThat(sinReal.permitida(PerfilAgente.NEGOCIO_INTERNO, "proponer_ajustar_stock")).isEmpty();
        assertThat(sinReal.permitida(PerfilAgente.NEGOCIO_VENTAS, "consultar_inventario")).isEmpty();

        RegistroHerramientas conReal = new RegistroHerramientas(
            List.of(new HerramientasPendientes.CrearEnlaceCompra(), real), copilot);
        assertThat(conReal.permitida(PerfilAgente.NEGOCIO_VENTAS, "crear_enlace_compra")).isPresent();
    }

    @Test
    @DisplayName("Listas de tools por perfil: ventas sin internas, interno sin crear_enlace, HOTCLICK con planes y lead")
    void listasPorPerfil() {
        assertThat(PerfilAgente.NEGOCIO_VENTAS.herramientas()).doesNotContain("consultar_ventas", "consultar_inventario");
        // AG-20: el interno suma finanzas y proponer_* (con PIN, rol y confirmación en agente.interno).
        assertThat(PerfilAgente.NEGOCIO_INTERNO.herramientas()).contains("consultar_ventas", "consultar_finanzas",
            "proponer_ajustar_stock").doesNotContain("crear_enlace_compra");
        assertThat(PerfilAgente.NEGOCIO_VENTAS.herramientas()).doesNotContain("consultar_finanzas", "proponer_ajustar_stock");
        assertThat(PerfilAgente.HOTCLICK.herramientas()).doesNotContain("consultar_finanzas", "proponer_ajustar_stock");
        assertThat(PerfilAgente.HOTCLICK.herramientas()).contains("explicar_planes", "registrar_lead");
        for (PerfilAgente p : PerfilAgente.values()) {
            assertThat(p.herramientas()).contains("pasar_a_persona");
        }
    }

    @Test
    @DisplayName("Prompts: tuteo vs usted, emojis, solo negocio y regla de no inventar")
    void prompts() {
        String usted = PerfilAgente.NEGOCIO_VENTAS.promptSistema(TonoAgente.POR_DEFECTO, "Tienda Z");
        String tuteo = PerfilAgente.NEGOCIO_VENTAS.promptSistema(new TonoAgente("Hoti", TonoAgente.Trato.TUTEO, true), "Tienda Z");
        assertThat(usted).contains("Tienda Z").contains("de usted").contains("No use emojis")
            .contains("pasar_a_persona").contains("Nunca invente");
        assertThat(tuteo).contains("Hoti").contains("tuteo").contains("emoji con moderación");
        assertThat(PerfilAgente.HOTCLICK.promptSistema(null, null)).contains("HotClick").contains("explicar_planes");
    }

    @Test
    @DisplayName("Stubs pendientes no están disponibles y avisan la historia")
    void stubs() throws Exception {
        HerramientaAgente s = new HerramientasPendientes.ConsultarPedido();
        assertThat(s.disponible()).isFalse();
        assertThat(s.ejecutar(new ContextoHerramienta(1L, "x", PerfilAgente.NEGOCIO_VENTAS), json("{}")).contenido())
            .contains("AG-11");
    }
}
