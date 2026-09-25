package com.hotclick.service.analytics;

import com.hotclick.dto.AtribucionSnapshotDTO;
import com.hotclick.dto.AtribucionTouchDTO;
import com.hotclick.model.AtribucionPedido;
import com.hotclick.model.Pedido;
import com.hotclick.repository.AtribucionPedidoRepository;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.format.DateTimeParseException;
import java.util.Optional;

@Service
public class AtribucionPedidoService {

    private static final Logger log = LoggerFactory.getLogger(AtribucionPedidoService.class);
    private static final int MAX_LEN_SHORT = 120;
    private static final int MAX_LEN_MED = 255;
    private static final int MAX_LEN_PATH = 500;

    private final AtribucionPedidoRepository repository;

    public AtribucionPedidoService(AtribucionPedidoRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public AtribucionPedido guardarSiPresente(Pedido pedido, AtribucionSnapshotDTO snapshot) {
        if (pedido == null || pedido.getId() == null || snapshot == null) return null;
        if (snapshot.getFirst() == null && snapshot.getLast() == null) return null;
        if (repository.findByPedidoId(pedido.getId()).isPresent()) {
            return repository.findByPedidoId(pedido.getId()).orElse(null);
        }

        AtribucionPedido a = new AtribucionPedido();
        a.setPedido(pedido);
        a.setEmpresa(pedido.getEmpresa());
        aplicarTouch(a, snapshot.getFirst(), true);
        aplicarTouch(a, snapshot.getLast(), false);
        a.setFbp(trunc(snapshot.getFbp(), MAX_LEN_MED));
        a.setFbc(trunc(snapshot.getFbc(), MAX_LEN_MED));
        a.setEventIdPurchase("purchase_" + pedido.getNumeroPedido());
        a.setFechaCreacion(LocalDateTime.now(Constants.ZONA_CR));

        AtribucionPedido saved = repository.save(a);
        log.debug("Atribución guardada pedido={} campana={}",
            pedido.getNumeroPedido(), saved.campanaEfectiva());
        return saved;
    }

    public Optional<AtribucionPedido> findByPedidoId(Long pedidoId) {
        return repository.findByPedidoId(pedidoId);
    }

    private void aplicarTouch(AtribucionPedido a, AtribucionTouchDTO t, boolean first) {
        if (t == null) return;
        if (first) {
            a.setFirstUtmSource(trunc(t.getUtmSource(), MAX_LEN_SHORT));
            a.setFirstUtmMedium(trunc(t.getUtmMedium(), MAX_LEN_SHORT));
            a.setFirstUtmCampaign(trunc(t.getUtmCampaign(), MAX_LEN_MED));
            a.setFirstUtmContent(trunc(t.getUtmContent(), MAX_LEN_MED));
            a.setFirstUtmTerm(trunc(t.getUtmTerm(), MAX_LEN_MED));
            a.setFirstFbclid(trunc(t.getFbclid(), MAX_LEN_MED));
            a.setFirstGclid(trunc(t.getGclid(), MAX_LEN_MED));
            a.setFirstLandingPath(trunc(t.getLandingPath(), MAX_LEN_PATH));
            a.setFirstTouchedAt(parseTouchedAt(t.getTouchedAt()));
        } else {
            a.setLastUtmSource(trunc(t.getUtmSource(), MAX_LEN_SHORT));
            a.setLastUtmMedium(trunc(t.getUtmMedium(), MAX_LEN_SHORT));
            a.setLastUtmCampaign(trunc(t.getUtmCampaign(), MAX_LEN_MED));
            a.setLastUtmContent(trunc(t.getUtmContent(), MAX_LEN_MED));
            a.setLastUtmTerm(trunc(t.getUtmTerm(), MAX_LEN_MED));
            a.setLastFbclid(trunc(t.getFbclid(), MAX_LEN_MED));
            a.setLastGclid(trunc(t.getGclid(), MAX_LEN_MED));
            a.setLastLandingPath(trunc(t.getLandingPath(), MAX_LEN_PATH));
            a.setLastTouchedAt(parseTouchedAt(t.getTouchedAt()));
        }
    }

    private static LocalDateTime parseTouchedAt(String raw) {
        if (raw == null || raw.isBlank()) return LocalDateTime.now(Constants.ZONA_CR);
        try {
            return OffsetDateTime.parse(raw).atZoneSameInstant(Constants.ZONA_CR).toLocalDateTime();
        } catch (DateTimeParseException e) {
            try {
                return LocalDateTime.parse(raw);
            } catch (DateTimeParseException e2) {
                return LocalDateTime.now(Constants.ZONA_CR);
            }
        }
    }

    private static String trunc(String value, int max) {
        if (value == null) return null;
        String t = value.trim();
        if (t.isEmpty()) return null;
        return t.length() <= max ? t : t.substring(0, max);
    }

}
