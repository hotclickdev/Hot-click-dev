package com.hotclick.service.consola;

import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.Empresa;
import com.hotclick.model.SancionPlataforma;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.SancionPlataformaRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.AuditoriaAdminRegistroService;
import com.hotclick.utils.Constants;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class SancionPlataformaService {

    private final SancionPlataformaRepository sancionRepo;
    private final EmpresaRepository empresaRepo;
    private final AuditoriaAdminRegistroService auditoria;
    private final CompanyScope companyScope;

    public SancionPlataformaService(SancionPlataformaRepository sancionRepo,
                                    EmpresaRepository empresaRepo,
                                    AuditoriaAdminRegistroService auditoria,
                                    CompanyScope companyScope) {
        this.sancionRepo = sancionRepo;
        this.empresaRepo = empresaRepo;
        this.auditoria = auditoria;
        this.companyScope = companyScope;
    }

    @Transactional
    public Map<String, Object> crear(Long empresaId, String nivel, String motivo, String politica) {
        SancionReglas.exigirMotivo(motivo);
        Empresa empresa = empresaRepo.findById(empresaId)
            .orElseThrow(() -> new RecursoNoEncontradoException("Empresa", empresaId));
        cerrarVencidas();
        long previas = sancionRepo.countByEmpresaIdAndNivelSolicitado(empresaId, SancionReglas.LEVE);
        String aplicado = SancionReglas.nivelAplicado(nivel, previas);
        SancionPlataforma fila = armar(empresa, nivel, aplicado, motivo.trim(), politica);
        sancionRepo.save(fila);
        auditoria.registrar("SANCION", "EMPRESA", empresaId, empresaId,
            aplicado + " · " + motivo.trim());
        return mapa(fila);
    }

    @Transactional
    public List<Map<String, Object>> listar(Long empresaId) {
        cerrarVencidas();
        return sancionRepo.findByEmpresaIdOrderByCreadaDesc(empresaId).stream().map(this::mapa).toList();
    }

    @Transactional
    public void cerrarVencidas() {
        LocalDateTime ahora = LocalDateTime.now(Constants.ZONA_CR);
        for (SancionPlataforma fila : sancionRepo.findByActivaTrue()) {
            if (fila.getFin() != null && fila.getFin().isBefore(ahora)) {
                cerrar(fila);
            }
        }
    }

    public boolean vigente(Long empresaId) {
        return sancionRepo.existsByEmpresaIdAndActivaTrue(empresaId);
    }

    private SancionPlataforma armar(Empresa empresa, String solicitado, String aplicado, String motivo, String politica) {
        LocalDateTime ahora = LocalDateTime.now(Constants.ZONA_CR);
        SancionPlataforma fila = new SancionPlataforma();
        fila.setEmpresaId(empresa.getId());
        fila.setNivelSolicitado(solicitado.trim().toUpperCase());
        fila.setNivelAplicado(aplicado);
        fila.setMotivo(motivo);
        fila.setPolitica(politica);
        fila.setInicio(ahora);
        fila.setFin(SancionReglas.fin(aplicado, ahora));
        fila.setActiva(true);
        fila.setCreada(ahora);
        fila.setAdminId(companyScope.idActorAuditoria());
        fila.setAdminEmail(companyScope.correoActorAuditoria());
        ocultarCatalogo(empresa, fila, aplicado);
        return fila;
    }

    private void ocultarCatalogo(Empresa empresa, SancionPlataforma fila, String aplicado) {
        boolean visible = Boolean.TRUE.equals(empresa.getVisibilidadPublica());
        fila.setRestituirVisibilidad(visible && !SancionReglas.DEFINITIVA.equals(aplicado));
        if (visible) {
            empresa.setVisibilidadPublica(false);
            empresaRepo.save(empresa);
        }
    }

    private void cerrar(SancionPlataforma fila) {
        fila.setActiva(false);
        sancionRepo.save(fila);
        if (!fila.isRestituirVisibilidad() || sancionRepo.existsByEmpresaIdAndActivaTrue(fila.getEmpresaId())) return;
        empresaRepo.findById(fila.getEmpresaId()).ifPresent(empresa -> {
            empresa.setVisibilidadPublica(true);
            empresaRepo.save(empresa);
        });
    }

    private Map<String, Object> mapa(SancionPlataforma fila) {
        Map<String, Object> mapa = new LinkedHashMap<>();
        mapa.put("id", fila.getId());
        mapa.put("nivel", fila.getNivelAplicado());
        mapa.put("solicitado", fila.getNivelSolicitado());
        mapa.put("motivo", fila.getMotivo());
        mapa.put("politica", fila.getPolitica());
        mapa.put("inicio", fila.getInicio());
        mapa.put("fin", fila.getFin());
        mapa.put("activa", fila.isActiva());
        mapa.put("adminEmail", fila.getAdminEmail());
        return mapa;
    }
}
