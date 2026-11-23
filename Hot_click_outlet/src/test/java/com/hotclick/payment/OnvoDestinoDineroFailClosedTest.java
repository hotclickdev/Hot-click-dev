package com.hotclick.payment;

import com.hotclick.model.Empresa;
import com.hotclick.model.Pago;
import com.hotclick.model.Pedido;
import com.hotclick.model.Usuario;
import com.hotclick.repository.EmpresaCuentaOnvoRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.service.OnvoService;
import com.hotclick.service.alta.AltaFasesService;
import com.hotclick.service.onvo.cuenta.CuentaOnvoService;
import com.hotclick.service.payment.PaymentRecordFactory;
import com.hotclick.repository.PagoRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@DisplayName("Cobro ONVO: fail-closed por fases y registro del destino del dinero (SUBCUENTA vs PLATAFORMA)")
class OnvoDestinoDineroFailClosedTest {

    EmpresaCuentaOnvoRepository cuentaRepo = mock(EmpresaCuentaOnvoRepository.class);
    @SuppressWarnings("unchecked")
    AltaFasesService altaFases = new AltaFasesService(mock(EmpresaRepository.class), cuentaRepo,
        mock(ProductoRepository.class), mock(ObjectProvider.class), true);
    OnvoService onvo = mock(OnvoService.class);
    CuentaOnvoService cuentas = mock(CuentaOnvoService.class);

    Pedido pedido(Empresa e) {
        Pedido p = new Pedido();
        p.setId(1L);
        p.setNumeroPedido("HC-1");
        p.setTotalPedido(1000);
        p.setEmpresa(e);
        return p;
    }

    Empresa empresa(boolean porFases, boolean venta) {
        Empresa e = new Empresa();
        e.setId(7L);
        e.setAltaPorFases(porFases);
        e.setVentaOnlineHabilitada(venta);
        return e;
    }

    OnvoPaymentProvider provider(boolean conAltaFases) {
        OnvoPaymentProvider p = new OnvoPaymentProvider();
        when(onvo.isPagosDisponibles()).thenReturn(true);
        OnvoService.OnvoCheckoutSession s = new OnvoService.OnvoCheckoutSession("cs_1", "https://checkout");
        when(onvo.crearCheckoutSession(anyInt(), anyString(), anyString(), anyString(), any(), anyMap())).thenReturn(s);
        when(onvo.crearCheckoutSession(anyInt(), anyString(), anyString(), anyString(), any(), anyMap(), anyString())).thenReturn(s);
        ReflectionTestUtils.setField(p, "onvoService", onvo);
        ReflectionTestUtils.setField(p, "cuentaOnvoService", cuentas);
        if (conAltaFases) ReflectionTestUtils.setField(p, "altaFases", altaFases);
        ReflectionTestUtils.setField(p, "pedidoStatusTokenService", com.hotclick.service.payment.PedidoStatusTokenServiceTest.servicio());
        ReflectionTestUtils.setField(p, "appUrl", "https://hotclick.lat");
        return p;
    }

    @Test
    @DisplayName("Negocio en borrador: no hay sesión ONVO (checkout web y Telegram pasan por este mismo punto)")
    void borradorNoCobra() {
        OnvoPaymentProvider p = provider(true);
        assertThatThrownBy(() -> p.crearSesion(pedido(empresa(true, false)), new Usuario()))
            .isInstanceOf(IllegalArgumentException.class).hasMessage(AltaFasesService.MSG_SIN_COBRO_ONLINE);
        verify(onvo, never()).crearCheckoutSession(anyInt(), anyString(), anyString(), anyString(), any(), anyMap());
        verify(onvo, never()).crearCheckoutSession(anyInt(), anyString(), anyString(), anyString(), any(), anyMap(), anyString());
    }

    @Test
    @DisplayName("Cuenta perdida con el predicado todavía en TRUE: la consulta en vivo corta el cobro")
    void cuentaPerdidaNoCobra() {
        when(cuentaRepo.findByEmpresaId(7L)).thenReturn(java.util.Optional.empty());
        assertThatThrownBy(() -> provider(true).crearSesion(pedido(empresa(true, true)), new Usuario()))
            .isInstanceOf(IllegalArgumentException.class);
        verify(onvo, never()).crearCheckoutSession(anyInt(), anyString(), anyString(), anyString(), any(), anyMap(), anyString());
    }

