package com.hotclick.agente.motor;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.EnumMap;
import java.util.Map;

/**
 * Configuración del motor: modelo y esfuerzo por perfil, tono y topes. Todo por propiedades
 * ({@code agente.*}); sin secretos.
 *
 * <p>Haiku 5.5 / Sonnet 5.5: no se envían {@code temperature}, {@code top_p} ni {@code budget_tokens} (la API los
 * rechaza). El pensamiento es adaptativo por defecto; se controla con {@code output_config.effort}.
 */
@Component
public class ConfigMotorAgente {

    private final Map<PerfilAgente, String> modelos = new EnumMap<>(PerfilAgente.class);
    private final Map<PerfilAgente, String> esfuerzos = new EnumMap<>(PerfilAgente.class);
    private final TonoAgente tono;
    private final int maxIteraciones;
    private final int maxTokens;
    private final long presupuestoMs;
    private final int maxTurnosHistorial;

    public ConfigMotorAgente(
            @Value("${agente.modelo.ventas:claude-haiku-5-5}") String modeloVentas,
            @Value("${agente.modelo.interno:claude-sonnet-5-5}") String modeloInterno,
            @Value("${agente.modelo.hotclick:claude-haiku-5-5}") String modeloHotclick,
            @Value("${agente.modelo.asesor-web:claude-haiku-5-5}") String modeloAsesorWeb,
            @Value("${agente.effort.ventas:low}") String esfuerzoVentas,
            @Value("${agente.effort.interno:medium}") String esfuerzoInterno,
            @Value("${agente.effort.hotclick:low}") String esfuerzoHotclick,
            @Value("${agente.effort.asesor-web:low}") String esfuerzoAsesorWeb,
            @Value("${agente.tono.nombre:el asistente virtual}") String nombreBot,
            @Value("${agente.tono.trato:USTED}") String trato,
            @Value("${agente.tono.emojis:false}") boolean emojis,
            @Value("${agente.motor.max-iteraciones:5}") int maxIteraciones,
            @Value("${agente.motor.max-tokens:2048}") int maxTokens,
            @Value("${agente.motor.presupuesto-ms:40000}") long presupuestoMs,
            @Value("${agente.motor.max-turnos-historial:20}") int maxTurnosHistorial) {
        modelos.put(PerfilAgente.NEGOCIO_VENTAS, modeloVentas);
        modelos.put(PerfilAgente.NEGOCIO_INTERNO, modeloInterno);
        modelos.put(PerfilAgente.HOTCLICK, modeloHotclick);
        modelos.put(PerfilAgente.ASESOR_WEB, modeloAsesorWeb);
        esfuerzos.put(PerfilAgente.NEGOCIO_VENTAS, esfuerzoVentas);
        esfuerzos.put(PerfilAgente.NEGOCIO_INTERNO, esfuerzoInterno);
        esfuerzos.put(PerfilAgente.HOTCLICK, esfuerzoHotclick);
        esfuerzos.put(PerfilAgente.ASESOR_WEB, esfuerzoAsesorWeb);
        TonoAgente.Trato t = "TUTEO".equalsIgnoreCase(trato == null ? "" : trato.trim())
            ? TonoAgente.Trato.TUTEO : TonoAgente.Trato.USTED;
        this.tono = new TonoAgente(nombreBot, t, emojis);
        this.maxIteraciones = Math.max(1, maxIteraciones);
        this.maxTokens = Math.max(256, maxTokens);
        this.presupuestoMs = Math.max(1_000, presupuestoMs);
        this.maxTurnosHistorial = Math.max(1, maxTurnosHistorial);
    }

    /** Configuración con los defaults de producción (tests). */
    public static ConfigMotorAgente porDefecto() {
        return new ConfigMotorAgente("claude-haiku-5-5", "claude-sonnet-5-5", "claude-haiku-5-5", "claude-haiku-5-5",
            "low", "medium", "low", "low", "el asistente virtual", "USTED", false, 5, 2048, 40_000, 20);
    }

    public String modeloDe(PerfilAgente perfil) { return modelos.get(perfil); }

    public String esfuerzoDe(PerfilAgente perfil) { return esfuerzos.get(perfil); }

    public TonoAgente tono() { return tono; }

    public int maxIteraciones() { return maxIteraciones; }

    public int maxTokens() { return maxTokens; }

    public long presupuestoMs() { return presupuestoMs; }

    public int maxTurnosHistorial() { return maxTurnosHistorial; }
}
