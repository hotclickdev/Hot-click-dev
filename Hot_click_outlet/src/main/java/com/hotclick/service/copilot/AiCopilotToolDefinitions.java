package com.hotclick.service.copilot;

import com.hotclick.model.Empresa;
import com.hotclick.security.TenantContext;
import com.hotclick.service.TenantService;
import com.hotclick.utils.Constants;
import com.hotclick.utils.EmpresaNombre;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Definición de herramientas y system prompt del Copilot Telegram.
 * Extraído bit-idéntico de AiCopilotToolExecutor — no cambia comportamiento.
 */
@Component
class AiCopilotToolDefinitions {

    static final List<String> ESTADOS_PEDIDO_VALIDOS = List.of(
        Constants.PEDIDO_PENDIENTE, Constants.PEDIDO_CONFIRMADO, Constants.PEDIDO_PAGADO,
        Constants.PEDIDO_PREPARANDO, Constants.PEDIDO_ENVIADO, Constants.PEDIDO_ENTREGADO,
        Constants.PEDIDO_CANCELADO, Constants.PEDIDO_COMPLETADO);

    private static final String JSON_TYPE = "type";
    private static final String JSON_OBJECT = "object";
    private static final String JSON_PROPERTIES = "properties";
    private static final String JSON_STRING = "string";
    private static final String JSON_DESCRIPTION = "description";
    private static final String JSON_REQUIRED = "required";
    private static final String JSON_INTEGER = "integer";
    private static final String ARG_NUMERO_PEDIDO = "numeroPedido";
    private static final String ARG_PRODUCTO = "producto";

    @Autowired private AiCopilotContextBuilder contextBuilder;
    @Autowired private TenantService tenantService;

    String buildSystemPromptConTools(Long empresaId, Empresa empresa, String nombreUsuario, boolean puedeGestionar) {
        String nombreNegocio = EmpresaNombre.mostrar(empresa, "tu negocio");
        String kpis = contextBuilder.getKpiContext(empresaId);
        String saludo = nombreUsuario != null && !nombreUsuario.isBlank()
            ? "Le hablás a " + nombreUsuario.trim() + ", dueño/a o encargado/a del negocio."
            : "";

        String reglaAcciones = puedeGestionar
            ? """
              4. El chat NUNCA registra ventas ni da de alta productos — esas dos
                 acciones se hacen siempre por botón:
                   - Registrar una venta → botón 🛒 Nueva venta del menú.
                   - Dar de alta un producto → botón ➕ Nuevo producto del menú.
                 Eliminar o editar un producto (campos que no sean oferta/stock)
                 → siempre panel de administración web, nunca por chat.

                 Para estas otras cuatro acciones SÍ tenés herramientas —
                 usalas en vez de solo explicar cómo hacerlo:
                   - Cambiar el estado de un pedido → proponer_cambiar_estado_pedido
                   - Asignar guía de envío a un pedido → proponer_asignar_guia
                   - Ajustar el stock de un producto a una cantidad exacta → proponer_ajustar_stock
                   - Aplicar o quitar una oferta/descuento a un producto → proponer_aplicar_oferta

                 Ninguna de estas cuatro acciones queda aplicada al llamar la
                 herramienta — el usuario todavía tiene que confirmar con un
                 botón. Por eso, en la MISMA respuesta donde llamás una de estas
                 herramientas, tu texto final debe ser una frase corta avisando
                 que mandaste la confirmación (ej: "Te mandé la confirmación
                 arriba, tocá el botón para aplicarlo"). Nunca digas "listo",
                 "ya cambié" o "ya se aplicó" en esa respuesta, y nunca repitas
                 el resumen del cambio en texto — ya se muestra con los botones.
                 Nunca llamés más de una herramienta `proponer_*` en la misma
                 respuesta: si el pedido del usuario implica varias acciones,
                 proponé la primera y decile que confirme esa antes de seguir.
              """
            : """
              4. El chat NUNCA registra ventas, ni elimina/edita/da de alta
                 productos, ni modifica ningún dato — esas acciones se hacen
                 siempre por otra vía:
                   - Registrar una venta → botón 🛒 Nueva venta del menú.
                   - Dar de alta un producto → botón ➕ Nuevo producto del menú.
                   - Eliminar o editar un producto → panel de administración web.
                   - Cambiar estado de un pedido, asignar guía, ajustar stock,
                     o aplicar una oferta → solo el propietario o un
                     administrador del negocio puede pedírmelo; avisale eso en
                     una línea si lo pide.
                 Ante cualquier pedido de estas acciones, respondé SOLO indicando
                 la vía correcta, en una línea. Nunca llamés una herramienta de
                 datos como respuesta a un pedido de acción.
              """;

        return """
            Sos el Copilot de HOTCLICK, el asistente de negocio de "%s". Respondés en
            español con el vos costarricense: directo, concreto y accionable. %s

            Tenés herramientas para consultar datos reales del negocio (inventario,
            ventas, finanzas, clientes, recomendaciones). Nunca inventés cifras.
            Nunca llamés una herramienta "por si acaso" o de relleno cuando no
            estés seguro de qué te piden — si no sabés qué necesita, preguntá,
            no dispares una consulta al azar.

            ESTILO DE RESPUESTA (reglas duras, segui todas, siempre):
            1. Respondé EXACTAMENTE lo que se pregunta o cuenta, ni una palabra
               de más. Un saludo REAL sin ningún pedido ("hola", "buenas", "qué
               tal") se responde con un saludo corto y una pregunta de qué
               necesita. Frases con un verbo de acción (registrar, vender,
               eliminar, borrar, editar, actualizar, dar de alta, cambiar) NO
               son saludos aunque sean cortas — son pedidos concretos, tratalos
               como tal (ver regla 4).
            2. NUNCA mezclés en una misma respuesta datos de una herramienta que
               no se pidió. Si piden "clientes", respondé SOLO clientes — nada
               de inventario, ventas ni ninguna otra sección, aunque la hayas
               consultado hace un momento en la misma conversación.
            3. Si el usuario corrige tu respuesta anterior ("pero solo...", "no
               era eso", "solo quiero X"), respondé ÚNICAMENTE lo que pide ahora.
               No repitas ni un dato de tu respuesta previa.
            %s
            5. Por defecto sé MUY breve: 1 a 3 líneas (menos de 250 caracteres)
               alcanza para la gran mayoría de preguntas puntuales — el usuario
               tiene botones abajo del chat para pedir más si necesita. Si el
               dato cabe en una sola cifra o frase corta, respondé solo eso, sin
               contexto ni sugerencias que no se pidieron. Solo das una lista
               larga, tabla o desglose completo si te piden explícitamente un
               resumen, reporte, análisis o "todo".
            6. No repitas en texto las opciones que ya están en los botones
               (Inventario, Ventas de hoy, Nueva venta, Nuevo producto) salvo que
               te pregunten explícitamente qué podés hacer.

            KPIs GENERALES (últimos 7 días, contexto tuyo — no los repitas salvo que pregunten):
            %s

            REGLAS:
            - Nunca inventés cifras: si no tenés el dato, usá la herramienta correspondiente
            - Respondés solo sobre este negocio; si la pregunta es ajena, redirigís amablemente
            """.formatted(nombreNegocio, saludo, reglaAcciones, kpis);
    }

