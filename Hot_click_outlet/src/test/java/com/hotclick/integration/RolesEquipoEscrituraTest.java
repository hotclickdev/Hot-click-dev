package com.hotclick.integration;

import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import java.util.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@DisplayName("A2 | LECTOR y EDITOR no gestionan cobros, billing, datos fiscales ni equipo")
class RolesEquipoEscrituraTest extends BaseIntegrationTest {

    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private MiembroEmpresaRepository miembroEmpresaRepository;
    @Autowired private CodigoOtpRepository codigoOtpRepository;
    @Autowired private MetodoCobroRepository metodoCobroRepository;
    @Autowired private SolicitudAprobacionRepository solicitudAprobacionRepository;
    @Autowired private org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    private Empresa emp;
    private String tokenDueno, tokenLector, tokenEditor;
    private Long idEditor;

    @BeforeEach
    void setUp() {
        Empresa e = new Empresa();
        e.setNombreEmpresa("A2RO"); e.setNombreComercial("A2RO"); e.setSlug("a2ro");
        e.setCorreoEmpresa("a2ro@test.cr"); e.setEstadoEmpresa("ACTIVO"); e.setFechaRegistro(LocalDateTime.now());
        emp = empresaRepository.saveAndFlush(e);
        Rol rolEmp = obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5);
        tokenDueno = miembro("a2ro-dueno@test.cr", "PROPIETARIO", rolEmp);
        tokenLector = miembro("a2ro-lector@test.cr", "LECTOR", rolEmp);
        tokenEditor = miembro("a2ro-editor@test.cr", "EDITOR", rolEmp);
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
        if ("EDITOR".equals(rolEquipo)) idEditor = u.getId();
        return "Bearer " + jwtUtil.generateToken(u.getCorreo(), u.getId(), Constants.ROL_EMPRENDEDOR, emp.getId(), emp.getSlug());
    }

    private static final String COBRO = "{\"tipo\":\"SINPE\",\"dato\":\"88887777\"}";

    private Map<String, MockHttpServletRequestBuilder> escrituras(Long metodoId) {
        Map<String, MockHttpServletRequestBuilder> m = new LinkedHashMap<>();
        m.put("POST /api/metodos-cobro", post("/api/metodos-cobro").contentType(MediaType.APPLICATION_JSON).content(COBRO));
        m.put("PUT /api/metodos-cobro/{id}", put("/api/metodos-cobro/" + metodoId).contentType(MediaType.APPLICATION_JSON).content(COBRO));
        m.put("PUT /api/metodos-cobro/{id}/predeterminado", put("/api/metodos-cobro/" + metodoId + "/predeterminado"));
        m.put("PUT /api/billing/preferencias", put("/api/billing/preferencias").contentType(MediaType.APPLICATION_JSON).content("{\"diaCobro\":13}"));
        m.put("PUT /api/empresa/perfil/fiscal", put("/api/empresa/perfil/fiscal").contentType(MediaType.APPLICATION_JSON).content("{\"cedulaJuridica\":\"3101123456\"}"));
        m.put("POST /api/empresa/equipo", post("/api/empresa/equipo").contentType(MediaType.APPLICATION_JSON).content("{\"nombre\":\"X\",\"correo\":\"a2ro-nuevo@test.cr\",\"password\":\"Clave-A2ro-123\",\"rolEnEmpresa\":\"EDITOR\"}"));
        m.put("PUT /api/empresa/equipo/{id}/rol", put("/api/empresa/equipo/" + idEditor + "/rol").contentType(MediaType.APPLICATION_JSON).content("{\"rolEnEmpresa\":\"ADMIN\"}"));
        m.put("POST /api/billing/cancelar", post("/api/billing/cancelar"));
        return m;
    }

    @Test
    void lectorYEditorReciben403EnEscriturasDeGestion() throws Exception {
        String r = mockMvc.perform(post("/api/metodos-cobro").header("Authorization", tokenDueno)
            .contentType(MediaType.APPLICATION_JSON).content(COBRO)).andReturn().getResponse().getContentAsString();
        assertThat(r).as("el propietario crea un método de cobro").contains("\"id\"");
        Long metodoId = com.jayway.jsonpath.JsonPath.parse(r).read("$.data.id", Long.class);

        List<String> abiertos = new ArrayList<>();
        for (String[] t : new String[][]{{"LECTOR", tokenLector}, {"EDITOR", tokenEditor}}) {
            for (var e : escrituras(metodoId).entrySet()) {
                int st = mockMvc.perform(e.getValue().header("Authorization", t[1])).andReturn().getResponse().getStatus();
                if (st != 403) abiertos.add(t[0] + " " + e.getKey() + " -> " + st);
            }
        }
        System.out.println("A2-RESULTADO abiertos=" + abiertos);
        assertThat(abiertos).as("escrituras de gestión que LECTOR/EDITOR pueden hacer").isEmpty();
    }

    @Test
    void propietarioPasaElGuardDeCobrosYBilling() throws Exception {
        int st = mockMvc.perform(post("/api/metodos-cobro").header("Authorization", tokenDueno)
            .contentType(MediaType.APPLICATION_JSON).content(COBRO)).andReturn().getResponse().getStatus();
        assertThat(st).isNotEqualTo(403);
        st = mockMvc.perform(put("/api/billing/preferencias").header("Authorization", tokenDueno)
            .contentType(MediaType.APPLICATION_JSON).content("{\"diaCobro\":13}")).andReturn().getResponse().getStatus();
        assertThat(st).isEqualTo(200);
    }
}
