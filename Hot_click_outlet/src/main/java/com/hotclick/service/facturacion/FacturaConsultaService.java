package com.hotclick.service.facturacion;

import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.dto.ComprobanteEmitido;
import com.hotclick.model.ComprobanteFiscal;
import com.hotclick.repository.ComprobanteFiscalRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.utils.Constants;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Service
public class FacturaConsultaService {

    static final int PAGINA_MAX = 50;

    private final ComprobanteFiscalRepository comprobanteRepo;
    private final CompanyScope companyScope;

    public FacturaConsultaService(ComprobanteFiscalRepository comprobanteRepo, CompanyScope companyScope) {
        this.comprobanteRepo = comprobanteRepo;
        this.companyScope = companyScope;
    }

    static final LocalDateTime FECHA_MIN = LocalDateTime.of(2000, 1, 1, 0, 0);
    static final LocalDateTime FECHA_MAX = LocalDateTime.of(9999, 12, 31, 23, 59, 59);

    @Transactional(readOnly = true)

    public Page<ComprobanteEmitido> listar(int page, int size, String estado,
                                            LocalDate fechaDesde, LocalDate fechaHasta) {
        Long empresaId = companyScope.requireEmpresaIdOrAdmin();
        if (empresaId == null) { // solo IT Admin / staff: comprobantes de la plataforma
            empresaId = Constants.EMPRESA_PLATAFORMA_ID;
        }
        // GET /api/facturas 500: nunca mandar fechas null al query (Postgres no infiere el tipo).
        LocalDateTime desde = fechaDesde != null ? fechaDesde.atStartOfDay() : FECHA_MIN;
        LocalDateTime hasta = fechaHasta != null ? fechaHasta.atTime(23, 59, 59) : FECHA_MAX;
        return comprobanteRepo.findByEmpresaIdConFiltros(
            empresaId, estado, desde, hasta, pagina(page, size)
        ).map(ComprobanteEmitido::de);
    }

    @Transactional(readOnly = true)
    public ComprobanteEmitido detalle(Long id) {
        return ComprobanteEmitido.de(cargar(id));
    }

    private ComprobanteFiscal cargar(Long id) {
        ComprobanteFiscal comprobante = comprobanteRepo.findById(id)
            .orElseThrow(() -> RecursoNoEncontradoException.conDetalle("Comprobante no encontrado", "id=" + id));
        companyScope.assertCanAccess(comprobante.getEmpresa().getId());
        return comprobante;
    }

    private static PageRequest pagina(int page, int size) {
        int pagina = Math.max(page, 0);
        int tamano = Math.min(Math.max(size, 1), PAGINA_MAX);
        return PageRequest.of(pagina, tamano, Sort.by("fechaEmision").descending());
    }
}
