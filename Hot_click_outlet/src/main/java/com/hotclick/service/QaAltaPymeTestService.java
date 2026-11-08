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
 * <p>El uso es un {@code UPDATE} condicionado dentro de la transacción del alta. Si esa transacción se revierte, la
 * fila vuelve a {@code DISPONIBLE} y el reintento puede tomarla. Un segundo commit no puede.
 */
@Service
public class QaAltaPymeTestService {

    static final String CORREO_FIXTURE = "qa.sim.alta20261108@hotclick.test";
    static final String PLAN_DESTINO = "PYME";
    private static final String PREFIJO_SECRET_TEST = "onvo_test_";
    private static final String MARCA_LIVE = "onvo_live_";

    private static final String SQL_CONSUMIR =
        "UPDATE hot_click_qa_alta_pyme_test_tb SET estado = 'CONSUMIDO', consumido_en = ? "
            + "WHERE correo_normalizado = ? AND estado = 'DISPONIBLE' AND revocado_en IS NULL AND vence_en > ?";
    private static final String SQL_EXPIRAR =
        "UPDATE hot_click_qa_alta_pyme_test_tb SET estado = 'EXPIRADO' "
            + "WHERE correo_normalizado = ? AND estado = 'DISPONIBLE' AND revocado_en IS NULL AND vence_en <= ?";
    private static final String SQL_REVOCAR =
        "UPDATE hot_click_qa_alta_pyme_test_tb SET estado = 'REVOCADO', revocado_en = ? "
            + "WHERE correo_normalizado = ? AND estado = 'DISPONIBLE' AND revocado_en IS NULL";
    private static final String SQL_VINCULAR =
        "UPDATE hot_click_qa_alta_pyme_test_tb SET empresa_id = ? "
            + "WHERE correo_normalizado = ? AND estado = 'CONSUMIDO' AND empresa_id IS NULL AND revocado_en IS NULL";
    private static final String SQL_COBRO =
        "SELECT COUNT(*) FROM hot_click_qa_alta_pyme_test_tb "
            + "WHERE correo_normalizado = ? AND estado = 'CONSUMIDO' AND revocado_en IS NULL AND plan_destino = 'PYME'";

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
     * Toma la fila si la puerta está abierta y sigue disponible, sin vencer y sin revocar. Si ya venció, la deja
     * {@code EXPIRADO} y no la consume. Cualquier otro fallo no escribe y devuelve false.
     */
    public boolean consumirSiAplica(String correo) {
        if (!esCorreoDelFixture(correo) || !puertaAbierta()) return false;
        String clave = normalizar(correo);
        Timestamp ahora = ahora();
        try {
            if (jdbc.update(SQL_CONSUMIR, ahora, clave, ahora) == 1) {
                log.info("[qa-alta-pyme-test] concesión de un uso consumida");
                return true;
            }
            jdbc.update(SQL_EXPIRAR, clave, ahora);
            return false;
        } catch (DataAccessException ex) {
            log.warn("[qa-alta-pyme-test] no se pudo consumir — {}", ex.getClass().getSimpleName());
            return false;
        }
    }

    /** Cierra la fila antes del uso. No deshace un consumo ya comprometido. No es un endpoint. */
    public boolean revocar() {
        try {
            return jdbc.update(SQL_REVOCAR, ahora(), CORREO_FIXTURE) == 1;
        } catch (DataAccessException ex) {
            log.warn("[qa-alta-pyme-test] no se pudo revocar — {}", ex.getClass().getSimpleName());
            return false;
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
     * true solo si este negocio es el fixture y la fila ya se consumió para PYME. Si la tabla no responde y el correo
     * es el del fixture, falla: aprobar no debe publicar ni asignar trial a ciegas.
     */
    public boolean empresaConCobroPymeTest(Empresa empresa) {
        if (empresa == null || !esCorreoDelFixture(empresa.getCorreoEmpresa())) return false;
        try {
            Integer n = jdbc.queryForObject(SQL_COBRO, Integer.class, normalizar(empresa.getCorreoEmpresa()));
            return n != null && n == 1;
        } catch (DataAccessException ex) {
            log.warn("[qa-alta-pyme-test] no se pudo leer la concesión — {}", ex.getClass().getSimpleName());
            throw new IllegalStateException("No se pudo verificar la excepción QA");
        }
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
