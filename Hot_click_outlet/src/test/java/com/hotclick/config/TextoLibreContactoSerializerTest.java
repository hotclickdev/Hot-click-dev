package com.hotclick.config;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.fasterxml.jackson.databind.module.SimpleModule;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.hotclick.model.Cotizacion;
import com.hotclick.model.CotizacionItem;
import com.hotclick.model.EncargoPersonalizado;
import com.hotclick.model.Empresa;
import com.hotclick.model.Producto;
import com.hotclick.service.contacto.ContactoPublicoPolicy;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Texto libre del vendedor en la API pública: con plan sin contacto directo (EMPRENDEDOR, sin plan)
 * teléfonos, correos, @usuarios y enlaces externos salen como «[contacto oculto]»; PYME y NEGOCIO_PLUS
 * y el dueño o ADMIN reciben el texto guardado sin cambios. Nada se modifica en la base.
 */
@DisplayName("[NEGOCIO] Texto libre del vendedor: contacto oculto en la salida pública según plan")
class TextoLibreContactoSerializerTest {

    private static final String DESC = "Mesa de pino 200x90 cm, ₡17.500. Pedidos al 8888-8888 o @casaluna506.";
    private static final String DESC_OCULTA = "Mesa de pino 200x90 cm, ₡17.500. Pedidos al [contacto oculto] o [contacto oculto].";

    @ParameterizedTest(name = "plan {0} → texto con contacto visible={1}")
    @CsvSource({"EMPRENDEDOR, false", "GRATUITO, false", "PYME, true", "NEGOCIO_PLUS, true"})
    void producto_visitante_segunPlan(String plan, boolean conContacto) throws Exception {
        JsonNode json = serializar(producto("https://www.instagram.com/casaluna506/"), false, plan);

        assertThat(json.get("descripcionCorta").asText()).isEqualTo(conContacto ? DESC : DESC_OCULTA);
        assertThat(json.get("talla").asText()).isEqualTo(conContacto ? "Única · WhatsApp 8888 8888" : "Única · WhatsApp [contacto oculto]");
        assertThat(json.get("especificaciones").asText())
            .isEqualTo(conContacto ? "<p>Escríbanos a <b>ventas@casaluna.cr</b></p>" : "<p>Escríbanos a <b>[contacto oculto]</b></p>");
        assertThat(json.get("modelo").asText()).isEqualTo("modelo 2026");
        // Video de perfil: solo se publica con plan pago
        if (conContacto) {
            assertThat(json.get("videoUrl").asText()).isEqualTo("https://www.instagram.com/casaluna506/");
        } else {
            assertThat(json.has("videoUrl")).isFalse();
            assertThat(json.toString()).doesNotContain("8888-8888", "casaluna506", "ventas@casaluna.cr");
        }
    }

    @ParameterizedTest(name = "plan {0}: video de un contenido concreto se conserva")
    @CsvSource({"EMPRENDEDOR", "GRATUITO", "PYME", "NEGOCIO_PLUS"})
    void producto_videoConcreto_seConserva(String plan) throws Exception {
        JsonNode json = serializar(producto("https://youtu.be/dQw4w9WgXcQ"), false, plan);
        assertThat(json.get("videoUrl").asText()).isEqualTo("https://youtu.be/dQw4w9WgXcQ");
    }

    @Test
    @DisplayName("Dueño o ADMIN con plan EMPRENDEDOR: ve su texto y su video tal cual (panel sin cambios)")
    void producto_duenio_sinCambios() throws Exception {
        JsonNode json = serializar(producto("https://www.instagram.com/casaluna506/"), true, "EMPRENDEDOR");
        assertThat(json.get("descripcionCorta").asText()).isEqualTo(DESC);
        assertThat(json.get("videoUrl").asText()).isEqualTo("https://www.instagram.com/casaluna506/");
    }

    @ParameterizedTest(name = "plan {0}: encargo y cotización públicos, contacto visible={1}")
    @CsvSource({"EMPRENDEDOR, false", "PYME, true", "NEGOCIO_PLUS, true"})
    void encargoYCotizacion_segunPlan(String plan, boolean conContacto) throws Exception {
        Empresa empresa = new Empresa();
        empresa.setId(42L);

        EncargoPersonalizado encargo = new EncargoPersonalizado();
        encargo.setEmpresa(empresa);
        encargo.setMensajeVendedor("Listo, coordinemos al +506 8888-8888");
        JsonNode jEncargo = serializar(encargo, false, plan);
        assertThat(jEncargo.get("mensajeVendedor").asText())
            .isEqualTo(conContacto ? "Listo, coordinemos al +506 8888-8888" : "Listo, coordinemos al [contacto oculto]");

        Cotizacion cot = new Cotizacion();
        cot.setEmpresa(empresa);
        cot.setObservaciones("Precio ₡1.250.000. Dudas: facebook.com/casaluna506");
        CotizacionItem item = new CotizacionItem();
        item.setCotizacion(cot);
        item.setNombre("Sofá 3 plazas");
        item.setDescripcion("Tela gris 200x90 cm — info en t.me/casaluna");
        cot.setItems(List.of(item));
        JsonNode jCot = serializar(cot, false, plan);
        assertThat(jCot.get("observaciones").asText())
            .isEqualTo(conContacto ? "Precio ₡1.250.000. Dudas: facebook.com/casaluna506" : "Precio ₡1.250.000. Dudas: [contacto oculto]");
        assertThat(jCot.get("items").get(0).get("descripcion").asText())
            .isEqualTo(conContacto ? "Tela gris 200x90 cm — info en t.me/casaluna" : "Tela gris 200x90 cm — info en [contacto oculto]");
        assertThat(jCot.get("items").get(0).get("nombre").asText()).isEqualTo("Sofá 3 plazas");
    }

    private static Producto producto(String video) {
        Empresa empresa = new Empresa();
        empresa.setId(42L);
        Producto p = new Producto();
        p.setId(9L);
        p.setEmpresa(empresa);
        p.setNombreProducto("Mesa Luna");
        p.setDescripcionCorta(DESC);
        p.setEspecificaciones("<p>Escríbanos a <b>ventas@casaluna.cr</b></p>");
        p.setTalla("Única · WhatsApp 8888 8888");
        p.setModelo("modelo 2026");
        p.setVideoUrl(video);
        return p;
    }

    private static JsonNode serializar(Object bean, boolean puedeVer, String plan) throws Exception {
        SimpleModule modulo = new SimpleModule("textoLibreContactoTest");
        modulo.setSerializerModifier(new CamposInternosSerializerModifier(
            id -> puedeVer, id -> ContactoPublicoPolicy.permiteContacto(plan)));
        JsonMapper mapper = JsonMapper.builder().addModule(new JavaTimeModule()).addModule(modulo).build();
        return mapper.readTree(mapper.writeValueAsString(bean));
    }
}
