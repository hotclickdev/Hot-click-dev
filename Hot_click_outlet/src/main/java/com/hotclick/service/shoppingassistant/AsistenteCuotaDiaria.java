package com.hotclick.service.shoppingassistant;

import com.hotclick.rag.dto.AccionChat;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.security.ClientIpResolver;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

/**
 * Cupo diario del asistente de IA, ANTES de llamar al modelo (chat SSE, chat del asistente de compras
 * y búsqueda por imagen). Tres topes por día calendario de America/Costa_Rica:
 * <ol>
 *   <li><b>Cliente</b> (20): usuario autenticado, si no el visitorId UUID válido, si no la IP.</li>
 *   <li><b>Negocio</b> según plan: Emprendedor 100, Pyme 300, Negocio Plus 1000; sin plan o plan
 *       desconocido cuenta como Emprendedor. El marketplace tiene su propio tope.</li>
 *   <li><b>Global</b> (3000).</li>
 * </ol>
 * Atómico (un UPDATE condicional por tope, sin pasarse del límite), fail-closed (cualquier error niega)
 * y, si un tope posterior rechaza, devuelve los cupos ya tomados. Todo se configura con
 * {@code asistente.cuota.*}. No consume créditos IA del plan.
 */
@Component
public class AsistenteCuotaDiaria {

    private static final Logger log = LoggerFactory.getLogger(AsistenteCuotaDiaria.class);

    public enum Motivo { CLIENTE, NEGOCIO, GLOBAL, ERROR }

    /** Resultado de reservar; si no se permite, trae el mensaje y los botones listos para el cliente. */
    public record Reserva(boolean permitida, Motivo motivo, String mensaje, List<AccionChat> acciones) {
        public static final Reserva OK = new Reserva(true, null, null, List.of());
    }

    static final String CLAVE_GLOBAL = "g";
    static final String PLAN_EMPRENDEDOR = "EMPRENDEDOR";
    private static final int MAX_CLAVE = 120;

    private static final String TOMAR =
        "UPDATE hot_click_asistente_cuota_dia_tb SET usos = usos + 1 WHERE clave = ? AND dia = ? AND usos < ?";
    private static final String CREAR =
        "INSERT INTO hot_click_asistente_cuota_dia_tb (clave, dia, usos) VALUES (?, ?, 1)";
    private static final String DEVOLVER =
        "UPDATE hot_click_asistente_cuota_dia_tb SET usos = usos - 1 WHERE clave = ? AND dia = ? AND usos > 0";
    private static final String PURGAR =
        "DELETE FROM hot_click_asistente_cuota_dia_tb WHERE dia < ?";

    private final JdbcTemplate jdbc;
    private final EmpresaRepository empresas;
    private final ClientIpResolver ips;
    private final Clock reloj;
    private final int porCliente;
    private final int emprendedor;
    private final int pyme;
    private final int negocioPlus;
    private final int marketplace;
    private final int global;
    private final AsistenteLimiteMensaje aviso;

    @Autowired
    public AsistenteCuotaDiaria(JdbcTemplate jdbc, EmpresaRepository empresas, ClientIpResolver ips,
            @Value("${asistente.cuota.zona:America/Costa_Rica}") String zona,
            @Value("${asistente.cuota.cliente-dia:20}") int porCliente,
            @Value("${asistente.cuota.plan.emprendedor:100}") int emprendedor,
            @Value("${asistente.cuota.plan.pyme:300}") int pyme,
            @Value("${asistente.cuota.plan.negocio-plus:1000}") int negocioPlus,
            @Value("${asistente.cuota.marketplace-dia:1000}") int marketplace,
            @Value("${asistente.cuota.global-dia:3000}") int global,
            @Value("${hotclick.soporte.telefono:}") String telefonoSoporte,
            @Value("${asistente.cuota.mensaje-cliente:Llegaste al límite de consultas con el asistente por hoy. "
                + "Mañana, desde la medianoche, podés seguir conversando con él. Mientras tanto, podés buscar productos "
                + "por tu cuenta.}") String mensajeCliente,
            @Value("${asistente.cuota.mensaje-agotado:Nuestro asistente alcanzó su límite de consultas de hoy. "
                + "Podés seguir buscando productos y mañana volvemos a conversar.}")
            String mensajeAgotado) {
        this(jdbc, empresas, ips, Clock.system(zonaSegura(zona)), porCliente, emprendedor, pyme, negocioPlus,
            marketplace, global, new AsistenteLimiteMensaje(empresas, telefonoSoporte, mensajeCliente, mensajeAgotado));
    }

    AsistenteCuotaDiaria(JdbcTemplate jdbc, EmpresaRepository empresas, ClientIpResolver ips, Clock reloj,
                         int porCliente, int emprendedor, int pyme, int negocioPlus, int marketplace, int global,
                         AsistenteLimiteMensaje aviso) {
        this.jdbc = jdbc;
        this.empresas = empresas;
        this.ips = ips;
        this.reloj = reloj;
        this.porCliente = Math.max(0, porCliente);
        this.emprendedor = Math.max(0, emprendedor);
        this.pyme = Math.max(0, pyme);
        this.negocioPlus = Math.max(0, negocioPlus);
        this.marketplace = Math.max(0, marketplace);
        this.global = Math.max(0, global);
        this.aviso = aviso;
    }

    private static ZoneId zonaSegura(String zona) {
        try {
            return ZoneId.of(zona == null || zona.isBlank() ? "America/Costa_Rica" : zona.trim());
        } catch (RuntimeException e) {
            return ZoneId.of("America/Costa_Rica");
        }
    }

