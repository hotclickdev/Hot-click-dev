package com.hotclick.controller.aprobacion;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.model.SolicitudAprobacion;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class SolicitudOfertaSnapshotReader {

    private final ObjectMapper objectMapper;

    public SolicitudOfertaSnapshotReader(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public Map<String, Object> read(SolicitudAprobacion solicitud) throws Exception {
        return objectMapper.readValue(solicitud.getDatosSnapshot(), Map.class);
    }
}
