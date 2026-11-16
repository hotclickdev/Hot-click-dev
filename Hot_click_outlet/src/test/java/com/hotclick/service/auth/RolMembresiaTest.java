package com.hotclick.service.auth;

import com.hotclick.model.MiembroEmpresa;
import com.hotclick.model.Rol;
import com.hotclick.model.Usuario;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("RolMembresia — claim JWT de tienda vs plataforma")
class RolMembresiaTest {

    @Test
    @DisplayName("PROPIETARIO de tienda → EMPRENDEDOR (SPA y hasRole)")
    void propietario_emiteEmprendedor() {
        assertThat(RolMembresia.paraJwt(membresia("PROPIETARIO"), usuario("EMPRENDEDOR")))
            .isEqualTo(Constants.ROL_EMPRENDEDOR);
    }

    @Test
    @DisplayName("EDITOR / LECTOR / ADMIN de equipo → EMPRENDEDOR, no ADMIN de plataforma")
    void rolesDeEquipo_nuncaSonAdminPlataforma() {
        Usuario duenio = usuario("EMPRENDEDOR");
        assertThat(RolMembresia.paraJwt(membresia("EDITOR"), duenio)).isEqualTo(Constants.ROL_EMPRENDEDOR);
        assertThat(RolMembresia.paraJwt(membresia("LECTOR"), duenio)).isEqualTo(Constants.ROL_EMPRENDEDOR);
        assertThat(RolMembresia.paraJwt(membresia("ADMIN"), duenio)).isEqualTo(Constants.ROL_EMPRENDEDOR);
    }

    @Test
    @DisplayName("ADMIN de plataforma conserva ADMIN al cambiar de negocio")
    void adminPlataforma_sigueAdmin() {
        assertThat(RolMembresia.paraJwt(membresia("PROPIETARIO"), usuario("ADMIN")))
            .isEqualTo(Constants.ROL_ADMIN);
    }

    @Test
    @DisplayName("Sin membresía usa el rol global de la cuenta")
    void sinMembresia_usaRolGlobal() {
        assertThat(RolMembresia.paraJwt(null, usuario("USUARIO_FINAL")))
            .isEqualTo(Constants.ROL_USUARIO_FINAL);
    }

    private static MiembroEmpresa membresia(String rolEnEmpresa) {
        MiembroEmpresa m = new MiembroEmpresa();
        m.setRolEnEmpresa(rolEnEmpresa);
        return m;
    }

    private static Usuario usuario(String nombreRol) {
        Rol rol = new Rol();
        rol.setNombreRol(nombreRol);
        Usuario u = new Usuario();
        u.setRoles(List.of(rol));
        return u;
    }

    @Test
    @DisplayName("rolEquipo expone el rol de equipo real; el JWT sigue en EMPRENDEDOR")
    void rolEquipo_exponeRolRealSinTocarJwt() {
        assertThat(RolMembresia.rolEquipo(membresia("CAJERO"))).isEqualTo("CAJERO");
        assertThat(RolMembresia.rolEquipo(membresia("PROPIETARIO"))).isEqualTo("PROPIETARIO");
        assertThat(RolMembresia.rolEquipo(membresia("EDITOR"))).isEqualTo("EDITOR");
        assertThat(RolMembresia.rolEquipo(null)).isNull();
        assertThat(RolMembresia.paraJwt(membresia("CAJERO"), usuario("EMPRENDEDOR"))).isEqualTo(Constants.ROL_EMPRENDEDOR);
    }

    @Test
    @DisplayName("permisosEquipo: CAJERO solo POS; el resto conserva los permisos")
    void permisosEquipo_cajeroSoloPos() {
        List<String> todos = List.of("pos.usar", "pos.caja.abrir", "orders.view", "products.create", "finances.view");
        assertThat(RolMembresia.permisosEquipo("CAJERO", todos)).containsExactly("pos.usar", "pos.caja.abrir");
        assertThat(RolMembresia.permisosEquipo("PROPIETARIO", todos)).isEqualTo(todos);
        assertThat(RolMembresia.permisosEquipo("CAJERO", null)).isEmpty();
    }
}
