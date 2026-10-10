package com.hotclick.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.model.Bodega;
import com.hotclick.model.Empresa;
import com.hotclick.model.TiendaRapida;
import com.hotclick.model.Usuario;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.TiendaRapidaRepository;
import com.hotclick.service.consola.TiendaRapidaReglas;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import java.time.LocalDateTime;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@DisplayName("Negocio rápido: enlace de asignación de un solo uso y onboarding guiado")
class NegocioRapidoAsignacionTest extends BaseIntegrationTest {

    private static final String ADMIN_API = "/api/admin/consola/tiendas-rapidas";
    private static final String PUBLICO = "/api/public/tienda-rapida/";
    private static final String ONBOARDING = "/api/emprendedor/negocio-rapido/onboarding";

    @Autowired private TiendaRapidaRepository rapidas;
    @Autowired private EmpresaRepository empresas;
    @Autowired private BodegaRepository bodegas;
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

    private JsonNode crear(String negocio) throws Exception {
        String body = mockMvc.perform(post(ADMIN_API).header("Authorization", adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("negocio", negocio, "persona", "Ana Mora",
                    "telefono", "88887777", "dias", 30))))
            .andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString();
        return json.readTree(body).path("data");
    }

    private String aceptarBody(boolean acepto, String correo) throws Exception {
        return json.writeValueAsString(Map.of("acepto", acepto, "versionLegal", TiendaRapidaReglas.VERSION_LEGAL,
            "persona", "Ana Mora Solís", "cedula", "112340567", "correo", correo,
            "telefono", "88887777", "clave", "clave-segura-1"));
    }

    @Test
    @DisplayName("Solo el admin de plataforma crea, regenera y revoca (comprador y emprendedor → 403)")
    void soloAdmin() throws Exception {
        String cuerpo = json.writeValueAsString(Map.of("negocio", "X", "persona", "Y Z", "telefono", "88887777", "dias", 30));
        mockMvc.perform(post(ADMIN_API).header("Authorization", userToken)
            .contentType(MediaType.APPLICATION_JSON).content(cuerpo)).andExpect(status().isForbidden());
        Usuario emp = crearUsuario("emp-nr@test.cr", "Emp NR", obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5));
        String tokenEmp = "Bearer " + jwtUtil.generateToken(emp.getCorreo(), emp.getId(), Constants.ROL_EMPRENDEDOR);
        mockMvc.perform(post(ADMIN_API).header("Authorization", tokenEmp)
            .contentType(MediaType.APPLICATION_JSON).content(cuerpo)).andExpect(status().isForbidden());
        mockMvc.perform(post(ADMIN_API + "/1/revocar").header("Authorization", tokenEmp)).andExpect(status().isForbidden());
        mockMvc.perform(post(ADMIN_API + "/1/regenerar").header("Authorization", userToken)).andExpect(status().isForbidden());
        assertThat(rapidas.count()).isZero();
    }

    @Test
    @DisplayName("El token solo viaja en la respuesta: en la base queda el SHA-256, vence y lo crea el admin")
    void tokenGuardadoComoHash() throws Exception {
        JsonNode creada = crear("Panadería Sol");
        String token = creada.path("token").asText();
        assertThat(token).matches("[A-Za-z0-9_-]{24,}");
        TiendaRapida fila = rapidas.findById(creada.path("id").asLong()).orElseThrow();
        assertThat(fila.getToken()).isNull();
        assertThat(fila.getTokenHash()).isEqualTo(TiendaRapidaReglas.hashToken(token));
        assertThat(fila.getEnlaceVence()).isAfter(LocalDateTime.now(Constants.ZONA_CR));
        assertThat(fila.getCreadoPor()).isEqualTo(adminUser.getId());
        mockMvc.perform(get(ADMIN_API).header("Authorization", adminToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[0].estadoEnlace").value("VIGENTE"))
            .andExpect(jsonPath("$.data[0].token").doesNotExist());
    }

    @Test
    @DisplayName("Aceptar exige la casilla, guarda fecha, IP con hash, usuario y versión; el segundo uso da 409")
    void aceptarUnaSolaVez() throws Exception {
        String token = crear("Ferretería Luna").path("token").asText();
        mockMvc.perform(get(PUBLICO + token)).andExpect(status().isOk())
            .andExpect(jsonPath("$.data.versionLegal").value(TiendaRapidaReglas.VERSION_LEGAL));

        mockMvc.perform(post(PUBLICO + token).contentType(MediaType.APPLICATION_JSON)
            .content(aceptarBody(false, "ana-nr@test.cr"))).andExpect(status().isBadRequest());

        mockMvc.perform(post(PUBLICO + token).contentType(MediaType.APPLICATION_JSON)
                .with(r -> { r.setRemoteAddr("203.0.113.9"); return r; })
                .content(aceptarBody(true, "ana-nr@test.cr")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.estado").value("LISTA"));

        TiendaRapida fila = rapidas.findByTokenHash(TiendaRapidaReglas.hashToken(token)).orElseThrow();
        assertThat(fila.getUsadoEn()).isNotNull();
        assertThat(fila.getAceptadoEn()).isNotNull();
        assertThat(fila.getVersionLegal()).isEqualTo(TiendaRapidaReglas.VERSION_LEGAL);
        assertThat(fila.getAceptadoPor()).isEqualTo(fila.getUsuario().getId());
        assertThat(fila.getAceptadoIpHash()).matches("[0-9a-f]{64}").doesNotContain("203.0.113.9");
        String raw = jdbcTemplate.queryForObject(
            "SELECT aceptado_ip_hash FROM hot_click_tienda_rapida_tb WHERE id_tienda_rapida = ?", String.class, fila.getId());
        assertThat(raw).doesNotContain("203.0.113");

        Usuario dueno = usuarioRepository.findByCorreo("ana-nr@test.cr").orElseThrow();
        assertThat(dueno.getEmpresa().getId()).isEqualTo(fila.getEmpresa().getId());
        assertThat(dueno.getRoles()).anyMatch(r -> Constants.ROL_EMPRENDEDOR.equals(r.getNombreRol()));

        mockMvc.perform(post(PUBLICO + token).contentType(MediaType.APPLICATION_JSON)
            .content(aceptarBody(true, "otra-nr@test.cr"))).andExpect(status().isConflict());
        mockMvc.perform(get(PUBLICO + token)).andExpect(status().isConflict());
        mockMvc.perform(post(ADMIN_API + "/" + fila.getId() + "/regenerar").header("Authorization", adminToken))
            .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("Enlace vencido → 410 y no consume nada")
    void enlaceVencido() throws Exception {
        JsonNode creada = crear("Vivero Norte");
        String token = creada.path("token").asText();
        jdbcTemplate.update("UPDATE hot_click_tienda_rapida_tb SET enlace_vence = ? WHERE id_tienda_rapida = ?",
            LocalDateTime.now(Constants.ZONA_CR).minusMinutes(1), creada.path("id").asLong());
        mockMvc.perform(get(PUBLICO + token)).andExpect(status().isGone());
        mockMvc.perform(post(PUBLICO + token).contentType(MediaType.APPLICATION_JSON)
            .content(aceptarBody(true, "vencido-nr@test.cr"))).andExpect(status().isGone());
        assertThat(rapidas.findById(creada.path("id").asLong()).orElseThrow().getUsadoEn()).isNull();
        assertThat(usuarioRepository.findByCorreo("vencido-nr@test.cr")).isEmpty();
    }

    @Test
    @DisplayName("Revocar anula el enlace (410); regenerar da uno nuevo y el viejo deja de servir")
    void revocarYRegenerar() throws Exception {
        JsonNode creada = crear("Taller Río");
        long id = creada.path("id").asLong();
        String viejo = creada.path("token").asText();
        mockMvc.perform(post(ADMIN_API + "/" + id + "/revocar").header("Authorization", adminToken))
            .andExpect(status().isOk()).andExpect(jsonPath("$.data.estadoEnlace").value("REVOCADO"));
        mockMvc.perform(get(PUBLICO + viejo)).andExpect(status().isGone());

        String body = mockMvc.perform(post(ADMIN_API + "/" + id + "/regenerar").header("Authorization", adminToken))
            .andExpect(status().isOk()).andExpect(jsonPath("$.data.estadoEnlace").value("VIGENTE"))
            .andReturn().getResponse().getContentAsString();
        String nuevo = json.readTree(body).path("data").path("token").asText();
        assertThat(nuevo).isNotEqualTo(viejo);
        mockMvc.perform(get(PUBLICO + viejo)).andExpect(status().isNotFound());
        mockMvc.perform(get(PUBLICO + nuevo)).andExpect(status().isOk());
    }

    @Test
    @DisplayName("Onboarding: bodega primero, después producto; negocio y cobro no se adelantan")
    void ordenDelOnboarding() throws Exception {
        String token = crear("Dulces Ana").path("token").asText();
        mockMvc.perform(post(PUBLICO + token).contentType(MediaType.APPLICATION_JSON)
            .content(aceptarBody(true, "dulces-nr@test.cr"))).andExpect(status().isOk());
        Usuario dueno = usuarioRepository.findByCorreo("dulces-nr@test.cr").orElseThrow();
        Empresa empresa = dueno.getEmpresa();
        String sesion = "Bearer " + jwtUtil.generateToken(dueno.getCorreo(), dueno.getId(),
            Constants.ROL_EMPRENDEDOR, empresa.getId(), empresa.getSlug());

        mockMvc.perform(get(ONBOARDING).header("Authorization", sesion)).andExpect(status().isOk())
            .andExpect(jsonPath("$.data.siguiente").value("BODEGA"))
            .andExpect(jsonPath("$.data.pasos[0].paso").value("BODEGA"))
            .andExpect(jsonPath("$.data.pasos[1].estado").value("BLOQUEADO"))
            .andExpect(jsonPath("$.data.completo").value(false));
        mockMvc.perform(put(ONBOARDING + "/NEGOCIO").header("Authorization", sesion)
            .contentType(MediaType.APPLICATION_JSON).content("{\"accion\":\"OMITIR\"}")).andExpect(status().isBadRequest());
        mockMvc.perform(put(ONBOARDING + "/BODEGA").header("Authorization", sesion)
            .contentType(MediaType.APPLICATION_JSON).content("{\"accion\":\"OMITIR\"}")).andExpect(status().isBadRequest());

        Bodega b = new Bodega();
        b.setNombreBodega("Bodega Ana");
        b.setDireccionExacta("Calle 1");
        b.setTelefono("88887777");
        b.setCorreoContacto("bodega-nr@test.cr");
        b.setAdminCliente(dueno);
        b.setEmpresa(empresa);
        b.setEstado(Constants.ESTADO_ACTIVO);
        bodegas.saveAndFlush(b);

        mockMvc.perform(get(ONBOARDING).header("Authorization", sesion)).andExpect(status().isOk())
            .andExpect(jsonPath("$.data.pasos[0].estado").value("HECHO"))
            .andExpect(jsonPath("$.data.siguiente").value("PRODUCTO"))
            .andExpect(jsonPath("$.data.pasos[2].estado").value("BLOQUEADO"));
        mockMvc.perform(put(ONBOARDING + "/COBRO").header("Authorization", sesion)
            .contentType(MediaType.APPLICATION_JSON).content("{\"accion\":\"HECHO\"}")).andExpect(status().isBadRequest());

        mockMvc.perform(get(ONBOARDING).header("Authorization", userToken)).andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Enlace viejo de V157 con token en claro: al abrirlo pasa a hash y exige la aceptación")
    void enlaceV157EnClaro() throws Exception {
        JsonNode creada = crear("Legado Uno");
        long id = creada.path("id").asLong();
        String viejo = "PlainTokenV157abcdefghij";
        jdbcTemplate.update("UPDATE hot_click_tienda_rapida_tb SET token = ?, token_hash = NULL, enlace_vence = NULL "
            + "WHERE id_tienda_rapida = ?", viejo, id);
        mockMvc.perform(get(PUBLICO + viejo)).andExpect(status().isOk());
        TiendaRapida fila = rapidas.findById(id).orElseThrow();
        assertThat(fila.getToken()).isNull();
        assertThat(fila.getTokenHash()).isEqualTo(TiendaRapidaReglas.hashToken(viejo));
        assertThat(fila.getEnlaceVence()).isEqualTo(fila.getVence());
        mockMvc.perform(post(PUBLICO + viejo).contentType(MediaType.APPLICATION_JSON)
            .content(aceptarBody(false, "legado-nr@test.cr"))).andExpect(status().isBadRequest());
        mockMvc.perform(post(PUBLICO + viejo).contentType(MediaType.APPLICATION_JSON)
            .content(aceptarBody(true, "legado-nr@test.cr"))).andExpect(status().isOk());
        mockMvc.perform(get(PUBLICO + viejo)).andExpect(status().isConflict());
    }
}
