package com.hotclick.service.copilot;

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
        when(tenantService.tieneFeature(anyString())).thenReturn(false);
        List<String> nombres = nombres(defs.buildTools(1L, false));
        assertThat(nombres).contains("consultar_inventario", "consultar_ventas", "consultar_clientes",
            "reporte_negocio", "comparar_catalogo_publico", "proyeccion_negocio", "perfil_marca");
        assertThat(nombres).noneMatch(n -> n.startsWith("proponer_"));
    }

    @Test
    @DisplayName("puedeGestionar=true (Telegram dueño) sí expone proponer_*")
    void telegram_conHerramientasDeMutacion() {
        when(tenantService.tieneFeature(anyString())).thenReturn(false);
        List<String> nombres = nombres(defs.buildTools(1L, true));
        assertThat(nombres).contains(
            "proponer_cambiar_estado_pedido",
            "proponer_asignar_guia",
            "proponer_ajustar_stock",
            "proponer_aplicar_oferta");
    }

    private static List<String> nombres(List<Map<String, Object>> tools) {
        return tools.stream().map(t -> String.valueOf(t.get("name"))).toList();
    }
}
