package com.hotclick.integration;

import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.security.PropietarioGuard;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request;

/**
 * Re-auditoría área 2 (MED-1 a MED-4): KPIs ejecutivos (ingresos, MRR, margen), copiloto de IA (cuota del negocio),
 * pronóstico, inventario valorizado y sucursales (crear, renombrar, desactivar) quedaban abiertos a EDITOR y LECTOR
 * porque solo exigían el rol Spring EMPRENDEDOR. Son pantallas del PROPIETARIO del negocio o del ADMIN de plataforma.
 * EDITOR y LECTOR reciben 403; PROPIETARIO y ADMIN pasan la guarda. Datos ficticios.
 */
@DisplayName("[MEDIO] Executive, IA, forecast, inventario y sucursales: solo PROPIETARIO o ADMIN")
class RolesExecutiveIaForecastInventarioSucursalesTest extends BaseIntegrationTest {

    private static final String CUERPO = "{\"nombre\":\"Sucursal fict\",\"periodo\":\"2026-10\",\"resumen\":\"x\",\"mensaje\":\"hola\"}";

    /** "METODO ruta": lecturas y escrituras de los cinco controladores. */
    private static final String[] RUTAS = {
        "GET /api/admin/executive/dashboard", "POST /api/admin/executive/ai-summary",
        "POST /api/admin/executive/guardar-resumen",
        "POST /api/admin/ai/chat", "GET /api/admin/ai/uso", "GET /api/admin/ai/historial",
        "GET /api/admin/ai/sugerencias", "GET /api/admin/ai/productos-sin-venta", "GET /api/admin/ai/insights",
        "DELETE /api/admin/ai/historial",
        "GET /api/admin/forecast/dashboard", "POST /api/admin/forecast/generar",
        "GET /api/admin/inventario/dashboard", "POST /api/admin/inventario/analizar",
        "GET /api/sucursales", "POST /api/sucursales", "PUT /api/sucursales/1", "DELETE /api/sucursales/1",
        "GET /api/admin/pos/sinpe-confirmaciones"
    };

    @Autowired private EmpresaRepository empresaRepository;

    private String tokenDueno;
    private String tokenEditor;
    private String tokenLector;

