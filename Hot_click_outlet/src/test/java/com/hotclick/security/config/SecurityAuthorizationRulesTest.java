package com.hotclick.security.config;

import com.hotclick.security.PlatformStaff;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Contrato de las reglas HTTP: staff entra a /api/admin/** vía rol,
 * y las rutas sensibles se gatedan por authorities global.* (no bypass CompanyScope).
 */
@DisplayName("SecurityAuthorizationRules — contrato staff / global.*")
class SecurityAuthorizationRulesTest {

    @Test
    @DisplayName("constantes de permiso usadas en matchers existen y coinciden con V8")
    void permisosGlobalesV8() {
        assertThat(Constants.PERM_GLOBAL_COMPANIES).isEqualTo("global.companies");
        assertThat(Constants.PERM_GLOBAL_APPROVALS).isEqualTo("global.approvals");
        assertThat(Constants.PERM_GLOBAL_METRICS).isEqualTo("global.metrics");
    }

    @Test
    @DisplayName("roles staff legacy inactivos; PlatformStaff.ROLES vacío (V132)")
    void rolesStaffVaciosTrasV132() {
        assertThat(Constants.ROL_SUPPORT).isEqualTo("SUPPORT");
        assertThat(PlatformStaff.ROLES).isEmpty();
        assertThat(PlatformStaff.ROLES_SIN_TENANT).containsExactly(Constants.ROL_ADMIN);
    }

    // catch-all /api/admin/** incluye staff además de ADMIN y EMPRENDEDOR:
    // ver SecurityAuthorizationRulesCatchAllTest (integration, golpea el filtro real).
}
