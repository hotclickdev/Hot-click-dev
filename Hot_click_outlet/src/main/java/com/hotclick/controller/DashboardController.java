package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.service.DashboardService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
public class DashboardController {

    @Autowired
    private DashboardService dashboardService;

    @GetMapping("/dashboard")
    public ResponseEntity<ResponseDTO> getDashboard() {
        return ResponseEntity.ok(
            ResponseDTO.success("Dashboard", dashboardService.obtenerMetricas())
        );
    }
}
