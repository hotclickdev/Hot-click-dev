# Inventario de worktrees de pagos (26-oct-2026)
- Se revisaron unos 40 worktrees de pagos/ONVO/billing en /workspace.
- Sin commits locales fuera de origin, salvo `fix/billing-onvo-webhook` (+1, subido) y `fix/infra-reqa-workflows` (rechazado por el scope `workflow`).
- Los cambios sin commitear se subieron como wip/<carpeta> (10 ramas) con gitleaks `protect --staged` = 0 hallazgos.
  - En wip/reintentar, gitleaks marcó un falso positivo (generic-api-key en un fixture de test); se reemplazó por el valor `ficticio` antes del commit.
- Se ignoraron los worktrees de otros bots (auth, errores, bodega, chat, cajero, marketplace, etc.).
