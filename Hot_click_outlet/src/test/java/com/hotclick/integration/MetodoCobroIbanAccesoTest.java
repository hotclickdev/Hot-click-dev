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
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@DisplayName("IBAN/SINPE | la cuenta de cobro solo la ve su negocio y solo la toca su propietario")
class MetodoCobroIbanAccesoTest extends BaseIntegrationTest {

    /** IBAN de relleno (no es una cuenta real). */
    private static final String IBAN_FALSO = "CR00" + "0000" + "0000" + "0000" + "0000" + "00";

    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private MiembroEmpresaRepository miembroEmpresaRepository;
    @Autowired private MetodoCobroRepository metodoCobroRepository;

    private Empresa empA, empB;
    private MetodoCobro cuentaB;
    private String duenoA, duenoB, editorB, comprador;

    @BeforeEach
    void setUp() {
        empA = empresa("ibana");
        empB = empresa("ibanb");
        Rol rolEmp = obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5);
        duenoA = miembro("iban-dueno-a@test.cr", empA, "PROPIETARIO", rolEmp);
        duenoB = miembro("iban-dueno-b@test.cr", empB, "PROPIETARIO", rolEmp);
        editorB = miembro("iban-editor-b@test.cr", empB, "EDITOR", rolEmp);
        Usuario c = crearUsuario("iban-comprador@test.cr", "COMPRADOR", obtenerOCrearRol(Constants.ROL_USUARIO_FINAL, 1));
        comprador = "Bearer " + jwtUtil.generateToken(c.getCorreo(), c.getId(), Constants.ROL_USUARIO_FINAL, null, null);
        MetodoCobro m = new MetodoCobro();
        m.setEmpresa(empB);
        m.setTipo(MetodoCobro.TIPO_IBAN);
        m.setDestino(IBAN_FALSO);
        m.setMascara("•••• 0000");
        m.setActivo(true);
        m.setFechaCreacion(LocalDateTime.now());
        cuentaB = metodoCobroRepository.saveAndFlush(m);
    }

    @AfterEach
    void tearDown() {
        metodoCobroRepository.deleteAll();
        miembroEmpresaRepository.deleteAll();
        usuarioRepository.findAll().forEach(u -> { u.setEmpresa(null); usuarioRepository.save(u); });
        empresaRepository.deleteAll();
    }

    private Empresa empresa(String slug) {
        Empresa e = new Empresa();
        e.setNombreEmpresa(slug); e.setNombreComercial(slug); e.setSlug(slug);
        e.setCorreoEmpresa(slug + "@test.cr"); e.setEstadoEmpresa("ACTIVO"); e.setFechaRegistro(LocalDateTime.now());
        return empresaRepository.saveAndFlush(e);
    }

    private String miembro(String correo, Empresa emp, String rolEquipo, Rol rol) {
        Usuario u = crearUsuario(correo, rolEquipo, rol);
        u.setEmpresa(emp);
        u = usuarioRepository.saveAndFlush(u);
        miembroEmpresaRepository.saveAndFlush(new MiembroEmpresa(u, emp, rolEquipo));
        return "Bearer " + jwtUtil.generateToken(u.getCorreo(), u.getId(), Constants.ROL_EMPRENDEDOR, emp.getId(), emp.getSlug());
    }

    @Test
    void otroNegocioRecibe403() throws Exception {
        mockMvc.perform(put("/api/metodos-cobro/" + cuentaB.getId() + "/predeterminado").header("Authorization", duenoA))
            .andExpect(status().isForbidden());
        mockMvc.perform(put("/api/metodos-cobro/" + cuentaB.getId()).header("Authorization", duenoA)
                .contentType(MediaType.APPLICATION_JSON).content("{\"tipo\":\"IBAN\",\"dato\":\"" + IBAN_FALSO + "\"}"))
            .andExpect(status().isForbidden());
        String listaA = mockMvc.perform(get("/api/metodos-cobro").header("Authorization", duenoA))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertThat(listaA).doesNotContain(String.valueOf(cuentaB.getId()) + ",\"tipo\"").doesNotContain(IBAN_FALSO);
    }

    @Test
    void soloElPropietarioCambiaLaCuenta() throws Exception {
        mockMvc.perform(put("/api/metodos-cobro/" + cuentaB.getId() + "/predeterminado").header("Authorization", editorB))
            .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/metodos-cobro").header("Authorization", editorB)
                .contentType(MediaType.APPLICATION_JSON).content("{\"tipo\":\"IBAN\",\"dato\":\"" + IBAN_FALSO + "\"}"))
            .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/metodos-cobro").header("Authorization", comprador))
            .andExpect(status().isForbidden());
        mockMvc.perform(put("/api/metodos-cobro/" + cuentaB.getId() + "/predeterminado").header("Authorization", duenoB))
            .andExpect(status().isOk());
    }

    @Test
    void elDuenoVeSoloLaMascara() throws Exception {
        String lista = mockMvc.perform(get("/api/metodos-cobro").header("Authorization", duenoB))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertThat(lista).contains("\"tipo\"").doesNotContain(IBAN_FALSO);
    }
}
