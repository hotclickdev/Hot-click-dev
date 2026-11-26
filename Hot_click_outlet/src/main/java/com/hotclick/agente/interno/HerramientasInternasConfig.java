package com.hotclick.agente.interno;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.agente.motor.HerramientaAgente;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.service.copilot.AiCopilotToolExecutor;
import com.hotclick.service.telegram.TelegramFlujoSupport;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Map;

/** Registra como herramientas del motor las cuatro {@code proponer_*} del copilot (con confirmación y PIN). */
@Configuration
public class HerramientasInternasConfig {

    private final AiCopilotToolExecutor copilot;
    private final VinculacionInternaService vinculaciones;
    private final UsuarioRepository usuarios;
    private final TelegramFlujoSupport permisos;
    private final BitacoraAgente bitacora;
    private final ObjectMapper mapper;

    public HerramientasInternasConfig(AiCopilotToolExecutor copilot, VinculacionInternaService vinculaciones,
                                      UsuarioRepository usuarios, TelegramFlujoSupport permisos,
                                      BitacoraAgente bitacora, ObjectMapper mapper) {
        this.copilot = copilot;
        this.vinculaciones = vinculaciones;
        this.usuarios = usuarios;
        this.permisos = permisos;
        this.bitacora = bitacora;
        this.mapper = mapper;
    }

    @Bean HerramientaAgente proponerCambiarEstadoPedidoInterna() { return crear("proponer_cambiar_estado_pedido"); }
    @Bean HerramientaAgente proponerAsignarGuiaInterna() { return crear("proponer_asignar_guia"); }
    @Bean HerramientaAgente proponerAjustarStockInterna() { return crear("proponer_ajustar_stock"); }
    @Bean HerramientaAgente proponerAplicarOfertaInterna() { return crear("proponer_aplicar_oferta"); }

    private HerramientaAgente crear(String nombre) {
        // puedeGestionar=true solo para leer la definición; la ejecución revalida el rol del usuario.
        Map<String, Object> def = copilot.buildTools(null, true, false).stream()
            .filter(d -> nombre.equals(String.valueOf(d.get("name"))))
            .findFirst()
            .orElseThrow(() -> new IllegalStateException("El copilot no define la herramienta " + nombre));
        return new ProponerAccionInterna(def, vinculaciones, usuarios, permisos, copilot, bitacora, mapper);
    }
}
