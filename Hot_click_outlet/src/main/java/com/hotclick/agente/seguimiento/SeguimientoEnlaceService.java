package com.hotclick.agente.seguimiento;

import com.hotclick.agente.canal.CanalCuenta;
import com.hotclick.agente.canal.CanalCuentaRepository;
import com.hotclick.agente.canal.EstadoCanal;
import com.hotclick.agente.conversacion.ConversacionSesion;
import com.hotclick.agente.conversacion.ConversacionSesionRepository;
import com.hotclick.agente.conversacion.ModoConversacion;
import com.hotclick.agente.enlace.EnlaceCompra;
import com.hotclick.agente.enlace.EnlaceCompraEstadoService;
import com.hotclick.agente.enlace.EnlaceCompraRepository;
import com.hotclick.agente.pago.AvisoFueraDeVentana;
import com.hotclick.agente.pago.EnvioConversacion;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * AG-12: recordatorios del enlace de compra. Recordatorio 1: enlace CREADO sin abrir pasadas 2 h. Recordatorio 2:
 * enlace ABIERTO sin pagar pasados 30 min. Máximo dos por enlace, solo dentro de la ventana de 24 h, nunca a
 * contactos de baja (STOP) ni a conversaciones atendidas por una persona. Fuera de la ventana NO se envía nada
 * (un recordatorio no justifica una plantilla). Todas las lecturas son por lote; las escrituras van por enlace
 * a través de {@link EnlaceCompraEstadoService}, que es transaccional. Los que pasan de 24 h los vence
 * {@code EnlaceCompraVencimientoScheduler} (venta perdida).
 */
@Service
public class SeguimientoEnlaceService {

    private static final Logger log = LoggerFactory.getLogger(SeguimientoEnlaceService.class);
    static final int MAX_RECORDATORIOS = 2;
    static final int LOTE = 200;

    private final EnlaceCompraRepository enlaces;
    private final ConversacionSesionRepository sesiones;
    private final CanalCuentaRepository cuentas;
    private final EnlaceCompraEstadoService estado;
    private final EnvioConversacion envio;
    private final ObjectProvider<ListaBajasAgente> bajas;
    private final Duration sinAbrir;
    private final Duration sinPagar;
    private final String appUrl;

    public SeguimientoEnlaceService(EnlaceCompraRepository enlaces, ConversacionSesionRepository sesiones,
                                    CanalCuentaRepository cuentas, EnlaceCompraEstadoService estado,
                                    EnvioConversacion envio, ObjectProvider<ListaBajasAgente> bajas,
                                    @Value("${hotclick.agente.seguimiento.sin-abrir-minutos:120}") long sinAbrirMin,
                                    @Value("${hotclick.agente.seguimiento.sin-pagar-minutos:30}") long sinPagarMin,
                                    @Value("${app.url:http://localhost:3000}") String appUrl) {
        this.enlaces = enlaces;
        this.sesiones = sesiones;
        this.cuentas = cuentas;
        this.estado = estado;
        this.envio = envio;
        this.bajas = bajas;
        this.sinAbrir = Duration.ofMinutes(sinAbrirMin);
        this.sinPagar = Duration.ofMinutes(sinPagarMin);
        this.appUrl = appUrl.endsWith("/") ? appUrl.substring(0, appUrl.length() - 1) : appUrl;
    }

    /** @return cuántos recordatorios se enviaron. Un fallo en un enlace no frena a los demás. */
    public int barrer(LocalDateTime ahoraCr, Instant ahora) {
        List<EnlaceCompra> r1 = enlaces.paraRecordatorio1(ahoraCr.minus(sinAbrir), ahoraCr, PageRequest.of(0, LOTE));
        List<EnlaceCompra> r2 = enlaces.paraRecordatorio2(ahoraCr.minus(sinPagar), ahoraCr, PageRequest.of(0, LOTE));
        if (r1.isEmpty() && r2.isEmpty()) return 0;

        List<EnlaceCompra> todos = new ArrayList<>(r1);
        todos.addAll(r2);
        Map<UUID, ConversacionSesion> sesionPorId = sesionesDe(todos);
        Map<Long, CanalCuenta> cuentaPorId = cuentasDe(sesionPorId);
        Set<ListaBajasAgente.Contacto> deBaja = bajasDe(sesionPorId.values());

        int enviados = 0;
        for (EnlaceCompra e : r1) {
            enviados += recordar(e, 1, sesionPorId, cuentaPorId, deBaja, ahoraCr, ahora);
        }
        for (EnlaceCompra e : r2) {
            enviados += recordar(e, 2, sesionPorId, cuentaPorId, deBaja, ahoraCr, ahora);
        }
        if (enviados > 0) log.info("[seguimiento] {} recordatorio(s) enviados", enviados);
        return enviados;
    }

