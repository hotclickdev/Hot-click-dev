package com.hotclick.agente.interno;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.agente.canal.CanalCuenta;
import com.hotclick.agente.canal.CanalMensajeria;
import com.hotclick.dto.AccionPropuestaTelegram;
import com.hotclick.model.Usuario;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.service.telegram.TelegramFlujoSupport;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Optional;

/**
 * Trabajo del modo interno que no pasa por el motor ni por Claude: canje del código de vinculación, PIN y
 * confirmación de acciones. Corre fuera del hilo del webhook (el hash del PIN es lento a propósito). Ni el
 * código, ni el PIN, ni el teléfono se registran en logs.
 */
@Component
public class ProcesadorInterno {

    private static final Logger log = LoggerFactory.getLogger(ProcesadorInterno.class);

    static final Duration ESPERA_PIN = Duration.ofMinutes(5);

    static final String MSG_VINCULADO = "Listo: este teléfono quedó vinculado. Ahora podés consultar tu negocio por acá. "
        + "Para finanzas y acciones, definí primero tu PIN en el panel.";
    static final String MSG_CODIGO_INVALIDO = "Ese código no es válido. Generá uno nuevo en el panel.";
    static final String MSG_CODIGO_VENCIDO = "Ese código venció. Generá uno nuevo en el panel.";
    static final String MSG_USUARIO_INACTIVO = "Tu usuario ya no pertenece al equipo del negocio.";
    static final String MSG_TELEFONO_EN_USO = "Este teléfono ya está vinculado a otro usuario del negocio.";
    static final String MSG_SIN_VINCULO = "Este teléfono ya no está vinculado. Generá un código nuevo en el panel.";
    static final String MSG_SIN_PIN = "Todavía no tenés PIN. Definilo en el panel (Configuración, bot interno) y repetí la acción.";
    static final String MSG_PEDIR_PIN_ACCION = "Para ejecutar la acción enviame tu PIN (4 a 6 dígitos). No lo compartas con nadie.";
    static final String MSG_NADA_PENDIENTE = "No tengo nada pendiente de confirmar.";
    static final String MSG_BLOQUEADO = "Superaste los intentos de PIN. Quedó bloqueado por 15 minutos.";
    static final String MSG_PIN_OK_FINANZAS = "PIN verificado, vale por 15 minutos. Repetime la consulta de finanzas.";
    static final String MSG_CANCELADA = "Listo, cancelé la acción.";
    static final String MSG_SIN_PERMISO = "Solo el propietario o un administrador puede hacer cambios desde este canal.";

    private final VinculacionInternaService vinculaciones;
    private final PinInternoService pins;
    private final AccionPropuestaEjecutor ejecutor;
    private final BitacoraAgente bitacora;
    private final UsuarioRepository usuarios;
    private final TelegramFlujoSupport permisos;
    private final CanalMensajeria mensajeria;
    private final ObjectMapper mapper;

    public ProcesadorInterno(VinculacionInternaService vinculaciones, PinInternoService pins,
                             AccionPropuestaEjecutor ejecutor, BitacoraAgente bitacora, UsuarioRepository usuarios,
                             TelegramFlujoSupport permisos, CanalMensajeria mensajeria, ObjectMapper mapper) {
        this.vinculaciones = vinculaciones;
        this.pins = pins;
        this.ejecutor = ejecutor;
        this.bitacora = bitacora;
        this.usuarios = usuarios;
        this.permisos = permisos;
        this.mensajeria = mensajeria;
        this.mapper = mapper;
    }

    @Async("taskExecutor")
    public void activar(CanalCuenta cuenta, String remitente, String codigo) {
        VinculacionInternaService.Activacion r = vinculaciones.activar(cuenta.getEmpresaId(), remitente, codigo);
        enviar(cuenta, remitente, switch (r) {
            case OK -> MSG_VINCULADO;
            case CODIGO_INVALIDO -> MSG_CODIGO_INVALIDO;
            case VENCIDO -> MSG_CODIGO_VENCIDO;
            case USUARIO_INACTIVO -> MSG_USUARIO_INACTIVO;
            case TELEFONO_EN_USO -> MSG_TELEFONO_EN_USO;
        });
    }

    /** El usuario respondió SÍ a una propuesta. Sin PIN vigente se lo pide; con PIN vigente ejecuta. */
    @Async("taskExecutor")
    public void confirmar(CanalCuenta cuenta, String remitente) {
        Optional<AgenteVinculacion> opt = vinculaciones.vinculacionActiva(cuenta.getEmpresaId(), remitente);
        if (opt.isEmpty()) { enviar(cuenta, remitente, MSG_SIN_VINCULO); return; }
        AgenteVinculacion v = opt.get();
        if (!AgenteVinculacion.PEND_CONFIRMAR.equals(v.getPendienteTipo()) || !v.pendienteVigente(vinculaciones.ahora())) {
            enviar(cuenta, remitente, MSG_NADA_PENDIENTE);
            return;
        }
        if (v.getPinHash() == null) {
            vinculaciones.limpiarPendiente(v.getId());
            enviar(cuenta, remitente, MSG_SIN_PIN);
            return;
        }
        if (v.pinVigente(vinculaciones.ahora())) {
            ejecutarPendiente(cuenta, remitente, v);
        } else {
            vinculaciones.guardarPendiente(v.getId(), AgenteVinculacion.PEND_PIN_ACCION, v.getPendienteJson(), ESPERA_PIN);
            enviar(cuenta, remitente, MSG_PEDIR_PIN_ACCION);
        }
    }

