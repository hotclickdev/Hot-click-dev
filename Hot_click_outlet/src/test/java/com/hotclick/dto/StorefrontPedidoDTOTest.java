package com.hotclick.dto;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Pedido de tienda pública: domicilio y teléfono de contacto")
class StorefrontPedidoDTOTest {

    private static Validator validator;

    @BeforeAll
    static void setUpValidator() {
        validator = Validation.buildDefaultValidatorFactory().getValidator();
    }

    @Test
    @DisplayName("DOMICILIO sin dirección → inválido")
    void domicilioSinDireccion_invalido() {
        StorefrontPedidoDTO dto = pedidoBase(StorefrontPedidoDTO.ENVIO_DOMICILIO);
        dto.setDireccionEntrega("  ");

        Set<ConstraintViolation<StorefrontPedidoDTO>> errores = validator.validate(dto);

        assertThat(errores)
            .extracting(ConstraintViolation::getMessage)
            .contains("La dirección de entrega es requerida para envío a domicilio");
    }

    @Test
    @DisplayName("DOMICILIO con dirección → válido")
    void domicilioConDireccion_valido() {
        StorefrontPedidoDTO dto = pedidoBase(StorefrontPedidoDTO.ENVIO_DOMICILIO);
        dto.setDireccionEntrega("San José, Barrio Escalante, 100 m norte");

        assertThat(validator.validate(dto)).isEmpty();
    }

    @Test
    @DisplayName("RETIRO sin dirección → válido")
    void retiroSinDireccion_valido() {
        StorefrontPedidoDTO dto = pedidoBase(StorefrontPedidoDTO.ENVIO_RETIRO);
        dto.setDireccionEntrega(null);

        assertThat(validator.validate(dto)).isEmpty();
    }

    @Test
    @DisplayName("sin teléfono → inválido")
    void sinTelefono_invalido() {
        StorefrontPedidoDTO dto = pedidoBase(StorefrontPedidoDTO.ENVIO_RETIRO);
        dto.setTelefonoCliente("  ");

        assertThat(validator.validate(dto))
            .extracting(ConstraintViolation::getMessage)
            .contains("El teléfono de contacto es requerido");
    }

    @Test
    @DisplayName("teléfono con menos de 8 dígitos → inválido")
    void telefonoCorto_invalido() {
        StorefrontPedidoDTO dto = pedidoBase(StorefrontPedidoDTO.ENVIO_RETIRO);
        dto.setTelefonoCliente("123-4567");

        assertThat(validator.validate(dto))
            .extracting(ConstraintViolation::getMessage)
            .contains("El teléfono de contacto debe tener al menos "
                + StorefrontPedidoDTO.TELEFONO_MIN_DIGITOS + " dígitos");
    }

    @Test
    @DisplayName("teléfono con 8 dígitos y guiones → válido")
    void telefonoFormateado_valido() {
        StorefrontPedidoDTO dto = pedidoBase(StorefrontPedidoDTO.ENVIO_RETIRO);
        dto.setTelefonoCliente("8888-8888");

        assertThat(validator.validate(dto)).isEmpty();
    }

    private static StorefrontPedidoDTO pedidoBase(String metodoEnvio) {
        StorefrontPedidoDTO dto = new StorefrontPedidoDTO();
        dto.setNombreCliente("Ana Pérez");
        dto.setCorreoCliente("ana@ejemplo.com");
        dto.setTelefonoCliente("88888888");
        dto.setMetodoPago("SINPE_MOVIL");
        dto.setMetodoEnvio(metodoEnvio);
        dto.setItems(List.of(new StorefrontPedidoDTO.ItemDTO(1L, 1)));
        return dto;
    }
}
