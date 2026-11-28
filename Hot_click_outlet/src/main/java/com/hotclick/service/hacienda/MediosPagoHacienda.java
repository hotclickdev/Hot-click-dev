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
 * HotClick solo cobra con ONVO (tarjeta o SINPE Móvil) y, en el POS, efectivo o transferencia: como mucho 4 códigos,
 * el máximo de MedioPago que admite el esquema.
 */
public final class MediosPagoHacienda {

    private static final Logger log = LoggerFactory.getLogger(MediosPagoHacienda.class);

    public static final String EFECTIVO = "01";
    public static final String TARJETA = "02";
    public static final String TRANSFERENCIA = "04";
    public static final String SINPE_MOVIL = "06";

    /** Un MedioPago del XML. {@code otros} queda para el código 99, que HotClick no usa hoy. */
    public record Medio(String codigo, String otros, long monto) { }

    private MediosPagoHacienda() { }

    /** Código Hacienda de un método de pago interno, o null si no se reconoce. */
    public static String codigoDe(String metodo) {
        if (metodo == null || metodo.isBlank()) return null;
        return switch (metodo.trim().toUpperCase(Locale.ROOT)) {
            case "EFECTIVO", "CASH" -> EFECTIVO;
            case "TARJETA", "ONVO", "CARD" -> TARJETA;
            case "TRANSFERENCIA", "DEPOSITO" -> TRANSFERENCIA;
            case "SINPE", "SINPE_MOVIL" -> SINPE_MOVIL;
            default -> null;
        };
    }

    /**
     * Arma los MedioPago de una compra (uno o varios paquetes) cuya suma es exactamente {@code total}.
     * Cada paquete aporta su método; el total se reparte entre paquetes en proporción a {@code totalPedido}.
     * Método desconocido: 01 y warning sin datos personales. Salen ordenados de mayor a menor monto.
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
            if (parte > 0) porCodigo.merge(codigoPedido(p), parte, Long::sum);
        }
        if (porCodigo.isEmpty()) {
            return List.of(new Medio(EFECTIVO, null, total));
        }
        return agrupar(porCodigo);
    }

    private static List<Medio> agrupar(Map<String, Long> porCodigo) {
        List<Map.Entry<String, Long>> orden = new ArrayList<>(porCodigo.entrySet());
        orden.sort((x, y) -> Long.compare(y.getValue(), x.getValue()));
        List<Medio> out = new ArrayList<>();
        for (var e : orden) out.add(new Medio(e.getKey(), null, e.getValue()));
        return out;
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
