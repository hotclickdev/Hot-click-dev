package com.hotclick.service.retiro;

import com.hotclick.model.Pedido;
import com.hotclick.model.PedidoRetiroToken;
import com.hotclick.repository.PedidoItemRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.repository.PedidoRetiroTokenRepository;
import com.hotclick.service.PedidoService;
import com.hotclick.utils.Constants;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * QR de retiro en tienda de un pedido ya pagado (flujo del comprador por Telegram).
 * El token es opaco (32 bytes aleatorios) y el QR solo contiene {@code https://{app.url}/r/{token}}:
 * nombre, teléfono, productos, precios y dirección viven en el servidor. Un solo uso, vigencia
 * {@value #HORAS_VIGENCIA_POR_DEFECTO} h desde el pago confirmado.
 */
@Service
public class PedidoRetiroTokenService {

    private static final Logger log = LoggerFactory.getLogger(PedidoRetiroTokenService.class);
    public static final int HORAS_VIGENCIA_POR_DEFECTO = 4;
    private static final Pattern TOKEN_VALIDO = Pattern.compile("[A-Za-z0-9_-]{32,64}");
    private static final Pattern TOKEN_EN_URL = Pattern.compile("/r/([A-Za-z0-9_-]{32,64})(?:[/?#].*)?$");
    private static final SecureRandom RANDOM = new SecureRandom();

    @Autowired private PedidoRetiroTokenRepository tokenRepository;
    @Autowired private PedidoRepository pedidoRepository;
    @Autowired private PedidoService pedidoService;
    @Autowired private PedidoItemRepository itemRepository;
    @Autowired private ApplicationEventPublisher eventos;

    @Value("${app.url:http://localhost:8080}")
    private String appUrl;

    @Value("${telegram.comprador.retiro-horas:" + HORAS_VIGENCIA_POR_DEFECTO + "}")
    private int horasVigencia = HORAS_VIGENCIA_POR_DEFECTO;

    /** Resultado del canje: sin datos del pedido cuando no es válido (no filtra qué falló). */
    public record Canje(boolean valido, String numeroPedido, String comprador, List<Linea> items) {
        public record Linea(String producto, int cantidad) {}
        static Canje invalido() { return new Canje(false, null, null, List.of()); }
    }

    /** Estado público mínimo del token (página /r/{token}): sin ítems ni datos personales. */
    public record InfoPublica(String estado, String tienda) {}

    public static String nuevoToken() {
        byte[] b = new byte[32];
        RANDOM.nextBytes(b);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(b);
    }

    public static boolean formatoValido(String token) {
        return token != null && TOKEN_VALIDO.matcher(token).matches();
    }

    /** Acepta el token solo o la URL completa del QR; null si no tiene el formato esperado. */
    public static String extraerToken(String entrada) {
        if (entrada == null) return null;
        String t = entrada.trim();
        if (formatoValido(t)) return t;
        Matcher m = TOKEN_EN_URL.matcher(t);
        return m.find() ? m.group(1) : null;
    }

    public String urlPublica(String token) {
        String base = appUrl == null ? "" : appUrl.replaceAll("/+$", "");
        return base + "/r/" + token;
    }

    /** Idempotente: un pedido tiene un solo token. La vigencia corre desde ahora (= pago confirmado). */
    @Transactional
    public PedidoRetiroToken emitir(Pedido pedido) {
        return emitirGrupo(List.of(pedido)).get(0);
    }

    /** Un token por pedido del grupo en una lectura y una escritura en lote (sin consultas por pedido). */
    @Transactional
    public List<PedidoRetiroToken> emitirGrupo(List<Pedido> pedidos) {
        List<PedidoRetiroToken> existentes = tokenRepository.findByPedidoIdIn(RetiroTokenMapeos.ids(pedidos));
        List<PedidoRetiroToken> nuevos = RetiroTokenMapeos.faltantes(
            pedidos, existentes, LocalDateTime.now(Constants.ZONA_CR), horasVigencia);
        if (nuevos.isEmpty()) return existentes;
        List<PedidoRetiroToken> todos = new java.util.ArrayList<>(existentes);
        todos.addAll(tokenRepository.saveAll(nuevos));
        return todos;
    }

    /**
     * Canje atómico: el UPDATE condicional (PENDIENTE, vigente, misma empresa) decide; solo el ganador ve los ítems.
     * Si marcar el pedido como entregado falla, todo se revierte y el QR sigue vigente.
     */
    @Transactional
    public Canje canjear(String entrada, Long empresaCajeroId, Long usuarioId) {
        String token = extraerToken(entrada);
        if (token == null || empresaCajeroId == null) return Canje.invalido();
        int filas = tokenRepository.canjear(token, empresaCajeroId, usuarioId, LocalDateTime.now(Constants.ZONA_CR));
        if (filas != 1) return Canje.invalido();
        PedidoRetiroToken t = tokenRepository.findByToken(token).orElseThrow();
        Pedido pedido = pedidoRepository.findById(t.getPedidoId()).orElseThrow();
        if (!empresaCajeroId.equals(pedido.getEmpresaId())) {
            throw new IllegalStateException("Pedido de otra empresa"); // no debería pasar: revierte el canje
        }
        Pedido entregado = pedidoService.cambiarEstado(pedido.getId(), Constants.PEDIDO_ENTREGADO, null);
        List<Canje.Linea> lineas = RetiroTokenMapeos.lineas(itemRepository.findConProductoByPedidoId(entregado.getId()));
        log.info("[retiro-qr] pedido {} entregado por QR", entregado.getNumeroPedido());
        return new Canje(true, entregado.getNumeroPedido(), entregado.getClienteNombre(), lineas);
    }

    @Transactional(readOnly = true)
    public InfoPublica infoPublica(String token) {
        if (!formatoValido(token)) return new InfoPublica("INVALIDO", null);
        Optional<PedidoRetiroToken> t = tokenRepository.findByToken(token);
        if (t.isEmpty()) return new InfoPublica("INVALIDO", null);
        String estado = t.get().getEstado();
        if (PedidoRetiroToken.PENDIENTE.equals(estado)
                && !t.get().getExpira().isAfter(LocalDateTime.now(Constants.ZONA_CR))) {
            estado = PedidoRetiroToken.VENCIDO;
        }
        Pedido pedido = pedidoRepository.findById(t.get().getPedidoId()).orElse(null);
        String tienda = pedido == null ? null : com.hotclick.utils.EmpresaNombre.mostrar(pedido.getEmpresa(), "HotClick");
        return new InfoPublica(estado, tienda);
    }

    @Scheduled(fixedRate = 10 * 60 * 1000)
    @SchedulerLock(name = "retiro_token_vencidos", lockAtMostFor = "PT5M", lockAtLeastFor = "PT30S")
    @Transactional
    public void barridoVencidos() {
        int n = marcarVencidos(LocalDateTime.now(Constants.ZONA_CR));
        if (n > 0) log.info("[retiro-qr] {} QR de retiro vencidos (el stock ya cobrado no se libera)", n);
    }

    /**
     * Solo vence el QR: el stock de un pedido pagado ya se consumió y el pedido sigue pagado (se entrega en tienda igual).
     * Publica {@link RetiroVencidoEvent} para avisar al comprador DESPUÉS del commit; un fallo del aviso no revierte el VENCIDO.
     * Un segundo barrido ya no encuentra esos QR PENDIENTES, así que no vuelve a avisar.
     */
    @Transactional
    public int marcarVencidos(LocalDateTime ahora) {
        List<Long> pedidoIds = tokenRepository.findPedidoIdsVencidos(ahora);
        int n = tokenRepository.marcarVencidos(ahora);
        if (n > 0 && !pedidoIds.isEmpty()) eventos.publishEvent(new RetiroVencidoEvent(pedidoIds));
        return n;
    }
}