    @Async("taskExecutor")
    public void cancelar(CanalCuenta cuenta, String remitente) {
        vinculaciones.vinculacionActiva(cuenta.getEmpresaId(), remitente).ifPresent(v -> {
            AccionPropuestaTelegram a = leer(v.getPendienteJson());
            vinculaciones.limpiarPendiente(v.getId());
            bitacora.registrar(v.getEmpresaId(), v.getUsuarioId(), a == null ? "ACCION" : a.tipo(),
                AgenteAccion.CANCELADA, a == null ? null : a.entidadId());
        });
        enviar(cuenta, remitente, MSG_CANCELADA);
    }

    /** Mensaje con 4 a 6 dígitos mientras hay una espera de PIN. El texto del PIN no se guarda en ningún lado. */
    @Async("taskExecutor")
    public void pin(CanalCuenta cuenta, String remitente, String pin) {
        Optional<AgenteVinculacion> opt = vinculaciones.vinculacionActiva(cuenta.getEmpresaId(), remitente);
        if (opt.isEmpty()) { enviar(cuenta, remitente, MSG_SIN_VINCULO); return; }
        AgenteVinculacion v = opt.get();
        PinInternoService.Verificacion r = pins.verificar(v.getId(), pin);
        switch (r.resultado()) {
            case BLOQUEADO -> {
                vinculaciones.limpiarPendiente(v.getId());
                bitacora.registrar(v.getEmpresaId(), v.getUsuarioId(), "PIN", AgenteAccion.RECHAZADA, null);
                enviar(cuenta, remitente, MSG_BLOQUEADO);
            }
            case SIN_PIN -> {
                vinculaciones.limpiarPendiente(v.getId());
                enviar(cuenta, remitente, MSG_SIN_PIN);
            }
            case INCORRECTO -> enviar(cuenta, remitente,
                "PIN incorrecto. Te quedan " + r.intentosRestantes() + " intento(s).");
            case OK -> {
                AgenteVinculacion actual = vinculaciones.porId(v.getId());
                if (AgenteVinculacion.PEND_PIN_ACCION.equals(actual.getPendienteTipo())
                        && actual.pendienteVigente(vinculaciones.ahora())) {
                    ejecutarPendiente(cuenta, remitente, actual);
                } else {
                    vinculaciones.limpiarPendiente(v.getId());
                    enviar(cuenta, remitente, MSG_PIN_OK_FINANZAS);
                }
            }
        }
    }

    private void ejecutarPendiente(CanalCuenta cuenta, String remitente, AgenteVinculacion v) {
        AccionPropuestaTelegram a = leer(v.getPendienteJson());
        vinculaciones.limpiarPendiente(v.getId()); // de un solo uso: una confirmación, una ejecución
        if (a == null) { enviar(cuenta, remitente, MSG_NADA_PENDIENTE); return; }
        Usuario u = usuarios.findById(v.getUsuarioId()).orElse(null);
        // Defensa en profundidad: el rol se revalida al ejecutar, no solo al proponer.
        if (u == null || !permisos.esPropietarioOAdmin(u, v.getEmpresaId())) {
            bitacora.registrar(v.getEmpresaId(), v.getUsuarioId(), a.tipo(), AgenteAccion.RECHAZADA, a.entidadId());
            enviar(cuenta, remitente, MSG_SIN_PERMISO);
            return;
        }
        AccionPropuestaEjecutor.Resultado r = ejecutor.ejecutar(a, v.getEmpresaId(), u.getCorreo());
        bitacora.registrar(v.getEmpresaId(), v.getUsuarioId(), a.tipo(),
            r.aplicada() ? AgenteAccion.EJECUTADA : AgenteAccion.ERROR, a.entidadId());
        enviar(cuenta, remitente, (r.aplicada() ? "Hecho. " : "") + r.mensaje());
    }

    private AccionPropuestaTelegram leer(String json) {
        if (json == null) return null;
        try {
            return mapper.readValue(json, AccionPropuestaTelegram.class);
        } catch (JsonProcessingException e) {
            return null;
        }
    }

    private void enviar(CanalCuenta cuenta, String destinatario, String texto) {
        try {
            mensajeria.enviarTexto(cuenta, destinatario, texto);
        } catch (RuntimeException e) {
            log.warn("[agente-interno] no se pudo responder ({})", e.getClass().getSimpleName());
        }
    }
}
