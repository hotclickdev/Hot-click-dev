package com.hotclick.service.contador;

import com.hotclick.utils.Constants;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

/**
 * Ventas de HotClick según sus comprobantes electrónicos aceptados por Hacienda (solo producción, en colones). Una sola
 * consulta agrupada por mes: no hay una consulta por mes ni por negocio. Las notas de crédito restan.
 */
@Service
public class VentasFiscalesService {

    /** Totales de un mes: base sin IVA, IVA cobrado y cantidad de comprobantes. */
    public record VentasMes(int mes, long base, long iva, long comprobantes) {}

    private static final String SQL = """
        SELECT EXTRACT(MONTH FROM fecha_emision)::int AS mes,
               COALESCE(SUM(CASE WHEN tipo = '03' THEN -COALESCE(total_neto, 0) ELSE COALESCE(total_neto, 0) END), 0),
               COALESCE(SUM(CASE WHEN tipo = '03' THEN -COALESCE(total_impuesto, 0) ELSE COALESCE(total_impuesto, 0) END), 0),
               COUNT(*)
          FROM hot_click_comprobante_fiscal_tb
         WHERE fk_id_empresa = ?
           AND estado = 'ACEPTADO'
           AND ambiente = 'PROD'
           AND tipo IN ('01', '02', '03', '04')
           AND (moneda IS NULL OR moneda = 'CRC')
           AND fecha_emision >= ? AND fecha_emision < ?
         GROUP BY 1
         ORDER BY 1
        """;

    private final JdbcTemplate jdbc;

    public VentasFiscalesService(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    /** Hasta 12 filas (los meses sin ventas no aparecen). */
    public List<VentasMes> delAnio(int anio) {
        // La empresa es siempre la plataforma: el Contador nunca lee comprobantes de otro negocio.
        return jdbc.query(SQL, (rs, i) -> new VentasMes(rs.getInt(1), rs.getLong(2), rs.getLong(3), rs.getLong(4)),
            Constants.EMPRESA_PLATAFORMA_ID, LocalDate.of(anio, 1, 1).atStartOfDay(), LocalDate.of(anio + 1, 1, 1).atStartOfDay());
    }

    public VentasMes mes(int anio, int mes) {
        return delAnio(anio).stream().filter(v -> v.mes() == mes).findFirst().orElse(new VentasMes(mes, 0, 0, 0));
    }

    public static long totalBase(List<VentasMes> v) { return v.stream().mapToLong(VentasMes::base).sum(); }
}
