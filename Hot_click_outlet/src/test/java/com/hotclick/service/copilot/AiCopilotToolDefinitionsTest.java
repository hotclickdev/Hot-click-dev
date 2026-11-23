package com.hotclick.service.copilot;

import com.hotclick.model.Empresa;
import com.hotclick.service.TenantService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("Tools del copilot: panel web sin mutaciones")
class AiCopilotToolDefinitionsTest {

    @Mock AiCopilotContextBuilder contextBuilder;
    @Mock TenantService tenantService;
    @InjectMocks AiCopilotToolDefinitions defs;

    @AfterEach
    void clearTenant() {
        com.hotclick.security.TenantContext.clear();
    }

    @Test
    @DisplayName("puedeGestionar=false (panel) no expone proponer_*")
    void panel_sinHerramientasDeMutacion() {
        List<String> nombres = nombres(defs.buildTools(1L, false, false));
        assertThat(nombres).contains("consultar_inventario", "consultar_ventas", "consultar_clientes",
            "reporte_negocio", "comparar_catalogo_publico", "proyeccion_negocio", "perfil_marca");
        assertThat(nombres).noneMatch(n -> n.startsWith("proponer_"));
    }

    @Test
    @DisplayName("puedeGestionar=true (Telegram dueño) sí expone proponer_*")
    void telegram_conHerramientasDeMutacion() {
        List<String> nombres = nombres(defs.buildTools(1L, true, false));
        assertThat(nombres).contains(
            "proponer_cambiar_estado_pedido",
            "proponer_asignar_guia",
            "proponer_ajustar_stock",
            "proponer_aplicar_oferta");
    }

    @Test
    @DisplayName("consultar_finanzas: solo con esDueno (un LECTOR o un ADMIN que gestiona no la ven), aunque el plan tenga reportes")
    void finanzasSoloParaElDueno() {
        when(tenantService.tieneFeature(anyString())).thenReturn(true);
        assertThat(nombres(defs.buildTools(1L, false, false))).doesNotContain("consultar_finanzas"); // LECTOR
        assertThat(nombres(defs.buildTools(1L, true, false))).doesNotContain("consultar_finanzas");  // ADMIN
        assertThat(nombres(defs.buildTools(1L, true, true))).contains("consultar_finanzas");         // dueño
    }

    @Test
    @DisplayName("consultar_finanzas: el dueño sin el feature «reportes» del plan tampoco la ve")
    void finanzasExigeTambienElFeature() {
        when(tenantService.tieneFeature(anyString())).thenReturn(false);
        assertThat(nombres(defs.buildTools(1L, true, true))).doesNotContain("consultar_finanzas");
    }

    @Test
    @DisplayName("System prompt: solo el dueño (con plan de reportes) ve consultar_finanzas; LECTOR y ex-miembro no")
    void promptFinanzasSoloParaElDueno() {
        when(tenantService.tieneFeature(anyString())).thenReturn(true);
        String dueno = defs.buildSystemPromptConTools(1L, new Empresa(), null, false, true);
        assertThat(dueno).contains("consultar_finanzas").contains("finanzas");
        // LECTOR y ex-miembro: el controller calcula esDueno=false (ver AiCopilotRolResolverTest)
        String lector = defs.buildSystemPromptConTools(1L, new Empresa(), null, false, false);
        assertThat(lector).doesNotContain("consultar_finanzas").doesNotContain("llamá consultar")
            .doesNotContain("finanzas");
        String admin = defs.buildSystemPromptConTools(1L, new Empresa(), null, true, false);
        assertThat(admin).doesNotContain("consultar_finanzas").doesNotContain("finanzas");
    }

    @Test
    @DisplayName("System prompt: el dueño sin feature «reportes» tampoco ve consultar_finanzas")
    void promptDuenoSinFeature() {
        when(tenantService.tieneFeature(anyString())).thenReturn(false);
        assertThat(defs.buildSystemPromptConTools(1L, new Empresa(), null, false, true))
            .doesNotContain("consultar_finanzas");
    }

    private static List<String> nombres(List<Map<String, Object>> tools) {
        return tools.stream().map(t -> String.valueOf(t.get("name"))).toList();
    }
}
