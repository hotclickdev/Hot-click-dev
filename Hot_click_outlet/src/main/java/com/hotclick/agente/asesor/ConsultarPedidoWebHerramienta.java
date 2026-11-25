package com.hotclick.agente.asesor;

import com.fasterxml.jackson.databind.JsonNode;
import com.hotclick.agente.motor.ContextoHerramienta;
import com.hotclick.agente.motor.HerramientaAgente;
import com.hotclick.agente.motor.ResultadoHerramienta;
import com.hotclick.model.Pedido;
import com.hotclick.model.Usuario;
import com.hotclick.service.whatsapp.WhatsAppHelpers;
import com.hotclick.utils.FormatoColones;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * {@code consultar_pedido_web}: estado de un pedido para el asesor de la web pública.
 *
 * <p>Quién consulta lo fija el servidor, no el modelo: con sesión iniciada ({@code contexto.usuarioId()}) solo
 * se ven pedidos de ESE usuario; sin sesión se exige número de pedido MÁS el correo o el teléfono del pedido.
 * Cualquier desajuste responde igual que "no existe" (sin confirmar ni negar pedidos ajenos). En una tienda
 * concreta solo se consultan pedidos de esa tienda. Nunca devuelve dirección, correo ni teléfono.
 */
@Component
public class ConsultarPedidoWebHerramienta implements HerramientaAgente {

    static final int MAX_RESULTADOS = 3;
    static final String NO_ENCONTRADO = "No se encontró un pedido con esos datos. No confirme ni niegue pedidos de "
        + "otras personas; pida revisar el número y el correo o teléfono con que compró, o que inicie sesión.";

    private final PedidoAsesorRepository pedidos;

    public ConsultarPedidoWebHerramienta(PedidoAsesorRepository pedidos) {
        this.pedidos = pedidos;
    }

    @Override public String nombre() { return "consultar_pedido_web"; }

    @Override
    public String descripcion() {
        return "Consulta el estado de un pedido (estado, total y guía de envío). Con sesión iniciada solo ve los "
            + "pedidos de esa persona; sin sesión necesita el número de pedido y el correo o teléfono del pedido.";
    }

    @Override
    public Map<String, Object> inputSchema() {
        Map<String, Object> props = new LinkedHashMap<>();
        props.put("numeroPedido", Map.of("type", "string", "description", "Número de pedido; cadena vacía si no lo dio"));
        props.put("correoOTelefono", Map.of("type", "string",
            "description", "Correo o teléfono con que compró; cadena vacía si no lo dio"));
        Map<String, Object> schema = new LinkedHashMap<>();
        schema.put("type", "object");
        schema.put("properties", props);
        schema.put("required", List.of("numeroPedido", "correoOTelefono"));
        schema.put("additionalProperties", false);
        return schema;
    }

    @Override
    public ResultadoHerramienta ejecutar(ContextoHerramienta contexto, JsonNode input) {
        String numero = texto(input, "numeroPedido");
        String prueba = texto(input, "correoOTelefono");
        List<Pedido> visibles;
        if (contexto.usuarioId() != null) {
            visibles = pedidos.delUsuario(contexto.usuarioId(), PageRequest.of(0, 20)).stream()
                .filter(p -> contexto.usuarioId().equals(idUsuario(p)))
                .filter(p -> numero.isEmpty() || numero.equalsIgnoreCase(p.getNumeroPedido()))
                .filter(p -> enAlcance(contexto, p))
                .limit(MAX_RESULTADOS).toList();
        } else {
            if (numero.isEmpty() || prueba.isEmpty()) {
                return ResultadoHerramienta.ok("Para consultar un pedido sin iniciar sesión hacen falta el número de "
                    + "pedido y el correo o teléfono con que se compró. Pídaselos a la persona.");
            }
            visibles = pedidos.porNumero(numero).filter(p -> enAlcance(contexto, p))
                .filter(p -> coincide(p, prueba)).map(List::of).orElse(List.of());
        }
        if (visibles.isEmpty()) return ResultadoHerramienta.ok(NO_ENCONTRADO);

        StringBuilder sb = new StringBuilder();
        for (Pedido p : visibles) {
            sb.append("Pedido ").append(p.getNumeroPedido())
              .append(" | estado: ").append(p.getEstadoPedido())
              .append(" | total: ").append(FormatoColones.colones(p.getTotalPedido()));
            if (p.getNumeroGuia() != null && !p.getNumeroGuia().isBlank()) {
                sb.append(" | guía: ").append(p.getNumeroGuia());
            }
            sb.append('\n');
        }
        return ResultadoHerramienta.ok(sb.toString().trim());
    }

    /** En una tienda solo pedidos de esa tienda; en el marketplace, cualquiera (ya acotado por dueño o prueba). */
    private static boolean enAlcance(ContextoHerramienta contexto, Pedido p) {
        return contexto.esMarketplace() || (contexto.empresaId() != null && contexto.empresaId().equals(p.getEmpresaId()));
    }

    /** Correo (sin distinguir mayúsculas) o teléfono normalizado (≥ 8 dígitos) del comprador o del pedido. */
    static boolean coincide(Pedido p, String prueba) {
        Usuario u = p.getUsuarioFinal();
        if (prueba.contains("@")) {
            return u != null && u.getCorreo() != null && u.getCorreo().trim().equalsIgnoreCase(prueba);
        }
        String tel = WhatsAppHelpers.normalizarTelefono(prueba);
        if (tel.length() < 8) return false;
        return tel.equals(WhatsAppHelpers.normalizarTelefono(p.getClienteTel()))
            || (u != null && tel.equals(WhatsAppHelpers.normalizarTelefono(u.getTelefono())));
    }

    private static Long idUsuario(Pedido p) {
        return p.getUsuarioFinal() == null ? null : p.getUsuarioFinal().getId();
    }

    private static String texto(JsonNode input, String campo) {
        String t = input == null ? "" : input.path(campo).asText("").trim();
        if (t.length() > 100) t = t.substring(0, 100);
        return campo.equals("numeroPedido") ? t.toUpperCase(Locale.ROOT) : t;
    }
}
