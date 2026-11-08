package com.hotclick.service;

import com.hotclick.model.Empresa;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.Timestamp;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.Locale;

/**
 * Concesión QA de un solo uso para el alta {@value #CORREO_FIXTURE} como PYME a cobro TEST.
 *
 * <p>Apagada por defecto. El correo, un query param o un campo del registro no la encienden: hace falta el flag de
 * servidor, un perfil que sea solo dev o test, y llaves ONVO de prueba sin ambigüedad. Prod, staging, sin perfil,
 * llave live, llave vacía o publishable que no sea de prueba dejan la fila intacta.
 *
 * <p>La migración no inserta la fila. Se crea al consumir o al revocar, y solo con la puerta abierta. El alta queda
 * ligada a {@code empresa_id}. Un error de SQL no se convierte en «no aplica»: en PostgreSQL la transacción ya quedó
 * abortada, así que se relanza y el alta se revierte.
 */
@Service
public class QaAltaPymeTestService {

    static final String CORREO_FIXTURE = "qa.sim.alta20261108@hotclick.test";
    static final String PLAN_DESTINO = "PYME";
    /** 30-nov-2026 23:59:59, hora de Costa Rica. Vive en código: la migración no siembra la fecha ni el correo. */
    static final LocalDateTime VENCE = LocalDateTime.of(2026, 11, 30, 23, 59, 59);
    private static final String PREFIJO_SECRET_TEST = "onvo_test_";
    private static final String MARCA_LIVE = "onvo_live_";
    private static final String FALLO_BD = "No se pudo aplicar la excepción QA";

    private static final String SQL_CONSUMIR =
        "UPDATE hot_click_qa_alta_pyme_test_tb SET estado = 'CONSUMIDO', consumido_en = ? "
            + "WHERE id = 1 AND correo_normalizado = ? AND estado = 'DISPONIBLE' AND revocado_en IS NULL AND vence_en > ?";
    private static final String SQL_EXPIRAR =
        "UPDATE hot_click_qa_alta_pyme_test_tb SET estado = 'EXPIRADO' "
            + "WHERE id = 1 AND estado = 'DISPONIBLE' AND revocado_en IS NULL AND vence_en <= ?";
    private static final String SQL_INSERTAR =
        "INSERT INTO hot_click_qa_alta_pyme_test_tb "
            + "(id, correo_normalizado, plan_destino, estado, vence_en, consumido_en) "
            + "SELECT 1, ?, 'PYME', 'CONSUMIDO', ?, ? "
            + "WHERE NOT EXISTS (SELECT 1 FROM hot_click_qa_alta_pyme_test_tb WHERE id = 1)";
    private static final String SQL_REVOCAR =
        "UPDATE hot_click_qa_alta_pyme_test_tb SET estado = 'REVOCADO', revocado_en = ? "
            + "WHERE id = 1 AND estado = 'DISPONIBLE' AND revocado_en IS NULL";
    private static final String SQL_INSERTAR_REVOCADA =
        "INSERT INTO hot_click_qa_alta_pyme_test_tb "
            + "(id, correo_normalizado, plan_destino, estado, vence_en, revocado_en) "
            + "SELECT 1, ?, 'PYME', 'REVOCADO', ?, ? "
            + "WHERE NOT EXISTS (SELECT 1 FROM hot_click_qa_alta_pyme_test_tb WHERE id = 1)";
    private static final String SQL_VINCULAR =
        "UPDATE hot_click_qa_alta_pyme_test_tb SET empresa_id = ? "
            + "WHERE id = 1 AND correo_normalizado = ? AND estado = 'CONSUMIDO' AND empresa_id IS NULL AND revocado_en IS NULL";
    private static final String SQL_COBRO =
        "SELECT COUNT(*) FROM hot_click_qa_alta_pyme_test_tb "
            + "WHERE empresa_id = ? AND estado = 'CONSUMIDO' AND revocado_en IS NULL AND plan_destino = 'PYME'";

    private static final Logger log = LoggerFactory.getLogger(QaAltaPymeTestService.class);
    private static final String NO_SE_PUDO_LIGAR = "No se pudo ligar la excepción QA al negocio";

    private final JdbcTemplate jdbc;
    private final Environment environment;
    private final boolean habilitado;
    private final String secretKey;
    private final String publishableKey;
    private final Clock clock;

    @Autowired
    public QaAltaPymeTestService(JdbcTemplate jdbc, Environment environment,
                                 @Value("${hotclick.qa.alta-pyme-test.habilitado:false}") boolean habilitado,
                                 @Value("${onvo.secret-key:}") String secretKey,
                                 @Value("${onvo.publishable-key:}") String publishableKey) {
        this(jdbc, environment, habilitado, secretKey, publishableKey, Clock.system(Constants.ZONA_CR));
    }

    QaAltaPymeTestService(JdbcTemplate jdbc, Environment environment, boolean habilitado,
                          String secretKey, String publishableKey, Clock clock) {
        this.jdbc = jdbc;
        this.environment = environment;
        this.habilitado = habilitado;
        this.secretKey = secretKey == null ? "" : secretKey;
        this.publishableKey = publishableKey == null ? "" : publishableKey;
        this.clock = clock;
    }

    public boolean esCorreoDelFixture(String correo) {
        return CORREO_FIXTURE.equals(normalizar(correo));
    }

