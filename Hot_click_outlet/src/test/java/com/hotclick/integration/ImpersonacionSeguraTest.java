package com.hotclick.integration;

import com.hotclick.model.AuditoriaAdmin;
import com.hotclick.model.Empresa;
import com.hotclick.model.TokenRevocado;
import com.hotclick.repository.AuditoriaAdminRepository;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.TokenRevocadoRepository;
import com.hotclick.service.TokenRevocadoService;
import com.hotclick.utils.Constants;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** «Ver como el negocio»: revocación por jti, solo lectura por defecto y escritura auditada con motivo. */
@DisplayName("[IMPERSONACION] Sesión de soporte segura")
class ImpersonacionSeguraTest extends BaseIntegrationTest {

    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private BodegaRepository bodegaRepository;
    @Autowired private AuditoriaAdminRepository auditoriaAdminRepository;
    @Autowired private TokenRevocadoRepository tokenRevocadoRepository;
    @Autowired private TokenRevocadoService tokenRevocadoService;

    private Empresa empresa;
    private String tokenSoporte;

    @BeforeEach
    void setUp() {
        Empresa e = new Empresa();
        e.setNombreEmpresa("Soporte Alpha");
        e.setSlug("soporte-alpha");
        e.setCorreoEmpresa("soporte-alpha@test.cr");
        e.setEstadoEmpresa("ACTIVO");
        e.setFechaRegistro(LocalDateTime.now());
        empresa = empresaRepository.saveAndFlush(e);
        tokenSoporte = "Bearer " + jwtUtil.generateImpersonationToken(adminUser.getCorreo(), adminUser.getId(),
            Constants.ROL_EMPRENDEDOR, empresa.getId(), empresa.getSlug(), adminUser.getId(), adminUser.getCorreo());
    }

    @AfterEach
    void tearDown() {
        bodegaRepository.deleteAll();
        auditoriaAdminRepository.deleteAll();
        tokenRevocadoRepository.deleteAll();
        empresaRepository.deleteAll();
    }

    @Test
    @DisplayName("Finalizar revoca el token: el mismo jti ya no autentica")
    void finalizar_revocaJti() throws Exception {
        mockMvc.perform(get("/api/bodegas").header("Authorization", tokenSoporte)).andExpect(status().isOk());
        mockMvc.perform(post("/api/impersonacion/" + empresa.getId() + "/finalizar")
            .header("Authorization", tokenSoporte)).andExpect(status().isOk());

        assertNoAutenticado(mockMvc.perform(get("/api/bodegas").header("Authorization", tokenSoporte)));
        assertThat(tokenRevocadoRepository.findAll()).extracting(TokenRevocado::getMotivo)
            .containsExactly(TokenRevocadoService.MOTIVO_IMPERSONACION_FIN);
    }

    @Test
    @DisplayName("Logout revoca el access token presentado")
    void logout_revocaAccessToken() throws Exception {
        mockMvc.perform(get("/api/bodegas").header("Authorization", adminToken)).andExpect(status().isOk());
        mockMvc.perform(post("/api/auth/logout").header("Authorization", adminToken)).andExpect(status().isOk());
        assertNoAutenticado(mockMvc.perform(get("/api/bodegas").header("Authorization", adminToken)));
    }

    @Test
    @DisplayName("Solo lectura por defecto: POST → 403 con mensaje claro y no se guarda nada")
    void soloLectura_bloqueaEscritura() throws Exception {
        crearBodega(tokenSoporte)
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.code").value("IMPERSONACION_SOLO_LECTURA"))
            .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("solo lectura")));
        assertThat(bodegaRepository.count()).isZero();
    }

    @Test
    @DisplayName("Habilitar escritura exige motivo de al menos 15 caracteres")
    void escritura_exigeMotivo() throws Exception {
        pedirEscritura(tokenSoporte, "corto").andExpect(status().isBadRequest());
        pedirEscritura(tokenSoporte, null).andExpect(status().isBadRequest());
        assertThat(tokenRevocadoRepository.count()).isZero();
    }

    @Test
    @DisplayName("Modo escritura: la escritura pasa y queda auditada con el admin original; el token de lectura se revoca")
    void escritura_permitidaYAuditada() throws Exception {
        String body = pedirEscritura(tokenSoporte, "Ticket 123: corregir dirección de bodega")
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.modo").value("ESCRITURA"))
            .andReturn().getResponse().getContentAsString();
        String tokenEscritura = "Bearer " + JsonPath.read(body, "$.data.accessToken");

        assertNoAutenticado(mockMvc.perform(get("/api/bodegas").header("Authorization", tokenSoporte)));

        int status = crearBodega(tokenEscritura).andReturn().getResponse().getStatus();
        assertThat(status).isBetween(200, 299);

        List<AuditoriaAdmin> audit = auditoriaAdminRepository.findAll();
        assertThat(audit).anySatisfy(a -> {
            assertThat(a.getAccion()).isEqualTo("IMPERSONACION_ESCRITURA_HABILITADA");
            assertThat(a.getDetalle()).contains("Ticket 123");
        });
        assertThat(audit).anySatisfy(a -> {
            assertThat(a.getAccion()).isEqualTo("IMPERSONACION_ESCRITURA");
            assertThat(a.getAdminId()).isEqualTo(adminUser.getId());
            assertThat(a.getAdminEmail()).isEqualTo(adminUser.getCorreo());
            assertThat(a.getEmpresaId()).isEqualTo(empresa.getId());
            assertThat(a.getDetalle()).startsWith("POST /api/bodegas -> " + status);
            assertThat(a.getFecha()).isNotNull();
        });
    }

    @Test
    @DisplayName("Purga: borra solo las entradas vencidas")
    void purga_borraVencidos() {
        LocalDateTime ahora = LocalDateTime.now(Constants.ZONA_CR);
        tokenRevocadoRepository.save(new TokenRevocado("viejo", ahora.minusMinutes(1), "LOGOUT", ahora));
        tokenRevocadoRepository.save(new TokenRevocado("vigente", ahora.plusMinutes(10), "LOGOUT", ahora));
        assertThat(tokenRevocadoService.purgarVencidos()).isEqualTo(1);
        assertThat(tokenRevocadoRepository.findAll()).extracting(TokenRevocado::getJti).containsExactly("vigente");
    }

    private void assertNoAutenticado(ResultActions r) throws Exception {
        assertThat(r.andReturn().getResponse().getStatus()).isIn(401, 403);
    }

    private ResultActions crearBodega(String token) throws Exception {
        return mockMvc.perform(post("/api/bodegas").header("Authorization", token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"nombreBodega\":\"Soporte\",\"direccionExacta\":\"Y\",\"telefono\":\"88881234\"}"));
    }

    private ResultActions pedirEscritura(String token, String motivo) throws Exception {
        String json = motivo == null ? "{}" : "{\"motivo\":\"" + motivo + "\"}";
        return mockMvc.perform(post("/api/impersonacion/" + empresa.getId() + "/escritura")
            .header("Authorization", token).contentType(MediaType.APPLICATION_JSON).content(json));
    }
}
