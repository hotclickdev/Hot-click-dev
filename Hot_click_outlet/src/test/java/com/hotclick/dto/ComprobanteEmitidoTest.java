package com.hotclick.dto;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.hotclick.model.ComprobanteFiscal;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("DTO de comprobante emitido")
class ComprobanteEmitidoTest {

    @Test
    @DisplayName("el JSON no lleva rutas de storage ni credenciales de Hacienda")
    void noFiltraSecretos() throws Exception {
        ComprobanteFiscal comprobante = new ComprobanteFiscal();
        comprobante.setId(7L);
        comprobante.setTipo(ComprobanteFiscal.TIPO_TIQUETE);
        comprobante.setEstado(ComprobanteFiscal.ESTADO_PENDIENTE);
        comprobante.setAmbiente(ComprobanteFiscal.AMBIENTE_STAG);
        comprobante.setClaveNumerica("50630092600310112345600100001040000000001123456781");
        comprobante.setTotalFactura(1_130);
        comprobante.setXmlPath("certificados/1/secreto.p12");
        comprobante.setXmlRespuestaPath("facturas/respuesta-con-pin.xml");

        String json = new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .writeValueAsString(ComprobanteEmitido.de(comprobante));

        assertThat(json).contains("PENDIENTE").contains("1130");
        assertThat(json).doesNotContain("xmlPath", "xmlRespuesta", "claveHacienda", "pinCert", "certificados", "secreto");
    }
}