    /**
     * Toma el único uso si la puerta está abierta y no venció. Si ya hay fila {@code DISPONIBLE}, la pasa a
     * {@code CONSUMIDO}. Si no hay fila, la inserta ya consumida. Una segunda llamada no escribe.
     * Un error de SQL se relanza: no se sigue el alta normal sobre una transacción abortada.
     */
    public boolean consumirSiAplica(String correo) {
        if (!esCorreoDelFixture(correo) || !puertaAbierta()) return false;
        try {
            return consumirEnBd(normalizar(correo), ahora());
        } catch (DataAccessException ex) {
            log.warn("[qa-alta-pyme-test] no se pudo consumir — {}", ex.getClass().getSimpleName());
            throw new IllegalStateException(FALLO_BD);
        }
    }

    /**
     * Cierra el uso antes de consumirlo. Sin fila y con la puerta cerrada no escribe (prod no gana el correo).
     * No deshace un consumo ya comprometido. No es un endpoint. Un error de SQL se relanza.
     */
    public boolean revocar() {
        try {
            return revocarEnBd(ahora());
        } catch (DataAccessException ex) {
            log.warn("[qa-alta-pyme-test] no se pudo revocar — {}", ex.getClass().getSimpleName());
            throw new IllegalStateException(FALLO_BD);
        }
    }

    /** Liga la fila ya consumida al negocio creado en la misma transacción. Si no liga, el alta se revierte. */
    public void vincular(Long empresaId, String correo) {
        if (empresaId == null || !esCorreoDelFixture(correo)) {
            throw new IllegalStateException(NO_SE_PUDO_LIGAR);
        }
        if (filasVinculo(empresaId, normalizar(correo)) != 1) throw new IllegalStateException(NO_SE_PUDO_LIGAR);
    }

    /**
     * true solo con la puerta abierta y la fila consumida ligada a este {@code empresa_id}. Otro id, aunque repita el
     * correo, no hereda la excepción. Si la tabla no responde, falla: aprobar no publica ni asigna trial a ciegas.
     */
    public boolean empresaConCobroPymeTest(Empresa empresa) {
        if (empresa == null || empresa.getId() == null || !puertaAbierta()) return false;
        try {
            Integer n = jdbc.queryForObject(SQL_COBRO, Integer.class, empresa.getId());
            return n != null && n == 1;
        } catch (DataAccessException ex) {
            log.warn("[qa-alta-pyme-test] no se pudo leer la concesión — {}", ex.getClass().getSimpleName());
            throw new IllegalStateException(FALLO_BD);
        }
    }

    private boolean consumirEnBd(String clave, Timestamp ahora) {
        if (vencido(ahora)) {
            jdbc.update(SQL_EXPIRAR, ahora);
            return false;
        }
        if (jdbc.update(SQL_CONSUMIR, ahora, clave, ahora) == 1) {
            log.info("[qa-alta-pyme-test] concesión de un uso consumida");
            return true;
        }
        Timestamp vence = Timestamp.valueOf(VENCE);
        if (jdbc.update(SQL_INSERTAR, clave, vence, ahora) == 1) {
            log.info("[qa-alta-pyme-test] concesión de un uso consumida");
            return true;
        }
        return false;
    }

    private boolean revocarEnBd(Timestamp ahora) {
        if (jdbc.update(SQL_REVOCAR, ahora) == 1) return true;
        if (!puertaAbierta()) return false;
        return jdbc.update(SQL_INSERTAR_REVOCADA, CORREO_FIXTURE, Timestamp.valueOf(VENCE), ahora) == 1;
    }

    private boolean vencido(Timestamp ahora) {
        return !ahora.before(Timestamp.valueOf(VENCE));
    }

    static boolean perfilLocalNoAmbiguo(Environment environment) {
        if (environment == null) return false;
        String[] activos = environment.getActiveProfiles();
        if (activos.length == 0) return false;
        for (String perfil : activos) {
            if (!perfilLocal(perfil)) return false;
        }
        return true;
    }

    /** Secret {@code onvo_test_} con cuerpo, y publishable de prueba. Vacío, live o mezcla no pasan. */
    static boolean onvoTestSinAmbiguedad(String secret, String publishable) {
        String s = secret == null ? "" : secret.trim();
        String p = publishable == null ? "" : publishable.trim();
        if (!s.startsWith(PREFIJO_SECRET_TEST) || s.length() == PREFIJO_SECRET_TEST.length()) return false;
        if (s.toLowerCase(Locale.ROOT).contains(MARCA_LIVE)) return false;
        boolean publicaTest = p.startsWith(PREFIJO_SECRET_TEST) || p.startsWith("pk_test");
        boolean publicaLive = p.startsWith(MARCA_LIVE) || p.startsWith("pk_live");
        return publicaTest && !publicaLive;
    }

    static String normalizar(String correo) {
        if (correo == null) return "";
        return correo.trim().toLowerCase(Locale.ROOT);
    }

    private boolean puertaAbierta() {
        return habilitado && perfilLocalNoAmbiguo(environment) && onvoTestSinAmbiguedad(secretKey, publishableKey);
    }

    private int filasVinculo(Long empresaId, String clave) {
        try {
            return jdbc.update(SQL_VINCULAR, empresaId, clave);
        } catch (DataAccessException ex) {
            log.warn("[qa-alta-pyme-test] no se pudo ligar — {}", ex.getClass().getSimpleName());
            throw new IllegalStateException(NO_SE_PUDO_LIGAR);
        }
    }

    private Timestamp ahora() {
        return Timestamp.valueOf(LocalDateTime.ofInstant(clock.instant(), Constants.ZONA_CR));
    }

    private static boolean perfilLocal(String perfil) {
        if (perfil == null) return false;
        String n = perfil.trim().toLowerCase(Locale.ROOT);
        return "dev".equals(n) || "test".equals(n);
    }
}
