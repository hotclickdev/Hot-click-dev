package com.hotclick.service;

import com.hotclick.exception.TenantAccessDeniedException;
import com.hotclick.model.Empresa;
import com.hotclick.model.TurnoCaja;
import com.hotclick.model.Usuario;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.TurnoCajaRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.security.CompanyScope;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("TurnoCajaService — tenant/dueño en cerrar")
class TurnoCajaServiceCerrarTenantTest {

    @Mock private TurnoCajaRepository turnoCajaRepository;
    @Mock private UsuarioRepository usuarioRepository;
    @Mock private EmpresaRepository empresaRepository;
    @Mock private CompanyScope companyScope;

    @InjectMocks private TurnoCajaService service;

    private TurnoCaja turno;
    private Usuario cajero;

    @BeforeEach
    void setUp() {
        Empresa empresa = new Empresa();
        empresa.setId(10L);
        cajero = new Usuario();
        cajero.setId(5L);
        turno = new TurnoCaja();
        turno.setId(1L);
        turno.setEmpresa(empresa);
        turno.setUsuario(cajero);
        turno.setEstado("ABIERTO");
        turno.setMontoInicial(0);
        turno.setTotalEfectivo(0);
        turno.setTotalSinpe(0);
        turno.setTotalTarjeta(0);
        turno.setTotalTransferencia(0);
        when(turnoCajaRepository.findById(1L)).thenReturn(Optional.of(turno));
    }

    @Test
    @DisplayName("empresa ajena → TenantAccessDeniedException")
    void empresaAjena_rechaza() {
        doThrow(new TenantAccessDeniedException("denegado"))
            .when(companyScope).assertCanAccessNullable(10L);

        assertThatThrownBy(() -> service.cerrarTurno(1L, 0, null))
            .isInstanceOf(TenantAccessDeniedException.class);
        verify(turnoCajaRepository, never()).save(any());
    }

    @Test
    @DisplayName("mismo tenant y dueño → cierra")
    void dueño_cierra() {
        doNothing().when(companyScope).assertCanAccessNullable(10L);
        when(companyScope.isAdminIT()).thenReturn(false);
        when(companyScope.getCurrentUserId()).thenReturn(5L);
        when(turnoCajaRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        TurnoCaja cerrado = service.cerrarTurno(1L, 1000, "ok");

        assertThat(cerrado.getEstado()).isEqualTo("CERRADO");
        verify(turnoCajaRepository).save(turno);
    }

    @Test
    @DisplayName("mismo tenant pero otro cajero → SecurityException")
    void otroCajero_rechaza() {
        doNothing().when(companyScope).assertCanAccessNullable(10L);
        when(companyScope.isAdminIT()).thenReturn(false);
        when(companyScope.getCurrentUserId()).thenReturn(99L);

        assertThatThrownBy(() -> service.cerrarTurno(1L, 0, null))
            .isInstanceOf(SecurityException.class);
        verify(turnoCajaRepository, never()).save(any());
    }

    @Test
    @DisplayName("actualizarTotales sin usuario en contexto (webhook / QR) → suma igual")
    void actualizarTotales_sinAuth_suma() {
        when(turnoCajaRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.actualizarTotales(1L, "TARJETA", 5000);

        assertThat(turno.getTotalTarjeta()).isEqualTo(5000);
        assertThat(turno.getNumTransacciones()).isEqualTo(1);
        verify(turnoCajaRepository).save(turno);
        verifyNoInteractions(companyScope);
    }
}
