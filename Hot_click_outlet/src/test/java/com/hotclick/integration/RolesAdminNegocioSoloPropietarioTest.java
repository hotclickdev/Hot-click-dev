package com.hotclick.integration;

import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.security.PropietarioGuard;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Área 2 (ALTO, QA 2): los miembros de equipo EDITOR y LECTOR llevan rol Spring EMPRENDEDOR, y las reglas
 * de /api/admin/{finanzas,dashboard,ads,asignar,mesas,importar,reset-*} solo pedían ese rol. Esas pantallas
 * (finanzas, métricas, gasto de publicidad, clientes, mesas, importación masiva, borrado de datos) son del
 * PROPIETARIO del negocio o del ADMIN de plataforma (PropietarioGuard.puedeGestionarEmpresa).
 *
 * Decisión por rol:
 *  - EDITOR y LECTOR: 403 en todas (lectura y escritura; el LECTOR ya tenía 403 en escrituras por el interceptor).
 *  - PROPIETARIO: pasa la guarda; cada controlador sigue acotando a SU empresa (CompanyScope). reset-datos,
 *    además, sigue exigiendo contraseña o código (P9-04 / seg-altos-2 (c)).
 *  - ADMIN de plataforma: pasa la guarda (vista global donde el controlador la permite).
 *  - Comprador / vendedor sin negocio: no cambia (403 por rol o por falta de empresa).
 */
@DisplayName("[ALTO] Área 2: EDITOR/LECTOR 403 en finanzas, dashboard, ads, asignar, mesas, importar y reset-datos")
class RolesAdminNegocioSoloPropietarioTest extends BaseIntegrationTest {

    private static final String CUERPO_VACIO = "{}";

    /** Cuerpos VÁLIDOS: así un 400 de "cuerpo vacío" no se confunde con una ruta cerrada (QA 2). */
    private static final Map<String, String> CUERPOS = Map.ofEntries(
        Map.entry("POST /api/admin/ads/gastos",
            "{\"fecha\":\"2026-10-01\",\"campana\":\"qa\",\"canal\":\"meta\",\"montoCrc\":1000}"),
        Map.entry("POST /api/admin/asignar/crear-cliente",
            "{\"nombre\":\"Cliente Qa\",\"correo\":\"cliente-qa-area2@test.cr\"}"),
        Map.entry("POST /api/admin/asignar/compra",
            "{\"usuarioId\":1,\"items\":[{\"productoId\":1,\"cantidad\":1,\"precioUnitario\":1000}]}"),
        Map.entry("POST /api/admin/mesas", "{\"nombre\":\"Mesa QA\"}"),
        Map.entry("PUT /api/admin/mesas/1", "{\"nombre\":\"Mesa QA 2\"}"),
        Map.entry("POST /api/admin/importar/url", "{\"url\":\"https://example.com/catalogo\"}"),
        Map.entry("POST /api/admin/importar/confirmar",
            "[{\"nombreProducto\":\"Producto QA\",\"categoriaId\":1,\"precioVenta\":1000}]"),
        Map.entry("POST /api/admin/reset-datos", "{\"password\":\"x\"}")
    );

    /** "METODO ruta" — todas las rutas /api/admin del negocio que antes quedaban abiertas a EDITOR/LECTOR. */
    private static final String[] RUTAS = {
        "GET /api/admin/finanzas/reporte-iva",
        "GET /api/admin/finanzas/reporte-iva?download=true",
        "GET /api/admin/dashboard",
        "GET /api/admin/ads/metricas", "GET /api/admin/ads/gastos", "POST /api/admin/ads/gastos",
        "DELETE /api/admin/ads/gastos/1",
        "GET /api/admin/asignar/buscar-cliente?q=abcd", "POST /api/admin/asignar/crear-cliente",
        "POST /api/admin/asignar/compra",
        "GET /api/admin/mesas", "POST /api/admin/mesas", "PUT /api/admin/mesas/1",
        "POST /api/admin/mesas/1/regenerar-token", "DELETE /api/admin/mesas/1",
        "POST /api/admin/importar/url", "POST /api/admin/importar/pdf", "POST /api/admin/importar/csv",
        "POST /api/admin/importar/confirmar",
        "POST /api/admin/reset-datos", "GET /api/admin/reset-confirmacion", "POST /api/admin/reset-codigo"
    };

    @Autowired private EmpresaRepository empresaRepository;

    private String tokenDueno;
    private String tokenEditor;
    private String tokenLector;