    @BeforeEach
    void setUp() {
        Rol rolEmp = obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5);
        Empresa e = new Empresa();
        e.setNombreEmpresa("Roles Executive IA");
        e.setSlug("roles-executive-ia");
        e.setCorreoEmpresa("roles-executive-ia@test.cr");
        e.setEstadoEmpresa("ACTIVO");
        e.setFechaRegistro(LocalDateTime.now());
        e = empresaRepository.saveAndFlush(e);
        tokenDueno = tokenEmpresa(miembro("ex-dueno@test.cr", rolEmp, e, "PROPIETARIO"), e);
        tokenEditor = tokenEmpresa(miembro("ex-editor@test.cr", rolEmp, e, "EDITOR"), e);
        tokenLector = tokenEmpresa(miembro("ex-lector@test.cr", rolEmp, e, "LECTOR"), e);
    }

    @AfterEach
    void tearDown() {
        // El propietario y el admin sí llegan a los controladores y pueden dejar filas ligadas a la empresa.
        for (String t : new String[]{"hot_click_reporte_tb", "hot_click_ai_mensaje_tb", "hot_click_ai_uso_tb", "hot_click_sucursal_tb"}) {
            try { jdbcTemplate.update("DELETE FROM " + t); } catch (Exception ignorada) { /* tabla sin filas ligadas */ }
        }
        miembroEmpresaRepository.deleteAll();
        usuarioRepository.findAll().forEach(u -> { u.setEmpresa(null); usuarioRepository.save(u); });
        empresaRepository.deleteAll();
    }

    private Usuario miembro(String correo, Rol rol, Empresa e, String rolEnEmpresa) {
        Usuario u = crearUsuario(correo, rolEnEmpresa, rol);
        u.setEmpresa(e);
        u = usuarioRepository.saveAndFlush(u);
        miembroEmpresaRepository.save(new MiembroEmpresa(u, e, rolEnEmpresa));
        return u;
    }

    private String tokenEmpresa(Usuario u, Empresa e) {
        return "Bearer " + jwtUtil.generateToken(u.getCorreo(), u.getId(), Constants.ROL_EMPRENDEDOR, e.getId(), e.getSlug());
    }

    private MvcResult llamar(String metodoYRuta, String token) throws Exception {
        String[] p = metodoYRuta.split(" ", 2);
        return mockMvc.perform(request(HttpMethod.valueOf(p[0]), p[1]).header("Authorization", token)
            .contentType(MediaType.APPLICATION_JSON).content(CUERPO)).andReturn();
    }

    /** Rutas que NO respondieron 403 con el mensaje de propietario (LECTOR: o el mensaje propio de solo lectura). */
    private List<String> abiertas(String token, boolean lector) throws Exception {
        List<String> r = new ArrayList<>();
        for (String ruta : RUTAS) {
            var res = llamar(ruta, token).getResponse();
            String cuerpo = res.getContentAsString();
            boolean ok = res.getStatus() == 403
                && (cuerpo.contains(PropietarioGuard.MSG) || (lector && cuerpo.contains("Lector")));
            if (!ok) r.add(ruta + " → " + res.getStatus());
        }
        return r;
    }

    @Test
    @DisplayName("EDITOR → 403 (propietario) en executive, IA, forecast, inventario y sucursales")
    void editor403() throws Exception {
        assertThat(abiertas(tokenEditor, false)).as("rutas abiertas a EDITOR").isEmpty();
    }

    @Test
    @DisplayName("LECTOR → 403 en las mismas rutas (también en GET)")
    void lector403() throws Exception {
        assertThat(abiertas(tokenLector, true)).as("rutas abiertas a LECTOR").isEmpty();
    }

    @Test
    @DisplayName("PROPIETARIO → no lo frena la guarda en ninguna de esas rutas")
    void propietarioPasa() throws Exception {
        for (String ruta : List.of("GET /api/admin/executive/dashboard", "GET /api/admin/ai/uso",
                "GET /api/admin/ai/historial", "GET /api/admin/ai/sugerencias", "GET /api/admin/ai/insights",
                "GET /api/admin/forecast/dashboard", "GET /api/admin/inventario/dashboard", "GET /api/sucursales",
                "GET /api/admin/pos/sinpe-confirmaciones",
                "PUT /api/sucursales/999999", "DELETE /api/sucursales/999999")) {
            var res = llamar(ruta, tokenDueno).getResponse();
            assertThat(res.getStatus()).as("PROPIETARIO " + ruta).isNotEqualTo(401);
            assertThat(res.getContentAsString()).as("PROPIETARIO " + ruta).doesNotContain(PropietarioGuard.MSG);
            // Los dashboards pueden dar 403 propio por plan (sin suscripción en el test); el resto no.
            if (!ruta.endsWith("/dashboard")) assertThat(res.getStatus()).as("PROPIETARIO " + ruta).isNotEqualTo(403);
        }
    }

    @Test
    @DisplayName("ADMIN de plataforma → pasa la guarda en lecturas de esas rutas")
    void adminPasa() throws Exception {
        for (String ruta : List.of("GET /api/admin/executive/dashboard", "GET /api/admin/forecast/dashboard",
                "GET /api/admin/inventario/dashboard", "GET /api/admin/pos/sinpe-confirmaciones")) {
            var res = llamar(ruta, adminToken).getResponse();
            assertThat(res.getContentAsString()).as("ADMIN " + ruta).doesNotContain(PropietarioGuard.MSG);
            assertThat(res.getStatus()).as("ADMIN " + ruta).isNotIn(401, 403);
        }
    }
}
