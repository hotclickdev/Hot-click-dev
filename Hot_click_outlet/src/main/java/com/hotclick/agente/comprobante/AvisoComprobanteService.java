package com.hotclick.agente.comprobante;

import com.hotclick.agente.canal.CanalCuenta;
import com.hotclick.agente.canal.CanalCuentaRepository;
import com.hotclick.agente.canal.CanalMensajeria;
import com.hotclick.agente.canal.EstadoCanal;
import com.hotclick.agente.conversacion.ConversacionMensaje;
import com.hotclick.agente.conversacion.ConversacionMensajeRepository;
import com.hotclick.agente.conversacion.ConversacionService;
import com.hotclick.agente.conversacion.ConversacionSesion;
import com.hotclick.agente.conversacion.ConversacionSesionRepository;
import com.hotclick.agente.idioma.Idioma;
import com.hotclick.agente.idioma.TextosFijos;
import com.hotclick.agente.pago.AvisoUnicoRepository;
import com.hotclick.agente.pago.EnvioConversacion;
import com.hotclick.agente.seguimiento.ListaBajasAgente;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.function.Supplier;

/**
 * AG-34: avisa por el chat que el comprobante electrónico de un pedido del bot ya fue emitido.
 *
 * <p>Reglas: solo dentro de la ventana de 24 h (fuera no se manda nada, ni plantilla: el comprobante no es
 * urgente y el correo/panel lo cubren); nunca a un contacto de baja (STOP); una sola vez por comprobante (guarda
 * {@link AvisoUnicoRepository}, que sobrevive a eventos repetidos y a varios pods).
 *
 * <p>NO envía el XML ni el PDF ni un enlace de descarga: el mecanismo existente ({@code /api/facturas}) es solo para
 * ADMIN y EMPRENDEDOR y no hay enlace firmado para el comprador; una URL por id sería adivinable. El mensaje solo
 * confirma la emisión y ofrece ayuda para conseguir la copia. Si el tercero falla, el comprobante sigue su curso
 * normal: este aviso nunca lo afecta. Nunca registra contacto, texto ni número de pedido en los logs.
 */
@Service
public class AvisoComprobanteService {

    private static final Logger log = LoggerFactory.getLogger(AvisoComprobanteService.class);
    static final String TIPO_AVISO = "COMPROBANTE";

    private final ComprobanteBotRepositorio comprobantes;
    private final ConversacionSesionRepository sesiones;
    private final ConversacionMensajeRepository mensajes;
    private final CanalCuentaRepository cuentas;
    private final CanalMensajeria canal;
    private final ConversacionService conversaciones;
    private final AvisoUnicoRepository avisos;
    private final ObjectProvider<ListaBajasAgente> bajas;
    Supplier<Instant> reloj = Instant::now;

    public AvisoComprobanteService(ComprobanteBotRepositorio comprobantes, ConversacionSesionRepository sesiones,
                                   ConversacionMensajeRepository mensajes, CanalCuentaRepository cuentas,
                                   CanalMensajeria canal, ConversacionService conversaciones,
                                   AvisoUnicoRepository avisos, ObjectProvider<ListaBajasAgente> bajas) {
        this.comprobantes = comprobantes;
        this.sesiones = sesiones;
        this.mensajes = mensajes;
        this.cuentas = cuentas;
        this.canal = canal;
        this.conversaciones = conversaciones;
        this.avisos = avisos;
        this.bajas = bajas;
    }

    /** @return true si se envió el aviso. */
    public boolean alEmitir(long comprobanteId) {
        Optional<ComprobanteBotRepositorio.ContextoComprobante> ctx = comprobantes.contexto(comprobanteId);
        if (ctx.isEmpty()) return false; // pedido que no es del bot, o nota de crédito/débito
        ConversacionSesion s = sesiones.findById(ctx.get().chatSesionId()).orElse(null);
        if (s == null || s.getContactoExterno() == null || s.getCanalCuentaId() == null) return false;
        CanalCuenta cuenta = cuentas.findById(s.getCanalCuentaId()).orElse(null);
        if (cuenta == null || cuenta.getEstado() != EstadoCanal.ACTIVA) return false;
        if (!EnvioConversacion.dentroDeVentana(s, reloj.get())) {
            log.info("[agente-comprobante] fuera de la ventana de 24 h: no se envía aviso, comprobante={}", comprobanteId);
            return false;
        }
        if (estaDeBaja(s)) {
            log.info("[agente-comprobante] contacto de baja: no se envía aviso, comprobante={}", comprobanteId);
            return false;
        }
        if (!avisos.reclamar(TIPO_AVISO, comprobanteId)) {
            log.info("[agente-comprobante] aviso ya enviado, comprobante={}", comprobanteId);
            return false;
        }
        String texto = TextosFijos.comprobante(idiomaDe(s), ctx.get().numeroPedido());
        try {
            canal.enviarTexto(cuenta, s.getContactoExterno(), texto);
        } catch (RuntimeException ex) {
            avisos.liberar(TIPO_AVISO, comprobanteId);
            log.warn("[agente-comprobante] no se pudo enviar el aviso: {}", ex.getClass().getSimpleName());
            return false;
        }
        try {
            conversaciones.registrarSalienteBot(s.getId(), s.getEmpresaId(), texto);
        } catch (RuntimeException ex) {
            log.warn("[agente-comprobante] aviso enviado pero no quedó en el historial: {}", ex.getClass().getSimpleName());
        }
        log.info("[agente-comprobante] aviso enviado, comprobante={}", comprobanteId);
        return true;
    }

    private boolean estaDeBaja(ConversacionSesion s) {
        ListaBajasAgente.Contacto c = new ListaBajasAgente.Contacto(s.getEmpresaId(), s.getCanal(), s.getContactoExterno());
        return bajas.getIfAvailable(() -> ListaBajasAgente.NINGUNA).dadosDeBaja(List.of(c)).contains(c);
    }

    /** Idioma de los últimos mensajes del cliente (AG-39); español si no hay pistas. */
    private Idioma idiomaDe(ConversacionSesion s) {
        List<String> clientes = new ArrayList<>();
        for (ConversacionMensaje m : mensajes.findTop20BySesionIdOrderByIdDesc(s.getId())) {
            if (ConversacionMensaje.ROL_CLIENTE.equals(m.getRol())) clientes.add(m.getContenido());
        }
        return Idioma.detectar(null, clientes);
    }
}
