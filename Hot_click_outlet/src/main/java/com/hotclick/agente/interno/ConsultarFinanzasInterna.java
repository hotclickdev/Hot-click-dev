package com.hotclick.agente.interno;

import com.fasterxml.jackson.databind.JsonNode;
import com.hotclick.agente.motor.ContextoHerramienta;
import com.hotclick.agente.motor.HerramientaAgente;
import com.hotclick.agente.motor.ResultadoHerramienta;
import com.hotclick.dto.AccionPropuestaTelegram;
import com.hotclick.model.Usuario;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.service.copilot.AiCopilotToolExecutor;
import com.hotclick.service.telegram.TelegramFlujoSupport;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Finanzas por el canal interno: solo el PROPIETARIO (misma regla que Telegram y el copilot web), con el plan que
 * incluye reportes y con el PIN vigente (sesión de 15 min). Si falta el PIN deja una espera de PIN y el
 * respondedor se lo pide al usuario; el PIN nunca pasa por el modelo.
 */
@Component
public class ConsultarFinanzasInterna implements HerramientaAgente {

    static final String NOMBRE = "consultar_finanzas";
    static final Duration ESPERA_PIN = Duration.ofMinutes(5);

    private final VinculacionInternaService vinculaciones;
    private final UsuarioRepository usuarios;
    private final TelegramFlujoSupport permisos;
    private final AiCopilotToolExecutor copilot;
    private final BitacoraAgente bitacora;

    public ConsultarFinanzasInterna(VinculacionInternaService vinculaciones, UsuarioRepository usuarios,
                                    TelegramFlujoSupport permisos, AiCopilotToolExecutor copilot,
                                    BitacoraAgente bitacora) {
        this.vinculaciones = vinculaciones;
        this.usuarios = usuarios;
        this.permisos = permisos;
        this.copilot = copilot;
        this.bitacora = bitacora;
    }

    @Override public String nombre() { return NOMBRE; }

    @Override
    public String descripcion() {
        return "Consulta KPIs financieros del negocio para un período: ventas totales, costo de mercadería vendida, "
            + "ganancia neta, margen e IVA. Requiere el PIN del usuario; si falta, la herramienta lo indica y el "
            + "sistema lo pide. Usar si preguntan ganancia, margen, IVA o cómo van de plata.";
    }

    @Override
    public Map<String, Object> inputSchema() {
        Map<String, Object> periodo = new LinkedHashMap<>();
        periodo.put("type", "string");
        periodo.put("enum", List.of("hoy", "semana", "mes", "todo"));
        periodo.put("description", "Período a consultar; por defecto 'mes'");
        Map<String, Object> schema = new LinkedHashMap<>();
        schema.put("type", "object");
        schema.put("properties", Map.of("periodo", periodo));
        schema.put("required", List.of());
        schema.put("additionalProperties", false);
        return schema;
    }

    @Override
    public ResultadoHerramienta ejecutar(ContextoHerramienta contexto, JsonNode input) {
        Long empresaId = contexto.empresaId();
        Optional<AgenteVinculacion> opt = vinculaciones.vinculacionActiva(empresaId, contexto.contactoExterno());
        if (opt.isEmpty()) return ResultadoHerramienta.error("Este teléfono no está vinculado a un usuario del negocio.");
        AgenteVinculacion v = opt.get();
        Usuario u = usuarios.findById(v.getUsuarioId()).orElse(null);
        if (u == null || !permisos.esDueno(u, empresaId)) {
            bitacora.registrar(empresaId, v.getUsuarioId(), "CONSULTA_FINANZAS", AgenteAccion.RECHAZADA, null);
            return ResultadoHerramienta.error("Las finanzas del negocio solo las puede consultar el dueño.");
        }
        boolean planIncluye = copilot.buildTools(empresaId, false, true).stream()
            .anyMatch(t -> NOMBRE.equals(t.get("name")));
        if (!planIncluye) return ResultadoHerramienta.error("El plan del negocio no incluye finanzas por este canal.");
        if (v.getPinHash() == null)
            return ResultadoHerramienta.error("El usuario no tiene PIN. Debe definirlo en el panel (Configuración, bot interno).");
        if (!v.pinVigente(vinculaciones.ahora())) {
            vinculaciones.guardarPendiente(v.getId(), AgenteVinculacion.PEND_PIN_FINANZAS, null, ESPERA_PIN);
            return ResultadoHerramienta.error("Falta el PIN. El sistema se lo pedirá al usuario; no pidas ni repitas el PIN. "
                + "Dile que enviará el PIN y que luego repita la pregunta.");
        }
        String r = copilot.ejecutarTool(empresaId, NOMBRE, input, new AccionPropuestaTelegram[1], true);
        bitacora.registrar(empresaId, v.getUsuarioId(), "CONSULTA_FINANZAS", AgenteAccion.EJECUTADA, null);
        return ResultadoHerramienta.ok(r == null ? "" : r);
    }
}
