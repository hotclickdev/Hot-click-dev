package com.hotclick.service.pedido;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.model.Pedido;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
public class PedidoNotificacionAppender {

    private static final Logger log = LoggerFactory.getLogger(PedidoNotificacionAppender.class);

    @Autowired private ObjectMapper objectMapper;

    public void appendNotificacion(Pedido pedido, String estado, String nota) {
        try {
            String raw = pedido.getNotificaciones();
            List<Map<String, Object>> list = objectMapper.readValue(
                (raw != null && !raw.isBlank()) ? raw : "[]",
                new TypeReference<List<Map<String, Object>>>() {}
            );
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("estado", estado);
            entry.put("nota",   nota);
            entry.put("fecha",  LocalDateTime.now(Constants.ZONA_CR).format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
            list.add(entry);
            pedido.setNotificaciones(objectMapper.writeValueAsString(list));
        } catch (Exception e) {
            log.warn("No se pudo guardar notificacion en pedido {}: {}", pedido.getId(), e.getMessage());
        }
    }
}
