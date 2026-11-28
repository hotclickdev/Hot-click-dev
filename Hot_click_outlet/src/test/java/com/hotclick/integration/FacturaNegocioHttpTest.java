package com.hotclick.integration;

import com.hotclick.model.Empresa;
import com.hotclick.model.FacturaNegocio;
import com.hotclick.model.MiembroEmpresa;
import com.hotclick.model.Rol;
import com.hotclick.model.Usuario;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.FacturaNegocioRepository;
import com.hotclick.utils.Constants;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.function.Supplier;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/**
 * Fase 2: matriz de autorización HTTP real (filtro + @PreAuthorize + CompanyScope + interceptor de cajero) y
 * aislamiento entre negocios de "Factura a HotClick" y "Facturas de negocios". H2; almacenamiento simulado.
 * Cédulas y correos ficticios.
 */
@DisplayName("Fase 2: matriz de autorización y aislamiento de la factura del negocio (HTTP)")
class FacturaNegocioHttpTest extends BaseIntegrationTest {

    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private FacturaNegocioRepository facturaRepository;

    private Empresa empA, empB;
    private FacturaNegocio facA, facB;
    private String tDuenoA, tCajeroA, tDuenoB, tImpLectura, tImpEscritura;

    @BeforeEach
    void setUp() {
        empA = empresa("fn-a");
        empB = empresa("fn-b");
        Rol rolEmp = obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5);
        tDuenoA = token(miembro("fn-dueno-a@test.cr", "PROPIETARIO", rolEmp, empA), empA);
        tCajeroA = token(miembro("fn-cajero-a@test.cr", "CAJERO", rolEmp, empA), empA);
        tDuenoB = token(miembro("fn-dueno-b@test.cr", "PROPIETARIO", rolEmp, empB), empB);
        String lectura = jwtUtil.generateImpersonationToken(adminUser.getCorreo(), adminUser.getId(),
            Constants.ROL_EMPRENDEDOR, empA.getId(), empA.getSlug(), adminUser.getId(), adminUser.getCorreo());
        tImpLectura = "Bearer " + lectura;
        tImpEscritura = "Bearer " + jwtUtil.generateImpersonationWriteToken(lectura, "QA factura negocio 15+ caracteres");
        facA = factura(empA);
        facB = factura(empB);
        when(supabaseStorageService.subirXmlPrivado(any(), anyString())).thenReturn("privado/prueba.xml");
    }

    @AfterEach
    void tearDown() {
        facturaRepository.deleteAll();
        miembroEmpresaRepository.deleteAll();
        usuarioRepository.findAll().forEach(u -> { u.setEmpresa(null); u.setEmpresaRegistro(null); usuarioRepository.save(u); });
        empresaRepository.deleteAll();
    }

    // ── fixtures ────────────────────────────────────────────────────────────────────────────────────────────

    private Empresa empresa(String slug) {
        Empresa e = new Empresa();
        e.setNombreEmpresa(slug); e.setNombreComercial(slug); e.setSlug(slug);
        e.setCorreoEmpresa(slug + "@test.cr"); e.setEstadoEmpresa("ACTIVO"); e.setFechaRegistro(LocalDateTime.now());
        e.setSituacionFiscal("INSCRITO");
        e.setCedulaFiscal("3101123456");
        e.setFiscalVerificado(true);
        return empresaRepository.saveAndFlush(e);
    }

    private FacturaNegocio factura(Empresa e) {
        FacturaNegocio f = new FacturaNegocio();
        f.setEmpresaId(e.getId());
        f.setPeriodoDesde(LocalDate.of(2026, 3, 1));
        f.setPeriodoHasta(LocalDate.of(2026, 3, 15));
        f.setMontoCrc(1130);
        f.setFechaLimite(LocalDate.of(2026, 3, 22));
        f.setEstado(FacturaNegocio.PENDIENTE);
        f.setFechaCreacion(LocalDateTime.now());
        f.setFechaActualizacion(LocalDateTime.now());
        return facturaRepository.saveAndFlush(f);
    }

    private Usuario miembro(String correo, String rolEquipo, Rol rol, Empresa emp) {
        Usuario u = crearUsuario(correo, rolEquipo, rol);
        u.setEmpresa(emp);
        u = usuarioRepository.saveAndFlush(u);
        miembroEmpresaRepository.saveAndFlush(new MiembroEmpresa(u, emp, rolEquipo));
        return u;
    }

    private String token(Usuario u, Empresa emp) {
        return "Bearer " + jwtUtil.generateToken(u.getCorreo(), u.getId(), Constants.ROL_EMPRENDEDOR, emp.getId(), emp.getSlug());
    }

    private int st(MockHttpServletRequestBuilder b, String token) throws Exception {
        if (token != null) b.header("Authorization", token);
        return mockMvc.perform(b).andReturn().getResponse().getStatus();
    }

    private String body(MockHttpServletRequestBuilder b, String token) throws Exception {
        return mockMvc.perform(b.header("Authorization", token)).andReturn().getResponse().getContentAsString();
    }

    private static MockHttpServletRequestBuilder subir(Long id) {
        return MockMvcRequestBuilders.multipart("/api/empresa/facturas-hotclick/" + id + "/xml")
            .file(new MockMultipartFile("xml", "f.xml", "application/xml", "<x/>".getBytes(StandardCharsets.UTF_8)));
    }

    // ── matriz del negocio ──────────────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("GET: anónimo fuera; comprador 403; cajero, dueño e impersonación ven; ADMIN sin empresa 403")
    void matrizLectura() throws Exception {
        var ruta = get("/api/empresa/facturas-hotclick");
        assertThat(st(get("/api/empresa/facturas-hotclick"), null)).isIn(401, 403);
        assertThat(st(get("/api/empresa/facturas-hotclick"), userToken)).isEqualTo(403);
        assertThat(st(get("/api/empresa/facturas-hotclick"), tCajeroA)).isEqualTo(200);
        assertThat(st(get("/api/empresa/facturas-hotclick"), tDuenoA)).isEqualTo(200);
        assertThat(st(get("/api/empresa/facturas-hotclick"), tImpLectura)).isEqualTo(200);
        assertThat(st(ruta, adminToken)).isEqualTo(403);
    }

    @Test
    @DisplayName("Subir XML: solo el dueño; anónimo, comprador, cajero, ADMIN e impersonación no")
    void matrizSubida() throws Exception {
        assertThat(st(subir(facA.getId()), null)).isIn(401, 403);
        assertThat(st(subir(facA.getId()), userToken)).isEqualTo(403);
        assertThat(st(subir(facA.getId()), tCajeroA)).isEqualTo(403);
        assertThat(st(subir(facA.getId()), adminToken)).isEqualTo(403);
        assertThat(st(subir(facA.getId()), tImpLectura)).isEqualTo(403);
        assertThat(st(subir(facA.getId()), tImpEscritura)).isEqualTo(403);
        assertThat(facturaRepository.findById(facA.getId()).orElseThrow().getEstado()).isEqualTo(FacturaNegocio.PENDIENTE);
        // Dueño: llega al servicio; un XML inválido queda RECHAZADA con motivos.
        String r = body(subir(facA.getId()), tDuenoA);
        assertThat((String) JsonPath.read(r, "$.data.estado")).isEqualTo(FacturaNegocio.RECHAZADA);
        assertThat((List<?>) JsonPath.read(r, "$.data.errores")).isNotEmpty();
    }

    @Test
    @DisplayName("Aislamiento: el dueño de B no ve ni sube la factura de A (404)")
    void aislamiento() throws Exception {
        assertThat(st(subir(facA.getId()), tDuenoB)).isEqualTo(404);
        assertThat(facturaRepository.findById(facA.getId()).orElseThrow().getEstado()).isEqualTo(FacturaNegocio.PENDIENTE);
        String r = body(get("/api/empresa/facturas-hotclick"), tDuenoB);
        List<Integer> ids = JsonPath.read(r, "$.data.historial[*].id");
        assertThat(ids).containsExactly(facB.getId().intValue());
    }

    // ── matriz ADMIN ────────────────────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("/api/admin/facturas-negocio/**: solo el ADMIN real; dueño, cajero, comprador e impersonación 403")
    void matrizAdmin() throws Exception {
        String id = String.valueOf(facA.getId());
        List<Supplier<MockHttpServletRequestBuilder>> rutas = List.of(
            () -> get("/api/admin/facturas-negocio"),
            () -> get("/api/admin/facturas-negocio/" + id),
            () -> post("/api/admin/facturas-negocio/" + id + "/revisada"),
            () -> post("/api/admin/facturas-negocio/" + id + "/recordar"),
            () -> post("/api/admin/facturas-negocio/generar"));
        for (int i = 0; i < rutas.size(); i++) {
            assertThat(st(rutas.get(i).get(), null)).as("anónimo, ruta " + i).isIn(401, 403);
            for (String t : new String[] {userToken, tDuenoA, tCajeroA, tImpLectura, tImpEscritura}) {
                assertThat(st(rutas.get(i).get(), t)).as("ruta " + i + " con token ajeno al ADMIN").isEqualTo(403);
            }
        }
        assertThat(st(get("/api/admin/facturas-negocio?estado=PENDIENTE"), adminToken)).isEqualTo(200);
        String lista = body(get("/api/admin/facturas-negocio"), adminToken);
        assertThat((Integer) JsonPath.read(lista, "$.data.total")).isEqualTo(2);
        assertThat(st(get("/api/admin/facturas-negocio/" + id), adminToken)).isEqualTo(200);
        assertThat(st(post("/api/admin/facturas-negocio/" + id + "/revisada"), adminToken)).isEqualTo(200);
        assertThat(facturaRepository.findById(facA.getId()).orElseThrow().isRevisada()).isTrue();
        assertThat(st(post("/api/admin/facturas-negocio/generar"), adminToken)).isEqualTo(200);
    }
}
