package com.hotclick.service.suscripcion;

import com.hotclick.model.Empresa;
import com.hotclick.model.SolicitudCambioPlan;

import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Arma la lista del admin en memoria (sin tocar la base): los nombres llegan ya cargados en un solo query. */
final class SolicitudCambioPlanVista {

    private SolicitudCambioPlanVista() {}

    static Set<Long> idsEmpresa(List<SolicitudCambioPlan> filas) {
        Set<Long> ids = new LinkedHashSet<>();
        filas.forEach(s -> { if (s.getEmpresaId() != null) ids.add(s.getEmpresaId()); });
        return ids;
    }

    static List<Map<String, Object>> lista(List<SolicitudCambioPlan> filas, Iterable<Empresa> empresas) {
        Map<Long, String> nombres = new HashMap<>();
        empresas.forEach(e -> nombres.put(e.getId(), e.getNombreEmpresa()));
        return filas.stream().map(s -> SolicitudCambioPlanService.aMapa(s, nombres.get(s.getEmpresaId()))).toList();
    }
}