    @BeforeEach
    void setUp() {
        Rol rolEmp = obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5);
        Empresa e = new Empresa();
        e.setNombreEmpresa("Roles Admin Negocio");
        e.setSlug("roles-admin-negocio");
        e.setCorreoEmpresa("roles-admin-negocio@test.cr");
        e.setEstadoEmpresa("ACTIVO");
        e.setFechaRegistro(LocalDateTime.now());
        e = empresaRepository.saveAndFlush(e);
        tokenDueno = tokenEmpresa(miembro("an-dueno@test.cr", rolEmp, e, "PROPIETARIO"), e);
        tokenEditor = tokenEmpresa(miembro("an-editor@test.cr", rolEmp, e, "EDITOR"), e);
        tokenLector = tokenEmpresa(miembro("an-lector@test.cr", rolEmp, e, "LECTOR"), e);
    }

    @AfterEach
    void tearDown() {
        jdbc.update("DELETE FROM hot_click_mesa_tb"); // las crea un rol sin permiso mientras la ruta siga abierta
        miembroEmpresaRepository.deleteAll();
        usuarioRepository.findAll().forEach(u -> { u.setEmpresa(null); usuarioRepository.save(u); });
        empresaRepository.deleteAll();
    }

    @Autowired private org.springframework.jdbc.core.JdbcTemplate jdbc;

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

    private org.springframework.test.web.servlet.MvcResult llamar(String metodoYRuta, String token) throws Exception {
        return llamar(metodoYRuta, token, true);
    }

    private org.springframework.test.web.servlet.MvcResult llamar(String metodoYRuta, String token, boolean cuerpoValido)
            throws Exception {
        String[] p = metodoYRuta.split(" ", 2);
        return mockMvc.perform(request(HttpMethod.valueOf(p[0]), p[1])
                .header("Authorization", token)
                .contentType(MediaType.APPLICATION_JSON).content(cuerpoValido ? CUERPOS.getOrDefault(metodoYRuta, CUERPO_VACIO) : CUERPO_VACIO))
            .andReturn();
    }

    /**
     * Devuelve las rutas que NO respondieron 403 con el mensaje de guarda. EDITOR: siempre {@link PropietarioGuard#MSG}
     * (así un 403 por plan o por otra causa no cuenta). LECTOR: {@code MSG} en lecturas, o el mensaje propio de
     * LectorSoloLecturaInterceptor en escrituras (corre antes).
     */
    private List<String> rutasAbiertas(String token, boolean lector) throws Exception {
        List<String> abiertas = new ArrayList<>();
        for (String ruta : RUTAS) {
            var res = llamar(ruta, token).getResponse();
            String cuerpo = res.getContentAsString();
            boolean ok = res.getStatus() == 403
                && (cuerpo.contains(PropietarioGuard.MSG) || (lector && cuerpo.contains("Lector")));
            if (!ok) abiertas.add(ruta + " → " + res.getStatus());
        }
        return abiertas;
    }

    @Test
    @DisplayName("EDITOR → 403 (mensaje de propietario) en cada ruta de negocio, lectura y escritura con cuerpo válido")
    void editor403() throws Exception {
        assertThat(rutasAbiertas(tokenEditor, false)).as("rutas abiertas a EDITOR").isEmpty();
    }

    @Test
    @DisplayName("LECTOR → 403 en cada ruta de negocio (también en GET: finanzas, dashboard, ads, clientes y mesas)")
    void lector403() throws Exception {
        assertThat(rutasAbiertas(tokenLector, true)).as("rutas abiertas a LECTOR").isEmpty();
    }

    @Test
    @DisplayName("buscar-cliente sin q → 400 (no 500) para el propietario; con q corto sigue 200 vacío")
    void buscarClienteSinQ400() throws Exception {
        assertThat(llamar("GET /api/admin/asignar/buscar-cliente", tokenDueno).getResponse().getStatus()).isEqualTo(400);
        assertThat(llamar("GET /api/admin/asignar/buscar-cliente?q=ab", tokenDueno).getResponse().getStatus()).isEqualTo(200);
    }

    @Test
    @DisplayName("PROPIETARIO → no lo frena la guarda de propietario (cada controlador valida el resto)")
    void propietarioPasaLaGuarda() throws Exception {
        for (String ruta : RUTAS) {
            // cuerpo vacío: el propietario no debe crear datos reales; solo importa que la guarda no lo frene
            var res = llamar(ruta, tokenDueno, false).getResponse();
            assertThat(res.getStatus()).as("PROPIETARIO " + ruta).isNotEqualTo(401).isLessThan(500);
            assertThat(res.getContentAsString()).as("PROPIETARIO " + ruta).doesNotContain(PropietarioGuard.MSG);
        }
    }

    @ParameterizedTest(name = "PROPIETARIO → 200 en GET {0}")
    @ValueSource(strings = {"/api/admin/dashboard", "/api/admin/ads/metricas", "/api/admin/ads/gastos",
        "/api/admin/mesas", "/api/admin/reset-confirmacion"})
    void propietarioLeeLoSuyo(String ruta) throws Exception {
        mockMvc.perform(request(HttpMethod.GET, ruta).header("Authorization", tokenDueno)).andExpect(status().isOk());
    }

    @Test
    @DisplayName("PROPIETARIO: reset-datos sigue exigiendo contraseña (sin ella no borra)")
    void propietarioResetSinPassword400() throws Exception {
        assertThat(llamar("POST /api/admin/reset-datos", tokenDueno, false).getResponse().getStatus()).isEqualTo(400);
    }

    @ParameterizedTest(name = "ADMIN de plataforma → 200 en GET {0}")
    @ValueSource(strings = {"/api/admin/dashboard", "/api/admin/ads/metricas", "/api/admin/reset-confirmacion"})
    void adminSigueViendo(String ruta) throws Exception {
        mockMvc.perform(request(HttpMethod.GET, ruta).header("Authorization", adminToken)).andExpect(status().isOk());
    }
}
