package com.hotclick.agente.ventas;

import com.fasterxml.jackson.databind.JsonNode;
import com.hotclick.agente.motor.ContextoHerramienta;
import com.hotclick.agente.motor.HerramientaAgente;
import com.hotclick.agente.motor.ResultadoHerramienta;
import com.hotclick.agente.webhook.MensajeEntrante;
import com.hotclick.model.Pedido;
import com.hotclick.model.Usuario;
import com.hotclick.service.whatsapp.WhatsAppHelpers;
import com.hotclick.utils.FormatoColones;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Locale;
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
            + "En WhatsApp solo ve pedidos de este negocio hechos con su mismo teléfono; en Instagram y Messenger exige "
            + "el número de pedido y el correo del pedido.";
    }

    @Override
    public Map<String, Object> inputSchema() {
        return EsquemasVentas.objeto(Map.of(
            "numeroPedido", EsquemasVentas.texto("Número de pedido si la persona lo dio; cadena vacía si no"),
            "correoPedido", EsquemasVentas.texto("Correo con el que se hizo el pedido; solo se usa en Instagram y "
                + "Messenger (en WhatsApp va cadena vacía)")),
            List.of("numeroPedido", "correoPedido"));
    }

    @Override
    public ResultadoHerramienta ejecutar(ContextoHerramienta contexto, JsonNode input) {
        // AG-14 H-09: solo WhatsApp entrega un teléfono verificado por Meta. En Instagram y Messenger el contacto es
        // un id del canal (PSID/IGSID), nunca un teléfono: se pide número de pedido más el correo del pedido.
        if (contexto.canal() != MensajeEntrante.Canal.WHATSAPP) return consultarPorPedidoYCorreo(contexto, input);
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
        return ResultadoHerramienta.ok(detalle(propios));
    }

    /** Instagram, Messenger y cualquier canal sin teléfono verificado: número de pedido + correo del pedido. */
    private ResultadoHerramienta consultarPorPedidoYCorreo(ContextoHerramienta contexto, JsonNode input) {
        Long empresaId = contexto.empresaId();
        if (empresaId == null) {
            return ResultadoHerramienta.error("No se pudo verificar la identidad de quien escribe; derive a una persona.");
        }
        String numero = input == null ? "" : input.path("numeroPedido").asText("").trim();
        String correo = input == null ? "" : input.path("correoPedido").asText("").trim().toLowerCase(Locale.ROOT);
        if (numero.isEmpty() || correo.isEmpty()) {
            return ResultadoHerramienta.ok("Por este canal no puedo identificar a la persona por su teléfono. Pida el "
                + "número de pedido y el correo electrónico con el que compró, y vuelva a consultar.");
        }
        List<Pedido> propios = pedidos.recientesDeEmpresa(empresaId, PageRequest.of(0, VENTANA_PEDIDOS)).stream()
            .filter(p -> empresaId.equals(p.getEmpresaId()))
            .filter(p -> numero.equalsIgnoreCase(p.getNumeroPedido()))
            .filter(p -> correo.equals(correoDe(p)))
            .limit(MAX_RESULTADOS)
            .toList();
        if (propios.isEmpty()) {
            // Mismo texto si falla el número o el correo: no se revela cuál de los dos no coincide.
            return ResultadoHerramienta.ok("No se encontró un pedido con esos datos. No confirme ni niegue pedidos de "
                + "otras personas; ofrezca derivar a una persona si insiste.");
        }
        return ResultadoHerramienta.ok(detalle(propios));
    }

    private static String correoDe(Pedido p) {
        Usuario u = p.getUsuarioFinal();
        return u == null || u.getCorreo() == null ? "" : u.getCorreo().trim().toLowerCase(Locale.ROOT);
    }

    private static String detalle(List<Pedido> propios) {
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
        return sb.toString().trim();
    }

    /** Teléfono del pedido: el del cliente capturado en el pedido o, si no hay, el del usuario comprador. */
    static String telefonoDe(Pedido p) {
        String tel = WhatsAppHelpers.normalizarTelefono(p.getClienteTel());
        if (!tel.isEmpty()) return tel;
        Usuario u = p.getUsuarioFinal();
        return u == null ? "" : WhatsAppHelpers.normalizarTelefono(u.getTelefono());
    }
}