    @Test
    @DisplayName("Con subcuenta activa el destino queda SUBCUENTA con el id de la cuenta; sin ella (existente) queda PLATAFORMA")
    void destinoRegistrado() throws Exception {
        com.hotclick.model.EmpresaCuentaOnvo activa = new com.hotclick.model.EmpresaCuentaOnvo();
        activa.setEstado("ACTIVA");
        activa.setOnvoAccountId("ca_test_7");
        when(cuentaRepo.findByEmpresaId(7L)).thenReturn(java.util.Optional.of(activa));
        when(cuentas.onBehalfOfPara(any())).thenReturn("ca_test_7");
        PaymentSession sub = provider(true).crearSesion(pedido(empresa(true, true)), new Usuario());
        assertThat(sub.destinoDinero()).isEqualTo(Pago.DESTINO_SUBCUENTA);
        assertThat(sub.destinoCuentaOnvo()).isEqualTo("ca_test_7");

        when(cuentas.onBehalfOfPara(any())).thenReturn(null);
        PaymentSession plat = provider(true).crearSesion(pedido(empresa(false, true)), new Usuario());
        assertThat(plat.destinoDinero()).isEqualTo(Pago.DESTINO_PLATAFORMA);
        assertThat(plat.destinoCuentaOnvo()).isNull();
    }

    @Test
    @DisplayName("El Pago guarda el destino; PLATAFORMA de un negocio queda NO_REINTEGRADO; subcuenta y plataforma propia no deben nada")
    void pagoGuardaDestinoYReintegro() {
        Pago a = new Pago();
        PaymentRecordFactory.registrarDestinoDinero(a, new PaymentSession("cs", "u", null, false, Pago.DESTINO_PLATAFORMA, null), pedido(empresa(false, true)));
        assertThat(a.getDestinoDinero()).isEqualTo("PLATAFORMA");
        assertThat(a.getReintegroEstado()).isEqualTo("NO_REINTEGRADO");

        Pago b = new Pago();
        PaymentRecordFactory.registrarDestinoDinero(b, new PaymentSession("cs", "u", null, false, Pago.DESTINO_SUBCUENTA, "ca_test_7"), pedido(empresa(true, true)));
        assertThat(b.getDestinoDinero()).isEqualTo("SUBCUENTA");
        assertThat(b.getDestinoCuentaOnvo()).isEqualTo("ca_test_7");
        assertThat(b.getReintegroEstado()).isNull();

        Pago c = new Pago();
        PaymentRecordFactory.registrarDestinoDinero(c, new PaymentSession("cs", "u", null, false, Pago.DESTINO_PLATAFORMA, null), pedido(null));
        assertThat(c.getDestinoDinero()).isEqualTo("PLATAFORMA");
        assertThat(c.getReintegroEstado()).isNull();

        Pago d = new Pago();
        PaymentRecordFactory.registrarDestinoDinero(d, new PaymentSession("tok", "u"), pedido(empresa(false, true)));
        assertThat(d.getDestinoDinero()).isNull();
    }

    @Test
    @DisplayName("createAndPersist persiste el destino junto con el pago")
    void createAndPersistGuardaDestino() {
        PagoRepository repo = mock(PagoRepository.class);
        when(repo.save(any())).thenAnswer(i -> i.getArgument(0));
        PaymentRecordFactory f = new PaymentRecordFactory();
        ReflectionTestUtils.setField(f, "pagoRepository", repo);
        Pago pago = f.createAndPersist(new PaymentSession("cs", "u", null, false, Pago.DESTINO_PLATAFORMA, null),
            pedido(empresa(false, true)), new Usuario(), "ONVO", 1000);
        assertThat(pago.getDestinoDinero()).isEqualTo("PLATAFORMA");
        assertThat(pago.getReintegroEstado()).isEqualTo("NO_REINTEGRADO");
    }
}
