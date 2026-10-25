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

@DisplayName("LECTOR deny por defecto: 403 en escrituras de negocio salvo @PermiteLector; empresa/equipo solo dueño")
class RolesLectorDenyPorDefectoTest extends BaseIntegrationTest {

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
        e.setNombreEmpresa("LSL"); e.setNombreComercial("LSL"); e.setSlug("lsl-dd");
        e.setCorreoEmpresa("ldd@test.cr"); e.setEstadoEmpresa("ACTIVO"); e.setFechaRegistro(LocalDateTime.now());
        emp = empresaRepository.saveAndFlush(e);
        Rol rolEmp = obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5);
        tokenDueno = miembro("ldd-dueno@test.cr", "PROPIETARIO", rolEmp);
        tokenLector = miembro("ldd-lector@test.cr", "LECTOR", rolEmp);
        tokenEditor = miembro("ldd-editor@test.cr", "EDITOR", rolEmp);
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

    private Map<String, MockHttpServletRequestBuilder> escrituras() {
        Map<String, MockHttpServletRequestBuilder> m = new LinkedHashMap<>();
        m.put("POST /api/pos/venta", json(post("/api/pos/venta"), "{}"));
        m.put("POST /api/pos/caja/abrir", json(post("/api/pos/caja/abrir"), "{}"));
        m.put("PUT /api/pos/caja/{id}/cerrar", json(put("/api/pos/caja/999999/cerrar"), "{}"));
        m.put("POST /api/pos/qr", json(post("/api/pos/qr"), "{}"));
        m.put("DELETE /api/pos/qr/{token}", delete("/api/pos/qr/no-existe"));
        m.put("POST /api/inventario/paquetes", json(post("/api/inventario/paquetes"), "{}"));
        m.put("POST /api/stock/ajuste-entrada/{id}", json(post("/api/stock/ajuste-entrada/999999"), "{}"));
        m.put("POST /api/bodegas", json(post("/api/bodegas"), "{}"));
        m.put("DELETE /api/bodegas/{id}", delete("/api/bodegas/999999"));
        m.put("POST /api/cupones/solicitar", json(post("/api/cupones/solicitar"), "{}"));
        m.put("POST /api/categorias", json(post("/api/categorias"), "{}"));
        m.put("PUT /api/categorias/{id}", json(put("/api/categorias/999999"), "{}"));
        m.put("POST /api/metodos-cobro", json(post("/api/metodos-cobro"), "{\"tipo\":\"SINPE\",\"dato\":\"88887777\"}"));
        m.put("PUT /api/metodos-cobro/{id}", json(put("/api/metodos-cobro/999999"), "{}"));
        m.put("PUT /api/metodos-cobro/{id}/predeterminado", put("/api/metodos-cobro/999999/predeterminado"));
        m.put("POST /api/productos", json(post("/api/productos"), "{}"));
        m.put("PUT /api/pedidos/{id}/estado", json(put("/api/pedidos/999999/estado"), "{\"estado\":\"ENTREGADO\"}"));
        m.put("POST /api/wallet/payout", json(post("/api/wallet/payout"), "{\"monto\":1000}"));
        m.put("PUT /api/empresa/perfil", json(put("/api/empresa/perfil"), "{}"));
        m.put("POST /api/empresa/equipo", json(post("/api/empresa/equipo"), "{}"));
        return m;
    }

    private int status(MockHttpServletRequestBuilder b, String token) throws Exception {
        return mockMvc.perform(b.header("Authorization", token)).andReturn().getResponse().getStatus();
    }

    @Test
    void lectorRecibe403EnTodasLasEscriturasDeNegocio() throws Exception {
        List<String> abiertos = new ArrayList<>();
        for (var e : escrituras().entrySet()) {
            int st = status(e.getValue(), tokenLector);
            if (st != 403) abiertos.add(e.getKey() + " -> " + st);
        }
        System.out.println("LECTOR-DD abiertos=" + abiertos);
        assertThat(abiertos).as("escrituras que LECTOR todavía puede hacer").isEmpty();
    }

    @Test
    void cuerpo403UsaFormatoResponseDTO() throws Exception {
        var resp = mockMvc.perform(json(post("/api/categorias"), "{}").header("Authorization", tokenLector)).andReturn().getResponse();
        assertThat(resp.getStatus()).isEqualTo(403);
        var node = new com.fasterxml.jackson.databind.ObjectMapper().readTree(resp.getContentAsString());
        assertThat(node.get("success").asBoolean()).isFalse();
        assertThat(node.get("message").asText()).isEqualTo("Tu rol de Lector es solo de visualización.");
        assertThat(node.has("timestamp")).isTrue();
        assertThat(node.has("data")).isTrue();
    }

    @Test
    void editorYPropietarioSiguenEscribiendo() throws Exception {
        for (String t : new String[]{tokenEditor, tokenDueno}) {
            for (String k : List.of("POST /api/categorias", "POST /api/bodegas", "POST /api/pos/venta", "PUT /api/metodos-cobro/{id}")) {
                assertThat(status(escrituras().get(k), t)).as(k).isNotEqualTo(403);
            }
        }
    }

    @Test
    void empresaYEquipoSoloDueno() throws Exception {
        assertThat(status(escrituras().get("PUT /api/empresa/perfil"), tokenEditor)).isEqualTo(403);
        assertThat(status(escrituras().get("POST /api/empresa/equipo"), tokenEditor)).isEqualTo(403);
        assertThat(status(escrituras().get("PUT /api/empresa/perfil"), tokenDueno)).isNotEqualTo(403);
    }

    @Test
    void lectorLeeYUsaEndpointsPersonalesYPublicos() throws Exception {
        assertThat(status(get("/api/categorias"), tokenLector)).isNotEqualTo(403);
        assertThat(status(get("/api/bodegas"), tokenLector)).isNotEqualTo(403);
        assertThat(status(get("/api/metodos-cobro"), tokenLector)).isEqualTo(200);
        // opt-in @PermiteLector (acción personal) y ruta pública sin negocio
        assertThat(status(json(post("/api/contacto"), "{}"), tokenLector)).isNotEqualTo(403);
        int login = mockMvc.perform(json(post("/api/auth/login"), "{\"correo\":\"x@y.cr\",\"password\":\"bad\"}"))
            .andReturn().getResponse().getStatus();
        assertThat(login).isNotEqualTo(403);
        assertThat(status(json(post("/api/auth/logout"), "{}"), tokenLector)).isNotEqualTo(403);
    }
}
