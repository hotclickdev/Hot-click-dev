package com.hotclick.integration;

import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.time.LocalDateTime;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;

@DisplayName("LECTOR solo lectura: no escribe productos, pedidos ni wallet; cobros enmascarados")
class RolesLectorSoloLecturaTest extends BaseIntegrationTest {

    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private MiembroEmpresaRepository miembroEmpresaRepository;
    @Autowired private MetodoCobroRepository metodoCobroRepository;
    @Autowired private SolicitudAprobacionRepository solicitudAprobacionRepository;
    @Autowired private CodigoOtpRepository codigoOtpRepository;

    private Empresa emp;
    private String tokenDueno, tokenLector, tokenEditor;

    @BeforeEach
    void setUp() {
        Empresa e = new Empresa();
        e.setNombreEmpresa("LSL"); e.setNombreComercial("LSL"); e.setSlug("lsl-ro");
        e.setCorreoEmpresa("lsl@test.cr"); e.setEstadoEmpresa("ACTIVO"); e.setFechaRegistro(LocalDateTime.now());
        emp = empresaRepository.saveAndFlush(e);
        Rol rolEmp = obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5);
        tokenDueno = miembro("lsl-dueno@test.cr", "PROPIETARIO", rolEmp);
        tokenLector = miembro("lsl-lector@test.cr", "LECTOR", rolEmp);
        tokenEditor = miembro("lsl-editor@test.cr", "EDITOR", rolEmp);
    }

    @AfterEach
    void tearDown() {
        solicitudAprobacionRepository.deleteAll();
        metodoCobroRepository.deleteAll();
        codigoOtpRepository.deleteAll();
        miembroEmpresaRepository.deleteAll();
        usuarioRepository.findAll().forEach(u -> { u.setEmpresa(null); usuarioRepository.save(u); });
        empresaRepository.deleteAll();
    }

    private String miembro(String correo, String rolEquipo, Rol rol) {
        Usuario u = crearUsuario(correo, rolEquipo, rol);
        u.setEmpresa(emp);
        u = usuarioRepository.saveAndFlush(u);
        miembroEmpresaRepository.saveAndFlush(new MiembroEmpresa(u, emp, rolEquipo));
        return "Bearer " + jwtUtil.generateToken(u.getCorreo(), u.getId(), Constants.ROL_EMPRENDEDOR, emp.getId(), emp.getSlug());
    }

    private static MockHttpServletRequestBuilder json(MockHttpServletRequestBuilder b, String body) {
        return b.contentType(MediaType.APPLICATION_JSON).content(body);
    }

    /** Ids inexistentes y cuerpos vacíos: sin guarda dan 400/404, nunca crean datos. */
    private Map<String, MockHttpServletRequestBuilder> escrituras() {
        Map<String, MockHttpServletRequestBuilder> m = new LinkedHashMap<>();
        m.put("POST /api/productos", json(post("/api/productos"), "{}"));
        m.put("PUT /api/productos/{id}", json(put("/api/productos/999999"), "{}"));
        m.put("DELETE /api/productos/{id}", delete("/api/productos/999999"));
        m.put("PATCH /api/productos/{id}/visibilidad-catalogo", json(patch("/api/productos/999999/visibilidad-catalogo"), "{\"visible\":false}"));
        m.put("PATCH /api/productos/{id}/oferta", json(patch("/api/productos/999999/oferta"), "{}"));
        m.put("POST /api/productos/bulk", json(post("/api/productos/bulk"), "[]"));
        m.put("POST /api/productos/archivar-sin-stock", post("/api/productos/archivar-sin-stock"));
        m.put("POST /api/productos/{id}/imagenes", post("/api/productos/999999/imagenes"));
        m.put("POST /api/pedidos", json(post("/api/pedidos"), "{}"));
        m.put("POST /api/pedidos/manual", json(post("/api/pedidos/manual"), "{}"));
        m.put("PUT /api/pedidos/{id}/estado", json(put("/api/pedidos/999999/estado"), "{\"estado\":\"ENTREGADO\"}"));
        m.put("PUT /api/pedidos/{id}/guia", json(put("/api/pedidos/999999/guia"), "{\"numeroGuia\":\"X1\"}"));
        m.put("POST /api/pedidos/{id}/notificar", post("/api/pedidos/999999/notificar"));
        m.put("DELETE /api/pedidos/{id}", delete("/api/pedidos/999999"));
        m.put("POST /api/wallet/payout", json(post("/api/wallet/payout"), "{\"monto\":1000}"));
        return m;
    }

    @Test
    void lectorRecibe403EnEscriturasDeProductosPedidosYWallet() throws Exception {
        List<String> abiertos = new ArrayList<>();
        for (var e : escrituras().entrySet()) {
            int st = mockMvc.perform(e.getValue().header("Authorization", tokenLector)).andReturn().getResponse().getStatus();
            if (st != 403) abiertos.add(e.getKey() + " -> " + st);
        }
        System.out.println("LECTOR-RESULTADO abiertos=" + abiertos);
        assertThat(abiertos).as("escrituras que LECTOR todavía puede hacer").isEmpty();
    }

    @Test
    void editorYPropietarioSiguenEscribiendoProductosYPedidos() throws Exception {
        for (String t : new String[]{tokenEditor, tokenDueno}) {
            for (String k : List.of("PUT /api/productos/{id}", "POST /api/productos", "PUT /api/pedidos/{id}/estado", "POST /api/pedidos/manual")) {
                int st = mockMvc.perform(escrituras().get(k).header("Authorization", t)).andReturn().getResponse().getStatus();
                assertThat(st).as(k).isNotEqualTo(403);
            }
        }
    }

    @Test
    void lectorLeeProductosPedidosYCobrosEnmascarados() throws Exception {
        String r = mockMvc.perform(json(post("/api/metodos-cobro"), "{\"tipo\":\"SINPE\",\"dato\":\"88887777\"}")
            .header("Authorization", tokenDueno)).andReturn().getResponse().getContentAsString();
        assertThat(r).contains("\"id\"");
        assertThat(mockMvc.perform(get("/api/pedidos").header("Authorization", tokenLector)).andReturn().getResponse().getStatus()).isEqualTo(200);
        assertThat(mockMvc.perform(get("/api/wallet/saldo").header("Authorization", tokenLector)).andReturn().getResponse().getStatus()).isNotEqualTo(403);
        var resp = mockMvc.perform(get("/api/metodos-cobro").header("Authorization", tokenLector)).andReturn().getResponse();
        assertThat(resp.getStatus()).isEqualTo(200);
        String body = resp.getContentAsString();
        assertThat(body).doesNotContain("88887777").contains("7777");
    }
}
