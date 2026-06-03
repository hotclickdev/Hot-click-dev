package com.hotclick.controller;

import com.hotclick.model.Empresa;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.security.TenantContext;
import com.hotclick.service.FeatureFlagService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api")
public class BrandingController {

    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private FeatureFlagService flagService;

    // ── Public — no auth — used by storefront to fetch tenant branding ────────
    /**
     * Returns branding for the empresa identified by ?slug= or, if omitted,
     * the first active empresa (used in single-tenant deployments).
     */
    @GetMapping("/public/branding")
    public ResponseEntity<?> publicBranding(@RequestParam(required = false) String slug) {
        Optional<Empresa> opt = slug != null && !slug.isBlank()
            ? empresaRepository.findBySlug(slug)
            : empresaRepository.findFirstByEstadoEmpresaOrderByIdAsc("ACTIVO");

        if (opt.isEmpty()) return ResponseEntity.notFound().build();
        Empresa e = opt.get();
        Map<String, Object> result = new java.util.LinkedHashMap<>(toBrandingMap(e));
        result.put("chatActivo",    flagService.isEnabled("chat_publico",       e.getId()));
        result.put("copilotActivo", flagService.isEnabled("copilot_emprendedor", e.getId()));
        return ResponseEntity.ok(result);
    }

    // ── Admin — get current empresa branding ──────────────────────────────────
    @GetMapping("/admin/branding")
    @PreAuthorize("hasAnyRole('EMPRENDEDOR','ADMIN_IT','ADMIN_CLIENTE')")
    public ResponseEntity<?> getBranding() {
        Long empresaId = TenantContext.get();
        return empresaRepository.findById(empresaId)
            .map(e -> ResponseEntity.ok(toBrandingMap(e)))
            .orElse(ResponseEntity.notFound().build());
    }

    // ── Admin — update branding ────────────────────────────────────────────────
    @PutMapping("/admin/branding")
    @PreAuthorize("hasAnyRole('EMPRENDEDOR','ADMIN_IT')")
    public ResponseEntity<?> updateBranding(@RequestBody Map<String, Object> body) {
        Long empresaId = TenantContext.get();
        Empresa empresa = empresaRepository.findById(empresaId)
            .orElse(null);
        if (empresa == null) return ResponseEntity.notFound().build();

        apply(empresa, body);
        empresaRepository.save(empresa);
        return ResponseEntity.ok(toBrandingMap(empresa));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private void apply(Empresa e, Map<String, Object> b) {
        if (b.containsKey("colorPrimario"))   e.setColorPrimario(str(b, "colorPrimario"));
        if (b.containsKey("colorSecundario")) e.setColorSecundario(str(b, "colorSecundario"));
        if (b.containsKey("colorAcento"))     e.setColorAcento(str(b, "colorAcento"));
        if (b.containsKey("tagline"))         e.setTagline(str(b, "tagline"));
        if (b.containsKey("footerTexto"))     e.setFooterTexto(str(b, "footerTexto"));
        if (b.containsKey("fontFamilia"))     e.setFontFamilia(str(b, "fontFamilia"));
        if (b.containsKey("faviconUrl"))      e.setFaviconUrl(str(b, "faviconUrl"));
        if (b.containsKey("ogImagenUrl"))     e.setOgImagenUrl(str(b, "ogImagenUrl"));
        if (b.containsKey("dominioCustom"))   e.setDominioCustom(str(b, "dominioCustom"));
        if (b.containsKey("logoUrl"))         e.setLogoUrl(str(b, "logoUrl"));
        if (b.containsKey("nombreComercial")) e.setNombreComercial(str(b, "nombreComercial"));
        if (b.containsKey("descripcion"))     e.setDescripcion(str(b, "descripcion"));
    }

    private String str(Map<String, Object> m, String key) {
        Object v = m.get(key);
        return v != null ? v.toString().trim() : null;
    }

    static Map<String, Object> toBrandingMap(Empresa e) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("empresaId",       e.getId());
        m.put("slug",            e.getSlug());
        m.put("nombreComercial", e.getNombreComercial() != null ? e.getNombreComercial() : e.getNombreEmpresa());
        m.put("logoUrl",         e.getLogoUrl());
        m.put("faviconUrl",      e.getFaviconUrl());
        m.put("ogImagenUrl",     e.getOgImagenUrl());
        m.put("colorPrimario",   e.getColorPrimario());
        m.put("colorSecundario", e.getColorSecundario());
        m.put("colorAcento",     e.getColorAcento());
        m.put("fontFamilia",     e.getFontFamilia());
        m.put("tagline",         e.getTagline());
        m.put("footerTexto",     e.getFooterTexto());
        m.put("dominioCustom",   e.getDominioCustom());
        m.put("descripcion",     e.getDescripcion());
        m.put("whatsapp",        e.getNumeroWhatsapp());
        return m;
    }
}
