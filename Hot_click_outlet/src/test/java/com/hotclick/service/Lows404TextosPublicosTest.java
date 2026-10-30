package com.hotclick.service;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.hotclick.controller.PedidoController;
import com.hotclick.dto.RecoleccionCreateRequest;
import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.Pedido;
import com.hotclick.model.PedidoItem;
import com.hotclick.model.Producto;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.repository.SolicitudRecoleccionRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.logistica.ZonaLogistica;
import com.hotclick.utils.InputSanitizer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.slf4j.LoggerFactory;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("LOWs: textos que llegan al cliente sin datos del pedido, la empresa o la URL")
class Lows404TextosPublicosTest {

    private static final long ID = 987654L;
    private ListAppender<ILoggingEvent> logs;
    private Logger logger;

    @BeforeEach
    void capturarLog() {
        logger = (Logger) LoggerFactory.getLogger(RecursoNoEncontradoException.class);
        logs = new ListAppender<>();
        logs.start();
        logger.addAppender(logs);
    }

    @AfterEach
    void soltarLog() {
        logger.detachAppender(logs);
    }

    private String log() {
        return logs.list.stream().map(ILoggingEvent::getFormattedMessage).reduce("", (a, b) -> a + "\n" + b);
    }

    @Test
    @DisplayName("PedidoController: producto inexistente → mensaje genérico sin id; el id queda solo en el log")
    void pedidoControllerProductoInexistente() {
        PedidoController c = new PedidoController();
        ProductoRepository productos = mock(ProductoRepository.class);
        when(productos.findById(anyLong())).thenReturn(Optional.empty());
        ReflectionTestUtils.setField(c, "productoRepository", productos);
        Producto prod = new Producto();
        prod.setId(ID);
        PedidoItem item = new PedidoItem();
        item.setProducto(prod);
        Pedido pedido = new Pedido();
        pedido.setItems(List.of(item));

        assertThatThrownBy(() -> ReflectionTestUtils.invokeMethod(c, "recalcularDesdeCatalogo", pedido))
            .isInstanceOf(RecursoNoEncontradoException.class)
            .hasMessage("Producto no encontrado");
        assertThat(log()).contains("productoId=" + ID);
    }

    @Test
    @DisplayName("RecoleccionService: empresa inexistente → mensaje genérico sin id; el id queda solo en el log")
    void recoleccionEmpresaInexistente() {
        CompanyScope scope = mock(CompanyScope.class);
        when(scope.getCurrentEmpresaIdOrOwn()).thenReturn(ID);
        EmpresaRepository empresas = mock(EmpresaRepository.class);
        when(empresas.findById(anyLong())).thenReturn(Optional.empty());
        RecoleccionService svc = new RecoleccionService(mock(SolicitudRecoleccionRepository.class), empresas,
            mock(BodegaRepository.class), scope, mock(InputSanitizer.class),
            mock(ModeracionAvisoService.class), mock(ModeracionAdminAvisoService.class));
        RecoleccionCreateRequest req = new RecoleccionCreateRequest();
        req.setZona(ZonaLogistica.GAM);

        assertThatThrownBy(() -> svc.crear(req))
            .isInstanceOf(RecursoNoEncontradoException.class)
            .hasMessage("Empresa no encontrada");
        assertThat(log()).contains("empresaId=" + ID);
    }

    @Test
    @DisplayName("Webhook con URL mal formada: el mensaje no repite la URL ni el texto de la librería")
    void webhookUrlMalFormada() {
        String url = "http://exa mple.com/secreto-token-abc123";
        assertThatThrownBy(() -> WebhookDispatcherService.validateWebhookUrl(url))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("URL inválida");
    }

    @Test
    @DisplayName("conDetalle deja el detalle fuera del mensaje que se muestra")
    void conDetalleNoMuestraDetalle() {
        RecursoNoEncontradoException e = RecursoNoEncontradoException.conDetalle("Producto no encontrado", "productoId=987654");
        assertThat(e.getMessage()).isEqualTo("Producto no encontrado").doesNotContain("987654");
    }
}
