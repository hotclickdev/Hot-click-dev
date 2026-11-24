package com.hotclick.agente.canal;

import com.hotclick.agente.webhook.MensajeEntrante.Canal;
import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.service.TotpSecretEncryptionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class CanalCuentaServiceTest {

    private static final String CLAVE = "00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff";
    private static final String TOKEN = "TOKEN-DE-PRUEBA-123";

    private CanalCuentaRepository repo;
    private CanalCuentaService service;
    private final Map<Long, CanalCuenta> almacen = new HashMap<>();

    @BeforeEach
    void init() {
        repo = mock(CanalCuentaRepository.class);
        TotpSecretEncryptionService cifrado = new TotpSecretEncryptionService(new MockEnvironment());
        ReflectionTestUtils.setField(cifrado, "encryptionKeyHex", CLAVE);
        service = new CanalCuentaService(repo, cifrado);
        when(repo.save(any())).thenAnswer(i -> {
            CanalCuenta c = i.getArgument(0);
            if (c.getId() == null) c.setId((long) (almacen.size() + 1));
            almacen.put(c.getId(), c);
            return c;
        });
        when(repo.findById(anyLong())).thenAnswer(i -> Optional.ofNullable(almacen.get(i.<Long>getArgument(0))));
        when(repo.findByTipoAndIdExterno(any(), any())).thenAnswer(i -> almacen.values().stream()
            .filter(c -> c.getTipo() == i.getArgument(0) && c.getIdExterno().equals(i.getArgument(1))).findFirst());
    }

    @Test
    void tokenSeGuardaCifradoYSeRecuperaEnClaro() {
        CanalCuenta c = service.registrarCuenta(7L, Canal.WHATSAPP, "WAID-1", "WABA-1", "Tienda", TOKEN);
        assertThat(c.getTokenCifrado()).startsWith("ENC:").doesNotContain(TOKEN);
        assertThat(service.tokenDe(c)).isEqualTo(TOKEN);
    }

    @Test
    void tokenNuncaApareceEnToStringNiEnDto() {
        CanalCuenta c = service.registrarCuenta(7L, Canal.WHATSAPP, "WAID-1", null, "Tienda", TOKEN);
        assertThat(c.toString()).doesNotContain(TOKEN).doesNotContain(c.getTokenCifrado());
        assertThat(CanalCuentaDto.de(c).toString()).doesNotContain(TOKEN).doesNotContain(c.getTokenCifrado());
        assertThat(CanalCuentaDto.de(c).tieneToken()).isTrue();
    }

    @Test
    void tokenDeCanalNoDescifraComoPin() {
        TotpSecretEncryptionService cifrado = new TotpSecretEncryptionService(new MockEnvironment());
        ReflectionTestUtils.setField(cifrado, "encryptionKeyHex", CLAVE);
        String blob = cifrado.encryptTokenCanal(TOKEN);
        assertThatThrownBy(() -> cifrado.decryptPin(blob)).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void noSePuedeSecuestrarUnaCuentaDeOtroNegocio() {
        service.registrarCuenta(7L, Canal.WHATSAPP, "WAID-1", null, "A", TOKEN);
        assertThatThrownBy(() -> service.registrarCuenta(8L, Canal.WHATSAPP, "WAID-1", null, "B", "otro"))
            .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void mismoIdExternoEnOtroTipoEsOtraCuenta() {
        service.registrarCuenta(7L, Canal.WHATSAPP, "ID-1", null, "A", TOKEN);
        assertThat(service.registrarCuenta(8L, Canal.INSTAGRAM, "ID-1", null, "B", TOKEN).getEmpresaId()).isEqualTo(8L);
    }

    @Test
    void buscarPorCanalEIdExterno() {
        service.registrarCuenta(null, Canal.MESSENGER, "PAGE-1", null, "HotClick", null);
        assertThat(service.buscar(Canal.MESSENGER, "PAGE-1")).isPresent();
        assertThat(service.buscar(Canal.WHATSAPP, "PAGE-1")).isEmpty();
        assertThat(service.buscar(Canal.WHATSAPP, null)).isEmpty();
    }

    @Test
    void pausarYDesconectarSoloEnLaPropiaEmpresa() {
        CanalCuenta c = service.registrarCuenta(7L, Canal.WHATSAPP, "WAID-1", null, "A", TOKEN);
        assertThatThrownBy(() -> service.pausar(c.getId(), 8L)).isInstanceOf(RecursoNoEncontradoException.class);
        assertThatThrownBy(() -> service.desconectar(c.getId(), 8L)).isInstanceOf(RecursoNoEncontradoException.class);
        assertThat(c.getEstado()).isEqualTo(EstadoCanal.ACTIVA);

        assertThat(service.pausar(c.getId(), 7L).getEstado()).isEqualTo(EstadoCanal.PAUSADA);
        CanalCuenta d = service.desconectar(c.getId(), 7L);
        assertThat(d.getEstado()).isEqualTo(EstadoCanal.DESCONECTADA);
        assertThat(d.tieneToken()).isFalse();
    }

    @Test
    void adminGlobalPuedeGestionarCualquierCuenta() {
        CanalCuenta c = service.registrarCuenta(7L, Canal.WHATSAPP, "WAID-1", null, "A", TOKEN);
        assertThat(service.pausar(c.getId(), null).getEstado()).isEqualTo(EstadoCanal.PAUSADA);
    }

    @Test
    void desconectadaNoSeReanuda() {
        CanalCuenta c = service.registrarCuenta(7L, Canal.WHATSAPP, "WAID-1", null, "A", TOKEN);
        service.desconectar(c.getId(), 7L);
        assertThatThrownBy(() -> service.reanudar(c.getId(), 7L)).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void listarFiltraPorEmpresa() {
        service.listar(7L);
        org.mockito.Mockito.verify(repo).findByEmpresaIdOrderByIdAsc(7L);
        service.listar(null);
        org.mockito.Mockito.verify(repo).findAllByOrderByIdAsc();
    }
}
