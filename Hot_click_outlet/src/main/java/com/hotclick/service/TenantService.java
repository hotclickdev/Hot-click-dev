package com.hotclick.service;

import com.hotclick.model.Empresa;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.security.TenantContext;
import com.hotclick.service.tenant.TenantInfoBuilder;
import com.hotclick.service.tenant.TenantLimitChecker;
import com.hotclick.utils.Constants;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;
import java.util.NoSuchElementException;

@Service
public class TenantService {

    private final EmpresaRepository  empresaRepo;
    private final ProductoRepository productoRepo;
    private final UsuarioRepository  usuarioRepo;
    private final BodegaRepository   bodegaRepo;
    private final FeatureFlagService  flagService;
    private final TenantInfoBuilder   infoBuilder;
    private final TenantLimitChecker  limitChecker;

    public TenantService(EmpresaRepository empresaRepo,
                         ProductoRepository productoRepo,
                         UsuarioRepository usuarioRepo,
                         BodegaRepository bodegaRepo,
                         FeatureFlagService flagService,
                         TenantInfoBuilder infoBuilder,
                         TenantLimitChecker limitChecker) {
        this.empresaRepo  = empresaRepo;
        this.productoRepo = productoRepo;
        this.usuarioRepo  = usuarioRepo;
        this.bodegaRepo   = bodegaRepo;
        this.flagService  = flagService;
        this.infoBuilder  = infoBuilder;
        this.limitChecker = limitChecker;
    }

    // ── Empresa actual ────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Empresa getEmpresaActual() {
        Long id = TenantContext.get();
        if (id == null) return null;
        return empresaRepo.findById(id)
            .orElseThrow(() -> new NoSuchElementException("Empresa no encontrada: " + id));
    }

    // ── Info del tenant (cacheada) ────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Map<String, Object> getTenantInfo(Long empresaId) {
        return infoBuilder.getTenantInfo(empresaId);
    }

    // ── Uso en tiempo real (sin caché) ────────────────────────────────────────

    @Transactional(readOnly = true)
    public Map<String, Object> getTenantUso(Long empresaId) {
        long productos = productoRepo.countProductosActivosByEmpresaId(empresaId);
        long usuarios  = usuarioRepo.countActivosByEmpresaId(empresaId);
        long bodegas   = bodegaRepo.countByEmpresaIdAndEstado(empresaId, Constants.ESTADO_ACTIVO);

        Map<String, Object> uso = new HashMap<>();
        uso.put("productos", productos);
        uso.put("usuarios",  usuarios);
        uso.put("bodegas",   bodegas);
        return uso;
    }

    // ── Features ──────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public boolean tieneFeature(String feature) {
        Long empresaId = TenantContext.get();
        if (empresaId == null) return false;

        Empresa empresa = empresaRepo.findById(empresaId).orElse(null);
        if (empresa == null) return false;
        if ("VENCIDO".equals(empresa.getEstadoPlan())) return false;

        if (flagService.isEnabled(feature, empresaId)) return true;
        if (empresa.getPlan() == null) return false;
        return infoBuilder.planTiene(empresa.getPlan(), feature);
    }

    // ── Verificación de límites (puntos de llamada en controllers) ────────────

    @Transactional(readOnly = true)
    public void verificarLimiteProductos(Long empresaId) {
        long uso = productoRepo.countProductosActivosByEmpresaId(empresaId);
        limitChecker.verificarLimiteProductos(empresaId, uso);
    }

    @Transactional(readOnly = true)
    public void verificarLimiteProductosBulk(Long empresaId, int cantidad) {
        long uso = productoRepo.countProductosActivosByEmpresaId(empresaId);
        limitChecker.verificarLimiteProductosBulk(empresaId, uso, cantidad);
    }

    @Transactional(readOnly = true)
    public void verificarLimiteBodegas(Long empresaId) {
        long uso = bodegaRepo.countByEmpresaIdAndEstado(empresaId, Constants.ESTADO_ACTIVO);
        limitChecker.verificarLimiteBodegas(empresaId, uso);
    }

    @Transactional(readOnly = true)
    public void verificarLimiteBodegasBulk(Long empresaId, int cantidad) {
        long uso = bodegaRepo.countByEmpresaIdAndEstado(empresaId, Constants.ESTADO_ACTIVO);
        limitChecker.verificarLimiteBodegasBulk(empresaId, uso, cantidad);
    }

    @Transactional(readOnly = true)
    public void verificarLimiteUsuariosEquipo(Long empresaId) {
        long uso = usuarioRepo.countActivosByEmpresaId(empresaId);
        limitChecker.verificarLimiteUsuariosEquipo(empresaId, uso);
    }

    @Transactional(readOnly = true)
    public void verificarLimite(String entidad, long usoActual) {
        limitChecker.verificarLimite(TenantContext.get(), entidad, usoActual);
    }
}
