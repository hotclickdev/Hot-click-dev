package com.hotclick.agente.campana;

import com.hotclick.agente.campana.CampanaRepositorio.Campana;
import com.hotclick.agente.campana.PlantillaCampanaRepositorio.Estado;
import com.hotclick.exception.RecursoNoEncontradoException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

class CampanaServiceTest extends CampanaFixture {

    private Campana borrador(long plantillaId, Segmento seg) {
        return campanas().crear(EMPRESA, 9L, "Oferta de diciembre", plantillaId, seg, List.of("{nombre}"), null);
    }

    private static final Segmento TODOS = new Segmento(Segmento.Tipo.TODOS, null, null);

    @Test
    @DisplayName("la estimación cuenta solo consentidos y descuenta bajas y tope por contacto; costo = permitidos x tarifa")
    void estimacionConCostoYExclusiones() {
        consiente(EMPRESA, TEL_ANA, "Ana");
        consiente(EMPRESA, TEL_LUIS, "Luis");
        consiente(EMPRESA, "50688880003", "Eva");
        consiente(EMPRESA, "50688880004", "Rob");
        bajas.registrar(EMPRESA, "WHATSAPP", TEL_LUIS);
        envioPrevio(EMPRESA, "50688880003", Duration.ofDays(1));
        envioPrevio(EMPRESA, "50688880003", Duration.ofDays(2));
        long pl = plantilla(EMPRESA, Estado.APROBADA);

        CampanaService.Estimacion e = campanas().estimar(EMPRESA, borrador(pl, TODOS).id());

        assertThat(e.conConsentimiento()).isEqualTo(4);
        assertThat(e.excluidosPorBaja()).isEqualTo(1);
        assertThat(e.excluidosPorTopeContacto()).isEqualTo(1);
        assertThat(e.permitidos()).isEqualTo(2);
        assertThat(e.costoEstimadoUsd()).isEqualByComparingTo(new BigDecimal("0.15")); // 2 x 0.074 redondeado
    }

    @Test
    @DisplayName("lanzar exige el costo estimado confirmado: si cambió, se rechaza y no se crea ningún envío")
    void lanzarExigeCostoConfirmado() {
        consiente(EMPRESA, TEL_ANA, "Ana");
        Campana c = borrador(plantilla(EMPRESA, Estado.APROBADA), TODOS);

        assertThatThrownBy(() -> campanas().lanzar(EMPRESA, c.id(), new BigDecimal("0.01")))
            .isInstanceOf(IllegalStateException.class).hasMessageContaining("costo");
        assertThatThrownBy(() -> campanas().lanzar(EMPRESA, c.id(), null)).isInstanceOf(IllegalStateException.class);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM hot_click_agente_campana_envio_tb", Integer.class)).isZero();

        Campana lanzada = campanas().lanzar(EMPRESA, c.id(), campanas().estimar(EMPRESA, c.id()).costoEstimadoUsd());
        assertThat(lanzada.estado()).isEqualTo("EN_CURSO");
        assertThat(lanzada.destinatarios()).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM hot_click_agente_campana_envio_tb", Integer.class)).isEqualTo(1);
    }

    @Test
    @DisplayName("una plantilla no aprobada no se puede lanzar")
    void plantillaNoAprobadaNoLanza() {
        consiente(EMPRESA, TEL_ANA, "Ana");
        Campana c = borrador(plantilla(EMPRESA, Estado.PENDIENTE), TODOS);

        assertThatThrownBy(() -> campanas().lanzar(EMPRESA, c.id(), new BigDecimal("0.07")))
            .isInstanceOf(IllegalStateException.class).hasMessageContaining("aprobada");
    }

    @Test
    @DisplayName("sin consentimientos no hay destinatarios: no se lanza")
    void sinConsentimientosNoLanza() {
        Campana c = borrador(plantilla(EMPRESA, Estado.APROBADA), TODOS);

        assertThatThrownBy(() -> campanas().lanzar(EMPRESA, c.id(), BigDecimal.ZERO))
            .isInstanceOf(IllegalStateException.class);
    }

    @Test
    @DisplayName("lanzar dos veces no duplica: la segunda falla")
    void lanzarDosVecesFalla() {
        consiente(EMPRESA, TEL_ANA, "Ana");
        Campana c = borrador(plantilla(EMPRESA, Estado.APROBADA), TODOS);
        BigDecimal costo = campanas().estimar(EMPRESA, c.id()).costoEstimadoUsd();
        campanas().lanzar(EMPRESA, c.id(), costo);

        assertThatThrownBy(() -> campanas().lanzar(EMPRESA, c.id(), costo)).isInstanceOf(IllegalStateException.class);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM hot_click_agente_campana_envio_tb", Integer.class)).isEqualTo(1);
    }

    @Test
    @DisplayName("aislamiento: una campaña o plantilla de otro negocio responde como inexistente")
    void otroNegocioNoVeNiToca() {
        Campana c = borrador(plantilla(EMPRESA, Estado.APROBADA), TODOS);

        assertThatThrownBy(() -> campanas().obtener(OTRA, c.id())).isInstanceOf(RecursoNoEncontradoException.class);
        assertThatThrownBy(() -> campanas().cancelar(OTRA, c.id())).isInstanceOf(RecursoNoEncontradoException.class);
        assertThatThrownBy(() -> campanas().estimar(OTRA, c.id())).isInstanceOf(RecursoNoEncontradoException.class);
        assertThatThrownBy(() -> plantillas.obtener(OTRA, c.plantillaId())).isInstanceOf(RecursoNoEncontradoException.class);
        assertThat(campanas().listar(OTRA)).isEmpty();
        assertThatThrownBy(() -> campanas().crear(OTRA, 9L, "x", c.plantillaId(), TODOS, List.of("{nombre}"), null))
            .isInstanceOf(RecursoNoEncontradoException.class);
    }

