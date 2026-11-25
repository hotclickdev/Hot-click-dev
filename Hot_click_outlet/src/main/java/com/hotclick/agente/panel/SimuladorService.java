package com.hotclick.agente.panel;

import com.hotclick.agente.motor.ContextoHerramienta;
import com.hotclick.agente.motor.MotorAgente;
import com.hotclick.agente.motor.OpcionesMotor;
import com.hotclick.agente.motor.PerfilAgente;
import com.hotclick.agente.motor.ResultadoAgente;
import com.hotclick.agente.motor.TurnoConversacion;
import com.hotclick.security.RateLimiter;
import com.hotclick.service.AiQuotaService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Simulador del panel (AG-22): prueba al bot de ventas del negocio sin efectos. No crea conversaciones, mensajes ni
 * pedidos, no envía nada a Meta (no usa el canal) y no puede crear enlaces de compra (herramienta excluida). Tiene
 * tope de uso por negocio y por usuario, y marca su consumo de IA como simulador.
 */
@Service
public class SimuladorService {

    private static final Logger log = LoggerFactory.getLogger(SimuladorService.class);

    static final int MENSAJE_MAX = 500;
    static final int HISTORIAL_MAX = 20;
    static final int TOPE_EMPRESA = 40;
    static final int TOPE_USUARIO = 20;
    static final int VENTANA_SEG = 600;
    /** Contacto ficticio: sin teléfono real, consultar_pedido no encuentra pedidos de nadie. */
    static final String CONTACTO_SIMULADO = "simulador";
    static final Set<String> SIN_HERRAMIENTAS = Set.of("crear_enlace_compra");

    public record Turno(String rol, String texto) {}

    public record Resultado(String texto, boolean pasoAPersona, String motivoFin, int tokensEntrada, int tokensSalida) {}

    /** Tope de uso alcanzado (429). */
    public static class LimiteSimuladorException extends RuntimeException {
        public LimiteSimuladorException() {
            super("Hiciste muchas pruebas seguidas. Esperá unos minutos y volvé a intentar.");
        }
    }

    private final MotorAgente motor;
    private final AgenteConfigService config;
    private final RateLimiter rateLimiter;
    private final AiQuotaService quota;

    public SimuladorService(MotorAgente motor, AgenteConfigService config, RateLimiter rateLimiter, AiQuotaService quota) {
        this.motor = motor;
        this.config = config;
        this.rateLimiter = rateLimiter;
        this.quota = quota;
    }

    public Resultado simular(Long empresaId, Long usuarioId, String mensaje, List<Turno> historial) {
        if (mensaje == null || mensaje.isBlank()) throw new IllegalArgumentException("Escribí un mensaje para probar");
        if (mensaje.length() > MENSAJE_MAX)
            throw new IllegalArgumentException("El mensaje admite hasta " + MENSAJE_MAX + " caracteres");
        // Fail-closed: es un tope de costo.
        if (!rateLimiter.tryAcquireEstricto("simulador:emp:" + empresaId, TOPE_EMPRESA, VENTANA_SEG)
            || !rateLimiter.tryAcquireEstricto("simulador:usr:" + usuarioId, TOPE_USUARIO, VENTANA_SEG)) {
            throw new LimiteSimuladorException();
        }
        ContextoHerramienta ctx = new ContextoHerramienta(empresaId, CONTACTO_SIMULADO, PerfilAgente.NEGOCIO_VENTAS);
        AgenteConfigDto cfg = config.obtener(empresaId);
        ResultadoAgente r = motor.ejecutar(PerfilAgente.NEGOCIO_VENTAS, ctx, turnos(historial), mensaje.strip(),
            new OpcionesMotor(config.tonoDe(cfg), SIN_HERRAMIENTAS));
        try {
            quota.registrarSimulador(empresaId, r.iteraciones(),
                (long) r.tokensEntrada() + r.tokensSalida());
        } catch (RuntimeException e) {
            log.warn("[agente-simulador] no se pudo marcar el consumo empresa={} ({})", empresaId, e.getClass().getSimpleName());
        }
        return new Resultado(r.texto(), r.pasarAPersona(), r.motivoFin().name(), r.tokensEntrada(), r.tokensSalida());
    }

    static List<TurnoConversacion> turnos(List<Turno> historial) {
        List<TurnoConversacion> out = new ArrayList<>();
        if (historial == null) return out;
        int desde = Math.max(0, historial.size() - HISTORIAL_MAX);
        for (Turno t : historial.subList(desde, historial.size())) {
            if (t == null || t.texto() == null || t.texto().isBlank() || t.rol() == null) continue;
            String rol = t.rol().strip().toLowerCase(Locale.ROOT);
            out.add("usuario".equals(rol) ? TurnoConversacion.usuario(t.texto()) : TurnoConversacion.asistente(t.texto()));
        }
        return out;
    }
}
