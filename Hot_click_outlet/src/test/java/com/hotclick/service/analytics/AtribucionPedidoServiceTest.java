package com.hotclick.service.analytics;

import com.hotclick.dto.AtribucionSnapshotDTO;
import com.hotclick.dto.AtribucionTouchDTO;
import com.hotclick.model.AtribucionPedido;
import com.hotclick.model.Pedido;
import com.hotclick.repository.AtribucionPedidoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AtribucionPedidoServiceTest {

    @Mock AtribucionPedidoRepository repository;
    AtribucionPedidoService service;

    @BeforeEach
    void setUp() {
        service = new AtribucionPedidoService(repository);
    }

    @Test
    void guardarSiPresente_persisteFirstLastYEventId() {
        Pedido pedido = new Pedido();
        pedido.setId(10L);
        pedido.setNumeroPedido("ORD-TEST-1");

        AtribucionTouchDTO first = new AtribucionTouchDTO();
        first.setUtmCampaign("camp-a");
        first.setUtmSource("facebook");
        first.setTouchedAt("2026-03-20T12:00:00-06:00");

        AtribucionTouchDTO last = new AtribucionTouchDTO();
        last.setUtmCampaign("camp-b");
        last.setFbclid("fb.xxx");
        last.setTouchedAt("2026-03-22T12:00:00-06:00");

        AtribucionSnapshotDTO snap = new AtribucionSnapshotDTO();
        snap.setFirst(first);
        snap.setLast(last);
        snap.setFbp("fb.1.123.456");

        when(repository.findByPedidoId(10L)).thenReturn(Optional.empty());
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        AtribucionPedido saved = service.guardarSiPresente(pedido, snap);

        assertNotNull(saved);
        assertEquals("camp-a", saved.getFirstUtmCampaign());
        assertEquals("camp-b", saved.getLastUtmCampaign());
        assertEquals("purchase_ORD-TEST-1", saved.getEventIdPurchase());
        assertEquals("fb.1.123.456", saved.getFbp());
        assertEquals("camp-b", saved.campanaEfectiva());

        ArgumentCaptor<AtribucionPedido> cap = ArgumentCaptor.forClass(AtribucionPedido.class);
        verify(repository).save(cap.capture());
        assertSame(pedido, cap.getValue().getPedido());
    }

    @Test
    void guardarSiPresente_sinSnapshot_noGuarda() {
        Pedido pedido = new Pedido();
        pedido.setId(1L);
        assertNull(service.guardarSiPresente(pedido, null));
        verify(repository, never()).save(any());
    }
}
