package com.hotclick.agente.panel;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/** Acceso a hot_click_agente_config_tb (una fila por empresa). Toda consulta lleva la empresa. */
@Repository
public class AgenteConfigRepository {

    static final String TABLA = "hot_click_agente_config_tb";

    public record Fila(String nombreBot, String trato, boolean emojis, boolean activo, boolean horarioActivo,
                       String horarioJson, String mensajeFueraHorario) {}

    private final JdbcTemplate jdbc;

    public AgenteConfigRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Optional<Fila> buscar(Long empresaId) {
        return jdbc.query("SELECT nombre_bot, trato, emojis, activo, horario_activo, horario_json, mensaje_fuera_horario "
                + "FROM " + TABLA + " WHERE fk_id_empresa = ?",
            (rs, i) -> new Fila(rs.getString("nombre_bot"), rs.getString("trato"), rs.getBoolean("emojis"),
                rs.getBoolean("activo"), rs.getBoolean("horario_activo"), rs.getString("horario_json"),
                rs.getString("mensaje_fuera_horario")), empresaId).stream().findFirst();
    }

    public void guardar(Long empresaId, Fila f) {
        jdbc.update("INSERT INTO " + TABLA + " (fk_id_empresa, nombre_bot, trato, emojis, activo, horario_activo, "
                + "horario_json, mensaje_fuera_horario) VALUES (?,?,?,?,?,?,?,?) "
                + "ON CONFLICT (fk_id_empresa) DO UPDATE SET nombre_bot=EXCLUDED.nombre_bot, trato=EXCLUDED.trato, "
                + "emojis=EXCLUDED.emojis, activo=EXCLUDED.activo, horario_activo=EXCLUDED.horario_activo, "
                + "horario_json=EXCLUDED.horario_json, mensaje_fuera_horario=EXCLUDED.mensaje_fuera_horario, "
                + "actualizado_en=NOW()",
            empresaId, f.nombreBot(), f.trato(), f.emojis(), f.activo(), f.horarioActivo(), f.horarioJson(),
            f.mensajeFueraHorario());
    }
}
