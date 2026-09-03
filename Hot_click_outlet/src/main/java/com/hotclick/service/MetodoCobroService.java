package com.hotclick.service;

import com.hotclick.dto.MetodoCobroCreateRequest;
import com.hotclick.dto.MetodoCobroDto;
import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.Empresa;
import com.hotclick.model.MetodoCobro;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.MetodoCobroRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.utils.InputSanitizer;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class MetodoCobroService {

    private final MetodoCobroRepository repo;
    private final EmpresaRepository empresaRepo;
    private final CompanyScope companyScope;
    private final InputSanitizer sanitizer;

    public MetodoCobroService(
            MetodoCobroRepository repo,
            EmpresaRepository empresaRepo,
            CompanyScope companyScope,
            InputSanitizer sanitizer) {
        this.repo = repo;
        this.empresaRepo = empresaRepo;
        this.companyScope = companyScope;
        this.sanitizer = sanitizer;
    }

    @Transactional(readOnly = true)
    public List<MetodoCobroDto> listar() {
        Long empresaId = exigirEmpresaId();
        return repo.findActivosByEmpresaId(empresaId).stream()
                .map(MetodoCobroDto::from)
                .toList();
    }

    @Transactional
    public MetodoCobroDto crear(MetodoCobroCreateRequest req) {
        Long empresaId = exigirEmpresaId();
        Empresa empresa = empresaRepo.findById(empresaId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Empresa", empresaId));

        String tipo = MetodoCobroFormato.normalizarTipo(req.getTipo());
        String datoLimpio = sanitizer.cleanWithLimit(req.getDato(), 80);
        String destino = MetodoCobroFormato.limpiarDestino(tipo, datoLimpio);

        boolean primero = repo.countByEmpresa_IdAndActivoTrue(empresaId) == 0;

        MetodoCobro m = new MetodoCobro();
        m.setEmpresa(empresa);
        m.setTipo(tipo);
        m.setDestino(destino);
        m.setMascara(MetodoCobroFormato.mascara(tipo, destino));
        m.setPredeterminado(primero);
        m.setActivo(true);
        return MetodoCobroDto.from(repo.save(m));
    }

    @Transactional
    public MetodoCobroDto marcarPredeterminado(Long id) {
        MetodoCobro m = cargarDeMiEmpresa(id);
        repo.clearPredeterminado(m.getEmpresa().getId());
        m.setPredeterminado(true);
        return MetodoCobroDto.from(repo.save(m));
    }

    private MetodoCobro cargarDeMiEmpresa(Long id) {
        MetodoCobro m = repo.findActivoById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Método de cobro", id));
        companyScope.assertCanAccess(m.getEmpresa().getId());
        return m;
    }

    private Long exigirEmpresaId() {
        Long empresaId = companyScope.getCurrentEmpresaIdOrOwn();
        if (empresaId == null) {
            throw new IllegalStateException("Tu cuenta no tiene un negocio asociado");
        }
        return empresaId;
    }
}
