package com.hotclick.integration;

import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * QA2/QA1 área 2 (ALTO): los miembros de equipo llevan rol Spring EMPRENDEDOR, así que
 * hasRole('EMPRENDEDOR') no alcanza. Billing, wallet, métodos de cobro y facturas: solo el
 * PROPIETARIO o el ADMIN (PropietarioGuard.puedeGestionarEmpresa). /api/admin/pagos: solo plataforma.
 */
@DisplayName("[ALTO] Área 2: EDITOR y LECTOR reciben 403 en billing, wallet, cobros, facturas y /api/admin/pagos")
class RolesBillingWalletCobrosTest extends BaseIntegrationTest {

    @Autowired private EmpresaRepository empresaRepository;

    private String tokenDueno;
    private String tokenEditor;
    private String tokenLector;

    @BeforeEach
    void setUp() {
        Rol rolEmp = obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5);
        Empresa e = new Empresa();
        e.setNombreEmpresa("Roles Area2");
        e.setSlug("roles-area2");
        e.setCorreoEmpresa("roles-area2@test.cr");
        e.setEstadoEmpresa("ACTIVO");
        e.setFechaRegistro(LocalDateTime.now());
        e = empresaRepository.saveAndFlush(e);
        tokenDueno = tokenEmpresa(miembro("a2-dueno@test.cr", rolEmp, e, "PROPIETARIO"), e);
        tokenEditor = tokenEmpresa(miembro("a2-editor@test.cr", rolEmp, e, "EDITOR"), e);
        tokenLector = tokenEmpresa(miembro("a2-lector@test.cr", rolEmp, e, "LECTOR"), e);
    }

    private Usuario miembro(String correo, Rol rol, Empresa e, String rolEnEmpresa) {
        Usuario u = crearUsuario(correo, rolEnEmpresa, rol);
        u.setEmpresa(e);
        u = usuarioRepository.saveAndFlush(u);
        miembroEmpresaRepository.save(new MiembroEmpresa(u, e, rolEnEmpresa));
        return u;
    }

    /** Token como el de login real: lleva empresaId (TenantContext) además del rol Spring. */
    private String tokenEmpresa(Usuario u, Empresa e) {
        return "Bearer " + jwtUtil.generateToken(u.getCorreo(), u.getId(), Constants.ROL_EMPRENDEDOR, e.getId(), e.getSlug());
    }

    @AfterEach
    void tearDown() {
        miembroEmpresaRepository.deleteAll();
        usuarioRepository.findAll().forEach(u -> { u.setEmpresa(null); usuarioRepository.save(u); });
        empresaRepository.deleteAll();
    }

    @ParameterizedTest(name = "EDITOR → 403 en GET {0}")
    @ValueSource(strings = {
        "/api/billing/suscripcion", "/api/billing/facturas", "/api/billing/plan-pendiente",
        "/api/billing/preferencias", "/api/billing/tilopay/pendiente",
        "/api/metodos-cobro", "/api/wallet/payouts", "/api/wallet/saldo", "/api/wallet/transacciones",
        "/api/facturas", "/api/admin/pagos", "/api/admin/pagos/kpis"})
    void editor403(String ruta) throws Exception {
        mockMvc.perform(get(ruta).header("Authorization", tokenEditor)).andExpect(status().isForbidden());
    }

    @ParameterizedTest(name = "LECTOR → 403 en GET {0}")
    @ValueSource(strings = {
        "/api/billing/suscripcion", "/api/billing/facturas", "/api/billing/plan-pendiente",
        "/api/billing/preferencias", "/api/billing/tilopay/pendiente",
        "/api/metodos-cobro", "/api/wallet/payouts", "/api/wallet/saldo", "/api/wallet/transacciones",
        "/api/facturas", "/api/admin/pagos", "/api/admin/pagos/kpis"})
    void lector403(String ruta) throws Exception {
        mockMvc.perform(get(ruta).header("Authorization", tokenLector)).andExpect(status().isForbidden());
    }

    @ParameterizedTest(name = "PROPIETARIO → 2xx en GET {0}")
    @ValueSource(strings = {
        "/api/billing/suscripcion", "/api/billing/facturas", "/api/billing/plan-pendiente",
        "/api/billing/preferencias", "/api/billing/tilopay/pendiente",
        "/api/metodos-cobro", "/api/wallet/payouts", "/api/wallet/saldo", "/api/wallet/transacciones",
        "/api/facturas"})
    void propietario2xx(String ruta) throws Exception {
        int st = mockMvc.perform(get(ruta).header("Authorization", tokenDueno)).andReturn().getResponse().getStatus();
        // tilopay/pendiente sin pasarela configurada responde 409 controlado; nunca 401/403/5xx.
        assertThat(st).as(ruta).isIn(200, 204, 409);
    }

    @ParameterizedTest(name = "PROPIETARIO → 403 en GET {0} (solo plataforma)")
    @ValueSource(strings = {"/api/admin/pagos", "/api/admin/pagos/kpis"})
    void propietarioAdminPagos403(String ruta) throws Exception {
        mockMvc.perform(get(ruta).header("Authorization", tokenDueno)).andExpect(status().isForbidden());
    }

    @ParameterizedTest(name = "ADMIN → 200 en GET {0}")
    @ValueSource(strings = {"/api/admin/pagos", "/api/admin/pagos/kpis"})
    void admin200(String ruta) throws Exception {
        mockMvc.perform(get(ruta).header("Authorization", adminToken)).andExpect(status().isOk());
    }

    @Test @DisplayName("BAJO: EDITOR y LECTOR → 403 en POST /api/billing/tilopay/confirmar/{orderNumber}")
    void confirmarTilopaySoloDueno() throws Exception {
        for (String t : new String[]{tokenEditor, tokenLector}) {
            mockMvc.perform(post("/api/billing/tilopay/confirmar/ORD-QA2").header("Authorization", t))
                .andExpect(status().isForbidden());
        }
        int st = mockMvc.perform(post("/api/billing/tilopay/confirmar/ORD-QA2").header("Authorization", tokenDueno))
            .andReturn().getResponse().getStatus();
        assertThat(st).isNotIn(401, 403).isLessThan(500);
    }
}
