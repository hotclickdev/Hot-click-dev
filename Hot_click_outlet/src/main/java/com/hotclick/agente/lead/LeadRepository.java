package com.hotclick.agente.lead;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Acceso a hot_click_lead_tb. Toda lectura lleva la empresa: {@code empresaId == null} significa los leads de
 * HotClick (fk_id_empresa NULL), nunca "todas las empresas".
 */
@Repository
public class LeadRepository {

    static final String TABLA = "hot_click_lead_tb";

    public record Fila(Long id, TipoLead tipo, Long empresaId, String canal, String ultimos4, String contactoCifrado,
                       String nombre, String tipoNegocio, String interes, EstadoLead estado, UUID sesionId,
                       LocalDateTime creadoEn) {
        /** Sin contacto (ni cifrado), nombre ni interés (AG-14 H-07). */
        @Override
        public String toString() {
            return "Fila[id=" + id + ", tipo=" + tipo + ", estado=" + estado + "]";
        }
    }

    private static final RowMapper<Fila> MAPPER = (rs, i) -> new Fila(
        rs.getLong("id_lead"), TipoLead.valueOf(rs.getString("tipo")), (Long) rs.getObject("fk_id_empresa"),
        rs.getString("canal"), rs.getString("contacto_ultimos4"), rs.getString("contacto_cifrado"),
        rs.getString("nombre"), rs.getString("tipo_negocio"), rs.getString("interes"),
        EstadoLead.valueOf(rs.getString("estado")), (UUID) rs.getObject("fk_id_chat_sesion"),
        rs.getTimestamp("creado_en").toLocalDateTime());

    private static final String COLS = "id_lead, tipo, fk_id_empresa, canal, contacto_ultimos4, contacto_cifrado, "
        + "nombre, tipo_negocio, interes, estado, fk_id_chat_sesion, creado_en";
    private static final String ALCANCE = "fk_id_empresa IS NOT DISTINCT FROM ?";

    private final JdbcTemplate jdbc;

    public LeadRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public long insertar(TipoLead tipo, Long empresaId, String canal, String hash, String ultimos4, String cifrado,
                         String nombre, String tipoNegocio, String interes, UUID sesionId) {
        KeyHolder kh = new GeneratedKeyHolder();
        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                "INSERT INTO " + TABLA + " (tipo, fk_id_empresa, canal, contacto_hash, contacto_ultimos4, "
                    + "contacto_cifrado, nombre, tipo_negocio, interes, fk_id_chat_sesion) VALUES (?,?,?,?,?,?,?,?,?,?)",
                Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, tipo.name());
            ps.setObject(2, empresaId);
            ps.setString(3, canal);
            ps.setString(4, hash);
            ps.setString(5, ultimos4);
            ps.setString(6, cifrado);
            ps.setString(7, nombre);
            ps.setString(8, tipoNegocio);
            ps.setString(9, interes);
            ps.setObject(10, sesionId);
            return ps;
        }, kh);
        Number id = kh.getKeys() == null ? null : (Number) kh.getKeys().get("id_lead");
        return id == null ? 0L : id.longValue();
    }

    /** Lead del mismo contacto, tipo y alcance creado desde {@code desde}: evita duplicados por insistencia. */
    public Optional<Long> buscarReciente(TipoLead tipo, Long empresaId, String hash, LocalDateTime desde) {
        List<Long> r = jdbc.queryForList(
            "SELECT id_lead FROM " + TABLA + " WHERE tipo = ? AND " + ALCANCE
                + " AND contacto_hash = ? AND creado_en >= ? ORDER BY creado_en DESC LIMIT 1",
            Long.class, tipo.name(), empresaId, hash, Timestamp.valueOf(desde));
        return r.stream().findFirst();
    }

    public void actualizarInteres(long id, String nombre, String tipoNegocio, String interes) {
        jdbc.update("UPDATE " + TABLA + " SET nombre = COALESCE(?, nombre), tipo_negocio = COALESCE(?, tipo_negocio), "
            + "interes = COALESCE(?, interes), actualizado_en = NOW() WHERE id_lead = ?",
            nombre, tipoNegocio, interes, id);
    }

    public List<Fila> listar(Long empresaId, TipoLead tipo, EstadoLead estado, int limite, int offset) {
        return jdbc.query(
            "SELECT " + COLS + " FROM " + TABLA + " WHERE " + ALCANCE
                + " AND (?::text IS NULL OR tipo = ?) AND (?::text IS NULL OR estado = ?)"
                + " ORDER BY creado_en DESC, id_lead DESC LIMIT ? OFFSET ?",
            MAPPER, empresaId, tipo == null ? null : tipo.name(), tipo == null ? null : tipo.name(),
            estado == null ? null : estado.name(), estado == null ? null : estado.name(), limite, offset);
    }

    /** Un lead solo si pertenece al alcance indicado; de otro alcance responde vacío (el controller da 404). */
    public Optional<Fila> obtener(long id, Long empresaId) {
        return jdbc.query("SELECT " + COLS + " FROM " + TABLA + " WHERE id_lead = ? AND " + ALCANCE,
            MAPPER, id, empresaId).stream().findFirst();
    }

    /** Id de una tienda aprobada y pública (misma regla del catálogo) por su slug; vacío si no existe o está oculta. */
    public Optional<Long> empresaPublicaPorSlug(String slug) {
        return jdbc.queryForList(
            "SELECT emp.id_empresa FROM hot_click_empresa_tb emp WHERE emp.slug = ? AND emp.estado_empresa = 'ACTIVO' "
                + "AND emp.visibilidad_publica = TRUE AND " + com.hotclick.catalogo.CatalogoPublicoGate.NATIVA_EMP,
            Long.class, slug).stream().findFirst();
    }
}
