# QA8 – Tests que reproducen A8-C2, C3, C4, C7 (bot de Telegram)
Base: origin/master a22501f7b (worktree temporal, ya borrado). Sin commit/push.
Rutas destino en el repo: src/test/java/com/hotclick/service/telegram/ y src/test/java/com/hotclick/integration/.
Comando: `unset ONVO_*; flock /workspace/.mvn-suite.lock mvn -q -o test -Dtest='TelegramUpdateDedupReproC3Test,TelegramReproA8IntegrationTest'`
Resultado: 4 tests, 4 FALLAN (assertion, ningún error) = bug reproducido. Log: mvn-run.log.

| Bug | Test | Resultado en master |
|---|---|---|
| A8-C3 dedup en memoria | TelegramUpdateDedupReproC3Test.mismoUpdateId_dosInstancias_soloUnaLoAcepta | FALLA: la 2ª instancia también devuelve true para esNuevo(42) |
| A8-C2 suspensión 365 d | TelegramReproA8IntegrationTest.dosRafagas_noSuspenden365Dias (H2; 2 ráfagas de 4 callbacks, reloj simulado +31 s corriendo window_start en hot_click_rate_limit_tb) | FALLA: el usuario queda en ESTADO_SUSPENDIDO |
| A8-C4 revocar corta todas las empresas | TelegramReproA8IntegrationTest.revocarEnUnaEmpresa_conservaVinculoEnLaOtra (DELETE /api/telegram/equipo/{id} en empresa A; socio también en B) | FALLA: vínculo queda REVOCADA |
| A8-C7 /start en minúsculas | TelegramReproA8IntegrationTest.start_codigoEnMinusculas_vincula | FALLA: no vincula (estado != ACTIVA) |

Con el fix, los 4 deben pasar.
