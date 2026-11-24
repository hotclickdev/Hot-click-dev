package com.hotclick.agente.hotclick;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.agente.motor.ContextoHerramienta;
import com.hotclick.agente.motor.PerfilAgente;
import com.hotclick.agente.motor.ResultadoHerramienta;
import com.hotclick.agente.ventas.ConocimientoRepository;
import com.hotclick.agente.ventas.ConocimientoService;
import com.hotclick.model.Plan;
import com.hotclick.repository.PlanRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.SliceImpl;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@DisplayName("AG-26: explicar_planes lee la tabla y no inventa")
class ExplicarPlanesHerramientaTest {

    private static final ObjectMapper OM = new ObjectMapper();

    private PlanRepository planes;
    private ConocimientoService conocimiento;
    private ExplicarPlanesHerramienta tool;

    @BeforeEach
    void init() {
        planes = mock(PlanRepository.class);
        conocimiento = mock(ConocimientoService.class);
        tool = new ExplicarPlanesHerramienta(planes, conocimiento, OM);
        when(conocimiento.listar(null)).thenReturn(List.of());
        when(planes.findByActivoTrue(any(Pageable.class))).thenReturn(new SliceImpl<>(List.of(
            plan("EMPRENDEDOR", 0, "9.00", 50, 2, false, 0),
            plan("PYME", 12900, "7.50", 500, 5, true, 100),
            plan("NEGOCIO_PLUS", 28900, "6.00", -1, 10, true, -1),
            plan("DEMO_INTERNO", 1, "0", 1, 1, false, 0))));
    }

    private static Plan plan(String nombre, int precio, String comision, int maxProd, int maxUsr, boolean ai, int creditos) {
        Plan p = new Plan();
        p.setNombre(nombre);
        p.setPrecioMensual(precio);
        p.setComisionPorcentaje(new BigDecimal(comision));
        p.setMaxProductos(maxProd);
        p.setMaxUsuarios(maxUsr);
        p.setTieneAi(ai);
        p.setMaxCreditosAi(creditos);
        return p;
    }

    private JsonNode ejecutar(String input) throws Exception {
        ResultadoHerramienta r = tool.ejecutar(new ContextoHerramienta(null, "x", PerfilAgente.HOTCLICK), OM.readTree(input));
        assertThat(r.esError()).isFalse();
        return OM.readTree(r.contenido());
    }

    @Test
    @DisplayName("Devuelve solo los tres planes de vendedor con cifras de la tabla")
    void cifrasDeLaTabla() throws Exception {
        JsonNode r = ejecutar("{}");

        assertThat(r.path("planes")).hasSize(3);
        JsonNode pyme = r.path("planes").get(1);
        assertThat(pyme.path("plan").asText()).isEqualTo("PYME");
        assertThat(pyme.path("precioMensualColones").asInt()).isEqualTo(12900);
        assertThat(pyme.path("comisionPorVentaPorcentaje").decimalValue()).isEqualByComparingTo("7.50");
        assertThat(pyme.path("incluyeBot").asBoolean()).isTrue();
        assertThat(r.path("planes").get(0).path("incluyeBot").asBoolean()).isFalse();
        assertThat(r.path("planes").get(2).path("maxProductos").asText()).isEqualTo("ilimitado");
        assertThat(r.toString()).doesNotContain("DEMO_INTERNO");
    }

    @Test
    @DisplayName("Sin texto aprobado entrega el texto por defecto marcado PROVISIONAL")
    void textoProvisional() throws Exception {
        assertThat(ejecutar("{}").path("explicacion").asText()).contains("PROVISIONAL");
    }

    @Test
    @DisplayName("Con conocimiento PLANES activo del dueño, lo usa en vez del provisional")
    void textoAprobado() throws Exception {
        when(conocimiento.listar(null)).thenReturn(List.of(
            new ConocimientoRepository.Fila(1L, null, "Planes", "Texto oficial del dueño", "PLANES", true),
            new ConocimientoRepository.Fila(2L, null, "Otro", "No va", "ENVIOS", true),
            new ConocimientoRepository.Fila(3L, null, "Viejo", "Inactivo", "PLANES", false)));

        String e = ejecutar("{}").path("explicacion").asText();

        assertThat(e).contains("Texto oficial del dueño").doesNotContain("PROVISIONAL").doesNotContain("No va")
            .doesNotContain("Inactivo");
    }

    @Test
    @DisplayName("Filtra por plan y no inventa uno inexistente")
    void filtroYDesconocido() throws Exception {
        assertThat(ejecutar("{\"plan\":\"negocio plus\"}").path("planes")).hasSize(1);
        ResultadoHerramienta r = tool.ejecutar(new ContextoHerramienta(null, "x", PerfilAgente.HOTCLICK),
            OM.readTree("{\"plan\":\"Galáctico\"}"));
        assertThat(r.esError()).isTrue();
    }
}