    List<Map<String, Object>> buildTools(Long empresaId, boolean puedeGestionar) {
        List<Map<String, Object>> tools = new ArrayList<>();
        tools.add(toolDef("consultar_inventario",
            "Consulta el estado del catálogo: cuántos productos activos y unidades en stock hay, y cuáles productos tienen stock crítico (bajo el mínimo).",
            Map.of(JSON_TYPE, JSON_OBJECT, JSON_PROPERTIES, Map.of())));
        tools.add(toolDef("consultar_ventas",
            "Consulta ventas: pedidos e ingresos de hoy y de los últimos 30 días, productos más vendidos, productos sin ventas recientes, y clientes recurrentes por producto.",
            Map.of(JSON_TYPE, JSON_OBJECT, JSON_PROPERTIES, Map.of())));
        tools.add(toolDef("recomendaciones",
            "Devuelve acciones recomendadas para el negocio: productos con stock crítico a reabastecer, y productos sin ventas en 60+ días candidatos a descuento.",
            Map.of(JSON_TYPE, JSON_OBJECT, JSON_PROPERTIES, Map.of())));
        tools.add(toolDef("consultar_clientes",
            "Consulta la lista de clientes del negocio: cuántos son y sus nombres. Usar cuando pregunten cuáles/cuántos son sus clientes.",
            Map.of(JSON_TYPE, JSON_OBJECT, JSON_PROPERTIES, Map.of())));

        if (tieneFeatureReportes(empresaId)) {
            tools.add(toolDef("consultar_finanzas",
                "Consulta KPIs financieros del negocio para un período: ventas totales, costo de mercadería vendida (CMV), ganancia neta, margen, IVA.",
                Map.of(JSON_TYPE, JSON_OBJECT,
                    JSON_PROPERTIES, Map.of("periodo", Map.of(
                        JSON_TYPE, JSON_STRING,
                        "enum", List.of("hoy", "semana", "mes", "todo"),
                        JSON_DESCRIPTION, "Período a consultar — por defecto 'mes' (mes actual)")),
                    JSON_REQUIRED, List.of())));
        }

        // Tools de mutación (propose → confirm → execute): solo visibles para
        // propietario/admin — un miembro sin ese rol nunca las ve en la lista,
        // así que el modelo estructuralmente no puede llamarlas.
        if (puedeGestionar) {
            tools.add(toolDef("proponer_cambiar_estado_pedido",
                "Llamala cuando el usuario pida explícitamente cambiar el estado de un pedido (ej: marcarlo como entregado, confirmado, cancelado). "
                + "Nunca la llames solo para consultar el estado de un pedido — para eso usá consultar_ventas.",
                Map.of(JSON_TYPE, JSON_OBJECT,
                    JSON_PROPERTIES, Map.of(
                        ARG_NUMERO_PEDIDO, Map.of(JSON_TYPE, JSON_STRING, JSON_DESCRIPTION, "Número de pedido (ej: ORD-2026-00123) o su id numérico, tal como lo dio el usuario"),
                        "nuevoEstado", Map.of(JSON_TYPE, JSON_STRING, "enum", ESTADOS_PEDIDO_VALIDOS, JSON_DESCRIPTION, "Nuevo estado del pedido"),
                        "nota", Map.of(JSON_TYPE, JSON_STRING, JSON_DESCRIPTION, "Nota opcional para el cliente, si el usuario la mencionó")),
                    JSON_REQUIRED, List.of(ARG_NUMERO_PEDIDO, "nuevoEstado"))));
            tools.add(toolDef("proponer_asignar_guia",
                "Llamala cuando el usuario pida explícitamente asignar o registrar un número de guía de envío a un pedido.",
                Map.of(JSON_TYPE, JSON_OBJECT,
                    JSON_PROPERTIES, Map.of(
                        ARG_NUMERO_PEDIDO, Map.of(JSON_TYPE, JSON_STRING, JSON_DESCRIPTION, "Número de pedido o su id numérico"),
                        "numeroGuia", Map.of(JSON_TYPE, JSON_STRING, JSON_DESCRIPTION, "Número de guía de envío")),
                    JSON_REQUIRED, List.of(ARG_NUMERO_PEDIDO, "numeroGuia"))));
            tools.add(toolDef("proponer_ajustar_stock",
                "Llamala cuando el usuario pida explícitamente ajustar o corregir el stock de un producto a una cantidad exacta (conteo físico). "
                + "Nunca la llames solo para consultar el stock — para eso usá consultar_inventario.",
                Map.of(JSON_TYPE, JSON_OBJECT,
                    JSON_PROPERTIES, Map.of(
                        ARG_PRODUCTO, Map.of(JSON_TYPE, JSON_STRING, JSON_DESCRIPTION, "Nombre o parte del nombre del producto"),
                        "cantidadReal", Map.of(JSON_TYPE, JSON_INTEGER, "minimum", 0, JSON_DESCRIPTION, "Cantidad real en existencia")),
                    JSON_REQUIRED, List.of(ARG_PRODUCTO, "cantidadReal"))));
            tools.add(toolDef("proponer_aplicar_oferta",
                "Llamala cuando el usuario pida explícitamente aplicar, cambiar o quitar una oferta/descuento de un producto.",
                Map.of(JSON_TYPE, JSON_OBJECT,
                    JSON_PROPERTIES, Map.of(
                        ARG_PRODUCTO, Map.of(JSON_TYPE, JSON_STRING, JSON_DESCRIPTION, "Nombre o parte del nombre del producto"),
                        "porcentajeDescuento", Map.of(JSON_TYPE, JSON_INTEGER, JSON_DESCRIPTION, "Porcentaje de descuento (ej: 15). Usar este o precioOferta, no ambos"),
                        "precioOferta", Map.of(JSON_TYPE, JSON_INTEGER, JSON_DESCRIPTION, "Precio de oferta en colones. Usar este o porcentajeDescuento, no ambos"),
                        "quitarOferta", Map.of("type", "boolean", JSON_DESCRIPTION, "true si el pedido es QUITAR la oferta existente")),
                    JSON_REQUIRED, List.of(ARG_PRODUCTO))));
        }
        return tools;
    }

    /** Verifica el feature "reportes" sin depender del TenantContext ambiente — el webhook de Telegram es público y no lo setea. */
    boolean tieneFeatureReportes(Long empresaId) {
        Long previo = TenantContext.get();
        try {
            TenantContext.set(empresaId);
            return tenantService.tieneFeature("reportes");
        } finally {
            if (previo != null) TenantContext.set(previo); else TenantContext.clear();
        }
    }

    /** Formato de tool de la Messages API de Claude — plano, sin la envoltura {type:"function", function:{...}} de OpenAI. */
    Map<String, Object> toolDef(String name, String description, Map<String, Object> parameters) {
        Map<String, Object> tool = new LinkedHashMap<>();
        tool.put("name", name);
        tool.put(JSON_DESCRIPTION, description);
        tool.put("input_schema", parameters);
        return tool;
    }
}
