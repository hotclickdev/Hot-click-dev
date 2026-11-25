package com.hotclick.agente.metricas;

import com.hotclick.agente.canal.CanalCuenta;
import com.hotclick.agente.canal.CanalCuentaRepository;
import com.hotclick.agente.canal.CanalMensajeria;
import com.hotclick.agente.canal.EstadoCanal;
import com.hotclick.agente.conversacion.ConversacionService;
import com.hotclick.agente.conversacion.ConversacionSesion;
import com.hotclick.agente.conversacion.ConversacionSesionRepository;
import com.hotclick.agente.enlace.EnlaceCompra;
import com.hotclick.agente.enlace.EnlaceCompraRepository;
import com.hotclick.agente.pago.EnvioConversacion;
import com.hotclick.agente.seguimiento.ListaBajasAgente;
import com.hotclick.model.Pedido;
import com.hotclick.repository.PedidoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Objects;

/**
 * AG-35: cuando un pedido que vino del bot pasa a ENTREGADO, el bot pide la reseña en el mismo chat con el enlace a la
 * pantalla de opiniones de «Mi cuenta» (la que ya existe). Reglas:
 * <ul>
 *   <li>Solo dentro de la ventana de 24 h de la conversación; fuera de ella no se manda nada (ni plantilla).</li>
 *   <li>Respeta la lista de bajas (STOP): quien se dio de baja no recibe mensajes proactivos.</li>
 *   <li>Una sola vez por pedido (llave primaria en {@code hot_click_agente_resena_aviso_tb}).</li>
 *   <li>Sin transacción propia: el envío a Meta ocurre fuera de toda transacción. Nunca registra contacto ni texto.</li>
 * </ul>
 */
@Service
public class ResenaBotService {

    private static final Logger log = LoggerFactory.getLogger(ResenaBotService.class);
    static final String RUTA_RESENAS = "/perfil?vista=opiniones";

    public enum Resultado { ENVIADA, YA_ENVIADA, SIN_CONVERSACION, FUERA_DE_VENTANA, EN_BAJA, CANAL_NO_DISPONIBLE, ERROR }

    private final PedidoRepository pedidos;
    private final EnlaceCompraRepository enlaces;
    private final ConversacionSesionRepository sesiones;
    private final CanalCuentaRepository cuentas;
    private final ConversacionService conversaciones;
    private final CanalMensajeria canal;
    private final ResenaAvisoRepositorio avisos;
    private final ObjectProvider<ListaBajasAgente> bajas;
    private final String appUrl;
    private final Clock reloj;

    @Autowired
    public ResenaBotService(PedidoRepository pedidos, EnlaceCompraRepository enlaces,
                            ConversacionSesionRepository sesiones, CanalCuentaRepository cuentas,
                            ConversacionService conversaciones, CanalMensajeria canal, ResenaAvisoRepositorio avisos,
                            ObjectProvider<ListaBajasAgente> bajas,
                            @Value("${app.url:http://localhost:3000}") String appUrl) {
        this(pedidos, enlaces, sesiones, cuentas, conversaciones, canal, avisos, bajas, appUrl, Clock.systemUTC());
    }

    ResenaBotService(PedidoRepository pedidos, EnlaceCompraRepository enlaces, ConversacionSesionRepository sesiones,
                     CanalCuentaRepository cuentas, ConversacionService conversaciones, CanalMensajeria canal,
                     ResenaAvisoRepositorio avisos, ObjectProvider<ListaBajasAgente> bajas, String appUrl, Clock reloj) {
        this.pedidos = pedidos;
        this.enlaces = enlaces;
        this.sesiones = sesiones;
        this.cuentas = cuentas;
        this.conversaciones = conversaciones;
        this.canal = canal;
        this.avisos = avisos;
        this.bajas = bajas;
        this.appUrl = appUrl.endsWith("/") ? appUrl.substring(0, appUrl.length() - 1) : appUrl;
        this.reloj = reloj;
    }

    public Resultado alEntregar(PedidoBotEntregadoEvent ev) {
        Pedido pedido = ev.pedidoId() == null ? null : pedidos.findById(ev.pedidoId()).orElse(null);
        EnlaceCompra enlace = ev.enlaceId() == null ? null : enlaces.findById(ev.enlaceId()).orElse(null);
        if (pedido == null || enlace == null || enlace.getChatSesionId() == null
                || !Objects.equals(pedido.getEnlaceCompraId(), enlace.getId())) {
            return Resultado.SIN_CONVERSACION;
        }
        ConversacionSesion sesion = sesiones.findById(enlace.getChatSesionId()).orElse(null);
        // La conversación debe ser del mismo negocio que el enlace: nunca se escribe a un chat de otro tenant.
        if (sesion == null || sesion.getContactoExterno() == null || sesion.getCanalCuentaId() == null
                || !Objects.equals(sesion.getEmpresaId(), enlace.getEmpresaId())) {
            return Resultado.SIN_CONVERSACION;
        }
        CanalCuenta cuenta = cuentas.findById(sesion.getCanalCuentaId()).orElse(null);
        if (cuenta == null || cuenta.getEstado() != EstadoCanal.ACTIVA) return Resultado.CANAL_NO_DISPONIBLE;
        // Fuera de las 24 h Meta solo permite plantillas aprobadas: no se manda nada.
        Instant ahora = reloj.instant();
        if (!EnvioConversacion.dentroDeVentana(sesion, ahora)) return Resultado.FUERA_DE_VENTANA;
        if (estaDeBaja(sesion)) return Resultado.EN_BAJA;
        if (!avisos.reclamar(pedido.getId(), enlace.getEmpresaId())) return Resultado.YA_ENVIADA;

        String texto = texto(pedido.getNumeroPedido());
        try {
            canal.enviarTexto(cuenta, sesion.getContactoExterno(), texto);
        } catch (RuntimeException ex) {
            avisos.liberar(pedido.getId());
            log.warn("[agente-resena] no se pudo enviar la solicitud: {}", ex.getClass().getSimpleName());
            return Resultado.ERROR;
        }
        try {
            conversaciones.registrarSalienteBot(sesion.getId(), sesion.getEmpresaId(), texto);
        } catch (RuntimeException ex) {
            log.warn("[agente-resena] enviada pero no quedó en el historial: {}", ex.getClass().getSimpleName());
        }
        log.info("[agente-resena] reseña pedida en el chat del pedido {}", pedido.getId());
        return Resultado.ENVIADA;
    }

    private boolean estaDeBaja(ConversacionSesion s) {
        ListaBajasAgente.Contacto c = new ListaBajasAgente.Contacto(s.getEmpresaId(), s.getCanal(), s.getContactoExterno());
        return !bajas.getIfAvailable(() -> ListaBajasAgente.NINGUNA).dadosDeBaja(List.of(c)).isEmpty();
    }

    String texto(String numeroPedido) {
        String pedido = numeroPedido == null || numeroPedido.isBlank() ? "" : " " + numeroPedido;
        return "¡Tu pedido" + pedido + " fue entregado! Nos ayuda mucho saber cómo te fue: puedes dejar tu reseña aquí: "
            + appUrl + RUTA_RESENAS + " . ¡Gracias por tu compra!";
    }
}
