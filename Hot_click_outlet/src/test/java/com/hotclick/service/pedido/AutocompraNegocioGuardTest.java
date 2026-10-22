package com.hotclick.service.pedido;

import com.hotclick.exception.AutocompraNegocioException;
import com.hotclick.model.Empresa;
import com.hotclick.model.Pago;
import com.hotclick.model.Pedido;
import com.hotclick.model.OrigenPedido;
import com.hotclick.model.Usuario;
import com.hotclick.repository.MiembroEmpresaRepository;
import com.hotclick.repository.PagoRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.AuditoriaAdminRegistroService;
import com.hotclick.service.PaymentService;
import com.hotclick.service.payment.PedidoGrupoService;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("G1b: un negocio no se compra a si mismo")
class AutocompraNegocioGuardTest {

    @Mock private MiembroEmpresaRepository miembroRepository;
    @Mock private com.hotclick.repository.UsuarioRepository usuarioRepository;
    @Mock private PedidoGrupoService pedidoGrupoService;
    @Mock private PagoRepository pagoRepository;
    @Mock private PaymentService paymentService;
    @Mock private AuditoriaAdminRegistroService auditoria;
    @Mock private CompanyScope companyScope;

    private AutocompraNegocioGuard guard;
    private PedidoPagoManualService manual;
    private Empresa empresa;

    @BeforeEach
    void setUp() {
        guard = new AutocompraNegocioGuard();
        ReflectionTestUtils.setField(guard, "miembroEmpresaRepository", miembroRepository);
        ReflectionTestUtils.setField(guard, "usuarioRepository", usuarioRepository);
        manual = new PedidoPagoManualService();
        ReflectionTestUtils.setField(manual, "autocompraGuard", guard);
        ReflectionTestUtils.setField(manual, "pedidoGrupoService", pedidoGrupoService);
        ReflectionTestUtils.setField(manual, "pagoRepository", pagoRepository);
        ReflectionTestUtils.setField(manual, "paymentService", paymentService);
        ReflectionTestUtils.setField(manual, "auditoria", auditoria);
        ReflectionTestUtils.setField(manual, "companyScope", companyScope);
        empresa = new Empresa();
        empresa.setId(7L);
    }

    private Usuario usuario(long id, Empresa deEmpresa) {
        Usuario u = new Usuario();
        u.setId(id);
        u.setEmpresa(deEmpresa);
        return u;
    }

    private Pedido pedido(Usuario comprador, String metodo, String estado, String envio, OrigenPedido origen) {
        Pedido p = new Pedido();
        p.setId(100L);
        p.setNumeroPedido("ORD-T-1");
        p.setEmpresa(empresa);
        p.setUsuarioFinal(comprador);
        p.setMetodoPago(metodo);
        p.setMetodoEnvio(envio);
        p.setEstadoPedido(estado);
        p.setTotalPedido(5000);
        p.setOrigen(origen.codigo());
        return p;
    }

    @Test
    @DisplayName("comprador con empresa propia igual a la del pedido: bloqueado con codigo")
    void guard_usuarioConEmpresaDelPedido() {
        assertThatThrownBy(() -> guard.exigirNoEsDelNegocio(usuario(1L, empresa), 7L))
            .isInstanceOf(AutocompraNegocioException.class)
            .extracting("codigo").isEqualTo(AutocompraNegocioException.CODIGO);
    }

    @Test
    @DisplayName("comprador miembro activo del negocio: bloqueado")
    void guard_miembroActivo() {
        when(miembroRepository.existsByUsuarioIdAndEmpresaIdAndEstado(2L, 7L, 1)).thenReturn(true);
        assertThatThrownBy(() -> guard.exigirNoEsDelNegocio(usuario(2L, null), 7L))
            .isInstanceOf(AutocompraNegocioException.class);
    }

