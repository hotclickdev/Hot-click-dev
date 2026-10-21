package com.hotclick.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.TiendaRapidaRepository;
import com.hotclick.service.consola.TiendaRapidaReglas;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Decisión del dueño (16-oct-2026): la frecuencia de liquidación es obligatoria en toda alta de negocio y no hay
 * valor por defecto. Campo JSON {@code frecuenciaLiquidacion} (alias {@code frecuenciaPayout}), QUINCENAL o MENSUAL.
 * Sin frecuencia (o inválida) → 400 FRECUENCIA_INVALIDA, nunca 500, y no se crea nada.
 * Caminos: registro, upgrade de cuenta existente, «Crear otro negocio» y tienda rápida del admin (la elige el
 * dueño al aceptar el enlace). Los seeders locales/QA ponen un valor explícito.
 */
@DisplayName("Alta de negocio — frecuencia de liquidación obligatoria (FRECUENCIA_INVALIDA)")
class AltaNegocioFrecuenciaObligatoriaTest extends BaseIntegrationTest {

    @Autowired private EmpresaRepository empresas;
    @Autowired private BodegaRepository bodegas;
    @Autowired private TiendaRapidaRepository rapidas;
    @Autowired private ObjectMapper json;

    @BeforeEach
    void setUp() {
        obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5);
    }

    @AfterEach
    void tearDown() {
        rapidas.deleteAll();
        bodegas.deleteAll();
        miembroEmpresaRepository.deleteAll();
        usuarioRepository.findAll().stream()
            .filter(u -> u.getEmpresa() != null)
            .forEach(u -> { u.setEmpresa(null); usuarioRepository.save(u); });
        empresas.deleteAll();
    }

    private static void esFrecuenciaInvalida(ResultActions r) throws Exception {
        r.andExpect(status().isBadRequest())
         .andExpect(jsonPath("$.code").value("FRECUENCIA_INVALIDA"))
         .andExpect(jsonPath("$.data.codigo").value("FRECUENCIA_INVALIDA"));
    }

    /** "-" = sin el campo. */
    private static Map<String, Object> conFrecuencia(Map<String, Object> base, String f) {
        Map<String, Object> m = new HashMap<>(base);
        if (!"-".equals(f)) m.put("frecuenciaLiquidacion", f);
        return m;
    }

    @ParameterizedTest(name = "registro-empresa frecuenciaLiquidacion=''{0}''")
    @ValueSource(strings = {"", "SEMANAL", "-"})
    void registroEmpresa(String f) throws Exception {
        Map<String, Object> body = conFrecuencia(Map.of("nombreEmpresa", "Frec Reg", "correoEmpresa", "frec-reg@test.cr",
            "nombreAdmin", "Ana Mora", "correoAdmin", "frec-reg-admin@test.cr", "passwordAdmin", "clave-segura-1",
            "declaraMayoriaEdad", true), f);
        esFrecuenciaInvalida(mockMvc.perform(post("/api/auth/registro-empresa")
            .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body))));
        assertThat(empresas.existsByCorreoEmpresa("frec-reg@test.cr")).isFalse();
        assertThat(usuarioRepository.findByCorreo("frec-reg-admin@test.cr")).isEmpty();
    }

    @ParameterizedTest(name = "upgrade-emprendedor frecuenciaLiquidacion=''{0}''")
    @ValueSource(strings = {"", "SEMANAL", "-"})
    void upgradeEmprendedor(String f) throws Exception {
        Map<String, Object> body = conFrecuencia(Map.of("nombreEmpresa", "Frec Upg", "correoEmpresa", "frec-upg@test.cr",
            "telefonoEmpresa", "22225555"), f);
        esFrecuenciaInvalida(mockMvc.perform(post("/api/auth/upgrade-emprendedor").header("Authorization", userToken)
            .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body))));
        assertThat(empresas.existsByCorreoEmpresa("frec-upg@test.cr")).isFalse();
    }

    @ParameterizedTest(name = "nuevo-negocio frecuenciaLiquidacion=''{0}''")
    @ValueSource(strings = {"", "SEMANAL", "-"})
    void nuevoNegocio(String f) throws Exception {
        Map<String, Object> body = conFrecuencia(Map.of("nombreEmpresa", "Frec Otro", "correoEmpresa", "frec-otro@test.cr"), f);
        esFrecuenciaInvalida(mockMvc.perform(post("/api/auth/nuevo-negocio").header("Authorization", userToken)
            .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body))));
        assertThat(empresas.existsByCorreoEmpresa("frec-otro@test.cr")).isFalse();
    }

    @ParameterizedTest(name = "tienda rápida (admin) frecuenciaLiquidacion=''{0}''")
    @ValueSource(strings = {"", "SEMANAL", "-"})
    void tiendaRapidaAceptar(String f) throws Exception {
        String creada = mockMvc.perform(post("/api/admin/consola/tiendas-rapidas").header("Authorization", adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("negocio", "Frec Rápida", "persona", "Ana Mora",
                    "telefono", "88887777", "dias", 30))))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        JsonNode data = json.readTree(creada).path("data");
        Map<String, Object> body = conFrecuencia(Map.of("acepto", true, "versionLegal", TiendaRapidaReglas.VERSION_LEGAL,
            "persona", "Ana Mora Solís", "cedula", "112340567", "correo", "frec-rapida@test.cr",
            "telefono", "88887777"), f);
        esFrecuenciaInvalida(mockMvc.perform(post("/api/public/tienda-rapida/" + data.path("token").asText())
            .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body))));
        assertThat(empresas.existsByCorreoEmpresa("frec-rapida@test.cr")).isFalse();
    }

    @Test
    @DisplayName("nuevo-negocio con frecuenciaLiquidacion=mensual → se guarda MENSUAL; el alias frecuenciaPayout también vale")
    void nuevoNegocio_guardaFrecuencia_yAceptaAlias() throws Exception {
        mockMvc.perform(post("/api/auth/nuevo-negocio").header("Authorization", userToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"nombreEmpresa\":\"Frec Ok\",\"correoEmpresa\":\"frec-ok@test.cr\",\"frecuenciaLiquidacion\":\"mensual\"}"))
            .andExpect(status().isOk());
        assertThat(empresas.findByCorreoEmpresa("frec-ok@test.cr").orElseThrow().getFrecuenciaPayout()).isEqualTo("MENSUAL");

        mockMvc.perform(post("/api/auth/nuevo-negocio").header("Authorization", userToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"nombreEmpresa\":\"Frec Alias\",\"correoEmpresa\":\"frec-alias@test.cr\",\"frecuenciaPayout\":\"QUINCENAL\"}"))
            .andExpect(status().isOk());
        assertThat(empresas.findByCorreoEmpresa("frec-alias@test.cr").orElseThrow().getFrecuenciaPayout()).isEqualTo("QUINCENAL");
    }
}
