package com.hotclick.service;

import com.hotclick.model.Empresa;
import com.hotclick.model.GiftCard;
import com.hotclick.model.Pedido;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.GiftCardRepository;
import com.hotclick.repository.SplitPagoRepository;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("GiftCardService — validar y canjear")
class GiftCardServiceTest {

    private static final String CODIGO = "GC-TEST-0001";

    @Mock GiftCardRepository giftCardRepository;
    @Mock SplitPagoRepository splitPagoRepository;
    @Mock EmpresaRepository empresaRepository;

    @InjectMocks GiftCardService service;

    @Test
    @DisplayName("validar vacío si la gift card es de otra empresa")
    void validarOtraEmpresaVacio() {
        GiftCard gc = tarjeta(empresa(1L), "ACTIVA", 5000, null);
        when(giftCardRepository.findByCodigo(CODIGO)).thenReturn(Optional.of(gc));

        assertThat(service.validar(CODIGO, 99L)).isEmpty();
        verify(giftCardRepository, never()).save(any());
    }

    @Test
    @DisplayName("validar vacío y marca VENCIDA si la fecha ya pasó")
    void validarVencidaMarcaEstado() {
        GiftCard gc = tarjeta(empresa(1L), "ACTIVA", 5000, LocalDate.now(Constants.ZONA_CR).minusDays(1));
        when(giftCardRepository.findByCodigo(CODIGO)).thenReturn(Optional.of(gc));

        assertThat(service.validar(CODIGO, 1L)).isEmpty();
        assertThat(gc.getEstado()).isEqualTo("VENCIDA");
        verify(giftCardRepository).save(gc);
    }

    @Test
    @DisplayName("validar vacío si el saldo es cero")
    void validarSaldoCeroVacio() {
        GiftCard gc = tarjeta(empresa(1L), "ACTIVA", 0, null);
        when(giftCardRepository.findByCodigo(CODIGO)).thenReturn(Optional.of(gc));

        assertThat(service.validar(CODIGO, 1L)).isEmpty();
        verify(giftCardRepository, never()).save(any());
    }

    @Test
    @DisplayName("canje total descuenta y marca AGOTADA")
    void canjeTotalMarcaAgotada() {
        Empresa emp = empresa(1L);
        GiftCard gc = tarjeta(emp, "ACTIVA", 5000, null);
        when(giftCardRepository.findByCodigoForUpdate(CODIGO)).thenReturn(Optional.of(gc));
        when(giftCardRepository.save(gc)).thenReturn(gc);

        int deducido = service.canjear(CODIGO, pedidoDe(emp), 5000);

        assertThat(deducido).isEqualTo(5000);
        assertThat(gc.getSaldoActual()).isZero();
        assertThat(gc.getEstado()).isEqualTo("AGOTADA");
        verify(splitPagoRepository).save(any());
    }

    @Test
    @DisplayName("canje de otra empresa lanza y no crea SplitPago")
    void canjeOtraEmpresaNoCreaSplit() {
        GiftCard gc = tarjeta(empresa(1L), "ACTIVA", 5000, null);
        when(giftCardRepository.findByCodigoForUpdate(CODIGO)).thenReturn(Optional.of(gc));

        assertThatThrownBy(() -> service.canjear(CODIGO, pedidoDe(empresa(2L)), 1000))
            .isInstanceOf(SecurityException.class)
            .hasMessageContaining("no pertenece a la empresa");
        verify(splitPagoRepository, never()).save(any());
        verify(giftCardRepository, never()).save(any());
    }

    private static Empresa empresa(Long id) {
        Empresa e = new Empresa();
        e.setId(id);
        return e;
    }

    private static GiftCard tarjeta(Empresa empresa, String estado, int saldo, LocalDate vencimiento) {
        GiftCard gc = new GiftCard();
        gc.setId(10L);
        gc.setCodigo(CODIGO);
        gc.setEmpresa(empresa);
        gc.setEstado(estado);
        gc.setSaldoInicial(saldo);
        gc.setSaldoActual(saldo);
        gc.setFechaVencimiento(vencimiento);
        return gc;
    }

    private static Pedido pedidoDe(Empresa empresa) {
        Pedido p = new Pedido();
        p.setId(1L);
        p.setEmpresa(empresa);
        return p;
    }
}
