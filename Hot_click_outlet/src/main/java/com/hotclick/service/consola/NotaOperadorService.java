package com.hotclick.service.consola;

import com.hotclick.model.NotaOperador;
import com.hotclick.repository.NotaOperadorRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.utils.Constants;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class NotaOperadorService {

    private final NotaOperadorRepository notaRepo;
    private final CompanyScope companyScope;

    public NotaOperadorService(NotaOperadorRepository notaRepo, CompanyScope companyScope) {
        this.notaRepo = notaRepo;
        this.companyScope = companyScope;
    }

    @Transactional
    public Map<String, Object> crear(Long empresaId, String nota, String proxima, String bandeja) {
        if (empresaId == null) throw new IllegalArgumentException("Falta el negocio.");
        if (nota == null || nota.trim().length() < 3) {
            throw new IllegalArgumentException("La nota es obligatoria.");
        }
        NotaOperador fila = new NotaOperador();
        fila.setEmpresaId(empresaId);
        fila.setNota(nota.trim());
        fila.setProximaAccion(proxima == null ? null : proxima.trim());
        fila.setBandeja(bandeja);
        fila.setAdminId(companyScope.idActorAuditoria());
        fila.setAdminEmail(companyScope.correoActorAuditoria());
        fila.setCreada(LocalDateTime.now(Constants.ZONA_CR));
        return mapa(notaRepo.save(fila));
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> recientes() {
        return notaRepo.findTop20ByOrderByCreadaDesc().stream().map(this::mapa).toList();
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> deEmpresa(Long empresaId) {
        return notaRepo.findByEmpresaIdOrderByCreadaDesc(empresaId).stream().map(this::mapa).toList();
    }

    private Map<String, Object> mapa(NotaOperador fila) {
        Map<String, Object> mapa = new LinkedHashMap<>();
        mapa.put("id", fila.getId());
        mapa.put("empresaId", fila.getEmpresaId());
        mapa.put("nota", fila.getNota());
        mapa.put("proximaAccion", fila.getProximaAccion());
        mapa.put("bandeja", fila.getBandeja());
        mapa.put("adminEmail", fila.getAdminEmail());
        mapa.put("creada", fila.getCreada());
        return mapa;
    }
}