    @Test
    @DisplayName("cancelar deja los pendientes como omitidos")
    void cancelarOmitePendientes() {
        consiente(EMPRESA, TEL_ANA, "Ana");
        Campana c = borrador(plantilla(EMPRESA, Estado.APROBADA), TODOS);
        campanas().lanzar(EMPRESA, c.id(), campanas().estimar(EMPRESA, c.id()).costoEstimadoUsd());

        Campana cancelada = campanas().cancelar(EMPRESA, c.id());

        assertThat(cancelada.estado()).isEqualTo("CANCELADA");
        assertThat(estadoEnvio(c.id(), EMPRESA, TEL_ANA)).isEqualTo("OMITIDO");
    }

    @Test
    @DisplayName("la cantidad de valores debe coincidir con las variables de la plantilla")
    void parametrosDebenCoincidir() {
        long pl = plantilla(EMPRESA, Estado.APROBADA);

        assertThatThrownBy(() -> campanas().crear(EMPRESA, 9L, "x", pl, TODOS, List.of(), null))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("segmento compradores recientes: solo consentidos que pagaron dentro de la ventana, de ESTE negocio")
    void segmentoCompradoresRecientes() {
        consiente(EMPRESA, TEL_ANA, "Ana");       // compró hace 10 días
        consiente(EMPRESA, TEL_LUIS, "Luis");     // compró hace 90 días: fuera de ventana
        consiente(EMPRESA, "50688880003", "Eva"); // consintió pero nunca compró
        consiente(OTRA, "50688880005", "Zoe");    // compró, pero en otro negocio
        compra(EMPRESA, TEL_ANA, 10, "PAGADO");
        compra(EMPRESA, TEL_LUIS, 90, "PAGADO");
        compra(OTRA, "50688880005", 5, "PAGADO");
        compra(EMPRESA, "50688880003", 3, "CREADO"); // armó el enlace pero no pagó
        compra(EMPRESA, "50688880009", 3, "PAGADO"); // compró pero NO consintió

        var destinos = segmentos.resolver(EMPRESA, new Segmento(Segmento.Tipo.COMPRADORES_RECIENTES, 30, null));

        assertThat(destinos).extracting(d -> d.hash())
            .containsExactly(CampanaTestSupport.hash(EMPRESA, TEL_ANA));
    }

    @Test
    @DisplayName("segmento interés en una categoría y segmento leads: también exigen consentimiento")
    void segmentoCategoriaYLeads() {
        consiente(EMPRESA, TEL_ANA, "Ana");
        compra(EMPRESA, TEL_ANA, 5, "CREADO");
        jdbc.update("INSERT INTO hot_click_producto_tb (id_producto, fk_id_empresa, fk_id_categoria) VALUES (1, ?, 7)", EMPRESA);
        jdbc.update("INSERT INTO hot_click_enlace_compra_item_tb (fk_id_enlace_compra, fk_id_producto) VALUES "
            + "((SELECT MAX(id_enlace_compra) FROM hot_click_enlace_compra_tb), 1)");
        consiente(EMPRESA, TEL_LUIS, "Luis");
        jdbc.update("INSERT INTO hot_click_lead_tb (tipo, fk_id_empresa, canal, contacto_cifrado) VALUES "
            + "('COMPRADOR', ?, 'WHATSAPP', ?)", EMPRESA, "l:" + TEL_LUIS);
        jdbc.update("INSERT INTO hot_click_lead_tb (tipo, fk_id_empresa, canal, contacto_cifrado) VALUES "
            + "('COMPRADOR', ?, 'WHATSAPP', ?)", EMPRESA, "l:50688880099"); // lead sin consentimiento

        assertThat(segmentos.resolver(EMPRESA, new Segmento(Segmento.Tipo.INTERES_CATEGORIA, 30, 7L)))
            .extracting(d -> d.hash()).containsExactly(CampanaTestSupport.hash(EMPRESA, TEL_ANA));
        assertThat(segmentos.resolver(EMPRESA, new Segmento(Segmento.Tipo.INTERES_CATEGORIA, 30, 8L))).isEmpty();
        assertThat(segmentos.resolver(EMPRESA, new Segmento(Segmento.Tipo.LEADS, 30, null)))
            .extracting(d -> d.hash()).containsExactly(CampanaTestSupport.hash(EMPRESA, TEL_LUIS));
    }

    @Test
    @DisplayName("un plan sin bot de ventas no puede estimar ni lanzar campañas")
    void planSinAgenteNoAplica() {
        Campana c = borrador(plantilla(EMPRESA, Estado.APROBADA), TODOS);
        when(planes.planTiene(any(), eq("agente"))).thenReturn(false);

        assertThatThrownBy(() -> campanas().estimar(EMPRESA, c.id())).isInstanceOf(IllegalStateException.class);
    }

    private void compra(Long empresa, String tel, int haceDias, String estado) {
        jdbc.update("INSERT INTO hot_click_enlace_compra_tb (fk_id_empresa, contacto_externo, canal, estado, creado) "
            + "VALUES (?,?,'WHATSAPP',?,?)", empresa, tel, estado,
            Timestamp.valueOf(LocalDateTime.now(com.hotclick.utils.Constants.ZONA_CR).minusDays(haceDias)));
    }
}
