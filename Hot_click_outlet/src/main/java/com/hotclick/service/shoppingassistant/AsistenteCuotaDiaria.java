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
 * Además, topes por red para que un tercero no vacíe el cupo rotando identidades:
 * <ul>
 *   <li><b>IP</b> (60): la IP exacta (IPv6: su /64). Rotar visitorId desde la misma red no da más
 *       consultas que esto (el visitorId solo distingue personas detrás de un mismo NAT).</li>
 *   <li><b>Subred</b> (200): /24 en IPv4, /48 en IPv6, contra la rotación de IPs vecinas.</li>
 *   <li><b>Subred × negocio</b> (40): una sola subred no puede agotar el cupo de un negocio por su slug.</li>
 * </ul>
 * Un tope de red en 0 o negativo lo desactiva. Sin IP conocida (o no literal) todo ese tráfico
 * comparte un solo tope ({@code ip-desconocida-dia}, MEDIO-2), para que no esquive los topes de red.
 * Las llaves de red y de cliente por IP ({@code r:}, {@code s:}, {@code rn:}, {@code c:ip:}) guardan
 * un HMAC-SHA256 de la red, nunca la IP en claro. Los prefijos (/24 IPv4; /64 y /48 IPv6) se configuran.
 * Al llegar al tope global se registra una ALERTA (log ERROR, una vez por día; Sentry la levanta) y
 * otra al pasar {@code alerta-global-porcentaje} del tope; ninguna lleva IP ni visitorId.
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

    private static final String TOMAR =
        "UPDATE hot_click_asistente_cuota_dia_tb SET usos = usos + 1 WHERE clave = ? AND dia = ? AND usos < ?";
    private static final String CREAR =
        "INSERT INTO hot_click_asistente_cuota_dia_tb (clave, dia, usos) VALUES (?, ?, 1)";
    private static final String DEVOLVER =
        "UPDATE hot_click_asistente_cuota_dia_tb SET usos = usos - 1 WHERE clave = ? AND dia = ? AND usos > 0";
    private static final String USOS =
        "SELECT usos FROM hot_click_asistente_cuota_dia_tb WHERE clave = ? AND dia = ?";
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
    private final TopesRed red;
    private final java.util.concurrent.atomic.AtomicReference<LocalDate> alertaGlobalEnviada =
        new java.util.concurrent.atomic.AtomicReference<>();

    private final java.util.concurrent.atomic.AtomicReference<LocalDate> alertaPorcentajeEnviada =
        new java.util.concurrent.atomic.AtomicReference<>();

    /**
     * Topes por red; un valor &lt;= 0 desactiva ese tope. {@code sal} es la clave del HMAC de las IPs
     * (no se imprime en toString).
     */
    record TopesRed(int porIp, int porSubred, int porSubredNegocio, boolean alertaGlobal,
                    int porIpDesconocida, int prefijoV4Subred, int prefijoV6Ip, int prefijoV6Subred,
                    int alertaPorcentaje, String sal) {
        static final TopesRed DESACTIVADOS = new TopesRed(0, 0, 0, true);

        TopesRed(int porIp, int porSubred, int porSubredNegocio, boolean alertaGlobal) {
            this(porIp, porSubred, porSubredNegocio, alertaGlobal, 0, 24, 64, 48, 0, "");
        }

        TopesRed {
            prefijoV4Subred = Math.max(8, Math.min(32, prefijoV4Subred));
            prefijoV6Ip = Math.max(16, Math.min(128, prefijoV6Ip));
            prefijoV6Subred = Math.max(16, Math.min(prefijoV6Ip, prefijoV6Subred));
            alertaPorcentaje = Math.max(0, Math.min(99, alertaPorcentaje));
            sal = sal == null ? "" : sal;
        }

        @Override
        public String toString() {
            return "TopesRed[ip=" + porIp + ", subred=" + porSubred + ", subredNegocio=" + porSubredNegocio
                + ", ipDesconocida=" + porIpDesconocida + "]";
        }
    }

    @Autowired
    public AsistenteCuotaDiaria(JdbcTemplate jdbc, EmpresaRepository empresas, ClientIpResolver ips,
            @Value("${asistente.cuota.zona:America/Costa_Rica}") String zona,
            @Value("${asistente.cuota.cliente-dia:20}") int porCliente,
            @Value("${asistente.cuota.plan.emprendedor:100}") int emprendedor,
            @Value("${asistente.cuota.plan.pyme:300}") int pyme,
            @Value("${asistente.cuota.plan.negocio-plus:1000}") int negocioPlus,
            @Value("${asistente.cuota.marketplace-dia:1000}") int marketplace,
            @Value("${asistente.cuota.global-dia:3000}") int global,
            @Value("${asistente.cuota.ip-dia:60}") int porIp,
            @Value("${asistente.cuota.subred-dia:200}") int porSubred,
            @Value("${asistente.cuota.subred-negocio-dia:40}") int porSubredNegocio,
            @Value("${asistente.cuota.alerta-global:true}") boolean alertaGlobal,
            @Value("${asistente.cuota.ip-desconocida-dia:100}") int porIpDesconocida,
            @Value("${asistente.cuota.prefijo-v4-subred:24}") int prefijoV4Subred,
            @Value("${asistente.cuota.prefijo-v6-ip:64}") int prefijoV6Ip,
            @Value("${asistente.cuota.prefijo-v6-subred:48}") int prefijoV6Subred,
            @Value("${asistente.cuota.alerta-global-porcentaje:80}") int alertaPorcentaje,
            @Value("${asistente.cuota.sal-ip:${jwt.secret:}}") String salIp,
            @Value("${hotclick.soporte.telefono:}") String telefonoSoporte,
            @Value("${asistente.cuota.mensaje-cliente:Llegaste al límite de consultas con el asistente por hoy. "
                + "Mañana, desde la medianoche, podés seguir conversando con él. Mientras tanto, podés buscar productos "
                + "por tu cuenta.}") String mensajeCliente,
            @Value("${asistente.cuota.mensaje-agotado:Nuestro asistente alcanzó su límite de consultas de hoy. "
                + "Podés seguir buscando productos y mañana volvemos a conversar.}")
            String mensajeAgotado) {
        this(jdbc, empresas, ips, Clock.system(zonaSegura(zona)), porCliente, emprendedor, pyme, negocioPlus,
            marketplace, global, new AsistenteLimiteMensaje(empresas, telefonoSoporte, mensajeCliente, mensajeAgotado),
            new TopesRed(porIp, porSubred, porSubredNegocio, alertaGlobal,
                porIpDesconocida, prefijoV4Subred, prefijoV6Ip, prefijoV6Subred, alertaPorcentaje, salIp));
    }

    AsistenteCuotaDiaria(JdbcTemplate jdbc, EmpresaRepository empresas, ClientIpResolver ips, Clock reloj,
                         int porCliente, int emprendedor, int pyme, int negocioPlus, int marketplace, int global,
                         AsistenteLimiteMensaje aviso) {
        this(jdbc, empresas, ips, reloj, porCliente, emprendedor, pyme, negocioPlus, marketplace, global, aviso,
            TopesRed.DESACTIVADOS);
    }

    AsistenteCuotaDiaria(JdbcTemplate jdbc, EmpresaRepository empresas, ClientIpResolver ips, Clock reloj,
                         int porCliente, int emprendedor, int pyme, int negocioPlus, int marketplace, int global,
                         AsistenteLimiteMensaje aviso, TopesRed red) {
        this.red = red;
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
        // tenant-global-ok: empresaId es el negocio del chat (resuelto en el servidor); nulo = asistente del marketplace, con su propio contador
        String negocio = esMarketplace || empresaId == null ? "n:marketplace" : "n:" + empresaId;
        int topeNegocio = esMarketplace || empresaId == null ? marketplace : topePlan(empresaId);
        List<Tope> topes = topes(visitorId, negocio, topeNegocio);
        java.util.ArrayDeque<String> tomados = new java.util.ArrayDeque<>();
        try {
            for (Tope t : topes) {
                if (!tomar(t.clave(), dia, t.limite())) {
                    tomados.forEach(c -> devolver(c, dia));
                    if (t.motivo() == Motivo.GLOBAL) alertarGlobal(dia);
                    else if (t.clave().startsWith("r") || t.clave().startsWith("s:") || t.clave().startsWith("x:")) {
                        log.info("[asistente-cuota] Tope de red alcanzado ({}) empresa={}", t.clave().substring(0, t.clave().indexOf(':')), empresaId);
                    }
                    return negar(t.motivo(), empresaId, esMarketplace);
                }
                tomados.push(t.clave());
            }
            alertarPorcentaje(dia);
            return Reserva.OK;
        } catch (RuntimeException e) {
            log.warn("[asistente-cuota] Error verificando cupo empresa={} → fail-closed: {}",
                empresaId, e.getClass().getName());
            tomados.forEach(c -> devolver(c, dia));
            return negar(Motivo.ERROR, empresaId, esMarketplace);
        }
    }

    private record Tope(String clave, int limite, Motivo motivo) { }

    /** Orden: cliente, red (IP, subred, subred × negocio), negocio y global. */
    private List<Tope> topes(String visitorId, String negocio, int topeNegocio) {
        List<Tope> topes = new java.util.ArrayList<>();
        String ip = ipDelPedido();
        topes.add(new Tope("c:" + claveCliente(visitorId, ip), porCliente, Motivo.CLIENTE));
        String[] redes = redes(ip, red.prefijoV4Subred(), red.prefijoV6Ip(), red.prefijoV6Subred());
        if (redes != null) {
            if (red.porIp() > 0) topes.add(new Tope("r:" + huella(redes[0]), red.porIp(), Motivo.CLIENTE));
            if (red.porSubred() > 0) topes.add(new Tope("s:" + huella(redes[1]), red.porSubred(), Motivo.CLIENTE));
            if (red.porSubredNegocio() > 0) {
                topes.add(new Tope("rn:" + huella(redes[1] + "|" + negocio), red.porSubredNegocio(), Motivo.CLIENTE));
            }
        } else if (red.porIpDesconocida() > 0) {
            // MEDIO-2: sin IP utilizable, todo ese tráfico comparte un solo cupo (no esquiva los topes de red).
            topes.add(new Tope("x:desconocida", red.porIpDesconocida(), Motivo.CLIENTE));
        }
        topes.add(new Tope(negocio, topeNegocio, Motivo.NEGOCIO));
        topes.add(new Tope(CLAVE_GLOBAL, global, Motivo.GLOBAL));
        return topes;
    }

    /** Alerta (log ERROR, que Sentry recoge) la primera vez del día que se llega al tope global. */
    private void alertarGlobal(LocalDate dia) {
        LocalDate previo = alertaGlobalEnviada.getAndSet(dia);
        if (red.alertaGlobal() && !dia.equals(previo)) {
            log.error("[ALERTA][asistente-cuota] Tope GLOBAL diario alcanzado ({}) el {}. Posible abuso o pico de costo: "
                + "revisar el panel de IA y los topes asistente.cuota.*", global, dia);
        } else {
            log.warn("[asistente-cuota] Tope GLOBAL diario alcanzado ({}).", global);
        }
    }

    /** Aviso temprano (log WARN, una vez por día) al pasar el porcentaje configurado del tope global. */
    private void alertarPorcentaje(LocalDate dia) {
        int pct = red.alertaPorcentaje();
        if (pct <= 0 || global <= 0 || dia.equals(alertaPorcentajeEnviada.get())) return;
        try {
            List<Integer> r = jdbc.queryForList(USOS, Integer.class, CLAVE_GLOBAL, dia);
            int usos = r.isEmpty() || r.get(0) == null ? 0 : r.get(0);
            if ((long) usos * 100 >= (long) global * pct && !dia.equals(alertaPorcentajeEnviada.getAndSet(dia))) {
                log.error("[ALERTA][asistente-cuota] El asistente ya usó {}% del tope GLOBAL diario ({} de {}) el {}. "
                    + "Revisar el panel de IA por posible abuso.", pct, usos, global, dia);
            }
        } catch (RuntimeException e) {
            log.debug("[asistente-cuota] No se pudo leer el uso global: {}", e.getClass().getName());
        }
    }

    /** true si ya se alertó el porcentaje del tope global hoy (tests). */
    boolean alertaPorcentajeEnviadaHoy() {
        return LocalDate.now(reloj).equals(alertaPorcentajeEnviada.get());
    }

    /** true si ya se alertó el tope global hoy (tests). */
    boolean alertaGlobalEnviadaHoy() {
        return LocalDate.now(reloj).equals(alertaGlobalEnviada.get());
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
        return claveCliente(visitorId, ipDelPedido());
    }

    private String claveCliente(String visitorId, String ipPedido) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !(auth instanceof AnonymousAuthenticationToken)
            && auth.getName() != null && !auth.getName().isBlank()) {
            return "u:" + sha256(auth.getName()).substring(0, 32);
        }
        String uuid = uuidValido(visitorId);
        if (uuid != null) return "v:" + uuid;
        String ip = ipPedido != null ? ipPedido : "desconocida";
        return "ip:" + huella(ip);
    }

    /**
     * Huella de una IP o red para las llaves: HMAC-SHA256 con {@code asistente.cuota.sal-ip}
     * (por defecto el secreto JWT), 32 hex. Sin sal, SHA-256 con etiqueta (solo tests).
     */
    String huella(String valor) {
        String etiqueta = "asistente-cuota|" + valor;
        if (red.sal().isEmpty()) return sha256(etiqueta).substring(0, 32);
        try {
            javax.crypto.Mac mac = javax.crypto.Mac.getInstance("HmacSHA256");
            mac.init(new javax.crypto.spec.SecretKeySpec(red.sal().getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(etiqueta.getBytes(StandardCharsets.UTF_8))).substring(0, 32);
        } catch (java.security.GeneralSecurityException e) {
            throw new IllegalStateException(e);
        }
    }

    /** IP del pedido HTTP en curso (ClientIpResolver: solo confía en proxies conocidos) o null. */
    private String ipDelPedido() {
        try {
            RequestAttributes attrs = RequestContextHolder.getRequestAttributes();
            if (attrs instanceof ServletRequestAttributes sra) {
                HttpServletRequest req = sra.getRequest();
                String resuelta = ips.resolve(req);
                if (resuelta != null && !resuelta.isBlank()) return resuelta.trim();
            }
        } catch (RuntimeException e) {
            log.debug("[asistente-cuota] Sin IP del pedido: {}", e.getClass().getName());
        }
        return null;
    }

    private static final java.util.regex.Pattern IPV4 =
        java.util.regex.Pattern.compile("^(\\d{1,3})\\.(\\d{1,3})\\.(\\d{1,3})\\.(\\d{1,3})$");
    private static final java.util.regex.Pattern IPV6 = java.util.regex.Pattern.compile("^[0-9a-fA-F:.]{2,45}$");

    /**
     * [red de la IP, subred] o null si no es una IP literal: IPv4 → (/32, /24); IPv6 → (/64, /48),
     * porque un solo cliente IPv6 suele tener un /64 entero para rotar.
     */
    static String[] redes(String ip) {
        return redes(ip, 24, 64, 48);
    }

    /** Igual que {@link #redes(String)} con prefijos configurables (subred IPv4; IP y subred IPv6). */
    static String[] redes(String ip, int v4Subred, int v6Ip, int v6Subred) {
        if (ip == null) return null;
        String limpia = ip.trim();
        java.util.regex.Matcher m4 = IPV4.matcher(limpia);
        if (m4.matches()) {
            int[] o = new int[4];
            for (int i = 0; i < 4; i++) {
                o[i] = Integer.parseInt(m4.group(i + 1));
                if (o[i] > 255) return null;
            }
            String ip4 = o[0] + "." + o[1] + "." + o[2] + "." + o[3];
            if (v4Subred == 24) return new String[] { ip4, o[0] + "." + o[1] + "." + o[2] + ".0/24" };
            byte[] b4 = { (byte) o[0], (byte) o[1], (byte) o[2], (byte) o[3] };
            return new String[] { ip4, enmascarar(b4, v4Subred) + "/" + v4Subred };
        }
        if (!limpia.contains(":") || !IPV6.matcher(limpia).matches()) return null;
        try {
            // Literal ya validado (solo hex, ':' y '.'): getByName no resuelve DNS.
            byte[] b = java.net.InetAddress.getByName(limpia).getAddress();
            if (b.length == 4) {
                return redes((b[0] & 0xff) + "." + (b[1] & 0xff) + "." + (b[2] & 0xff) + "." + (b[3] & 0xff), v4Subred, v6Ip, v6Subred);
            }
            if (v6Ip == 64 && v6Subred == 48) return new String[] { prefijoV6(b, 4) + "::/64", prefijoV6(b, 3) + "::/48" };
            return new String[] { enmascarar(b, v6Ip) + "/" + v6Ip, enmascarar(b, v6Subred) + "/" + v6Subred };
        } catch (java.net.UnknownHostException | RuntimeException e) {
            return null;
        }
    }

    /** Representación hex de la dirección con solo los primeros {@code bits} (para llaves, no para mostrar). */
    private static String enmascarar(byte[] b, int bits) {
        byte[] m = b.clone();
        for (int i = 0; i < m.length; i++) {
            int resto = bits - i * 8;
            if (resto >= 8) continue;
            m[i] = resto <= 0 ? 0 : (byte) ((m[i] & 0xff) & ((0xff << (8 - resto)) & 0xff));
        }
        return HexFormat.of().formatHex(m);
    }

    private static String prefijoV6(byte[] b, int grupos) {
        StringBuilder sb = new StringBuilder();
        for (int g = 0; g < grupos; g++) {
            if (g > 0) sb.append(':');
            sb.append(Integer.toHexString(((b[2 * g] & 0xff) << 8) | (b[2 * g + 1] & 0xff)));
        }
        return sb.toString();
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
