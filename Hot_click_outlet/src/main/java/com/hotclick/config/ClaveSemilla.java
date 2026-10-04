package com.hotclick.config;

import java.security.SecureRandom;
import java.util.Arrays;
import java.util.Base64;
import java.util.Locale;
import java.util.Optional;
import java.util.function.UnaryOperator;

/**
 * Contraseñas de las cuentas sembradas (admin y cuentas QA de dev).
 *
 * <p>Ninguna cuenta sembrada tiene contraseña fija en el código: la clave sale de una
 * variable de entorno. En producción además tiene que ser fuerte; si falta o es débil,
 * el seeder no crea ni resetea la cuenta.
 */
final class ClaveSemilla {

    /** Variable preferida para la contraseña inicial del admin. */
    static final String ENV_ADMIN = "HOTCLICK_ADMIN_INITIAL_PASSWORD";
    /** Nombre anterior, se sigue aceptando para no romper los .env existentes. */
    static final String ENV_ADMIN_LEGADO = "ADMIN_DEFAULT_PASSWORD";
    /** Contraseña de las cuentas QA de dev ({@link QaCuentasSeeder}). */
    static final String ENV_QA = "QA_DEFAULT_PASSWORD";

    static final int LARGO_MINIMO_PRODUCCION = 12;

    private static final String[] SECUENCIAS_PROHIBIDAS = {
        "1234", "abcd", "qwerty", "password", "contrasena", "admin", "hotclick", "prueba", "test", "demo"
    };
    private static final SecureRandom RANDOM = new SecureRandom();

    private ClaveSemilla() {}

    /**
     * Producción = {@code app.url} pública por https (misma regla que
     * {@link ProductionConfigValidator}) o un perfil {@code prod}/{@code production} activo.
     */
    static boolean esProduccion(String appUrl, String[] perfilesActivos) {
        boolean urlPublica = appUrl != null
            && appUrl.startsWith("https://")
            && !appUrl.contains("localhost")
            && !appUrl.contains("127.0.0.1");
        boolean perfilProd = perfilesActivos != null && Arrays.stream(perfilesActivos)
            .anyMatch(p -> "prod".equalsIgnoreCase(p) || "production".equalsIgnoreCase(p));
        return urlPublica || perfilProd;
    }

    /** Primer valor no vacío entre las variables indicadas. */
    static Optional<String> leer(UnaryOperator<String> env, String... nombres) {
        for (String nombre : nombres) {
            String valor = env.apply(nombre);
            if (valor != null && !valor.isBlank()) return Optional.of(valor);
        }
        return Optional.empty();
    }

    /**
     * Fuerte = al menos {@value #LARGO_MINIMO_PRODUCCION} caracteres, tres de los cuatro
     * tipos (minúscula, mayúscula, dígito, símbolo) y sin secuencias obvias.
     */
    static boolean esFuerte(String clave) {
        if (clave == null || clave.length() < LARGO_MINIMO_PRODUCCION) return false;
        int tipos = 0;
        if (clave.chars().anyMatch(Character::isLowerCase)) tipos++;
        if (clave.chars().anyMatch(Character::isUpperCase)) tipos++;
        if (clave.chars().anyMatch(Character::isDigit)) tipos++;
        if (clave.chars().anyMatch(c -> !Character.isLetterOrDigit(c))) tipos++;
        if (tipos < 3) return false;
        String normalizada = clave.toLowerCase(Locale.ROOT);
        return Arrays.stream(SECUENCIAS_PROHIBIDAS).noneMatch(normalizada::contains);
    }

    /** Clave aleatoria que no se registra en ningún lado: deja la cuenta sin acceso por contraseña. */
    static String aleatoriaInutilizable() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
