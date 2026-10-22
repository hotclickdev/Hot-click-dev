package com.hotclick.service;

import com.hotclick.dto.VentaRequestDTO;
import com.hotclick.exception.VentaEstadoInicialInvalidoException;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verifyNoInteractions;

@ExtendWith(MockitoExtension.class)
@DisplayName("Registro manual de ventas: estado inicial validado")
class VentaEstadoInicialTest {

    private static final String EFECTIVO = "EFECTIVO";
    private static final String RETIRO = Constants.ENVIO_RETIRO;
    private static final String DOMICILIO = Constants.ENVIO_DOMICILIO;

    @Mock private com.hotclick.repository.EmpresaRepository empresaRepository;
    @Mock private PedidoService pedidoService;
    @Mock private StockService stockService;
    @InjectMocks private VentaService service;

    @ParameterizedTest
    @ValueSource(strings = {"COMPLETADO", "ENTREGADO", "PENDIENTE"})
    @DisplayName("efectivo con retiro puede nacer cerrado o pendiente")
    void efectivoConRetiroConservaEstadoPermitido(String estado) {
        assertThat(VentaService.resolverEstadoInicial(EFECTIVO, RETIRO, estado)).isEqualTo(estado);
        assertThat(VentaService.resolverEstadoInicial(EFECTIVO, RETIRO, " " + estado.toLowerCase() + " "))
            .isEqualTo(estado);
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "   "})
    @DisplayName("efectivo con retiro sin estado nace COMPLETADO")
    void efectivoConRetiroSinEstado(String estado) {
        assertThat(VentaService.resolverEstadoInicial(EFECTIVO, RETIRO, null)).isEqualTo("COMPLETADO");
        assertThat(VentaService.resolverEstadoInicial(EFECTIVO, RETIRO, estado)).isEqualTo("COMPLETADO");
    }

    @ParameterizedTest
    @ValueSource(strings = {"COMPLETADO", "ENTREGADO", "PAGADO"})
    @DisplayName("efectivo con envio a domicilio nace siempre PENDIENTE")
    void efectivoConEnvioNacePendiente(String estado) {
        assertThat(VentaService.resolverEstadoInicial(EFECTIVO, DOMICILIO, estado)).isEqualTo("PENDIENTE");
        assertThat(VentaService.resolverEstadoInicial(EFECTIVO, DOMICILIO, null)).isEqualTo("PENDIENTE");
    }

    @ParameterizedTest
    @ValueSource(strings = {"PAGADO", "EN_PREPARACION", "ENVIADO", "CANCELADO"})
    @DisplayName("efectivo con retiro y estado conocido no permitido se fuerza a PENDIENTE")
    void estadoConocidoNoPermitidoSeFuerza(String estado) {
        assertThat(VentaService.resolverEstadoInicial(EFECTIVO, RETIRO, estado)).isEqualTo("PENDIENTE");
    }

    @ParameterizedTest
    @ValueSource(strings = {"RETIRO", "xyz", "retiro_en_tienda", " RETIRO_EN_TIENDA "})
    @DisplayName("metodo de envio desconocido no cuenta como retiro")
    void envioDesconocidoNoEsRetiro(String envio) {
        assertThat(VentaService.resolverEstadoInicial(EFECTIVO, envio, "COMPLETADO")).isEqualTo("PENDIENTE");
        assertThat(VentaService.resolverEstadoInicial(EFECTIVO, envio, "ENTREGADO")).isEqualTo("PENDIENTE");
    }

    @Test
    @DisplayName("el metodo no canonico nunca nace cerrado")
    void metodoNoEfectivoNoNaceCerrado() {
        assertThat(VentaService.resolverEstadoInicial("SINPE", RETIRO, "COMPLETADO")).isEqualTo("PENDIENTE");
    }

    @ParameterizedTest
    @ValueSource(strings = {"basura", "COMPLETADO y mas", "12345", "ENTREGADOX"})
    @DisplayName("estado desconocido se rechaza con 400")
    void estadoBasuraSeRechaza(String estado) {
        assertThatThrownBy(() -> VentaService.resolverEstadoInicial(EFECTIVO, RETIRO, estado))
            .isInstanceOf(VentaEstadoInicialInvalidoException.class);
    }

    @Test
    @DisplayName("estado de 31 caracteres o mas se rechaza")
    void estadoLargoSeRechaza() {
        assertThatThrownBy(() -> VentaService.resolverEstadoInicial(EFECTIVO, RETIRO, "A".repeat(31)))
            .isInstanceOf(VentaEstadoInicialInvalidoException.class);
        assertThatThrownBy(() -> VentaService.resolverEstadoInicial(EFECTIVO, RETIRO, "A".repeat(500)))
            .isInstanceOf(VentaEstadoInicialInvalidoException.class);
    }

    @Test
    @DisplayName("servicio: estado basura se rechaza antes de cualquier consulta o efecto")
    void servicioRechazaEstadoBasuraSinEfectos() {
        VentaRequestDTO dto = new VentaRequestDTO();
        VentaRequestDTO.ItemVentaDTO item = new VentaRequestDTO.ItemVentaDTO();
        item.setProductoId(10L);
        item.setCantidad(1);
        dto.setItems(List.of(item));
        dto.setEstadoInicial("basura");

        assertThatThrownBy(() -> service.crearVenta(dto, "op@test.cr", 1L))
            .isInstanceOf(VentaEstadoInicialInvalidoException.class);

        verifyNoInteractions(empresaRepository, pedidoService, stockService);
    }

    @Test
    @DisplayName("candado de reversibilidad: apagado vuelve el comportamiento anterior")
    void restriccionApagada() {
        assertThat(VentaService.resolverEstadoInicial(EFECTIVO, DOMICILIO, "PAGADO", false)).isEqualTo("PAGADO");
        assertThat(VentaService.resolverEstadoInicial(EFECTIVO, DOMICILIO, null, false)).isEqualTo("COMPLETADO");
        assertThat(VentaService.resolverEstadoInicial(EFECTIVO, RETIRO, "basura", false)).isEqualTo("basura");
    }

    @Test
    @DisplayName("la constante de produccion queda en true")
    void constanteEnTrue() throws ReflectiveOperationException {
        Field f = VentaService.class.getDeclaredField("ESTADO_INICIAL_VENTA_RESTRINGIDO");
        f.setAccessible(true);
        assertThat(Modifier.isStatic(f.getModifiers())).isTrue();
        assertThat(f.getBoolean(null)).isTrue();
    }
}
