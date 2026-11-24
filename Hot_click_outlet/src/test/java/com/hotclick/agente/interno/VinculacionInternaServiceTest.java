package com.hotclick.agente.interno;

import com.hotclick.agente.conversacion.PerfilConversacion;
import com.hotclick.agente.conversacion.SelectorPerfil;
import com.hotclick.agente.canal.CanalCuenta;
import com.hotclick.agente.interno.InternoTestSupport.Equipo;
import com.hotclick.agente.interno.InternoTestSupport.RelojMutable;
import com.hotclick.agente.interno.InternoTestSupport.RepoMemoria;
import com.hotclick.agente.interno.VinculacionInternaService.Activacion;
import com.hotclick.agente.webhook.MensajeEntrante.Canal;
import com.hotclick.exception.TenantAccessDeniedException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;

import java.time.Duration;
import java.util.OptionalLong;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class VinculacionInternaServiceTest {

    private static final long EMPRESA = 7L;
    private static final long OTRA_EMPRESA = 8L;
    private static final long USUARIO = 100L;
    private static final String TEL = "50660000001";
    private static final String TEL_2 = "50660000002";

    private RelojMutable reloj;
    private RepoMemoria memoria;
    private Equipo equipo;
    private VinculacionInternaService svc;

    @BeforeEach
    void init() {
        reloj = new RelojMutable();
        memoria = new RepoMemoria(reloj);
        equipo = new Equipo().con(USUARIO, EMPRESA).con(101L, EMPRESA).con(USUARIO, OTRA_EMPRESA);
        svc = new VinculacionInternaService(memoria.repo, equipo.usuarios, new HasherInterno("llave-de-prueba"), reloj);
    }

    @Test
    void codigoValidoActivaYQuedaVinculado() {
        String codigo = svc.generarCodigo(USUARIO, EMPRESA).codigo();
        assertThat(svc.activar(EMPRESA, TEL, codigo)).isEqualTo(Activacion.OK);
        assertThat(svc.usuarioVinculado(EMPRESA, TEL)).isEqualTo(OptionalLong.of(USUARIO));
        assertThat(svc.usuarioVinculado(EMPRESA, TEL_2)).isEmpty();
    }

    @Test
    void elTelefonoYElCodigoNoSeGuardanEnClaro() {
        String codigo = svc.generarCodigo(USUARIO, EMPRESA).codigo();
        svc.activar(EMPRESA, TEL, codigo);
        AgenteVinculacion v = memoria.filas.get(0);
        assertThat(v.getContactoHash()).doesNotContain(TEL).hasSize(64);
        assertThat(v.getContactoUltimos4()).isEqualTo("0001");
        assertThat(v.getCodigoHash()).isNull(); // ya canjeado
        assertThat(v.toString()).doesNotContain(TEL).doesNotContain(v.getContactoHash());
    }

    @Test
    void codigoVencidoNoActiva() {
        String codigo = svc.generarCodigo(USUARIO, EMPRESA).codigo();
        reloj.avanzar(Duration.ofMinutes(10).plusSeconds(1));
        assertThat(svc.activar(EMPRESA, TEL, codigo)).isEqualTo(Activacion.VENCIDO);
        assertThat(svc.usuarioVinculado(EMPRESA, TEL)).isEmpty();
        // Y ya no sirve ni en tiempo.
        assertThat(svc.activar(EMPRESA, TEL, codigo)).isEqualTo(Activacion.CODIGO_INVALIDO);
    }

    @Test
    void codigoJustoAntesDeVencerSiSirve() {
        String codigo = svc.generarCodigo(USUARIO, EMPRESA).codigo();
        reloj.avanzar(Duration.ofMinutes(9).plusSeconds(59));
        assertThat(svc.activar(EMPRESA, TEL, codigo)).isEqualTo(Activacion.OK);
    }

    @Test
    void codigoDeUnSoloUsoNoSePuedeReusar() {
        String codigo = svc.generarCodigo(USUARIO, EMPRESA).codigo();
        assertThat(svc.activar(EMPRESA, TEL, codigo)).isEqualTo(Activacion.OK);
        assertThat(svc.activar(EMPRESA, TEL_2, codigo)).isEqualTo(Activacion.CODIGO_INVALIDO);
        assertThat(svc.usuarioVinculado(EMPRESA, TEL_2)).isEmpty();
    }

    @Test
    void codigoDeOtraEmpresaNoValeAqui() {
        String codigo = svc.generarCodigo(USUARIO, EMPRESA).codigo();
        // El teléfono escribió al número de OTRA empresa con el código de la primera.
        assertThat(svc.activar(OTRA_EMPRESA, TEL, codigo)).isEqualTo(Activacion.CODIGO_INVALIDO);
        assertThat(svc.usuarioVinculado(OTRA_EMPRESA, TEL)).isEmpty();
        // El código sigue vigente en su empresa.
        assertThat(svc.activar(EMPRESA, TEL, codigo)).isEqualTo(Activacion.OK);
    }

    @Test
    void generarOtroCodigoInvalidaElAnterior() {
        String primero = svc.generarCodigo(USUARIO, EMPRESA).codigo();
        String segundo = svc.generarCodigo(USUARIO, EMPRESA).codigo();
        assertThat(svc.activar(EMPRESA, TEL, primero)).isEqualTo(Activacion.CODIGO_INVALIDO);
        assertThat(svc.activar(EMPRESA, TEL, segundo)).isEqualTo(Activacion.OK);
    }

    @Test
    void telefonoYaVinculadoAOtroUsuarioSeRechaza() {
        svc.activar(EMPRESA, TEL, svc.generarCodigo(USUARIO, EMPRESA).codigo());
        String codigoOtro = svc.generarCodigo(101L, EMPRESA).codigo();
        assertThat(svc.activar(EMPRESA, TEL, codigoOtro)).isEqualTo(Activacion.TELEFONO_EN_USO);
        assertThat(svc.usuarioVinculado(EMPRESA, TEL)).isEqualTo(OptionalLong.of(USUARIO));
    }

    @Test
    void usuarioQueYaNoEsDelEquipoNoActivaNiSigueSiendoInterno() {
        String codigo = svc.generarCodigo(101L, EMPRESA).codigo();
        equipo.sacar(101L, EMPRESA);
        assertThat(svc.activar(EMPRESA, TEL, codigo)).isEqualTo(Activacion.USUARIO_INACTIVO);

        svc.activar(EMPRESA, TEL_2, svc.generarCodigo(USUARIO, EMPRESA).codigo());
        assertThat(svc.usuarioVinculado(EMPRESA, TEL_2)).isPresent();
        equipo.sacar(USUARIO, EMPRESA);
        assertThat(svc.usuarioVinculado(EMPRESA, TEL_2)).isEmpty(); // la membresía se revalida en cada uso
    }

    @Test
    void soloMiembrosDelNegocioGeneranCodigo() {
        assertThatThrownBy(() -> svc.generarCodigo(999L, EMPRESA)).isInstanceOf(TenantAccessDeniedException.class);
        assertThatThrownBy(() -> svc.generarCodigo(101L, OTRA_EMPRESA)).isInstanceOf(TenantAccessDeniedException.class);
    }

    @Test
    void revocarCortaElModoInternoYPermiteVincularDeNuevo() {
        svc.activar(EMPRESA, TEL, svc.generarCodigo(USUARIO, EMPRESA).codigo());
        assertThat(svc.revocar(USUARIO, EMPRESA)).isTrue();
        assertThat(svc.usuarioVinculado(EMPRESA, TEL)).isEmpty();
        assertThat(svc.revocar(USUARIO, EMPRESA)).isFalse();
        assertThat(svc.revocar(USUARIO, OTRA_EMPRESA)).isFalse(); // otra empresa: no existe

        assertThat(svc.activar(EMPRESA, TEL, svc.generarCodigo(USUARIO, EMPRESA).codigo())).isEqualTo(Activacion.OK);
        assertThat(svc.usuarioVinculado(EMPRESA, TEL)).isPresent();
    }

    // ── SelectorPerfil con la vinculación real ────────────────────────────────

    @SuppressWarnings("unchecked")
    private SelectorPerfil selector() {
        ObjectProvider<com.hotclick.agente.conversacion.spi.TelefonoVinculadoResolver> p = mock(ObjectProvider.class);
        when(p.getIfAvailable()).thenReturn(svc);
        return new SelectorPerfil(p);
    }

    private CanalCuenta cuenta(Canal tipo) {
        CanalCuenta c = new CanalCuenta();
        c.setId(1L);
        c.setTipo(tipo);
        c.setEmpresaId(EMPRESA);
        return c;
    }

    @Test
    void selectorEligeInternoConVinculacionActivaYVentasSiSeRevoca() {
        SelectorPerfil sel = selector();
        assertThat(sel.elegir(cuenta(Canal.WHATSAPP), TEL).perfil()).isEqualTo(PerfilConversacion.NEGOCIO_VENTAS);

        svc.activar(EMPRESA, TEL, svc.generarCodigo(USUARIO, EMPRESA).codigo());
        SelectorPerfil.Eleccion e = sel.elegir(cuenta(Canal.WHATSAPP), TEL);
        assertThat(e.perfil()).isEqualTo(PerfilConversacion.NEGOCIO_INTERNO);
        assertThat(e.usuarioId()).isEqualTo(USUARIO);
        // Otro teléfono, o el mismo wa_id por otro canal, sigue siendo cliente.
        assertThat(sel.elegir(cuenta(Canal.WHATSAPP), TEL_2).perfil()).isEqualTo(PerfilConversacion.NEGOCIO_VENTAS);
        assertThat(sel.elegir(cuenta(Canal.MESSENGER), TEL).perfil()).isEqualTo(PerfilConversacion.NEGOCIO_VENTAS);

        svc.revocar(USUARIO, EMPRESA);
        assertThat(sel.elegir(cuenta(Canal.WHATSAPP), TEL).perfil()).isEqualTo(PerfilConversacion.NEGOCIO_VENTAS);
    }
}
