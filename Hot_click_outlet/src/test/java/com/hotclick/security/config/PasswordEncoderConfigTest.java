package com.hotclick.security.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Contrato del bean passwordEncoder: cost 12 para hashes nuevos, compatibilidad
 * con los hashes cost 10 que ya están en la BD, y guardas ante un cost mal
 * configurado. Ver docs/plan-argon2id-hashing-contrasenas.md.
 */
@DisplayName("SecurityConfig.passwordEncoder — cost de bcrypt y compatibilidad")
class PasswordEncoderConfigTest {

    private static final String CONTRASENA = "unaClaveDePrueba123";

    private PasswordEncoder encoderConCost(int costConfigurado) {
        SecurityConfig config = new SecurityConfig();
        ReflectionTestUtils.setField(config, "bcryptCost", costConfigurado);
        return config.passwordEncoder();
    }

    /** Lee el cost del propio hash: $2a$<cost>$<salt+hash>. */
    private int costDe(String hash) {
        return Integer.parseInt(hash.substring(4, 6));
    }

    // ── Cost por defecto ─────────────────────────────────────────────────────

    @Test
    @DisplayName("con el cost por defecto → los hashes nuevos salen con cost 12")
    void costDefault_generaHashesCost12() {
        String hash = encoderConCost(SecurityConfig.BCRYPT_COST_DEFAULT).encode(CONTRASENA);
        assertThat(costDe(hash)).isEqualTo(SecurityConfig.BCRYPT_COST_DEFAULT);
    }

    @Test
    @DisplayName("el default del proyecto es 12, no el 10 de BCryptPasswordEncoder()")
    void defaultEsDoce_noElDeSpring() {
        assertThat(SecurityConfig.BCRYPT_COST_DEFAULT).isEqualTo(12);
        assertThat(costDe(new BCryptPasswordEncoder().encode(CONTRASENA))).isEqualTo(10);
    }

    @Test
    @DisplayName("un hash recién generado se valida con matches()")
    void hashNuevo_validaConMatches() {
        PasswordEncoder encoder = encoderConCost(SecurityConfig.BCRYPT_COST_DEFAULT);
        assertThat(encoder.matches(CONTRASENA, encoder.encode(CONTRASENA))).isTrue();
    }

    @Test
    @DisplayName("una contraseña incorrecta no valida")
    void contrasenaIncorrecta_noValida() {
        PasswordEncoder encoder = encoderConCost(SecurityConfig.BCRYPT_COST_DEFAULT);
        assertThat(encoder.matches("otraClave", encoder.encode(CONTRASENA))).isFalse();
    }

    @Test
    @DisplayName("salt aleatorio: la misma contraseña produce hashes distintos")
    void mismaContrasena_hashesDistintos() {
        PasswordEncoder encoder = encoderConCost(SecurityConfig.BCRYPT_COST_MIN);
        assertThat(encoder.encode(CONTRASENA)).isNotEqualTo(encoder.encode(CONTRASENA));
    }

    // ── Retrocompatibilidad: el motivo por el que no hace falta migrar ───────

    @Test
    @DisplayName("un hash legacy cost 10 sigue validando con el encoder cost 12")
    void hashLegacyCost10_sigueValidando() {
        String hashLegacy = new BCryptPasswordEncoder(SecurityConfig.BCRYPT_COST_MIN).encode(CONTRASENA);
        assertThat(costDe(hashLegacy)).isEqualTo(SecurityConfig.BCRYPT_COST_MIN);

        assertThat(encoderConCost(SecurityConfig.BCRYPT_COST_DEFAULT).matches(CONTRASENA, hashLegacy)).isTrue();
    }

    @Test
    @DisplayName("un hash cost 12 valida aunque el encoder se reconfigure a cost 10")
    void hashCost12_validaConEncoderCost10() {
        String hash12 = encoderConCost(SecurityConfig.BCRYPT_COST_DEFAULT).encode(CONTRASENA);
        assertThat(encoderConCost(SecurityConfig.BCRYPT_COST_MIN).matches(CONTRASENA, hash12)).isTrue();
    }

    // ── Guardas del cost configurado ─────────────────────────────────────────

    @Test
    @DisplayName("cost por debajo del mínimo → cae al default sin romper el arranque")
    void costDebajoDelMinimo_caeAlDefault() {
        String hash = encoderConCost(SecurityConfig.BCRYPT_COST_MIN - 1).encode(CONTRASENA);
        assertThat(costDe(hash)).isEqualTo(SecurityConfig.BCRYPT_COST_DEFAULT);
    }

    @Test
    @DisplayName("cost por encima del máximo → cae al default (evita colgar el login)")
    void costArribaDelMaximo_caeAlDefault() {
        String hash = encoderConCost(SecurityConfig.BCRYPT_COST_MAX + 1).encode(CONTRASENA);
        assertThat(costDe(hash)).isEqualTo(SecurityConfig.BCRYPT_COST_DEFAULT);
    }

    @Test
    @DisplayName("campo sin bindear (0) → cae al default en vez de romper BCryptPasswordEncoder")
    void costCero_caeAlDefault() {
        String hash = encoderConCost(0).encode(CONTRASENA);
        assertThat(costDe(hash)).isEqualTo(SecurityConfig.BCRYPT_COST_DEFAULT);
    }

    @Test
    @DisplayName("cost dentro del rango se respeta tal cual")
    void costEnRango_seRespeta() {
        String hash = encoderConCost(SecurityConfig.BCRYPT_COST_MIN).encode(CONTRASENA);
        assertThat(costDe(hash)).isEqualTo(SecurityConfig.BCRYPT_COST_MIN);
    }

    @Test
    @DisplayName("el rango declarado es coherente: MIN < DEFAULT <= MAX")
    void rangoCoherente() {
        assertThat(SecurityConfig.BCRYPT_COST_MIN).isLessThan(SecurityConfig.BCRYPT_COST_DEFAULT);
        assertThat(SecurityConfig.BCRYPT_COST_DEFAULT).isLessThanOrEqualTo(SecurityConfig.BCRYPT_COST_MAX);
    }

    // ── Límite de 72 bytes: Spring Security rechaza, ya no trunca en silencio ─

    @Test
    @DisplayName("bcrypt rechaza una clave de más de 72 bytes en vez de ignorar el resto")
    void masDe72Bytes_seRechaza() {
        PasswordEncoder encoder = encoderConCost(SecurityConfig.BCRYPT_COST_MIN);
        String demasiadoLarga = "A".repeat(73);

        assertThatThrownBy(() -> encoder.encode(demasiadoLarga))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("una diferencia dentro de los primeros 72 bytes sí cambia el resultado")
    void diferenciaDentroDeLos72Bytes_noValida() {
        PasswordEncoder encoder = encoderConCost(SecurityConfig.BCRYPT_COST_MIN);
        String hash = encoder.encode("A".repeat(71) + "X");

        assertThat(encoder.matches("A".repeat(71) + "Y", hash)).isFalse();
    }
}
