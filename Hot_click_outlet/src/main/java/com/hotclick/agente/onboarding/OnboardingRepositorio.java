package com.hotclick.agente.onboarding;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

/**
 * Lecturas por lote para el acompañamiento de negocios nuevos (AG-40). Sin consultas por fila: una para los leads
 * de negocio abiertos, una para las empresas registradas en el mismo período y una escritura por lote para marcar
 * CONVERTIDO. Solo lee teléfonos ya normalizados a dígitos y nunca los registra.
 */
@Repository
public class OnboardingRepositorio {

    /** Lead de negocio de HotClick (empresa null) con la conversación donde nació. */
    public record LeadNegocio(long id, UUID sesionId, String estado, LocalDateTime creadoEn) {
        @Override
        public String toString() {
            return "LeadNegocio[id=" + id + ", estado=" + estado + "]";
        }
    }

    /** Empresa registrada; {@code telefonos} son los dígitos de su WhatsApp y de su teléfono. Sin datos en toString. */
    public record EmpresaNueva(long id, String whatsappDigitos, String telefonoDigitos, LocalDateTime registradaEn) {
        @Override
        public String toString() {
            return "EmpresaNueva[id=" + id + "]";
        }
    }

    private final JdbcTemplate jdbc;

    public OnboardingRepositorio(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<LeadNegocio> leadsNegocio(LocalDateTime desde, int limite) {
        return jdbc.query(
            "SELECT id_lead, fk_id_chat_sesion, estado, creado_en FROM hot_click_lead_tb "
                + "WHERE tipo = 'NEGOCIO' AND fk_id_empresa IS NULL AND estado <> 'DESCARTADO' "
                + "AND fk_id_chat_sesion IS NOT NULL AND creado_en >= ? ORDER BY id_lead DESC LIMIT ?",
            (rs, i) -> new LeadNegocio(rs.getLong(1), (UUID) rs.getObject(2), rs.getString(3),
                rs.getTimestamp(4).toLocalDateTime()),
            java.sql.Timestamp.valueOf(desde), limite);
    }

    public List<EmpresaNueva> empresasDesde(LocalDateTime desde, int limite) {
        return jdbc.query(
            "SELECT id_empresa, regexp_replace(COALESCE(numero_whatsapp, ''), '\\D', '', 'g'), "
                + "regexp_replace(COALESCE(telefono_empresa, ''), '\\D', '', 'g'), fecha_registro "
                + "FROM hot_click_empresa_tb WHERE fecha_registro >= ? ORDER BY id_empresa LIMIT ?",
            (rs, i) -> new EmpresaNueva(rs.getLong(1), rs.getString(2), rs.getString(3),
                rs.getTimestamp(4).toLocalDateTime()),
            java.sql.Timestamp.valueOf(desde), limite);
    }

    /** CONVERTIDO solo desde NUEVO o CONTACTADO; un DESCARTADO o ya CONVERTIDO no cambia. */
    public int marcarConvertidos(Collection<Long> ids) {
        if (ids == null || ids.isEmpty()) return 0;
        Long[] arr = ids.toArray(new Long[0]);
        return jdbc.update(con -> {
            var ps = con.prepareStatement("UPDATE hot_click_lead_tb SET estado = 'CONVERTIDO', actualizado_en = NOW() "
                + "WHERE id_lead = ANY (?) AND estado IN ('NUEVO', 'CONTACTADO')");
            ps.setArray(1, con.createArrayOf("bigint", arr));
            return ps;
        });
    }
}
