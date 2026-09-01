package com.hotclick.service;

import com.hotclick.dto.EncargoAprobarRequest;
import com.hotclick.dto.EncargoCreateRequest;
import com.hotclick.dto.EncargoRechazarRequest;
import com.hotclick.model.Empresa;
import com.hotclick.model.EncargoPersonalizado;
import com.hotclick.model.Producto;
import com.hotclick.repository.EncargoPersonalizadoRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.email.EncargoEmailSender;
import com.hotclick.utils.InputSanitizer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("EncargoService — crear, aprobar, rechazar")
class EncargoServiceTest {

    @Mock EncargoPersonalizadoRepository encargoRepo;
    @Mock ProductoRepository productoRepo;
    @Mock UsuarioRepository usuarioRepo;
    @Mock SupabaseStorageService storageService;
    @Mock InputSanitizer sanitizer;
    @Mock CompanyScope companyScope;
    @Mock EncargoEmailSender emailSender;
    @Mock TelegramNotificacionClienteService telegramNotif;
    @Mock PaymentService paymentService;

    @InjectMocks EncargoService service;

    private Producto productoCotizacion;
    private Empresa empresa;

    @BeforeEach
    void setUp() {
        when(sanitizer.cleanWithLimit(anyString(), anyInt())).thenAnswer(inv -> inv.getArgument(0));

        empresa = new Empresa();
        empresa.setId(7L);
        empresa.setCorreoEmpresa("artista@test.cr");
        empresa.setNombreEmpresa("Arte CR");

        productoCotizacion = new Producto();
        productoCotizacion.setId(42L);
        productoCotizacion.setNombreProducto("Cuadro personalizado");
        productoCotizacion.setEsPersonalizado(true);
        productoCotizacion.setModoPrecioPersonalizado(EncargoPersonalizado.MODO_COTIZACION);
        productoCotizacion.setEmpresa(empresa);
        productoCotizacion.setPrecioVenta(1);
    }

    @Test
    @DisplayName("crear: producto FIJO debe ir al carrito, no a encargo")
    void crear_productoFijo_rechaza() {
        productoCotizacion.setModoPrecioPersonalizado(EncargoPersonalizado.MODO_FIJO);
        when(productoRepo.findById(42L)).thenReturn(Optional.of(productoCotizacion));

        EncargoCreateRequest req = requestBase();

        assertThatThrownBy(() -> service.crear(req, null))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("precio fijo");
        verify(encargoRepo, never()).save(any());
    }

    @Test
    @DisplayName("crear: exige imagen o notas")
    void crear_sinReferencias_rechaza() {
        when(productoRepo.findById(42L)).thenReturn(Optional.of(productoCotizacion));
        EncargoCreateRequest req = requestBase();
        req.setImagenes(List.of());
        req.setNotas("  ");

        assertThatThrownBy(() -> service.crear(req, null))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("imagen");
    }

    @Test
    @DisplayName("crear: cotización feliz guarda PENDIENTE y notifica")
    void crear_cotizacion_ok() {
        when(productoRepo.findById(42L)).thenReturn(Optional.of(productoCotizacion));
        when(encargoRepo.save(any())).thenAnswer(inv -> {
            EncargoPersonalizado e = inv.getArgument(0);
            e.setId(99L);
            e.setTokenPublico("tok-abc");
            return e;
        });

        EncargoPersonalizado creado = service.crear(requestBase(), null);

        assertThat(creado.getEstado()).isEqualTo(EncargoPersonalizado.ESTADO_PENDIENTE);
        assertThat(creado.getModoPrecio()).isEqualTo(EncargoPersonalizado.MODO_COTIZACION);
        assertThat(creado.getEmail()).isEqualTo("cliente@test.cr");
        verify(emailSender).notificarEncargoRecibidoCliente(any());
        verify(emailSender).notificarNuevoEncargoAlArtista(eq("artista@test.cr"), anyString(), any());
        verify(telegramNotif).notificarSolicitudEnviada(eq(7L), anyString(), anyString());
    }

