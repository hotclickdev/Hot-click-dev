package com.hotclick.config;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.fasterxml.jackson.databind.module.SimpleModule;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.hotclick.model.Bodega;
import com.hotclick.model.Empresa;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.HashSet;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * La bodega se publica por lista blanca: un visitante solo recibe lo que el catálogo
 * y el checkout usan. Cualquier campo nuevo de Bodega queda oculto hasta agregarlo a la lista.
 */
@DisplayName("[SEGURIDAD] Bodega y contacto de Empresa en la API pública: solo campos permitidos")
class CamposInternosSerializerModifierTest {

    private static final Set<String> SENSIBLES = Set.of(
        "telefono", "correoContacto", "encargadoNombre", "latitud", "longitud", "capacidadMaxima",
        "horarioApertura", "horarioCierre", "empresaId", "estado", "fechaCreacion");

    @Test
    @DisplayName("Visitante, bodega sin retiro: solo id, nombre, provincia, cantón y si permite retiro")
    void visitante_sinRetiro_soloCamposPublicos() throws Exception {
        JsonNode json = serializar(bodegaCompleta(false), false);

        assertThat(campos(json)).containsExactlyInAnyOrderElementsOf(CamposInternosSerializerModifier.BODEGA_PUBLICOS);
        assertThat(json.get("nombreBodega").asText()).isEqualTo("Bodega Centro");
        assertThat(json.get("provincia").asText()).isEqualTo("San José");
    }

    @Test
    @DisplayName("Visitante, bodega con retiro: suma la dirección, nunca teléfono, correo, encargado ni coordenadas")
    void visitante_conRetiro_soloSumaDireccion() throws Exception {
        JsonNode json = serializar(bodegaCompleta(true), false);

        Set<String> esperados = new HashSet<>(CamposInternosSerializerModifier.BODEGA_PUBLICOS);
        esperados.add("direccionExacta");
        assertThat(campos(json)).containsExactlyInAnyOrderElementsOf(esperados);
        assertThat(campos(json)).doesNotContainAnyElementsOf(SENSIBLES);
        assertThat(json.toString()).doesNotContain("61234567", "bodega-secreta@test.cr", "Encargado Secreto", "9.93333333");
    }

    @Test
    @DisplayName("Dueño o ADMIN: recibe la bodega completa (panel sin cambios)")
    void duenio_recibeTodo() throws Exception {
        JsonNode json = serializar(bodegaCompleta(false), true);

        assertThat(campos(json)).containsAll(SENSIBLES).contains("direccionExacta");
        assertThat(json.get("telefono").asText()).isEqualTo("61234567");
        assertThat(json.get("encargadoNombre").asText()).isEqualTo("Encargado Secreto");
    }

    // ── Empresa entera (p. ej. /api/cotizaciones/publica/{token}) ─────────────────────────────

    @org.junit.jupiter.params.ParameterizedTest(name = "visitante, plan PYME/NEGOCIO_PLUS={0}: contacto visible={0}")
    @org.junit.jupiter.params.provider.ValueSource(booleans = {false, true})
    @DisplayName("Visitante: correo, teléfono, WhatsApp e Instagram de la empresa solo con plan pago")
    void empresa_visitante_contactoSegunPlan(boolean planPago) throws Exception {
        JsonNode json = serializarEmpresa(empresaConContacto(), false, planPago);

        assertThat(json.get("nombreComercial").asText()).isEqualTo("Casa Luna 506");
        if (planPago) {
            assertThat(campos(json)).containsAll(CamposInternosSerializerModifier.EMPRESA_CONTACTO);
            assertThat(json.get("numeroWhatsapp").asText()).isEqualTo("50688880506");
        } else {
            assertThat(campos(json)).doesNotContainAnyElementsOf(CamposInternosSerializerModifier.EMPRESA_CONTACTO);
            assertThat(json.toString()).doesNotContain("50688880506", "22223333", "tienda@casaluna.cr", "casaluna506");
        }
    }

    @Test
    @DisplayName("Dueño o ADMIN: ve el contacto de su empresa aunque el plan sea EMPRENDEDOR (panel sin cambios)")
    void empresa_duenio_veContacto() throws Exception {
        JsonNode json = serializarEmpresa(empresaConContacto(), true, false);
        assertThat(campos(json)).containsAll(CamposInternosSerializerModifier.EMPRESA_CONTACTO);
    }

    private static JsonNode serializarEmpresa(Empresa empresa, boolean puedeVer, boolean planPago) throws Exception {
        SimpleModule modulo = new SimpleModule("camposInternosEmpresaTest");
        modulo.setSerializerModifier(new CamposInternosSerializerModifier(id -> puedeVer, id -> planPago));
        JsonMapper mapper = JsonMapper.builder().addModule(new JavaTimeModule()).addModule(modulo).build();
        return mapper.readTree(mapper.writeValueAsString(empresa));
    }

    private static Empresa empresaConContacto() {
        Empresa e = new Empresa();
        e.setId(42L);
        e.setNombreComercial("Casa Luna 506");
        e.setNumeroWhatsapp("50688880506");
        e.setTelefonoEmpresa("22223333");
        e.setCorreoEmpresa("tienda@casaluna.cr");
        e.setInstagram("casaluna506");
        return e;
    }

    private static JsonNode serializar(Bodega bodega, boolean puedeVer) throws Exception {
        SimpleModule modulo = new SimpleModule("camposInternosTest");
        modulo.setSerializerModifier(new CamposInternosSerializerModifier(empresaId -> puedeVer));
        JsonMapper mapper = JsonMapper.builder().addModule(new JavaTimeModule()).addModule(modulo).build();
        return mapper.readTree(mapper.writeValueAsString(bodega));
    }

    private static Set<String> campos(JsonNode json) {
        Set<String> nombres = new HashSet<>();
        json.fieldNames().forEachRemaining(nombres::add);
        return nombres;
    }

    private static Bodega bodegaCompleta(boolean permiteRetiro) {
        Empresa empresa = new Empresa();
        empresa.setId(42L);
        Bodega b = new Bodega();
        b.setId(7L);
        b.setNombreBodega("Bodega Centro");
        b.setDireccionExacta("Calle Secreta 123");
        b.setTelefono("61234567");
        b.setCorreoContacto("bodega-secreta@test.cr");
        b.setEncargadoNombre("Encargado Secreto");
        b.setCapacidadMaxima(500);
        b.setLatitud(new BigDecimal("9.93333333"));
        b.setLongitud(new BigDecimal("-84.08333333"));
        b.setHorarioApertura(LocalTime.of(8, 0));
        b.setHorarioCierre(LocalTime.of(18, 0));
        b.setProvincia("San José");
        b.setCanton("Escazú");
        b.setPermiteRetiroCliente(permiteRetiro);
        b.setFechaCreacion(LocalDateTime.of(2026, 1, 1, 10, 0));
        b.setEmpresa(empresa);
        return b;
    }
}
