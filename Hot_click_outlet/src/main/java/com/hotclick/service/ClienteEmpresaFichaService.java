package com.hotclick.service;

import com.hotclick.model.ClienteEmpresa;
import com.hotclick.repository.ClienteEmpresaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * P8-01 (V171): ficha del cliente por negocio (notas, puntos, segmento). Una fila por operación;
 * separada de CrmClientesService para que sus escrituras no queden junto a los listados del CRM.
 */
@Service
public class ClienteEmpresaFichaService {

    private final ClienteEmpresaRepository repo;

    public ClienteEmpresaFichaService(ClienteEmpresaRepository repo) {
        this.repo = repo;
    }

    /** Ficha del cliente en este negocio; se crea al primer uso con origen COMPRA. */
    @Transactional
    public ClienteEmpresa obtenerOCrear(Long empresaId, Long usuarioId) {
        return repo.findByEmpresaIdAndUsuarioId(empresaId, usuarioId)
            .orElseGet(() -> repo.save(new ClienteEmpresa(empresaId, usuarioId, ClienteEmpresa.ORIGEN_COMPRA)));
    }

    /** Alta manual desde el CRM del negocio. */
    @Transactional
    public void registrarManual(Long empresaId, Long usuarioId) {
        repo.save(new ClienteEmpresa(empresaId, usuarioId, ClienteEmpresa.ORIGEN_MANUAL));
    }

    @Transactional
    public ClienteEmpresa guardar(ClienteEmpresa ficha) {
        return repo.save(ficha);
    }
}