    /**
     * Reserva un cupo para esta consulta. {@code empresaId} null o {@code marketplace} = asistente global.
     * Si no se permite, la reserva trae el aviso y los botones; no se llama al modelo.
     */
    public Reserva reservar(Long empresaId, boolean esMarketplace, String visitorId) {
        LocalDate dia = LocalDate.now(reloj);
        String cliente = "c:" + claveCliente(visitorId);
        String negocio = esMarketplace || empresaId == null ? "n:marketplace" : "n:" + empresaId;
        int topeNegocio = esMarketplace || empresaId == null ? marketplace : topePlan(empresaId);
        boolean clienteTomado = false;
        boolean negocioTomado = false;
        try {
            if (!tomar(cliente, dia, porCliente)) return negar(Motivo.CLIENTE, empresaId, esMarketplace);
            clienteTomado = true;
            if (!tomar(negocio, dia, topeNegocio)) {
                devolver(cliente, dia);
                return negar(Motivo.NEGOCIO, empresaId, esMarketplace);
            }
            negocioTomado = true;
            if (!tomar(CLAVE_GLOBAL, dia, global)) {
                devolver(negocio, dia);
                devolver(cliente, dia);
                log.warn("[asistente-cuota] Tope GLOBAL diario alcanzado ({}). Revisar abuso/costo.", global);
                return negar(Motivo.GLOBAL, empresaId, esMarketplace);
            }
            return Reserva.OK;
        } catch (RuntimeException e) {
            log.warn("[asistente-cuota] Error verificando cupo empresa={} → fail-closed: {}",
                empresaId, e.getClass().getName());
            if (negocioTomado) devolver(negocio, dia);
            if (clienteTomado) devolver(cliente, dia);
            return negar(Motivo.ERROR, empresaId, esMarketplace);
        }
    }

    private Reserva negar(Motivo motivo, Long empresaId, boolean esMarketplace) {
        List<AccionChat> acciones;
        try {
            acciones = aviso.acciones(empresaId, esMarketplace);
        } catch (RuntimeException e) {
            acciones = List.of(new AccionChat(AccionChat.BUSCAR, "Buscar productos", "/productos"));
        }
        return new Reserva(false, motivo, aviso.mensaje(motivo), acciones);
    }

    /** Tope diario del negocio según su plan efectivo; sin plan o desconocido = Emprendedor. */
    int topePlan(Long empresaId) {
        String plan = null;
        try {
            plan = empresas.findNombrePlanEfectivo(empresaId).orElse(null);
        } catch (RuntimeException e) {
            log.debug("[asistente-cuota] Sin plan de empresa={}: {}", empresaId, e.getClass().getName());
        }
        String norm = plan == null ? PLAN_EMPRENDEDOR : plan.trim().toUpperCase(Locale.ROOT).replace(' ', '_');
        return switch (norm) {
            case "PYME" -> pyme;
            case "NEGOCIO_PLUS" -> negocioPlus;
            default -> emprendedor;
        };
    }

    /** Usuario autenticado (hash del nombre), si no visitorId UUID válido, si no la IP. */
    String claveCliente(String visitorId) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !(auth instanceof AnonymousAuthenticationToken)
            && auth.getName() != null && !auth.getName().isBlank()) {
            return "u:" + sha256(auth.getName()).substring(0, 32);
        }
        String uuid = uuidValido(visitorId);
        if (uuid != null) return "v:" + uuid;
        String ip = "desconocida";
        RequestAttributes attrs = RequestContextHolder.getRequestAttributes();
        if (attrs instanceof ServletRequestAttributes sra) {
            HttpServletRequest req = sra.getRequest();
            String resuelta = ips.resolve(req);
            if (resuelta != null && !resuelta.isBlank()) ip = resuelta.trim();
        }
        String clave = "ip:" + ip;
        return clave.length() <= MAX_CLAVE - 2 ? clave : "ip:" + sha256(ip).substring(0, 32);
    }

    static String uuidValido(String visitorId) {
        if (visitorId == null || visitorId.length() != 36) return null;
        try {
            return UUID.fromString(visitorId).toString().equalsIgnoreCase(visitorId)
                ? visitorId.toLowerCase(Locale.ROOT) : null;
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private static String sha256(String s) {
        try {
            return HexFormat.of().formatHex(
                MessageDigest.getInstance("SHA-256").digest(s.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    /** true si sumó un uso sin pasar el tope. Propaga cualquier error de BD. */
    boolean tomar(String clave, LocalDate dia, int tope) {
        if (tope <= 0) return false;
        LocalDate fecha = dia;
        if (jdbc.update(TOMAR, clave, fecha, tope) > 0) return true;
        try {
            jdbc.update(CREAR, clave, fecha);
            if (CLAVE_GLOBAL.equals(clave)) purgarAnteriores(fecha);
            return true;
        } catch (DataIntegrityViolationException existe) {
            // La fila ya existía (o la creó otra petición a la vez): se intenta sumar; 0 filas = tope alcanzado.
            return jdbc.update(TOMAR, clave, fecha, tope) > 0;
        }
    }

    private void devolver(String clave, LocalDate dia) {
        try {
            jdbc.update(DEVOLVER, clave, dia);
        } catch (RuntimeException e) {
            log.debug("[asistente-cuota] No se pudo devolver cupo: {}", e.getClass().getName());
        }
    }

    private void purgarAnteriores(LocalDate hoy) {
        try {
            jdbc.update(PURGAR, hoy);
        } catch (RuntimeException e) {
            log.debug("[asistente-cuota] No se pudo limpiar días anteriores: {}", e.getClass().getName());
        }
    }
}
