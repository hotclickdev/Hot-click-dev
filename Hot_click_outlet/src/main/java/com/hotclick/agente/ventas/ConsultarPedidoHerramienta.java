package com.hotclick.agente.ventas;

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

import java.util.List;
import java.util.Map;

/**
 * {@code consultar_pedido}: SOLO pedidos de la empresa de la conversación cuyo teléfono (normalizado) coincide con
 * el contacto que escribe. Empresa y teléfono salen del {@link ContextoHerramienta}, nunca del input del modelo:
 * el input solo puede acotar por número de pedido, jamás ampliar el alcance.
 */
@Component
public class ConsultarPedidoHerramienta implements HerramientaAgente {

    static final int VENTANA_PEDIDOS = 200;
    static final int MAX_RESULTADOS = 3;

    private final PedidoVentasRepository pedidos;

    public ConsultarPedidoHerramienta(PedidoVentasRepository pedidos) {
        this.pedidos = pedidos;
    }

    @Override public String nombre() { return "consultar_pedido"; }

    @Override
    public String descripcion() {
        return "Consulta el estado de los pedidos de la persona que escribe (número, estado, total y guía de envío). "
            + "Solo ve pedidos de este negocio hechos con su mismo teléfono.";
    }

    @Override
    public Map<String, Object> inputSchema() {
        return EsquemasVentas.objeto(Map.of(
            "numeroPedido", EsquemasVentas.texto("Número de pedido si la persona lo dio; cadena vacía si no")),
            List.of("numeroPedido"));
    }

    @Override
    public ResultadoHerramienta ejecutar(ContextoHerramienta contexto, JsonNode input) {
        Long empresaId = contexto.empresaId();
        String contacto = WhatsAppHelpers.normalizarTelefono(contexto.contactoExterno());
        if (empresaId == null || contacto.length() < 8) {
            return ResultadoHerramienta.error("No se pudo verificar la identidad de quien escribe; derive a una persona.");
        }
        String numero = input == null ? "" : input.path("numeroPedido").asText("").trim();

        List<Pedido> propios = pedidos.recientesDeEmpresa(empresaId, PageRequest.of(0, VENTANA_PEDIDOS)).stream()
            // Defensa en profundidad: aunque el repositorio filtra, se vuelve a verificar la empresa.
            .filter(p -> empresaId.equals(p.getEmpresaId()))
            .filter(p -> contacto.equals(telefonoDe(p)))
            .filter(p -> numero.isEmpty() || numero.equalsIgnoreCase(p.getNumeroPedido()))
            .limit(MAX_RESULTADOS)
            .toList();

        if (propios.isEmpty()) {
            return ResultadoHerramienta.ok("No se encontraron pedidos de este número en este negocio"
                + (numero.isEmpty() ? "." : " con ese número de pedido.")
                + " No confirme ni niegue pedidos de otras personas; ofrezca derivar a una persona si insiste.");
        }
        StringBuilder sb = new StringBuilder();
        for (Pedido p : propios) {
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

    /** Teléfono del pedido: el del cliente capturado en el pedido o, si no hay, el del usuario comprador. */
    static String telefonoDe(Pedido p) {
        String tel = WhatsAppHelpers.normalizarTelefono(p.getClienteTel());
        if (!tel.isEmpty()) return tel;
        Usuario u = p.getUsuarioFinal();
        return u == null ? "" : WhatsAppHelpers.normalizarTelefono(u.getTelefono());
    }
}
