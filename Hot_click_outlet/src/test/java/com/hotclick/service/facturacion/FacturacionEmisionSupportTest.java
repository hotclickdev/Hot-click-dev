package com.hotclick.service.facturacion;

import com.hotclick.model.ComprobanteFiscal;
import com.hotclick.model.Empresa;
import com.hotclick.model.Pedido;
import com.hotclick.repository.ComprobanteFiscalRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.ClaveNumericaService;
import com.hotclick.service.ConsecutivoFiscalService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@DisplayName("FacturacionEmisionSupport — un comprobante en ERROR no se reemite")
class FacturacionEmisionSupportTest {

    @Test
    @DisplayName("ERROR y PENDIENTE_CONFIG cuentan como activos")
    void estadosActivosIncluyenError() {
        assertThat(FacturacionEmisionSupport.ESTADOS_ACTIVOS)
            .contains(ComprobanteFiscal.ESTADO_ERROR, ComprobanteFiscal.ESTADO_PENDIENTE_CONFIG);
    }

    @Test
    @DisplayName("si el pedido ya tiene un comprobante en ERROR, emitir otro falla y no reserva consecutivo")
    @SuppressWarnings("unchecked")
    void errorBloqueaReemision() {
        ComprobanteFiscalRepository repo = mock(ComprobanteFiscalRepository.class);
        ConsecutivoFiscalService consecutivos = mock(ConsecutivoFiscalService.class);
        // Simula la BD: el único comprobante del pedido 5 está en ERROR.
        when(repo.existsByPedidoIdAndEstadoIn(eq(5L), anyList()))
            .thenAnswer(i -> ((List<String>) i.getArgument(1)).contains(ComprobanteFiscal.ESTADO_ERROR));
        CompanyScope scope = mock(CompanyScope.class);
        when(scope.isAdminIT()).thenReturn(true); // Área 7 N1: solo el admin de HotClick emite
        FacturacionEmisionSupport support = new FacturacionEmisionSupport(repo, consecutivos,
            mock(ClaveNumericaService.class), scope, mock(PedidoRepository.class),
            mock(EmpresaRepository.class));

        Empresa empresa = new Empresa();
        empresa.setId(1L);
        Pedido pedido = new Pedido();
        pedido.setId(5L);
        pedido.setEmpresa(empresa);

        assertThatThrownBy(() -> support.emitir(pedido, ComprobanteFiscal.TIPO_TIQUETE))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("activo");
        verifyNoInteractions(consecutivos);
    }
}
