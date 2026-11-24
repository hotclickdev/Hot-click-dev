package com.hotclick.agente.interno;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.agente.motor.ContextoHerramienta;
import com.hotclick.agente.motor.HerramientaAgente;
import com.hotclick.agente.motor.ResultadoHerramienta;
import com.hotclick.dto.AccionPropuestaTelegram;
import com.hotclick.model.Usuario;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.service.copilot.AiCopilotToolExecutor;
import com.hotclick.service.telegram.TelegramFlujoSupport;

import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Herramienta {@code proponer_*} del modo interno. NO ejecuta nada: valida con la misma lógica del copilot de
 * Telegram ({@link AiCopilotToolExecutor}, mismo nombre, schema y descripción) y deja la propuesta en espera de
 * confirmación del usuario ("SÍ") y, para ejecutar, de su PIN. Solo propietario o administrador.
 */
public class ProponerAccionInterna implements HerramientaAgente {

    static final Duration ESPERA_CONFIRMACION = Duration.ofMinutes(5);

    private final String nombre;
    private final String descripcion;
    private final Map<String, Object> schema;
    private final VinculacionInternaService vinculaciones;
    private final UsuarioRepository usuarios;
    private final TelegramFlujoSupport permisos;
    private final AiCopilotToolExecutor copilot;
    private final BitacoraAgente bitacora;
    private final ObjectMapper mapper;

    @SuppressWarnings("unchecked")
    public ProponerAccionInterna(Map<String, Object> definicionCopilot, VinculacionInternaService vinculaciones,
                                 UsuarioRepository usuarios, TelegramFlujoSupport permisos,
                                 AiCopilotToolExecutor copilot, BitacoraAgente bitacora, ObjectMapper mapper) {
        this.nombre = String.valueOf(definicionCopilot.get("name"));
        this.descripcion = definicionCopilot.get("description")
            + " La acción NO se aplica al llamarla: el sistema pide la confirmación al usuario.";
        Map<String, Object> original = (Map<String, Object>) definicionCopilot.get("input_schema");
        Map<String, Object> copia = new LinkedHashMap<>(original == null ? Map.of("type", "object") : original);
        copia.putIfAbsent("properties", Map.of());
        copia.putIfAbsent("required", List.of());
        copia.put("additionalProperties", false);
        this.schema = copia;
        this.vinculaciones = vinculaciones;
        this.usuarios = usuarios;
        this.permisos = permisos;
        this.copilot = copilot;
        this.bitacora = bitacora;
        this.mapper = mapper;
    }

    @Override public String nombre() { return nombre; }
    @Override public String descripcion() { return descripcion; }
    @Override public Map<String, Object> inputSchema() { return schema; }

    @Override
    public ResultadoHerramienta ejecutar(ContextoHerramienta contexto, JsonNode input) {
        Long empresaId = contexto.empresaId();
        Optional<AgenteVinculacion> opt = vinculaciones.vinculacionActiva(empresaId, contexto.contactoExterno());
        if (opt.isEmpty()) return ResultadoHerramienta.error("Este teléfono no está vinculado a un usuario del negocio.");
        AgenteVinculacion v = opt.get();
        Usuario u = usuarios.findById(v.getUsuarioId()).orElse(null);
        if (u == null || !permisos.esPropietarioOAdmin(u, empresaId)) {
            bitacora.registrar(empresaId, v.getUsuarioId(), nombre, AgenteAccion.RECHAZADA, null);
            return ResultadoHerramienta.error("Solo el propietario o un administrador puede hacer cambios desde este canal.");
        }
        AccionPropuestaTelegram[] holder = new AccionPropuestaTelegram[1];
        String texto = copilot.ejecutarTool(empresaId, nombre, input, holder, false);
        if (holder[0] == null) {
            // Faltan datos, hay varios candidatos, estado inválido… el texto lo explica al modelo.
            return ResultadoHerramienta.ok(texto == null ? "" : texto);
        }
        try {
            vinculaciones.guardarPendiente(v.getId(), AgenteVinculacion.PEND_CONFIRMAR,
                mapper.writeValueAsString(holder[0]), ESPERA_CONFIRMACION);
        } catch (JsonProcessingException e) {
            return ResultadoHerramienta.error("No se pudo preparar la confirmación.");
        }
        return ResultadoHerramienta.ok("Propuesta registrada. El sistema le mostrará el resumen al usuario y le pedirá "
            + "responder SÍ para confirmar. No digas que ya se aplicó ni repitas el resumen.");
    }
}
