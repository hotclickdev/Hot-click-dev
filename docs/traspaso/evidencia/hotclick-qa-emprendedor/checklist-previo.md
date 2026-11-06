# Checklist antes de ejecutar QA 1
- [ ] URL de staging local recibida de CI/CD (NO producción, NO URL desplegada)
- [ ] Health del staging responde
- [ ] Llaves ONVO del staging empiezan con `onvo_test_` (verificar por conteo, nunca imprimir) — en .env local: 2 líneas onvo_test_, 0 onvo_live_ (ver evidencia-ambiente.txt)
- [ ] Webhook ONVO sandbox apunta al staging
- [ ] Recepción de correos de verificación (bandeja qa1+…)
- [ ] Navegador disponible para capturas
- [ ] Usuario admin de staging para E5 (simular cupo agotado sin SQL)
- [ ] Commit desplegado anotado (hash)
