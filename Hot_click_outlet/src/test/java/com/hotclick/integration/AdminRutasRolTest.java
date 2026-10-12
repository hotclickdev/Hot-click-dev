package com.hotclick.integration;

import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.web.servlet.mvc.method.RequestMappingInfo;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;

import java.time.LocalDateTime;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Hotfix admin-rutas-rol: P9-01 (buscar-cliente), SEG-3 (/api/admin/** ADMIN por defecto),
 * SEG-1 (comisión) y SEG-2 (ruleta).
 */
@DisplayName("[CRÍTICO] /api/admin/** solo ADMIN salvo lista blanca acotada a la empresa")
class AdminRutasRolTest extends BaseIntegrationTest {

    /** Rutas /api/admin que un EMPRENDEDOR puede usar (acotadas a su empresa). Método + patrón. */
    static final Set<String> LISTA_BLANCA_VENDEDOR = Set.of(
        "GET /api/admin/dashboard",
        "GET /api/admin/ads/metricas", "GET /api/admin/ads/gastos", "POST /api/admin/ads/gastos",
        "DELETE /api/admin/ads/gastos/{id}",
        "GET /api/admin/configuracion/comision", "GET /api/admin/configuracion/comision/sugerido",
        "GET /api/admin/asignar/buscar-cliente", "POST /api/admin/asignar/crear-cliente",
        "POST /api/admin/asignar/compra",
        "GET /api/admin/finanzas/reporte-iva",
        "POST /api/admin/importar/url", "POST /api/admin/importar/pdf", "POST /api/admin/importar/csv",
        "POST /api/admin/importar/confirmar",
        "GET /api/admin/mesas", "POST /api/admin/mesas", "PUT /api/admin/mesas/{id}",
        "POST /api/admin/mesas/{id}/regenerar-token", "DELETE /api/admin/mesas/{id}",
        "POST /api/admin/productos/generar-ia", "POST /api/admin/reset-datos",
        // Reglas propias anteriores (authenticated + @PreAuthorize EMPRENDEDOR/ADMIN, scope en controlador)
        "GET /api/admin/gift-cards", "POST /api/admin/gift-cards", "DELETE /api/admin/gift-cards/{id}",
        "GET /api/admin/executive/dashboard", "POST /api/admin/executive/ai-summary",
        "POST /api/admin/executive/guardar-resumen",
        "GET /api/admin/forecast/dashboard", "POST /api/admin/forecast/generar",
        "GET /api/admin/inventario/dashboard", "POST /api/admin/inventario/analizar",
        "POST /api/admin/ai/chat", "GET /api/admin/ai/uso", "GET /api/admin/ai/historial",
        "GET /api/admin/ai/sugerencias", "GET /api/admin/ai/productos-sin-venta", "GET /api/admin/ai/insights",
        "DELETE /api/admin/ai/historial",
        "GET /api/admin/pagos", "GET /api/admin/pagos/kpis",
        // Datos de referencia de solo lectura (países y tasas)
        "GET /api/admin/multipais/paises", "GET /api/admin/multipais/tasas", "GET /api/admin/multipais/config"
    );

    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private GiroRuletaRepository giroRuletaRepository;
    @Autowired private MarcaRepository marcaRepository;
    @Autowired @Qualifier("requestMappingHandlerMapping") private RequestMappingHandlerMapping mappings;

    private Empresa empresaA;
    private Empresa empresaB;
    private String tokenA;
    private String tokenPendiente;
    private String tokenSinEmpresa;
    private Usuario clienteA;
    private Usuario clienteB;

    @BeforeEach
    void setUp() {
        Rol rolEmp = obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5);
        Rol rolUser = obtenerOCrearRol(Constants.ROL_USUARIO_FINAL, 1);
        empresaA = crearEmpresa("Rutas Alpha", "rutas-alpha", "ACTIVO");
        empresaB = crearEmpresa("Rutas Beta", "rutas-beta", "ACTIVO");
        Empresa pendiente = crearEmpresa("Rutas Pend", "rutas-pend", "PENDIENTE");
        tokenA = tokenPara(conEmpresa(crearUsuario("rutas-a@test.cr", "Dueno A", rolEmp), empresaA), Constants.ROL_EMPRENDEDOR);
        tokenPendiente = tokenPara(conEmpresa(crearUsuario("rutas-p@test.cr", "Dueno P", rolEmp), pendiente), Constants.ROL_EMPRENDEDOR);
        tokenSinEmpresa = tokenPara(crearUsuario("rutas-sin@test.cr", "Sin", rolEmp), Constants.ROL_EMPRENDEDOR);
        clienteA = crearUsuario("cliente-zeta-a@test.cr", "Zeta Alfa", rolUser);
        clienteA.setEmpresaRegistro(empresaA);
        clienteA = usuarioRepository.saveAndFlush(clienteA);
        clienteB = crearUsuario("cliente-zeta-b@test.cr", "Zeta Beta", rolUser);
        clienteB.setEmpresaRegistro(empresaB);
        clienteB = usuarioRepository.saveAndFlush(clienteB);
    }

    @AfterEach
    void tearDown() {
        giroRuletaRepository.deleteAll();
        marcaRepository.deleteAll();
        usuarioRepository.findAll().forEach(u -> { u.setEmpresa(null); u.setEmpresaRegistro(null); usuarioRepository.save(u); });
        empresaRepository.deleteAll();
    }

    // ── SEG-3: enumeración de todos los mapeos /api/admin/** ─────────────────

    @Test
    @DisplayName("SEG-3 | todo /api/admin/** fuera de la lista blanca → 403 para EMPRENDEDOR (aprobado y pendiente)")
    void ningunaRutaAdminAbiertaAlVendedorFueraDeLaListaBlanca() throws Exception {
        List<String> abiertas = new ArrayList<>();
        int revisadas = 0;
        for (RequestMappingInfo info : mappings.getHandlerMethods().keySet()) {
            Set<String> patrones = info.getPatternValues();
            Set<org.springframework.web.bind.annotation.RequestMethod> metodos = info.getMethodsCondition().getMethods();
            for (String patron : patrones) {
                if (!patron.startsWith("/api/admin")) continue;
                for (var rm : metodos) {
                    String clave = rm.name() + " " + patron;
                    if (LISTA_BLANCA_VENDEDOR.contains(clave)) continue;
                    revisadas++;
                    String url = patron.replaceAll("\\{[^}]+}", "1");
                    for (String token : new String[]{tokenA, tokenPendiente}) {
                        int st = mockMvc.perform(request(HttpMethod.valueOf(rm.name()), url)
                                .header("Authorization", token)
                                .contentType(MediaType.APPLICATION_JSON).content("{}"))
                            .andReturn().getResponse().getStatus();
                        if (st != 403) abiertas.add(clave + " → " + st);
                    }
                }
            }
        }
        assertThat(revisadas).as("se enumeraron rutas /api/admin").isGreaterThan(50);
        assertThat(abiertas).as("rutas /api/admin alcanzables por EMPRENDEDOR sin estar en la lista blanca").isEmpty();
    }

    // ── P4-01 ────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("P4-01 | marcas: comprador y vendedor sin negocio → 403; vendedor crea marca de su negocio")
    void marcasSoloVendedorConNegocio() throws Exception {
        String body = "{\"nombreMarca\":\"MarcaP401\"}";
        for (String t : new String[]{userToken, tokenSinEmpresa}) {
            mockMvc.perform(post("/api/marcas").header("Authorization", t)
                    .contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isForbidden());
            mockMvc.perform(post("/api/marcas/bulk").header("Authorization", t)
                    .contentType(MediaType.APPLICATION_JSON).content("[" + body + "]")).andExpect(status().isForbidden());
        }
        mockMvc.perform(post("/api/marcas").header("Authorization", tokenA)
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.empresaId").value(empresaA.getId().intValue()));
    }

    // ── P9-02 ────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("P9-02 | crear-cliente con correo que ya tiene cuenta → 409 genérico, sin tocar la cuenta")
    void crearClienteCorreoExistente409() throws Exception {
        String hashAntes = clienteB.getContrasenaHash();
        mockMvc.perform(post("/api/admin/asignar/crear-cliente").header("Authorization", tokenA)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"nombre\":\"Otro\",\"correo\":\"CLIENTE-ZETA-B@test.cr\"}"))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.message", containsString("clientes existentes")))
            .andExpect(content().string(not(containsString("Zeta"))));
        Usuario b = usuarioRepository.findById(clienteB.getId()).orElseThrow();
        assertThat(b.getContrasenaHash()).isEqualTo(hashAntes);
        assertThat(b.getEmpresaRegistro().getId()).isEqualTo(empresaB.getId());
    }

    @Test
    @DisplayName("P9-02 | cliente nuevo creado por vendedor queda con correo sin verificar")
    void crearClienteNuevoSinVerificar() throws Exception {
        mockMvc.perform(post("/api/admin/asignar/crear-cliente").header("Authorization", tokenA)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"nombre\":\"Nuevo\",\"correo\":\"nuevo-p902@test.cr\"}"))
            .andExpect(status().is2xxSuccessful());
        assertThat(usuarioRepository.findByCorreo("nuevo-p902@test.cr").orElseThrow().getCorreoVerificado()).isFalse();
    }

    // ── P9-01 ────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("P9-01 | buscar-cliente: vendedor ve solo sus clientes, DTO mínimo, máx 20, mín 3 caracteres")
    void buscarClienteAcotado() throws Exception {
        mockMvc.perform(get("/api/admin/asignar/buscar-cliente?q=zeta").header("Authorization", tokenA))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[*].id", hasItem(clienteA.getId().intValue())))
            .andExpect(jsonPath("$.data[*].id", not(hasItem(clienteB.getId().intValue()))))
            .andExpect(jsonPath("$.data[0].identificacion").doesNotExist())
            .andExpect(jsonPath("$.data[0].clerkUserId").doesNotExist())
            .andExpect(jsonPath("$.data[0].notasInternas").doesNotExist());
        mockMvc.perform(get("/api/admin/asignar/buscar-cliente?q=ze").header("Authorization", tokenA))
            .andExpect(status().isOk()).andExpect(jsonPath("$.data", hasSize(0)));
        // pendiente de aprobación: su empresa no tiene clientes → no ve a nadie
        mockMvc.perform(get("/api/admin/asignar/buscar-cliente?q=zeta").header("Authorization", tokenPendiente))
            .andExpect(status().isOk()).andExpect(jsonPath("$.data", hasSize(0)));
        mockMvc.perform(get("/api/admin/asignar/buscar-cliente?q=zeta").header("Authorization", tokenSinEmpresa))
            .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/admin/asignar/buscar-cliente?q=zeta").header("Authorization", userToken))
            .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/admin/asignar/buscar-cliente?q=zeta")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/admin/asignar/buscar-cliente?q=zeta").header("Authorization", adminToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[*].id", hasItems(clienteA.getId().intValue(), clienteB.getId().intValue())));

        Rol rolUser = obtenerOCrearRol(Constants.ROL_USUARIO_FINAL, 1);
        for (int i = 0; i < 25; i++) {
            Usuario u = crearUsuario("muchos" + i + "@test.cr", "Zeta Muchos " + i, rolUser);
            u.setEmpresaRegistro(empresaA);
            usuarioRepository.save(u);
        }
        mockMvc.perform(get("/api/admin/asignar/buscar-cliente?q=zeta").header("Authorization", tokenA))
            .andExpect(jsonPath("$.data", hasSize(20)));
    }

    @Test
    @DisplayName("P9-01 | asignar compra a un cliente de otro negocio → 403")
    void compraClienteAjeno() throws Exception {
        String body = "{\"usuarioId\":" + clienteB.getId() + ",\"items\":[{\"productoId\":1,\"cantidad\":1,\"precioUnitario\":1}]}";
        mockMvc.perform(post("/api/admin/asignar/compra").header("Authorization", tokenA)
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/admin/asignar/compra").header("Authorization", userToken)
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isForbidden());
    }

    // ── SEG-1 ────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("SEG-1 | PUT comisión: vendedor (aprobado/pendiente), comprador → 403, anónimo 401; ADMIN 200; GET vendedor 200")
    void comisionSoloAdmin() throws Exception {
        String body = "{\"pctComisionTarjeta\":0,\"pctDescuentoSinpe\":10}";
        for (String t : new String[]{tokenA, tokenPendiente, tokenSinEmpresa, userToken}) {
            mockMvc.perform(put("/api/admin/configuracion/comision").header("Authorization", t)
                    .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isForbidden());
        }
        mockMvc.perform(put("/api/admin/configuracion/comision").contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/admin/configuracion/comision").header("Authorization", tokenA))
            .andExpect(status().isOk());
        mockMvc.perform(put("/api/admin/configuracion/comision?empresaId=" + empresaA.getId())
                .header("Authorization", adminToken).contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isOk()).andExpect(jsonPath("$.data.pctDescuentoSinpe").value(10));
        mockMvc.perform(put("/api/admin/configuracion/comision?empresaId=" + empresaA.getId())
                .header("Authorization", adminToken).contentType(MediaType.APPLICATION_JSON)
                .content("{\"pctDescuentoSinpe\":150}"))
            .andExpect(status().isBadRequest());
    }

    // ── SEG-2 ────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("SEG-2 | ruleta: asignar-giro solo ADMIN; giros/historial/girar ajenos → 403")
    void ruleta() throws Exception {
        long victima = clienteA.getId();
        for (String t : new String[]{userToken, tokenA, tokenPendiente}) {
            mockMvc.perform(post("/api/ruleta/admin/asignar-giro/" + victima + "?tipoOrigen=COMPRA").header("Authorization", t))
                .andExpect(status().isForbidden());
            mockMvc.perform(post("/api/ruleta/admin/asignar-giro/" + testUser.getId() + "?tipoOrigen=COMPRA").header("Authorization", t))
                .andExpect(status().isForbidden());
        }
        mockMvc.perform(post("/api/ruleta/admin/asignar-giro/" + victima + "?tipoOrigen=COMPRA"))
            .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/ruleta/admin/asignar-giro/" + victima + "?tipoOrigen=COMPRA").header("Authorization", adminToken))
            .andExpect(status().isOk());
        GiroRuleta giro = giroRuletaRepository.findAll().get(0);

        mockMvc.perform(get("/api/ruleta/giros-disponibles/" + victima).header("Authorization", userToken))
            .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/ruleta/historial/" + victima).header("Authorization", userToken))
            .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/ruleta/girar/" + giro.getId() + "/usuario/" + victima).header("Authorization", userToken))
            .andExpect(status().isForbidden());
        // usar el giro ajeno pasando el propio usuarioId
        mockMvc.perform(post("/api/ruleta/girar/" + giro.getId() + "/usuario/" + testUser.getId()).header("Authorization", userToken))
            .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/ruleta/giros-disponibles/" + testUser.getId()).header("Authorization", userToken))
            .andExpect(status().isOk());
        assertThat(giroRuletaRepository.findById(giro.getId()).orElseThrow().getUsado()).isFalse();
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private Empresa crearEmpresa(String nombre, String slug, String estado) {
        Empresa e = new Empresa();
        e.setNombreEmpresa(nombre);
        e.setSlug(slug);
        e.setCorreoEmpresa(slug + "@test.cr");
        e.setEstadoEmpresa(estado);
        e.setFechaRegistro(LocalDateTime.now());
        return empresaRepository.saveAndFlush(e);
    }

    private Usuario conEmpresa(Usuario u, Empresa empresa) {
        u.setEmpresa(empresa);
        return usuarioRepository.saveAndFlush(u);
    }
}
