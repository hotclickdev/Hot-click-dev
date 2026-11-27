package com.hotclick.service.hacienda;

import com.hotclick.model.Pedido;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Medio de pago del comprobante Hacienda 4.4 (TipoMedioPago, MedioPagoOtros, TotalMedioPago).
 * Códigos verificados contra el XSD v4.4 del repo: 01 efectivo, 02 tarjeta, 03 cheque, 04 transferencia,
 * 05 recaudado por terceros, 06 SINPE Móvil, 07 plataforma digital, 99 otros (exige MedioPagoOtros, 3 a 100 caracteres).
 * El esquema admite como máximo 4 MedioPago.
 */
public final class MediosPagoHacienda {

    private static final Logger log = LoggerFactory.getLogger(MediosPagoHacienda.class);

    public static final String EFECTIVO = "01";
    public static final String TARJETA = "02";
    public static final String TRANSFERENCIA = "04";
    public static final String SINPE_MOVIL = "06";
    public static final String PLATAFORMA_DIGITAL = "07";
    public static final String OTROS = "99";
    public static final int MAX_MEDIOS = 4;

    static final String DESCRIPCION_GIFT_CARD = "Gift card HotClick";
    static final String DESCRIPCION_AGRUPADO = "Otros medios de pago";

    /** Un MedioPago del XML. {@code otros} solo se llena para el código 99. */
    public record Medio(String codigo, String otros, long monto) { }

    private MediosPagoHacienda() { }

    /** Código Hacienda de un método de pago interno, o null si no se reconoce. */
    public static String codigoDe(String metodo) {
        if (metodo == null || metodo.isBlank()) return null;
        return switch (metodo.trim().toUpperCase(Locale.ROOT)) {
            case "EFECTIVO", "CASH" -> EFECTIVO;
            case "TARJETA", "ONVO", "STRIPE", "CARD" -> TARJETA;
            case "TRANSFERENCIA", "DEPOSITO" -> TRANSFERENCIA;
            case "SINPE", "SINPE_MOVIL" -> SINPE_MOVIL;
            case "PAYPAL" -> PLATAFORMA_DIGITAL;
            case "GIFT_CARD" -> OTROS;
            default -> null;
        };
    }

    /**
     * Arma los MedioPago de una compra (uno o varios paquetes) cuya suma es exactamente {@code total}.
     * Cada paquete aporta su método (y su gift card como 99); el total se reparte entre paquetes en proporción a
     * {@code totalPedido}. Método desconocido: 01 y warning sin datos personales. Más de 4 medios: se conservan los
     * 3 de mayor monto y el resto se agrupa en 99 "Otros medios de pago".
     */
    public static List<Medio> de(List<Pedido> pedidos, long total) {
        if (pedidos == null || pedidos.isEmpty() || total <= 0) {
            return List.of(new Medio(EFECTIVO, null, Math.max(total, 0)));
        }
        long pesoTotal = 0;
        for (Pedido p : pedidos) pesoTotal += pesoDe(p);

        Map<String, Long> porCodigo = new LinkedHashMap<>();
        long asignado = 0;
        for (int i = 0; i < pedidos.size(); i++) {
            Pedido p = pedidos.get(i);
            long parte;
            if (i == pedidos.size() - 1) {
                parte = total - asignado;
            } else if (pesoTotal > 0) {
                parte = Math.round((double) total * pesoDe(p) / pesoTotal);
            } else {
                parte = total / pedidos.size();
            }
            parte = Math.max(0, Math.min(parte, total - asignado));
            asignado += parte;

            long gc = p.getGiftCardMonto() == null ? 0 : Math.min(Math.max(p.getGiftCardMonto(), 0), parte);
            if (gc > 0) porCodigo.merge(OTROS, gc, Long::sum);
            long resto = parte - gc;
            if (resto > 0) porCodigo.merge(codigoPedido(p), resto, Long::sum);
        }
        if (porCodigo.isEmpty()) {
            return List.of(new Medio(EFECTIVO, null, total));
        }
        return agrupar(porCodigo);
    }

    private static List<Medio> agrupar(Map<String, Long> porCodigo) {
        List<Map.Entry<String, Long>> orden = new ArrayList<>(porCodigo.entrySet());
        orden.sort((a, b) -> Long.compare(b.getValue(), a.getValue()));
        List<Medio> out = new ArrayList<>();
        if (orden.size() <= MAX_MEDIOS) {
            for (var e : orden) out.add(medio(e.getKey(), e.getValue()));
            return out;
        }
        long agrupado = porCodigo.getOrDefault(OTROS, 0L);
        int conservados = 0;
        for (var e : orden) {
            if (OTROS.equals(e.getKey())) continue;
            if (conservados < MAX_MEDIOS - 1) {
                out.add(new Medio(e.getKey(), null, e.getValue()));
                conservados++;
            } else {
                agrupado += e.getValue();
            }
        }
        out.add(new Medio(OTROS, DESCRIPCION_AGRUPADO, agrupado));
        return out;
    }

    private static Medio medio(String codigo, long monto) {
        return OTROS.equals(codigo) ? new Medio(OTROS, DESCRIPCION_GIFT_CARD, monto) : new Medio(codigo, null, monto);
    }

    private static String codigoPedido(Pedido p) {
        String codigo = codigoDe(p.getMetodoPago());
        if (codigo == null) {
            log.warn("Medio de pago no reconocido para el comprobante; se declara efectivo (01). metodo={}",
                saneado(p.getMetodoPago()));
            return EFECTIVO;
        }
        return codigo;
    }

    private static long pesoDe(Pedido p) {
        return p.getTotalPedido() == null ? 0 : Math.max(p.getTotalPedido(), 0);
    }

    /** Solo el nombre técnico del método (sin PII); recorta y limpia saltos de línea. */
    private static String saneado(String s) {
        if (s == null) return "null";
        String limpio = s.replaceAll("[^A-Za-z0-9_-]", "_");
        return limpio.length() > 30 ? limpio.substring(0, 30) : limpio;
    }
}