    @Test
    @DisplayName("C4: correo del invitado con otras mayusculas que el del dueno: bloqueado")
    void guard_correoSinDistinguirMayusculas() {
        when(usuarioRepository.findAllByCorreoIgnoreCase("Dueno@Tienda.CR")).thenReturn(List.of(usuario(1L, empresa)));
        Pedido p = pedido(null, "EFECTIVO", Constants.PEDIDO_PENDIENTE_COMPROBANTE,
            Constants.ENVIO_ENCOMIENDA, OrigenPedido.ONLINE);
        assertThatThrownBy(() -> guard.exigirCorreoNoEsDelNegocio(" Dueno@Tienda.CR ", List.of(p)))
            .isInstanceOf(AutocompraNegocioException.class);
    }

    @Test
    @DisplayName("comprador ajeno o empresa de otro negocio: permitido")
    void guard_ajeno() {
        Empresa otra = new Empresa();
        otra.setId(8L);
        assertThatCode(() -> guard.exigirNoEsDelNegocio(usuario(3L, otra), 7L)).doesNotThrowAnyException();
        assertThatCode(() -> guard.exigirNoEsDelNegocio(usuario(4L, null), 7L)).doesNotThrowAnyException();
        assertThatCode(() -> guard.exigirNoEsDelNegocio(null, 7L)).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("confirmar a mano un pedido EFECTIVO online del propio negocio: bloqueado, sin capturar pago")
    void confirmar_autocompraEfectivoOnline() {
        Pedido p = pedido(usuario(1L, empresa), "EFECTIVO", Constants.PEDIDO_PENDIENTE_COMPROBANTE,
            Constants.ENVIO_ENCOMIENDA, OrigenPedido.ONLINE);
        Pago pago = new Pago();
        pago.setProveedor(Constants.PROVEEDOR_SINPE);
        pago.setEstadoPago(Constants.PAGO_PENDIENTE);
        when(pedidoGrupoService.pagoDelGrupo(p)).thenReturn(Optional.of(pago));
        when(pedidoGrupoService.delGrupo(p)).thenReturn(List.of(p));

        assertThatThrownBy(() -> manual.confirmar(p, Constants.PEDIDO_PENDIENTE_COMPROBANTE, "recibido"))
            .isInstanceOf(AutocompraNegocioException.class);
        verify(paymentService, never()).confirmarPedido(any());
        assertThat(pago.getEstadoPago()).isEqualTo(Constants.PAGO_PENDIENTE);
    }

    @Test
    @DisplayName("cobro al retirar de un pedido del propio negocio: bloqueado")
    void cobroAlRetirar_autocompra() {
        Pedido p = pedido(usuario(1L, empresa), "EFECTIVO", Constants.PEDIDO_PENDIENTE_COMPROBANTE,
            Constants.ENVIO_RETIRO, OrigenPedido.ONLINE);
        when(pedidoGrupoService.pagoDelGrupo(p)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> manual.confirmarCobroAlRetirar(p, Constants.PEDIDO_PENDIENTE_COMPROBANTE, null))
            .isInstanceOf(AutocompraNegocioException.class);
        verify(pagoRepository, never()).save(any());
        assertThat(p.getEstadoPedido()).isEqualTo(Constants.PEDIDO_PENDIENTE_COMPROBANTE);
    }

    @Test
    @DisplayName("pedido POS o manual del negocio no se bloquea (cliente de caja)")
    void confirmar_posNoSeBloquea() {
        Pedido p = pedido(usuario(1L, empresa), "EFECTIVO", Constants.PEDIDO_PENDIENTE,
            Constants.ENVIO_RETIRO, OrigenPedido.POS);
        when(pedidoGrupoService.pagoDelGrupo(p)).thenReturn(Optional.empty());

        assertThatCode(() -> manual.confirmar(p, Constants.PEDIDO_PENDIENTE, "caja"))
            .doesNotThrowAnyException();
        assertThat(p.getEstadoPedido()).isEqualTo(Constants.PEDIDO_PAGADO);
    }
}
