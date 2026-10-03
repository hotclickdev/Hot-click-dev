package com.hotclick.service;

import com.hotclick.model.Empresa;
import com.hotclick.model.Mesa;
import com.hotclick.model.Plan;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.repository.MesaRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.repository.UsuarioRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.cache.CacheManager;

import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@DisplayName("[NEGOCIO] QR de mesa (/api/qr/{token}): WhatsApp del negocio solo con plan PYME o NEGOCIO_PLUS")
class SelfCheckoutContactoTest {

    @ParameterizedTest(name = "plan {0} → whatsapp visible {1}")
    @CsvSource({"EMPRENDEDOR, false", "PYME, true", "NEGOCIO_PLUS, true"})
    void mesaInfo_segunPlan(String plan, boolean conContacto) {
        Plan p = new Plan();
        p.setNombre(plan);
        Empresa e = new Empresa();
        e.setId(77L);
        e.setNombreComercial("Casa Luna 506");
        e.setNumeroWhatsapp("50688880506");
        e.setPlan(p);
        Mesa mesa = new Mesa();
        mesa.setEmpresa(e);
        mesa.setActivo(true);
        mesa.setNombre("Mesa 1");
        MesaRepository mesaRepo = mock(MesaRepository.class);
        when(mesaRepo.findByQrToken("tok")).thenReturn(Optional.of(mesa));
        SelfCheckoutService servicio = new SelfCheckoutService(mesaRepo, mock(PedidoRepository.class),
            mock(ProductoRepository.class), mock(BodegaRepository.class), mock(UsuarioRepository.class),
            mock(CacheManager.class));

        Map<String, Object> info = servicio.getMesaInfo("tok");

        assertThat(info.get("numeroWhatsapp")).isEqualTo(conContacto ? "50688880506" : null);
        assertThat(info.get("empresaNombre")).isEqualTo("Casa Luna 506");
    }
}
