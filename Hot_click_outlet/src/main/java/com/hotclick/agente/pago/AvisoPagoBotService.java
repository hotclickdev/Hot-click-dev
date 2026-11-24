package com.hotclick.agente.pago;

import com.hotclick.agente.canal.CanalCuenta;
import com.hotclick.agente.canal.CanalCuentaRepository;
import com.hotclick.agente.conversacion.ConversacionService;
import com.hotclick.agente.conversacion.ConversacionSesion;
import com.hotclick.agente.conversacion.ConversacionSesionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.function.Supplier;

/**
 * AG-08: confirma el pago (o el rechazo) al cliente por la conversación del enlace. Sin transacción propia: la parte
 * de base de datos vive en {@link PagoBotTransicion} (REQUIRES_NEW) y el envío ocurre fuera de toda transacción.
 *
 * <p>El aviso al NEGOCIO no se duplica aquí: la misma confirmación de pago ya lo manda por el canal de pedidos
 * nuevos ({@code VentaAvisoService.avisarVentaConfirmada}: correo, WhatsApp del emprendedor y Telegram). La marca
 * «venta del bot» es {@code pedido.origen_canal} + {@code fk_id_enlace_compra}, que fija el checkout al vincular.
 */
@Service
public class AvisoPagoBotService {

    private static final Logger log = LoggerFactory.getLogger(AvisoPagoBotService.class);
    private static final DateTimeFormatter FECHA = DateTimeFormatter.ofPattern("d 'de' MMMM", Locale.forLanguageTag("es-CR"));
    static final int MAX_RECHAZOS_CON_BOT = 2;

    private final PagoBotTransicion transicion;
    private final ConversacionSesionRepository sesiones;
    private final CanalCuentaRepository cuentas;
    private final ConversacionService conversaciones;
    private final EnvioConversacion envio;
    private final String appUrl;
    Supplier<Instant> reloj = Instant::now;

    public AvisoPagoBotService(PagoBotTransicion transicion, ConversacionSesionRepository sesiones,
                               CanalCuentaRepository cuentas, ConversacionService conversaciones,
                               EnvioConversacion envio, @Value("${app.url:http://localhost:3000}") String appUrl) {
        this.transicion = transicion;
        this.sesiones = sesiones;
        this.cuentas = cuentas;
        this.conversaciones = conversaciones;
        this.envio = envio;
        this.appUrl = appUrl.endsWith("/") ? appUrl.substring(0, appUrl.length() - 1) : appUrl;
    }

    public void alPagar(PedidoBotPagadoEvent ev) {
        Optional<ContextoPago> ctx = transicion.registrarPagado(ev.enlaceId(), ev.pedidoId());
        if (ctx.isEmpty()) {
            log.info("[agente-pago] pago ya avisado o enlace inexistente: enlace={}", ev.enlaceId());
            return;
        }
        ContextoPago c = ctx.get();
        log.info("[agente-pago] venta del bot pagada: enlace={} empresa={}", c.enlaceId(), c.empresaId());
        enviar(c, AvisoFueraDeVentana.Tipo.PAGO_CONFIRMADO, textoPagado(c));
    }

    public void alRechazar(PedidoBotRechazadoEvent ev) {
        Optional<ContextoPago> ctx = transicion.registrarRechazado(ev.enlaceId(), ev.pedidoId());
        if (ctx.isEmpty()) {
            log.info("[agente-pago] rechazo ya avisado o no vigente: enlace={}", ev.enlaceId());
            return;
        }
        ContextoPago c = ctx.get();
        boolean aPersona = c.rechazos() >= MAX_RECHAZOS_CON_BOT;
        ConversacionSesion s = sesion(c);
        enviar(c, s, AvisoFueraDeVentana.Tipo.PAGO_RECHAZADO, textoRechazado(c, aPersona));
        if (aPersona && s != null) {
            try {
                conversaciones.pausarBot(s.getId(), s.getEmpresaId());
                log.info("[agente-pago] segundo rechazo: conversación a PERSONA, enlace={}", c.enlaceId());
            } catch (RuntimeException ex) {
                log.warn("[agente-pago] no se pudo pasar a persona: {}", ex.getClass().getSimpleName());
            }
        }
    }

    private void enviar(ContextoPago c, AvisoFueraDeVentana.Tipo tipo, String texto) {
        enviar(c, sesion(c), tipo, texto);
    }

    private void enviar(ContextoPago c, ConversacionSesion s, AvisoFueraDeVentana.Tipo tipo, String texto) {
        CanalCuenta cuenta = s == null || s.getCanalCuentaId() == null ? null
            : cuentas.findById(s.getCanalCuentaId()).orElse(null);
        EnvioConversacion.Resultado r = envio.enviar(s, cuenta, tipo, texto, variables(c), reloj.get());
        if (r == EnvioConversacion.Resultado.PENDIENTE) {
            transicion.marcarAvisoPendiente(c.enlaceId(), tipo == AvisoFueraDeVentana.Tipo.PAGO_CONFIRMADO ? "PAGADO" : "RECHAZADO");
            log.warn("[agente-pago] aviso {} pendiente (fuera de ventana o sin canal): enlace={}", tipo, c.enlaceId());
        }
    }

    private ConversacionSesion sesion(ContextoPago c) {
        return c.chatSesionId() == null ? null : sesiones.findById(c.chatSesionId()).orElse(null);
    }

    private Map<String, String> variables(ContextoPago c) {
        Map<String, String> v = new LinkedHashMap<>();
        v.put("pedido", c.numerosPedido());
        v.put("total", colones(c.total()));
        v.put("enlace", appUrl + "/c/" + c.codigo());
        return v;
    }

    String textoPagado(ContextoPago c) {
        StringBuilder t = new StringBuilder("¡Pago recibido! Tu pedido ").append(c.numerosPedido())
            .append(" por ").append(colones(c.total())).append(" quedó confirmado.");
        LocalDate entrega = c.entregaEstimada();
        if (entrega != null) t.append(" Entrega estimada: ").append(FECHA.format(entrega)).append('.');
        return t.append(" Gracias por tu compra.").toString();
    }

    String textoRechazado(ContextoPago c, boolean aPersona) {
        String enlace = appUrl + "/c/" + c.codigo();
        if (aPersona) {
            return "Tu pago no pudo procesarse otra vez. Una persona del equipo te va a contactar por aquí para "
                + "ayudarte a terminar la compra, por ejemplo con SINPE Móvil.";
        }
        return "Tu pago no pasó. Puedes reintentar con el mismo enlace: " + enlace
            + " . Si prefieres, responde SINPE y te ayudo a pagar por SINPE Móvil.";
    }

    static String colones(int monto) {
        DecimalFormatSymbols sym = new DecimalFormatSymbols(Locale.forLanguageTag("es-CR"));
        sym.setGroupingSeparator('.');
        return "₡" + new DecimalFormat("#,##0", sym).format(monto);
    }
}
