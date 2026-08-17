package com.hotclick.service.cotizacion;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class CotizacionConsecutivoGenerator {

    @PersistenceContext private EntityManager em;

    @Transactional
    public String generarConsecutivo(Long empresaId) {
        em.createNativeQuery(
            "INSERT INTO hot_click_cotizacion_consecutivo_tb(empresa_id, ultimo_numero) " +
            "VALUES (:eid, 1) " +
            "ON CONFLICT (empresa_id) DO UPDATE " +
            "SET ultimo_numero = hot_click_cotizacion_consecutivo_tb.ultimo_numero + 1"
        ).setParameter("eid", empresaId).executeUpdate();

        Number numero = (Number) em.createNativeQuery(
            "SELECT ultimo_numero FROM hot_click_cotizacion_consecutivo_tb WHERE empresa_id = :eid"
        ).setParameter("eid", empresaId).getSingleResult();

        return String.format("COT-%06d", numero.longValue());
    }
}
