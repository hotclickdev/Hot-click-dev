package com.hotclick.agente.ventas;

import com.fasterxml.jackson.databind.JsonNode;
import com.hotclick.agente.motor.ContextoHerramienta;
import com.hotclick.agente.motor.HerramientaAgente;
import com.hotclick.agente.motor.ResultadoHerramienta;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * {@code consultar_conocimiento}: busca en el conocimiento de la empresa de la conversación (o el de HotClick si
 * la conversación no tiene empresa). La empresa sale del contexto, jamás del input del modelo.
 */
@Component
public class ConsultarConocimientoHerramienta implements HerramientaAgente {

    private final ConocimientoService conocimiento;

    public ConsultarConocimientoHerramienta(ConocimientoService conocimiento) {
        this.conocimiento = conocimiento;
    }

    @Override public String nombre() { return "consultar_conocimiento"; }

    @Override
    public String descripcion() {
        return "Consulta la base de conocimiento del negocio (políticas, envíos, horarios, preguntas frecuentes).";
    }

    @Override
    public Map<String, Object> inputSchema() {
        return EsquemasVentas.objeto(Map.of(
            "pregunta", EsquemasVentas.texto("Pregunta de la persona")), List.of("pregunta"));
    }

    @Override
    public ResultadoHerramienta ejecutar(ContextoHerramienta contexto, JsonNode input) {
        String pregunta = input == null ? "" : input.path("pregunta").asText("").trim();
        if (pregunta.isEmpty()) return ResultadoHerramienta.error("Falta la pregunta.");
        List<ConocimientoRepository.Fila> r = conocimiento.buscar(contexto.empresaId(), pregunta);
        if (r.isEmpty()) {
            return ResultadoHerramienta.ok("No hay información registrada sobre eso. No invente: "
                + "ofrezca derivar a una persona con pasar_a_persona.");
        }
        StringBuilder sb = new StringBuilder();
        for (ConocimientoRepository.Fila f : r) {
            sb.append("# ").append(f.titulo()).append('\n').append(f.contenido()).append("\n\n");
        }
        return ResultadoHerramienta.ok(sb.toString().trim());
    }
}
