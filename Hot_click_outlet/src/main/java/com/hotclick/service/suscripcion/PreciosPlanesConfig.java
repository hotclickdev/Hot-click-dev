package com.hotclick.service.suscripcion;

import com.hotclick.exception.PlanSinPrecioException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

/**
 * Precio mensual en USD por plan, leído SOLO de configuración (sin valores por defecto en código).
 * Si la propiedad viene vacía, el plan no tiene precio y quien lo pida recibe {@link PlanSinPrecioException}.
 */
@Component
public class PreciosPlanesConfig {

    private final BigDecimal emprendedor;
    private final BigDecimal pyme;
    private final BigDecimal negocioPlus;
    private final String moneda;

    /** Moneda en la que se cobran los planes: sale de {@code hotclick.planes.moneda}; vacía = sin moneda (fail-closed). */
    @Autowired
    public PreciosPlanesConfig(
            @Value("${hotclick.planes.emprendedor.precio-mensual-usd:}") String emprendedor,
            @Value("${hotclick.planes.pyme.precio-mensual-usd:}") String pyme,
            @Value("${hotclick.planes.negocio-plus.precio-mensual-usd:}") String negocioPlus,
            @Value("${hotclick.planes.moneda:}") String moneda) {
        this.emprendedor = parse(emprendedor);
        this.pyme = parse(pyme);
        this.negocioPlus = parse(negocioPlus);
        this.moneda = moneda == null || moneda.isBlank() ? null : moneda.trim().toLowerCase(Locale.ROOT);
    }

    /** Sin moneda configurada (solo precios): para quien no valida cobros de billing. */
    public PreciosPlanesConfig(String emprendedor, String pyme, String negocioPlus) {
        this(emprendedor, pyme, negocioPlus, null);
    }

    /** Moneda de cobro de los planes (minúsculas); vacío si no está configurada. */
    public Optional<String> moneda() {
        return Optional.ofNullable(moneda);
    }

    static BigDecimal parse(String v) {
        if (v == null || v.isBlank()) return null;
        try {
            BigDecimal d = new BigDecimal(v.trim());
            return d.signum() > 0 ? d : null; // 0 o negativo = sin precio
        } catch (NumberFormatException e) {
            return null; // valor mal escrito = sin precio (409), nunca 0
        }
    }

    public Optional<BigDecimal> precioUsd(String nombrePlan) {
        if (nombrePlan == null) return Optional.empty();
        return Optional.ofNullable(switch (nombrePlan.toUpperCase(Locale.ROOT)) {
            case "EMPRENDEDOR" -> emprendedor;
            case "PYME" -> pyme;
            case "NEGOCIO_PLUS" -> negocioPlus;
            default -> null;
        });
    }

    /**
     * Mensualidad USD que se puede PUBLICAR (catálogo /api/planes, /api/billing/planes, monto pendiente de una tienda
     * suspendida): es el mismo valor que {@link PrecioPlanOnvo} compara contra el price de ONVO, así lo publicado es lo
     * que ONVO cobra. Fail-closed: vacío si el precio falta, es 0/negativo o está mal escrito, y también si
     * {@code hotclick.planes.moneda} no es USD de forma explícita (vacía, nula u otra moneda): sin moneda confirmada no
     * se publica un monto en dólares. Nunca sale de la tabla plan (precio_usd viejo de V89/V105).
     */
    public Optional<BigDecimal> precioPublicoUsd(String nombrePlan) {
        if (!MONEDA_USD.equals(moneda)) return Optional.empty();
        return precioUsd(nombrePlan).filter(v -> v.signum() > 0);
    }

    static final String MONEDA_USD = "usd";

    /**
     * Catálogo de planes con precio (los mismos nombres que resuelve {@link #precioUsd}). {@code nombre} es UNIQUE en
     * hot_click_plan_tb, así que hay a lo sumo un plan activo por nombre: este tamaño es la cota exacta del listado.
     */
    public static final List<String> CATALOGO = List.of("EMPRENDEDOR", "PYME", "NEGOCIO_PLUS");

    /** Precio configurado y mayor que 0, o 409 PLAN_SIN_PRECIO (0 o negativo cuenta como sin precio). */
    public BigDecimal requerir(String nombrePlan) {
        return precioUsd(nombrePlan).filter(v -> v.signum() > 0)
            .orElseThrow(() -> new PlanSinPrecioException(nombrePlan));
    }
}
