package com.hotclick.security;

import com.hotclick.utils.Constants;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("PlatformStaff — solo ADMIN sin tenant (V132)")
class PlatformStaffTest {

    @Test
    @DisplayName("ROLES staff vacío; ROLES_SIN_TENANT solo ADMIN")
    void matrizVaciaSoloAdminSinTenant() {
        assertThat(PlatformStaff.ROLES).isEmpty();
        assertThat(PlatformStaff.PERMISO_A_ROLES).isEmpty();
        assertThat(PlatformStaff.ROLES_SIN_TENANT).containsExactly(Constants.ROL_ADMIN);
    }

    @Test
    @DisplayName("esSinTenant solo ADMIN")
    void esSinTenant() {
        assertThat(PlatformStaff.esSinTenant(Constants.ROL_ADMIN)).isTrue();
        assertThat(PlatformStaff.esSinTenant(Constants.ROL_EMPRENDEDOR)).isFalse();
        assertThat(PlatformStaff.esStaff(Constants.ROL_SUPPORT)).isFalse();
    }

    @Test
    @DisplayName("rolPrincipal: ADMIN gana; vacío → USUARIO_FINAL")
    void rolPrincipal() {
        assertThat(PlatformStaff.rolPrincipal(List.of())).isEqualTo(Constants.ROL_USUARIO_FINAL);
        assertThat(PlatformStaff.rolPrincipal(List.of(Constants.ROL_EMPRENDEDOR, Constants.ROL_ADMIN)))
            .isEqualTo(Constants.ROL_ADMIN);
        assertThat(PlatformStaff.rolPrincipal(List.of(Constants.ROL_EMPRENDEDOR)))
            .isEqualTo(Constants.ROL_EMPRENDEDOR);
    }
}
