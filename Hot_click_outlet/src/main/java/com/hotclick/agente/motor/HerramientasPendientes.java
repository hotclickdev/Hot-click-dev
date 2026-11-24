package com.hotclick.agente.motor;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * STUBS de herramientas que dependen de otras historias. Están declaradas para fijar nombre, schema y
 * perfiles que las usan, pero {@link #disponible()} es false: el motor NO las ofrece a Claude hasta que la
 * historia correspondiente aporte un bean {@link HerramientaAgente} con el mismo nombre (el registro prefiere
 * siempre la implementación disponible sobre el stub).
 */
public final class HerramientasPendientes {

    private HerramientasPendientes() {}

    abstract static class Pendiente implements HerramientaAgente {
        private final String nombre;
        private final String historia;
        private final String descripcion;
        private final Map<String, Object> schema;

        Pendiente(String nombre, String historia, String descripcion, Map<String, Object> schema) {
            this.nombre = nombre;
            this.historia = historia;
            this.descripcion = descripcion;
            this.schema = schema;
        }

        @Override public String nombre() { return nombre; }
        @Override public String descripcion() { return descripcion; }
        @Override public Map<String, Object> inputSchema() { return schema; }
        @Override public boolean disponible() { return false; }

        @Override
        public ResultadoHerramienta ejecutar(ContextoHerramienta contexto, JsonNode input) {
            return ResultadoHerramienta.error("Herramienta aún no disponible (pendiente " + historia + ").");
        }
    }

    /** STUB — AG-07. */
    @Component
    public static class CrearEnlaceCompra extends Pendiente {
        public CrearEnlaceCompra() {
            super("crear_enlace_compra", "AG-07",
                "Crea un enlace de pago para los productos que la persona confirmó comprar.",
                EsquemasAgente.objeto(Map.of(
                    "productoId", EsquemasAgente.entero("Id del producto devuelto por buscar_productos"),
                    "cantidad", EsquemasAgente.entero("Unidades a comprar")),
                    List.of("productoId", "cantidad")));
        }
    }

    /** STUB — AG-11. Solo pedidos del mismo teléfono que escribe (se toma del contexto, no del input). */
    @Component
    public static class ConsultarPedido extends Pendiente {
        public ConsultarPedido() {
            super("consultar_pedido", "AG-11",
                "Consulta el estado de un pedido de la persona que escribe.",
                EsquemasAgente.objeto(Map.of(
                    "numeroPedido", EsquemasAgente.texto("Número de pedido, si la persona lo dio")),
                    List.of()));
        }
    }

    /** STUB — AG-11. */
    @Component
    public static class ConsultarConocimiento extends Pendiente {
        public ConsultarConocimiento() {
            super("consultar_conocimiento", "AG-11",
                "Consulta la base de conocimiento (políticas, envíos, horarios, preguntas frecuentes).",
                EsquemasAgente.objeto(Map.of(
                    "pregunta", EsquemasAgente.texto("Pregunta de la persona")),
                    List.of("pregunta")));
        }
    }

    /** STUB — AG-15/AG-27. */
    @Component
    public static class RegistrarLead extends Pendiente {
        public RegistrarLead() {
            super("registrar_lead", "AG-15/AG-27",
                "Registra el interés de un negocio en vender en HotClick.",
                EsquemasAgente.objeto(Map.of(
                    "nombreNegocio", EsquemasAgente.texto("Nombre del negocio"),
                    "queVende", EsquemasAgente.texto("Qué vende")),
                    List.of("nombreNegocio", "queVende")));
        }
    }

    /** STUB — AG-26. */
    @Component
    public static class ExplicarPlanes extends Pendiente {
        public ExplicarPlanes() {
            super("explicar_planes", "AG-26",
                "Explica los planes de HotClick para vendedores con sus datos oficiales.",
                EsquemasAgente.objeto(Map.of(
                    "plan", EsquemasAgente.texto("Nombre del plan por el que pregunta; vacío para todos")),
                    List.of()));
        }
    }
}
