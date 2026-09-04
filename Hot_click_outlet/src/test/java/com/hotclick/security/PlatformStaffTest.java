package com.hotclick.security;

import com.hotclick.utils.Constants;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("PlatformStaff — matriz permiso→rol")
class PlatformStaffTest {

    @Test
    @DisplayName("matriz documentada: companies→SUPPORT, metrics→FINANCE, approvals→TRUST")
    void matrizPermisoARoles() {
        assertThat(PlatformStaff.PERMISO_A_ROLES).isDeepEqualTo(new String[][] {
            { Constants.PERM_GLOBAL_COMPANIES, Constants.ROL_SUPPORT },
            { Constants.PERM_GLOBAL_METRICS, Constants.ROL_FINANCE },
            { Constants.PERM_GLOBAL_APPROVALS, Constants.ROL_TRUST }
        });
    }

    @Test
    @DisplayName("ADMIN y staff son sin-tenant; EMPRENDEDOR no")
    void sinTenant() {
        assertThat(PlatformStaff.esSinTenant(Constants.ROL_ADMIN)).isTrue();
        assertThat(PlatformStaff.esSinTenant(Constants.ROL_SUPPORT)).isTrue();
        assertThat(PlatformStaff.esSinTenant(Constants.ROL_FINANCE)).isTrue();
        assertThat(PlatformStaff.esSinTenant(Constants.ROL_TRUST)).isTrue();
        assertThat(PlatformStaff.esSinTenant(Constants.ROL_EMPRENDEDOR)).isFalse();
    }

    @Test
    @DisplayName("rolPrincipal: ADMIN gana; si no, staff; vacío → USUARIO_FINAL")
    void rolPrincipal() {
        assertThat(PlatformStaff.rolPrincipal(List.of())).isEqualTo(Constants.ROL_USUARIO_FINAL);
        assertThat(PlatformStaff.rolPrincipal(List.of(Constants.ROL_SUPPORT, Constants.ROL_ADMIN)))
            .isEqualTo(Constants.ROL_ADMIN);
        assertThat(PlatformStaff.rolPrincipal(List.of(Constants.ROL_SUPPORT)))
            .isEqualTo(Constants.ROL_SUPPORT);
        assertThat(PlatformStaff.rolPrincipal(List.of(Constants.ROL_EMPRENDEDOR)))
            .isEqualTo(Constants.ROL_EMPRENDEDOR);
    }

    @Test
    @DisplayName("cada permiso global de la matriz apunta a un rol staff distinto")
    void unPermisoPorRolStaff() {
        Set<String> roles = java.util.Arrays.stream(PlatformStaff.PERMISO_A_ROLES)
            .map(row -> row[1])
            .collect(Collectors.toSet());
        assertThat(roles).isEqualTo(PlatformStaff.ROLES);
    }
}