    private int recordar(EnlaceCompra e, int numero, Map<UUID, ConversacionSesion> sesionPorId,
                         Map<Long, CanalCuenta> cuentaPorId, Set<ListaBajasAgente.Contacto> deBaja,
                         LocalDateTime ahoraCr, Instant ahora) {
        try {
            if (e.getRecordatoriosEnviados() >= MAX_RECORDATORIOS) return 0;
            ConversacionSesion s = sesionPorId.get(e.getChatSesionId());
            if (s == null || s.getModo() == ModoConversacion.PERSONA) return 0;
            CanalCuenta cuenta = s.getCanalCuentaId() == null ? null : cuentaPorId.get(s.getCanalCuentaId());
            if (cuenta == null || cuenta.getEstado() != EstadoCanal.ACTIVA) return 0;
            if (!EnvioConversacion.dentroDeVentana(s, ahora)) return 0;
            if (deBaja.contains(new ListaBajasAgente.Contacto(s.getEmpresaId(), s.getCanal(), s.getContactoExterno()))) {
                return 0;
            }
            AvisoFueraDeVentana.Tipo tipo = numero == 1
                ? AvisoFueraDeVentana.Tipo.RECORDATORIO_1 : AvisoFueraDeVentana.Tipo.RECORDATORIO_2;
            Map<String, String> vars = new LinkedHashMap<>();
            vars.put("enlace", appUrl + "/c/" + e.getCodigo());
            EnvioConversacion.Resultado r = envio.enviar(s, cuenta, tipo, texto(e, numero), vars, ahora);
            if (r != EnvioConversacion.Resultado.ENVIADO) return 0;
            if (numero == 1) estado.registrarRecordatorio(e.getId());
            else estado.registrarRecordatorioCheckout(e.getId(), ahoraCr);
            return 1;
        } catch (RuntimeException ex) {
            log.warn("[seguimiento] no se pudo procesar un recordatorio: {}", ex.getClass().getSimpleName());
            return 0;
        }
    }

    String texto(EnlaceCompra e, int numero) {
        String enlace = appUrl + "/c/" + e.getCodigo();
        String nombre = e.getNombreCliente() == null || e.getNombreCliente().isBlank() ? "" : " " + e.getNombreCliente().trim();
        if (numero == 1) {
            return "Hola" + nombre + ", tu compra sigue guardada. Cuando quieras la completas aquí: " + enlace;
        }
        return "Hola" + nombre + ", vimos que dejaste tu compra a medias. Aquí puedes terminarla: " + enlace
            + " . Si algo no funcionó con el pago, escríbeme y te ayudo.";
    }

    private Map<UUID, ConversacionSesion> sesionesDe(List<EnlaceCompra> lista) {
        Set<UUID> ids = new HashSet<>();
        for (EnlaceCompra e : lista) ids.add(e.getChatSesionId());
        Map<UUID, ConversacionSesion> mapa = new HashMap<>();
        for (ConversacionSesion s : sesiones.findAllById(ids)) mapa.put(s.getId(), s);
        return mapa;
    }

    private Map<Long, CanalCuenta> cuentasDe(Map<UUID, ConversacionSesion> sesionPorId) {
        Set<Long> ids = new HashSet<>();
        for (ConversacionSesion s : sesionPorId.values()) {
            if (s.getCanalCuentaId() != null) ids.add(s.getCanalCuentaId());
        }
        Map<Long, CanalCuenta> mapa = new HashMap<>();
        for (CanalCuenta c : cuentas.findAllById(ids)) mapa.put(c.getId(), c);
        return mapa;
    }

    private Set<ListaBajasAgente.Contacto> bajasDe(java.util.Collection<ConversacionSesion> lista) {
        List<ListaBajasAgente.Contacto> contactos = new ArrayList<>();
        for (ConversacionSesion s : lista) {
            contactos.add(new ListaBajasAgente.Contacto(s.getEmpresaId(), s.getCanal(), s.getContactoExterno()));
        }
        return bajas.getIfAvailable(() -> ListaBajasAgente.NINGUNA).dadosDeBaja(contactos);
    }
}
