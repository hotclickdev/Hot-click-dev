package com.hotclick.agente.motor;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * {@code pasar_a_persona}: no ejecuta nada por sí sola; devuelve la señal {@link AccionAgente.Tipo#PASAR_A_PERSONA}
 * en el resultado del motor para que el canal derive la conversación a una persona.
 */
@Component
public class PasarAPersonaHerramienta implements HerramientaAgente {
    private static final String MOTIVO = "motivo";


    static final int MOTIVO_MAX = 300;

    @Override public String nombre() { return "pasar_a_persona"; }

    @Override
    public String descripcion() {
        return "Deriva la conversación a una persona del equipo. Úsela cuando no sepa la respuesta, falte un dato, "
            + "haya un reclamo o la persona pida hablar con alguien.";
    }

    @Override
    public Map<String, Object> inputSchema() {
        return EsquemasAgente.objeto(
            Map.of(MOTIVO, EsquemasAgente.texto("Motivo breve de la derivación, para quien tome la conversación")),
            List.of(MOTIVO));
    }

    @Override
    public ResultadoHerramienta ejecutar(ContextoHerramienta contexto, JsonNode input) {
        String motivo = input.path(MOTIVO).asText("").trim();
        if (motivo.length() > MOTIVO_MAX) motivo = motivo.substring(0, MOTIVO_MAX);
        return ResultadoHerramienta.conAccion(
            "Listo: el equipo fue avisado y una persona continuará la conversación. Despídase en una frase corta.",
            AccionAgente.pasarAPersona(motivo));
    }
}