    @Test
    @DisplayName("aprobar: precio fuera de rango RANGO falla")
    void aprobar_fueraDeRango_rechaza() {
        Producto rango = productoCotizacion;
        rango.setModoPrecioPersonalizado(EncargoPersonalizado.MODO_RANGO);
        rango.setPrecioPersonalizadoMin(5000);
        rango.setPrecioPersonalizadoMax(15000);

        EncargoPersonalizado encargo = encargoPendiente(rango);
        when(encargoRepo.findById(1L)).thenReturn(Optional.of(encargo));
        doNothing().when(companyScope).assertCanAccess(7L);

        EncargoAprobarRequest req = new EncargoAprobarRequest();
        req.setPrecioCotizado(20000);

        assertThatThrownBy(() -> service.aprobar(1L, req))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("máximo");
        verify(emailSender, never()).notificarEncargoAprobado(any());
    }

    @Test
    @DisplayName("aprobar: cotización feliz marca APROBADO y avisa al cliente")
    void aprobar_ok() {
        EncargoPersonalizado encargo = encargoPendiente(productoCotizacion);
        when(encargoRepo.findById(1L)).thenReturn(Optional.of(encargo));
        when(encargoRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        doNothing().when(companyScope).assertCanAccess(7L);

        EncargoAprobarRequest req = new EncargoAprobarRequest();
        req.setPrecioCotizado(12000);

        EncargoPersonalizado out = service.aprobar(1L, req);

        assertThat(out.getEstado()).isEqualTo(EncargoPersonalizado.ESTADO_APROBADO);
        assertThat(out.getPrecioCotizado()).isEqualTo(12000);
        assertThat(out.getFechaVencimiento()).isNotNull();
        verify(emailSender).notificarEncargoAprobado(any());
    }

    @Test
    @DisplayName("rechazar: solo pendientes y notifica motivo")
    void rechazar_ok() {
        EncargoPersonalizado encargo = encargoPendiente(productoCotizacion);
        when(encargoRepo.findById(1L)).thenReturn(Optional.of(encargo));
        when(encargoRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        doNothing().when(companyScope).assertCanAccess(7L);

        EncargoRechazarRequest req = new EncargoRechazarRequest();
        req.setMotivoRechazo("No puedo hacer ese tamaño");

        EncargoPersonalizado out = service.rechazar(1L, req);

        assertThat(out.getEstado()).isEqualTo(EncargoPersonalizado.ESTADO_RECHAZADO);
        assertThat(out.getMotivoRechazo()).contains("tamaño");
        verify(emailSender).notificarEncargoRechazado(any());
    }

    @Test
    @DisplayName("rechazar: ya aprobado no se puede")
    void rechazar_yaAprobado_falla() {
        EncargoPersonalizado encargo = encargoPendiente(productoCotizacion);
        encargo.setEstado(EncargoPersonalizado.ESTADO_APROBADO);
        when(encargoRepo.findById(1L)).thenReturn(Optional.of(encargo));
        doNothing().when(companyScope).assertCanAccess(7L);

        EncargoRechazarRequest req = new EncargoRechazarRequest();
        req.setMotivoRechazo("tarde");

        assertThatThrownBy(() -> service.rechazar(1L, req))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("pendientes");
    }

    private EncargoCreateRequest requestBase() {
        EncargoCreateRequest req = new EncargoCreateRequest();
        req.setProductoId(42L);
        req.setNombreCliente("Cliente Test");
        req.setEmail("cliente@test.cr");
        req.setNotas("Quiero un collage con 3 fotos");
        req.setImagenes(List.of("https://cdn.test/a.jpg"));
        return req;
    }

    private EncargoPersonalizado encargoPendiente(Producto producto) {
        EncargoPersonalizado e = new EncargoPersonalizado();
        e.setId(1L);
        e.setProducto(producto);
        e.setEmpresa(empresa);
        e.setNombreCliente("Cliente Test");
        e.setEmail("cliente@test.cr");
        e.setModoPrecio(producto.getModoPrecioPersonalizado());
        e.setEstado(EncargoPersonalizado.ESTADO_PENDIENTE);
        e.setTokenPublico("tok-1");
        return e;
    }
}
